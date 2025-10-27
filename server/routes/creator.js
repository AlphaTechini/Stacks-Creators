import { getDB } from '../config/firebase.js';
import { createHelia } from 'helia';
import { unixfs } from '@helia/unixfs';
import { CID } from 'multiformats/cid';

// --- Helia (IPFS) Lazy Initialization ---
let heliaFs = null;

/**
 * Initializes the Helia IPFS node on first use and returns the unixfs instance.
 * This prevents the node from starting automatically with the server.
 */
async function getFs() {
  if (!heliaFs) {
    console.log('[IPFS] Initializing Helia node for the first time...');
    const helia = await createHelia();
    heliaFs = unixfs(helia);
    console.log('[IPFS] Helia node initialized successfully.');
  }
  return heliaFs;
}

// Helper to get content from IPFS
async function getFromIPFS(cid) {
  const fs = await getFs();
  const decoder = new TextDecoder();
  let content = '';
  for await (const chunk of fs.cat(CID.parse(cid))) {
    content += decoder.decode(chunk, { stream: true });
  }
  return content;
}

/**
 * Fastify plugin for creator profile management.
 * @param {import('fastify').FastifyInstance} fastify
 * @param {object} options
 */
export default async function creatorRoutes(fastify, options) {
  /**
   * POST /api/creator/sync - Syncs user profile data. Content goes to IPFS, metadata to Firestore.
   * Creates a profile if one doesn't exist, otherwise updates it.
   * The wallet address is the primary key, derived from the auth token.
   *
   * @body {{ content?: object, username?: string }}
   *   - `content`: The JSON object for the user's profile. Can contain any data, including a `socials` object like:
   *     `{ "socials": { "twitter": "...", "instagram": "...", "facebook": "...", "tiktok": "...", "youtube": "..." } }`
   *   - `username`: An optional display name.
   *
   * @returns {Promise<{ walletAddress: string, cid: string|null, username: string|null }>} The updated user profile metadata.
   */
  fastify.post('/api/creator/sync', { preHandler: [fastify.requireAuth] }, async (request, reply) => {
    const { content, username } = request.body;
    const walletAddress = request.user.sub;

    const db = getDB();
    try {
      const fs = await getFs(); // Ensure Helia is running
      const userRef = db.collection('users').doc(walletAddress);
      const docSnap = await userRef.get();
      const user = docSnap.exists ? docSnap.data() : null;
      let newCid = user?.cid || null;

      // If new content is provided, upload it to IPFS to get a new CID.
      if (content) {
        const contentBuffer = Buffer.from(typeof content === 'object' ? JSON.stringify(content) : content);
        const ipfsCid = await fs.addBytes(contentBuffer);
        newCid = ipfsCid.toString();
      }

      // Prepare the metadata for Firestore.
      const profileData = {
        walletAddress: walletAddress,
        username: username !== undefined ? username : (user?.username || null),
        cid: newCid
      };

      // Use `set` with `merge: true` to create or update the document in Firestore.
      await userRef.set(profileData, { merge: true });

      const response = {
        walletAddress: profileData.walletAddress,
        username: profileData.username,
        cid: profileData.cid,
      };

      return reply.code(user ? 200 : 201).send(response);
    } catch (error) {
      fastify.log.error(error, 'Error syncing creator profile');
      return reply.code(500).send({ error: 'An error occurred during profile sync.' });
    }
  });

  /**
   * POST /api/creator/fetch - Fetches user profile metadata from Firestore and content from IPFS.
   *
   * Input: { walletAddress: string }
   * @returns {Promise<{ walletAddress: string, username: string|null, content: object|string|null }>} The user profile.
   */
  fastify.post('/api/creator/fetch', async (request, reply) => {
    const { walletAddress } = request.body;
    if (!walletAddress || typeof walletAddress !== 'string' || walletAddress.trim() === '') {
      return reply.code(400).send({ error: 'walletAddress is required.' });
    }

    const db = getDB();
    const userRef = db.collection('users').doc(walletAddress);
    const docSnap = await userRef.get();

    if (!docSnap.exists) {
      return reply.code(404).send({ error: 'User not found.' });
    }

    const user = docSnap.data();

    if (!user.cid) {
      // User exists but has no IPFS content yet.
      return { walletAddress, username: user.username, content: null };
    }

    try {
      const content = await getFromIPFS(user.cid);
      // The content from IPFS is a JSON string, so we parse it.
      return { walletAddress, username: user.username, content: JSON.parse(content) };
    } catch (error) {
      fastify.log.error(error, 'Error fetching content from IPFS');
      // Return profile without content if IPFS fails
      return { walletAddress, username: user.username, content: null };
    }
  });
}