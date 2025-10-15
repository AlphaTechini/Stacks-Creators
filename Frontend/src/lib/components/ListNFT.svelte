<script>
  import { wallet } from '$lib/stores/wallet.js';
  import { createListTx, broadcastSignedTx } from '$lib/stacksClient.js';
  import { txStore } from '$lib/stores/tx.js';
  import TXStatus from './TXStatus.svelte';

  export let tokenId;

  let price = 0;
  let isLoading = false;
  let error = '';
  let successTxId = '';

  async function handleList() {
    if (price <= 0) {
      error = 'Price must be greater than zero.';
      return;
    }

    isLoading = true;
    error = '';
    successTxId = '';

    try {
      // 1. Create and sign the transaction on the client-side
      const signedTx = await createListTx(tokenId, price * 1_000_000); // Convert STX to micro-STX

      // 2. Send the signed transaction to the backend to be broadcast
      const result = await broadcastSignedTx($wallet.token, 'list', signedTx);

      if (!result.success) {
        throw new Error(result.error || 'Failed to broadcast list transaction.');
      }

      successTxId = result.txId; // Store the txId to show the status component
      txStore.addTx(successTxId); // Start tracking the transaction
    } catch (e) {
      console.error('Listing failed:', e);
      error = e.message;
    } finally {
      isLoading = false;
    }
  }
</script>

<div class="action-container">
  <h3>List Your NFT for Sale</h3>
  <form on:submit|preventDefault={handleList} class="action-form">
    <div class="form-group">
      <label for="price">Price (in STX)</label>
      <input type="number" id="price" bind:value={price} min="0.000001" step="0.000001" required />
    </div>
    <button type="submit" class="primary" disabled={isLoading}>
      {#if isLoading}
        Processing...
      {:else}
        List for Sale
      {/if}
    </button>
  </form>

  {#if error}
    <p class="error-message">{error}</p>
  {/if}
  {#if successTxId}
    <TXStatus txid={successTxId} />
  {/if}
</div>

<style>
  .action-container {
    margin-top: 2rem;
    padding: 1.5rem;
    background: var(--input-background);
    border: 1px solid var(--card-border);
    border-radius: 12px;
  }
</style>