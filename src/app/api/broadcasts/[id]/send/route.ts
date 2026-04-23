import { unauthorizedResponse, validateApiKey } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { broadcasts } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await validateApiKey(request.headers.get("authorization"));
  if (!auth) return unauthorizedResponse();

  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const scheduledAt = body.scheduled_at ? new Date(body.scheduled_at) : null;

    const [existing] = await db
      .select({ status: broadcasts.status })
      .from(broadcasts)
      .where(eq(broadcasts.id, id))
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { error: "Broadcast not found" },
        { status: 404 },
      );
    }

    if (existing.status !== "draft") {
      return NextResponse.json(
        { error: `Cannot send a broadcast in ${existing.status} status` },
        { status: 400 },
      );
    }

    const nextStatus = scheduledAt ? "scheduled" : "queued";

    const [updated] = await db
      .update(broadcasts)
      .set({
        status: nextStatus,
        scheduledAt: scheduledAt,
      })
      .where(eq(broadcasts.id, id))
      .returning();

    return NextResponse.json({
      object: "broadcast",
      id: updated.id,
      status: updated.status,
      scheduled_at: updated.scheduledAt,
    });
  } catch (error) {
    console.error("Failed to send broadcast:", error);
    return NextResponse.json(
      { error: "Failed to send broadcast" },
      { status: 500 },
    );
  }
}
