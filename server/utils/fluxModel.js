import fetch from "node-fetch";
import { config } from "../config/env.js";

const MODEL_ID = "black-forest-labs/FLUX.1-schnell"; // You can change to another Flux variant

export async function generateAvatar(imageUrl) {
  const response = await fetch(
    `https://api-inference.huggingface.co/models/${MODEL_ID}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.huggingFaceKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: imageUrl,
      }),
    }
  );

  if (!response.ok) throw new Error("Failed to generate avatar");
  const result = await response.json();

  // HF returns a base64 or URL blob depending on the model
  return result;
}
