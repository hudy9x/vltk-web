import type { FastifyReply } from 'fastify';

export type HttpError = Error & { status?: number; statusCode?: number; code?: string };

export function toHttpError(cause: unknown): HttpError {
  return cause instanceof Error ? cause as HttpError : new Error(String(cause));
}

export function sendJson(reply: FastifyReply, status: number, body: unknown): FastifyReply {
  return reply.code(status)
    .header('Content-Type', 'application/json; charset=utf-8')
    .header('Cache-Control', 'no-store')
    .header('X-Content-Type-Options', 'nosniff')
    .send(body);
}

/** Giữ parser cũ: chấp nhận JSON bất kể Content-Type, lỗi JSON trả 400. */
export function parseJsonBody(body: unknown): unknown {
  try { return JSON.parse(typeof body === 'string' ? body : ''); }
  catch { throw Object.assign(new Error('Invalid JSON'), { status: 400 }); }
}
