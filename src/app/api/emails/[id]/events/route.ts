import { unauthorizedResponse, validateApiKey } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { emailEvents } from "@/lib/db/schema";
import { asc, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await validateApiKey(_request.headers.get("authorization"));
  if (!auth) return unauthorizedResponse();

  try {
    const { id: emailId } = await params;

    const results = await db
      .select()
      .from(emailEvents)
      .where(eq(emailEvents.emailId, emailId))
      .orderBy(asc(emailEvents.receivedAt));

    return NextResponse.json({
      object: "list",
      data: results.map((e) => ({
        object: "email_event",
        id: e.id,
        type: e.type,
        payload: e.payload,
        created_at: e.receivedAt,
      })),
    });
  } catch (error) {
    console.error("Failed to fetch email events:", error);
    return NextResponse.json(
      { error: "Failed to fetch email events" },
      { status: 500 },
    );
  }
}
