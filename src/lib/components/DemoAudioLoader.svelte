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

  // Characteristic color per preset — muted, not neon
  const presetColors: Record<string, string> = {
    sine:    '#7ba7bc', // calm blue — pure, simple
    octave:  '#a8c49a', // soft green — perfect consonance
    fifth:   '#c49a6c', // warm amber — foundational harmony
    fourth:  '#b8a0c8', // dusty violet — open fourth
    third:   '#c4a87a', // golden — warmth of a major third
    seventh: '#a07878', // muted rose — minor seventh tension
    major:   '#8aad8a', // clear green — bright major
    minor:   '#7898b8', // steel blue — introspective minor
    sus4:    '#b8b87a', // olive — suspended, unresolved
    power:   '#c47a5a', // burnt orange — raw power chord
    maj7:    '#7ab8b8', // teal — dreamy major seventh
    dom7:    '#b87a98', // mauve — bluesy dominant seventh
  };

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
  <p class="description">JUST INTONATION INTERVALS + CHORDS</p>

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
        {@const color = presetColors[preset.id] ?? '#666'}
        {@const isSelected = selectedDemo === preset.id}
        <button
          class="demo-button"
          class:selected={isSelected}
          class:loading={loadingStates[preset.id]}
          style:border-color={isSelected ? color : null}
          style:color={isSelected ? color : null}
          onclick={() => handleIntervalSelect(preset)}
          disabled={loadingStates[preset.id]}
        >
          <span class="demo-name">{preset.name}</span>
          <span class="demo-description" style:color={color}>{preset.description}</span>
        </button>
      {/each}
    </div>
  {:else}
    <div class="demo-grid">
      {#each CHORD_PRESETS as preset}
        {@const color = presetColors[preset.id] ?? '#666'}
        {@const isSelected = selectedDemo === preset.id}
        <button
          class="demo-button"
          class:selected={isSelected}
          class:loading={loadingStates[preset.id]}
          style:border-color={isSelected ? color : null}
          style:color={isSelected ? color : null}
          onclick={() => handleChordSelect(preset)}
          disabled={loadingStates[preset.id]}
        >
          <span class="demo-name">{preset.name}</span>
          <span class="demo-description" style:color={color}>{preset.description}</span>
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

  .description {
    font-size: 0.6rem;
    color: #444;
    margin-bottom: 0.75rem;
    line-height: 1.4;
    letter-spacing: 0.08em;
  }

  .tabs {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 0.75rem;
  }

  .tab {
    flex: 1;
    padding: 0.25rem 0.5rem;
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

  .tab:hover {
    border-color: #444;
  }

  .tab.active {
    background: #e8e4dc;
    color: #111;
    border-color: #e8e4dc;
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
    padding: 0.5rem;
    background: transparent;
    color: #e8e4dc;
    border: 1px solid #2a2a2a;
    border-radius: 0;
    font-family: 'SF Mono', 'Fira Code', 'Fira Mono', 'Cascadia Code', Consolas, monospace;
    cursor: pointer;
    transition: border-color 0.1s, background 0.1s, color 0.1s;
    min-height: 52px;
    gap: 0.2rem;
  }

  .demo-button:hover:not(:disabled) {
    border-color: #444;
  }

  .demo-button.selected {
    background: transparent;
  }

  .demo-button.loading {
    opacity: 0.3;
    cursor: wait;
  }

  .demo-button:disabled {
    cursor: not-allowed;
  }

  .demo-name {
    font-size: 0.65rem;
    font-weight: 400;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .demo-description {
    font-size: 0.6rem;
    font-family: 'SF Mono', 'Fira Code', 'Fira Mono', 'Cascadia Code', Consolas, monospace;
    text-transform: none;
    letter-spacing: 0;
  }

  .error {
    margin-top: 0.5rem;
    font-size: 0.65rem;
    color: #c0392b;
    font-family: 'SF Mono', 'Fira Code', 'Fira Mono', 'Cascadia Code', Consolas, monospace;
  }
</style>
