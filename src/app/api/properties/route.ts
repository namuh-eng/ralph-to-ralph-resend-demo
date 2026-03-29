import { unauthorizedResponse, validateApiKey } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { properties } from "@/lib/db/schema";
import { and, count, eq, ilike } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const auth = await validateApiKey(request.headers.get("authorization"));
  if (!auth) return unauthorizedResponse();

  try {
    const url = request.nextUrl;
    const page = Math.max(1, Number(url.searchParams.get("page") || "1"));
    const limit = Math.min(
      100,
      Math.max(1, Number(url.searchParams.get("limit") || "20")),
    );
    const search = url.searchParams.get("search") || "";
    const typeFilter = url.searchParams.get("type") || "";

    const conditions = [];
    if (search) {
      conditions.push(ilike(properties.name, `%${search}%`));
    }
    if (typeFilter === "string" || typeFilter === "number") {
      conditions.push(eq(properties.type, typeFilter));
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [items, totalResult] = await Promise.all([
      db
        .select()
        .from(properties)
        .where(where)
        .orderBy(properties.createdAt)
        .limit(limit)
        .offset((page - 1) * limit),
      db.select({ count: count() }).from(properties).where(where),
    ]);

    return NextResponse.json({
      data: items,
      total: totalResult[0]?.count ?? 0,
    });
  } catch (error) {
    console.error("Failed to fetch properties:", error);
    return NextResponse.json(
      { error: "Failed to fetch properties" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await validateApiKey(request.headers.get("authorization"));
  if (!auth) return unauthorizedResponse();

  try {
    const body = await request.json();
    const { name, type, fallbackValue } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    if (name.length > 100) {
      return NextResponse.json(
        { error: "Name must be 100 characters or less" },
        { status: 400 },
      );
    }

    const validTypes = ["string", "number"] as const;
    const propertyType = validTypes.includes(type) ? type : "string";

    const [created] = await db
      .insert(properties)
      .values({
        name: name.trim(),
        type: propertyType,
        fallbackValue: fallbackValue?.trim() || null,
      })
      .returning();

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("Failed to create property:", error);
    return NextResponse.json(
      { error: "Failed to create property" },
      { status: 500 },
    );
  }
}
