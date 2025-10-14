<script>
	import { onMount } from 'svelte';
	import { nanoid } from 'nanoid';
	import {
		initNear,
		login,
		logout,
		createProfile,
		fetchProfile,
		fetchLatestTokens,
		fetchTokensByOwner,
		followInfluencer,
		mintToken,
		tipToken,
		getFollowers,
		formatYoctoToNear,
		getAccountId
	} from '$lib/near/client';

	const backendBase = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000';

	let isSignedIn = false;
	let accountId = '';
	let profile = null;
	let followers = [];
	let latestTokens = [];
	let myTokens = [];
	let loadingProfile = false;
	let refreshingFeed = false;
	let profileForm = { displayName: '', bio: '', avatarMedia: '' };
	let conversion = null;
	let convertError = '';
	let isConverting = false;
	let mintTitle = '';
	let mintDescription = '';
	let statusMessage = '';
	let tipAmount = '0.1';
	let uiStep = 'connect';
	let showWalletChoices = false;

	// selfie capture state
	let cameraStream = null;
	let videoEl = null;
	let capturing = false;
	let cameraError = '';
	let useCamera = false;
	let capturePreview = '';

	const hasProfile = () => Boolean(profile);

	onMount(() => {
		start();
	});

	async function start() {
		try {
			const { isSignedIn: signed } = await initNear();
			accountId = getAccountId();
			isSignedIn = signed;
			await loadFeed();
			if (signed && accountId) {
				await loadProfile();
				uiStep = 'create';
			}
		} catch (error) {
			console.error(error);
			statusMessage = error?.message || 'Failed to initialize NEAR connection.';
		}
	}

	async function loadFeed() {
		refreshingFeed = true;
		try {
			latestTokens = (await fetchLatestTokens(12)) || [];
		} catch (error) {
			console.error(error);
			statusMessage = error?.message || 'Unable to load the community feed.';
		} finally {
			refreshingFeed = false;
		}
	}

	async function loadProfile() {
		if (!accountId) return;
		loadingProfile = true;
		try {
			profile = await fetchProfile(accountId);
				if (profile) {
					followers = (await getFollowers(accountId)) || [];
					myTokens = (await fetchTokensByOwner(accountId, 24)) || [];
				uiStep = 'create';
			} else {
				uiStep = 'profile';
			}
		} catch (error) {
			console.error(error);
			statusMessage = error?.message || 'Unable to load influencer profile.';
		} finally {
			loadingProfile = false;
		}
	}

	async function handleLogin(walletId) {
		showWalletChoices = false;
		await login(walletId);
	}

	async function handleLogout() {
		await logout();
		window.location.reload();
	}

	async function handleCreateProfile(event) {
		event.preventDefault();
		statusMessage = '';
		if (!profileForm.displayName.trim()) {
			statusMessage = 'Choose a display name to continue.';
			return;
		}
		try {
			await createProfile(profileForm.displayName.trim(), profileForm.bio.trim(), profileForm.avatarMedia.trim());
			statusMessage = 'Profile created! Time to upload or capture your first shot.';
			await loadProfile();
		} catch (error) {
			console.error(error);
			statusMessage = error?.message || 'Failed to create profile.';
		}
	}

	async function uploadAndConvert(blob, filename) {
		convertError = '';
		isConverting = true;
		statusMessage = '';
		try {
			const formData = new FormData();
			formData.append('file', blob, filename || 'upload.png');
			const response = await fetch(`${backendBase}/api/convert`, {
				method: 'POST',
				body: formData
			});
			const payload = await response.json();
			if (!response.ok) {
				convertError = payload?.error || 'Image conversion failed.';
				return;
			}
			conversion = {
				id: payload.id,
				original: payload.original.startsWith('http') ? payload.original : `${backendBase}${payload.original}`,
				converted: payload.converted.startsWith('http') ? payload.converted : `${backendBase}${payload.converted}`,
				mediaType: payload.mediaType || 'image/png'
			};
			mintTitle = `Creator Drop ${new Date().toLocaleDateString()}`;
			mintDescription = 'Stylized AI portrait minted on NEAR SocialFi.';
			uiStep = 'mint';
		} catch (error) {
			console.error(error);
			convertError = error?.message || 'Image conversion failed.';
		} finally {
			isConverting = false;
		}
	}

	async function handleFileChange(event) {
		const file = event.target?.files?.[0];
		if (!file) return;
		uploadAndConvert(file, file.name);
	}

	async function startCamera() {
		cameraError = '';
		try {
			cameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 1024 } }, audio: false });
			useCamera = true;
			// attach stream to video element if available
			if (videoEl && 'srcObject' in videoEl) {
				videoEl.srcObject = cameraStream;
			}
		} catch (err) {
			cameraError = err?.message || 'Unable to access camera.';
		}
	}

	function stopCamera() {
		if (cameraStream) {
			cameraStream.getTracks().forEach(t => t.stop());
		}
		cameraStream = null;
		useCamera = false;
	}

	async function captureSelfie(videoEl) {
		if (!videoEl) return;
		capturing = true;
		const canvas = document.createElement('canvas');
		canvas.width = videoEl.videoWidth || 1024;
		canvas.height = videoEl.videoHeight || 1024;
		const ctx = canvas.getContext('2d');
		ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
		const dataUrl = canvas.toDataURL('image/png');
		capturePreview = dataUrl;
		canvas.toBlob(blob => {
			if (blob) {
				uploadAndConvert(blob, 'selfie.png');
			}
			capturing = false;
		}, 'image/png');
	}

	async function handleMint(event) {
		event.preventDefault();
		if (!conversion) {
			statusMessage = 'Upload or capture an image before minting.';
			return;
		}
		try {
			statusMessage = 'Minting on NEAR...';
			const tokenId = `ai-${nanoid(12)}`;
			const metadata = {
				title: mintTitle || `Creator Drop ${new Date().toLocaleDateString()}`,
				description: mintDescription,
				media: conversion.converted,
				extra: JSON.stringify({
					original: conversion.original,
					converted: conversion.converted,
					influencer: accountId
				})
			};
			await mintToken(tokenId, metadata, '0.001');
			statusMessage = `Minted NFT ${tokenId}!`;
			conversion = null;
			await loadFeed();
			await loadProfile();
			uiStep = 'create';
		} catch (error) {
			console.error(error);
			statusMessage = error?.message || 'Minting failed.';
		}
	}

	function tokenTimestamp(token) {
		if (!token?.createdAt) return '';
		const millis = Number(token.createdAt) / 1_000_000;
		return new Date(millis).toLocaleString();
	}

	async function handleFollow(ownerId) {
		if (!isSignedIn) {
			statusMessage = 'Sign in to follow influencers.';
			return;
		}
		if (ownerId === accountId) {
			return;
		}
		try {
			await followInfluencer(ownerId);
			statusMessage = `You are now following ${ownerId}.`;
			if (ownerId === accountId) {
				await loadProfile();
			}
		} catch (error) {
			console.error(error);
			statusMessage = error?.message || 'Unable to follow influencer.';
		}
	}

	async function handleTip(tokenId) {
		if (!isSignedIn) {
			statusMessage = 'Sign in to tip creators.';
			return;
		}
		try {
			await tipToken(tokenId, tipAmount || '0.1');
			statusMessage = 'Thanks for supporting your creator!';
			await loadFeed();
		} catch (error) {
			console.error(error);
			statusMessage = error?.message || 'Tipping failed.';
		}
	}

	function followersCount() {
		return profile?.followers ?? followers.length ?? 0;
	}

	function profileMintCount() {
		return profile?.minted ?? myTokens.length ?? 0;
	}
