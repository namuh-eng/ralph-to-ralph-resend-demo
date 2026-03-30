// ABOUTME: Metrics API endpoint — returns aggregated email stats for deliverability, bounce, and complain rates

import { db } from "@/lib/db";
import { emails } from "@/lib/db/schema";
import { and, gte, like, sql } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

const RANGE_MAP: Record<string, number> = {
  today: 0,
  yesterday: 1,
  last_3_days: 3,
  last_7_days: 7,
  last_15_days: 15,
  last_30_days: 30,
};

function getDateRange(range: string): Date {
  const now = new Date();
  const days = RANGE_MAP[range] ?? 15;
  if (range === "yesterday") {
    const d = new Date(now);
    d.setDate(d.getDate() - 1);
    d.setHours(0, 0, 0, 0);
    return d;
  }
  if (range === "today") {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    return d;
  }
  const d = new Date(now);
  d.setDate(d.getDate() - days);
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const range = searchParams.get("range") || "last_15_days";
  const domain = searchParams.get("domain");

  const startDate = getDateRange(range);

  // Build conditions
  const conditions = [gte(emails.createdAt, startDate)];
  if (domain) {
    conditions.push(like(emails.from, `%@${domain}%`));
  }

  // Query aggregated stats
  const result = await db
    .select({
      total: sql<number>`count(*)::int`,
      delivered: sql<number>`count(*) filter (where ${emails.status} = 'delivered')::int`,
      bounced: sql<number>`count(*) filter (where ${emails.status} in ('bounced', 'hard_bounced', 'soft_bounced'))::int`,
      complained: sql<number>`count(*) filter (where ${emails.status} = 'complained')::int`,
    })
    .from(emails)
    .where(and(...conditions));

  const stats = result[0] || {
    total: 0,
    delivered: 0,
    bounced: 0,
    complained: 0,
  };

  const totalEmails = stats.total;
  const deliverabilityRate =
    totalEmails > 0
      ? Math.round((stats.delivered / totalEmails) * 10000) / 100
      : 0;
  const bounceRate =
    totalEmails > 0
      ? Math.round((stats.bounced / totalEmails) * 10000) / 100
      : 0;
  const complainRate =
    totalEmails > 0
      ? Math.round((stats.complained / totalEmails) * 10000) / 100
      : 0;

  // Get unique domains from the emails table
  const domainRows = await db
    .select({
      domain: sql<string>`distinct substring(${emails.from} from '@([^>]+)')`,
    })
    .from(emails)
    .where(gte(emails.createdAt, startDate));

  const domains = domainRows
    .map((r) => r.domain)
    .filter((d): d is string => d !== null && d !== "");

  return NextResponse.json({
    totalEmails,
    deliverabilityRate,
    bounceRate,
    complainRate,
    domains,
    lastUpdated: new Date().toISOString(),
  });
}
