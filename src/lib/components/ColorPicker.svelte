<script lang="ts">
  import { visualizerState } from '$lib/stores/visualizer.svelte';

  function rgbToHex(r: number, g: number, b: number): string {
    return (
      '#' +
      [r, g, b]
        .map((x) => {
          const hex = Math.round(x * 255).toString(16);
          return hex.length === 1 ? '0' + hex : hex;
        })
        .join('')
    );
  }

  function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16) / 255,
          g: parseInt(result[2], 16) / 255,
          b: parseInt(result[3], 16) / 255,
        }
      : null;
  }

  let hexColor = $derived(
    rgbToHex(visualizerState.color.r, visualizerState.color.g, visualizerState.color.b)
  );

  function handleColorChange(event: Event) {
    const hex = (event.target as HTMLInputElement).value;
    const rgb = hexToRgb(hex);
    if (rgb) {
      visualizerState.color.r = rgb.r;
      visualizerState.color.g = rgb.g;
      visualizerState.color.b = rgb.b;
    }
  }

  // Preset colors
  const presets = [
    { name: 'Cyan', color: '#33ccff' },
    { name: 'Purple', color: '#9333ea' },
    { name: 'Green', color: '#10b981' },
    { name: 'Pink', color: '#ec4899' },
    { name: 'Orange', color: '#f97316' },
    { name: 'Blue', color: '#3b82f6' },
  ];

  function applyPreset(color: string) {
    const rgb = hexToRgb(color);
    if (rgb) {
      visualizerState.color.r = rgb.r;
      visualizerState.color.g = rgb.g;
      visualizerState.color.b = rgb.b;
    }
  }
</script>

<div class="color-picker">
  <div class="color-input-group">
    <label>
      <span class="label-text">Custom Color</span>
    </label>
    <div class="color-input-wrapper">
      <input type="color" value={hexColor} onchange={handleColorChange} class="color-input" />
      <span class="hex-value">{hexColor.toUpperCase()}</span>
    </div>
  </div>

  <div class="parameter">
    <label>
      <span class="label-text">Opacity</span>
      <span class="value">{Math.round(visualizerState.color.a * 100)}%</span>
    </label>
    <input type="range" bind:value={visualizerState.color.a} min="0" max="1" step="0.05" />
  </div>

  <div class="presets">
    <span class="presets-label">Presets:</span>
    <div class="preset-grid">
      {#each presets as preset}
        <button
          class="preset-button"
          style="background-color: {preset.color}"
          title={preset.name}
          onclick={() => applyPreset(preset.color)}
        ></button>
      {/each}
    </div>
  </div>
</div>

<style>
  .color-picker {
    margin-bottom: 1rem;
  }

  .color-input-group {
    margin-bottom: 0.75rem;
  }

  .color-input-wrapper {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    border: 1px solid #2a2a2a;
    padding: 0.25rem;
    height: 28px;
    box-sizing: border-box;
  }

  .color-input {
    width: 40px;
    height: 100%;
    border: none;
    border-radius: 0;
    cursor: pointer;
    background: transparent;
    padding: 0;
  }

  .hex-value {
    font-family: 'SF Mono', 'Fira Code', 'Fira Mono', 'Cascadia Code', Consolas, monospace;
    font-size: 0.65rem;
    color: #666;
  }

  .parameter {
    margin-bottom: 0.75rem;
  }

  label {
    display: flex;
    justify-content: space-between;
    margin-bottom: 0.25rem;
    font-size: 0.65rem;
    color: #666;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .label-text {
    font-weight: 400;
  }

  .value {
    color: #e8e4dc;
    font-family: 'SF Mono', 'Fira Code', 'Fira Mono', 'Cascadia Code', Consolas, monospace;
    font-size: 0.7rem;
    text-transform: none;
    letter-spacing: 0;
  }

  input[type='range'] {
    width: 100%;
    height: 2px;
    -webkit-appearance: none;
    appearance: none;
    background: #2a2a2a;
    outline: none;
    cursor: pointer;
    accent-color: #e8e4dc;
  }

  input[type='range']::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 6px;
    height: 6px;
    background: #e8e4dc;
    cursor: pointer;
  }

  .presets {
    margin-top: 0.75rem;
  }

  .presets-label {
    display: block;
    font-size: 0.6rem;
    color: #444;
    margin-bottom: 0.5rem;
    font-weight: 400;
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }

  .preset-grid {
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: 0.4rem;
  }

  .preset-button {
    width: 100%;
    aspect-ratio: 1;
    border: 1px solid #2a2a2a;
    border-radius: 0;
    cursor: pointer;
    transition: border-color 0.1s;
  }

  .preset-button:hover {
    border-color: #666;
  }
</style>
