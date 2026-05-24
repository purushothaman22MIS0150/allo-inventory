// src/lib/idempotency.ts
import { prisma } from "./prisma";
import { NextResponse } from "next/server";

const IDEMPOTENCY_TTL_HOURS = 24;

export async function withIdempotency(
  key: string | null,
  endpoint: string,
  handler: () => Promise<{ body: unknown; status: number }>
): Promise<NextResponse> {
  if (!key) {
    const { body, status } = await handler();
    return NextResponse.json(body, { status });
  }

  // Check for existing response
  const existing = await prisma.idempotencyKey.findUnique({
    where: { key: `${endpoint}:${key}` },
  });

  if (existing) {
    return NextResponse.json(existing.responseBody, {
      status: existing.statusCode,
      headers: { "Idempotency-Replayed": "true" },
    });
  }

  // Execute handler
  const { body, status } = await handler();

  // Store the result (best-effort — don't fail the request if this fails)
  try {
    await prisma.idempotencyKey.create({
      data: {
        key: `${endpoint}:${key}`,
        endpoint,
        responseBody: body as never,
        statusCode: status,
        expiresAt: new Date(Date.now() + IDEMPOTENCY_TTL_HOURS * 60 * 60 * 1000),
      },
    });
  } catch (err) {
    // Could be a race condition where two identical requests came in simultaneously;
    // ignore the duplicate key error and return the result anyway.
    console.warn("Idempotency key store failed (likely race):", err);
  }

  return NextResponse.json(body, { status });
}
