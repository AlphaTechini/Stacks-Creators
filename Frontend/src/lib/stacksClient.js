import { connect, request } from '@stacks/connect';

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