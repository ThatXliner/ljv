/**
 * ChordSynth — a hand-played chord instrument whose stereo output drives the
 * Lissajous curve. It connects to the AudioEngine's stereo analysers, so a
 * synthesized chord is visualized through the exact same pipeline as an audio
 * file (no renderer changes).
 *
 * Mapping (driven by HandSynth.svelte):
 *   - height  → base frequency (continuous, theremin-style glissando)
 *   - tilt    → vibrato depth + rate (a pitch LFO modulating detune)
 *   - fingers → chord quality (which intervals stack on the base)
 *
 * Stereo trick: chord tones are alternately panned hard-L / hard-R. The
 * Lissajous transform reads Side = (L - R), so panning the voicing apart gives
 * the curve horizontal width AND a shape that changes when the chord changes.
 * If every tone hit both channels equally, Side = 0 and the figure would
 * collapse to a vertical line.
 */

// Semitone offsets from the base note for each chord quality, indexed by
// extended-finger count (0..5). Kept small and recognizable.
const CHORD_QUALITIES: { name: string; intervals: number[] }[] = [
  { name: 'ROOT', intervals: [0] }, // 0 fingers: single tone (just the base)
  { name: 'MAJ', intervals: [0, 4, 7] }, // 1: major triad
  { name: 'MIN', intervals: [0, 3, 7] }, // 2: minor triad
  { name: 'SUS4', intervals: [0, 5, 7] }, // 3: suspended 4th
  { name: 'DOM7', intervals: [0, 4, 7, 10] }, // 4: dominant 7th
  { name: 'MAJ7', intervals: [0, 4, 7, 11] }, // 5: major 7th
];

const MAX_VOICES = 4; // largest chord (DOM7 / MAJ7) uses 4 tones

const semitoneToRatio = (s: number) => Math.pow(2, s / 12);

export interface ChordSynthState {
  active: boolean;
  baseFrequency: number;
  chordName: string;
  vibratoDepthCents: number;
  vibratoRateHz: number;
}

export class ChordSynth {
  private ctx: AudioContext;

  // One persistent oscillator per voice slot — retuned rather than recreated
  // each frame, so chord/pitch changes glide instead of clicking.
  private voices: {
    osc: OscillatorNode;
    gain: GainNode; // per-voice on/off (unused voices muted)
    detune: GainNode; // receives vibrato signal -> osc.detune
  }[] = [];

  // Shared vibrato LFO fanned into every voice's detune param.
  private lfo: OscillatorNode;
  private lfoDepth: GainNode; // output in cents

  private masterGain: GainNode;
  private leftGain: GainNode; // hard-left bus
  private rightGain: GainNode; // hard-right bus
  private splitter: ChannelSplitterNode; // to route L/R into the two analysers

  private started = false;
  private currentFingers = -1;
  private currentChordName = CHORD_QUALITIES[0].name;

  constructor(
    ctx: AudioContext,
    leftAnalyser: AnalyserNode,
    rightAnalyser: AnalyserNode,
    output: AudioNode
  ) {
    this.ctx = ctx;

    this.masterGain = ctx.createGain();
    this.masterGain.gain.value = 0; // silent until activated

    // Two mono buses (L and R), merged into a stereo signal, then both
    // split back out so each channel feeds its matching analyser.
    this.leftGain = ctx.createGain();
    this.rightGain = ctx.createGain();
    const merger = ctx.createChannelMerger(2);
    this.leftGain.connect(merger, 0, 0);
    this.rightGain.connect(merger, 0, 1);

    merger.connect(this.masterGain);

    // Audible path
    this.masterGain.connect(output);

    // Visualization path: split the master stereo signal and feed the same
    // analysers the renderer samples.
    this.splitter = ctx.createChannelSplitter(2);
    this.masterGain.connect(this.splitter);
    this.splitter.connect(leftAnalyser, 0);
    this.splitter.connect(rightAnalyser, 1);

    // Vibrato LFO
    this.lfo = ctx.createOscillator();
    this.lfo.frequency.value = 5; // Hz, overwritten by tilt
    this.lfoDepth = ctx.createGain();
    this.lfoDepth.gain.value = 0; // cents, overwritten by tilt
    this.lfo.connect(this.lfoDepth);

    // Build voices. Even voices pan left, odd voices pan right, so the chord
    // voicing is spread across the stereo field (see class doc).
    for (let i = 0; i < MAX_VOICES; i++) {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = 220;

      const detune = ctx.createGain();
      detune.gain.value = 1;
      this.lfoDepth.connect(detune);
      detune.connect(osc.detune);

      const gain = ctx.createGain();
      gain.gain.value = 0; // voice off until a chord assigns it

      osc.connect(gain);
      gain.connect(i % 2 === 0 ? this.leftGain : this.rightGain);

      this.voices.push({ osc, gain, detune });
    }
  }

  /** Start oscillators (must follow a user gesture for autoplay policy). */
  start(): void {
    if (this.started) return;
    this.started = true;
    this.lfo.start();
    for (const v of this.voices) v.osc.start();
  }

  /** Fade the instrument in/out. */
  setActive(active: boolean): void {
    const now = this.ctx.currentTime;
    this.masterGain.gain.cancelScheduledValues(now);
    this.masterGain.gain.setTargetAtTime(active ? 0.6 : 0, now, 0.05);
  }

  /**
   * Drive the synth from hand parameters. Called every frame from HandSynth.
   * @param baseFrequency  absolute Hz for the chord root (from hand height)
   * @param fingers        extended-finger count 0..5 (chord quality)
   * @param vibratoDepthCents  pitch-wobble depth (from tilt magnitude)
   * @param vibratoRateHz      pitch-wobble rate  (from tilt magnitude)
   */
  update(
    baseFrequency: number,
    fingers: number,
    vibratoDepthCents: number,
    vibratoRateHz: number
  ): void {
    const now = this.ctx.currentTime;
    const quality = CHORD_QUALITIES[Math.max(0, Math.min(5, fingers))];
    this.currentChordName = quality.name;

    // Vibrato — glide params so tilt feels smooth, not stepped.
    this.lfoDepth.gain.setTargetAtTime(vibratoDepthCents, now, 0.05);
    this.lfo.frequency.setTargetAtTime(vibratoRateHz, now, 0.05);

    // Retune / gate voices for the current chord.
    for (let i = 0; i < MAX_VOICES; i++) {
      const v = this.voices[i];
      if (i < quality.intervals.length) {
        const freq = baseFrequency * semitoneToRatio(quality.intervals[i]);
        // Portamento on pitch — continuous glissando as the hand moves.
        v.osc.frequency.setTargetAtTime(freq, now, 0.04);
        v.gain.gain.setTargetAtTime(1 / quality.intervals.length, now, 0.04);
      } else {
        v.gain.gain.setTargetAtTime(0, now, 0.04);
      }
    }

    this.currentFingers = fingers;
  }

  get state(): ChordSynthState {
    return {
      active: this.masterGain.gain.value > 0.01,
      baseFrequency: this.voices[0]?.osc.frequency.value ?? 0,
      chordName: this.currentChordName,
      vibratoDepthCents: this.lfoDepth.gain.value,
      vibratoRateHz: this.lfo.frequency.value,
    };
  }

  destroy(): void {
    try {
      if (this.started) {
        this.lfo.stop();
        for (const v of this.voices) v.osc.stop();
      }
    } catch {
      /* already stopped */
    }
    this.masterGain.disconnect();
  }
}

export { CHORD_QUALITIES };
