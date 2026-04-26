import { unauthorizedResponse, validateApiKey } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { domains } from "@/lib/db/schema";
import { createDomainIdentity } from "@/lib/ses";
import { and, desc, lt } from "drizzle-orm";
import { NextResponse } from "next/server";

const VALID_REGIONS = ["us-east-1", "eu-west-1", "sa-east-1", "ap-northeast-1"];

export async function POST(request: Request) {
  const auth = await validateApiKey(request.headers.get("authorization"));
  if (!auth) return unauthorizedResponse();

  try {
    const body = await request.json();
    const { name, region = "us-east-1" } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { error: "Domain name is required" },
        { status: 400 },
      );
    }

    const domainName = name.trim().toLowerCase();

    if (!VALID_REGIONS.includes(region)) {
      return NextResponse.json(
        {
          error: `Invalid region. Must be one of: ${VALID_REGIONS.join(", ")}`,
        },
        { status: 400 },
      );
    }

    // 1. Initialize Domain Identity in SES to get DKIM tokens
    const identity = await createDomainIdentity(domainName);

    // 2. Build DNS records for the response
    const dkimRecords = identity.dkimTokens.map((token) => ({
      type: "CNAME",
      name: `${token}._domainkey.${domainName}`,
      value: `${token}.dkim.amazonses.com`,
      status: "pending",
      ttl: "Auto",
    }));

    const spfRecord = {
      type: "TXT",
      name: domainName,
      value: "v=spf1 include:amazonses.com ~all",
      status: "pending",
      ttl: "Auto",
    };

    const mxRecord = {
      type: "MX",
      name: domainName,
      value: `feedback-smtp.${region}.amazonses.com`,
      status: "pending",
      ttl: "Auto",
      priority: 10,
    };

    const allRecords = [...dkimRecords, spfRecord, mxRecord];

    // 3. Store in DB
    const [row] = await db
      .insert(domains)
      .values({
        name: domainName,
        region,
        status: "not_started",
        dkimTokens: identity.dkimTokens,
        records: allRecords,
        customReturnPath: body.custom_return_path || null,
        trackOpens: body.open_tracking ?? false,
        trackClicks: body.click_tracking ?? false,
        trackingSubdomain: body.tracking_subdomain || null,
        tls: body.tls || "opportunistic",
        capabilities: body.capabilities || [
          { name: "sending", enabled: true },
          { name: "receiving", enabled: false },
        ],
      })
      .returning();

    return NextResponse.json(
      {
        object: "domain",
        id: row.id,
        name: row.name,
        status: row.status,
        region: row.region,
        records: row.records || [],
        open_tracking: row.trackOpens,
        click_tracking: row.trackClicks,
        tracking_subdomain: row.trackingSubdomain,
        tls: row.tls,
        capabilities: row.capabilities,
        created_at: row.createdAt,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Failed to create domain:", error);
    return NextResponse.json(
      { error: "Failed to create domain" },
      { status: 500 },
    );
  }
}

export async function GET(request: Request) {
  const auth = await validateApiKey(request.headers.get("authorization"));
  if (!auth) return unauthorizedResponse();

  const url = new URL(request.url);
  const limit = Math.min(
    Math.max(Number(url.searchParams.get("limit")) || 20, 1),
    100,
  );
  const after = url.searchParams.get("after") || "";

  try {
    const conditions = [];
    if (after) {
      conditions.push(lt(domains.id, after));
    }

    const results = await db
      .select()
      .from(domains)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(domains.id))
      .limit(limit + 1);

    const hasMore = results.length > limit;
    const rows = hasMore ? results.slice(0, limit) : results;

    return NextResponse.json({
      object: "list",
      data: rows.map((r) => ({
        id: r.id,
        name: r.name,
        status: r.status,
        region: r.region,
        capabilities: r.capabilities,
        created_at: r.createdAt,
      })),
      has_more: hasMore,
    });
  } catch (error) {
    console.error("Failed to fetch domains:", error);
    return NextResponse.json(
      { error: "Failed to fetch domains" },
      { status: 500 },
    );
  }
}
