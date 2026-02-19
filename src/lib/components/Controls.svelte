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
    <button
      class="play-button"
      class:playing={audioEngine.isPlaying}
      onclick={togglePlayback}
      disabled={!audioEngine.fileName}
    >
      {audioEngine.isPlaying ? 'PAUSE' : 'PLAY'}
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

  {#if visualizerState.renderMode === 'points'}
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
  {/if}

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
    margin-bottom: 1rem;
  }

  h2 {
    font-size: 0.6rem;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    color: #444;
    margin-top: 1.25rem;
    margin-bottom: 0.5rem;
    font-weight: 400;
  }

  .playback-controls {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .play-button {
    width: 100%;
    padding: 0.5rem 0.75rem;
    background: transparent;
    color: #e8e4dc;
    border: 1px solid #2a2a2a;
    border-radius: 0;
    font-family: 'SF Mono', 'Fira Code', 'Fira Mono', 'Cascadia Code', Consolas, monospace;
    font-size: 0.65rem;
    font-weight: 400;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    cursor: pointer;
    transition: border-color 0.1s;
    height: 28px;
  }

  .play-button:hover:not(:disabled) {
    border-color: #666;
  }

  .play-button:not(:disabled).playing {
    background: #e8e4dc;
    color: #111;
    border-color: #e8e4dc;
  }

  .play-button:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  .time-display {
    display: flex;
    justify-content: center;
    gap: 0.5rem;
    font-size: 0.65rem;
    color: #666;
    font-family: 'SF Mono', 'Fira Code', 'Fira Mono', 'Cascadia Code', Consolas, monospace;
  }

  .seek-bar {
    width: 100%;
    height: 2px;
    -webkit-appearance: none;
    appearance: none;
    background: #2a2a2a;
    outline: none;
    cursor: pointer;
  }

  .seek-bar::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 6px;
    height: 6px;
    background: #e8e4dc;
    cursor: pointer;
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

  select {
    width: 100%;
    padding: 0.25rem 0.5rem;
    background: #111;
    color: #e8e4dc;
    border: 1px solid #2a2a2a;
    border-radius: 0;
    font-family: 'SF Mono', 'Fira Code', 'Fira Mono', 'Cascadia Code', Consolas, monospace;
    font-size: 0.65rem;
    cursor: pointer;
    height: 28px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  select:hover {
    border-color: #444;
  }

  select:focus {
    outline: 1px solid #e8e4dc;
  }

  .device-selector {
    margin-top: 0.75rem;
    padding-top: 0.75rem;
    border-top: 1px solid #2a2a2a;
  }

  .device-selector label {
    display: block;
    margin-bottom: 0.25rem;
  }

  .reset-button {
    width: 100%;
    padding: 0.5rem 0.75rem;
    background: transparent;
    color: #e8e4dc;
    border: 1px solid #2a2a2a;
    border-radius: 0;
    font-family: 'SF Mono', 'Fira Code', 'Fira Mono', 'Cascadia Code', Consolas, monospace;
    font-size: 0.65rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    cursor: pointer;
    transition: border-color 0.1s;
    height: 28px;
  }

  .reset-button:hover {
    border-color: #666;
  }

  .help-text {
    margin-top: 0.75rem;
    padding: 0.75rem;
    background: #0a0a0a;
    border: 1px solid #2a2a2a;
    font-size: 0.6rem;
    line-height: 1.6;
    color: #666;
  }

  .help-text strong {
    color: #e8e4dc;
    display: block;
    margin-bottom: 0.5rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    font-weight: 400;
  }

  .toggle-group {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 0.75rem;
  }

  .toggle-button {
    flex: 1;
    padding: 0.5rem;
    background: transparent;
    color: #666;
    border: 1px solid #2a2a2a;
    border-radius: 0;
    font-family: 'SF Mono', 'Fira Code', 'Fira Mono', 'Cascadia Code', Consolas, monospace;
    font-size: 0.65rem;
    font-weight: 400;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    cursor: pointer;
    transition: border-color 0.1s, background 0.1s, color 0.1s;
    height: 28px;
  }

  .toggle-button:hover {
    border-color: #444;
  }

  .toggle-button.active {
    background: #e8e4dc;
    color: #111;
    border-color: #e8e4dc;
  }
</style>
