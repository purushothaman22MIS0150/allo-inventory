export const dynamic = "force-dynamic"; 
 
export const dynamic = "force-dynamic";

// src/app/api/warehouses/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const warehouses = await prisma.warehouse.findMany({
      orderBy: { name: "asc" },
    });
    return NextResponse.json(warehouses);
  } catch (err) {
    console.error("GET /api/warehouses error:", err);
    return NextResponse.json({ error: "Failed to fetch warehouses" }, { status: 500 });
  }
}
