/**
 * Handles AI image generation using the Hugging Face Inference API.
 */

const HF_API_URL = "https://api-inference.huggingface.co/models/black-forest-labs/flux-kontext-pro";
const HF_TOKEN = import.meta.env.VITE_HUGGINGFACE_TOKEN;

/**
 * Sends an image file to the Hugging Face model and returns the generated image as a Blob.
 * @param {File} file The user's uploaded image file.
 * @returns {Promise<Blob>} A promise that resolves with the generated image blob.
 */
export async function generateAnimatedImage(file) {
  const imageBlob = await file.arrayBuffer();
  const res = await fetch(HF_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${HF_TOKEN}`,
      "Content-Type": "application/octet-stream"
    },
    body: imageBlob
  });

  if (!res.ok) throw new Error("AI image generation failed. The model may be loading.");
  
  return await res.blob(); // Return generated image blob
}
