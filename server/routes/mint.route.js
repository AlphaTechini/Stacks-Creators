import { mintNFT } from '../../services/nft.service.js';

const bodyJsonSchema = {
  type: 'object',
  required: ['title', 'description', 'mediaUrl'],
  properties: {
    title: { type: 'string', minLength: 1, maxLength: 100 },
    description: { type: 'string', maxLength: 1000 },
    mediaUrl: { type: 'string', format: 'uri' },
  },
};

const schema = {
  body: bodyJsonSchema,
};

/**
 * Encapsulates the routes for NFT minting.
 * @param {import('fastify').FastifyInstance} fastify
 * @param {object} options
 */
export default async function mintRoute(fastify, options) {
  /**
   * POST /api/nft/mint - Requires authentication
   * Accepts JSON body: { title, description, mediaUrl }
   */
  fastify.post('/api/nft/mint', { schema, preHandler: [fastify.requireAuth] }, async (request, reply) => {
    const { title, description, mediaUrl } = request.body;
    const creatorAddress = request.user.sub; // Address from JWT payload

    try {
      const result = await mintNFT(creatorAddress, title, description, mediaUrl);

      return reply.code(201).send({ success: true, ...result });
    } catch (error) {
      fastify.log.error({ err: error, creatorAddress }, 'NFT Minting Error');
      return reply.code(500).send({ success: false, error: error.message || 'An internal server error occurred during minting.' });
    }
  });
}