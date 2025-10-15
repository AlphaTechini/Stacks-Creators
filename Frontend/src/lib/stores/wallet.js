import { $state } from 'svelte/reactivity';

/**
 * A custom Svelte store to manage the user's wallet session.
 * It handles loading the session from localStorage on startup.
 */
const walletState = $state({
  stxAddress: null,
  token: null,
  isLoading: true, // Start in loading state until checked
});

function set(newState) {
  walletState.stxAddress = newState.stxAddress;
  walletState.token = newState.token;
  walletState.isLoading = newState.isLoading;
}

function update(updater) {
  const updatedState = updater(walletState);
  set(updatedState);
}

export const wallet = {
  get stxAddress() { return walletState.stxAddress },
  get token() { return walletState.token },
  get isLoading() { return walletState.isLoading },
  set,
  update,
};