<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { LissajousRenderer } from '$lib/webgl/LissajousRenderer';
  import { audioEngine, visualizerState } from '$lib/stores/visualizer.svelte';
  import { audioToLissajousPoints } from '$lib/math/lissajous';
  import type { CurveData } from '$lib/webgl/types';
  import type { FrequencyBand } from '$lib/audio/AudioEngine.svelte';

  let canvas: HTMLCanvasElement;
  let renderer: LissajousRenderer | null = null;
  let animationFrameId: number;

  onMount(() => {
    try {
      renderer = new LissajousRenderer(canvas);
      startRenderLoop();

      // Handle window resize
      const handleResize = () => renderer?.resize();
      window.addEventListener('resize', handleResize);

      return () => {
        window.removeEventListener('resize', handleResize);
      };
    } catch (error) {
      console.error('Failed to initialize renderer:', error);
    }
  });

  function startRenderLoop() {
    function render() {
      if (!renderer) return;

      // Update audio current time
      audioEngine.updateCurrentTime();

      const curves: CurveData[] = [];

      if (visualizerState.useMutliBand) {
        // Multi-band: render each enabled frequency band
        for (const band of ['bass', 'mids', 'highs', 'melody'] as FrequencyBand[]) {
          const config = visualizerState.bands[band];
          if (!config.enabled) continue;

          const bandData = audioEngine.getBandData(band);
          if (!bandData) continue;

          const points = audioToLissajousPoints(
            bandData.left,
            bandData.right,
            config.trailLength,
            visualizerState.frequencyRatioX,
            visualizerState.frequencyRatioY,
            visualizerState.phase
          );

          curves.push({
            points,
            color: [config.color.r, config.color.g, config.color.b, config.color.a],
            pointSize: config.pointSize,
            renderMode: config.renderMode,
          });
        }
      } else {
        // Single-band: render full-spectrum stereo as one curve
        const leftChannel = audioEngine.getLeftChannelData();
        const rightChannel = audioEngine.getRightChannelData();

        const points = audioToLissajousPoints(
          leftChannel,
          rightChannel,
          visualizerState.trailLength,
          visualizerState.frequencyRatioX,
          visualizerState.frequencyRatioY,
          visualizerState.phase
        );

        curves.push({
          points,
          color: [visualizerState.color.r, visualizerState.color.g, visualizerState.color.b, visualizerState.color.a],
          pointSize: visualizerState.pointSize,
          renderMode: visualizerState.renderMode,
        });
      }

      renderer.updateCurves(curves);
      renderer.setBlendMode(visualizerState.blendMode);
      renderer.render();

      animationFrameId = requestAnimationFrame(render);
    }
    render();
  }

  onDestroy(() => {
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
    }
    renderer?.destroy();
  });
</script>

<canvas bind:this={canvas} class="visualizer-canvas"></canvas>

<style>
  .visualizer-canvas {
    width: 100%;
    height: 100%;
    display: block;
    background: #000;
  }
</style>
