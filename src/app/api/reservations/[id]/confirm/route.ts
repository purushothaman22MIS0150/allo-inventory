// src/app/api/reservations/[id]/confirm/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withIdempotency } from "@/lib/idempotency";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  const idempotencyKey = req.headers.get("Idempotency-Key");

  return withIdempotency(idempotencyKey, `POST /api/reservations/${id}/confirm`, async () => {
    try {
      const result = await prisma.$transaction(async (tx) => {
        const reservation = await tx.reservation.findUnique({
          where: { id },
          include: { stockLevel: true },
        });

        if (!reservation) {
          throw new ReservationError("Reservation not found", 404);
        }

        if (reservation.status === "CONFIRMED") {
          // Already confirmed — idempotent success
          return reservation;
        }

        if (reservation.status === "RELEASED") {
          throw new ReservationError(
            "This reservation has already been released and cannot be confirmed.",
            410
          );
        }

        // Check expiry
        if (reservation.expiresAt < new Date()) {
          // Lazy cleanup: mark as released and return stock
          await tx.reservation.update({
            where: { id },
            data: { status: "RELEASED", releasedAt: new Date() },
          });
          await tx.stockLevel.update({
            where: { id: reservation.stockLevelId },
            data: { reserved: { decrement: reservation.quantity } },
          });
          throw new ReservationError(
            "This reservation has expired. Please start a new reservation.",
            410
          );
        }

        // Confirm: decrement totalUnits permanently, release the reserved hold
        const confirmed = await tx.reservation.update({
          where: { id },
          data: { status: "CONFIRMED", confirmedAt: new Date() },
          include: {
            stockLevel: {
              include: { product: true, warehouse: true },
            },
          },
        });

        await tx.stockLevel.update({
          where: { id: reservation.stockLevelId },
          data: {
            totalUnits: { decrement: reservation.quantity },
            reserved: { decrement: reservation.quantity },
          },
        });

        return confirmed;
      });

      return {
        body: {
          id: result.id,
          status: result.status,
          quantity: result.quantity,
          confirmedAt: result.confirmedAt,
        },
        status: 200,
      };
    } catch (err) {
      if (err instanceof ReservationError) {
        return { body: { error: err.message }, status: err.status };
      }
      console.error("POST confirm error:", err);
      return { body: { error: "Failed to confirm reservation" }, status: 500 };
    }
  });
}

class ReservationError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
  }
}
