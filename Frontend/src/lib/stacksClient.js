import { fetchAPI } from './api.js'; // Assuming fetchAPI is exported from api.js
import { request, signMessage, disconnect as stacksDisconnect, openContractCall } from '@stacks/connect';
import * as StacksTransactions from '@stacks/transactions'; // Keep for cvToHex, etc.

const {
  createSTXPostCondition,
  FungibleConditionCode,
  uintCV,
  cvToHex,
} = StacksTransactions;

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

export function handleLogin() { 
  showConnect({
    appDetails: {
      name: 'Stacks Creators',
      icon: window.location.origin + '/logo.svg', // Ensure you have a logo here
    },
    onFinish: async (response) => {
      const stxAddress = response.addresses.find(addr => addr.address.startsWith('S'))?.address;
      if (!stxAddress) {
        console.error('No STX address found in wallet response.');
        return;
      }

      try {
        // The user is signed in, now we need to authenticate with our backend
        const nonceResponse = await fetch(`${BACKEND_URL}/api/users/nonce?address=${stxAddress}`);
        if (!nonceResponse.ok) throw new Error('Failed to fetch nonce from server.');
        const { nonce } = await nonceResponse.json();

        const signatureData = await signMessage({ message: nonce });

        const loginResponse = await fetchAPI('/api/users/login', 'POST', null, {
          address: stxAddress,
          publicKey: signatureData.publicKey,
          signature: signatureData.signature,
          nonce,
        });

        localStorage.setItem('stacks_token', loginResponse.token);
        console.log('Backend login successful! JWT stored.');
        // Manually trigger a reload to ensure all stores are updated correctly.
        location.reload();
      } catch (error) {
        console.error('Login process failed:', error.message);
      } finally {
        // No need for a reload here as it's handled on success.
      }
    },
    onCancel: () => {
      console.log('Login process cancelled by user.');
    }
  });

  function showConnect(options) {
    request(options, 'getAddresses');
  }
}

export function handleLogout() {
  localStorage.removeItem('stacks_token');
  stacksDisconnect();
  location.reload();
}

/**
 * Creates and signs a `list-token` transaction.
 * @param {number} tokenId - The ID of the token to list.
 * @param {number} price - The price in micro-STX.
 * @returns {Promise<string>} The hex-encoded signed transaction.
 */
export async function createListTx(tokenId, price) {
  const response = await request('stx_callContract', {
    contract: `${import.meta.env.VITE_CONTRACT_ADDRESS}.${import.meta.env.VITE_STACKS_CONTRACT_NAME_MARKET}`,
    functionName: 'list-token',
    functionArgs: [cvToHex(uintCV(tokenId)), cvToHex(uintCV(price))],
    appDetails: {
      name: 'Stacks Creators',
      icon: window.location.origin + '/logo.svg',
    },
  });
  return response.txId;
}

/**
 * Creates and signs a `buy-token` transaction.
 * @param {number} tokenId - The ID of the token to buy.
 * @param {number} price - The price in micro-STX.
 * @param {string} userAddress - The STX address of the user initiating the purchase.
 * @returns {Promise<string>} The hex-encoded signed transaction.
 */
export async function createBuyTx(tokenId, price, userAddress) {
  const response = await request('stx_callContract', {
    contract: `${import.meta.env.VITE_CONTRACT_ADDRESS}.${import.meta.env.VITE_STACKS_CONTRACT_NAME_MARKET}`,
    functionName: 'buy-token',
    functionArgs: [cvToHex(uintCV(tokenId))],
    postConditions: [createSTXPostCondition(userAddress, FungibleConditionCode.Equal, price)],
    appDetails: {
      name: 'Stacks Creators',
      icon: window.location.origin + '/logo.svg',
    },
  });
  return response.txId;
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
