// stacksClient.js
import StacksNetworkPkg from '@stacks/network';
import { broadcastTransaction as broadcast } from '@stacks/transactions';

// Use devnet/testnet objects directly
const devnet = StacksNetworkPkg.devnet;
const testnet = StacksNetworkPkg.testnet;

// Cache selected network
let cachedNetwork = null;

function getNetwork() {
  if (cachedNetwork) return cachedNetwork;

  const networkEnv = process.env.STACKS_NETWORK || 'testnet';

  if (networkEnv === 'mainnet') {
    throw new Error("This application is configured for testnet/devnet only. Do not use on mainnet.");
  }

  cachedNetwork = networkEnv === 'devnet' ? devnet : testnet;
  return cachedNetwork;
}

export const network = getNetwork();

/**
 * Broadcasts a signed transaction to the configured Stacks network.
 */
export async function broadcastTransaction(signedTransaction) {
  try {
    const result = await broadcast(signedTransaction, network);

    if (result.error) {
      throw new Error(`Transaction rejected: ${result.reason} - ${result.reason_data?.message || ''}`);
    }

    return result;
  } catch (error) {
    throw error;
  }
}

export { devnet, testnet };
