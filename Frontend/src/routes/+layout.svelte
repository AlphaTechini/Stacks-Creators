<script>
	import '../app.css';
	import { writable } from 'svelte/store';
	import { browser } from '$app/environment';
	import { wallet } from '$lib/stores/wallet.js';
	import { handleLogin, handleLogout } from '$lib/stacksClient.js';

	let { children } = $props();
	const theme = writable('dark');

	// Only run on client-side
	if (browser) {
		// Initialize wallet from localStorage
		const storedToken = localStorage.getItem('stacks_token');
		if (storedToken) {
			try {
				const payload = JSON.parse(atob(storedToken.split('.')[1]));
				if (payload.exp * 1000 > Date.now()) {
					wallet.set({ stxAddress: payload.sub, token: storedToken, isLoading: false });
				} else {
					handleLogout();
				}
			} catch (e) {
				handleLogout();
			}
		} else {
			wallet.set({ stxAddress: null, token: null, isLoading: false });
		}

		// Handle theme
		$effect(() => {
			const storedTheme = localStorage.getItem('theme');
			if (storedTheme && (storedTheme === 'light' || storedTheme === 'dark')) {
				theme.set(storedTheme);
			}

			const unsubscribe = theme.subscribe((value) => {
				document.documentElement.setAttribute('data-theme', value);
				localStorage.setItem('theme', value);
			});

			return unsubscribe;
		});
	}

	function toggleTheme() {
		theme.update((current) => (current === 'dark' ? 'light' : 'dark'));
	}
</script>

<!-- rest of template stays the same -->

<svelte:head>
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
	<link
		href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

<header>
	<div class="header-content">
		<a href="/" class="logo">✨ Stacks Creators</a>
		<div class="controls">
			{#if $wallet.stxAddress}
				<a href="/gallery" class="nav-link">Gallery</a>
				<a href="/dashboard" class="nav-link">Dashboard</a>
			{/if}

			{#if $wallet.stxAddress}
				<div class="wallet-info">
					<span class="address">{$wallet.stxAddress.slice(0, 5)}...{$wallet.stxAddress.slice(-5)}</span>
					<button class="secondary" onclick={handleLogout}>Disconnect</button>
				</div>
			{:else if !$wallet.isLoading}
				<!-- Connect buttons could go here, or be left on the main page -->
			{/if}

			<button class="secondary" onclick={toggleTheme}>
				{$theme === 'dark' ? '☀️' : '🌙'}
			</button>
		</div>
	</div>
</header>

<main>
	{@render children()}
</main>

<style>
	header {
		padding: 1rem 1.5rem;
	}
	.header-content {
		max-width: 960px;
		margin: 0 auto;
		display: flex;
		justify-content: space-between;
		align-items: center;
	}
	.logo {
		font-weight: 700;
		font-size: 1.2rem;
		color: var(--text-color);
		text-decoration: none;
	}
	.nav-link {
		color: var(--text-color);
		text-decoration: none;
		font-weight: 600;
	}
	.controls {
		display: flex;
		align-items: center;
		gap: 1rem;
	}
	.wallet-info {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		background: var(--secondary-color);
		padding: 0.25rem 0.25rem 0.25rem 0.75rem;
		border-radius: 999px;
		border: 1px solid var(--card-border);
	}
	main {
		padding: 0 1.5rem;
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
