import { StacksTestnet, StacksDevnet } from '@stacks/network';
import { broadcastTransaction as broadcast } from '@stacks/transactions';

/**
 * Configures and exports a Stacks network client based on the environment.
 * Defaults to 'testnet' if STACKS_NETWORK is not 'devnet'.
 * It explicitly prevents configuration for 'mainnet'.
 */
function getNetwork() {
  const networkEnv = process.env.STACKS_NETWORK;
  if (networkEnv === 'mainnet') {
    throw new Error("This application is configured for testnet/devnet only. Do not use on mainnet.");
  }
  if (networkEnv === 'devnet') {
    return new StacksDevnet();
  }
  return new StacksTestnet();
}
export const network = getNetwork();

console.log(`Stacks client configured for: ${network.isMainnet() ? 'Mainnet' : 'Testnet'}`);

/**
 * Broadcasts a signed transaction to the configured Stacks network.
 *
 * @param {import('@stacks/transactions').StacksTransaction} signedTransaction - The signed transaction object.
 * @returns {Promise<import('@stacks/transactions').TxBroadcastResult>} A promise that resolves to the broadcast result.
 */
export async function broadcastTransaction(signedTransaction) {
  try {
    const result = await broadcast(signedTransaction, network);

    if (result.error) {
      console.error('Transaction broadcast failed:', result);
      throw new Error(`Transaction rejected: ${result.reason} - ${result.reason_data?.message}`);
    }

    return result;
  } catch (error) {
    console.error('Error broadcasting transaction:', error);
    throw error;
  }
}