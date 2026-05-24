// src/app/api/cron/expire-reservations/route.ts
import { NextRequest, NextResponse } from "next/server";
import { releaseExpiredReservations } from "@/lib/expiry";

export async function GET(req: NextRequest) {
  // Vercel Cron authenticates with CRON_SECRET
  const authHeader = req.headers.get("authorization");
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const released = await releaseExpiredReservations();
    return NextResponse.json({ released, timestamp: new Date().toISOString() });
  } catch (err) {
    console.error("Cron expire error:", err);
    return NextResponse.json({ error: "Cron job failed" }, { status: 500 });
  }
}
