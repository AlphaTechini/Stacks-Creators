import { getNFTsByOwner } from '../services/nft.service.js';

/**
 * Fastify plugin for NFT-related routes.
 * @param {import('fastify').FastifyInstance} fastify
 * @param {object} options
 */
export default async function nftRoutes(fastify, options) {
  /**
   * GET /api/nfts/my-nfts - Fetches all NFTs owned by the authenticated user.
   */
  fastify.get('/api/nfts/my-nfts', { preHandler: [fastify.requireAuth] }, async (request, reply) => {
    const ownerAddress = request.user.sub; // Get address from JWT

    try {
      const nfts = await getNFTsByOwner(ownerAddress);
      return nfts;
    } catch (error) {
      fastify.log.error(error, 'Error fetching user NFTs');
      return reply.code(500).send({ error: 'Failed to fetch your NFTs.' });
    }
  });
}