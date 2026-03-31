import { unauthorizedResponse, validateApiKey } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { broadcasts } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await validateApiKey(_request.headers.get("authorization"));
  if (!auth) return unauthorizedResponse();

  try {
    const { id } = await params;
    const [broadcast] = await db
      .select()
      .from(broadcasts)
      .where(eq(broadcasts.id, id));

    if (!broadcast) {
      return NextResponse.json(
        { error: "Broadcast not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(broadcast);
  } catch (error) {
    console.error("Failed to fetch broadcast:", error);
    return NextResponse.json(
      { error: "Failed to fetch broadcast" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await validateApiKey(request.headers.get("authorization"));
  if (!auth) return unauthorizedResponse();

  try {
    const { id } = await params;
    const body = await request.json();

    const updateData: Record<string, unknown> = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.from !== undefined) updateData.from = body.from;
    if (body.subject !== undefined) updateData.subject = body.subject;
    if (body.html !== undefined) updateData.html = body.html;
    if (body.replyTo !== undefined) updateData.replyTo = body.replyTo;
    if (body.previewText !== undefined)
      updateData.previewText = body.previewText;
    if (body.audienceId !== undefined) updateData.audienceId = body.audienceId;
    if (body.topicId !== undefined) updateData.topicId = body.topicId;
    if (body.scheduledAt !== undefined)
      updateData.scheduledAt = body.scheduledAt;

    const [updated] = await db
      .update(broadcasts)
      .set(updateData)
      .where(eq(broadcasts.id, id))
      .returning();

    if (!updated) {
      return NextResponse.json(
        { error: "Broadcast not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to update broadcast:", error);
    return NextResponse.json(
      { error: "Failed to update broadcast" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await validateApiKey(_request.headers.get("authorization"));
  if (!auth) return unauthorizedResponse();

  try {
    const { id } = await params;
    const [deleted] = await db
      .delete(broadcasts)
      .where(eq(broadcasts.id, id))
      .returning();

    if (!deleted) {
      return NextResponse.json(
        { error: "Broadcast not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete broadcast:", error);
    return NextResponse.json(
      { error: "Failed to delete broadcast" },
      { status: 500 },
    );
  }
}
