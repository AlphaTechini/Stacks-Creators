// ai.service.cjs
const inference = require('@huggingface/inference');

/**
 * Transforms an input image using a specified Hugging Face model.
 * Uses the image-to-image pipeline.
 *
 * @param {Buffer} imageBuffer - The buffer of the image to transform.
 * @param {string} prompt - The text prompt to guide the image transformation.
 * @returns {Promise<Blob>} - The transformed image blob.
 */
async function transformImage(imageBuffer, prompt) {
  console.log('Sending image to Hugging Face for transformation...');

  try {
    const imageBlob = await inference.imageToImage({
      model: 'lllyasviel/sd-controlnet-depth',
      inputs: new Blob([imageBuffer]),
      parameters: {
        prompt,
      },
      accessToken: process.env.HF_TOKEN, // ✅ token now goes here
    });

    console.log('Successfully received transformed image from Hugging Face.');
    return imageBlob;
  } catch (error) {
    console.error('Error during Hugging Face image transformation:', error);
    throw new Error('Failed to transform image using AI service.');
  }
}

module.exports = { transformImage };
