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
      .where(eq(broadcasts.id, id))
      .limit(1);

    if (!broadcast) {
      return NextResponse.json(
        { error: "Broadcast not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      object: "broadcast",
      id: broadcast.id,
      name: broadcast.name,
      status: broadcast.status,
      from: broadcast.from,
      subject: broadcast.subject,
      html: broadcast.html,
      text: broadcast.text,
      reply_to: broadcast.replyTo,
      preview_text: broadcast.previewText,
      audience_id: broadcast.audienceId,
      topic_id: broadcast.topicId,
      scheduled_at: broadcast.scheduledAt,
      created_at: broadcast.createdAt,
    });
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

    return NextResponse.json({
      object: "broadcast",
      id: updated.id,
      name: updated.name,
      status: updated.status,
      from: updated.from,
      subject: updated.subject,
      html: updated.html,
      text: updated.text,
      reply_to: updated.replyTo,
      preview_text: updated.previewText,
      audience_id: updated.audienceId,
      topic_id: updated.topicId,
      scheduled_at: updated.scheduledAt,
      created_at: updated.createdAt,
    });
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
    
    // Draft-guard logic
    const results = await db
      .select({ status: broadcasts.status })
      .from(broadcasts)
      .where(eq(broadcasts.id, id))
      .limit(1);

    const existing = results[0];

    if (!existing) {
      return NextResponse.json(
        { error: "Broadcast not found" },
        { status: 404 },
      );
    }

    if (existing.status !== "draft" && existing.status !== "scheduled") {
      return NextResponse.json(
        { error: "Cannot delete a broadcast that is already sent or queued" },
        { status: 400 },
      );
    }

    const deleteResults = await db
      .delete(broadcasts)
      .where(eq(broadcasts.id, id))
      .returning({ id: broadcasts.id });

    if (!deleteResults || deleteResults.length === 0) {
      return NextResponse.json(
        { error: "Broadcast not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      object: "broadcast",
      id: deleteResults[0].id,
      deleted: true,
    });
  } catch (error) {
    console.error("Failed to delete broadcast:", error);
    return NextResponse.json(
      { error: "Failed to delete broadcast" },
      { status: 500 },
    );
  }
}
