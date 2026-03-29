import { DomainDetail } from "@/components/domain-detail";
import { db } from "@/lib/db";
import { domains } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";

interface DomainEvent {
  type: string;
  timestamp: string;
}

export default async function DomainDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  type DomainRow = typeof domains.$inferSelect;
  let domain: DomainRow;
  try {
    const rows = await db
      .select()
      .from(domains)
      .where(eq(domains.id, id))
      .limit(1);

    if (rows.length === 0) {
      notFound();
    }
    domain = rows[0];
  } catch {
    notFound();
  }

  const events: DomainEvent[] = [];
  events.push({
    type: "domain_added",
    timestamp: domain.createdAt.toISOString(),
  });

  if (
    domain.status === "verified" ||
    domain.status === "pending" ||
    domain.status === "temporary_failure"
  ) {
    const dnsTime = new Date(domain.createdAt.getTime() + 60000);
    events.push({
      type: "dns_verified",
      timestamp: dnsTime.toISOString(),
    });
  }

  if (domain.status === "verified") {
    const verifiedTime = new Date(domain.createdAt.getTime() + 120000);
    events.push({
      type: "domain_verified",
      timestamp: verifiedTime.toISOString(),
    });
  }

  return (
    <DomainDetail
      domain={{
        id: domain.id,
        name: domain.name,
        status: domain.status,
        region: domain.region,
        createdAt: domain.createdAt.toISOString(),
        clickTracking: domain.clickTracking,
        openTracking: domain.openTracking,
        tls: domain.tls,
        records: domain.records ?? null,
        events,
      }}
    />
  );
}
