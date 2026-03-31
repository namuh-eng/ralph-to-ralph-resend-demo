import { unauthorizedResponse, validateApiKey } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { templates } from "@/lib/db/schema";
import { type SQL, and, count, desc, eq, ilike } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

function generateAlias(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "untitled-template"
  );
}

export async function GET(request: NextRequest) {
  const auth = await validateApiKey(request.headers.get("authorization"));
  if (!auth) return unauthorizedResponse();

  try {
    const url = request.nextUrl;
    const search = url.searchParams.get("search")?.trim() || "";
    const status = url.searchParams.get("status")?.trim() || "";

    const conditions: SQL[] = [];
    if (search) {
      conditions.push(ilike(templates.name, `%${search}%`));
    }
    if (status === "published") {
      conditions.push(eq(templates.status, "published"));
    } else if (status === "draft") {
      conditions.push(eq(templates.status, "draft"));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [totalRow] = await db
      .select({ count: count() })
      .from(templates)
      .where(whereClause);

    const rows = await db
      .select({
        id: templates.id,
        name: templates.name,
        alias: templates.alias,
        status: templates.status,
        html: templates.html,
        createdAt: templates.createdAt,
      })
      .from(templates)
      .where(whereClause)
      .orderBy(desc(templates.createdAt))
      .limit(200);

    return NextResponse.json({
      data: rows.map((r) => ({
        ...r,
        published: r.status === "published",
      })),
      total: totalRow?.count ?? 0,
    });
  } catch (error) {
    console.error("Failed to fetch templates:", error);
    return NextResponse.json(
      { error: "Failed to fetch templates" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await validateApiKey(request.headers.get("authorization"));
  if (!auth) return unauthorizedResponse();

  try {
    const body = await request.json();
    const name = body.name?.trim() || "Untitled Template";
    const alias = generateAlias(name);

    const [template] = await db
      .insert(templates)
      .values({ name, alias })
      .returning();

    return NextResponse.json(
      { ...template, published: template.status === "published" },
      { status: 201 },
    );
  } catch (error) {
    console.error("Failed to create template:", error);
    return NextResponse.json(
      { error: "Failed to create template" },
      { status: 500 },
    );
  }
}
