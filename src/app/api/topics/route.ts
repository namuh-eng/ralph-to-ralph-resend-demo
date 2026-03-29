import { unauthorizedResponse, validateApiKey } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { topics } from "@/lib/db/schema";
import { and, asc, count, eq, ilike } from "drizzle-orm";
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
    const defaultFilter = url.searchParams.get("default")?.trim() || "";
    const offset = (page - 1) * limit;

    const conditions = [];
    if (search) {
      conditions.push(ilike(topics.name, `%${search}%`));
    }
    if (defaultFilter === "opt_in" || defaultFilter === "opt_out") {
      conditions.push(eq(topics.defaultSubscription, defaultFilter));
    }

    const where =
      conditions.length > 0
        ? conditions.length === 1
          ? conditions[0]
          : and(...conditions)
        : undefined;

    const [totalRow] = await db
      .select({ count: count() })
      .from(topics)
      .where(where);

    const rows = await db
      .select({
        id: topics.id,
        name: topics.name,
        description: topics.description,
        defaultSubscription: topics.defaultSubscription,
        visibility: topics.visibility,
        createdAt: topics.createdAt,
      })
      .from(topics)
      .where(where)
      .orderBy(asc(topics.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json({
      data: rows,
      total: totalRow?.count ?? 0,
      page,
      limit,
    });
  } catch (error) {
    console.error("Failed to fetch topics:", error);
    return NextResponse.json(
      { error: "Failed to fetch topics" },
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

    const description = body.description?.trim() || null;
    const defaultSubscription =
      body.defaultSubscription === "opt_in" ? "opt_in" : "opt_out";
    const visibility = body.visibility === "private" ? "private" : "public";

    const [topic] = await db
      .insert(topics)
      .values({
        name,
        description,
        defaultSubscription,
        visibility,
      })
      .returning();

    return NextResponse.json(topic, { status: 201 });
  } catch (error) {
    console.error("Failed to create topic:", error);
    return NextResponse.json(
      { error: "Failed to create topic" },
      { status: 500 },
    );
  }
}
