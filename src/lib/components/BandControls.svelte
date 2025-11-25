<script lang="ts">
  import { visualizerState } from '$lib/stores/visualizer.svelte';
  import type { FrequencyBand } from '$lib/audio/AudioEngine.svelte';

  const bandLabels: Record<FrequencyBand, string> = {
    bass: 'Bass/Drums',
    mids: 'Mids/Vocals',
    highs: 'Highs/Noise',
    melody: 'Main Melody',
  };

  const bandDescriptions: Record<FrequencyBand, string> = {
    bass: '20-250 Hz',
    mids: '250-4000 Hz',
    highs: '4000+ Hz',
    melody: 'Dominant frequencies',
  };

  function rgbToHex(r: number, g: number, b: number): string {
    const toHex = (n: number) => {
      const hex = Math.round(n * 255).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }

  function hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return { r: 1, g: 1, b: 1 };
    return {
      r: parseInt(result[1], 16) / 255,
      g: parseInt(result[2], 16) / 255,
      b: parseInt(result[3], 16) / 255,
    };
  }

  function handleColorChange(band: FrequencyBand, event: Event) {
    const target = event.target as HTMLInputElement;
    const rgb = hexToRgb(target.value);
    visualizerState.bands[band].color.r = rgb.r;
    visualizerState.bands[band].color.g = rgb.g;
    visualizerState.bands[band].color.b = rgb.b;
  }
</script>

<div class="band-controls">
  <div class="mode-toggle">
    <label>
      <input type="checkbox" bind:checked={visualizerState.useMutliBand} />
      <span class="toggle-label">Enable Multi-Band Visualization</span>
    </label>
  </div>

  {#if visualizerState.useMutliBand}
    <div class="bands">
      {#each Object.entries(bandLabels) as [band, label]}
        {@const config = visualizerState.bands[band as FrequencyBand]}
        <div class="band-section" class:disabled={!config.enabled}>
          <div class="band-header">
            <label class="band-title">
              <input type="checkbox" bind:checked={config.enabled} />
              <span class="band-name">{label}</span>
              <span class="band-description">{bandDescriptions[band as FrequencyBand]}</span>
            </label>
          </div>

          {#if config.enabled}
            <div class="band-config">
              <div class="config-row">
                <label class="color-picker">
                  <span>Color</span>
                  <input
                    type="color"
                    value={rgbToHex(config.color.r, config.color.g, config.color.b)}
                    oninput={(e) => handleColorChange(band as FrequencyBand, e)}
                  />
                </label>

                <label class="slider-control">
                  <span class="control-label">
                    <span>Alpha</span>
                    <span class="value">{config.color.a.toFixed(2)}</span>
                  </span>
                  <input type="range" bind:value={config.color.a} min="0.1" max="1.0" step="0.05" />
                </label>
              </div>

              <div class="config-row">
                <label class="slider-control">
                  <span class="control-label">
                    <span>Point Size</span>
                    <span class="value">{config.pointSize.toFixed(1)}</span>
                  </span>
                  <input type="range" bind:value={config.pointSize} min="1" max="10" step="0.5" />
                </label>

                <label class="slider-control">
                  <span class="control-label">
                    <span>Trail Length</span>
                    <span class="value">{config.trailLength}</span>
                  </span>
                  <input
                    type="range"
                    bind:value={config.trailLength}
                    min="256"
                    max="4096"
                    step="256"
                  />
                </label>
              </div>

              <div class="config-row">
                <label class="render-mode">
                  <span>Render Mode</span>
                  <select bind:value={config.renderMode}>
                    <option value="points">Points</option>
                    <option value="lines">Lines</option>
                  </select>
                </label>
              </div>
            </div>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .band-controls {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .mode-toggle {
    padding: 0.75rem;
    background: #1f2937;
    border-radius: 0.5rem;
  }

  .mode-toggle label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
  }

  .toggle-label {
    font-size: 0.9rem;
    font-weight: 600;
    color: #e5e7eb;
  }

  .bands {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .band-section {
    background: #1f2937;
    border-radius: 0.5rem;
    padding: 0.75rem;
    border: 2px solid transparent;
    transition: all 0.2s;
  }

  .band-section:not(.disabled) {
    border-color: #374151;
  }

  .band-section.disabled {
    opacity: 0.5;
  }

  .band-header {
    margin-bottom: 0.75rem;
  }

  .band-title {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
  }

  .band-name {
    font-size: 0.9rem;
    font-weight: 600;
    color: #e5e7eb;
  }

  .band-description {
    font-size: 0.75rem;
    color: #9ca3af;
    margin-left: auto;
  }

  .band-config {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding-top: 0.5rem;
    border-top: 1px solid #374151;
  }

  .config-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.75rem;
  }

  .color-picker {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.85rem;
    color: #d1d5db;
  }

  .color-picker input[type='color'] {
    width: 40px;
    height: 28px;
    border: none;
    border-radius: 0.25rem;
    cursor: pointer;
  }

  .slider-control {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .control-label {
    display: flex;
    justify-content: space-between;
    font-size: 0.8rem;
    color: #d1d5db;
  }

  .value {
    color: #9ca3af;
    font-family: monospace;
  }

  input[type='range'] {
    width: 100%;
    accent-color: #2563eb;
  }

  input[type='checkbox'] {
    width: 16px;
    height: 16px;
    cursor: pointer;
    accent-color: #10b981;
  }

  .render-mode {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    font-size: 0.8rem;
    color: #d1d5db;
  }

  select {
    padding: 0.4rem;
    background: #374151;
    color: white;
    border: 1px solid #4b5563;
    border-radius: 0.375rem;
    font-size: 0.8rem;
    cursor: pointer;
  }

  select:hover {
    border-color: #6b7280;
  }
</style>
