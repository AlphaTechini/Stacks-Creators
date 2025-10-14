import Fastify from "fastify";
import cors from "fastify-cors";
import dotenv from "dotenv";
import { config } from "./config/env.js";
import imageRoutes from "./routes/images.js";
import userRoutes from "./routes/users.js";

dotenv.config();
const fastify = Fastify({ logger: true });

// Register CORS
fastify.register(cors, { origin: "*" });

// Register routes
fastify.register(imageRoutes, { prefix: "/api/images" });
fastify.register(userRoutes, { prefix: "/api/users" });

// Start server (for local dev)
if (process.env.NODE_ENV !== "production") {
  const start = async () => {
    try {
      await fastify.listen({ port: config.port, host: "0.0.0.0" });
      console.log(`🚀 Fastify server running on port ${config.port}`);
    } catch (err) {
      fastify.log.error(err);
      process.exit(1);
    }
  };
  start();
}

// Firebase export compatibility (if deployed later)
export default fastify;
