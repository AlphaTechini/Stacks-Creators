import { connect, request } from '@stacks/connect';
import * as StacksTransactions from '@stacks/transactions';
const {
  createSTXPostCondition,
  FungibleConditionCode,
  uintCV,
} = StacksTransactions;
import { openContractCall } from '@stacks/connect';
import { wallet } from './stores/wallet.js';
import { fetchAPI } from './api.js'; // Assuming fetchAPI is exported from api.js

/**
 * Wallet IDs for the supported wallets.
 * These are used in the `approvedProviderIds` option for @stacks/connect.
 */
const WALLET_IDS = {
  leather: 'LeatherProvider',
  xverse: 'xverse',
};

/**
 * Connects to a specific Stacks wallet (Leather or Xverse).
 * This function opens the wallet's connection modal.
 *
 * @param {'leather' | 'xverse'} walletType - The type of wallet to connect with.
 * @returns {Promise<{stxAddress: string}>} A promise that resolves with the user's STX address.
 */
export async function connectWithWallet(walletType) {
  const walletId = WALLET_IDS[walletType];
  if (!walletId) {
    throw new Error(`Invalid wallet type specified: ${walletType}`);
  }

  return new Promise((resolve, reject) => {
    connect({
      appDetails: {
        name: 'Stacks Creators',
        icon: window.location.origin + '/logo.svg', // Ensure you have a logo here
      },
      // Force the user to select a wallet, but only show the one they clicked on.
      approvedProviderIds: [walletId],
      onFinish: payload => {
        console.log('Wallet connected:', payload);
        resolve({ stxAddress: payload.stxAddress });
      },
      onCancel: () => {
        console.log('Connection cancelled by user.');
        reject(new Error('Connection cancelled.'));
      },
    });
  });
}

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

/**
 * Full authentication flow
 * 1. Connect to the selected wallet.
 * 2. Fetch a nonce from the backend.
 * 3. Sign the nonce with the wallet.
 * 4. Send the signature to the backend to get a JWT.
 * 5. Store the JWT and update the global wallet store.
 */
export async function handleLogin(walletType) {
  wallet.update(s => ({ ...s, isLoading: true }));
  try {
    const { stxAddress: address } = await connectWithWallet(walletType);

    const nonceResponse = await fetch(`${BACKEND_URL}/api/users/nonce?address=${address}`);
    if (!nonceResponse.ok) throw new Error('Failed to fetch nonce from server.');
    const { nonce } = await nonceResponse.json();

    const { publicKey, signature } = await signMessage(nonce);

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
    wallet.set({ stxAddress: address, token, isLoading: false });
    console.log('Login successful! JWT stored.');
  } catch (error) {
    // The error is expected if the user cancels the connection modal.
    console.log('Login process cancelled or failed:', error.message);
  } finally {
    // Always ensure loading is set to false, even on cancellation.
    wallet.update(s => ({ ...s, isLoading: false }));
  }
}

export function handleLogout() {
  localStorage.removeItem('stacks_token');
  wallet.set({ stxAddress: null, token: null, isLoading: false });
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
      appDetails: {
        name: 'Stacks Creators',
        icon: window.location.origin + '/logo.svg',
      },
      onFinish: data => resolve(data.stacksTransaction.serialize().toString('hex')),
      onCancel: () => reject(new Error('Transaction signing was cancelled.')),
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
      functionArgs: [uintCV(tokenId), uintCV(price)],
      postConditions: [
        createSTXPostCondition(
          userAddress, // The user's address
          FungibleConditionCode.Equal,
          price
        ),
      ],
      appDetails: {
        name: 'Stacks Creators',
        icon: window.location.origin + '/logo.svg',
      },
      onFinish: data => resolve(data.stacksTransaction.serialize().toString('hex')),
      onCancel: () => reject(new Error('Transaction signing was cancelled.')),
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
  const endpoint = txType === 'list' ? '/api/marketplace/list' : '/api/marketplace/buy';  return fetchAPI(endpoint, 'POST', token, { signedTx });
}

/**
 * Prompts the connected wallet to sign a clear-text message.
 * This is used for the nonce-challenge during authentication.
 *
 * @param {string} message - The message to be signed (the nonce).
 * @returns {Promise<{publicKey: string, signature: string}>} A promise that resolves with the public key and signature.
 */
export async function signMessage(message) {
  try {
    const signatureData = await request('stx_signMessage', {
      message,
    });
    return signatureData;
  } catch (error) {
    // This can happen if the user rejects the signature request or if a popup blocker prevents the wallet from opening.
    console.error('Failed to sign message:', error);
    alert(
      'Could not get signature from wallet. Please ensure you approve the request and that popup blockers are disabled for this site.'
    );
    throw new Error('Signature request failed or was rejected.');
  }
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