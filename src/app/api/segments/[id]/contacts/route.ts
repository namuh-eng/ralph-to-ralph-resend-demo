import { unauthorizedResponse, validateApiKey } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { contacts, segments } from "@/lib/db/schema";
import { and, desc, eq, sql } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await validateApiKey(request.headers.get("authorization"));
  if (!auth) return unauthorizedResponse();

  try {
    const { id } = await params;
    
    // Check if segment exists
    const [segment] = await db
      .select({ name: segments.name })
      .from(segments)
      .where(eq(segments.id, id));

    if (!segment) {
      return NextResponse.json(
        { error: "Segment not found" },
        { status: 404 },
      );
    }

    const url = request.nextUrl;
    const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
    const limit = Math.min(
      100,
      Math.max(1, Number(url.searchParams.get("limit")) || 20),
    );
    const offset = (page - 1) * limit;

    // Filter contacts by segment name in segments JSONB array
    const condition = sql`${contacts.segments} ? ${segment.name}`;

    const rows = await db
      .select({
        id: contacts.id,
        email: contacts.email,
        firstName: contacts.firstName,
        lastName: contacts.lastName,
        unsubscribed: contacts.unsubscribed,
        createdAt: contacts.createdAt,
      })
      .from(contacts)
      .where(condition)
      .orderBy(desc(contacts.createdAt))
      .limit(limit)
      .offset(offset);

    const total = await db.$count(contacts, condition);

    const data = rows.map((c) => ({
      id: c.id,
      email: c.email,
      firstName: c.firstName,
      lastName: c.lastName,
      status: c.unsubscribed ? "unsubscribed" : "subscribed",
      createdAt: c.createdAt,
    }));

    return NextResponse.json({
      data,
      total: Number(total),
      page,
      limit,
    });
  } catch (error) {
    console.error("Failed to fetch segment contacts:", error);
    return NextResponse.json(
      { error: "Failed to fetch segment contacts" },
      { status: 500 },
    );
  }
}
