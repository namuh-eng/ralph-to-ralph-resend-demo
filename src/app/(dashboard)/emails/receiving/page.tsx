import { EmailsHeader } from "@/components/emails-header";
import { ReceivingList } from "@/components/receiving-list";
import { db } from "@/lib/db";
import { domains } from "@/lib/db/schema";
import { desc } from "drizzle-orm";

export default async function EmailsReceivingPage() {
  const allDomains = await db
    .select()
    .from(domains)
    .orderBy(desc(domains.createdAt));

  const data = allDomains.map((d) => ({
    id: d.id,
    name: d.name,
    status: d.status as "active" | "pending",
    createdAt: d.createdAt.toISOString(),
  }));

  return (
    <div>
      <EmailsHeader activeTab="receiving" />
      <ReceivingList domains={data} />
    </div>
  );
}
