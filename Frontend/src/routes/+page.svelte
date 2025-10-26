<script>
	import { wallet } from '$lib/stores/wallet.js';
</script>

<section class="hero">
	<h1>Unleash Your Creativity</h1>
	<p class="lead">Transform your art into unique, AI-powered NFTs on the Stacks blockchain.</p>
</section>

<section class="onboard-card">
	{#if $wallet.isLoading}
		<div class="loading-state">
			<p>Connecting to wallet and verifying...</p>
		</div>
	{:else if $wallet.isConnected}
		<div class="success-message">
			<p class="connected-text">✅ Connected as:</p>
			<code class="address-code">{$wallet.stxAddress}</code>
			<div class="button-group">
				<a href="/setup-profile" class="primary">Setup Profile</a>
			</div>
		</div>
	{:else}
		<h2>Get Started</h2>
		<p>Connect your Stacks wallet using the button in the header to begin.</p>
	{/if}
</section>

<style>
	.hero {
		text-align: center;
		padding: 4rem 1rem 2rem;
	}
	.hero h1 {
		font-size: 3.5rem;
		font-weight: 700;
		margin-bottom: 1rem;
	}
	.lead {
		font-size: 1.2rem;
		max-width: 500px;
		margin: 0 auto;
		color: var(--text-color);
		opacity: 0.8;
	}

	.onboard-card {
		margin: 2.5rem auto;
		max-width: 500px;
		padding: 2rem 2.5rem;
		border-radius: 18px;
		background: var(--card-background);
		border: 1px solid var(--card-border);
		text-align: center;
	}

	.onboard-card h2 {
		font-size: 1.8rem;
		font-weight: 600;
		margin-bottom: 0.5rem;
	}

	.loading-state,
	.success-message {
		padding: 1rem 0;
	}

	.connected-text {
		font-weight: 600;
	}

	.button-group {
		display: flex;
		gap: 1rem;
		justify-content: center;
		margin-top: 1.5rem;
	}

	.address-code {
		display: block;
		background: var(--input-background);
		padding: 0.75rem;
		border-radius: 8px;
		margin: 1rem 0;
		word-break: break-all;
		border: 1px solid var(--input-border);
		font-family: monospace;
		font-size: 0.9rem;
	}

	.primary {
		background: var(--primary-color);
		color: #fff;
		box-shadow: 0 8px 25px -8px var(--primary-color);
	}

	.primary:hover {
		background: var(--primary-color-hover);
		transform: translateY(-2px) scale(1.02);
	}

	.secondary {
		background: var(--secondary-color);
		color: var(--secondary-text);
		border: 1px solid var(--card-border);
	}

	.secondary:hover {
		background: var(--secondary-color-hover);
	}
</style>
