import { randomBytes } from 'crypto';
import { getNonce, setNonce, clearNonce } from '../lib/nonceStore.js';
import { verifyStacksSignature } from '../lib/stacksVerify.js';
import { generateToken, verifyToken } from '../utils/jwt.js';

/**
 * Fastify plugin for handling Stacks wallet-based authentication.
 * @param {import('fastify').FastifyInstance} fastify
 * @param {object} options
 */
export default async function authRoutes(fastify, options) {

  /**
   * Route to get a challenge nonce for a user to sign.
   * This is the first step of the sign-in process.
   * 
   * Example:
   *   curl "http://localhost:3000/api/users/nonce?address=SP2J6...VQFKE"
   * 
   * Response:
   *   { "nonce": "a1b2c3d4..." }
   */
  fastify.get('/api/users/nonce', async (request, reply) => {
    const { address } = request.query;

    if (!address) {
      return reply.code(400).send({ error: 'Query parameter "address" is required.' });
    }

    // Generate a cryptographically-secure random nonce
    const nonce = randomBytes(16).toString('hex');
    setNonce(address, nonce); // Stores the nonce with a default TTL

    return { nonce };
  });

  /**
   * Route to log in a user by verifying their signed nonce.
   * On success, it returns a JWT for session management.
   * 
   * Payload: { address, publicKey, signature, nonce }
   * 
   * Response on Success:
   *   { "token": "ey...", "address": "SP2J6...VQFKE" }
   */
  fastify.post('/api/users/login', async (request, reply) => {
    const { address, publicKey, signature, nonce } = request.body;

    if (!address || !publicKey || !signature || !nonce) {
      return reply.code(400).send({ error: 'Missing required fields in payload: address, publicKey, signature, nonce.' });
    }

    const storedNonce = getNonce(address);

    if (!storedNonce) {
      return reply.code(401).send({ error: 'Nonce not found or has expired. Please request a new one.' });
    }

    if (storedNonce !== nonce) {
      return reply.code(401).send({ error: 'Invalid nonce.' });
    }

    // The message that was signed on the client is the nonce itself.
    const isSignatureValid = verifyStacksSignature({
      message: nonce,
      signature,
      publicKey,
      address,
      network: process.env.STACKS_NETWORK || 'testnet',
    });

    if (!isSignatureValid) {
      return reply.code(401).send({ error: 'Signature verification failed.' });
    }

    // Nonce is valid and has been used, clear it to prevent replay attacks.
    clearNonce(address);

    const token = generateToken(address);
    return { token, address };
  });

  /**
   * Protected route to get the user's profile (i.e., their address).
   * Requires "Authorization: Bearer <token>" header.
   * 
   * Response on Success:
   *   { "address": "SP2J6...VQFKE" }
   */
  fastify.get('/api/users/profile', {
    preHandler: [async (request, reply) => {
      const authHeader = request.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return reply.code(401).send({ error: 'Authorization header is missing or invalid.' });
      }
      const token = authHeader.substring(7);
      const payload = verifyToken(token);
      if (!payload) {
        return reply.code(401).send({ error: 'Invalid or expired token.' });
      }
      request.user = payload; // Attach user payload to the request
    }],
  }, async (request, reply) => {
    // The user's address is the 'sub' (subject) of the JWT payload.
    return { address: request.user.sub };
  });
}
