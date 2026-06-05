<script lang="ts">
  import { onDestroy } from 'svelte';
  import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
  import { audioEngine, visualizerState } from '$lib/stores/visualizer.svelte';
  import { ChordSynth, type HandParams } from '$lib/audio/ChordSynth';

  // --- tunable mapping constants ------------------------------------------
  const MIN_FREQ = 110; // A2 — hand at bottom of frame
  const MAX_FREQ = 880; // A5 — hand at top of frame
  const HEIGHT_SMOOTHING = 0.35; // EMA factor for the jittery continuous axis
  const MAX_VIBRATO_CENTS = 50;
  const MIN_VIBRATO_RATE = 4;
  const MAX_VIBRATO_RATE = 8;
  const TILT_DEADZONE = 0.08; // radians of roll ignored (hand rarely dead level)
  const TILT_FULL = 0.7; // radians of roll = max vibrato

  // --- landmark indices ----------------------------------------------------
  const WRIST = 0;
  const MIDDLE_MCP = 9;
  const TIPS = [4, 8, 12, 16, 20];
  const PIPS = [3, 6, 10, 14, 18];

  let videoEl = $state<HTMLVideoElement | null>(null);
  let running = $state(false);
  let status = $state('OFF');
  let handDetected = $state(false);

  // HUD readouts — one row per detected hand
  interface HudHand {
    label: string; // L / R
    chord: string;
    fingers: number;
    freq: number;
    vibrato: number;
  }
  let hudHands = $state<HudHand[]>([]);

  let landmarker: HandLandmarker | null = null;
  let synth: ChordSynth | null = null;
  let stream: MediaStream | null = null;
  let rafId = 0;
  let lastVideoTime = -1;
  // Per-hand height EMA, keyed by handedness label so smoothing follows the
  // physical hand even if MediaPipe reorders the landmark array between frames.
  let smoothedHeight: Record<string, number> = {};
  let prevMultiBand = visualizerState.useMutliBand;

  async function start() {
    if (running) return;
    status = 'INIT…';

    try {
      // 1. Audio context + synth (must be after a user gesture)
      await audioEngine.initialize();
      const ctx = audioEngine.context;
      const la = audioEngine.leftStereoAnalyser;
      const ra = audioEngine.rightStereoAnalyser;
      const out = audioEngine.outputNode;
      if (!ctx || !la || !ra || !out) {
        status = 'NO AUDIO';
        return;
      }
      if (ctx.state === 'suspended') await ctx.resume();
      synth = new ChordSynth(ctx, la, ra, out);
      synth.start();
      synth.setActive(true);

      // The synth feeds the single-band stereo analysers; switch the
      // visualizer to single-band so the curve actually shows it.
      prevMultiBand = visualizerState.useMutliBand;
      visualizerState.useMutliBand = false;

      // 2. Webcam
      stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' },
      });
      if (videoEl) {
        videoEl.srcObject = stream;
        await videoEl.play();
      }

      // 3. MediaPipe hand landmarker (assets vendored under /mediapipe)
      const vision = await FilesetResolver.forVisionTasks('/mediapipe/wasm');
      landmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: '/mediapipe/hand_landmarker.task',
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numHands: 2,
      });

      running = true;
      status = 'TRACKING';
      loop();
    } catch (err) {
      console.error('HandSynth start failed:', err);
      status = 'ERROR';
      stop();
    }
  }

  function stop() {
    running = false;
    status = 'OFF';
    handDetected = false;
    hudHands = [];
    smoothedHeight = {};
    if (rafId) cancelAnimationFrame(rafId);
    synth?.setActive(false);
    synth?.destroy();
    synth = null;
    landmarker?.close();
    landmarker = null;
    stream?.getTracks().forEach((t) => t.stop());
    stream = null;
    visualizerState.useMutliBand = prevMultiBand;
  }

  function toggle() {
    running ? stop() : start();
  }

  // Count extended fingers. Non-thumb: tip farther from wrist than its PIP.
  // Thumb: compare horizontal distance (it bends sideways, not down).
  function countFingers(lm: { x: number; y: number }[]): number {
    const wrist = lm[WRIST];
    let count = 0;
    // four fingers
    for (let i = 1; i < 5; i++) {
      const tip = lm[TIPS[i]];
      const pip = lm[PIPS[i]];
      const dTip = Math.hypot(tip.x - wrist.x, tip.y - wrist.y);
      const dPip = Math.hypot(pip.x - wrist.x, pip.y - wrist.y);
      if (dTip > dPip) count++;
    }
    // thumb
    const thumbTip = lm[TIPS[0]];
    const thumbIp = lm[PIPS[0]];
    if (Math.abs(thumbTip.x - wrist.x) > Math.abs(thumbIp.x - wrist.x) * 1.1) {
      count++;
    }
    return count;
  }

  // Compute one hand's synth params from its 21 landmarks. `key` identifies
  // the physical hand for per-hand height smoothing.
  function handToParams(
    lm: { x: number; y: number }[],
    key: string
  ): HandParams {
    const wrist = lm[WRIST];
    const midMcp = lm[MIDDLE_MCP];

    // HEIGHT → base frequency (y is 0 at top; invert so up = higher pitch)
    const rawHeight = 1 - wrist.y;
    const prev = smoothedHeight[key] ?? rawHeight;
    const sm = prev + (rawHeight - prev) * HEIGHT_SMOOTHING;
    smoothedHeight[key] = sm;
    const h = Math.max(0, Math.min(1, sm));
    // exponential (pitch is logarithmic)
    const baseFrequency = MIN_FREQ * Math.pow(MAX_FREQ / MIN_FREQ, h);

    // FINGERS → chord quality
    const fingers = countFingers(lm);

    // TILT (roll) → vibrato. Angle of wrist→middle-MCP vector vs vertical.
    const dx = midMcp.x - wrist.x;
    const dy = midMcp.y - wrist.y;
    const roll = Math.atan2(dx, -dy); // 0 = hand pointing straight up
    const tiltMag = Math.max(
      0,
      Math.min(1, (Math.abs(roll) - TILT_DEADZONE) / (TILT_FULL - TILT_DEADZONE))
    );
    const vibratoDepthCents = tiltMag * MAX_VIBRATO_CENTS;
    const vibratoRateHz =
      MIN_VIBRATO_RATE + tiltMag * (MAX_VIBRATO_RATE - MIN_VIBRATO_RATE);

    return { baseFrequency, fingers, vibratoDepthCents, vibratoRateHz };
  }

  function loop() {
    if (!running || !landmarker || !videoEl) return;

    // Only run inference when the camera produced a new frame, but drive it off
    // a monotonic clock (MediaPipe requires strictly-increasing timestamps).
    // video.currentTime can report stale/non-advancing values on a live
    // MediaStream, which would freeze the HUD — so gate on it loosely and
    // always feed performance.now().
    const now = performance.now();
    if (videoEl.readyState >= 2 && now - lastVideoTime >= 1) {
      lastVideoTime = now;
      const result = landmarker.detectForVideo(videoEl, now);

      const count = result.landmarks?.length ?? 0;
      if (count > 0) {
        handDetected = true;
        const params: HandParams[] = [];
        const hud: HudHand[] = [];

        for (let i = 0; i < count; i++) {
          const lm = result.landmarks[i];
          // MediaPipe labels handedness from the raw (un-mirrored) image; the
          // preview is mirrored, so flip the label to match what the user sees.
          const raw = result.handedness?.[i]?.[0]?.categoryName ?? `H${i}`;
          const label = raw === 'Left' ? 'R' : raw === 'Right' ? 'L' : raw;
          const key = `${label}${i === 0 ? '' : i}`; // stable per-hand key

          const p = handToParams(lm, key);
          params.push(p);
          hud.push({
            label,
            chord: '', // filled from synth state after update
            fingers: p.fingers,
            freq: Math.round(p.baseFrequency),
            vibrato: Math.round(p.vibratoDepthCents),
          });
        }

        synth?.updateHands(params);

        // Pull resolved chord names back from the synth for the HUD.
        const gs = synth?.state.groups ?? [];
        for (let i = 0; i < hud.length; i++) {
          hud[i].chord = gs[i]?.chordName ?? '—';
        }
        hudHands = hud;
      } else {
        handDetected = false;
        synth?.updateHands([]); // fade all chords out, keep tracking
        hudHands = [];
      }
    }

    rafId = requestAnimationFrame(loop);
  }

  onDestroy(stop);
