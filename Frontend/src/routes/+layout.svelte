<script>
	import '../app.css';
	import { writable } from 'svelte/store';
	import { onMount } from 'svelte';
	import { wallet } from '$lib/stores/wallet.js';
	import ConnectButton from '$lib/components/ConnectButton.svelte';

	let { children } = $props();
	const theme = writable('dark');

	onMount(() => {
		// Load user session from local storage when the app mounts
		wallet.load();

		// Handle theme
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
			{#if $wallet.isConnected}
				<a href="/gallery" class="nav-link">Gallery</a>
				<a href="/dashboard" class="nav-link">Dashboard</a>
			{/if}

			<ConnectButton />

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
