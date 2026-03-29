import { EmailsSendingPage } from "@/components/emails-sending-page";
import { db } from "@/lib/db";
import { apiKeys } from "@/lib/db/schema";
import { desc } from "drizzle-orm";

export default async function EmailsPage() {
  let keys: { id: string; name: string }[] = [];
  try {
    keys = await db
      .select({ id: apiKeys.id, name: apiKeys.name })
      .from(apiKeys)
      .orderBy(desc(apiKeys.createdAt));
  } catch {
    // DB unavailable — render with empty keys
  }

  return <EmailsSendingPage apiKeys={keys} />;
}
