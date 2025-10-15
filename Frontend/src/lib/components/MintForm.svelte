<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { generateAnimatedImage } from '../../lib/aiService.js';
  import { uploadToCloudinary, mintNFT } from '../../lib/api.js';
  import MintSuccess from './MintSuccess.svelte';

  let title = '';
  let description = '';
  let file = null;
  let originalFilePreview = '';

  let isMinting = false;
  let progress = '';
  let result = null;
  let errorMessage = '';
  let token = '';

  onMount(() => {
    token = localStorage.getItem('stacks_token');
    if (!token) {
      goto('/');
    }
  });

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
      progress = "Generating AI image (this may take a minute)...";
      const aiImageBlob = await generateAnimatedImage(file);

      progress = "Uploading to Cloudinary...";
      const cloudinaryRes = await uploadToCloudinary(token, aiImageBlob);
      if (!cloudinaryRes.secure_url) {
        throw new Error('Failed to get URL from Cloudinary.');
      }

      progress = "Minting NFT on Stacks...";
      const response = await mintNFT(token, title, description, cloudinaryRes.secure_url);

      if (!response.success) {
        throw new Error(response.error || 'An unknown error occurred during minting.');
      }

      result = response; // { success: true, txId, tokenId, mediaUrl }
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
  {:else}
    <form on:submit|preventDefault={handleSubmit}>
      <div class="form-group">
        <label for="file-upload">Artwork</label>
        <input
          id="file-upload"
          type="file"
          accept=".jpg, .jpeg, .png, .gif"
          on:change={handleFileSelect}
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
        />
      </div>

      <button type="submit" class="primary" disabled={isMinting || !file}>
        {#if isMinting}
          {progress}
        {:else}
          Generate & Mint NFT
        {/if}
      </button>

      {#if errorMessage && !isMinting}
        <p class="error-message">{errorMessage}</p>
      {/if}
    </form>
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
  /* Add other styles from setup-profile.svelte or a global sheet */
  .form-group, label, input, textarea, button, .error-message {
    /* These would ideally be in a global stylesheet */
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
  .error-message {
    color: #fc8181; /* A reddish color for errors */
    text-align: center;
    margin-top: 1rem;
  }
</style>
