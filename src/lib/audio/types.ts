export interface AudioState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  fileName: string | null;
}

export interface AudioAnalyserData {
  leftChannel: Float32Array;
  rightChannel: Float32Array;
  timestamp: number;
}
