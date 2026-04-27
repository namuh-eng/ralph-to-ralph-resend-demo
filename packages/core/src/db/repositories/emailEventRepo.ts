import { desc, eq } from "drizzle-orm";
import { db } from "../client";
import { emailEvents, emails } from "../schema";

const STATUS_BY_EVENT_TYPE: Record<string, string> = {
  delivered: "delivered",
  bounced: "bounced",
  complained: "complained",
};

export const emailEventRepo = {
  async findById(id: string) {
    return await db.query.emailEvents.findFirst({
      where: eq(emailEvents.id, id),
    });
  },

  async create(data: typeof emailEvents.$inferInsert) {
    return await db.transaction(async (tx) => {
      const [event] = await tx.insert(emailEvents).values(data).returning();
      const nextStatus = STATUS_BY_EVENT_TYPE[data.type];

      if (nextStatus) {
        await tx
          .update(emails)
          .set({ status: nextStatus })
          .where(eq(emails.id, data.emailId));
      }

      return event;
    });
  },

  async listByEmailId(emailId: string) {
    return await db
      .select()
      .from(emailEvents)
      .where(eq(emailEvents.emailId, emailId))
      .orderBy(desc(emailEvents.receivedAt));
  },
};
