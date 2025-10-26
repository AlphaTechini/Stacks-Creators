import { wallet } from './stores/wallet.js';
import { fetchAPI } from './api.js'; // Assuming fetchAPI is exported from api.js
import * as Connect from '@stacks/connect';
import * as StacksTransactions from '@stacks/transactions'; // Keep for cvToHex, etc.
const { connect, disconnect: stacksDisconnect, sign, getLocalStorage } = Connect;
const {
  uintCV,
  createSTXPostCondition,
  FungibleConditionCode,
  cvToHex,
} = StacksTransactions;

/**
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3800';

/**
 * Full authentication flow
 * 1. Connect to the selected wallet.
 * 2. Fetch a nonce from the backend.
 * 3. Sign the nonce with the wallet.
 * 4. Send the signature to the backend to get a JWT.
 * 5. Store the JWT and update the global wallet store.
 */
export function handleLogin() {
  wallet.update(s => ({ ...s, isLoading: true }));

  const authOptions = {
    appDetails: {
      name: 'Stacks Creators',
      icon: window.location.origin + '/logo.svg',
    },
    onFinish: async (payload) => {
      try {
        // NOTE: In v7, stxAddress is an object with mainnet/testnet properties
        const address = payload.stxAddress.testnet;
        const publicKey = payload.publicKey;

        const nonceResponse = await fetch(`${BACKEND_URL}/api/users/nonce?address=${address}`);
        if (!nonceResponse.ok) throw new Error('Failed to fetch nonce from server.');
        const { nonce } = await nonceResponse.json();

        const { signature } = await sign({
          message: nonce,
          publicKey: publicKey,
        });

        const loginResponse = await fetch(`${BACKEND_URL}/api/users/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address, publicKey, signature, nonce }),
        });

        if (!loginResponse.ok) {
          const errorData = await loginResponse.json();
          throw new Error(errorData.error || 'Login failed.');
        }

        const { token } = await loginResponse.json();
        localStorage.setItem('stacks_token', token);
        wallet.set({ stxAddress: address, token, isLoading: false, isConnected: true, userData: getLocalStorage() });
        console.log('Login successful! JWT stored.');
      } catch (error) {
        console.error('Login process failed:', error.message);
        handleLogout(); // Ensure clean state on failure
      }
    },
    onCancel: () => {
      console.log('Login process cancelled by user.');
      wallet.update(s => ({ ...s, isLoading: false }));
    },
  };

  connect(authOptions);
}

export function handleLogout() {
  stacksDisconnect(); // Use the disconnect function from @stacks/connect
  localStorage.removeItem('stacks_token');
  wallet.set({ stxAddress: null, token: null, isLoading: false, isConnected: false, userData: null });
}

/**
 * Creates and signs a `list-token` transaction.
 * @param {number} tokenId - The ID of the token to list.
 * @param {number} price - The price in micro-STX.
 * @returns {Promise<string>} The hex-encoded signed transaction.
 */
export async function createListTx(tokenId, price) {
  // v7 does not have a direct `request` equivalent for this.
  // This function would need to be implemented using `openContractCall`
  // which also uses a callback pattern. For now, we'll leave it as a placeholder.
  console.warn('createListTx is not fully implemented for @stacks/connect v7');
  // const response = await openContractCall({
  //   contractAddress: import.meta.env.VITE_CONTRACT_ADDRESS,
  //   contractName: import.meta.env.VITE_STACKS_CONTRACT_NAME_MARKET,
  //   functionName: 'list-token',
  //   functionArgs: [uintCV(tokenId), uintCV(price)],
  // });
  // return response.txId; // v7 returns txId directly
}

/**
 * Creates and signs a `buy-token` transaction.
 * @param {number} tokenId - The ID of the token to buy.
 * @param {number} price - The price in micro-STX.
 * @param {string} userAddress - The STX address of the user initiating the purchase.
 * @returns {Promise<string>} The hex-encoded signed transaction.
 */
export async function createBuyTx(tokenId, price, userAddress) {
  const postCondition = createSTXPostCondition(
    userAddress,
    FungibleConditionCode.Equal,
    price
  );

  // v7 does not have a direct `request` equivalent for this.
  // This function would need to be implemented using `openContractCall`
  // which also uses a callback pattern. For now, we'll leave it as a placeholder.
  console.warn('createBuyTx is not fully implemented for @stacks/connect v7');
  // const response = await openContractCall({
  //   contractAddress: import.meta.env.VITE_CONTRACT_ADDRESS,
  //   contractName: import.meta.env.VITE_STACKS_CONTRACT_NAME_MARKET,
  //   functionName: 'buy-token',
  //   functionArgs: [uintCV(tokenId), uintCV(price)],
  //   postConditions: [postCondition],
  // });
  // return response.txId;
}

/**
 * Generic function to broadcast a signed transaction via the backend.
 * @param {string} token - The user's JWT.
 * @param {'list' | 'buy'} txType - The type of transaction.
 * @param {string} signedTx - The hex-encoded signed transaction.
 */
export async function broadcastSignedTx(token, txType, signedTx) {
  const endpoint = txType === 'list' ? '/api/marketplace/list' : '/api/marketplace/buy';
  return fetchAPI(endpoint, 'POST', token, { signedTx });
}

/**
 * Placeholder for a function to open the STX transfer dialog.
 * This can be implemented later for NFT purchases.
 *
 * @param {object} options - Transfer options (recipient, amount, etc.).
 */
export async function openSTXTransfer(options) {
  console.log('Opening STX transfer with options:', options);
  // Example using @stacks/connect request method
  // return await request('stx_transferStx', options);
}
