import { unauthorizedResponse, validateApiKey } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { contacts, segments } from "@/lib/db/schema";
import { type SQL, and, desc, eq, ilike, lt, or, sql } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const auth = await validateApiKey(request.headers.get("authorization"));
  if (!auth) return unauthorizedResponse();

  try {
    const body = await request.json();
    const { emails } = body as {
      emails: string[];
    };

    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return NextResponse.json(
        { error: "emails array is required" },
        { status: 400 },
      );
    }

    const created: string[] = [];

    for (const email of emails) {
      const trimmed = email.trim().toLowerCase();
      if (!trimmed) continue;

      const [inserted] = await db
        .insert(contacts)
        .values({ email: trimmed })
        .returning({ id: contacts.id });

      if (inserted) {
        created.push(inserted.id);
      }
    }

    return NextResponse.json({ created: created.length, ids: created });
  } catch (error) {
    console.error("Failed to create contacts:", error);
    return NextResponse.json(
      { error: "Failed to create contacts" },
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
        // If segment_id provided but not found, return empty
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
