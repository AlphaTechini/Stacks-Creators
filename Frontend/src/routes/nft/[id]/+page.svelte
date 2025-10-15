<script>
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { getNFT } from '$lib/api.js';
  import { wallet } from '$lib/stores/wallet.js';
  import BuyNFT from '$lib/components/BuyNFT.svelte';
  import ListNFT from '$lib/components/ListNFT.svelte';

  let nft = null;
  let isLoading = true;
  let error = '';

  const tokenId = $page.params.id;

  onMount(async () => {
    try {
      nft = await getNFT(tokenId);
    } catch (e) {
      error = e.message;
    } finally {
      isLoading = false;
    }
  });

  let isOwner;
  $: isOwner = nft && $wallet.stxAddress && nft.ownerAddress === $wallet.stxAddress;
</script>

<section class="nft-detail-container">
  {#if isLoading}
    <p>Loading NFT details...</p>
  {:else if error}
    <p class="error-message">{error}</p>
  {:else if nft}
    <h1>NFT #{nft.tokenId.slice(0, 8)}...</h1>
    <img src={nft.imageUrl} alt="NFT Artwork" />

    <!-- Action Components -->
    <div>
      {#if isOwner && !nft.onChainListing}
        <ListNFT {tokenId} />
      {:else if !isOwner && nft.onChainListing}
        <BuyNFT {tokenId} price={nft.onChainListing.price.value} />
      {/if}
    </div>
  {/if}
</section>
