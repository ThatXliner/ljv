<script lang="ts">
  import { visualizerState, audioEngine } from '$lib/stores/visualizer.svelte';
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

  // Filter slider ranges per band
  const filterFreqRange: Record<FrequencyBand, { min: number; max: number } | null> = {
    bass:   { min: 20,   max: 2000  },
    mids:   { min: 200,  max: 8000  },
    highs:  { min: 1000, max: 20000 },
    melody: null,
  };

  // Propagate filter param changes to the audio engine live
  $effect(() => {
    for (const band of ['bass', 'mids', 'highs'] as FrequencyBand[]) {
      audioEngine.updateBandFilter(
        band,
        visualizerState.bands[band].filterFrequency,
        visualizerState.bands[band].filterQ,
      );
    }
  });

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
  <button
    class="mode-toggle"
    class:active={visualizerState.useMutliBand}
    onclick={() => (visualizerState.useMutliBand = !visualizerState.useMutliBand)}
  >
    MULTI-BAND
  </button>

  {#if visualizerState.useMutliBand}
    <div class="bands">
      {#each Object.entries(bandLabels) as [band, label]}
        {@const config = visualizerState.bands[band as FrequencyBand]}
        {@const bandColor = rgbToHex(config.color.r, config.color.g, config.color.b)}
        <div
          class="band-section"
          class:disabled={!config.enabled}
          style:border-color={config.enabled ? bandColor : null}
          onclick={() => (config.enabled = !config.enabled)}
          role="button"
          tabindex="0"
          onkeydown={(e) => e.key === 'Enter' || e.key === ' ' ? (config.enabled = !config.enabled) : null}
        >
          <div class="band-header">
            <div
              class="band-title"
              class:enabled={config.enabled}
              style:color={config.enabled ? bandColor : null}
            >
              <span class="band-name">{label}</span>
              <span class="band-freq">{bandDescriptions[band as FrequencyBand]}</span>
            </div>
          </div>

          {#if config.enabled}
            <div class="band-config" onclick={(e) => e.stopPropagation()} role="presentation">
              <div class="config-row">
                <label class="color-picker">
                  <span>Color</span>
                  <input
                    type="color"
                    value={bandColor}
                    style:border-color={bandColor}
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
                {#if config.renderMode === 'points'}
                  <label class="slider-control">
                    <span class="control-label">
                      <span>Point Size</span>
                      <span class="value">{config.pointSize.toFixed(1)}</span>
                    </span>
                    <input type="range" bind:value={config.pointSize} min="1" max="10" step="0.5" />
                  </label>
                {/if}

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

              {#if filterFreqRange[band as FrequencyBand] !== null}
                {@const freqRange = filterFreqRange[band as FrequencyBand]!}
                <div class="config-row">
                  <label class="slider-control">
                    <span class="control-label">
                      <span>Cutoff Freq</span>
                      <span class="value">{config.filterFrequency} Hz</span>
                    </span>
                    <input
                      type="range"
                      bind:value={config.filterFrequency}
                      min={freqRange.min}
                      max={freqRange.max}
                      step="1"
                    />
                  </label>

                  <label class="slider-control">
                    <span class="control-label">
                      <span>Q</span>
                      <span class="value">{config.filterQ.toFixed(1)}</span>
                    </span>
                    <input
                      type="range"
                      bind:value={config.filterQ}
                      min="0.1"
                      max="10"
                      step="0.1"
                    />
                  </label>
                </div>
              {/if}

              {#if band === 'melody'}
                <div class="config-row">
                  <label class="slider-control">
                    <span class="control-label">
                      <span>Harmonic Depth</span>
                      <span class="value">{config.melodyHarmonicDepth}</span>
                    </span>
                    <input type="range" bind:value={config.melodyHarmonicDepth} min="1" max="32" step="1" />
                  </label>
                </div>
              {/if}
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
    gap: 0.5rem;
  }

  .mode-toggle {
    width: 100%;
    padding: 0.5rem 0.75rem;
    background: transparent;
    color: #666;
    border: 1px solid #2a2a2a;
    border-radius: 0;
    font-family: 'SF Mono', 'Fira Code', 'Fira Mono', 'Cascadia Code', Consolas, monospace;
    font-size: 0.65rem;
    font-weight: 400;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    cursor: pointer;
    transition: border-color 0.1s, background 0.1s, color 0.1s;
    height: 28px;
    text-align: left;
  }

  .mode-toggle:hover {
    border-color: #444;
  }

  .mode-toggle.active {
    background: #e8e4dc;
    color: #111;
    border-color: #e8e4dc;
  }

  .bands {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .band-section {
    background: transparent;
    border: 1px solid #2a2a2a;
    padding: 0.75rem;
    transition: opacity 0.1s, border-color 0.1s;
    cursor: pointer;
  }

  .band-section.disabled {
    opacity: 0.3;
  }

  .band-header {
    margin-bottom: 0.5rem;
  }

  .band-title {
    display: flex;
    align-items: center;
    width: 100%;
    background: transparent;
    border: none;
    padding: 0;
    cursor: pointer;
    font-family: 'SF Mono', 'Fira Code', 'Fira Mono', 'Cascadia Code', Consolas, monospace;
    gap: 0.5rem;
  }

  .band-name {
    font-size: 0.65rem;
    font-weight: 400;
    color: #666;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .band-freq {
    font-size: 0.6rem;
    color: #444;
    margin-left: auto;
    font-family: 'SF Mono', 'Fira Code', 'Fira Mono', 'Cascadia Code', Consolas, monospace;
    letter-spacing: 0;
  }

  .band-config {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding-top: 0.5rem;
    border-top: 1px solid #2a2a2a;
    cursor: default;
  }

  .config-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.5rem;
  }

  .color-picker {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.65rem;
    color: #666;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .color-picker input[type='color'] {
    width: 28px;
    height: 20px;
    border: 1px solid #2a2a2a;
    border-radius: 0;
    cursor: pointer;
    background: transparent;
    padding: 0;
  }

  .slider-control {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .control-label {
    display: flex;
    justify-content: space-between;
    font-size: 0.65rem;
    color: #666;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .value {
    color: #e8e4dc;
    font-family: 'SF Mono', 'Fira Code', 'Fira Mono', 'Cascadia Code', Consolas, monospace;
    font-size: 0.65rem;
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

  .render-mode {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    font-size: 0.65rem;
    color: #666;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  select {
    padding: 0.25rem 0.4rem;
    background: #111;
    color: #e8e4dc;
    border: 1px solid #2a2a2a;
    border-radius: 0;
    font-family: 'SF Mono', 'Fira Code', 'Fira Mono', 'Cascadia Code', Consolas, monospace;
    font-size: 0.65rem;
    cursor: pointer;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  select:hover {
    border-color: #444;
  }

  select:focus {
    outline: 1px solid #e8e4dc;
  }
</style>
