import { unauthorizedResponse, validateApiKey } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { domains } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await validateApiKey(_req.headers.get("authorization"));
  if (!auth) return unauthorizedResponse();

  try {
    const { id } = await params;
    const [domain] = await db
      .select()
      .from(domains)
      .where(eq(domains.id, id))
      .limit(1);

    if (!domain) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({
      object: "domain",
      id: domain.id,
      name: domain.name,
      status: domain.status,
      region: domain.region,
      records: domain.records || [],
      open_tracking: domain.trackOpens,
      click_tracking: domain.trackClicks,
      tracking_subdomain: domain.trackingSubdomain,
      tls: domain.tls,
      capabilities: domain.capabilities,
      created_at: domain.createdAt,
    });
  } catch (error) {
    console.error("Failed to retrieve domain:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await validateApiKey(req.headers.get("authorization"));
  if (!auth) return unauthorizedResponse();

  try {
    const { id } = await params;
    const body = await req.json();
    const updates: Record<string, unknown> = {};

    if (body.click_tracking !== undefined) updates.trackClicks = body.click_tracking;
    if (body.open_tracking !== undefined) updates.trackOpens = body.open_tracking;
    if (body.tracking_subdomain !== undefined) updates.trackingSubdomain = body.tracking_subdomain;
    if (body.capabilities !== undefined) updates.capabilities = body.capabilities;
    if (body.tls !== undefined) {
      const val = body.tls;
      if (val === "opportunistic" || val === "enforced") {
        updates.tls = val;
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No valid fields" }, { status: 400 });
    }

    const [updated] = await db
      .update(domains)
      .set(updates)
      .where(eq(domains.id, id))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({
      object: "domain",
      id: updated.id,
    });
  } catch (error) {
    console.error("Failed to update domain:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await validateApiKey(_req.headers.get("authorization"));
  if (!auth) return unauthorizedResponse();

  try {
    const { id } = await params;
    const [deleted] = await db
      .delete(domains)
      .where(eq(domains.id, id))
      .returning({ id: domains.id });

    if (!deleted) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({
      object: "domain",
      id: deleted.id,
      deleted: true,
    });
  } catch (error) {
    console.error("Failed to delete domain:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
