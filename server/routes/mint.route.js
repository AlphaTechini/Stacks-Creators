import { mintNFT } from '../../services/nft.service.js';

/**
 * Encapsulates the routes for NFT minting.
 * @param {import('fastify').FastifyInstance} fastify
 * @param {object} options
 */
export default async function mintRoute(fastify, options) {
  /**
   * POST /api/nft/mint
   * Accepts multipart/form-data with fields: creatorId, title, description, and a file.
   */
  fastify.post('/api/nft/mint', async (request, reply) => {
    const data = await request.file();
    if (!data) {
      return reply.code(400).send({ success: false, error: 'File upload is required.' });
    }

    const { creatorId, title, description } = data.fields;

    if (!creatorId?.value || !title?.value || !description?.value) {
      return reply.code(400).send({ success: false, error: 'Missing required fields: creatorId, title, description.' });
    }

    try {
      const fileBuffer = await data.toBuffer();
      const result = await mintNFT(creatorId.value, title.value, description.value, fileBuffer);

      return reply.code(201).send({ success: true, ...result });
    } catch (error) {
      fastify.log.error(error, 'NFT Minting Error');
      return reply.code(500).send({ success: false, error: error.message || 'An internal server error occurred during minting.' });
    }
  });
}