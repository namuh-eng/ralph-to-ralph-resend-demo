import { unauthorizedResponse, validateApiKey } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { domains } from "@/lib/db/schema";
import { getDomainIdentity } from "@/lib/ses";
import { eq } from "drizzle-orm";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const auth = await validateApiKey(request.headers.get("authorization"));
  if (!auth) return unauthorizedResponse();

  const { id } = await params;

  try {
    const domain = await db.query.domains.findFirst({
      where: eq(domains.id, id),
    });

    if (!domain) {
      return Response.json({ error: "Domain not found" }, { status: 404 });
    }

    // Check verification status with SES
    const identity = await getDomainIdentity(domain.name);

    // Identity from ses.ts (mocked or real) provides verified boolean,
    // plus often richer data if we expand the SES wrapper.
    // For parity, we simulate multi-state inspection of the record state.
    
    let verificationStatus: "pending" | "verified" | "partially_verified" | "failed" | "temporary_failure" = "pending";

    if (identity.verified) {
      verificationStatus = "verified";
    } else {
      // Simulate checking if some records passed but not all
      const records = (domain.records as any[]) ?? [];
      const verifiedCount = records.filter(r => r.status === "verified").length;
      
      if (verifiedCount > 0 && verifiedCount < records.length) {
        verificationStatus = "partially_verified";
      } else if (verifiedCount === 0 && records.length > 0) {
        // Only mark as failed if explicitly checked and nothing found
        verificationStatus = "pending";
      }
    }

    // Update domain status in DB
    const [updated] = await db
      .update(domains)
      .set({
        status: verificationStatus,
      })
      .where(eq(domains.id, id))
      .returning();

    // Fire webhook (placeholder until delivery worker implemented)

    return Response.json({
      object: "domain",
      id: updated.id,
      name: updated.name,
      status: updated.status,
      records: updated.records || [],
      created_at: updated.createdAt,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to verify domain";
    return Response.json({ error: message }, { status: 500 });
  }
}
