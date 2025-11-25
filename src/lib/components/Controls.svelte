<script lang="ts">
  import { visualizerState, audioEngine } from '$lib/stores/visualizer.svelte';

  function togglePlayback() {
    if (audioEngine.isPlaying) {
      audioEngine.pause();
    } else {
      audioEngine.play();
    }
  }

  function handleSeek(event: Event) {
    const target = event.target as HTMLInputElement;
    const time = parseFloat(target.value);
    audioEngine.seek(time);
  }

  function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  async function handleDeviceChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    await audioEngine.setOutputDevice(target.value);
  }
</script>

<div class="controls">
  <h2>Playback</h2>

  <div class="playback-controls">
    <button class="play-button" onclick={togglePlayback} disabled={!audioEngine.fileName}>
      {audioEngine.isPlaying ? '⏸ Pause' : '▶ Play'}
    </button>

    {#if audioEngine.duration > 0}
      <div class="time-display">
        <span>{formatTime(audioEngine.currentTime)}</span>
        <span>/</span>
        <span>{formatTime(audioEngine.duration)}</span>
      </div>

      <input
        type="range"
        class="seek-bar"
        min="0"
        max={audioEngine.duration}
        step="0.1"
        value={audioEngine.currentTime}
        oninput={handleSeek}
      />
    {/if}
  </div>

  {#if audioEngine.availableDevices.length > 0}
    <div class="device-selector">
      <label>
        <span class="label-text">Output Device</span>
      </label>
      <select value={audioEngine.selectedDeviceId} onchange={handleDeviceChange}>
        {#each audioEngine.availableDevices as device}
          <option value={device.deviceId}>
            {device.label || `Device ${device.deviceId.slice(0, 8)}`}
          </option>
        {/each}
      </select>
    </div>
  {/if}

  <h2>Parameters</h2>

  <div class="parameter">
    <label>
      <span class="label-text">Frequency Ratio X</span>
      <span class="value">{visualizerState.frequencyRatioX.toFixed(1)}</span>
    </label>
    <input
      type="range"
      bind:value={visualizerState.frequencyRatioX}
      min="0.5"
      max="4.0"
      step="0.1"
    />
  </div>

  <div class="parameter">
    <label>
      <span class="label-text">Frequency Ratio Y</span>
      <span class="value">{visualizerState.frequencyRatioY.toFixed(1)}</span>
    </label>
    <input
      type="range"
      bind:value={visualizerState.frequencyRatioY}
      min="0.5"
      max="4.0"
      step="0.1"
    />
  </div>

  <div class="parameter">
    <label>
      <span class="label-text">Phase</span>
      <span class="value">{visualizerState.phase.toFixed(2)}</span>
    </label>
    <input
      type="range"
      bind:value={visualizerState.phase}
      min="0"
      max={Math.PI * 2}
      step="0.1"
    />
  </div>

  <div class="parameter">
    <label>
      <span class="label-text">Trail Length</span>
      <span class="value">{visualizerState.trailLength}</span>
    </label>
    <input
      type="range"
      bind:value={visualizerState.trailLength}
      min="256"
      max="4096"
      step="256"
    />
  </div>

  <div class="parameter">
    <label>
      <span class="label-text">Point Size</span>
      <span class="value">{visualizerState.pointSize.toFixed(1)}</span>
    </label>
    <input
      type="range"
      bind:value={visualizerState.pointSize}
      min="1"
      max="10"
      step="0.5"
    />
  </div>

  {#if !visualizerState.useMutliBand}
    <div class="parameter">
      <label>
        <span class="label-text">Render Mode</span>
      </label>
      <select bind:value={visualizerState.renderMode}>
        <option value="points">Points</option>
        <option value="lines">Lines</option>
      </select>
    </div>
  {/if}

  <div class="parameter">
    <label>
      <span class="label-text">Blend Mode</span>
    </label>
    <select bind:value={visualizerState.blendMode}>
      <option value="additive">Additive</option>
      <option value="normal">Normal</option>
    </select>
  </div>
</div>

<style>
  .controls {
    margin-bottom: 1.5rem;
  }

  h2 {
    font-size: 1rem;
    margin-top: 1.5rem;
    margin-bottom: 0.75rem;
    color: #e5e7eb;
  }

  .playback-controls {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .play-button {
    width: 100%;
    padding: 0.75rem;
    background: #10b981;
    color: white;
    border: none;
    border-radius: 0.5rem;
    font-size: 0.9rem;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.2s;
  }

  .play-button:hover:not(:disabled) {
    background: #059669;
  }

  .play-button:disabled {
    background: #6b7280;
    cursor: not-allowed;
  }

  .time-display {
    display: flex;
    justify-content: center;
    gap: 0.5rem;
    font-size: 0.85rem;
    color: #9ca3af;
  }

  .seek-bar {
    width: 100%;
  }

  .parameter {
    margin-bottom: 1rem;
  }

  label {
    display: flex;
    justify-content: space-between;
    margin-bottom: 0.25rem;
    font-size: 0.85rem;
    color: #d1d5db;
  }

  .label-text {
    font-weight: 500;
  }

  .value {
    color: #9ca3af;
    font-family: monospace;
  }

  input[type='range'],
  select {
    width: 100%;
    accent-color: #2563eb;
  }

  select {
    padding: 0.5rem;
    background: #374151;
    color: white;
    border: 1px solid #4b5563;
    border-radius: 0.375rem;
    font-size: 0.85rem;
    cursor: pointer;
  }

  select:hover {
    border-color: #6b7280;
  }

  .device-selector {
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid #374151;
  }

  .device-selector label {
    display: block;
    margin-bottom: 0.25rem;
    font-size: 0.85rem;
    color: #d1d5db;
  }
</style>
