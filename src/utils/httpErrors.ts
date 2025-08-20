import { FastifyReply } from 'fastify';

export function notFound(reply: FastifyReply, message = 'Not found') {
  return reply.code(404).send({ error: message });
}

export function badRequest(reply: FastifyReply, message = 'Bad request') {
  return reply.code(400).send({ error: message });
}

export function internalError(reply: FastifyReply, message = 'Internal error') {
  return reply.code(500).send({ error: message });
}
