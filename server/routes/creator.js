import { UserProfile } from '../models/UserProfile.js';
import { createHelia } from 'helia';
import { unixfs } from '@helia/unixfs';
import { CID } from 'multiformats/cid';

// --- Helia (IPFS) Initialization ---
const helia = await createHelia();
const fs = unixfs(helia);

// Helper to get content from IPFS
async function getFromIPFS(cidString) {
  let data = '';
  for await (const chunk of fs.cat(CID.parse(cidString))) {
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
   * POST /api/creator/sync - Creates or updates a creator's profile.
   * Creates a profile if one doesn't exist, otherwise updates it.
   * The wallet address is the primary key, derived from the auth token.
   *
   * Input: { username?, bio?, avatar?, socials?, content? }
   *   - `username`: An optional display name.
   *   - `bio`, `avatar`, `socials`: Other profile fields to store in the database.
   *   - `content`: Larger content (e.g., a JSON object) to store on IPFS.
   *
   * Returns: The updated user profile document.
   */
  fastify.post('/api/creator/sync', { preHandler: [fastify.requireAuth] }, async (request, reply) => {
    const { username, bio, avatar, socials, content } = request.body;
    const walletAddress = request.user.sub;

    try {
      const updates = {};
      if (username !== undefined) updates.username = username;
      if (bio !== undefined) updates.bio = bio;
      if (avatar !== undefined) updates.avatar = avatar;
      if (socials) {
        // Use dot notation for robust partial updates of the nested socials object.
        Object.keys(socials).forEach(key => {
          updates[`socials.${key}`] = socials[key];
        });
      }

      // If new `content` is provided, upload it to IPFS and add the CID to the updates.
      if (content) {
        const contentBuffer = Buffer.from(typeof content === 'object' ? JSON.stringify(content) : content);
        const { cid } = await fs.addBytes(contentBuffer);
        updates.cid = cid.toString();
      }

      const profile = await UserProfile.findOneAndUpdate(
        { address: walletAddress },
        { $set: updates },
        { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
      );

      return profile;
    } catch (error) {
      if (error.code === 11000) {
        return reply.code(409).send({ error: 'Username is already taken.' });
      }
      fastify.log.error(error, 'Error syncing creator profile');
      return reply.code(500).send({ error: 'An error occurred during profile sync.' });
    }
  });

  /**
   * POST /api/creator/fetch - Fetches a user's profile and their IPFS content.
   *
   * Input: { walletAddress: string }
   * Returns: The user profile document from DB, with an added `content` field from IPFS.
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

    const profile = user.toObject();
    let ipfsContent = null;

    if (profile.cid) {
      ipfsContent = await getFromIPFS(profile.cid);
    }
    return { ...profile, content: ipfsContent };
  });
}