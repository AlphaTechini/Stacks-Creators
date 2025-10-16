<script>
  import { wallet } from '$lib/stores/wallet.js';
  import { preventDefault } from '$lib/actions.js';
  import { generateAndMintNFT } from '$lib/api.js';
  import MintSuccess from './MintSuccess.svelte';

  let title = $state('');
  let description = $state('');
  let file = $state(null);
  let originalFilePreview = $state.raw('');

  let isMinting = $state(false);
  let progress = $state('');
  let result = $state(null);
  let errorMessage = $state('');
  
  // The wallet store provides the token, so we don't need onMount here.
  // The page containing this form should handle redirecting unauthenticated users.

  function handleFileSelect(e) {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      file = selectedFile;
      originalFilePreview = URL.createObjectURL(file);
    }
  }

  async function handleSubmit() {
    if (!file || !title) {
      errorMessage = 'An artwork file and a title are required.';
      return;
    }

    isMinting = true;
    errorMessage = '';
    result = null;

    try {
      progress = "Generating AI & Minting NFT (this may take a minute)...";

      // Call the new single endpoint that handles the entire pipeline
      const response = await generateAndMintNFT($wallet.token, file, title, description);
      if (!response.success) {
        throw new Error(response.error || 'An unknown error occurred during minting.');
      }

      result = response; // { success: true, txId, mediaUrl }
      progress = "Completed ✅";
    } catch (error) {
      console.error('Minting failed:', error);
      errorMessage = error.message;
      progress = "Error: " + error.message;
    } finally {
      isMinting = false;
    }
  }
</script>

<div class="mint-container">
  {#if result?.success}
    <MintSuccess txId={result.txId} mediaUrl={result.mediaUrl} />
  {:else if !isMinting}
    <form onsubmit={handleSubmit} use:preventDefault>
      <div class="form-group">
        <label for="file-upload">Artwork</label>
        <input
          id="file-upload"
          type="file"
          accept=".jpg, .jpeg, .png, .gif"
          onchange={handleFileSelect}
          class="file-input"
        />
        {#if originalFilePreview}
          <img src={originalFilePreview} alt="Artwork preview" class="artwork-preview" />
        {/if}
      </div>

      <div class="form-group">
        <label for="title">Title</label>
        <input id="title" type="text" bind:value={title} placeholder="My Awesome NFT" required />
      </div>

      <div class="form-group">
        <label for="description">Description</label>
        <textarea
          id="description"
          bind:value={description}
          rows="4"
          placeholder="A short story about your creation..."
        >
        </textarea>
      </div>

      <button type="submit" class="primary" disabled={isMinting || !file}>
        {#if isMinting}
          {progress}
        {:else}
          Generate & Mint NFT
        {/if}
      </button>

      {#if errorMessage && !isMinting && progress.startsWith('Error')}
        <p class="error-message">{errorMessage}</p>
      {/if}
    </form>
  {:else}
    <div class="progress-container">
      <p>{progress}</p>
    </div>
  {/if}
</div>

<style>
  .mint-container {
    /* Uses styles from setup-profile.svelte for consistency */
    background: var(--card-background);
    padding: 2rem;
    border-radius: 18px;
    width: 100%;
    max-width: 600px;
    border: 1px solid var(--card-border);
  }
  .artwork-preview {
    max-width: 200px;
    border-radius: 12px;
    margin-top: 1rem;
    border: 1px solid var(--input-border);
  }
  .file-input {
    padding: 0;
    border: none;
  }
  .progress-container {
    text-align: center;
    padding: 2rem;
    font-size: 1.2rem;
    font-weight: 600;
  }
  .error-message {
    color: #fc8181; /* A reddish color for errors */
    text-align: center;
    margin-top: 1rem;
  }
</style>
