// ABOUTME: Healthcheck endpoint — confirms the app is running and the database is reachable.

import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

export async function GET() {
  try {
    await db.execute(sql`SELECT 1`);
    return Response.json({ status: "ok", db: "connected" });
  } catch {
    return Response.json(
      { status: "error", db: "unreachable" },
      { status: 503 },
    );
  }
}
