import { getDB } from '../config/firebase.js';
import * as stacksClient from '../utils/stacksClient.cjs';
const { broadcastTransaction } = stacksClient;
import StacksTransactions from '@stacks/transactions';
const { deserializeTransaction } = StacksTransactions;

/**
 * Fastify plugin for NFT marketplace interactions.
 * @param {import('fastify').FastifyInstance} fastify
 * @param {object} options
 */
export default async function marketplaceRoutes(fastify, options) {
  const db = getDB();
  
  /**
   * GET /api/nfts - Fetches all NFTs from the database.
   */
  fastify.get('/api/nfts', async (request, reply) => {
    try {
      const nftsCol = db.collection('nfts');
      const { docs, empty } = await nftsCol.get();
      
      if (empty) {
        return [];
      }
      
      const nftList = docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      }));
      
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
      const nftRef = db.collection('nfts').doc(tokenId);
      const nftDoc = await nftRef.get();

      if (!nftDoc.exists) {
        return reply.code(404).send({ error: 'NFT not found.' });
      }
      
      return { 
        id: nftDoc.id, 
        ...nftDoc.data() 
      };
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
    
    if (!signedTx) {
      return reply.code(400).send({ error: 'signedTx is required.' });
    }
    
    try {
      const tx = deserializeTransaction(Buffer.from(signedTx, 'hex'));
      const tokenId = tx.payload.functionArgs[0].value.toString();

      const broadcastResult = await broadcastTransaction(tx);
      
      // Update database
      const nftRef = db.collection('nfts').doc(tokenId);
      await nftRef.update({ listed: true });

      return { success: true, txId: broadcastResult.txid };
    } catch (error) {
      fastify.log.error(error, 'Error broadcasting list transaction');
      return reply.code(500).send({ 
        error: error.message || 'Failed to list NFT.' 
      });
    }
  });

  /**
   * POST /api/marketplace/buy - Broadcasts a buy transaction.
   * The chain-event-listener will handle updating the owner and listed status in the DB.
   */
  fastify.post('/api/marketplace/buy', { preHandler: [fastify.requireAuth] }, async (request, reply) => {
    const { signedTx } = request.body;
    
    if (!signedTx) {
      return reply.code(400).send({ error: 'signedTx is required.' });
    }
    
    try {
      const tx = deserializeTransaction(Buffer.from(signedTx, 'hex'));
      const broadcastResult = await broadcastTransaction(tx);
      
      // No DB update needed here; the chain listener will handle it upon confirmation.
      return { success: true, txId: broadcastResult.txid };
    } catch (error) {
      fastify.log.error(error, 'Error broadcasting buy transaction');
      return reply.code(500).send({ 
        error: error.message || 'Failed to buy NFT.' 
      });
    }
  });
}