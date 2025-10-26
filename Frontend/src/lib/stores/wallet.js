// src/lib/stores/wallet.js
import { writable } from 'svelte/store';
import { getLocalStorage } from '@stacks/connect';

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
			const stxAddress = storage.addresses?.stx?.[0]?.address;
			const token = localStorage.getItem('stacks_token');
			update((store) => ({
				...store,
				isLoading: false,
				isConnected: !!stxAddress,
				stxAddress: stxAddress || null,
				userData: storage,
				token: token,
			}));
		} else {
			// No session found in local storage
			update((store) => ({
				...store,
				isLoading: false,
				isConnected: false,
				stxAddress: null,
				userData: null,
				token: null,
			});
		}
	}

	return {
		subscribe,
		set,
		update,
		load,
	};
}

export const wallet = createWalletStore();
