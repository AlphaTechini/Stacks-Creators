<script>
	import { page } from '$app/stores';
	import { getNFT } from '$lib/api.js';
	import { wallet } from '$lib/stores/wallet.js';
	import { browser } from '$app/environment';
	import BuyNFT from '$lib/components/BuyNFT.svelte';
	import ListNFT from '$lib/components/ListNFT.svelte';

	let nft = $state(null);
	let isLoading = $state(true);
	let error = $state('');
	let isOwner = $state(false);

	const tokenId = $page.params.id;

	$effect(() => {
		if (browser && tokenId) {
			loadNFT();
		}
	});

	async function loadNFT() {
		isLoading = true;
		error = '';
		try {
			nft = await getNFT(tokenId);
			// Check ownership after NFT loads
			isOwner = nft && $wallet.stxAddress && nft.ownerAddress === $wallet.stxAddress;
		} catch (e) {
			error = e.message;
		} finally {
			isLoading = false;
		}
	}
</script>

<section class="nft-detail-container">
	{#if isLoading}
		<p>Loading NFT details...</p>
	{:else if error}
		<p class="error-message">{error}</p>
	{:else if nft}
		<h1>NFT #{nft.tokenId.slice(0, 8)}...</h1>
		<img src={nft.imageUrl} alt="NFT Artwork" />
		<div>
			{#if isOwner && !nft.onChainListing}
				<ListNFT {tokenId} />
			{:else if !isOwner && nft.onChainListing}
				<BuyNFT {tokenId} price={nft.onChainListing.price.value} />
			{/if}
		</div>
	{/if}
</section>
