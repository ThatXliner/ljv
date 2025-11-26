<script lang="ts">
  import { visualizerState, audioEngine, camera } from '$lib/stores/visualizer.svelte';

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

  <h2>Rendering Mode</h2>

  <div class="toggle-group">
    <button
      class="toggle-button {!visualizerState.enable3D ? 'active' : ''}"
      onclick={() => visualizerState.enable3D = false}
    >
      2D Mode
    </button>
    <button
      class="toggle-button {visualizerState.enable3D ? 'active' : ''}"
      onclick={() => visualizerState.enable3D = true}
    >
      3D Mode
    </button>
  </div>

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

  {#if visualizerState.enable3D}
    <div class="parameter">
      <label>
        <span class="label-text">Frequency Ratio Z</span>
        <span class="value">{visualizerState.frequencyRatioZ.toFixed(1)}</span>
      </label>
      <input
        type="range"
        bind:value={visualizerState.frequencyRatioZ}
        min="0.5"
        max="4.0"
        step="0.1"
      />
    </div>
  {/if}

  <div class="parameter">
    <label>
      <span class="label-text">Phase {visualizerState.enable3D ? '(X/Y)' : ''}</span>
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

  {#if visualizerState.enable3D}
    <div class="parameter">
      <label>
        <span class="label-text">Phase Z</span>
        <span class="value">{visualizerState.phaseZ.toFixed(2)}</span>
      </label>
      <input
        type="range"
        bind:value={visualizerState.phaseZ}
        min="0"
        max={Math.PI * 2}
        step="0.1"
      />
    </div>
  {/if}

  <div class="parameter">
    <label>
      <span class="label-text">Rotation Speed</span>
      <span class="value">{visualizerState.rotationSpeed.toFixed(2)}</span>
    </label>
    <input
      type="range"
      bind:value={visualizerState.rotationSpeed}
      min="0.0"
      max="2.0"
      step="0.05"
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

  {#if visualizerState.enable3D}
    <h2>3D Settings</h2>

    <div class="parameter">
      <label>
        <span class="label-text">Z-Axis Mode</span>
      </label>
      <select bind:value={visualizerState.zMode}>
        <option value="parametric">Parametric (3D Knots)</option>
        <option value="time">Time (Tunnel Effect)</option>
        <option value="frequency">Frequency Magnitude</option>
        <option value="phase">Phase Relationship</option>
      </select>
    </div>

    <div class="parameter">
      <label>
        <span class="label-text">Z-Depth Scale</span>
        <span class="value">{visualizerState.zScale.toFixed(1)}</span>
      </label>
      <input
        type="range"
        bind:value={visualizerState.zScale}
        min="0.1"
        max="3.0"
        step="0.1"
      />
    </div>

    <h2>Camera</h2>

    <div class="parameter">
      <label>
        <span class="label-text">Distance</span>
        <span class="value">{camera.state.distance.toFixed(1)}</span>
      </label>
      <input
        type="range"
        bind:value={camera.state.distance}
        min="0.5"
        max="20"
        step="0.1"
      />
    </div>

    <div class="parameter">
      <label>
        <span class="label-text">Field of View</span>
        <span class="value">{camera.state.fov.toFixed(0)}°</span>
      </label>
      <input
        type="range"
        bind:value={camera.state.fov}
        min="30"
        max="120"
        step="5"
      />
    </div>

    <div class="parameter">
      <button class="reset-button" onclick={() => camera.reset()}>
        Reset Camera
      </button>
    </div>

    <div class="help-text">
      <strong>Camera Controls:</strong><br>
      • Left-click & drag: Orbit<br>
      • Right-click & drag: Pan<br>
      • Mouse wheel: Zoom<br>
      • Arrow keys: Rotate<br>
      • WASD: Pan<br>
      • Q/E: Zoom in/out<br>
      • R: Reset camera
    </div>
  {/if}
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

  input[type='checkbox'] {
    width: auto;
    margin-left: 0.5rem;
    cursor: pointer;
  }

  .reset-button {
    width: 100%;
    padding: 0.5rem;
    background: #374151;
    color: white;
    border: 1px solid #4b5563;
    border-radius: 0.375rem;
    font-size: 0.85rem;
    cursor: pointer;
    transition: background 0.2s;
  }

  .reset-button:hover {
    background: #4b5563;
  }

  .help-text {
    margin-top: 1rem;
    padding: 0.75rem;
    background: #1f2937;
    border-left: 3px solid #2563eb;
    border-radius: 0.375rem;
    font-size: 0.75rem;
    line-height: 1.5;
    color: #9ca3af;
  }

  .help-text strong {
    color: #d1d5db;
    display: block;
    margin-bottom: 0.5rem;
  }

  .toggle-group {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1rem;
  }

  .toggle-button {
    flex: 1;
    padding: 0.75rem;
    background: #374151;
    color: #9ca3af;
    border: 2px solid #4b5563;
    border-radius: 0.5rem;
    font-size: 0.9rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }

  .toggle-button:hover {
    background: #4b5563;
    border-color: #6b7280;
  }

  .toggle-button.active {
    background: #2563eb;
    color: white;
    border-color: #2563eb;
    box-shadow: 0 0 10px rgba(37, 99, 235, 0.3);
  }
</style>
