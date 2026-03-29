import { EmailsSendingPage } from "@/components/emails-sending-page";
import { db } from "@/lib/db";
import { apiKeys, emails } from "@/lib/db/schema";
import { desc } from "drizzle-orm";

export default async function EmailsPage() {
  let keys: { id: string; name: string }[] = [];
  let emailList: {
    id: string;
    to: string[];
    lastEvent: string;
    subject: string;
    createdAt: string;
  }[] = [];

  try {
    const [keysResult, emailsResult] = await Promise.all([
      db
        .select({ id: apiKeys.id, name: apiKeys.name })
        .from(apiKeys)
        .orderBy(desc(apiKeys.createdAt)),
      db
        .select({
          id: emails.id,
          to: emails.to,
          lastEvent: emails.lastEvent,
          subject: emails.subject,
          createdAt: emails.createdAt,
        })
        .from(emails)
        .orderBy(desc(emails.createdAt))
        .limit(100),
    ]);
    keys = keysResult;
    emailList = emailsResult.map((e) => ({
      ...e,
      createdAt: e.createdAt.toISOString(),
    }));
  } catch {
    // DB unavailable — render with empty data
  }

  return <EmailsSendingPage apiKeys={keys} emails={emailList} />;
}
