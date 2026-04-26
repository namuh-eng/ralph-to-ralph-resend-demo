import { unauthorizedResponse, validateApiKey } from "@/lib/api-auth";
import { deleteDNSRecord, listDNSRecords } from "@/lib/cloudflare";
import { db } from "@/lib/db";
import { domains } from "@/lib/db/schema";
import { deleteDomainIdentity } from "@/lib/ses";
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

    if (body.click_tracking !== undefined)
      updates.trackClicks = body.click_tracking;
    if (body.open_tracking !== undefined)
      updates.trackOpens = body.open_tracking;
    if (body.tracking_subdomain !== undefined)
      updates.trackingSubdomain = body.tracking_subdomain;

    // Support both 'capabilities' array and individual boolean toggles
    if (body.capabilities !== undefined) {
      updates.capabilities = body.capabilities;
    } else if (
      body.sending_enabled !== undefined ||
      body.receiving_enabled !== undefined
    ) {
      // Fetch current capabilities to merge
      const [existing] = await db
        .select({ capabilities: domains.capabilities })
        .from(domains)
        .where(eq(domains.id, id))
        .limit(1);

      if (existing) {
        const currentCaps = existing.capabilities || [
          { name: "sending", enabled: true },
          { name: "receiving", enabled: false },
        ];
        const newCaps = currentCaps.map((cap) => {
          if (cap.name === "sending" && body.sending_enabled !== undefined) {
            return { ...cap, enabled: body.sending_enabled };
          }
          if (
            cap.name === "receiving" &&
            body.receiving_enabled !== undefined
          ) {
            return { ...cap, enabled: body.receiving_enabled };
          }
          return cap;
        });
        updates.capabilities = newCaps;
      }
    }

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

    const [domain] = await db
      .select({ name: domains.name })
      .from(domains)
      .where(eq(domains.id, id))
      .limit(1);

    if (!domain) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Cleanup SES identity
    try {
      await deleteDomainIdentity(domain.name);
    } catch (sesErr) {
      console.warn(`Failed to delete SES identity for ${domain.name}:`, sesErr);
      // Continue even if SES cleanup fails
    }

    // Cleanup Cloudflare DNS records (if configured)
    try {
      const records = await listDNSRecords({ name: domain.name });
      const sesRecords = records.filter(
        (r) =>
          r.content.includes("amazonses.com") ||
          r.name.includes("_domainkey") ||
          r.content.startsWith("v=spf1"),
      );

      await Promise.all(sesRecords.map((r) => deleteDNSRecord(r.id)));
    } catch (cfErr) {
      console.warn(
        `Failed to cleanup Cloudflare records for ${domain.name}:`,
        cfErr,
      );
    }

    const [deleted] = await db
      .delete(domains)
      .where(eq(domains.id, id))
      .returning({ id: domains.id });

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
