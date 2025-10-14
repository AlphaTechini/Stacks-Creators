import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import Fastify from "fastify";
import multipart from "@fastify/multipart";
import cors from "@fastify/cors";
import fastifyStatic from "@fastify/static";
import sharp from "sharp";
import dotenv from "dotenv";

dotenv.config();

const server = Fastify({ logger: true });
const uploadsDir = path.join(__dirname, "..", "uploads");

async function ensureUploadsDir(): Promise<void> {
  await fs.mkdir(uploadsDir, { recursive: true });
}

server.register(cors, {
  origin: (origin, cb) => {
    cb(null, true);
  },
  credentials: true
});

server.register(multipart, {
  attachFieldsToBody: false,
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 1
  }
});

server.register(fastifyStatic, {
  root: uploadsDir,
  prefix: "/media/"
});

server.get("/api/health", async () => {
  return { status: "ok" };
});

server.post("/api/convert", async (request, reply) => {
  const file = await request.file();
  if (!file) {
    reply.code(400);
    return { error: "Missing image file" };
  }
  const mimetype = file.mimetype;
  if (!mimetype || !mimetype.startsWith("image/")) {
    reply.code(400);
    return { error: "Unsupported file type" };
  }

  const buffer = await file.toBuffer();
  const id = randomUUID();
  const sourceExt = path.extname(file.filename || "") || ".png";
  const originalFilename = `${id}-original${sourceExt}`;
  const convertedFilename = `${id}-converted.png`;

  await ensureUploadsDir();

  await fs.writeFile(path.join(uploadsDir, originalFilename), buffer);

  // stylize with a deterministic pipeline; handle any image shape gracefully
  const image = sharp(buffer).withMetadata();
  const resized = await image.resize({ width: 1024, height: 1024, fit: 'inside' }).toBuffer();
  // apply a mild median + color correction to simulate stylization
  const stylizedBuffer = await sharp(resized)
    .median(5)
    .linear(1.08, -10)
    .modulate({ saturation: 1.25, brightness: 1.02 })
    .png({ quality: 90 })
    .toBuffer();

  const convertedPath = path.join(uploadsDir, convertedFilename);
  await fs.writeFile(convertedPath, stylizedBuffer);

  const base = process.env.BACKEND_BASE_URL || '';
  const prefix = base ? base.replace(/\/$/, '') : '';

  return {
    original: prefix ? `${prefix}/media/${originalFilename}` : `/media/${originalFilename}`,
    converted: prefix ? `${prefix}/media/${convertedFilename}` : `/media/${convertedFilename}`,
    mediaType: "image/png",
    id
  };
});

server.get("/api/config", async () => {
  return {
    networkId: process.env.NEAR_NETWORK_ID || "testnet",
    contractName: process.env.NEAR_CONTRACT_ID || "",
    backendBaseUrl: process.env.BACKEND_BASE_URL || ""
  };
});

export async function start(port = Number(process.env.PORT || 4000), host = "0.0.0.0"): Promise<void> {
  await ensureUploadsDir();
  try {
    await server.listen({ port, host });
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

if (require.main === module) {
  start();
}
