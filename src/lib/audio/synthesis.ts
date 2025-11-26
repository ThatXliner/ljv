export interface DemoPreset {
  id: string;
  name: string;
  description: string;
  leftRatio: number;
  rightRatio: number;
}

export interface ChordPreset {
  id: string;
  name: string;
  description: string;
  leftRatios: number[];
  rightRatios: number[];
}

export const INTERVAL_PRESETS: DemoPreset[] = [
  { id: 'sine', name: 'Pure Sine', description: '440 Hz', leftRatio: 1.0, rightRatio: 1.0 },
  { id: 'octave', name: 'Octave', description: '2:1', leftRatio: 1.0, rightRatio: 2.0 },
  { id: 'fifth', name: 'Perfect Fifth', description: '3:2', leftRatio: 1.0, rightRatio: 3 / 2 },
  { id: 'fourth', name: 'Perfect Fourth', description: '4:3', leftRatio: 1.0, rightRatio: 4 / 3 },
  { id: 'third', name: 'Major Third', description: '5:4', leftRatio: 1.0, rightRatio: 5 / 4 },
  {
    id: 'seventh',
    name: 'Minor Seventh',
    description: '16:9',
    leftRatio: 1.0,
    rightRatio: 16 / 9,
  },
];

export const CHORD_PRESETS: ChordPreset[] = [
  {
    id: 'major',
    name: 'Major Triad',
    description: '4:5:6',
    leftRatios: [1.0],
    rightRatios: [5 / 4, 3 / 2],
  },
  {
    id: 'minor',
    name: 'Minor Triad',
    description: '10:12:15',
    leftRatios: [1.0],
    rightRatios: [6 / 5, 3 / 2],
  },
  {
    id: 'sus4',
    name: 'Sus4 Chord',
    description: '3:4:6',
    leftRatios: [1.0],
    rightRatios: [4 / 3, 3 / 2],
  },
  {
    id: 'power',
    name: 'Power Chord',
    description: '2:3:4',
    leftRatios: [1.0],
    rightRatios: [3 / 2, 2.0],
  },
  {
    id: 'maj7',
    name: 'Major 7th',
    description: '8:10:12:15',
    leftRatios: [1.0, 3 / 2],
    rightRatios: [5 / 4, 15 / 8],
  },
  {
    id: 'dom7',
    name: 'Dominant 7th',
    description: '4:5:6:7',
    leftRatios: [1.0, 3 / 2],
    rightRatios: [5 / 4, 7 / 4],
  },
];

// Keep DEMO_PRESETS for backwards compatibility
export const DEMO_PRESETS = INTERVAL_PRESETS;

export async function generateStereoTone(
  leftRatio: number,
  rightRatio: number,
  baseFrequency: number = 440,
  duration: number = 15,
  sampleRate: number = 44100
): Promise<AudioBuffer> {
  const offlineContext = new OfflineAudioContext(2, sampleRate * duration, sampleRate);

  const leftOsc = offlineContext.createOscillator();
  const rightOsc = offlineContext.createOscillator();

  leftOsc.type = 'sine';
  rightOsc.type = 'sine';
  leftOsc.frequency.value = baseFrequency * leftRatio;
  rightOsc.frequency.value = baseFrequency * rightRatio;

  const merger = offlineContext.createChannelMerger(2);

  const leftGain = offlineContext.createGain();
  const rightGain = offlineContext.createGain();

  const fadeTime = 0.05;
  leftGain.gain.setValueAtTime(0, 0);
  leftGain.gain.linearRampToValueAtTime(1, fadeTime);
  leftGain.gain.setValueAtTime(1, duration - fadeTime);
  leftGain.gain.linearRampToValueAtTime(0, duration);

  rightGain.gain.setValueAtTime(0, 0);
  rightGain.gain.linearRampToValueAtTime(1, fadeTime);
  rightGain.gain.setValueAtTime(1, duration - fadeTime);
  rightGain.gain.linearRampToValueAtTime(0, duration);

  leftOsc.connect(leftGain);
  rightOsc.connect(rightGain);
  leftGain.connect(merger, 0, 0);
  rightGain.connect(merger, 0, 1);
  merger.connect(offlineContext.destination);

  leftOsc.start(0);
  rightOsc.start(0);
  leftOsc.stop(duration);
  rightOsc.stop(duration);

  const audioBuffer = await offlineContext.startRendering();
  return audioBuffer;
}

