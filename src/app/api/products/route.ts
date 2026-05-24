export const dynamic = "force-dynamic"; 
 
export const dynamic = "force-dynamic";

// src/app/api/products/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const products = await prisma.product.findMany({
      include: {
        stockLevels: {
          include: {
            warehouse: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });

    const response = products.map((p) => ({
      id: p.id,
      name: p.name,
      sku: p.sku,
      description: p.description,
      price: Number(p.price),
      imageUrl: p.imageUrl,
      stock: p.stockLevels.map((s) => ({
        warehouseId: s.warehouseId,
        warehouseName: s.warehouse.name,
        warehouseLocation: s.warehouse.location,
        available: s.totalUnits - s.reserved,
        total: s.totalUnits,
        reserved: s.reserved,
      })),
    }));

    return NextResponse.json(response);
  } catch (err) {
    console.error("GET /api/products error:", err);
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
  }
}
