const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

/**
 * A helper function for making authenticated API requests.
 * @param {string} endpoint - The API endpoint to call.
 * @param {string} method - The HTTP method (GET, POST, etc.).
 * @param {string} token - The user's JWT.
 * @param {object} [body] - The request body for POST/PUT requests.
 * @returns {Promise<any>} The JSON response from the server.
 */
export async function fetchAPI(endpoint, method, token, body) {
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  const options = {
    method,
    headers,
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, options);

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || `API request failed with status ${response.status}`);
  }

  return response.json();
}

/**
 * Calls the backend to initiate the minting process.
 * @param {string} token - The user's JWT.
 * @param {string} title - The NFT title.
 * @param {string} description - The NFT description.
 * @param {string} mediaUrl - The Cloudinary URL of the AI-generated image.
 * @returns {Promise<{txId: string}>}
 */
export const mintNFT = (token, title, description, mediaUrl) =>
  fetchAPI('/api/nft/mint', 'POST', token, { title, description, mediaUrl });

/**
 * Broadcasts a signed transaction to list an NFT.
 * @param {string} token - The user's JWT.
 * @param {string} signedTx - The hex-encoded signed transaction.
 * @returns {Promise<{success: boolean, txId: string}>}
 */
export const listNFT = (token, signedTx) =>
  fetchAPI('/api/marketplace/list', 'POST', token, { signedTx });

/**
 * Broadcasts a signed transaction to buy an NFT.
 * @param {string} token - The user's JWT.
 * @param {string} signedTx - The hex-encoded signed transaction.
 * @returns {Promise<{success: boolean, txId: string}>}
 */
export const buyNFT = (token, signedTx) =>
  fetchAPI('/api/marketplace/buy', 'POST', token, { signedTx });

/**
 * Fetches all NFTs from the backend database.
 * @returns {Promise<Array<object>>}
 */
export const getNFTs = () => fetch(`${BASE_URL}/api/nfts`).then(res => res.json());

/**
 * Fetches a single NFT's details.
 * @param {string} tokenId - The ID of the token.
 * @returns {Promise<object>}
 */
export const getNFT = (tokenId) => fetch(`${BASE_URL}/api/nft/${tokenId}`).then(res => res.json());