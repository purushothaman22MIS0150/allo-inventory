export const dynamic = "force-dynamic"; 
 
export const dynamic = "force-dynamic";

// src/app/api/reservations/[id]/release/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const reservation = await tx.reservation.findUnique({
        where: { id },
      });

      if (!reservation) {
        throw new ReservationError("Reservation not found", 404);
      }

      if (reservation.status === "RELEASED") {
        return reservation; // idempotent
      }

      if (reservation.status === "CONFIRMED") {
        throw new ReservationError(
          "Cannot release an already confirmed reservation.",
          409
        );
      }

      const released = await tx.reservation.update({
        where: { id },
        data: { status: "RELEASED", releasedAt: new Date() },
      });

      await tx.stockLevel.update({
        where: { id: reservation.stockLevelId },
        data: { reserved: { decrement: reservation.quantity } },
      });

      return released;
    });

    return NextResponse.json({
      id: result.id,
      status: result.status,
      releasedAt: result.releasedAt,
    });
  } catch (err) {
    if (err instanceof ReservationError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("POST release error:", err);
    return NextResponse.json({ error: "Failed to release reservation" }, { status: 500 });
  }
}

class ReservationError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
  }
}
