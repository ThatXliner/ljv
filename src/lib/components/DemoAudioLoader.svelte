<script lang="ts">
  import { audioEngine, fileState } from '$lib/stores/visualizer.svelte';
  import {
    generateStereoTone,
    generateStereoChord,
    audioBufferToArrayBuffer,
    INTERVAL_PRESETS,
    CHORD_PRESETS,
    type DemoPreset,
    type ChordPreset,
  } from '$lib/audio/synthesis';

  type TabType = 'intervals' | 'chords';

  let activeTab = $state<TabType>('intervals');
  let loadingStates = $state<Record<string, boolean>>({});
  let selectedDemo = $state<string | null>(null);

  async function handleIntervalSelect(preset: DemoPreset) {
    loadingStates[preset.id] = true;
    fileState.error = null;

    try {
      // Remember if we were playing
      const wasPlaying = audioEngine.isPlaying;

      // Stop current playback and reset position
      audioEngine.stop();

      const audioBuffer = await generateStereoTone(preset.leftRatio, preset.rightRatio, 440, 15);

      const arrayBuffer = audioBufferToArrayBuffer(audioBuffer);

      await audioEngine.loadAudioFile(arrayBuffer, `${preset.name} (${preset.description})`);

      fileState.fileName = `${preset.name} - ${preset.description}`;
      selectedDemo = preset.id;

      // Auto-play if we were already playing
      if (wasPlaying) {
        audioEngine.play();
      }
    } catch (err: any) {
      fileState.error = err.message || 'Failed to generate demo audio';
      console.error('Error generating demo audio:', err);
    } finally {
      loadingStates[preset.id] = false;
    }
  }

  async function handleChordSelect(preset: ChordPreset) {
    loadingStates[preset.id] = true;
    fileState.error = null;

    try {
      // Remember if we were playing
      const wasPlaying = audioEngine.isPlaying;

      // Stop current playback and reset position
      audioEngine.stop();

      const audioBuffer = await generateStereoChord(
        preset.leftRatios,
        preset.rightRatios,
        440,
        15
      );

      const arrayBuffer = audioBufferToArrayBuffer(audioBuffer);

      await audioEngine.loadAudioFile(arrayBuffer, `${preset.name} (${preset.description})`);

      fileState.fileName = `${preset.name} - ${preset.description}`;
      selectedDemo = preset.id;

      // Auto-play if we were already playing
      if (wasPlaying) {
        audioEngine.play();
      }
    } catch (err: any) {
      fileState.error = err.message || 'Failed to generate demo audio';
      console.error('Error generating demo audio:', err);
    } finally {
      loadingStates[preset.id] = false;
    }
  }
</script>

<div class="demo-loader">
  <h2>Demo Audio</h2>
  <p class="description">Just intonation intervals and chords</p>

  <div class="tabs">
    <button
      class="tab"
      class:active={activeTab === 'intervals'}
      onclick={() => (activeTab = 'intervals')}
    >
      Intervals
    </button>
    <button class="tab" class:active={activeTab === 'chords'} onclick={() => (activeTab = 'chords')}>
      Chords
    </button>
  </div>

  {#if activeTab === 'intervals'}
    <div class="demo-grid">
      {#each INTERVAL_PRESETS as preset}
        <button
          class="demo-button"
          class:selected={selectedDemo === preset.id}
          class:loading={loadingStates[preset.id]}
          onclick={() => handleIntervalSelect(preset)}
          disabled={loadingStates[preset.id]}
        >
          <span class="demo-name">{preset.name}</span>
          <span class="demo-description">{preset.description}</span>
        </button>
      {/each}
    </div>
  {:else}
    <div class="demo-grid">
      {#each CHORD_PRESETS as preset}
        <button
          class="demo-button"
          class:selected={selectedDemo === preset.id}
          class:loading={loadingStates[preset.id]}
          onclick={() => handleChordSelect(preset)}
          disabled={loadingStates[preset.id]}
        >
          <span class="demo-name">{preset.name}</span>
          <span class="demo-description">{preset.description}</span>
        </button>
      {/each}
    </div>
  {/if}

  {#if fileState.error}
    <p class="error">{fileState.error}</p>
  {/if}
</div>

<style>
  .demo-loader {
    margin-bottom: 1.5rem;
  }

  h2 {
    font-size: 1rem;
    margin-top: 1.5rem;
    margin-bottom: 0.5rem;
    color: #e5e7eb;
    font-weight: 600;
  }

  .description {
    font-size: 0.75rem;
    color: #9ca3af;
    margin-bottom: 0.75rem;
    line-height: 1.4;
  }

  .tabs {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 0.75rem;
  }

  .tab {
    flex: 1;
    padding: 0.5rem;
    background: #374151;
    color: #9ca3af;
    border: 2px solid #4b5563;
    border-radius: 0.5rem;
    font-size: 0.85rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }

  .tab:hover {
    background: #4b5563;
    color: #e5e7eb;
  }

  .tab.active {
    background: #1e40af;
    color: white;
    border-color: #2563eb;
  }

  .demo-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.5rem;
  }

  .demo-button {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 0.75rem 0.5rem;
    background: #374151;
    color: white;
    border: 2px solid #4b5563;
    border-radius: 0.5rem;
    font-size: 0.85rem;
    cursor: pointer;
    transition: all 0.2s;
    min-height: 60px;
  }

  .demo-button:hover:not(:disabled) {
    background: #4b5563;
    border-color: #6b7280;
  }

  .demo-button.selected {
    background: #1e40af;
    border-color: #2563eb;
  }

  .demo-button.loading {
    background: #6b7280;
    cursor: wait;
    opacity: 0.7;
  }

  .demo-button:disabled {
    cursor: not-allowed;
  }

  .demo-name {
    font-weight: 600;
    margin-bottom: 0.25rem;
  }

  .demo-description {
    font-size: 0.75rem;
    color: #9ca3af;
    font-family: monospace;
  }

  .demo-button.selected .demo-description {
    color: #93c5fd;
  }

  .error {
    margin-top: 0.5rem;
    font-size: 0.85rem;
    color: #ef4444;
  }
</style>
