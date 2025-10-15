<script>
  import { txStore } from '$lib/stores/tx.js';

  export let txid;

  let transaction = null;

  // Subscribe to the store and find the specific transaction by its ID
  $: transaction = $txStore[txid];

  const explorerBaseUrl =
    import.meta.env.VITE_STACKS_NETWORK === 'mainnet'
      ? 'https://explorer.stacks.co'
      : 'https://explorer.stacks.co/sandbox/transactions';
</script>

{#if transaction}
  <div class="tx-status-container">
    <div class="status-indicator {transaction.status}">
      Status: <strong>{transaction.status}</strong>
    </div>
    <a href={`${explorerBaseUrl}/${txid}`} target="_blank" rel="noopener noreferrer" class="explorer-link">
      View on Explorer
    </a>
  </div>
{/if}

<style>
  .tx-status-container {
    margin-top: 1.5rem;
    padding: 1rem;
    border: 1px solid var(--card-border);
    border-radius: 12px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: var(--input-background);
  }
  .status-indicator.pending {
    color: #f59e0b; /* Amber */
  }
  .status-indicator.success {
    color: #10b981; /* Green */
  }
  .status-indicator.failed {
    color: #ef4444; /* Red */
  }
  .explorer-link {
    color: var(--primary-color);
    text-decoration: underline;
    font-weight: 600;
  }
</style>