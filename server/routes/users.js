import StacksEncryption from '@stacks/encryption';
const { verifyMessageSignature } = StacksEncryption;
import StacksNetwork from '@stacks/network';
const { StacksTestnet, StacksMainnet } = StacksNetwork;
import { getDB } from '../config/firebase.js';
import { generateToken } from '../utils/jwt.js';

/**
 * Fastify plugin for user authentication.
 * @param {import('fastify').FastifyInstance} fastify
 * @param {object} options
 */
export default async function userRoutes(fastify, options) {
	const db = getDB();

	/**
	 * GET /api/users/nonce - Generates a unique nonce for a user to sign.
	 * This is the first step in the authentication process.
	 */
	fastify.get('/api/users/nonce', async (request, reply) => {
		const { address } = request.query;
		if (!address) {
			return reply.code(400).send({ error: 'Wallet address is required.' });
		}
		// In a real app, you'd generate and store a unique, single-use nonce.
		// For this example, we'll use a timestamp-based nonce.
		const nonce = `Sign this message to log in to Stacks Creators. Nonce: ${Date.now()}`;
		return { nonce };
	});

	/**
	 * POST /api/users/login - Verifies a signed nonce and returns a JWT.
	 */
	fastify.post('/api/users/login', async (request, reply) => {
		const { address, publicKey, signature, nonce } = request.body;

		if (!address || !publicKey || !signature || !nonce) {
			return reply.code(400).send({ error: 'Missing required login fields.' });
		}

		try {
			const network = process.env.STACKS_NETWORK === 'mainnet' ? new StacksMainnet() : new StacksTestnet();
			
			const verified = verifyMessageSignature({
				message: nonce,
				publicKey,
				signature,
				network,
			});

			if (!verified) {
				return reply.code(403).send({ error: 'Invalid signature.' });
			}

			// Signature is valid, generate a JWT.
			const token = generateToken(address);

			// Optional: Check if user exists in Firestore
			const userRef = db.collection('users').doc(address);
			const docSnap = await userRef.get();

			return { token, isNewUser: !docSnap.exists };
		} catch (error) {
			fastify.log.error(error, 'Error during login verification');
			return reply.code(500).send({ error: 'An error occurred during login.' });
		}
	});
}