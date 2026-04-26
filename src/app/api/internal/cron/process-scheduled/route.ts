import { processScheduledEmails } from "@/lib/workers/scheduled-emails";
import { NextResponse } from "next/server";

/**
 * GET /api/internal/cron/process-scheduled
 * 
 * Internal cron trigger for processing scheduled emails.
 * Should be called by a task scheduler (e.g. AWS EventBridge, Vercel Cron).
 */
export async function GET(request: Request) {
  // Simple auth check via header (shared secret)
  const authHeader = request.headers.get("x-cron-auth");
  const expectedToken = process.env.CRON_AUTH_TOKEN;

  if (expectedToken && authHeader !== expectedToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await processScheduledEmails();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("Cron: Scheduled email processing failed:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
