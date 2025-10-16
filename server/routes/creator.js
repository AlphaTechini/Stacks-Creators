import { UserProfile } from '../models/UserProfile.js';
import { verifyToken } from '../utils/jwt.js';
import { createHelia } from 'helia';
import { unixfs } from '@helia/unixfs';
import { CID } from 'multiformats/cid';

// --- Helia (IPFS) Initialization ---
const helia = await createHelia();
const fs = unixfs(helia);

// Helper to get content from IPFS
async function getFromIPFS(cid) {
  let data = '';
  for await (const chunk of fs.cat(CID.parse(cid))) {
    data += new TextDecoder().decode(chunk);
  }
  return data;
}

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
   * POST /api/creator/sync - Syncs user profile data to IPFS.
   * Creates a profile if one doesn't exist, otherwise updates it.
   * The wallet address is the primary key, derived from the auth token.
   *
   * Input: { content?: string | object, username?: string }
   *   - `content`: The JSON string or object for the user's profile.
   *   - `username`: An optional display name.
   *
   * Returns: { walletAddress, cid, username }
   */
  fastify.post('/api/creator/sync', { preHandler: [requireAuth] }, async (request, reply) => {
    const { content, username } = request.body;
    const walletAddress = request.user.sub;

    try {
      const user = await UserProfile.findOne({ address: walletAddress });
      let newCid = user ? user.cid : null;

      // If new content is provided, upload it to IPFS to get a new CID.
      if (content) {
        const contentBuffer = Buffer.from(typeof content === 'object' ? JSON.stringify(content) : content);
        const { cid } = await fs.addBytes(contentBuffer);
        newCid = cid.toString();
      }

      if (!user) {
        // Create a new user record if one doesn't exist.
        const newUser = await UserProfile.create({
          address: walletAddress,
          username: username || null,
          cid: newCid,
        });
        return reply.code(201).send({
          walletAddress: newUser.address,
          cid: newUser.cid,
          username: newUser.username,
        });
      } else {
        // Update existing user record.
        user.cid = newCid ?? user.cid; // Keep old CID if no new content
        user.username = username || user.username; // Update username if provided
        await user.save();

        return reply.send({
          walletAddress: user.address,
          cid: user.cid,
          username: user.username,
        });
      }
    } catch (error) {
      fastify.log.error(error, 'Error syncing creator profile');
      return reply.code(500).send({ error: 'An error occurred during profile sync.' });
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
  fastify.get('/api/creator/:username', async (request, reply) => {
    const { username } = request.params;
    const profile = await UserProfile.findOne({ username });

    if (!profile) {
      return reply.code(404).send({ error: 'Profile not found for the given username.' });
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
      updates['socials.instagram'] = request.body.socials.instagram;
      updates['socials.facebook'] = request.body.socials.facebook;
      updates['socials.tiktok'] = request.body.socials.tiktok;
      updates['socials.youtube'] = request.body.socials.youtube;
    }

    if (Object.keys(updates).length === 0) {
      return reply.code(400).send({ error: 'No fields to update were provided.' });
    }

    const user = await UserProfile.findOne({ address: walletAddress });
    if (!user) {
      return reply.code(404).send({ error: 'User not found.' });
    }

    if (!user.cid) {
      return { walletAddress: user.address, username: user.username, content: null };
    }
    const content = await getFromIPFS(user.cid);
    return { walletAddress: user.address, username: user.username, content };
  });
}
