import fastify from "./index.js";
import { onRequest } from "firebase-functions/v2/https";

export const api = onRequest((req, res) => {
  fastify.ready(err => {
    if (err) {
      console.error("Fastify init error:", err);
      res.status(500).send("Server init failed");
    } else {
      fastify.server.emit("request", req, res);
    }
  });
});
