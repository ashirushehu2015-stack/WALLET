import { prisma } from '../config/db';

export async function checkIdempotency(key: string) {
  return await prisma.idempotencyKey.findUnique({
    where: { key },
  });
}

export async function saveIdempotency(
  key: string,
  userId: string | null,
  requestPath: string,
  responseStatus: number,
  responseBody: any
) {
  return await prisma.idempotencyKey.create({
    data: {
      key,
      userId,
      requestPath,
      responseStatus,
      responseBody,
    },
  });
}
