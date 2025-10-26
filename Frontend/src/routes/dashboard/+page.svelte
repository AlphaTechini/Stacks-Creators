<script>
  import { wallet } from '$lib/stores/wallet.js';
  import { goto } from '$app/navigation';
  import { browser } from '$app/environment';
  import { onMount } from 'svelte';
  import { fetchAPI } from '$lib/api.js';

  let myNfts = [];
  let isLoading = true;

  // Reactively check connection status after the store has loaded.
  $: if (browser && !$wallet.isLoading && !$wallet.isConnected) {
    goto('/');
  }

  onMount(async () => {
    if ($wallet.token) {
      try {
        myNfts = await fetchAPI('/api/nfts/my-nfts', 'GET', $wallet.token);
      } catch (error) {
        console.error('Failed to fetch NFTs:', error);
      } finally {
        isLoading = false;
      }
    }
  });
</script>

<h1>Dashboard</h1>
<p>Welcome to your dashboard, {$wallet.stxAddress}!</p>

<h2>My NFTs</h2>

{#if isLoading}
  <p>Loading your NFTs...</p>
{:else if myNfts.length === 0}
  <p>You haven't minted any NFTs yet. Go create one!</p>
{:else}
  <div class="nft-grid">
    {#each myNfts as nft (nft.tokenId)}
      <div class="nft-card">
        <!-- We don't have the media URL in the DB yet, so we'll just show the ID -->
        <div class="nft-image-placeholder">NFT #{nft.tokenId}</div>
        <p>Token ID: {nft.tokenId}</p>
      </div>
    {/each}
  </div>
{/if}

<style>
  .nft-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 1rem; margin-top: 2rem; }
  .nft-card { border: 1px solid var(--card-border); border-radius: 12px; padding: 1rem; text-align: center; }
  .nft-image-placeholder { height: 150px; background: var(--input-background); border-radius: 8px; display: grid; place-content: center; font-weight: bold; margin-bottom: 1rem; }
</style>