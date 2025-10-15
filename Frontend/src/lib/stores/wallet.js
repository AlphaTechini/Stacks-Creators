import { writable } from 'svelte/store';
import { onMount } from 'svelte';

/**
 * A custom Svelte store to manage the user's wallet session.
 * It handles loading the session from localStorage on startup.
 */
function createWalletStore() {
  const { subscribe, set, update } = writable({
    stxAddress: null,
    token: null,
    isLoading: true, // Start in loading state until checked
  });

  // This function should be called once in the root layout.
  function initialize() {
    onMount(() => {
      const storedToken = localStorage.getItem('stacks_token');
      if (storedToken) {
        try {
          const payload = JSON.parse(atob(storedToken.split('.')[1]));
          // Optional: Check if token is expired
          if (payload.exp * 1000 > Date.now()) {
            set({
              stxAddress: payload.sub,
              token: storedToken,
              isLoading: false,
            });
          } else {
            localStorage.removeItem('stacks_token');
            set({ stxAddress: null, token: null, isLoading: false });
          }
        } catch (e) {
          console.error('Failed to parse stored token', e);
          localStorage.removeItem('stacks_token');
          set({ stxAddress: null, token: null, isLoading: false });
        }
      } else {
        set({ stxAddress: null, token: null, isLoading: false });
      }
    });
  }

  return { subscribe, set, update, initialize };
}

export const wallet = createWalletStore();