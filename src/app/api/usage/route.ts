// ABOUTME: GET /api/usage — returns quota usage data by counting DB records for emails, contacts, segments, domains

import { unauthorizedResponse, validateDashboardKey } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { contacts, domains, emails, segments } from "@/lib/db/schema";
import { count, gte } from "drizzle-orm";
import { NextResponse } from "next/server";

// Dashboard-only internal endpoint
export async function GET(request: Request) {
  const auth = validateDashboardKey(request.headers.get("authorization"));
  if (!auth) return unauthorizedResponse();

  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );

    const [
      monthlyEmails,
      dailyEmails,
      contactCount,
      segmentCount,
      domainCount,
    ] = await Promise.all([
      db
        .select({ count: count() })
        .from(emails)
        .where(gte(emails.createdAt, startOfMonth)),
      db
        .select({ count: count() })
        .from(emails)
        .where(gte(emails.createdAt, startOfDay)),
      db.select({ count: count() }).from(contacts),
      db.select({ count: count() }).from(segments),
      db.select({ count: count() }).from(domains),
    ]);

    return NextResponse.json({
      transactional: {
        monthlyUsed: monthlyEmails[0]?.count ?? 0,
        monthlyLimit: 3000,
        dailyUsed: dailyEmails[0]?.count ?? 0,
        dailyLimit: 100,
      },
      marketing: {
        contactsUsed: contactCount[0]?.count ?? 0,
        contactsLimit: 1000,
        segmentsUsed: segmentCount[0]?.count ?? 0,
        segmentsLimit: 3,
        broadcastsLimit: "Unlimited",
      },
      team: {
        domainsUsed: domainCount[0]?.count ?? 0,
        domainsLimit: 3,
        rateLimit: 2,
      },
    });
  } catch (error) {
    console.error("Failed to fetch usage:", error);
    return NextResponse.json(
      { error: "Failed to fetch usage data" },
      { status: 500 },
    );
  }
}
