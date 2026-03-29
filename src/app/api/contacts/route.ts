import { unauthorizedResponse, validateApiKey } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { contactSegments, contacts, segments } from "@/lib/db/schema";
import { desc, eq, ilike, or } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const auth = await validateApiKey(request.headers.get("authorization"));
  if (!auth) return unauthorizedResponse();

  try {
    const body = await request.json();
    const { emails, segment_ids } = body as {
      emails: string[];
      segment_ids?: string[];
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

        if (segment_ids && segment_ids.length > 0) {
          await db.insert(contactSegments).values(
            segment_ids.map((segId) => ({
              contactId: inserted.id,
              segmentId: segId,
            })),
          );
        }
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
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
  const limit = Math.min(
    100,
    Math.max(1, Number(url.searchParams.get("limit")) || 40),
  );
  const status = url.searchParams.get("status") || "";
  const segment = url.searchParams.get("segment") || "";
  const offset = (page - 1) * limit;

  try {
    let query = db
      .select({
        contacts: {
          id: contacts.id,
          email: contacts.email,
          firstName: contacts.firstName,
          lastName: contacts.lastName,
          unsubscribed: contacts.unsubscribed,
          createdAt: contacts.createdAt,
        },
        segment_name: segments.name,
      })
      .from(contacts)
      .leftJoin(contactSegments, eq(contactSegments.contactId, contacts.id))
      .leftJoin(segments, eq(segments.id, contactSegments.segmentId));

    // Apply filters
    const conditions = [];

    if (search) {
      conditions.push(
        or(
          ilike(contacts.email, `%${search}%`),
          ilike(contacts.firstName, `%${search}%`),
          ilike(contacts.lastName, `%${search}%`),
        ),
      );
    }

    if (status === "subscribed") {
      conditions.push(eq(contacts.unsubscribed, false));
    } else if (status === "unsubscribed") {
      conditions.push(eq(contacts.unsubscribed, true));
    }

    if (conditions.length > 0) {
      for (const condition of conditions) {
        if (condition) {
          query = query.where(condition) as typeof query;
        }
      }
    }

    const rows = await query
      .orderBy(desc(contacts.createdAt))
      .limit(limit)
      .offset(offset);

    // Group rows by contact (segments come from join)
    const contactMap = new Map<
      string,
      {
        id: string;
        email: string;
        firstName: string | null;
        lastName: string | null;
        status: "subscribed" | "unsubscribed";
        segments: string[];
        createdAt: Date;
      }
    >();

    for (const row of rows) {
      const c = row.contacts;
      if (!contactMap.has(c.id)) {
        contactMap.set(c.id, {
          id: c.id,
          email: c.email,
          firstName: c.firstName,
          lastName: c.lastName,
          status: c.unsubscribed ? "unsubscribed" : "subscribed",
          segments: [],
          createdAt: c.createdAt,
        });
      }
      if (row.segment_name) {
        const existing = contactMap.get(c.id);
        if (existing && !existing.segments.includes(row.segment_name)) {
          existing.segments.push(row.segment_name);
        }
      }
    }

    const data = Array.from(contactMap.values());

    // Get total count
    let countQuery = db.$count(contacts);
    if (search) {
      countQuery = db.$count(
        contacts,
        or(
          ilike(contacts.email, `%${search}%`),
          ilike(contacts.firstName, `%${search}%`),
          ilike(contacts.lastName, `%${search}%`),
        ),
      );
    }
    if (status === "subscribed") {
      countQuery = db.$count(contacts, eq(contacts.unsubscribed, false));
    } else if (status === "unsubscribed") {
      countQuery = db.$count(contacts, eq(contacts.unsubscribed, true));
    }

    const total = await countQuery;

    return NextResponse.json({
      data,
      total: Number(total),
      page,
      limit,
    });
  } catch (error) {
    console.error("Failed to fetch contacts:", error);
    return NextResponse.json(
      { error: "Failed to fetch contacts" },
      { status: 500 },
    );
  }
}
