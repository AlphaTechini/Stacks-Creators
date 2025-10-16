import { mintNFT } from '../services/nft.service.js';
import { transformImage } from '../services/ai.service.js';

/**
 * Encapsulates the routes for NFT minting.
 * @param {import('fastify').FastifyInstance} fastify
 * @param {object} options
 */
export default async function mintRoute(fastify, options) {
  /**
   * POST /api/nft/generate-and-mint - Requires authentication
   * This is a multi-step, single-endpoint process for creating an NFT.
   * 1. Accepts an image file and metadata (multipart/form-data).
   * 2. Transforms the image using the AI service.
   * 3. Mints the NFT with the new AI image.
   *
   * Multipart Fields: { file, title, description }
   */
  fastify.post('/api/nft/generate-and-mint', { preHandler: [fastify.requireAuth] }, async (request, reply) => {
    const data = await request.file();
    if (!data) {
      return reply.code(400).send({ success: false, error: 'Image file is required.' });
    }

    const title = data.fields.title?.value;
    const description = data.fields.description?.value;
    if (!title) {
      return reply.code(400).send({ success: false, error: 'Title is a required field.' });
    }

    const creatorAddress = request.user.sub; // Address from JWT payload

    try {
      const originalImageBuffer = await data.toBuffer();
      const aiImageBlob = await transformImage(originalImageBuffer, description || title);
      const aiImageBuffer = Buffer.from(await aiImageBlob.arrayBuffer());
      const result = await mintNFT(creatorAddress, title, description, aiImageBuffer);
      return reply.code(201).send({ success: true, ...result });
    } catch (error) {
      fastify.log.error({ err: error, creatorAddress }, 'NFT Minting Error');
      return reply.code(500).send({ success: false, error: error.message || 'An internal server error occurred during minting.' });
    }
  });
}