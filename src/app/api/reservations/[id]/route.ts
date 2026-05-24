export const dynamic = "force-dynamic"; 
 
export const dynamic = "force-dynamic";

// src/app/api/reservations/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { releaseExpiredReservations } from "@/lib/expiry";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  try {
    // Lazy expiry cleanup
    await releaseExpiredReservations();

    const reservation = await prisma.reservation.findUnique({
      where: { id },
      include: {
        stockLevel: {
          include: {
            product: true,
            warehouse: true,
          },
        },
      },
    });

    if (!reservation) {
      return NextResponse.json({ error: "Reservation not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: reservation.id,
      status: reservation.status,
      quantity: reservation.quantity,
      expiresAt: reservation.expiresAt,
      confirmedAt: reservation.confirmedAt,
      releasedAt: reservation.releasedAt,
      createdAt: reservation.createdAt,
      product: {
        id: reservation.stockLevel.product.id,
        name: reservation.stockLevel.product.name,
        sku: reservation.stockLevel.product.sku,
        price: Number(reservation.stockLevel.product.price),
        imageUrl: reservation.stockLevel.product.imageUrl,
      },
      warehouse: {
        id: reservation.stockLevel.warehouse.id,
        name: reservation.stockLevel.warehouse.name,
        location: reservation.stockLevel.warehouse.location,
      },
    });
  } catch (err) {
    console.error("GET /api/reservations/:id error:", err);
    return NextResponse.json({ error: "Failed to fetch reservation" }, { status: 500 });
  }
}
