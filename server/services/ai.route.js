import { transformImage } from '../services/ai.service.js';

/**
 * Encapsulates the routes for AI-related tasks.
 * @param {import('fastify').FastifyInstance} fastify
 * @param {object} options
 */
export default async function aiRoutes(fastify, options) {
  // This route requires authentication to prevent abuse.
  fastify.post('/api/ai/generate-image', { preHandler: [fastify.requireAuth] }, async (request, reply) => {
    const data = await request.file();

    if (!data) {
      return reply.code(400).send({ error: 'No file uploaded.' });
    }

    // The prompt can be sent as a field in the multipart form.
    const prompt = data.fields.prompt?.value || 'Animate the image in a vibrant, artistic style.';

    try {
      const imageBuffer = await data.toBuffer();

      // Call the service to transform the image.
      const transformedImageBlob = await transformImage(imageBuffer, prompt);

      // Set the correct content type and send the image blob back to the client.
      reply.header('Content-Type', transformedImageBlob.type);
      return reply.send(transformedImageBlob);
    } catch (error) {
      fastify.log.error({ err: error }, 'AI Image Generation Error');
      return reply.code(500).send({ error: error.message || 'An internal server error occurred during image generation.' });
    }
  });
}