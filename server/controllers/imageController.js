import { generateAvatar } from "../utils/fluxModel.js";
import { v2 as cloudinary } from "cloudinary";
import { config } from "../config/env.js";

cloudinary.config({
  cloud_name: config.cloudinary.name,
  api_key: config.cloudinary.key,
  api_secret: config.cloudinary.secret,
});

export async function createAnimatedAvatar({ imageUrl }) {
  if (!imageUrl) throw new Error("Missing image URL");

  const modelResult = await generateAvatar(imageUrl);
  const upload = await cloudinary.uploader.upload(modelResult.output_url || modelResult[0], {
    folder: "stacks_creators",
  });

  return { success: true, image: upload.secure_url };
}
