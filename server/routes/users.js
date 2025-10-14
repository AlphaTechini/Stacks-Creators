import { generateAuthToken } from "../utils/stacksAuth.js";

async function userRoutes(fastify, opts) {
  fastify.post("/login", async (request, reply) => {
    const { address } = request.body;
    if (!address) return reply.code(400).send({ error: "Missing wallet address" });

    const token = generateAuthToken(address);
    return reply.send({ success: true, token });
  });

  fastify.get("/profile", async (request, reply) => {
    const auth = request.headers.authorization?.split(" ")[1];
    if (!auth) return reply.code(401).send({ error: "Unauthorized" });

    const payload = verifyAuthToken(auth);
    if (!payload) return reply.code(403).send({ error: "Invalid token" });

    return reply.send({ address: payload.address });
  });
}

export default userRoutes;
