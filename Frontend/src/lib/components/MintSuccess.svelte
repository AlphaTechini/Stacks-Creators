<script>
  export let txId;
  export let mediaUrl;

  // Determine the correct explorer URL based on the network environment
  const explorerBaseUrl =
    import.meta.env.VITE_STACKS_NETWORK === 'mainnet'
      ? 'https://explorer.stacks.co'
      : 'https://explorer.stacks.co/sandbox/transactions';
</script>

<div class="success-container">
  <h2 class="success-title">✅ NFT Minted Successfully!</h2>
  <p class="success-subtitle">Your creation is now on the Stacks blockchain.</p>

  <img src={mediaUrl} alt="Minted NFT" class="preview-image" />

  <p class="link-container">
    <a href={`${explorerBaseUrl}/${txId}`} target="_blank" rel="noopener noreferrer" class="explorer-link">
      View on Stacks Explorer
    </a>
  </p>
</div>

<style>
  .success-container {
    background: var(--card-background);
    border: 1px solid var(--primary-color);
    box-shadow: 0 0 20px rgba(159, 122, 234, 0.3);
    padding: 2rem;
    border-radius: 18px;
    text-align: center;
  }
  .success-title {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--primary-color);
  }
  .success-subtitle {
    opacity: 0.8;
    margin-bottom: 1.5rem;
  }
  .preview-image {
    margin: 0 auto;
    width: 10rem;
    height: 10rem;
    border-radius: 12px;
    object-fit: cover;
    border: 2px solid var(--card-border);
  }
  .link-container {
    margin-top: 1.5rem;
  }
  .explorer-link {
    color: var(--primary-color);
    text-decoration: underline;
    font-weight: 600;
  }
</style>