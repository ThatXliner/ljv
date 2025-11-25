<script lang="ts">
  import { onMount } from 'svelte';
  import Visualizer from '$lib/components/Visualizer.svelte';
  import FileLoader from '$lib/components/FileLoader.svelte';
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
    <Controls />

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
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial,
      sans-serif;
    background: #000;
    color: #fff;
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
    background: #1a1a1a;
    color: #fff;
    padding: 1.5rem;
    overflow-y: auto;
    border-right: 1px solid #333;
  }

  .sidebar::-webkit-scrollbar {
    width: 8px;
  }

  .sidebar::-webkit-scrollbar-track {
    background: #1a1a1a;
  }

  .sidebar::-webkit-scrollbar-thumb {
    background: #444;
    border-radius: 4px;
  }

  .sidebar::-webkit-scrollbar-thumb:hover {
    background: #555;
  }

  h1 {
    font-size: 1.5rem;
    margin: 0 0 1.5rem 0;
    font-weight: 700;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  h2 {
    font-size: 1rem;
    margin-top: 1.5rem;
    margin-bottom: 0.75rem;
    color: #e5e7eb;
    font-weight: 600;
  }

  .visualizer-container {
    flex: 1;
    background: #000;
    position: relative;
  }
</style>
