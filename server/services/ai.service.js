import { InferenceClient } from '@huggingface/inference';

// Initialize the Inference Client with your Hugging Face token.
const hf = new InferenceClient(process.env.HF_TOKEN);

/**
 * Transforms an input image using a specified Hugging Face model.
 * This function uses the image-to-image pipeline.
 *
 * @param {Buffer} imageBuffer - The buffer of the image to transform.
 * @param {string} prompt - The text prompt to guide the image transformation.
 * @returns {Promise<Blob>} A Blob representing the generated image.
 */
export async function transformImage(imageBuffer, prompt) {
  console.log('Sending image to Hugging Face for transformation...');

  try {
    const imageBlob = await hf.imageToImage({
      // Using a model known for this task. You can change this to other compatible models.
      // See https://huggingface.co/tasks/image-to-image for more models.
      model: 'lllyasviel/sd-controlnet-depth',
      inputs: new Blob([imageBuffer]), // The client expects the image as a Blob.
      parameters: {
        prompt: prompt,
        // You can add other parameters here, like negative_prompt, strength, etc.
      },
    });

    console.log('Successfully received transformed image from Hugging Face.');
    return imageBlob;
  } catch (error) {
    console.error('Error during Hugging Face image-to-image transformation:', error);
    // Re-throw the error to be handled by the route handler.
    throw new Error('Failed to transform image using AI service.');
  }
}