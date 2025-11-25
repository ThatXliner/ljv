export type FrequencyBand = 'bass' | 'mids' | 'highs' | 'melody';

interface BandAnalyser {
  filter?: BiquadFilterNode;
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

  // Separate analysers for legacy stereo mode
  private leftAnalyser: AnalyserNode | null = null;
  private rightAnalyser: AnalyserNode | null = null;

  // Frequency band analysers
  private bandAnalysers: Map<FrequencyBand, BandAnalyser> = new Map();

  #isPlaying = $state(false);
  #currentTime = $state(0);
  #duration = $state(0);
  #fileName = $state<string | null>(null);

  private fftSize = 2048;
  private leftChannelData: Float32Array;
  private rightChannelData: Float32Array;
  private startTime = 0;
  private pauseTime = 0;

  constructor() {
    this.leftChannelData = new Float32Array(this.fftSize);
    this.rightChannelData = new Float32Array(this.fftSize);
  }

  async initialize(): Promise<void> {
    if (this.audioContext) return;

    this.audioContext = new AudioContext();
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = this.fftSize;
    this.analyser.smoothingTimeConstant = 0.8;

    // Create separate analysers for stereo channels (legacy mode)
    this.leftAnalyser = this.audioContext.createAnalyser();
    this.leftAnalyser.fftSize = this.fftSize;
    this.leftAnalyser.smoothingTimeConstant = 0.8;

    this.rightAnalyser = this.audioContext.createAnalyser();
    this.rightAnalyser.fftSize = this.fftSize;
    this.rightAnalyser.smoothingTimeConstant = 0.8;

    this.gainNode = this.audioContext.createGain();
    this.splitter = this.audioContext.createChannelSplitter(2);
    this.merger = this.audioContext.createChannelMerger(2);

    // Connect analyser to destination
    this.gainNode.connect(this.audioContext.destination);

    // Setup frequency band analysers
    this.setupBandAnalysers();
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

  private createBandAnalyser(filter?: BiquadFilterNode): BandAnalyser {
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
      filter,
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

    // Connect stereo analysers for legacy mode
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
          // Store filters for cleanup
          analyser.filter = filterLeft;

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

  getBandData(band: FrequencyBand): { left: Float32Array; right: Float32Array } | null {
    const analyser = this.bandAnalysers.get(band);
    if (!analyser) {
      return null;
    }

    if (band === 'melody') {
      // For melody, use FFT to extract dominant frequencies
      return this.extractMelodyData(analyser);
    }

    // Get time domain data for filtered bands
    analyser.analyserLeft.getFloatTimeDomainData(analyser.leftData);
    analyser.analyserRight.getFloatTimeDomainData(analyser.rightData);

    return {
      left: analyser.leftData,
      right: analyser.rightData,
    };
  }

  private extractMelodyData(analyser: BandAnalyser): { left: Float32Array; right: Float32Array } {
    const frequencyBins = analyser.analyserLeft.frequencyBinCount;
    const leftFreqData = new Float32Array(frequencyBins);
    const rightFreqData = new Float32Array(frequencyBins);

    // Get frequency domain data (FFT)
    analyser.analyserLeft.getFloatFrequencyData(leftFreqData);
    analyser.analyserRight.getFloatFrequencyData(rightFreqData);

    // Find dominant frequency bins (top 10% by magnitude)
    const threshold = this.calculateMagnitudeThreshold(leftFreqData, rightFreqData, 0.9);

    // Extract dominant frequencies and convert back to time domain representation
    // For simplicity, we'll use the frequency data directly as a proxy for melody
    // A more sophisticated approach would involve inverse FFT

    // Get time domain data filtered by dominant frequencies
    analyser.analyserLeft.getFloatTimeDomainData(analyser.leftData);
    analyser.analyserRight.getFloatTimeDomainData(analyser.rightData);

    // Apply simple emphasis on regions with strong frequency content
    const leftTime = new Float32Array(analyser.leftData);
    const rightTime = new Float32Array(analyser.rightData);

    // Calculate overall frequency band energy to weight the time domain data
    let leftEnergy = 0;
    let rightEnergy = 0;
    for (let i = 0; i < frequencyBins; i++) {
      if (leftFreqData[i] > threshold) {
        leftEnergy += Math.pow(10, leftFreqData[i] / 20); // Convert dB to linear
      }
      if (rightFreqData[i] > threshold) {
        rightEnergy += Math.pow(10, rightFreqData[i] / 20);
      }
    }

    // Normalize and emphasize based on frequency energy
    const leftScale = Math.min(2.0, 1.0 + leftEnergy / frequencyBins);
    const rightScale = Math.min(2.0, 1.0 + rightEnergy / frequencyBins);

    for (let i = 0; i < leftTime.length; i++) {
      leftTime[i] *= leftScale;
      rightTime[i] *= rightScale;
    }

    return {
      left: leftTime,
      right: rightTime,
    };
  }

  private calculateMagnitudeThreshold(
    leftFreq: Float32Array,
    rightFreq: Float32Array,
    percentile: number
  ): number {
    // Combine and sort frequency magnitudes
    const combined = new Float32Array(leftFreq.length + rightFreq.length);
    combined.set(leftFreq, 0);
    combined.set(rightFreq, leftFreq.length);

    const sorted = Array.from(combined).sort((a, b) => a - b);
    const index = Math.floor(sorted.length * percentile);

    return sorted[index];
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
