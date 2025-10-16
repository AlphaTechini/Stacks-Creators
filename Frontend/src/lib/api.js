const BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

/**
 * A helper function to get the authentication token from local storage.
 * @returns {string | null} The JWT token.
 */
function getAuthToken() {
  return localStorage.getItem('stacks_token');
}

/**
 * A helper function for making authenticated API requests.
 * @param {string} endpoint - The API endpoint to call.
 * @param {string} method - The HTTP method (GET, POST, etc.).
 * @param {string | null} token - The user's JWT. If null, it won't be added.
 * @param {object} [body] - The request body for POST/PUT requests.
 * @returns {Promise<any>} The JSON response from the server.
 */
export async function fetchAPI(endpoint, method, token, body) {
  const headers = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

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
 * Calls the backend to run the entire generation and minting pipeline.
 * @param {string} token - The user's JWT.
 * @param {File} file - The original image file.
 * @param {string} title - The NFT title.
 * @param {string} description - The NFT description.
 * @returns {Promise<{success: boolean, txId: string, mediaUrl: string}>}
 */
export async function generateAndMintNFT(token, file, title, description) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('title', title);
  formData.append('description', description);

  const response = await fetch(`${BASE_URL}/api/nft/generate-and-mint`, {
    method: 'POST',
    headers: {
      // 'Content-Type' is set automatically by the browser for FormData.
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || `API request failed with status ${response.status}`);
  }

  return response.json();
}

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
export async function getNFTs() {
  const response = await fetch(`${BASE_URL}/api/nfts`);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Failed to fetch NFTs' }));
    throw new Error(errorData.error || `API request failed with status ${response.status}`);
  }
  return response.json();
}

/**
 * Fetches a single NFT's details.
 * @param {string} tokenId - The ID of the token.
 * @returns {Promise<object>}
 */
export async function getNFT(tokenId) {
  const response = await fetch(`${BASE_URL}/api/nft/${tokenId}`);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: `NFT with ID ${tokenId} not found.` }));
    throw new Error(errorData.error || `API request failed with status ${response.status}`);
  }
  return response.json();
}

/**
 * Calls the /api/creator/sync endpoint to update a user's profile.
 * This function automatically includes the auth token.
 * @param {object} profileData The data to sync, e.g., { username, content }.
 * @returns {Promise<any>} The response from the server.
 */
export function syncCreatorProfile(profileData) {
  const token = getAuthToken();
  if (!token) {
    return Promise.reject(new Error('Authentication token not found. Please log in.'));
  }
  return fetchAPI('/api/creator/sync', 'POST', token, profileData);
}

/**
 * Calls the /api/creator/fetch endpoint to get a user's profile.
 * This is a public endpoint, so no token is needed.
 * @param {string} walletAddress The wallet address of the user to fetch.
 * @returns {Promise<any>} The user's profile data.
 */
export function fetchCreatorProfile(walletAddress) {
  // This endpoint doesn't require authentication, so we pass null for the token.
  return fetchAPI('/api/creator/fetch', 'POST', null, { walletAddress });
}