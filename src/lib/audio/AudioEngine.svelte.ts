export type FrequencyBand = 'bass' | 'mids' | 'highs' | 'melody';

interface BandAnalyser {
  filterLeft?: BiquadFilterNode;
  filterRight?: BiquadFilterNode;
  analyserLeft: AnalyserNode;
  analyserRight: AnalyserNode;
  leftData: Float32Array;
  rightData: Float32Array;
}

export class AudioEngine {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: AudioBufferSourceNode | null = null;
  private gainNode: GainNode | null = null;
  private buffer: AudioBuffer | null = null;
  private splitter: ChannelSplitterNode | null = null;
  private merger: ChannelMergerNode | null = null;

  // Separate analysers for single-band stereo mode
  private leftAnalyser: AnalyserNode | null = null;
  private rightAnalyser: AnalyserNode | null = null;

  // Second stereo analyser pair — lets an external source (the hand-synth's
  // second voice group) be visualized as its own independently-colored curve.
  private leftAnalyser2: AnalyserNode | null = null;
  private rightAnalyser2: AnalyserNode | null = null;
  private auxData2L: Float32Array;
  private auxData2R: Float32Array;

  // Frequency band analysers
  private bandAnalysers: Map<FrequencyBand, BandAnalyser> = new Map();

  #isPlaying = $state(false);
  #currentTime = $state(0);
  #duration = $state(0);
  #fileName = $state<string | null>(null);
  #availableDevices = $state<MediaDeviceInfo[]>([]);
  #selectedDeviceId = $state<string | null>(null);

  private fftSize = 2048;
  private leftChannelData: Float32Array;
  private rightChannelData: Float32Array;
  private startTime = 0;
  private pauseTime = 0;

  constructor() {
    this.leftChannelData = new Float32Array(this.fftSize);
    this.rightChannelData = new Float32Array(this.fftSize);
    this.auxData2L = new Float32Array(this.fftSize);
    this.auxData2R = new Float32Array(this.fftSize);
  }

