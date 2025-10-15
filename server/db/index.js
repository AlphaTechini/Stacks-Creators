import mongoose from 'mongoose';
import fp from 'fastify-plugin';

/**
 * Connects to the MongoDB database using Mongoose.
 * This is a Fastify plugin that decorates the Fastify instance
 * with the mongoose connection object.
 *
 * @param {import('fastify').FastifyInstance} fastify
 * @param {object} options
 */
async function dbConnector(fastify, options) {
  const MONGODB_URI = process.env.MONGODB_URI;

  if (!MONGODB_URI) {
    fastify.log.error('MONGODB_URI is not defined in your environment variables.');
    throw new Error('MONGODB_URI is not defined.');
  }

  try {
    await mongoose.connect(MONGODB_URI);
    fastify.log.info('MongoDB connected successfully.');
    fastify.decorate('mongoose', mongoose);
  } catch (err) {
    fastify.log.error(err, 'MongoDB connection error');
  }
}

export default fp(dbConnector);

