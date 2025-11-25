import { AudioEngine } from '$lib/audio/AudioEngine.svelte';
import type { RenderMode, BlendMode } from '$lib/webgl/types';

// Singleton audio engine instance
export const audioEngine = new AudioEngine();

// Visualizer parameters (reactive with runes)
class VisualizerState {
  color = $state({ r: 0.2, g: 0.8, b: 1.0, a: 1.0 });
  frequencyRatioX = $state(1.0);
  frequencyRatioY = $state(1.0);
  phase = $state(0.0);
  trailLength = $state(2048);
  pointSize = $state(3.0);
  renderMode = $state<RenderMode>('points');
  blendMode = $state<BlendMode>('additive');
}

export const visualizerState = new VisualizerState();

// File loading state
class FileState {
  fileName = $state<string | null>(null);
  isLoading = $state(false);
  error = $state<string | null>(null);
}

export const fileState = new FileState();
