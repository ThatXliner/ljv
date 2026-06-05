/**
 * ChordSynth — a hand-played chord instrument whose stereo output drives the
 * Lissajous curve. It connects to the AudioEngine's stereo analysers, so a
 * synthesized chord is visualized through the exact same pipeline as an audio
 * file (no renderer changes).
 *
 * Mapping (driven by HandSynth.svelte), per hand:
 *   - height  → base frequency (continuous, theremin-style glissando)
 *   - tilt    → vibrato depth + rate (a pitch LFO modulating detune)
 *   - fingers → chord quality (which intervals stack on the base)
 *
 * Two hands = two independent VoiceGroups layered together, each a full chord.
 *
 * Stereo trick: chord tones are alternately panned hard-L / hard-R. The
 * Lissajous transform reads Side = (L - R), so panning the voicing apart gives
 * the curve horizontal width AND a shape that changes when the chord changes.
 * If every tone hit both channels equally, Side = 0 and the figure would
 * collapse to a vertical line. The two hands use OPPOSITE pan parity so their
 * chords decorrelate from each other instead of averaging into the centre.
 */

// Semitone offsets from the base note for each chord quality, indexed by
// extended-finger count (0..5). Kept small and recognizable. An empty
// intervals array means silence (every voice gates off in update()).
const CHORD_QUALITIES: { name: string; intervals: number[] }[] = [
  { name: 'MUTE', intervals: [] }, // 0 fingers (closed fist): no sound
  { name: 'MAJ', intervals: [0, 4, 7] }, // 1: major triad
  { name: 'MIN', intervals: [0, 3, 7] }, // 2: minor triad
  { name: 'DOM7', intervals: [0, 4, 7, 10] }, // 3: dominant 7th
  { name: 'MIN7', intervals: [0, 3, 7, 10] }, // 4: minor 7th
  { name: 'MAJ7', intervals: [0, 4, 7, 11] }, // 5: major 7th
];

const VOICES_PER_GROUP = 4; // largest chord uses 4 tones
const NUM_GROUPS = 2; // up to two hands

const semitoneToRatio = (s: number) => Math.pow(2, s / 12);

/** Per-hand parameters fed in each frame. */
export interface HandParams {
  baseFrequency: number;
  fingers: number; // 0..5
  vibratoDepthCents: number;
  vibratoRateHz: number;
}

export interface VoiceGroupState {
  baseFrequency: number;
  chordName: string;
  vibratoDepthCents: number;
}

export interface ChordSynthState {
  active: boolean;
  groups: VoiceGroupState[];
}

/**
 * One hand's worth of synthesis: a private vibrato LFO and a small bank of
 * oscillators voicing a single chord, panned across L/R.
 */
class VoiceGroup {
  private ctx: AudioContext;
  // Each voice has two oscillators tracking the same pitch/gate: a sawtooth
  // for audio (rich, buzzy) and a sine for the analysers (clean Lissajous
  // loops). Each has its own gain, driven to the same level in update() so the
  // two paths share one envelope.
  private voices: {
    saw: OscillatorNode;
    sine: OscillatorNode;
    audioGain: GainNode;
    visGain: GainNode;
  }[] = [];
  private lfo: OscillatorNode;
  private lfoDepth: GainNode;
  private started = false;

  private currentChordName = CHORD_QUALITIES[0].name;
  private currentBaseFreq = 0;

  /**
   * Each group has its OWN stereo buses + analyser pair, so it can be drawn as
   * an independently-colored curve, while also mixing into the shared master
   * for audio output.
   *
   * Audio and visualization are DIFFERENT waveforms: sawtooth is sent to the
   * speakers, a parallel sine is sent to the analysers — so the sound is rich
   * but the curve stays clean.
   *
   * @param panEvenLeft  if true, even voices pan left / odd right; if false,
   *                     the parity is flipped so two groups decorrelate.
   */
  constructor(
    ctx: AudioContext,
    master: AudioNode,
    leftAnalyser: AnalyserNode,
    rightAnalyser: AnalyserNode,
    panEvenLeft: boolean
  ) {
    this.ctx = ctx;

    // Audio path: sawtooth voices → stereo buses → merger → master.
    const audioL = ctx.createGain();
    const audioR = ctx.createGain();
    const audioMerger = ctx.createChannelMerger(2);
    audioL.connect(audioMerger, 0, 0);
    audioR.connect(audioMerger, 0, 1);
    audioMerger.connect(master);

    // Visualization path: sine voices → separate stereo buses → merger →
    // splitter → this group's analyser pair.
    const visL = ctx.createGain();
    const visR = ctx.createGain();
    const visMerger = ctx.createChannelMerger(2);
    visL.connect(visMerger, 0, 0);
    visR.connect(visMerger, 0, 1);
    const splitter = ctx.createChannelSplitter(2);
    visMerger.connect(splitter);
    splitter.connect(leftAnalyser, 0);
    splitter.connect(rightAnalyser, 1);

    this.lfo = ctx.createOscillator();
    this.lfo.frequency.value = 5;
    this.lfoDepth = ctx.createGain();
    this.lfoDepth.gain.value = 0; // cents
    this.lfo.connect(this.lfoDepth);

    for (let i = 0; i < VOICES_PER_GROUP; i++) {
      const saw = ctx.createOscillator();
      saw.type = 'sawtooth';
      saw.frequency.value = 220;

      const sine = ctx.createOscillator();
      sine.type = 'sine';
      sine.frequency.value = 220;

      // Vibrato fans into both oscillators' detune so they stay locked.
      this.lfoDepth.connect(saw.detune);
      this.lfoDepth.connect(sine.detune);

      const toLeft = (i % 2 === 0) === panEvenLeft;
      // Saw → audio bus, sine → vis bus. Separate gains, set to the same level
      // in update() so both paths share one envelope.
      const audioGain = ctx.createGain();
      const visGain = ctx.createGain();
      audioGain.gain.value = 0; // off until a chord assigns it
      visGain.gain.value = 0;
      saw.connect(audioGain);
      sine.connect(visGain);
      audioGain.connect(toLeft ? audioL : audioR);
      visGain.connect(toLeft ? visL : visR);

      this.voices.push({ saw, sine, audioGain, visGain });
    }
  }