  async initialize(): Promise<void> {
    if (this.audioContext) return;

    // Enumerate available audio output devices
    await this.enumerateDevices();

    this.audioContext = new AudioContext();
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = this.fftSize;
    this.analyser.smoothingTimeConstant = 0.8;

    // Create separate analysers for stereo channels (single-band mode)
    this.leftAnalyser = this.audioContext.createAnalyser();
    this.leftAnalyser.fftSize = this.fftSize;
    this.leftAnalyser.smoothingTimeConstant = 0.8;

    this.rightAnalyser = this.audioContext.createAnalyser();
    this.rightAnalyser.fftSize = this.fftSize;
    this.rightAnalyser.smoothingTimeConstant = 0.8;

    // Second stereo pair for the hand-synth's second voice group.
    this.leftAnalyser2 = this.audioContext.createAnalyser();
    this.leftAnalyser2.fftSize = this.fftSize;
    this.leftAnalyser2.smoothingTimeConstant = 0.8;

    this.rightAnalyser2 = this.audioContext.createAnalyser();
    this.rightAnalyser2.fftSize = this.fftSize;
    this.rightAnalyser2.smoothingTimeConstant = 0.8;

    this.gainNode = this.audioContext.createGain();
    this.splitter = this.audioContext.createChannelSplitter(2);
    this.merger = this.audioContext.createChannelMerger(2);

    // Connect analyser to destination
    this.gainNode.connect(this.audioContext.destination);

    // Setup frequency band analysers
    this.setupBandAnalysers();

    // Set initial output device if available
    if (this.#selectedDeviceId && 'setSinkId' in this.audioContext) {
      await this.setOutputDevice(this.#selectedDeviceId);
    }
  }

  private async enumerateDevices(): Promise<void> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      this.#availableDevices = devices.filter(device => device.kind === 'audiooutput');

      // Set default device if none selected
      if (!this.#selectedDeviceId && this.#availableDevices.length > 0) {
        this.#selectedDeviceId = this.#availableDevices[0].deviceId;
      }

      // Listen for device changes
      navigator.mediaDevices.addEventListener('devicechange', () => {
        this.enumerateDevices();
      });
    } catch (error) {
      console.error('Failed to enumerate audio devices:', error);
    }
  }

  async setOutputDevice(deviceId: string): Promise<void> {
    if (!this.audioContext) return;

    try {
      // Check if setSinkId is supported (not all browsers support it)
      if ('setSinkId' in this.audioContext) {
        await (this.audioContext as any).setSinkId(deviceId);
        this.#selectedDeviceId = deviceId;
      } else {
        console.warn('Audio output device selection not supported in this browser');
      }
    } catch (error) {
      console.error('Failed to set output device:', error);
    }
  }

  private setupBandAnalysers(): void {
    if (!this.audioContext) return;

    // Create analyser pairs for each band (left + right channels)
    // Filters will be created during playback to avoid stale connections
    this.bandAnalysers.set('bass', this.createBandAnalyser());
    this.bandAnalysers.set('mids', this.createBandAnalyser());
    this.bandAnalysers.set('highs', this.createBandAnalyser());
    this.bandAnalysers.set('melody', this.createBandAnalyser());
  }

  private createBandFilter(band: FrequencyBand): BiquadFilterNode | null {
    if (!this.audioContext) return null;

    const filter = this.audioContext.createBiquadFilter();

    switch (band) {
      case 'bass':
        // Bass: 20-250 Hz (lowpass filter)
        filter.type = 'lowpass';
        filter.frequency.value = 250;
        filter.Q.value = 0.7;
        break;
      case 'mids':
        // Mids/Vocals: 250-4000 Hz (bandpass filter)
        filter.type = 'bandpass';
        filter.frequency.value = 2125; // Center frequency
        filter.Q.value = 0.5;
        break;
      case 'highs':
        // Highs: 4000+ Hz (highpass filter)
        filter.type = 'highpass';
        filter.frequency.value = 4000;
        filter.Q.value = 0.7;
        break;
      default:
        return null;
    }

    return filter;
  }

  private createBandAnalyser(): BandAnalyser {
    if (!this.audioContext) {
      throw new Error('AudioContext not initialized');
    }

    const analyserLeft = this.audioContext.createAnalyser();
    analyserLeft.fftSize = this.fftSize;
    analyserLeft.smoothingTimeConstant = 0.8;

    const analyserRight = this.audioContext.createAnalyser();
    analyserRight.fftSize = this.fftSize;
    analyserRight.smoothingTimeConstant = 0.8;

    return {
      analyserLeft,
      analyserRight,
      leftData: new Float32Array(this.fftSize),
      rightData: new Float32Array(this.fftSize),
    };
  }

  async loadAudioFile(arrayBuffer: ArrayBuffer, fileName: string): Promise<void> {
    if (!this.audioContext) {
      throw new Error('AudioContext not initialized');
    }

    try {
      this.buffer = await this.audioContext.decodeAudioData(arrayBuffer);
      this.#duration = this.buffer.duration;
      this.#fileName = fileName;
      this.#currentTime = 0;
    } catch (error) {
      throw new Error(`Failed to decode audio: ${error}`);
    }
  }

  play(): void {
    if (!this.audioContext || !this.buffer || !this.gainNode || !this.analyser || !this.splitter || !this.merger || !this.leftAnalyser || !this.rightAnalyser) {
      return;
    }

    // Resume audio context if suspended
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    // Stop current source if playing
    if (this.source) {
      this.source.stop();
      this.source.disconnect();
    }

    // Create new source
    this.source = this.audioContext.createBufferSource();
    this.source.buffer = this.buffer;

    // Connect main analyser: source -> analyser -> gain -> destination
    this.source.connect(this.analyser);
    this.analyser.connect(this.gainNode);

    // Connect channel splitter for stereo separation
    this.source.connect(this.splitter);

    // Connect stereo analysers for single-band mode
    this.splitter.connect(this.leftAnalyser, 0);
    this.splitter.connect(this.rightAnalyser, 1);

    // Connect each frequency band analyser
    for (const [band, analyser] of this.bandAnalysers.entries()) {
      if (band === 'melody') {
        // Melody analyser connects directly to splitter for FFT analysis
        this.splitter.connect(analyser.analyserLeft, 0);
        this.splitter.connect(analyser.analyserRight, 1);
      } else {
        // Create filters for this band
        const filterLeft = this.createBandFilter(band);
        const filterRight = this.createBandFilter(band);

        if (filterLeft && filterRight) {
          // Store both filter references for live parameter updates
          analyser.filterLeft = filterLeft;
          analyser.filterRight = filterRight;

          // Connect: splitter -> filter -> analyser for each channel
          this.splitter.connect(filterLeft, 0);
          this.splitter.connect(filterRight, 1);
          filterLeft.connect(analyser.analyserLeft);
          filterRight.connect(analyser.analyserRight);
        }
      }
    }

    // Handle playback end
    this.source.onended = () => {
      this.#isPlaying = false;
    };

    // Start playback from pause position
    const offset = this.pauseTime;
    this.source.start(0, offset);
    this.startTime = this.audioContext.currentTime - offset;
    this.#isPlaying = true;
  }

  pause(): void {
    if (!this.source || !this.audioContext) return;

    this.pauseTime = this.audioContext.currentTime - this.startTime;
    this.source.stop();
    this.source.disconnect();
    this.source = null;
    this.#isPlaying = false;
  }

  stop(): void {
    this.pause();
    this.pauseTime = 0;
    this.#currentTime = 0;
  }

  seek(time: number): void {
    const wasPlaying = this.#isPlaying;
    if (wasPlaying) {
      this.pause();
    }

    this.pauseTime = Math.max(0, Math.min(time, this.#duration));
    this.#currentTime = this.pauseTime;

    if (wasPlaying) {
      this.play();
    }
  }

  getLeftChannelData(): Float32Array {
    if (!this.leftAnalyser) {
      return this.leftChannelData;
    }

    this.leftAnalyser.getFloatTimeDomainData(this.leftChannelData);
    return this.leftChannelData;
  }

  getRightChannelData(): Float32Array {
    if (!this.rightAnalyser) {
      return this.rightChannelData;
    }

    this.rightAnalyser.getFloatTimeDomainData(this.rightChannelData);
    return this.rightChannelData;
  }

  getBandData(band: FrequencyBand, harmonicDepth = 8): { left: Float32Array; right: Float32Array } | null {
    const analyser = this.bandAnalysers.get(band);
    if (!analyser) {
      return null;
    }

    if (band === 'melody') {
      // For melody, use FFT resynthesis with N strongest harmonics
      return this.extractMelodyData(analyser, harmonicDepth);
    }

    // Get time domain data for filtered bands
    analyser.analyserLeft.getFloatTimeDomainData(analyser.leftData);
    analyser.analyserRight.getFloatTimeDomainData(analyser.rightData);

    return {
      left: analyser.leftData,
      right: analyser.rightData,
    };
  }

  updateBandFilter(band: FrequencyBand, frequency: number, q: number): void {
    const analyser = this.bandAnalysers.get(band);
    if (!analyser || band === 'melody') return;
    if (analyser.filterLeft) {
      analyser.filterLeft.frequency.value = frequency;
      analyser.filterLeft.Q.value = q;
    }
    if (analyser.filterRight) {
      analyser.filterRight.frequency.value = frequency;
      analyser.filterRight.Q.value = q;
    }
  }

  private extractMelodyData(
    analyser: BandAnalyser,
    harmonicDepth: number
  ): { left: Float32Array; right: Float32Array } {
    const frequencyBins = analyser.analyserLeft.frequencyBinCount;
    const freqDataLeft = new Float32Array(frequencyBins);
    const freqDataRight = new Float32Array(frequencyBins);

    analyser.analyserLeft.getFloatFrequencyData(freqDataLeft);
    analyser.analyserRight.getFloatFrequencyData(freqDataRight);

    const outputLength = this.fftSize;

    return {
      left: this.resynthesizeChannel(freqDataLeft, harmonicDepth, outputLength),
      right: this.resynthesizeChannel(freqDataRight, harmonicDepth, outputLength),
    };
  }

  private resynthesizeChannel(
    freqData: Float32Array,
    harmonicDepth: number,
    outputLength: number
  ): Float32Array {
    const numBins = freqData.length;

    // Convert dB → linear amplitude; clamp -Infinity bins to 0
    const amplitudes = new Float32Array(numBins);
    for (let i = 0; i < numBins; i++) {
      const db = freqData[i];
      amplitudes[i] = isFinite(db) ? Math.pow(10, db / 20) : 0;
    }

    // Find indices of top-N bins by amplitude
    const depth = Math.max(1, Math.min(harmonicDepth, numBins));
    const indices = Array.from({ length: numBins }, (_, i) => i);
    indices.sort((a, b) => amplitudes[b] - amplitudes[a]);
    const topIndices = indices.slice(0, depth);

    // Sum of selected amplitudes for normalization
    let ampSum = 0;
    for (const idx of topIndices) {
      ampSum += amplitudes[idx];
    }
    if (ampSum === 0) {
      return new Float32Array(outputLength);
    }

    // Synthesize: out[t] = Σ A_i * cos(2π * binIndex_i * t / outputLength)
    const out = new Float32Array(outputLength);
    const twoPiOverN = (2 * Math.PI) / outputLength;
    for (const idx of topIndices) {
      const a = amplitudes[idx] / ampSum;
      for (let t = 0; t < outputLength; t++) {
        out[t] += a * Math.cos(twoPiOverN * idx * t);
      }
    }

    return out;
  }

  updateCurrentTime(): void {
    if (this.#isPlaying && this.audioContext) {
      this.#currentTime = this.audioContext.currentTime - this.startTime;
    }
  }

  // Getters for reactive state
  get isPlaying(): boolean {
    return this.#isPlaying;
  }

  get currentTime(): number {
    return this.#currentTime;
  }

  get duration(): number {
    return this.#duration;
  }

  get fileName(): string | null {
    return this.#fileName;
  }

  get availableDevices(): MediaDeviceInfo[] {
    return this.#availableDevices;
  }

  get selectedDeviceId(): string | null {
    return this.#selectedDeviceId;
  }

  /**
   * Accessors for external sound sources (e.g. the hand-tracking ChordSynth)
   * that want to feed the SAME stereo analysers the Lissajous renderer reads,
   * so a synthesized signal becomes visualizable with no renderer changes.
   * A source should connect its left output to `leftStereoAnalyser` and its
   * right output to `rightStereoAnalyser`, and connect to `outputNode` to be
   * audible.
   */
  get context(): AudioContext | null {
    return this.audioContext;
  }

  get leftStereoAnalyser(): AnalyserNode | null {
    return this.leftAnalyser;
  }

  get rightStereoAnalyser(): AnalyserNode | null {
    return this.rightAnalyser;
  }

  // Second stereo analyser pair (hand-synth voice group 2).
  get leftStereoAnalyser2(): AnalyserNode | null {
    return this.leftAnalyser2;
  }

  get rightStereoAnalyser2(): AnalyserNode | null {
    return this.rightAnalyser2;
  }

  /** Time-domain samples from the second analyser pair, for its own curve. */
  getLeftChannelData2(): Float32Array {
    if (!this.leftAnalyser2) return this.auxData2L;
    this.leftAnalyser2.getFloatTimeDomainData(this.auxData2L);
    return this.auxData2L;
  }

  getRightChannelData2(): Float32Array {
    if (!this.rightAnalyser2) return this.auxData2R;
    this.rightAnalyser2.getFloatTimeDomainData(this.auxData2R);
    return this.auxData2R;
  }

  get outputNode(): GainNode | null {
    return this.gainNode;
  }

  destroy(): void {
    if (this.source) {
      this.source.stop();
      this.source.disconnect();
    }
    if (this.audioContext) {
      this.audioContext.close();
    }
  }
}
