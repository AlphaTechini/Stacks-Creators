import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import fastifyJwt from '@fastify/jwt';
import { startEventListener } from './services/chain-event-listener.js';
import { verifyToken } from './utils/jwt.js';

// Route Imports
import userRoutes from './routes/users.js';
import creatorRoutes from './routes/creator.js';
import mintRoute from './routes/mint.route.js';
import uploadRoutes from './routes/upload.route.js';
import marketplaceRoutes from './routes/marketplace.route.js';

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
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 1, // Only allow one file per upload
  },
});

// Register JWT plugin (CRITICAL - was missing!)
fastify.register(fastifyJwt, {
  secret: process.env.JWT_SECRET || 'your-default-secret-key-for-development'
});

// --- Environment Variable Validation ---
const requiredEnvVars = [
  'JWT_SECRET',
  'STACKS_CONTRACT_ADDRESS',
  'STACKS_PRIVATE_KEY',
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET'
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    fastify.log.error(`Missing required environment variable: ${envVar}`);
    process.exit(1);
  }
}

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

// Add a health check endpoint
fastify.get('/health', async (request, reply) => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

// Start listening for on-chain events
startEventListener();

// Start the server
const start = async () => {
  try {
    fastify.log.info('Firebase client configured to use REST API.');

    await fastify.listen({ port: process.env.PORT || 8080, host: '0.0.0.0' });
    fastify.log.info(`Server listening on ${fastify.server.address().port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();