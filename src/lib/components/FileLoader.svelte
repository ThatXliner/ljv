<script lang="ts">
  import { open } from '@tauri-apps/plugin-dialog';
  import { readFile } from '@tauri-apps/plugin-fs';
  import { audioEngine, fileState } from '$lib/stores/visualizer.svelte';

  async function handleFileSelect() {
    fileState.isLoading = true;
    fileState.error = null;

    try {
      const selected = await open({
        multiple: false,
        filters: [
          {
            name: 'Audio',
            extensions: ['mp3', 'wav', 'ogg', 'flac', 'm4a', 'aac'],
          },
        ],
      });

      if (!selected || typeof selected !== 'string') {
        fileState.isLoading = false;
        return;
      }

      // Extract file name from path
      const fileName = selected.split('/').pop() || selected.split('\\').pop() || 'Unknown';

      // Read file as bytes
      const fileData = await readFile(selected);

      // Convert Uint8Array to ArrayBuffer
      const arrayBuffer = fileData.buffer.slice(
        fileData.byteOffset,
        fileData.byteOffset + fileData.byteLength
      );

      // Load into audio engine
      await audioEngine.loadAudioFile(arrayBuffer, fileName);

      fileState.fileName = fileName;
    } catch (err: any) {
      fileState.error = err.message || 'Failed to load audio file';
      console.error('Error loading file:', err);
    } finally {
      fileState.isLoading = false;
    }
  }
</script>

<div class="file-loader">
  <button class="load-button" onclick={handleFileSelect} disabled={fileState.isLoading}>
    {fileState.isLoading ? 'Loading...' : 'Select Audio File'}
  </button>

  {#if fileState.fileName}
    <p class="file-name">Loaded: {fileState.fileName}</p>
  {/if}

  {#if fileState.error}
    <p class="error">{fileState.error}</p>
  {/if}
</div>

<style>
  .file-loader {
    margin-bottom: 1rem;
  }

  .load-button {
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

  .load-button:hover:not(:disabled) {
    border-color: #666;
  }

  .load-button:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  .file-name {
    margin-top: 0.4rem;
    font-size: 0.65rem;
    color: #666;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    font-family: 'SF Mono', 'Fira Code', 'Fira Mono', 'Cascadia Code', Consolas, monospace;
  }

  .error {
    margin-top: 0.4rem;
    font-size: 0.65rem;
    color: #c0392b;
    font-family: 'SF Mono', 'Fira Code', 'Fira Mono', 'Cascadia Code', Consolas, monospace;
  }
</style>