</script>

<section class="hero">
	<div>
		<h1>Creators on NEAR</h1>
		<p class="lead">
			Stylize influencer portraits with AI, mint limited drops as NFTs, and let fans tip or follow directly on
			the NEAR SocialFi experience.
		</p>
	</div>
	<div class="auth-panel">
		{#if isSignedIn}
			<p class="connected">Connected as <strong>{accountId}</strong></p>
			<button class="secondary" on:click={handleLogout}>Disconnect</button>
		{:else}
			{#if showWalletChoices}
				<div class="wallet-buttons">
					<button on:click={() => handleLogin('near-wallet')} class="primary">NEAR Wallet</button>
					<button on:click={() => handleLogin('here-wallet')} class="secondary">HERE Wallet</button>
					<button on:click={() => handleLogin()} class="secondary outline">More…</button>
				</div>
			{:else}
				<button class="primary" on:click={() => showWalletChoices = true}>Connect Wallet</button>
			{/if}
		{/if}
	</div>
</section>

{#if statusMessage}
	<div class="status">{statusMessage}</div>
{/if}

<section class="workflow">
	<h2>Creator workflow</h2>
	<ol>
		<li class:active={isSignedIn}>Connect wallet</li>
		<li class:active={hasProfile()}>Set up profile</li>
		<li class:active={conversion}>Convert portrait</li>
		<li class:active={uiStep === 'mint' && conversion}>Mint NFT</li>
	</ol>
</section>

{#if isSignedIn}
	<section class="profile-card">
		<h2>Your creator profile</h2>
		{#if loadingProfile}
			<p>Loading profile…</p>
		{:else if hasProfile()}
			<div class="profile-summary">
				<div>
					<h3>{profile.displayName}</h3>
					<p>{profile.bio}</p>
				</div>
				<ul class="metrics">
					<li><strong>{followersCount()}</strong><span>followers</span></li>
					<li><strong>{profileMintCount()}</strong><span>drops</span></li>
				</ul>
			</div>
		{:else}
			<form class="profile-form" on:submit|preventDefault={handleCreateProfile}>
				<label>
					Display name
					<input bind:value={profileForm.displayName} placeholder="NEAR Creator" required />
				</label>
				<label>
					Bio
					<textarea bind:value={profileForm.bio} rows="3" placeholder="Tell fans about your drop"></textarea>
				</label>
				<label>
					Avatar media URL (optional)
					<input bind:value={profileForm.avatarMedia} placeholder="https://" />
				</label>
				<button class="primary" type="submit">Create profile</button>
			</form>
		{/if}
	</section>

	<section class="conversion-card">
		<h2>2D stylization</h2>
		<p>Upload a fresh selfie or capture one. The backend applies a stylized 2D treatment ready for minting.</p>
		<div class="capture-instructions">
			<h3>Capture tips</h3>
			<ul>
				<li>Bright, even frontal lighting (avoid strong shadows).</li>
				<li>Neutral background preferred.</li>
				<li>Center your face; keep camera steady.</li>
				<li>Avoid heavy filters; natural look works best.</li>
				<li>Remove sunglasses / reflective eyewear.</li>
			</ul>
		</div>
		<div class="upload-row">
			<input type="file" accept="image/*" on:change={handleFileChange} disabled={isConverting} />
			{#if !useCamera}
				<button class="secondary" on:click={startCamera} disabled={isConverting}>Use Camera</button>
			{:else}
				<button class="secondary" on:click={stopCamera}>Close Camera</button>
			{/if}
		</div>
		{#if cameraError}<p class="error">{cameraError}</p>{/if}
		{#if useCamera}
			<div class="camera-wrap">
				<video autoplay playsinline bind:this={videoEl} on:loadedmetadata={() => videoEl && videoEl.play()}>
					<track kind="captions" label="camera preview" />
				</video>
				<button class="primary capture-btn" disabled={capturing || isConverting} on:click={() => captureSelfie(videoEl)}>{capturing ? 'Capturing…' : 'Capture & Convert'}</button>
			</div>
		{/if}
		{#if convertError}
			<p class="error">{convertError}</p>
		{/if}
		{#if isConverting}
			<p>Processing image…</p>
		{/if}
		{#if capturePreview && !conversion}
			<div class="preview single">
				<div>
					<h3>Captured</h3>
					<img alt="Captured selfie" src={capturePreview} />
				</div>
			</div>
		{/if}
		{#if conversion}
			<div class="preview">
				<div>
					<h3>Original</h3>
					<img alt="Original upload" src={conversion.original} />
				</div>
				<div>
					<h3>Stylized</h3>
					<img alt="Stylized output" src={conversion.converted} />
				</div>
			</div>
		{/if}
	</section>

	{#if conversion}
		<section class="mint-card">
			<h2>Mint your drop</h2>
			<form on:submit|preventDefault={handleMint}>
				<label>
					Title
					<input bind:value={mintTitle} placeholder="Creator Drop" required />
				</label>
				<label>
					Description
					<textarea bind:value={mintDescription} rows="3" placeholder="Share the story behind this drop"></textarea>
				</label>
				<p class="hint">A deposit of 0.001 NEAR will be attached to cover minting.</p>
				<button class="primary" type="submit">Mint on NEAR</button>
			</form>
		</section>
	{/if}

	{#if myTokens.length}
		<section class="my-tokens">
			<h2>Your collection</h2>
			<div class="grid">
				{#each myTokens as token}
					<article class="token-card">
						<img alt={token.metadata.title} src={token.metadata.media} />
						<h3>{token.metadata.title}</h3>
						<p>{token.metadata.description}</p>
						<p class="meta">Minted {tokenTimestamp(token)}</p>
						<p class="meta">Tips: {formatYoctoToNear(token.tips)} NEAR</p>
					</article>
				{/each}
			</div>
		</section>
	{/if}
{/if}

<section class="feed">
	<div class="feed-header">
		<h2>Community feed</h2>
		<button class="secondary" on:click={loadFeed} disabled={refreshingFeed}>{refreshingFeed ? 'Refreshing…' : 'Refresh'}</button>
	</div>
	{#if !latestTokens.length}
		<p>No drops minted yet. Be the first!</p>
	{:else}
		<div class="grid">
			{#each latestTokens as token}
				<article class="token-card">
					<img alt={token.metadata.title} src={token.metadata.media} />
					<header>
						<h3>{token.metadata.title}</h3>
						<p class="meta">By {token.ownerId}</p>
					</header>
					<p>{token.metadata.description}</p>
					<p class="meta">Minted {tokenTimestamp(token)}</p>
					<p class="meta">Tips: {formatYoctoToNear(token.tips)} NEAR</p>
					<div class="actions">
						{#if isSignedIn && token.ownerId !== accountId}
							<button class="secondary" on:click={() => handleFollow(token.ownerId)}>Follow</button>
						{/if}
						{#if isSignedIn}
							<button class="primary" on:click={() => handleTip(token.tokenId)}>Tip {tipAmount} NEAR</button>
						{/if}
					</div>
				</article>
			{/each}
		</div>
	{/if}
	{#if isSignedIn}
		<div class="tip-input">
			<label>
				Tip amount (NEAR)
				<input bind:value={tipAmount} type="number" min="0.01" step="0.01" />
			</label>
		</div>
	{/if}
</section>

<style>
	:global(body) { font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #080808; color: #f5f5f5; margin: 0; }
	section { margin: 2.5rem auto; max-width: 960px; padding: 1.5rem; border-radius: 18px; background: rgba(20, 20, 20, 0.85); box-shadow: 0 24px 80px rgba(0, 0, 0, 0.45); }
	.hero { display: flex; align-items: flex-start; justify-content: space-between; gap: 2rem; background: linear-gradient(135deg, rgba(118, 44, 255, 0.9), rgba(12, 12, 12, 0.95)); }
	.hero h1 { margin: 0 0 1rem; font-size: 3rem; font-weight: 700; }
	.lead { font-size: 1.1rem; max-width: 420px; line-height: 1.6; }
	.auth-panel { text-align: right; }
	.wallet-buttons { display: flex; flex-direction: column; gap: 0.5rem; }
	button { border: none; border-radius: 999px; padding: 0.75rem 1.6rem; font-size: 1rem; font-weight: 600; cursor: pointer; transition: transform 120ms ease, box-shadow 120ms ease; }
	button.primary { background: #ff5c8d; color: #fff; box-shadow: 0 10px 30px rgba(255, 92, 141, 0.25); }
	button.secondary { background: rgba(255, 255, 255, 0.12); color: #fff; border: 1px solid rgba(255, 255, 255, 0.2); }
	button.secondary.outline { background: transparent; }
	button:disabled { opacity: 0.6; cursor: not-allowed; }
	button:not(:disabled):hover { transform: translateY(-2px); }
	.status { margin: 1rem auto; max-width: 960px; padding: 1rem 1.5rem; background: rgba(67, 56, 202, 0.35); border: 1px solid rgba(129, 140, 248, 0.5); border-radius: 16px; }
	.workflow ol { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 1rem; padding-left: 1rem; }
	.workflow li { list-style: decimal; opacity: 0.45; background: rgba(255, 255, 255, 0.05); padding: 0.75rem 1rem; border-radius: 12px; }
	.workflow li.active { opacity: 1; background: rgba(255, 255, 255, 0.12); }
	.profile-card .profile-summary { display: flex; justify-content: space-between; gap: 1.5rem; align-items: center; }
	.profile-card .metrics { display: flex; gap: 1.5rem; margin: 0; padding: 0; list-style: none; }
	.profile-card .metrics li { text-align: center; }
	.profile-form, .mint-card form { display: grid; gap: 1rem; }
	input, textarea { width: 100%; padding: 0.75rem 1rem; border-radius: 12px; border: 1px solid rgba(255, 255, 255, 0.15); background: rgba(0, 0, 0, 0.35); color: #fff; font-size: 1rem; }
	textarea { resize: vertical; }
	.conversion-card .preview { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem; margin-top: 1.5rem; }
	.preview.single { grid-template-columns: 1fr; }
	.preview img, .token-card img { width: 100%; height: auto; border-radius: 16px; border: 1px solid rgba(255, 255, 255, 0.08); box-shadow: 0 12px 30px rgba(0, 0, 0, 0.4); object-fit: cover; }
	.grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1.5rem; }
	.token-card { padding: 1rem; border-radius: 16px; background: rgba(16, 16, 16, 0.9); display: grid; gap: 0.75rem; }
	.token-card header { display: flex; justify-content: space-between; gap: 1rem; align-items: baseline; }
	.meta { font-size: 0.85rem; opacity: 0.65; }
	.feed .actions { display: flex; gap: 0.75rem; flex-wrap: wrap; }
	.tip-input { margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid rgba(255, 255, 255, 0.08); }
	.error { color: #fca5a5; }
	.upload-row { display: flex; gap: 1rem; align-items: center; flex-wrap: wrap; }
	.camera-wrap { position: relative; margin-top: 1rem; display: flex; flex-direction: column; gap: 0.75rem; }
	.camera-wrap video { width: 320px; max-width: 100%; border-radius: 16px; border: 1px solid rgba(255,255,255,0.15); background: #000; }
	.capture-btn { align-self: flex-start; }
	.capture-instructions { margin: 1rem 0; background: rgba(255,255,255,0.05); padding: 0.75rem 1rem; border-radius: 12px; }
	.capture-instructions h3 { margin: 0 0 0.5rem; font-size: 1rem; }
	.capture-instructions ul { margin: 0; padding-left: 1.2rem; font-size: 0.85rem; line-height: 1.4; }
	@media (max-width: 760px) { .hero { flex-direction: column; } .auth-panel { text-align: left; } section { padding: 1.25rem; } }
</style>