</script>

<div class="handsynth">
  <button class="toggle" class:on={running} onclick={toggle}>
    {running ? 'HAND SYNTH ◼ STOP' : 'HAND SYNTH ▶ START'}
  </button>

  <!-- video is always mounted but hidden until running, so MediaPipe has a
       source element to read from -->
  <div class="preview" class:visible={running}>
    <!-- svelte-ignore a11y_media_has_caption -->
    <video bind:this={videoEl} class="cam" playsinline muted></video>
    <div class="hud">
      <div class="row"><span>STATUS</span><b class:live={handDetected}>{status}</b></div>
      {#if hudHands.length === 0}
        <div class="row"><span>HAND</span><b>—</b></div>
      {/if}
      {#each hudHands as hand (hand.label)}
        <div class="hand-block">
          <div class="row"><span>{hand.label} CHORD</span><b>{hand.chord}</b></div>
          <div class="row"><span>{hand.label} FINGERS</span><b>{hand.fingers}</b></div>
          <div class="row"><span>{hand.label} PITCH</span><b>{hand.freq} HZ</b></div>
          <div class="row"><span>{hand.label} VIB</span><b>{hand.vibrato} ¢</b></div>
        </div>
      {/each}
    </div>
  </div>

  {#if running}
    <p class="hint">
      EACH HAND · HEIGHT → PITCH · FINGERS → CHORD · TILT → VIBRATO
    </p>
  {/if}
</div>

<style>
  .handsynth {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .toggle {
    background: #1a1a1a;
    color: #e8e4dc;
    border: 1px solid #2a2a2a;
    padding: 0.5rem 0.75rem;
    font-family: inherit;
    font-size: 0.6rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    cursor: pointer;
    transition: border-color 0.15s, color 0.15s;
  }
  .toggle:hover {
    border-color: #444;
  }
  .toggle.on {
    color: #7fd4ff;
    border-color: #2d5a6e;
  }

  .preview {
    display: none;
    position: relative;
    border: 1px solid #2a2a2a;
    background: #000;
    aspect-ratio: 4 / 3;
    overflow: hidden;
  }
  .preview.visible {
    display: block;
  }

  .cam {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transform: scaleX(-1); /* mirror — selfie view */
    opacity: 0.55;
  }

  .hud {
    position: absolute;
    top: 0;
    left: 0;
    padding: 0.4rem 0.5rem;
    font-size: 0.55rem;
    letter-spacing: 0.1em;
    line-height: 1.6;
  }
  .row {
    display: flex;
    gap: 0.5rem;
    justify-content: space-between;
  }
  .row span {
    color: #555;
    text-transform: uppercase;
  }
  .row b {
    color: #e8e4dc;
    font-weight: 400;
    min-width: 3.5em;
    text-align: right;
  }
  .row b.live {
    color: #7fd4ff;
  }
  .hand-block {
    margin-top: 0.35rem;
    padding-top: 0.25rem;
    border-top: 1px solid #1e1e1e;
  }

  .hint {
    margin: 0;
    font-size: 0.5rem;
    letter-spacing: 0.08em;
    color: #444;
    text-transform: uppercase;
    text-align: center;
  }
</style>
