<script>
  import { wallet } from '$lib/stores/wallet.js';
  import { createBuyTx, broadcastSignedTx } from '$lib/stacksClient.js';

  export let tokenId;
  export let price; // Price in micro-STX

  let isLoading = false;
  let error = '';
  let successTxId = '';

  async function handleBuy() {
    isLoading = true;
    error = '';
    successTxId = '';

    try {
      // 1. Create and sign the transaction on the client-side
      const signedTx = await createBuyTx(tokenId, price);

      // 2. Send the signed transaction to the backend to be broadcast
      const result = await broadcastSignedTx($wallet.token, 'buy', signedTx);

      if (!result.success) {
        throw new Error(result.error || 'Failed to broadcast buy transaction.');
      }

      successTxId = result.txId;
      alert(`Purchase successful! Transaction ID: ${successTxId}`);
      // Optionally, refresh the page to show updated ownership
      window.location.reload();
    } catch (e) {
      console.error('Purchase failed:', e);
      error = e.message;
    } finally {
      isLoading = false;
    }
  }
</script>

<div class="action-container">
  <h3>Buy This NFT</h3>
  <div class="price-display">
    Price: <strong>{price / 1_000_000} STX</strong>
  </div>
  <button on:click={handleBuy} class="primary" disabled={isLoading}>
    {#if isLoading}
      Processing Purchase...
    {:else}
      Buy Now
    {/if}
  </button>

  {#if error}
    <p class="error-message">{error}</p>
  {/if}
  {#if successTxId}
    <p class="success-message">
      Purchase successful! <a href={`https://explorer.stacks.co/txid/${successTxId}?chain=testnet`} target="_blank">View Transaction</a>
    </p>
  {/if}
</div>

<style>
  .action-container {
    /* Styles similar to ListNFT */
  }
  .price-display {
    margin-bottom: 1rem;
    font-size: 1.2rem;
  }
</style>