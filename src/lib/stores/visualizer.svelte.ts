import { AudioEngine } from '$lib/audio/AudioEngine.svelte';
import type { RenderMode, BlendMode } from '$lib/webgl/types';
import type { FrequencyBand } from '$lib/audio/AudioEngine.svelte';
import type { CameraState } from '$lib/webgl/camera';
import { createDefaultCameraState } from '$lib/webgl/camera';

// Singleton audio engine instance
export const audioEngine = new AudioEngine();

// Per-band curve configuration
export interface BandConfig {
  enabled: boolean;
  color: { r: number; g: number; b: number; a: number };
  pointSize: number;
  trailLength: number;
  renderMode: RenderMode;
}

// Visualizer parameters (reactive with runes)
class VisualizerState {
  // Single-band curve parameters
  color = $state({ r: 0.2, g: 0.8, b: 1.0, a: 1.0 });
  frequencyRatioX = $state(1.0);
  frequencyRatioY = $state(1.0);
  frequencyRatioZ = $state(1.5); // For parametric 3D Lissajous
  phase = $state(0.0);
  phaseZ = $state(Math.PI / 2); // Phase offset for Z-axis
  trailLength = $state(2048);
  pointSize = $state(3.0);
  renderMode = $state<RenderMode>('points');
  blendMode = $state<BlendMode>('additive');

  // Rotation parameters
  rotationSpeed = $state(0.0); // radians per second (0 = no rotation)

  // 3D rendering
  enable3D = $state(true);
  zMode = $state<'time' | 'frequency' | 'phase' | 'parametric'>('parametric'); // How to generate Z coordinate
  zScale = $state(1.0); // Scaling factor for Z depth

  // Multi-band mode toggle
  useMutliBand = $state(true);
  bands = $state<Record<FrequencyBand, BandConfig>>({
    bass: {
      enabled: true,
      color: { r: 1.0, g: 0.2, b: 0.2, a: 0.8 }, // Red
      pointSize: 4.0,
      trailLength: 2048,
      renderMode: 'points',
    },
    mids: {
      enabled: true,
      color: { r: 0.2, g: 1.0, b: 0.2, a: 0.8 }, // Green
      pointSize: 3.0,
      trailLength: 2048,
      renderMode: 'points',
    },
    highs: {
      enabled: true,
      color: { r: 0.2, g: 0.6, b: 1.0, a: 0.8 }, // Blue
      pointSize: 2.0,
      trailLength: 1024,
      renderMode: 'points',
    },
    melody: {
      enabled: true,
      color: { r: 1.0, g: 0.8, b: 0.2, a: 0.9 }, // Gold/Yellow
      pointSize: 5.0,
      trailLength: 2048,
      renderMode: 'points',
    },
  });
}

export const visualizerState = new VisualizerState();

// Camera state for 3D rendering
class Camera {
  state = $state<CameraState>(createDefaultCameraState());

  // Update camera state using a callback
  update(updater: (state: CameraState) => void) {
    updater(this.state);
  }

  // Reset to default
  reset() {
    this.state = createDefaultCameraState();
  }
}

export const camera = new Camera();

// File loading state
class FileState {
  fileName = $state<string | null>(null);
  isLoading = $state(false);
  error = $state<string | null>(null);
}

export const fileState = new FileState();
