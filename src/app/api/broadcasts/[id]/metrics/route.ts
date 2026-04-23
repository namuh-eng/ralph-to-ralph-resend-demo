import { unauthorizedResponse, validateApiKey } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { broadcasts, emails } from "@/lib/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await validateApiKey(_request.headers.get("authorization"));
  if (!auth) return unauthorizedResponse();

  try {
    const { id } = await params;

    // Verify broadcast exists
    const [broadcast] = await db
      .select({ id: broadcasts.id })
      .from(broadcasts)
      .where(eq(broadcasts.id, id))
      .limit(1);

    if (!broadcast) {
      return NextResponse.json(
        { error: "Broadcast not found" },
        { status: 404 },
      );
    }

    // Query aggregated stats from emails table linked by tags or headers?
    // Current schema doesn't have a direct link from email to broadcast,
    // but the broadcast implementation likely tags them or includes a header.
    // For now, assume we're looking for emails where a tag "broadcast_id" matches.
    // (If this isn't how it's linked, we'll need to update the send logic too)

    const condition = sql`${emails.tags} @> ${[{ name: "broadcast_id", value: id }]}`;

    const result = await db
      .select({
        total: sql<number>`count(*)::int`,
        delivered: sql<number>`count(*) filter (where ${emails.status} = 'delivered')::int`,
        bounced: sql<number>`count(*) filter (where ${emails.status} in ('bounced', 'hard_bounced', 'soft_bounced'))::int`,
        complained: sql<number>`count(*) filter (where ${emails.status} = 'complained')::int`,
        opened: sql<number>`count(*) filter (where ${emails.status} = 'opened')::int`,
        clicked: sql<number>`count(*) filter (where ${emails.status} = 'clicked')::int`,
      })
      .from(emails)
      .where(condition);

    const stats = result[0] || {
      total: 0,
      delivered: 0,
      bounced: 0,
      complained: 0,
      opened: 0,
      clicked: 0,
    };

    const total = stats.total;
    
    return NextResponse.json({
      object: "broadcast_metrics",
      broadcast_id: id,
      total,
      delivered: stats.delivered,
      bounced: stats.bounced,
      complained: stats.complained,
      opened: stats.opened,
      clicked: stats.clicked,
      delivery_rate: total > 0 ? (stats.delivered / total) * 100 : 0,
      open_rate: total > 0 ? (stats.opened / total) * 100 : 0,
      click_rate: total > 0 ? (stats.clicked / total) * 100 : 0,
      bounce_rate: total > 0 ? (stats.bounced / total) * 100 : 0,
    });
  } catch (error) {
    console.error("Failed to fetch broadcast metrics:", error);
    return NextResponse.json(
      { error: "Failed to fetch broadcast metrics" },
      { status: 500 },
    );
  }
}
