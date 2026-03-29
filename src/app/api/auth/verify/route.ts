import { createHash } from "node:crypto";
import { db } from "@/lib/db";
import { apiKeys } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function POST(request: Request): Promise<Response> {
  let body: { apiKey?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const rawKey = body.apiKey;
  if (!rawKey || typeof rawKey !== "string") {
    return NextResponse.json({ error: "apiKey is required" }, { status: 400 });
  }

  try {
    const hashedKey = createHash("sha256").update(rawKey).digest("hex");
    const found = await db.query.apiKeys.findFirst({
      where: eq(apiKeys.hashedKey, hashedKey),
    });

    if (!found) {
      return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
