import { and, desc, eq, lt } from "drizzle-orm";
import { db } from "../client";
import { webhooks } from "../schema";

export const webhookRepo = {
  async findById(id: string) {
    return await db.query.webhooks.findFirst({
      where: eq(webhooks.id, id),
    });
  },

  async create(data: typeof webhooks.$inferInsert) {
    return await db.insert(webhooks).values(data).returning();
  },

  async update(id: string, data: Partial<typeof webhooks.$inferInsert>) {
    return await db
      .update(webhooks)
      .set(data)
      .where(eq(webhooks.id, id))
      .returning();
  },

  async delete(id: string) {
    return await db
      .delete(webhooks)
      .where(eq(webhooks.id, id))
      .returning({ id: webhooks.id });
  },

  async list(options: { limit?: number; after?: string } = {}) {
    const { limit = 20, after } = options;
    const conditions = [];

    if (after) conditions.push(lt(webhooks.id, after));

    const results = await db
      .select()
      .from(webhooks)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(webhooks.id))
      .limit(limit + 1);

    const hasMore = results.length > limit;
    const data = hasMore ? results.slice(0, limit) : results;

    return { data, hasMore };
  },
};
