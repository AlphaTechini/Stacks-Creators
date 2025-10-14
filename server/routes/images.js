import { createAnimatedAvatar } from "../controllers/imageController.js";

async function imageRoutes(fastify, opts) {
  fastify.post("/avatar", async (request, reply) => {
    try {
      const { imageUrl } = request.body;
      const result = await createAnimatedAvatar({ imageUrl });
      return reply.send(result);
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ error: "Failed to generate avatar" });
    }
  });
}

export default imageRoutes;
