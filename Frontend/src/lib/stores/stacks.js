import { writable } from 'svelte/store';
import { connect, disconnect, getLocalStorage } from '@stacks/connect';

/**
 * @typedef {object} StacksStore
 * @property {boolean} loading - True if any async operation is in progress.
 * @property {boolean} connected - True if the user is connected.
 * @property {string|null} address - The user's STX address for the current network.
 * @property {object|null} userData - The full user data from local storage.
 */

/**
 * Creates a Svelte store to manage the Stacks wallet connection state.
 * @returns {import('svelte/store').Writable<StacksStore> & {
 *   connect: () => Promise<void>,
 *   disconnect: () => Promise<void>,
 *   load: () => void
 * }}
 */
function createStacksStore() {
  const { subscribe, set, update } = writable({
    loading: true,
    connected: false,
    address: null,
    userData: null,
  });

  /**
   * Loads user data from local storage if it exists.
   */
  function load() {
    const storage = getLocalStorage();
    if (storage) {
      const stxAddress = storage.addresses?.stx?.[0]?.address;
      set({
        loading: false,
        connected: !!stxAddress,
        address: stxAddress || null,
        userData: storage,
      });
    } else {
      set({ loading: false, connected: false, address: null, userData: null });
    }
  }

  /**
   * Initiates the wallet connection process.
   */
  async function doConnect() {
    await connect();
    load(); // Reload state from local storage after connection
  }

  /**
   * Disconnects the user's wallet.
   */
  async function doDisconnect() {
    await disconnect();
    load(); // Reload state to reflect disconnection
  }

  return { subscribe, connect: doConnect, disconnect: doDisconnect, load };
}

export const stacks = createStacksStore();