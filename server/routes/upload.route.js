import { v2 as cloudinary } from 'cloudinary';

// This function can be shared or defined here. For simplicity, it's here.
function uploadStreamToCloudinary(buffer, options) {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(options, (error, result) => {
      if (error) return reject(new Error(`Cloudinary upload failed: ${error.message}`));
      resolve(result);
    });
    uploadStream.end(buffer);
  });
}

/**
 * Fastify plugin for handling file uploads.
 * @param {import('fastify').FastifyInstance} fastify
 * @param {object} options
 */
export default async function uploadRoutes(fastify, options) {
  /**
   * POST /api/upload - Requires authentication
   * Accepts a file and uploads it to Cloudinary.
   */
  fastify.post('/api/upload', { preHandler: [fastify.requireAuth] }, async (request, reply) => {
    const data = await request.file();
    if (!data) {
      return reply.code(400).send({ error: 'File is required for upload.' });
    }

    try {
      const buffer = await data.toBuffer();
      const result = await uploadStreamToCloudinary(buffer, { resource_type: 'auto', folder: 'nfts/media' });
      return reply.send(result);
    } catch (error) {
      fastify.log.error({ err: error }, 'Cloudinary Upload Error');
      return reply.code(500).send({ error: 'Failed to upload file.' });
    }
  });
}