<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { LissajousRenderer } from '$lib/webgl/LissajousRenderer';
  import { audioEngine, visualizerState, camera } from '$lib/stores/visualizer.svelte';
  import { audioToLissajousPoints } from '$lib/math/lissajous';
  import type { CurveData } from '$lib/webgl/types';
  import type { FrequencyBand } from '$lib/audio/AudioEngine.svelte';
  import { CameraController } from '$lib/webgl/camera';

  let canvas: HTMLCanvasElement;
  let renderer: LissajousRenderer | null = null;
  let animationFrameId: number;
  let startTime: number = Date.now();
  let cameraController: CameraController | null = null;

  onMount(() => {
    try {
      renderer = new LissajousRenderer(canvas);
      renderer.setEnable3D(visualizerState.enable3D);

      // Initialize camera controller
      cameraController = new CameraController((updater) => camera.update(updater));

      // Setup event listeners
      canvas.addEventListener('mousedown', handleMouseDown);
      canvas.addEventListener('mousemove', handleMouseMove);
      canvas.addEventListener('mouseup', handleMouseUp);
      canvas.addEventListener('wheel', handleWheel);
      canvas.addEventListener('contextmenu', (e) => e.preventDefault()); // Prevent right-click menu
      window.addEventListener('keydown', handleKeyDown);

      startRenderLoop();

      // Handle window resize
      const handleResize = () => renderer?.resize();
      window.addEventListener('resize', handleResize);

      return () => {
        canvas.removeEventListener('mousedown', handleMouseDown);
        canvas.removeEventListener('mousemove', handleMouseMove);
        canvas.removeEventListener('mouseup', handleMouseUp);
        canvas.removeEventListener('wheel', handleWheel);
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('resize', handleResize);
      };
    } catch (error) {
      console.error('Failed to initialize renderer:', error);
    }
  });

  function handleMouseDown(event: MouseEvent) {
    cameraController?.handleMouseDown(event);
  }

  function handleMouseMove(event: MouseEvent) {
    cameraController?.handleMouseMove(event);
  }

  function handleMouseUp(event: MouseEvent) {
    cameraController?.handleMouseUp();
  }

  function handleWheel(event: WheelEvent) {
    cameraController?.handleWheel(event);
  }

  function handleKeyDown(event: KeyboardEvent) {
    cameraController?.handleKeyDown(event);
  }

  function startRenderLoop() {
    function render() {
      if (!renderer) return;

      // Update audio current time
      audioEngine.updateCurrentTime();

      // Calculate rotation based on elapsed time
      const elapsedTime = (Date.now() - startTime) / 1000; // Convert to seconds
      const rotation = elapsedTime * visualizerState.rotationSpeed;
      renderer.setRotation(rotation);

      // Update camera and 3D settings
      renderer.setEnable3D(visualizerState.enable3D);
      renderer.setCamera(camera.state);

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
            visualizerState.phase,
            visualizerState.enable3D,
            visualizerState.zMode,
            visualizerState.zScale,
            visualizerState.frequencyRatioZ,
            visualizerState.phaseZ
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
          visualizerState.phase,
          visualizerState.enable3D,
          visualizerState.zMode,
          visualizerState.zScale,
          visualizerState.frequencyRatioZ,
          visualizerState.phaseZ
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
