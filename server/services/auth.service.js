import { createRequire } from 'module';
import { generateToken, verifyToken } from '../utils/jwt.js';
import { getNetwork } from '../utils/stacksClient.cjs';

const require = createRequire(import.meta.url);
const stacks = require('@stacks/transactions');

const {
  verifyMessageSignatureRsv,
  getAddressFromPublicKey
} = stacks;

/**
 * Generates a JWT for a given Stacks address.
 */
export function generateAuthToken(address) {
  return generateToken({ sub: address });
}

/**
 * Verifies a signed message against a public key and address.
 */
export function verifyAuthRequest(signature, message, publicKey) {
  const network = getNetwork();
  return verifyMessageSignatureRsv({
    signature,
    message,
    publicKey,
    network,
  });
}
