// stacksClient.cjs
const { STACKS_TESTNET, STACKS_DEVNET } = require('@stacks/network'); // v7 constants
const { broadcastTransaction: broadcast } = require('@stacks/transactions');

let cachedNetwork = null;

function getNetwork() {
  if (cachedNetwork) return cachedNetwork;
  const networkEnv = process.env.STACKS_NETWORK || 'testnet';

  if (networkEnv === 'mainnet') {
    throw new Error("This application is configured for testnet/devnet only. Do not use on mainnet.");
  }

  // Use the predefined constants directly as per v7 syntax
  cachedNetwork = networkEnv === 'devnet' ? STACKS_DEVNET : STACKS_TESTNET;
  return cachedNetwork;
}

async function broadcastTransaction(signedTransaction) {
  const network = getNetwork();
  // The v7 network object has the URL at `network.client.baseUrl`
  const result = await broadcast(signedTransaction, network.client.baseUrl);

  if (result.error) {
    throw new Error(`Transaction rejected: ${result.reason} - ${result.reason_data?.message || ''}`);
  }
  return result;
}

module.exports = {
  getNetwork,
  broadcastTransaction,
};
