<script>
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import { onMount } from 'svelte';
	import { writable } from 'svelte/store';

	let { children } = $props();

	// Theme store
	const theme = writable('dark');

	onMount(() => {
		const storedTheme = localStorage.getItem('theme');
		if (storedTheme && (storedTheme === 'light' || storedTheme === 'dark')) {
			theme.set(storedTheme);
		}

		// Apply theme to the document
		theme.subscribe((value) => {
			if (typeof document !== 'undefined') {
				document.documentElement.setAttribute('data-theme', value);
				localStorage.setItem('theme', value);
			}
		});
	});

	function toggleTheme() {
		theme.update((current) => (current === 'dark' ? 'light' : 'dark'));
	}
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
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
		<button class="secondary" onclick={toggleTheme}>
			Switch to {$theme === 'dark' ? 'Light' : 'Dark'} Mode
		</button>
	</div>
</header>

<main>
	{@render children?.()}
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