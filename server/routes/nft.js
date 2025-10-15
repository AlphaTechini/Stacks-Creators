import { v2 as cloudinary } from 'cloudinary';
import { verifyToken } from '../utils/jwt.js';
import { NFTItem } from '../models/NFTItem.js';

// --- Cloudinary Configuration ---
// Ensure these are set in your .env file
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * A pre-handler hook to verify the JWT from the Authorization header.
 * @param {import('fastify').FastifyRequest} request
 * @param {import('fastify').FastifyReply} reply
 */
async function requireAuth(request, reply) {
  const authHeader = request.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return reply.code(401).send({ error: 'Authorization header is missing or invalid.' });
  }
  const token = authHeader.substring(7);
  const payload = verifyToken(token);
  if (!payload) {
    return reply.code(401).send({ error: 'Invalid or expired token.' });
  }
  request.user = payload; // Attach user payload (which includes the address as `sub`)
}

/**
 * Uploads a file buffer to Cloudinary.
 * @param {Buffer} buffer The image buffer to upload.
 * @returns {Promise<string>} The secure URL of the uploaded image.
 */
function uploadToCloudinary(buffer) {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { resource_type: 'image' },
      (error, result) => {
        if (error) {
          return reject(new Error('Cloudinary upload failed.'));
        }
        resolve(result.secure_url);
      }
    );
    uploadStream.end(buffer);
  });
}

/**
 * Fastify plugin for NFT minting and marketplace logic.
 * @param {import('fastify').FastifyInstance} fastify
 * @param {object} options
 */
export default async function nftRoutes(fastify, options) {
  /**
   * Route to mint an NFT. This involves several steps:
   * 1. Authenticate the user via JWT.
   * 2. Accept an image upload (multipart/form-data).
   * 3. Upload the original image to Cloudinary.
   * 4. (Placeholder) Transform the image using an AI model.
   * 5. Upload the AI-generated image to Cloudinary.
   * 6. Save all metadata to the NFTItem collection in MongoDB.
   *
   * The actual on-chain `mint` transaction is signed on the client-side.
   * This endpoint is called *after* the transaction is broadcast to save its metadata.
   *
   * Payload (multipart/form-data):
   * - image: The file to upload.
   * - price: The listing price in STX.
   * - tokenId: The token ID from the mint transaction.
   * - txId: The transaction ID from the mint.
   */
  fastify.post('/api/nft/mint', { preHandler: [requireAuth] }, async (request, reply) => {
    const data = await request.file();
    if (!data) {
      return reply.code(400).send({ error: 'Image file is required.' });
    }

    const { price, tokenId, txId } = data.fields;
    if (!price || !tokenId || !txId) {
      return reply.code(400).send({ error: 'Missing required fields: price, tokenId, txId.' });
    }

    try {
      const creatorAddress = request.user.sub;
      const buffer = await data.toBuffer();

      // 1. Upload original image
      const imageUrl = await uploadToCloudinary(buffer);

      // 2. AI Transformation (Placeholder)
      // In a real implementation, you would send the buffer to your AI service.
      // For now, we'll just re-upload the same image as a placeholder for the AI version.
      const aiImageUrl = await uploadToCloudinary(buffer);

      // 3. Save metadata to MongoDB
      const newNftItem = new NFTItem({
        tokenId: tokenId.value,
        creatorAddress,
        imageUrl,
        aiImageUrl,
        price: Number(price.value),
        listed: true, // Assume it's listed for sale immediately after minting
        txId: txId.value,
      });

      await newNftItem.save();

      // 4. Return the complete metadata
      reply.code(201).send({
        message: 'NFT minted and listed successfully.',
        nft: newNftItem,
      });
    } catch (error) {
      fastify.log.error(error, 'Error during NFT mint process');
      if (error.code === 11000) {
        return reply.code(409).send({ error: 'This token ID has already been registered.' });
      }
      return reply.code(500).send({ error: 'An internal error occurred.' });
    }
  });

  /**
   * Route to get all listed NFTs for the marketplace.
   */
  fastify.get('/api/nft/marketplace', async (request, reply) => {
    try {
      const listedNfts = await NFTItem.find({ listed: true }).sort({ createdAt: -1 });
      return listedNfts;
    } catch (error) {
      fastify.log.error(error, 'Error fetching marketplace NFTs');
      return reply.code(500).send({ error: 'Failed to fetch marketplace data.' });
    }
  });

  /**
   * Route to get a single NFT by its token ID.
   */
  fastify.get('/api/nft/:tokenId', async (request, reply) => {
    try {
      const { tokenId } = request.params;
      const nft = await NFTItem.findOne({ tokenId });
      if (!nft) {
        return reply.code(404).send({ error: 'NFT not found.' });
      }
      return nft;
    } catch (error) {
      fastify.log.error(error, 'Error fetching single NFT');
      return reply.code(500).send({ error: 'Failed to fetch NFT data.' });
    }
  });
}
