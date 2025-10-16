import { UserProfile } from '../models/UserProfile.js';
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
   * Input: { content?: string | object, username?: string, socials?: { twitter?: string, github?: string, website?: string } }
   *   - `content`: The JSON string or object for the user's profile.
   *   - `username`: An optional display name.
   *   - `socials`: An object with social media links.
   *
   * Returns: { walletAddress, cid, username, socials }
   */
  fastify.post('/api/creator/sync', { preHandler: [fastify.requireAuth] }, async (request, reply) => {
    const { content, username, socials } = request.body;
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
          socials: socials || {},
        });
        return reply.code(201).send({
          walletAddress: newUser.address,
          cid: newUser.cid,
          username: newUser.username,
          socials: newUser.socials,
        });
      } else {
        // Update existing user record.
        user.cid = newCid ?? user.cid; // Keep old CID if no new content
        user.username = username || user.username; // Update username if provided
        if (socials) user.socials = { ...user.socials, ...socials }; // Merge new social links
        await user.save();

        return reply.send({
          walletAddress: user.address,
          cid: user.cid,
          username: user.username,
          socials: user.socials,
        });
      }
    } catch (error) {
      fastify.log.error(error, 'Error syncing creator profile');
      return reply.code(500).send({ error: 'An error occurred during profile sync.' });
    }
  });

  /**
   * POST /api/creator/fetch - Fetches user profile content from IPFS.
   *
   * Input: { walletAddress: string }
   * Returns: { walletAddress, username, socials, content }
   */
  fastify.post('/api/creator/fetch', async (request, reply) => {
    const { walletAddress } = request.body;
    if (!walletAddress) {
      return reply.code(400).send({ error: 'walletAddress is required.' });
    }

    const user = await UserProfile.findOne({ address: walletAddress });
    if (!user) {
      return reply.code(404).send({ error: 'User not found.' });
    }

    if (!user.cid) {
      return { walletAddress: user.address, username: user.username, socials: user.socials, content: null };
    }
    const content = await getFromIPFS(user.cid);
    return { walletAddress: user.address, username: user.username, socials: user.socials, content };
  });
}