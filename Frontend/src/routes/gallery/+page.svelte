<script>
  import { getNFTs } from '$lib/api.js';
  import { txStore } from '$lib/stores/tx.js';

  let nfts = $state([]);
  let isLoading = $state(true);
  let error = $state('');

  async function loadNFTs() {
    isLoading = true;
    try {
      nfts = await getNFTs();
    } catch (e) {
      error = e.message;
    } finally {
      isLoading = false;
    }
  }

  // Initial load
  loadNFTs();

  // Svelte 5 effect: This will re-run whenever the refresh trigger changes.
  $effect(() => {
    const refreshCount = $txStore.refresh;
    if (refreshCount > 0) {
      console.log('Transaction confirmed, refreshing gallery...');
      loadNFTs();
    }
  })
</script>

<section class="gallery-container">
  <div class="header">
    <h1>NFT Marketplace</h1>
    <p>Browse, buy, and sell creations from the Stacks community.</p>
  </div>

  {#if isLoading}
    <p class="loading-text">Loading gallery...</p>
  {:else if error}
    <p class="error-message">Could not load NFTs: {error}</p>
  {:else if nfts.length === 0}
    <div class="empty-state">
      <p>No NFTs have been minted yet. Be the first!</p>
      <a href="/dashboard" class="primary">Mint an NFT</a>
    </div>
  {:else}
    <div class="nft-grid">
      {#each nfts as nft (nft.tokenId)}
        <a href={`/nft/${nft.tokenId}`} class="nft-card">
          <img src={nft.imageUrl} alt="NFT Artwork" class="nft-image" />
          <div class="nft-info">
            <h3 class="nft-title">Token #{nft.tokenId.slice(0, 6)}...</h3>
            {#if nft.listed}
              <span class="price-tag">{nft.price / 1_000_000} STX</span>
            {:else}
              <span class="not-listed">Not for sale</span>
            {/if}
          </div>
        </a>
      {/each}
    </div>
  {/if}
</section>

<style>
  .gallery-container {
    max-width: 1200px;
    margin: 2rem auto;
    padding: 1rem;
  }
  .header {
    text-align: center;
    margin-bottom: 2.5rem;
  }
  .loading-text, .empty-state {
    text-align: center;
    padding: 4rem 0;
  }
  .empty-state a {
    margin-top: 1rem;
    display: inline-block;
  }
  .nft-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: 1.5rem;
  }
  .nft-card {
    background: var(--card-background);
    border: 1px solid var(--card-border);
    border-radius: 16px;
    overflow: hidden;
    text-decoration: none;
    color: var(--text-color);
    transition: transform 0.2s ease, box-shadow 0.2s ease;
  }
  .nft-card:hover {
    transform: translateY(-5px);
    box-shadow: 0 10px 20px rgba(0,0,0,0.2);
  }
  .nft-image {
    width: 100%;
    aspect-ratio: 1 / 1;
    object-fit: cover;
  }
  .nft-info {
    padding: 1rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .price-tag {
    background: var(--primary-color);
    color: white;
    padding: 0.25rem 0.6rem;
    border-radius: 999px;
    font-size: 0.8rem;
    font-weight: 600;
  }
  .not-listed {
    font-size: 0.8rem;
    opacity: 0.7;
  }
</style>