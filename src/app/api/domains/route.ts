import { db } from "@/lib/db";
import { domains } from "@/lib/db/schema";
import { desc } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const rows = await db
      .select({
        id: domains.id,
        name: domains.name,
        status: domains.status,
      })
      .from(domains)
      .orderBy(desc(domains.createdAt));

    return NextResponse.json({ data: rows });
  } catch (error) {
    console.error("Failed to fetch domains:", error);
    return NextResponse.json(
      { error: "Failed to fetch domains" },
      { status: 500 },
    );
  }
}
