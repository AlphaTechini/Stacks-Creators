<script>
  import { onMount } from 'svelte';
  import { wallet } from '$lib/stores/wallet.js';
  import { handleLogin, handleLogout } from '$lib/stacksClient.js';
  import '../app.css';

  onMount(() => {
    // Load wallet state from localStorage when the app starts
    wallet.load();
  });
</script>

<nav>
  <a href="/">Home</a>
  {#if $wallet.isConnected}
    <a href="/dashboard">Dashboard</a>
    <a href="/setup-profile">Profile</a>
    <button on:click={handleLogout}>
      Disconnect ({$wallet.stxAddress.substring(0, 4)}...{$wallet.stxAddress.substring($wallet.stxAddress.length - 4)})
    </button>
  {:else}
    <button on:click={handleLogin}>Connect Wallet</button>
  {/if} 
</nav>

<main>
  {#if $wallet.isLoading}
    <p>Loading wallet...</p>
  {:else}
    <slot />
  {/if}
</main>

<style>
  nav {
    display: flex;
    gap: 1rem;
    padding: 1rem;
    border-bottom: 1px solid #ccc;
    align-items: center;
  }
</style>