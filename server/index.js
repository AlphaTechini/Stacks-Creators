import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import { verifyToken } from './utils/jwt.js';

// Route Imports
import userRoutes from './routes/user.route.js';
import creatorRoutes from './routes/creator.js';
import mintRoute from './routes/mint.route.js';
import uploadRoutes from './routes/upload.route.js';
import marketplaceRoutes from './routes/marketplace.route.js';
import aiRoutes from './routes/ai.route.js';

// Initialize Fastify
const fastify = Fastify({
  logger: true,
});

// Register CORS plugin
fastify.register(cors, {
  origin: '*', // Allow all origins for development
});

// Register Multipart plugin for file uploads
fastify.register(multipart, {
  // We can add limits here if needed, e.g., fileSize
});

/**
 * A pre-handler hook to verify the JWT from the Authorization header.
 * This is decorated onto the Fastify instance for global use.
 * @param {import('fastify').FastifyRequest} request
 * @param {import('fastify').FastifyReply} reply
 */
async function authHook(request, reply) {
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
fastify.decorate('requireAuth', authHook);

// Register Routes
fastify.register(userRoutes);
fastify.register(creatorRoutes);
fastify.register(mintRoute);
fastify.register(marketplaceRoutes);
fastify.register(uploadRoutes);
fastify.register(aiRoutes);

// Start the server
const start = async () => {
  try {
    await fastify.listen({ port: process.env.PORT || 3000, host: '0.0.0.0' });
    fastify.log.info(`Server listening on ${fastify.server.address().port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
