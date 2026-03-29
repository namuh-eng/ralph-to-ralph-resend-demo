import { unauthorizedResponse, validateApiKey } from "@/lib/api-auth";
import { autoConfigureDomain } from "@/lib/cloudflare";
import { db } from "@/lib/db";
import { domains } from "@/lib/db/schema";
import { createDomainIdentity, getDomainIdentity } from "@/lib/ses";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function POST(
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

    // Step 1: Create domain identity in SES (gets DKIM tokens)
    let dkimTokens: string[];
    try {
      const identity = await createDomainIdentity(domain.name);
      dkimTokens = identity.dkimTokens;
    } catch {
      // Identity may already exist — try to get existing DKIM tokens
      const existing = await getDomainIdentity(domain.name);
      dkimTokens = existing.dkimTokens;
    }

    // Step 2: Auto-configure DNS records via Cloudflare
    const cfRecords = await autoConfigureDomain(domain.name, dkimTokens);

    // Step 3: Build records array for DB storage
    const dkimRecords = dkimTokens.map((token, i) => ({
      type: "CNAME" as const,
      name: `${token}._domainkey.${domain.name}`,
      value: `${token}.dkim.amazonses.com`,
      status: "pending" as const,
      ttl: "Auto",
    }));

    const spfRecord = {
      type: "TXT" as const,
      name: domain.name,
      value: "v=spf1 include:amazonses.com ~all",
      status: "pending" as const,
      ttl: "Auto",
    };

    const mxRecord = {
      type: "MX" as const,
      name: domain.name,
      value: "feedback-smtp.us-east-1.amazonses.com",
      status: "pending" as const,
      ttl: "Auto",
      priority: 10,
    };

    const allRecords = [...dkimRecords, spfRecord, mxRecord];

    // Step 4: Update domain in DB with records and pending status
    await db
      .update(domains)
      .set({
        records: allRecords,
        status: "pending",
        updatedAt: new Date(),
      })
      .where(eq(domains.id, id));

    return NextResponse.json({
      ok: true,
      records: allRecords,
      cloudflare_records: cfRecords.length,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: "Auto-configure failed", details: message },
      { status: 500 },
    );
  }
}
