import { unauthorizedResponse, validateApiKey } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { broadcasts, segments } from "@/lib/db/schema";
import { type SQL, and, count, desc, eq, ilike } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const auth = await validateApiKey(request.headers.get("authorization"));
  if (!auth) return unauthorizedResponse();

  try {
    const url = request.nextUrl;
    const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
    const limit = Math.min(
      120,
      Math.max(1, Number(url.searchParams.get("limit")) || 40),
    );
    const search = url.searchParams.get("search")?.trim() || "";
    const status = url.searchParams.get("status")?.trim() || "";
    const segmentId = url.searchParams.get("segmentId")?.trim() || "";
    const offset = (page - 1) * limit;

    const conditions: SQL[] = [];
    if (search) {
      conditions.push(ilike(broadcasts.name, `%${search}%`));
    }
    if (status) {
      conditions.push(
        eq(
          broadcasts.status,
          status as "draft" | "scheduled" | "queued" | "sent" | "failed",
        ),
      );
    }
    if (segmentId) {
      conditions.push(eq(broadcasts.segmentId, segmentId));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [totalRow] = await db
      .select({ count: count() })
      .from(broadcasts)
      .where(whereClause);

    const rows = await db
      .select({
        id: broadcasts.id,
        name: broadcasts.name,
        status: broadcasts.status,
        segmentId: broadcasts.segmentId,
        createdAt: broadcasts.createdAt,
      })
      .from(broadcasts)
      .where(whereClause)
      .orderBy(desc(broadcasts.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json({
      data: rows,
      total: totalRow?.count ?? 0,
      page,
      limit,
    });
  } catch (error) {
    console.error("Failed to fetch broadcasts:", error);
    return NextResponse.json(
      { error: "Failed to fetch broadcasts" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await validateApiKey(request.headers.get("authorization"));
  if (!auth) return unauthorizedResponse();

  try {
    const body = await request.json();
    const name = body.name?.trim() || "Untitled";

    const [broadcast] = await db
      .insert(broadcasts)
      .values({ name })
      .returning();

    return NextResponse.json(broadcast, { status: 201 });
  } catch (error) {
    console.error("Failed to create broadcast:", error);
    return NextResponse.json(
      { error: "Failed to create broadcast" },
      { status: 500 },
    );
  }
}
