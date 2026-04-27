import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "../client";
import { emailEvents, emails } from "../schema";

export const emailEventRepo = {
  async create(data: typeof emailEvents.$inferInsert) {
    return await db.transaction(async (tx) => {
      // 1. Insert event
      const [event] = await tx.insert(emailEvents).values(data).returning();
      
      // 2. Update email status based on type
      let nextStatus: string | null = null;
      if (data.type === "delivered") nextStatus = "delivered";
      if (data.type === "bounced") nextStatus = "bounced";
      if (data.type === "complained") nextStatus = "complained";
      
      if (nextStatus) {
        await tx.update(emails)
          .set({ status: nextStatus })
          .where(eq(emails.id, data.emailId));
      }
      
      return event;
    });
  },

  async listByEmailId(emailId: string) {
    return await db.select()
      .from(emailEvents)
      .where(eq(emailEvents.emailId, emailId))
      .orderBy(desc(emailEvents.receivedAt));
  }
};
