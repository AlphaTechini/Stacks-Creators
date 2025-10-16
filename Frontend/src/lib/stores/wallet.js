// src/lib/stores/wallet.js
import { writable } from 'svelte/store';

function createWalletStore() {
	const { subscribe, set, update } = writable({
		stxAddress: null,
		token: null,
		isLoading: true,
	});

	return {
		subscribe,
		set: (newState) => set(newState),
		update: (updater) => update(updater),
	};
}

export const wallet = createWalletStore();
