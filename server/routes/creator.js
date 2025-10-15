import { UserProfile } from '../models/UserProfile.js';
import { verifyToken } from '../utils/jwt.js';

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
 * Fastify plugin for creator profile management.
 * @param {import('fastify').FastifyInstance} fastify
 * @param {object} options
 */
export default async function creatorRoutes(fastify, options) {
  /**
   * Route to register or update a creator's profile.
   * Creates a profile if one doesn't exist for the address, otherwise updates it.
   * Payload: { username, bio, avatar, socials: { twitter, github } }
   */
  fastify.post('/api/creator/register', { preHandler: [requireAuth] }, async (request, reply) => {
    const address = request.user.sub;
    const { username, bio, avatar, socials } = request.body;

    try {
      const profile = await UserProfile.findOneAndUpdate(
        { address },
        { address, username, bio, avatar, socials },
        { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
      );
      return profile;
    } catch (error) {
      if (error.code === 11000) {
        // Duplicate key error (likely for username)
        return reply.code(409).send({ error: 'Username is already taken.' });
      }
      fastify.log.error(error, 'Error registering creator profile');
      return reply.code(500).send({ error: 'An error occurred while saving the profile.' });
    }
  });

  /**
   * Route to get the currently authenticated user's profile.
   */
  fastify.get('/api/creator/me', { preHandler: [requireAuth] }, async (request, reply) => {
    const address = request.user.sub;
    const profile = await UserProfile.findOne({ address });

    if (!profile) {
      return reply.code(404).send({ error: 'Profile not found.' });
    }
    return profile;
  });

  /**
   * Route to get a public creator profile by their wallet address.
   */
  fastify.get('/api/creator/:address', async (request, reply) => {
    const { address } = request.params;
    const profile = await UserProfile.findOne({ address });

    if (!profile) {
      return reply.code(404).send({ error: 'Profile not found for the given address.' });
    }
    return profile;
  });

  /**
   * Route to partially update the authenticated user's profile.
   * Payload: { bio, avatar, socials }
   */
  fastify.patch('/api/creator/update', { preHandler: [requireAuth] }, async (request, reply) => {
    const address = request.user.sub;
    const updates = {};

    // Only include fields that are present in the request body
    if (request.body.bio !== undefined) updates.bio = request.body.bio;
    if (request.body.avatar !== undefined) updates.avatar = request.body.avatar;
    if (request.body.socials !== undefined) {
      // Allow partial updates to socials
      updates['socials.twitter'] = request.body.socials.twitter;
      updates['socials.github'] = request.body.socials.github;
    }

    if (Object.keys(updates).length === 0) {
      return reply.code(400).send({ error: 'No fields to update were provided.' });
    }

    try {
      const updatedProfile = await UserProfile.findOneAndUpdate(
        { address },
        { $set: updates },
        { new: true }
      );

      if (!updatedProfile) {
        return reply.code(404).send({ error: 'Profile not found to update.' });
      }

      return updatedProfile;
    } catch (error) {
      fastify.log.error(error, 'Error updating creator profile');
      return reply.code(500).send({ error: 'An error occurred while updating the profile.' });
    }
  });
}