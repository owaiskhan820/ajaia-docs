import { NextResponse } from "next/server";
import sql from "@/lib/db";

// GET /api/db-check — quick connectivity probe used in spine verification
export async function GET() {
  try {
    const rows = await sql`SELECT NOW() AS now`;
    return NextResponse.json({ ok: true, time: rows[0].now });
  } catch (err) {
    console.error("DB check failed:", err);
    return NextResponse.json(
      { ok: false, error: String(err) },
      { status: 500 }
    );
  }
}
