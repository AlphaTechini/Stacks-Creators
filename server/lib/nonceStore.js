/**
 * A simple in-memory nonce store with Time-To-Live (TTL) support.
 * NOTE: This is for demonstration purposes. In a production environment,
 * use a persistent, distributed store like Redis or a database to handle
 * multiple server instances and prevent data loss on restarts.
 */
const nonceMap = new Map();

const DEFAULT_TTL_SECONDS = 5 * 60; // 5 minutes

/**
 * Sets a nonce for a given address with a specific TTL.
 * @param {string} address - The Stacks principal address.
 * @param {string} nonce - The nonce to store.
 * @param {number} [ttlSeconds=300] - The time-to-live for the nonce in seconds.
 */
export function setNonce(address, nonce, ttlSeconds = DEFAULT_TTL_SECONDS) {
  const expiresAt = Date.now() + ttlSeconds * 1000;
  nonceMap.set(address, { nonce, expiresAt });
}

/**
 * Retrieves a valid (non-expired) nonce for a given address.
 * @param {string} address - The Stacks principal address.
 * @returns {string | null} The nonce if it exists and is not expired, otherwise null.
 */
export function getNonce(address) {
  const entry = nonceMap.get(address);
  if (!entry) {
    return null;
  }

  // Clean up expired nonces upon access
  if (Date.now() > entry.expiresAt) {
    nonceMap.delete(address);
    return null;
  }

  return entry.nonce;
}

/**
 * Clears the nonce for a given address, typically after successful use.
 * @param {string} address - The Stacks principal address.
 */
export function clearNonce(address) {
  nonceMap.delete(address);
}