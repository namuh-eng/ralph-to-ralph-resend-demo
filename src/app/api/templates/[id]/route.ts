import { db } from "@/lib/db";
import { templates } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const [template] = await db
      .select()
      .from(templates)
      .where(eq(templates.id, id));

    if (!template) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(template);
  } catch (error) {
    console.error("Failed to fetch template:", error);
    return NextResponse.json(
      { error: "Failed to fetch template" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const [updated] = await db
      .update(templates)
      .set({
        ...body,
        updatedAt: new Date(),
      })
      .where(eq(templates.id, id))
      .returning();

    if (!updated) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to update template:", error);
    return NextResponse.json(
      { error: "Failed to update template" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const [deleted] = await db
      .delete(templates)
      .where(eq(templates.id, id))
      .returning();

    if (!deleted) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete template:", error);
    return NextResponse.json(
      { error: "Failed to delete template" },
      { status: 500 },
    );
  }
}
