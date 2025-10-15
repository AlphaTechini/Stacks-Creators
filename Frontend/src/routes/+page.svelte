<script>
  import { onMount } from 'svelte';
  import { connectWithWallet, signMessage } from '../lib/stacksClient';

  // Base URL for the backend API, configured in .env
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

  let stxAddress = '';
  let isLoading = false;
  let errorMessage = '';

  // Check for an existing token on component mount
  onMount(() => {
    const token = localStorage.getItem('stacks_token');
    if (token) {
      // Optional: Verify token with backend and fetch user profile
      // For now, we'll just assume the token is valid if it exists.
      const payload = JSON.parse(atob(token.split('.')[1]));
      stxAddress = payload.sub; // 'sub' is the user's address in the JWT
      console.log('Found existing session for:', stxAddress);
    }
  });

  /**
   * Full authentication flow
   * 1. Connect to the selected wallet.
   * 2. Fetch a nonce from the backend.
   * 3. Sign the nonce with the wallet.
   * 4. Send the signature to the backend to get a JWT.
   * 5. Store the JWT and update the UI.
   */
  async function handleLogin(walletType) {
    isLoading = true;
    errorMessage = '';
    stxAddress = '';

    try {
      // 1. Connect to wallet
      const { stxAddress: address } = await connectWithWallet(walletType);

      // 2. Fetch nonce from backend
      const nonceResponse = await fetch(`${BACKEND_URL}/api/users/nonce?address=${address}`);
      if (!nonceResponse.ok) {
        throw new Error('Failed to fetch nonce from server.');
      }
      const { nonce } = await nonceResponse.json();

      // 3. Sign the nonce
      const { publicKey, signature } = await signMessage(nonce);

      // 4. Send signature to backend for JWT
      const loginResponse = await fetch(`${BACKEND_URL}/api/users/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address,
          publicKey,
          signature,
          nonce,
        }),
      });

      if (!loginResponse.ok) {
        const errorData = await loginResponse.json();
        throw new Error(errorData.error || 'Login failed.');
      }

      // 5. Store JWT and update UI
      const { token } = await loginResponse.json();
      localStorage.setItem('stacks_token', token);
      stxAddress = address;
      console.log('Login successful! JWT stored.');
    } catch (error) {
      console.error('Login process failed:', error);
      errorMessage = error.message;
    } finally {
      isLoading = false;
    }
  }

  function handleLogout() {
    localStorage.removeItem('stacks_token');
    stxAddress = '';
    // Optional: Call a backend /logout endpoint
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

    {#if isLoading}
      <p>Connecting to wallet and verifying...</p>
    {:else if stxAddress}
      <div class="success-message">
        <p>✅ Connected as:</p>
        <code class="address-code">{stxAddress}</code>
        <div class="button-group">
          <a href="/setup-profile" class="primary">Setup Profile</a>
          <button class="secondary" on:click={handleLogout}>Logout</button>
        </div>
      </div>
    {:else}
      <p>Connect your Stacks wallet to get started.</p>
      <div class="button-group">
        <button class="primary" on:click={() => handleLogin('leather')}>Connect Leather</button>
        <button class="secondary" on:click={() => handleLogin('xverse')}>Connect Xverse</button>
      </div>
    {/if}

    {#if errorMessage}
      <p class="error-message">{errorMessage}</p>
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
  .error-message {
    color: red;
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
