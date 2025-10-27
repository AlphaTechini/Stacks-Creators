import { fetchAPI } from './api.js'; // Assuming fetchAPI is exported from api.js
import { AppConfig, UserSession, showConnect, openContractCall, signMessage } from '@stacks/connect';
import * as StacksTransactions from '@stacks/transactions'; // Keep for cvToHex, etc.

const appConfig = new AppConfig(['store_write', 'publish_data']);
export const userSession = new UserSession({ appConfig });

const { // These are still needed for the transaction functions below
  createSTXPostCondition,
  FungibleConditionCode,
  uintCV,
} = StacksTransactions;

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3800';

export function handleLogin() { 
  showConnect({
    appDetails: {
      name: 'Stacks Creators',
      icon: '/favicon.png'
    },
    userSession,
    onFinish: async () => {
      // This reloads the page and wallet store will pick up the session.
      // We also need to get a JWT for our backend.
      const userData = userSession.loadUserData();
      const address = userData.profile.stxAddress.testnet;

      try {
        // The user is signed in, now we need to authenticate with our backend
        const nonceResponse = await fetch(`${BACKEND_URL}/api/users/nonce?address=${address}`);
        if (!nonceResponse.ok) throw new Error('Failed to fetch nonce from server.');
        const { nonce } = await nonceResponse.json();

        const signatureData = await signMessage({ message: nonce, privateKey: userData.appPrivateKey });

        const loginResponse = await fetchAPI('/api/users/login', 'POST', null, {
          address,
          publicKey: signatureData.publicKey,
          signature: signatureData.signature,
          nonce,
        });

        localStorage.setItem('stacks_token', loginResponse.token);
        console.log('Backend login successful! JWT stored.');
      } catch (error) {
        console.error('Login process failed:', error.message);
      } finally {
        location.reload();
      }
    },
    onCancel: () => {
      console.log('Login process cancelled by user.');
    }
  });
}

export function handleLogout() {
  localStorage.removeItem('stacks_token');
  userSession.signUserOut('/');
}

/**
 * Creates and signs a `list-token` transaction.
 * @param {number} tokenId - The ID of the token to list.
 * @param {number} price - The price in micro-STX.
 * @returns {Promise<string>} The hex-encoded signed transaction.
 */
export async function createListTx(tokenId, price) {
  return new Promise((resolve, reject) => {
    openContractCall({
      contractAddress: import.meta.env.VITE_CONTRACT_ADDRESS,
      contractName: import.meta.env.VITE_STACKS_CONTRACT_NAME_MARKET,
      functionName: 'list-token',
      functionArgs: [uintCV(tokenId), uintCV(price)],
      userSession,
      onFinish: (data) => resolve(data.txId),
      onCancel: () => reject(new Error('Transaction was cancelled.')),
    });
  });
}

/**
 * Creates and signs a `buy-token` transaction.
 * @param {number} tokenId - The ID of the token to buy.
 * @param {number} price - The price in micro-STX.
 * @param {string} userAddress - The STX address of the user initiating the purchase.
 * @returns {Promise<string>} The hex-encoded signed transaction.
 */
export async function createBuyTx(tokenId, price, userAddress) {
  return new Promise((resolve, reject) => {
    openContractCall({
      contractAddress: import.meta.env.VITE_CONTRACT_ADDRESS,
      contractName: import.meta.env.VITE_STACKS_CONTRACT_NAME_MARKET,
      functionName: 'buy-token',
      functionArgs: [uintCV(tokenId)],
      userSession,
      postConditions: [
        createSTXPostCondition(userAddress, FungibleConditionCode.Equal, price),
      ],
      onFinish: (data) => resolve(data.txId),
      onCancel: () => reject(new Error('Transaction was cancelled.')),
    });
  });
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
