import { db, doc, getDoc, getDocs, collection, updateDoc } from '../config/firebase.js';
import { broadcastTransaction } from '../utils/stacksClient.js';
import { Transaction, deserializeTransaction } from '@stacks/transactions';

/**
 * Fastify plugin for NFT marketplace interactions.
 * @param {import('fastify').FastifyInstance} fastify
 * @param {object} options
 */
export default async function marketplaceRoutes(fastify, options) {
  /**
   * GET /api/nfts - Fetches all NFTs from the database.
   */
  fastify.get('/api/nfts', async (request, reply) => {
    try {
      const nftsCol = collection(db, 'nfts');
      const nftSnapshot = await getDocs(nftsCol);
      const nftList = nftSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      return nftList;
    } catch (error) {
      fastify.log.error(error, 'Error fetching all NFTs');
      return reply.code(500).send({ error: 'Failed to fetch NFTs.' });
    }
  });

  /**
   * GET /api/nft/:tokenId - Fetches a single NFT by its token ID.
   */
  fastify.get('/api/nft/:tokenId', async (request, reply) => {
    try {
      const { tokenId } = request.params;
      const nftRef = doc(db, 'nfts', tokenId);
      const nftDoc = await getDoc(nftRef);

      if (!nftDoc.exists()) {
        return reply.code(404).send({ error: 'NFT not found.' });
      }
      return { id: nftDoc.id, ...nftDoc.data() };
    } catch (error) {
      fastify.log.error(error, 'Error fetching single NFT');
      return reply.code(500).send({ error: 'Failed to fetch NFT data.' });
    }
  });

  /**
   * POST /api/marketplace/list - Broadcasts a list transaction and updates DB.
   */
  fastify.post('/api/marketplace/list', { preHandler: [fastify.requireAuth] }, async (request, reply) => {
    const { signedTx } = request.body;
    const tx = deserializeTransaction(Buffer.from(signedTx, 'hex'));
    const tokenId = tx.payload.functionArgs[0].value.toString();

    try {
      const broadcastResult = await broadcastTransaction(tx);
      const nftRef = doc(db, 'nfts', tokenId);
      await updateDoc(nftRef, { listed: true });

      return { success: true, txId: broadcastResult.txid };
    } catch (error) {
      fastify.log.error(error, 'Error broadcasting list transaction');
      return reply.code(500).send({ error: 'Failed to list NFT.' });
    }
  });

  /**
   * POST /api/marketplace/buy - Broadcasts a buy transaction.
   * The chain-event-listener will handle updating the owner and listed status in the DB.
   */
  fastify.post('/api/marketplace/buy', { preHandler: [fastify.requireAuth] }, async (request, reply) => {
    const { signedTx } = request.body;
    const tx = deserializeTransaction(Buffer.from(signedTx, 'hex'));

    try {
      const broadcastResult = await broadcastTransaction(tx);
      // No DB update needed here; the chain listener will handle it upon confirmation.
      return { success: true, txId: broadcastResult.txid };
    } catch (error) {
      fastify.log.error(error, 'Error broadcasting buy transaction');
      return reply.code(500).send({ error: 'Failed to buy NFT.' });
    }
  });
}