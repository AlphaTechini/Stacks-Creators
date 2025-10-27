import { writable } from 'svelte/store';
import { userSession, handleLogin, handleLogout } from '$lib/stacksClient.js';

/**
 * @typedef {object} WalletStore
 * @property {boolean} isLoading - True if any async operation is in progress.
 * @property {boolean} isConnected - True if the user is connected.
 * @property {string|null} stxAddress - The user's STX address for the current network.
 * @property {import('@stacks/connect').UserData|null} userData - The full user data from local storage.
 * @property {string|null} token - A JWT token for backend authentication (if used).
 */

/**
 * @returns {import('svelte/store').Writable<WalletStore> & {load: () => void, connect: () => void, disconnect: () => void}}
 */
function createWalletStore() {
	const { subscribe, set, update } = writable({
		isLoading: true,
		isConnected: false,
		stxAddress: null,
		userData: null,
		token: null,
	});

	/**
	 * Loads user data from local storage if it exists.
	 */
	function load() {
		try {
			if (userSession.isUserSignedIn()) {
				const userData = userSession.loadUserData();
				const stxAddress = userData.profile.stxAddress.testnet;
				const token = localStorage.getItem('stacks_token');
				
				update((store) => ({
					...store,
					isLoading: false,
					isConnected: !!stxAddress,
					stxAddress: stxAddress || null,
					userData: userData,
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
				}));
			}
		} catch (error) {
			console.error('Error loading wallet:', error);
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
	 * Connect wallet
	 */
	function connect() {
		handleLogin();
	}

	/**
	 * Disconnect wallet
	 */
	function disconnect() {
		handleLogout();
	}

	return {
		subscribe,
		set,
		update,
		load,
		connect,
		disconnect,
	};
}

export const wallet = createWalletStore();