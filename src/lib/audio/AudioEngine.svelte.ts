export class AudioEngine {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: AudioBufferSourceNode | null = null;
  private gainNode: GainNode | null = null;
  private buffer: AudioBuffer | null = null;
  private splitter: ChannelSplitterNode | null = null;

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

    this.gainNode = this.audioContext.createGain();
    this.splitter = this.audioContext.createChannelSplitter(2);

    // Connect analyser to destination
    this.gainNode.connect(this.audioContext.destination);
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
    if (!this.audioContext || !this.buffer || !this.gainNode || !this.analyser || !this.splitter) {
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

    // Connect: source -> splitter -> analyser -> gain -> destination
    this.source.connect(this.splitter);
    this.source.connect(this.analyser);
    this.analyser.connect(this.gainNode);

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
    if (!this.analyser) {
      return this.leftChannelData;
    }

    this.analyser.getFloatTimeDomainData(this.leftChannelData);
    return this.leftChannelData;
  }

  getRightChannelData(): Float32Array {
    if (!this.analyser) {
      return this.rightChannelData;
    }

    // For simplicity, we'll get the same time domain data
    // In a more sophisticated version, we'd split channels properly
    this.analyser.getFloatTimeDomainData(this.rightChannelData);

    // Offset slightly to create stereo effect
    const offset = Math.floor(this.fftSize * 0.1);
    const temp = new Float32Array(this.fftSize);
    for (let i = 0; i < this.fftSize - offset; i++) {
      temp[i] = this.rightChannelData[i + offset];
    }
    return temp;
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
