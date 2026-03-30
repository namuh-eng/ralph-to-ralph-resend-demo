// ABOUTME: Metrics API endpoint — returns aggregated email stats, daily chart data, and per-domain breakdown

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

// Map event type filter values to email status values
const EVENT_TYPE_TO_STATUS: Record<string, string[]> = {
  received: ["delivered", "opened", "clicked"],
  delivered: ["delivered"],
  opened: ["opened"],
  clicked: ["clicked"],
  bounced: ["bounced", "hard_bounced", "soft_bounced"],
  complained: ["complained"],
  unsubscribed: ["unsubscribed"],
  delivery_delayed: ["delivery_delayed"],
  failed: ["failed"],
  suppressed: ["suppressed"],
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
  const eventType = searchParams.get("event_type");

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
      hard_bounced: sql<number>`count(*) filter (where ${emails.status} = 'hard_bounced')::int`,
      soft_bounced: sql<number>`count(*) filter (where ${emails.status} = 'soft_bounced')::int`,
      undetermined_bounced: sql<number>`count(*) filter (where ${emails.status} = 'bounced')::int`,
      complained: sql<number>`count(*) filter (where ${emails.status} = 'complained')::int`,
    })
    .from(emails)
    .where(and(...conditions));

  const stats = result[0] || {
    total: 0,
    delivered: 0,
    bounced: 0,
    hard_bounced: 0,
    soft_bounced: 0,
    undetermined_bounced: 0,
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

  // Build daily chart query — optionally filtered by event type
  const dailyConditions = [...conditions];
  if (eventType && eventType !== "all" && EVENT_TYPE_TO_STATUS[eventType]) {
    const statuses = EVENT_TYPE_TO_STATUS[eventType];
    const statusList = statuses.map((s) => `'${s}'`).join(",");
    dailyConditions.push(sql`${emails.status} in (${sql.raw(statusList)})`);
  }

  const dailyRows = await db
    .select({
      date: sql<string>`to_char(${emails.createdAt}::date, 'YYYY-MM-DD')`,
      count: sql<number>`count(*)::int`,
    })
    .from(emails)
    .where(and(...dailyConditions))
    .groupBy(sql`${emails.createdAt}::date`)
    .orderBy(sql`${emails.createdAt}::date`);

  const dailyData = dailyRows.map((r) => ({
    date: r.date,
    count: r.count,
  }));

  // Daily bounce rate data (percentage per day)
  const dailyBounceRows = await db
    .select({
      date: sql<string>`to_char(${emails.createdAt}::date, 'YYYY-MM-DD')`,
      total: sql<number>`count(*)::int`,
      bounced: sql<number>`count(*) filter (where ${emails.status} in ('bounced', 'hard_bounced', 'soft_bounced'))::int`,
    })
    .from(emails)
    .where(and(...conditions))
    .groupBy(sql`${emails.createdAt}::date`)
    .orderBy(sql`${emails.createdAt}::date`);

  const dailyBounceData = dailyBounceRows.map((r) => ({
    date: r.date,
    rate: r.total > 0 ? Math.round((r.bounced / r.total) * 10000) / 100 : 0,
  }));

  // Daily complain rate data (percentage per day)
  const dailyComplainRows = await db
    .select({
      date: sql<string>`to_char(${emails.createdAt}::date, 'YYYY-MM-DD')`,
      total: sql<number>`count(*)::int`,
      complained: sql<number>`count(*) filter (where ${emails.status} = 'complained')::int`,
    })
    .from(emails)
    .where(and(...conditions))
    .groupBy(sql`${emails.createdAt}::date`)
    .orderBy(sql`${emails.createdAt}::date`);

  const dailyComplainData = dailyComplainRows.map((r) => ({
    date: r.date,
    rate: r.total > 0 ? Math.round((r.complained / r.total) * 10000) / 100 : 0,
  }));

  // Per-domain breakdown
  const domainBreakdownRows = await db
    .select({
      domain: sql<string>`substring(${emails.from} from '@([^>]+)')`,
      total: sql<number>`count(*)::int`,
      delivered: sql<number>`count(*) filter (where ${emails.status} = 'delivered')::int`,
    })
    .from(emails)
    .where(and(...conditions))
    .groupBy(sql`substring(${emails.from} from '@([^>]+)')`)
    .orderBy(sql`count(*) desc`);

  const domainBreakdown = domainBreakdownRows
    .filter((r) => r.domain !== null && r.domain !== "")
    .map((r) => ({
      domain: r.domain,
      count: r.total,
      rate: r.total > 0 ? Math.round((r.delivered / r.total) * 10000) / 100 : 0,
    }));

  // Get unique domain names for the filter
  const domains = domainBreakdown.map((d) => d.domain);

  return NextResponse.json({
    totalEmails,
    deliverabilityRate,
    bounceRate,
    complainRate,
    domains,
    dailyData,
    domainBreakdown,
    bounceBreakdown: {
      permanent: stats.hard_bounced,
      transient: stats.soft_bounced,
      undetermined: stats.undetermined_bounced,
    },
    dailyBounceData,
    complained: stats.complained,
    dailyComplainData,
    lastUpdated: new Date().toISOString(),
  });
}
