// src/lib/expiry.ts
import { prisma } from "./prisma";

/**
 * Releases all PENDING reservations that have passed their expiresAt.
 * Called by: (a) Vercel Cron every minute, (b) lazily on reservation reads.
 */
export async function releaseExpiredReservations(): Promise<number> {
  const now = new Date();

  // Use a transaction so the stock increment and status update are atomic
  const result = await prisma.$transaction(async (tx) => {
    const expired = await tx.reservation.findMany({
      where: {
        status: "PENDING",
        expiresAt: { lt: now },
      },
      select: { id: true, stockLevelId: true, quantity: true },
    });

    if (expired.length === 0) return 0;

    // Release each expired reservation
    await tx.reservation.updateMany({
      where: { id: { in: expired.map((r) => r.id) } },
      data: { status: "RELEASED", releasedAt: now },
    });

    // Return stock for each affected stockLevel
    for (const r of expired) {
      await tx.stockLevel.update({
        where: { id: r.stockLevelId },
        data: { reserved: { decrement: r.quantity } },
      });
    }

    return expired.length;
  });

  return result;
}
