<script>
  import { wallet } from '$lib/stores/wallet.js';

  function formatAddress(address) {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }
</script>

{#if $wallet.isConnected}
	<div>
		<span>Connected: {formatAddress($wallet.stxAddress)}</span>
		<button on:click={wallet.disconnect}>Disconnect</button>
	</div>
{:else if !$wallet.isLoading}
	<button on:click={wallet.connect}>Connect Wallet</button>
{/if}

<style>
  button {
    padding: 8px 12px;
    border-radius: 6px;
    border: 1px solid #ccc;
    cursor: pointer;
    background-color: #f0f0f0;
  }
</style>