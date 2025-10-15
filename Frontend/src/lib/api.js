/**
 * Uploads a file blob to Cloudinary via our backend.
 * @param {string} token The user's JWT for authentication.
 * @param {Blob} fileBlob The file blob to upload (e.g., the AI-generated image).
 * @returns {Promise<{secure_url: string}>} A promise that resolves with the Cloudinary response.
 */
export async function uploadToCloudinary(token, fileBlob) {
  const formData = new FormData();
  formData.append("file", fileBlob, "generated-art.png");

  const res = await fetch(`${import.meta.env.VITE_API_URL}/api/upload/cloudinary`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData
  });

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.error || 'Cloudinary upload failed.');
  }

  return await res.json();
}

/**
 * Calls the backend to mint an NFT with the provided metadata and media URL.
 *
 * @param {string} token - The user's JWT for authentication.
 * @param {string} title - The title of the NFT.
 * @param {string} description - The description of the NFT.
 * @param {string} mediaUrl - The URL of the media hosted on Cloudinary.
 * @returns {Promise<any>} A promise that resolves with the JSON response from the server.
 */
export async function mintNFT(token, title, description, mediaUrl) {
  const res = await fetch(`${import.meta.env.VITE_API_URL}/api/nft/mint`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ title, description, mediaUrl }),
  });

  return await res.json();
}