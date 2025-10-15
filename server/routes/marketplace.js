import { callReadOnlyFunction, cvToJSON } from '@stacks/transactions';
import { network, broadcastTransaction } from '../utils/stacksClient.js';
import { NFTItem } from '../models/NFTItem.js';

/**
 * Fastify plugin for NFT marketplace logic.
 * @param {import('fastify').FastifyInstance} fastify
 * @param {object} options
 */
export default async function marketplaceRoutes(fastify, options) {
  /**
   * Route to broadcast a pre-signed transaction for listing an NFT.
   * The frontend is responsible for creating and signing the `list-token` transaction.
   * This endpoint simply broadcasts it to the network.
   */
  fastify.post('/api/marketplace/list', { preHandler: [fastify.requireAuth] }, async (request, reply) => {
    const { signedTx } = request.body;
    if (!signedTx) {
      return reply.code(400).send({ error: 'signedTx is required.' });
    }

    try {
      const result = await broadcastTransaction(Buffer.from(signedTx, 'hex'));
      return { success: true, txId: result.txid };
    } catch (error) {
      fastify.log.error(error, 'Error broadcasting list transaction');
      return reply.code(500).send({ error: 'Failed to broadcast transaction.' });
    }
  });

  /**
   * Route to broadcast a pre-signed transaction for buying an NFT.
   * The frontend is responsible for creating and signing the `buy-token` transaction.
   */
  fastify.post('/api/marketplace/buy', { preHandler: [fastify.requireAuth] }, async (request, reply) => {
    const { signedTx } = request.body;
    if (!signedTx) {
      return reply.code(400).send({ error: 'signedTx is required.' });
    }

    try {
      const result = await broadcastTransaction(Buffer.from(signedTx, 'hex'));
      return { success: true, txId: result.txid };
    } catch (error) {
      fastify.log.error(error, 'Error broadcasting buy transaction');
      return reply.code(500).send({ error: 'Failed to broadcast transaction.' });
    }
  });

  /**
   * Route to get all NFTs from our database.
   * This is more efficient than querying the blockchain directly.
   */
  fastify.get('/api/nfts', async (request, reply) => {
    try {
      const nfts = await NFTItem.find({}).sort({ createdAt: -1 });
      return nfts;
    } catch (error) {
      fastify.log.error(error, 'Error fetching all NFTs');
      return reply.code(500).send({ error: 'Failed to fetch NFT data.' });
    }
  });

  /**
   * Route to get a single NFT's details from our database and the contract.
   */
  fastify.get('/api/nft/:tokenId', async (request, reply) => {
    try {
      const { tokenId } = request.params;
      const nftFromDB = await NFTItem.findOne({ tokenId });

      if (!nftFromDB) {
        return reply.code(404).send({ error: 'NFT not found in database.' });
      }

      // Also fetch the current on-chain listing status
      const listingResult = await callReadOnlyFunction({
        contractAddress: process.env.STACKS_CONTRACT_ADDRESS,
        contractName: process.env.MARKETPLACE_CONTRACT_NAME || 'marketplace',
        functionName: 'get-listing',
        functionArgs: [uintCV(tokenId)],
        network,
        senderAddress: process.env.STACKS_SENDER_ADDRESS,
      });

      const listing = listingResult ? cvToJSON(listingResult).value : null;

      return {
        ...nftFromDB.toObject(),
        onChainListing: listing,
      };
    } catch (error) {
      fastify.log.error(error, 'Error fetching single NFT');
      return reply.code(500).send({ error: 'Failed to fetch NFT data.' });
    }
  });
}