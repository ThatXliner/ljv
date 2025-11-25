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
    margin-bottom: 1.5rem;
  }

  .load-button {
    width: 100%;
    padding: 0.75rem;
    background: #2563eb;
    color: white;
    border: none;
    border-radius: 0.5rem;
    font-size: 0.9rem;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.2s;
  }

  .load-button:hover:not(:disabled) {
    background: #1d4ed8;
  }

  .load-button:disabled {
    background: #6b7280;
    cursor: not-allowed;
  }

  .file-name {
    margin-top: 0.5rem;
    font-size: 0.85rem;
    color: #9ca3af;
    word-break: break-all;
  }

  .error {
    margin-top: 0.5rem;
    font-size: 0.85rem;
    color: #ef4444;
  }
</style>
