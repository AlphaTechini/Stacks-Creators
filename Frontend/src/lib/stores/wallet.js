// src/lib/stores/wallet.js
import { writable } from 'svelte/store';
import { connect, disconnect, getLocalStorage, sign } from '@stacks/connect';

/**
 * @typedef {object} WalletStore
 * @property {boolean} isLoading - True if any async operation is in progress.
 * @property {boolean} isConnected - True if the user is connected.
 * @property {string|null} stxAddress - The user's STX address for the current network.
 * @property {object|null} userData - The full user data from local storage.
 * @property {string|null} token - A JWT token for backend authentication (if used).
 */

function createWalletStore() {
	const { subscribe, set, update } = writable({
		isLoading: true, // Start in a loading state
		isConnected: false,
		stxAddress: null,
		userData: null, // This will hold the session data from @stacks/connect
		token: null,
	});

	/**
	 * Loads user data from local storage if it exists.
	 */
	function load() {
		const storage = getLocalStorage();
		if (storage) {
			// An active session exists in local storage
			const stxAddress = storage.profiles?.stx?.[0]?.address;
			update((store) => ({
				...store,
				isLoading: false,
				isConnected: !!stxAddress,
				stxAddress: stxAddress || null,
				userData: storage,
			}));
			// Optional: Authenticate with backend if a session is found on load
			// fetchAuthToken(stxAddress);
			// If a session exists, try to get a token from the backend
			if (stxAddress) {
				fetchAuthToken(stxAddress, storage.profiles.stx[0].publicKey);
			}
		} else {
			// No session found in local storage
			update((store) => ({
				...store,
				isLoading: false,
				isConnected: false,
				stxAddress: null,
				userData: null,
				token: null,
			}));
		}
	}

	/**
	 * Authenticates with the backend by signing a nonce and getting a JWT.
	 * @param {string} address The user's STX address.
	 * @param {string} publicKey The user's public key.
	 */
	async function fetchAuthToken(address, publicKey) {
		try {
			// 1. Get a nonce from the backend
			const nonceRes = await fetch(`http://localhost:3800/api/users/nonce?address=${address}`);
			if (!nonceRes.ok) throw new Error('Failed to get nonce');
			const { nonce } = await nonceRes.json();

			// 2. Ask the user to sign the nonce
			const { signature } = await sign({
				message: nonce,
				publicKey,
				onFinish: (data) => data, // Return the signature data
			});

			// 3. Send the signature to the backend to get a JWT
			const loginRes = await fetch('http://localhost:3800/api/users/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ address, publicKey, signature, nonce }),
			});

			if (!loginRes.ok) throw new Error('Backend login failed');
			const { token } = await loginRes.json();

			// 4. Store the token
			localStorage.setItem('auth_token', token);
			update((store) => ({ ...store, token }));
			console.log('Backend token acquired successfully.');
		} catch (error) {
			console.error('Could not authenticate with backend:', error);
			// On failure, clear any stale token
			localStorage.removeItem('auth_token');
			update((store) => ({ ...store, token: null }));
		}
	}

	/**
	 * Initiates the wallet connection process using @stacks/connect.
	 */
	async function doConnect() {
		await connect({
			// This onFinish callback is triggered after a successful connection
			onFinish: (payload) => {
				update((store) => ({
					...store,
					isConnected: true,
					stxAddress: payload.stxAddress.testnet, // Use .testnet or .mainnet based on your config (or payload.stxAddress.mainnet)
					userData: payload,
				}));
				// After connecting, you might want to authenticate with your backend
				// fetchAuthToken(payload.stxAddress.testnet);
				fetchAuthToken(payload.stxAddress.testnet, payload.publicKey);
			},
			onCancel: () => {
				console.log('Connection cancelled by user.');
				update((store) => ({ ...store, isLoading: false }));
			},
		});
	}

	/**
	 * Disconnects the user's wallet.
	 */
	async function doDisconnect() {
		await disconnect();
		localStorage.removeItem('auth_token');
		// Clear the store state
		set({
			isLoading: false,
			isConnected: false,
			stxAddress: null,
			userData: null,
			token: null,
		});
	}

	return {
		subscribe,
		connect: doConnect,
		disconnect: doDisconnect,
		load,
		fetchAuthToken,
	};
}

export const wallet = createWalletStore();
