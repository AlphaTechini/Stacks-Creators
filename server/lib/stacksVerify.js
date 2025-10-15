import {
  verifyMessageSignature,
  publicKeyToAddress,
  AddressVersion,
  TransactionVersion,
} from '@stacks/transactions';

/**
 * Verifies a clear-text message signature from a Stacks wallet.
 *
 * @param {object} options
 * @param {string} options.message - The original clear-text message that was signed (the nonce).
 * @param {string} options.signature - The hex-encoded signature from the wallet.
 * @param {string} options.publicKey - The hex-encoded public key of the signer.
 * @param {string} options.address - The Stacks address (principal) of the signer.
 * @param {string} [options.network='mainnet'] - The network ('mainnet' or 'testnet').
 * @returns {boolean} - True if the signature is valid and the public key corresponds to the address.
 */
export function verifyStacksSignature({ message, signature, publicKey, address, network = 'mainnet' }) {
  try {
    // 1. Verify that the provided public key corresponds to the provided address.
    const addressVersion =
      network === 'mainnet' ? AddressVersion.MainnetSingleSig : AddressVersion.TestnetSingleSig;
    const transactionVersion =
      network === 'mainnet' ? TransactionVersion.Mainnet : TransactionVersion.Testnet;

    const derivedAddress = publicKeyToAddress(addressVersion, transactionVersion, publicKey);

    if (derivedAddress !== address) {
      console.error(`Address mismatch: Derived address ${derivedAddress} does not match provided address ${address}`);
      return false;
    }

    // 2. Verify the signature against the message and public key.
    return verifyMessageSignature({ message, signature, publicKey });

  } catch (error) {
    console.error("Error during signature verification:", error);
    return false;
  }
}