import { unauthorizedResponse, validateApiKey } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { contacts, segments, topics } from "@/lib/db/schema";
import { type SQL, and, desc, eq, ilike, lt, or, sql } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const auth = await validateApiKey(request.headers.get("authorization"));
  if (!auth) return unauthorizedResponse();

  try {
    const body = await request.json();
    const email = body.email?.trim().toLowerCase();

    if (!email) {
      return NextResponse.json({ error: "email is required" }, { status: 422 });
    }

    // Check for existing contact to enforce uniqueness manually if needed, 
    // though the uniqueIndex will catch it at the DB level.
    const existing = await db.query.contacts.findFirst({
      where: eq(contacts.email, email),
    });

    if (existing) {
      return NextResponse.json(
        { error: "A contact with this email already exists" },
        { status: 409 },
      );
    }

    // Resolve segment names if provided as IDs
    let resolvedSegments: string[] = [];
    if (body.segments && Array.isArray(body.segments)) {
      resolvedSegments = await Promise.all(
        body.segments.map(async (s: string) => {
          const seg = await db.query.segments.findFirst({
            where: or(eq(segments.id, s), eq(segments.name, s)),
          });
          return seg ? seg.name : null;
        })
      ).then(results => results.filter((r): r is string => r !== null));
    }

    // Map topics to internal shape
    let resolvedTopics: Array<{ topicId: string; subscribed: boolean }> = [];
    if (body.topics && Array.isArray(body.topics)) {
      resolvedTopics = await Promise.all(
        body.topics.map(async (t: any) => {
          const topicId = typeof t === "string" ? t : t.id;
          const subscription = t.subscription || "opt_in";
          const found = await db.query.topics.findFirst({
            where: eq(topics.id, topicId),
          });
          if (!found) return null;
          return {
            topicId: found.id,
            subscribed: subscription === "opt_in",
          };
        })
      ).then(results => results.filter((r): r is { topicId: string; subscribed: boolean } => r !== null));
    }

    const [inserted] = await db
      .insert(contacts)
      .values({
        email,
        firstName: body.first_name || null,
        lastName: body.last_name || null,
        unsubscribed: body.unsubscribed ?? false,
        customProperties: body.properties || null,
        segments: resolvedSegments.length > 0 ? resolvedSegments : null,
        topicSubscriptions: resolvedTopics.length > 0 ? resolvedTopics : null,
      })
      .returning({ id: contacts.id });

    return NextResponse.json({
      object: "contact",
      id: inserted.id,
    }, { status: 201 });
  } catch (error) {
    console.error("Failed to create contact:", error);
    return NextResponse.json(
      { error: "Failed to create contact" },
      { status: 500 },
    );
  }
}

export async function GET(request: Request) {
  const auth = await validateApiKey(request.headers.get("authorization"));
  if (!auth) return unauthorizedResponse();

  const url = new URL(request.url);
  const search = url.searchParams.get("search") || "";
  const limit = Math.min(
    100,
    Math.max(1, Number(url.searchParams.get("limit")) || 40),
  );
  const status = url.searchParams.get("status") || "";
  const segmentId = url.searchParams.get("segment_id") || "";
  const after = url.searchParams.get("after") || "";

  try {
    let segmentName = "";
    if (segmentId) {
      const [seg] = await db
        .select({ name: segments.name })
        .from(segments)
        .where(eq(segments.id, segmentId))
        .limit(1);
      if (seg) {
        segmentName = seg.name;
      } else {
        return NextResponse.json({
          object: "list",
          data: [],
          has_more: false,
        });
      }
    }

    const conditions: SQL[] = [];

    if (search) {
      conditions.push(
        or(
          ilike(contacts.email, `%${search}%`),
          ilike(contacts.firstName, `%${search}%`),
          ilike(contacts.lastName, `%${search}%`),
        ) as SQL,
      );
    }

    if (status === "subscribed") {
      conditions.push(eq(contacts.unsubscribed, false));
    } else if (status === "unsubscribed") {
      conditions.push(eq(contacts.unsubscribed, true));
    }

    if (segmentName) {
      conditions.push(sql`${contacts.segments} ? ${segmentName}`);
    }

    if (after) {
      conditions.push(lt(contacts.id, after));
    }

    const rows = await db
      .select({
        id: contacts.id,
        email: contacts.email,
        firstName: contacts.firstName,
        lastName: contacts.lastName,
        unsubscribed: contacts.unsubscribed,
        segments: contacts.segments,
        createdAt: contacts.createdAt,
      })
      .from(contacts)
      .where(and(...conditions))
      .orderBy(desc(contacts.id))
      .limit(limit + 1);

    const hasMore = rows.length > limit;
    const dataRows = hasMore ? rows.slice(0, limit) : rows;

    const data = dataRows.map((c) => ({
      id: c.id,
      email: c.email,
      firstName: c.firstName,
      lastName: c.lastName,
      status: c.unsubscribed ? "unsubscribed" : "subscribed",
      segments: (c.segments as string[]) ?? [],
      created_at: c.createdAt,
    }));

    return NextResponse.json({
      object: "list",
      data,
      has_more: hasMore,
    });
  } catch (error) {
    console.error("Failed to fetch contacts:", error);
    return NextResponse.json(
      { error: "Failed to fetch contacts" },
      { status: 500 },
    );
  }
}
