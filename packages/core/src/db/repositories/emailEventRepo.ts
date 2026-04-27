import { and, desc, eq, lt } from "drizzle-orm";
import { db } from "../client";
import { emailEvents } from "../schema";

export const emailEventRepo = {
  async findById(id: string) {
    return await db.query.emailEvents.findFirst({
      where: eq(emailEvents.id, id),
    });
  },

  async create(data: typeof emailEvents.$inferInsert) {
    const results = await db.insert(emailEvents).values(data).returning();
    return results[0];
  },

  async listByEmailId(emailId: string) {
    return await db
      .select()
      .from(emailEvents)
      .where(eq(emailEvents.emailId, emailId))
      .orderBy(desc(emailEvents.receivedAt));
  },
};
