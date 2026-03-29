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

    const verificationStatus = identity.verified ? "verified" : "pending";

    // Update domain status in DB
    const [updated] = await db
      .update(domains)
      .set({
        status: verificationStatus,
        updatedAt: new Date(),
      })
      .where(eq(domains.id, id))
      .returning();

    return Response.json({
      object: "domain",
      id: updated.id,
      name: updated.name,
      status: updated.status,
      records: updated.records,
      updated_at: updated.updatedAt,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to verify domain";
    return Response.json({ error: message }, { status: 500 });
  }
}
