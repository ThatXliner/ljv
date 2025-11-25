<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { LissajousRenderer } from '$lib/webgl/LissajousRenderer';
  import { audioEngine, visualizerState } from '$lib/stores/visualizer.svelte';
  import { audioToLissajousPoints } from '$lib/math/lissajous';

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

      // Get audio data
      const leftChannel = audioEngine.getLeftChannelData();
      const rightChannel = audioEngine.getRightChannelData();

      // Convert to Lissajous points
      const points = audioToLissajousPoints(
        leftChannel,
        rightChannel,
        visualizerState.trailLength,
        visualizerState.frequencyRatioX,
        visualizerState.frequencyRatioY,
        visualizerState.phase
      );

      // Update renderer
      renderer.updatePoints(points);
      renderer.setColor(
        visualizerState.color.r,
        visualizerState.color.g,
        visualizerState.color.b,
        visualizerState.color.a
      );
      renderer.setPointSize(visualizerState.pointSize);
      renderer.setRenderMode(visualizerState.renderMode);
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
