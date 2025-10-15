import jwt from 'jsonwebtoken';

// Ensure JWT_SECRET is set in your environment variables for production.
const JWT_SECRET = process.env.JWT_SECRET || 'your-default-secret-key-for-development';
const JWT_EXPIRATION = '7d';

if (process.env.NODE_ENV === 'production' && JWT_SECRET === 'your-default-secret-key-for-development') {
  console.warn('WARNING: JWT_SECRET is not set. Using a default secret key is insecure in production.');
}

/**
 * Generates a JWT for a given user address.
 * @param {string} address - The user's Stacks address.
 * @returns {string} The generated JWT.
 */
export function generateToken(address) {
  const payload = {
    sub: address, // Subject of the token
    iss: 'StacksCreators', // Issuer
  };

  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRATION });
}

/**
 * Verifies a JWT and returns its payload if valid.
 * @param {string} token - The JWT to verify.
 * @returns {object | null} The decoded payload or null if verification fails.
 */
export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    console.error('JWT verification failed:', error.message);
    return null;
  }
}