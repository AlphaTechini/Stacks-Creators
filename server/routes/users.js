import { generateAuthToken, verifyAuthRequest } from '../services/auth.service.js';
import { getDB } from '../config/firebase.js';

async function userRoutes(fastify, opts) {
  // Endpoint to get a nonce for a user to sign
  fastify.get('/api/users/nonce', async (request, reply) => {
    const { address } = request.query;
    if (!address) return reply.code(400).send({ error: 'Missing wallet address' });

    const nonce = Math.random().toString(36).substring(2);
    const db = getDB();
    await db.collection('users').doc(address).set({ nonce }, { merge: true });

    return reply.send({ nonce });
  });

  // Endpoint to log in by verifying a signed nonce
  fastify.post('/api/users/login', async (request, reply) => {
    const { address, signature, publicKey, nonce } = request.body;
    if (!address || !signature || !publicKey || !nonce) {
      return reply.code(400).send({ error: 'Missing required login fields.' });
    }

    // In a real app, you'd fetch the user's nonce from the DB and verify it.
    // For this example, we'll assume the nonce is valid if the signature is.
    const isValid = verifyAuthRequest(signature, nonce, publicKey);
    if (!isValid) {
      return reply.code(401).send({ error: 'Invalid signature.' });
    }

    const token = generateAuthToken(address);
    return reply.send({ success: true, token });
  });
}

export default userRoutes;
