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

  const { id } = await params;

  try {
    const rows = await db
      .select()
      .from(domains)
      .where(eq(domains.id, id))
      .limit(1);

    if (rows.length === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const domain = rows[0];
    return NextResponse.json({
      id: domain.id,
      name: domain.name,
      status: domain.status,
      region: domain.region,
      created_at: domain.createdAt.toISOString(),
      click_tracking: domain.clickTracking,
      open_tracking: domain.openTracking,
      tls: domain.tls,
      records: domain.records,
    });
  } catch {
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

  const { id } = await params;

  try {
    const body = await req.json();
    const updates: Record<string, unknown> = {};

    if (body.click_tracking !== undefined) {
      updates.clickTracking = body.click_tracking;
    }
    if (body.open_tracking !== undefined) {
      updates.openTracking = body.open_tracking;
    }
    if (body.tls !== undefined) {
      const val = body.tls;
      if (val === "opportunistic" || val === "enforced") {
        updates.tls = val;
      }
    }
    if (body.sending_enabled !== undefined) {
      updates.sendingEnabled = body.sending_enabled;
    }
    if (body.receiving_enabled !== undefined) {
      updates.receivingEnabled = body.receiving_enabled;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No valid fields" }, { status: 400 });
    }

    updates.updatedAt = new Date();

    await db.update(domains).set(updates).where(eq(domains.id, id));

    return NextResponse.json({ ok: true });
  } catch {
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

  const { id } = await params;

  try {
    await db.delete(domains).where(eq(domains.id, id));
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
