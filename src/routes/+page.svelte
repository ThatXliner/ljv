<script lang="ts">
  import { onMount } from 'svelte';
  import Visualizer from '$lib/components/Visualizer.svelte';
  import FileLoader from '$lib/components/FileLoader.svelte';
  import DemoAudioLoader from '$lib/components/DemoAudioLoader.svelte';
  import HandSynth from '$lib/components/HandSynth.svelte';
  import Controls from '$lib/components/Controls.svelte';
  import ColorPicker from '$lib/components/ColorPicker.svelte';
  import BandControls from '$lib/components/BandControls.svelte';
  import { audioEngine, visualizerState } from '$lib/stores/visualizer.svelte';

  onMount(async () => {
    await audioEngine.initialize();
  });
</script>

<div class="app">
  <aside class="sidebar">
    <h1>Lissajous Visualizer</h1>
    <FileLoader />
    <DemoAudioLoader />
    <Controls />

    <h2>Hand Synth</h2>
    <HandSynth />

    <h2>Frequency Bands</h2>
    <BandControls />

    {#if !visualizerState.useMutliBand}
      <h2>Single Curve</h2>
      <ColorPicker />
    {/if}
  </aside>

  <main class="visualizer-container">
    <Visualizer />
  </main>
</div>

<style>
  :global(body) {
    margin: 0;
    padding: 0;
    font-family: 'SF Mono', 'Fira Code', 'Fira Mono', 'Cascadia Code', Consolas, monospace;
    background: #0a0a0a;
    color: #e8e4dc;
    overflow: hidden;
  }

  .app {
    display: flex;
    height: 100vh;
    width: 100vw;
    overflow: hidden;
  }

  .sidebar {
    width: 320px;
    background: #111;
    color: #e8e4dc;
    padding: 1rem;
    overflow-y: auto;
    border-right: 1px solid #2a2a2a;
    flex-shrink: 0;
  }

  .sidebar::-webkit-scrollbar {
    width: 2px;
  }

  .sidebar::-webkit-scrollbar-track {
    background: #1a1a1a;
  }

  .sidebar::-webkit-scrollbar-thumb {
    background: #333;
  }

  h1 {
    font-size: 0.75rem;
    margin: 0 0 1.25rem 0;
    font-weight: 700;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    color: #e8e4dc;
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

  .visualizer-container {
    flex: 1;
    background: #0a0a0a;
    position: relative;
  }
</style>
