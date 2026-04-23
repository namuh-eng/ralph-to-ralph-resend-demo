import { unauthorizedResponse, validateApiKey } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { contactProperties } from "@/lib/db/schema";
import { asc, count } from "drizzle-orm";
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
    const offset = (page - 1) * limit;

    const totalCount = await db.$count(contactProperties);

    const rows = await db
      .select()
      .from(contactProperties)
      .orderBy(asc(contactProperties.key))
      .limit(limit)
      .offset(offset);

    return NextResponse.json({
      data: rows.map((r) => ({
        id: r.id,
        key: r.key,
        name: r.name,
        type: r.type,
        fallback_value: r.fallbackValue,
        created_at: r.createdAt,
        updated_at: r.updatedAt,
      })),
      total: Number(totalCount),
      page,
      limit,
    });
  } catch (error) {
    console.error("Failed to fetch contact properties:", error);
    return NextResponse.json(
      { error: "Failed to fetch contact properties" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await validateApiKey(request.headers.get("authorization"));
  if (!auth) return unauthorizedResponse();

  try {
    const body = await request.json();
    const key = body.key?.trim();
    const name = body.name?.trim();
    const type = body.type || "string";
    const fallbackValue = body.fallback_value || null;

    if (!key || !name) {
      return NextResponse.json(
        { error: "Key and name are required" },
        { status: 400 },
      );
    }

    const [property] = await db
      .insert(contactProperties)
      .values({
        key,
        name,
        type,
        fallbackValue,
      })
      .returning();

    return NextResponse.json(
      {
        id: property.id,
        key: property.key,
        name: property.name,
        type: property.type,
        fallback_value: property.fallbackValue,
        created_at: property.createdAt,
        updated_at: property.updatedAt,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Failed to create contact property:", error);
    return NextResponse.json(
      { error: "Failed to create contact property" },
      { status: 500 },
    );
  }
}
