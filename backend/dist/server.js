"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.start = start;
const crypto_1 = require("crypto");
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
const fastify_1 = __importDefault(require("fastify"));
const multipart_1 = __importDefault(require("@fastify/multipart"));
const cors_1 = __importDefault(require("@fastify/cors"));
const static_1 = __importDefault(require("@fastify/static"));
const sharp_1 = __importDefault(require("sharp"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const server = (0, fastify_1.default)({ logger: true });
const uploadsDir = path_1.default.join(__dirname, "..", "uploads");
async function ensureUploadsDir() {
    await fs_1.promises.mkdir(uploadsDir, { recursive: true });
}
server.register(cors_1.default, {
    origin: (origin, cb) => {
        cb(null, true);
    },
    credentials: true
});
server.register(multipart_1.default, {
    attachFieldsToBody: false,
    limits: {
        fileSize: 10 * 1024 * 1024,
        files: 1
    }
});
server.register(static_1.default, {
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
    const id = (0, crypto_1.randomUUID)();
    const sourceExt = path_1.default.extname(file.filename || "") || ".png";
    const originalFilename = `${id}-original${sourceExt}`;
    const convertedFilename = `${id}-converted.png`;
    await ensureUploadsDir();
    await fs_1.promises.writeFile(path_1.default.join(uploadsDir, originalFilename), buffer);
    // stylize with a deterministic pipeline; handle any image shape gracefully
    const image = (0, sharp_1.default)(buffer).withMetadata();
    const resized = await image.resize({ width: 1024, height: 1024, fit: 'inside' }).toBuffer();
    // apply a mild median + color correction to simulate stylization
    const stylizedBuffer = await (0, sharp_1.default)(resized)
        .median(5)
        .linear(1.08, -10)
        .modulate({ saturation: 1.25, brightness: 1.02 })
        .png({ quality: 90 })
        .toBuffer();
    const convertedPath = path_1.default.join(uploadsDir, convertedFilename);
    await fs_1.promises.writeFile(convertedPath, stylizedBuffer);
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
async function start(port = Number(process.env.PORT || 4000), host = "0.0.0.0") {
    await ensureUploadsDir();
    try {
        await server.listen({ port, host });
    }
    catch (err) {
        server.log.error(err);
        process.exit(1);
    }
}
if (require.main === module) {
    start();
}
