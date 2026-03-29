import { unauthorizedResponse, validateApiKey } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { contactSegments, contacts, segments } from "@/lib/db/schema";
import { asc, count, eq, ilike, sql } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const auth = await validateApiKey(request.headers.get("authorization"));
  if (!auth) return unauthorizedResponse();

  try {
    const url = request.nextUrl;
    const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
    const limit = Math.min(
      100,
      Math.max(1, Number(url.searchParams.get("limit")) || 20),
    );
    const search = url.searchParams.get("search")?.trim() || "";
    const offset = (page - 1) * limit;

    const conditions = search ? ilike(segments.name, `%${search}%`) : undefined;

    // Get total count
    const [totalRow] = await db
      .select({ count: count() })
      .from(segments)
      .where(conditions);

    // Get segments with contacts count and unsubscribed count
    const rows = await db
      .select({
        id: segments.id,
        name: segments.name,
        createdAt: segments.createdAt,
        contactsCount: sql<number>`(
          select count(*)::int from contact_segments cs
          where cs.segment_id = ${segments.id}
        )`,
        unsubscribedCount: sql<number>`(
          select count(*)::int from contact_segments cs
          inner join contacts c on c.id = cs.contact_id
          where cs.segment_id = ${segments.id} and c.unsubscribed = true
        )`,
      })
      .from(segments)
      .where(conditions)
      .orderBy(asc(segments.name))
      .limit(limit)
      .offset(offset);

    return NextResponse.json({
      data: rows,
      total: totalRow?.count ?? 0,
      page,
      limit,
    });
  } catch (error) {
    console.error("Failed to fetch segments:", error);
    return NextResponse.json(
      { error: "Failed to fetch segments" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await validateApiKey(request.headers.get("authorization"));
  if (!auth) return unauthorizedResponse();

  try {
    const body = await request.json();
    const name = body.name?.trim();

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const [segment] = await db.insert(segments).values({ name }).returning();

    return NextResponse.json(segment, { status: 201 });
  } catch (error) {
    console.error("Failed to create segment:", error);
    return NextResponse.json(
      { error: "Failed to create segment" },
      { status: 500 },
    );
  }
}