export async function generateStereoChord(
  leftRatios: number[],
  rightRatios: number[],
  baseFrequency: number = 440,
  duration: number = 15,
  sampleRate: number = 44100
): Promise<AudioBuffer> {
  const offlineContext = new OfflineAudioContext(2, sampleRate * duration, sampleRate);

  const merger = offlineContext.createChannelMerger(2);

  const leftMix = offlineContext.createGain();
  const rightMix = offlineContext.createGain();

  // Reduce gain per oscillator to prevent clipping
  const leftOscGain = 1.0 / leftRatios.length;
  const rightOscGain = 1.0 / rightRatios.length;

  const fadeTime = 0.05;

  // Create oscillators for left channel
  leftRatios.forEach((ratio) => {
    const osc = offlineContext.createOscillator();
    const gain = offlineContext.createGain();

    osc.type = 'sine';
    osc.frequency.value = baseFrequency * ratio;

    gain.gain.setValueAtTime(0, 0);
    gain.gain.linearRampToValueAtTime(leftOscGain, fadeTime);
    gain.gain.setValueAtTime(leftOscGain, duration - fadeTime);
    gain.gain.linearRampToValueAtTime(0, duration);

    osc.connect(gain);
    gain.connect(leftMix);

    osc.start(0);
    osc.stop(duration);
  });

  // Create oscillators for right channel
  rightRatios.forEach((ratio) => {
    const osc = offlineContext.createOscillator();
    const gain = offlineContext.createGain();

    osc.type = 'sine';
    osc.frequency.value = baseFrequency * ratio;

    gain.gain.setValueAtTime(0, 0);
    gain.gain.linearRampToValueAtTime(rightOscGain, fadeTime);
    gain.gain.setValueAtTime(rightOscGain, duration - fadeTime);
    gain.gain.linearRampToValueAtTime(0, duration);

    osc.connect(gain);
    gain.connect(rightMix);

    osc.start(0);
    osc.stop(duration);
  });

  leftMix.connect(merger, 0, 0);
  rightMix.connect(merger, 0, 1);
  merger.connect(offlineContext.destination);

  const audioBuffer = await offlineContext.startRendering();
  return audioBuffer;
}

function writeString(view: DataView, offset: number, string: string): void {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

export function audioBufferToArrayBuffer(audioBuffer: AudioBuffer): ArrayBuffer {
  const numberOfChannels = audioBuffer.numberOfChannels;
  const length = audioBuffer.length * numberOfChannels * 2;
  const buffer = new ArrayBuffer(44 + length);
  const view = new DataView(buffer);

  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + length, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numberOfChannels, true);
  view.setUint32(24, audioBuffer.sampleRate, true);
  view.setUint32(28, audioBuffer.sampleRate * numberOfChannels * 2, true);
  view.setUint16(32, numberOfChannels * 2, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, 'data');
  view.setUint32(40, length, true);

  const offset = 44;
  const channels = [];
  for (let i = 0; i < numberOfChannels; i++) {
    channels.push(audioBuffer.getChannelData(i));
  }

  let pos = offset;
  for (let i = 0; i < audioBuffer.length; i++) {
    for (let channel = 0; channel < numberOfChannels; channel++) {
      const sample = Math.max(-1, Math.min(1, channels[channel][i]));
      view.setInt16(pos, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      pos += 2;
    }
  }

  return buffer;
}
