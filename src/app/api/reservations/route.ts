export const dynamic = "force-dynamic"; 
 
export const dynamic = "force-dynamic";

// src/app/api/reservations/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { acquireLock, releaseLock } from "@/lib/redis";
import { withIdempotency } from "@/lib/idempotency";
import { ReserveSchema } from "@/lib/schemas";

const RESERVATION_TTL_MS = 10 * 60 * 1000; // 10 minutes

export async function POST(req: NextRequest) {
  const idempotencyKey = req.headers.get("Idempotency-Key");

  return withIdempotency(idempotencyKey, "POST /api/reservations", async () => {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return { body: { error: "Invalid JSON body" }, status: 400 };
    }

    const parsed = ReserveSchema.safeParse(body);
    if (!parsed.success) {
      return {
        body: { error: "Validation failed", details: parsed.error.flatten() },
        status: 400,
      };
    }

    const { productId, warehouseId, quantity } = parsed.data;

    // Distributed lock keyed on product+warehouse to serialize concurrent reserve requests
    const lockKey = `reserve:${productId}:${warehouseId}`;
    const lockToken = await acquireLock(lockKey, 8000);

    if (!lockToken) {
      return {
        body: { error: "Too many concurrent requests for this item. Please try again." },
        status: 429,
      };
    }

    try {
      // Within the lock, use a DB transaction for atomicity
      const reservation = await prisma.$transaction(async (tx) => {
        const stockLevel = await tx.stockLevel.findUnique({
          where: { productId_warehouseId: { productId, warehouseId } },
          select: { id: true, totalUnits: true, reserved: true },
        });

        if (!stockLevel) {
          throw new StockError("Stock record not found for this product/warehouse", 404);
        }

        const available = stockLevel.totalUnits - stockLevel.reserved;
        if (available < quantity) {
          throw new StockError(
            `Not enough stock. Requested: ${quantity}, available: ${available}`,
            409
          );
        }

        // Atomically increment reserved
        const updated = await tx.stockLevel.update({
          where: { id: stockLevel.id },
          data: { reserved: { increment: quantity } },
        });

        const expiresAt = new Date(Date.now() + RESERVATION_TTL_MS);
        const reservation = await tx.reservation.create({
          data: {
            stockLevelId: stockLevel.id,
            quantity,
            status: "PENDING",
            expiresAt,
          },
          include: {
            stockLevel: {
              include: {
                product: true,
                warehouse: true,
              },
            },
          },
        });

        return { reservation, updated };
      });

      const r = reservation.reservation;
      return {
        body: {
          id: r.id,
          status: r.status,
          quantity: r.quantity,
          expiresAt: r.expiresAt,
          createdAt: r.createdAt,
          product: {
            id: r.stockLevel.product.id,
            name: r.stockLevel.product.name,
            sku: r.stockLevel.product.sku,
            price: Number(r.stockLevel.product.price),
            imageUrl: r.stockLevel.product.imageUrl,
          },
          warehouse: {
            id: r.stockLevel.warehouse.id,
            name: r.stockLevel.warehouse.name,
            location: r.stockLevel.warehouse.location,
          },
        },
        status: 201,
      };
    } catch (err) {
      if (err instanceof StockError) {
        return { body: { error: err.message }, status: err.status };
      }
      console.error("POST /api/reservations error:", err);
      return { body: { error: "Failed to create reservation" }, status: 500 };
    } finally {
      await releaseLock(lockKey, lockToken);
    }
  });
}

class StockError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "StockError";
  }
}
