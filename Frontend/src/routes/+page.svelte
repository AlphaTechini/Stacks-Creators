<script>
  import { wallet } from '$lib/stores/wallet.js';
  import { handleLogin, handleLogout } from '$lib/stacksClient.js';

  function onLogin(walletType) {
    handleLogin(walletType);
  }

  function onLogout() {
    handleLogout();
  }
</script>

<section class="hero">
  <div>
    <h1>Stacks Creators</h1>
    <p class="lead">
      Transform your photos into AI-animated avatars, mint them as NFTs, and sell them directly to
      your fans.
    </p>
  </div>
</section>

<section class="onboard-card">
  <div class="container">
    <h2>Onboarding</h2>

    {#if $wallet.isLoading}
      <p>Connecting to wallet and verifying...</p>
    {:else if $wallet.stxAddress}
      <div class="success-message">
        <p>✅ Connected as:</p>
        <code class="address-code">{$wallet.stxAddress}</code>
        <div class="button-group">
          <a href="/setup-profile" class="primary">Setup Profile</a>
          <button class="secondary" onclick={onLogout}>Logout</button>
        </div>
      </div>
    {:else}
      <p>Connect your Stacks wallet to get started.</p>
      <div class="button-group">
        <button class="primary" onclick={() => onLogin('leather')}>Connect Leather</button>
        <button class="secondary" onclick={() => onLogin('xverse')}>Connect Xverse</button>
      </div>
    {/if}

  </div>
</section>

<style>
  section {
    margin: 2.5rem auto;
    max-width: 960px;
    padding: 1.5rem;
    border-radius: 18px;
    background: var(--card-background);
    border: 1px solid var(--card-border);
  }
  .hero {
    background: var(--hero-gradient);
  }
  .hero h1 {
    margin: 0 0 1rem;
    font-size: 3rem;
    font-weight: 700;
  }
  .lead {
    font-size: 1.1rem;
    max-width: 420px;
    line-height: 1.6;
  }
  .onboard-card {
    text-align: center;
  }
  .button-group {
    display: flex;
    gap: 1rem;
    justify-content: center;
    margin-top: 1.5rem;
  }
  .success-message code {
    display: block;
    background: var(--input-background);
    padding: 0.5rem;
    border-radius: 8px;
    margin: 1rem 0;
    word-break: break-all;
    border: 1px solid var(--input-border);
  }
  .primary {
    background: var(--primary-color);
    color: #fff;
    box-shadow: 0 10px 30px -10px var(--primary-color);
  }
  .primary:hover {
    background: var(--primary-color-hover);
  }
  .secondary {
    background: var(--secondary-color);
    color: var(--secondary-text);
  }
</style>
