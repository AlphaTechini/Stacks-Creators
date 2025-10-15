import { writable, get } from 'svelte/store';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

function createTxStore() {
  const transactions = writable({});
  const refreshTrigger = writable(0);

  /**
   * Polls the backend for the status of a single transaction.
   * @param {string} txid - The transaction ID to poll.
   */
  async function pollTxStatus(txid) {
    const interval = setInterval(async () => {
      try {
        // This backend endpoint would query the Stacks API for the transaction status.
        const response = await fetch(`${BASE_URL}/api/tx-status/${txid}`);
        if (!response.ok) {
          // Stop polling on server error, but leave status as pending.
          console.error(`Failed to fetch status for ${txid}`);
          return;
        }

        const { tx_status } = await response.json();

        if (tx_status !== 'pending') {
          clearInterval(interval);
          transactions.update(txs => {
            txs[txid].status = tx_status; // 'success' or 'failed'
            return txs;
          });

          // If the transaction was a success, trigger a refresh for any listening components.
          if (tx_status === 'success') {
            refreshTrigger.update(n => n + 1);
          }
        }
      } catch (error) {
        console.error('Polling error:', error);
        // Optionally stop polling on network errors
      }
    }, 5000); // Poll every 5 seconds
  }

  /**
   * Adds a new transaction to the store to begin tracking its status.
   * @param {string} txid - The transaction ID.
   */
  function addTx(txid) {
    transactions.update(txs => {
      // Avoid adding duplicates if a user clicks a button multiple times
      if (!txs[txid]) {
        txs[txid] = { status: 'pending', txid };
        pollTxStatus(txid);
      }
      return txs;
    });
  }

  return {
    subscribe: transactions.subscribe,
    addTx,
    // Expose the refresh trigger as a readable store
    refresh: {
      subscribe: refreshTrigger.subscribe
    }
  };
}

export const txStore = createTxStore();