  start(): void {
    if (this.started) return;
    this.started = true;
    this.lfo.start();
    for (const v of this.voices) {
      v.saw.start();
      v.sine.start();
    }
  }

  /** Retune/gate this group's voices for one hand's params. */
  update(p: HandParams): void {
    const now = this.ctx.currentTime;
    const quality = CHORD_QUALITIES[Math.max(0, Math.min(5, p.fingers))];
    this.currentChordName = quality.name;
    this.currentBaseFreq = p.baseFrequency;

    this.lfoDepth.gain.setTargetAtTime(p.vibratoDepthCents, now, 0.05);
    this.lfo.frequency.setTargetAtTime(p.vibratoRateHz, now, 0.05);

    for (let i = 0; i < VOICES_PER_GROUP; i++) {
      const v = this.voices[i];
      if (i < quality.intervals.length) {
        const freq = p.baseFrequency * semitoneToRatio(quality.intervals[i]);
        // Portamento on pitch — continuous glissando as the hand moves. Both
        // oscillators track the same frequency.
        v.saw.frequency.setTargetAtTime(freq, now, 0.04);
        v.sine.frequency.setTargetAtTime(freq, now, 0.04);
        // Halve per-group level so two stacked chords don't clip.
        const level = 0.5 / quality.intervals.length;
        v.audioGain.gain.setTargetAtTime(level, now, 0.04);
        v.visGain.gain.setTargetAtTime(level, now, 0.04);
      } else {
        v.audioGain.gain.setTargetAtTime(0, now, 0.04);
        v.visGain.gain.setTargetAtTime(0, now, 0.04);
      }
    }
  }

  /** Silence this group (hand left the frame). */
  silence(): void {
    const now = this.ctx.currentTime;
    this.currentChordName = 'MUTE';
    for (const v of this.voices) {
      v.audioGain.gain.setTargetAtTime(0, now, 0.04);
      v.visGain.gain.setTargetAtTime(0, now, 0.04);
    }
  }

  get state(): VoiceGroupState {
    return {
      baseFrequency: this.currentBaseFreq,
      chordName: this.currentChordName,
      vibratoDepthCents: this.lfoDepth.gain.value,
    };
  }

  stop(): void {
    try {
      if (this.started) {
        this.lfo.stop();
        for (const v of this.voices) {
          v.saw.stop();
          v.sine.stop();
        }
      }
    } catch {
      /* already stopped */
    }
  }
}

export class ChordSynth {
  private ctx: AudioContext;
  private groups: VoiceGroup[] = [];

  private masterGain: GainNode;
  private started = false;

  /**
   * @param analyserPairs  one [left, right] analyser pair PER voice group, so
   *                       each hand renders as its own colored curve.
   */
  constructor(
    ctx: AudioContext,
    analyserPairs: [AnalyserNode, AnalyserNode][],
    output: AudioNode
  ) {
    this.ctx = ctx;

    this.masterGain = ctx.createGain();
    this.masterGain.gain.value = 0; // silent until activated
    this.masterGain.connect(output); // audible path

    // One voice group per analyser pair, with opposite pan parity so the two
    // chords decorrelate from each other (see class doc).
    for (let g = 0; g < NUM_GROUPS; g++) {
      const pair = analyserPairs[g] ?? analyserPairs[0];
      this.groups.push(
        new VoiceGroup(ctx, this.masterGain, pair[0], pair[1], g === 0)
      );
    }
  }

  /** Start oscillators (must follow a user gesture for autoplay policy). */
  start(): void {
    if (this.started) return;
    this.started = true;
    for (const g of this.groups) g.start();
  }

  /** Fade the instrument in/out. */
  setActive(active: boolean): void {
    const now = this.ctx.currentTime;
    this.masterGain.gain.cancelScheduledValues(now);
    this.masterGain.gain.setTargetAtTime(active ? 0.6 : 0, now, 0.05);
  }

  /**
   * Drive the synth from per-hand parameters. Called every frame from
   * HandSynth. Up to NUM_GROUPS hands; extra groups are silenced.
   */
  updateHands(hands: HandParams[]): void {
    for (let g = 0; g < NUM_GROUPS; g++) {
      if (g < hands.length) {
        this.groups[g].update(hands[g]);
      } else {
        this.groups[g].silence();
      }
    }
  }

  get state(): ChordSynthState {
    return {
      active: this.masterGain.gain.value > 0.01,
      groups: this.groups.map((g) => g.state),
    };
  }

  destroy(): void {
    for (const g of this.groups) g.stop();
    this.masterGain.disconnect();
  }
}

export { CHORD_QUALITIES };
