import { and, asc, desc, eq, isNull, lt, lte, or } from "drizzle-orm";
import { db } from "../client";
import { webhookDeliveries } from "../schema";

export const webhookDeliveryRepo = {
  async findById(id: string) {
    return await db.query.webhookDeliveries.findFirst({
      where: eq(webhookDeliveries.id, id),
    });
  },

  async create(data: typeof webhookDeliveries.$inferInsert) {
    const results = await db.insert(webhookDeliveries).values(data).returning();
    return results[0];
  },

  async update(
    id: string,
    data: Partial<typeof webhookDeliveries.$inferInsert>,
  ) {
    const results = await db
      .update(webhookDeliveries)
      .set(data)
      .where(eq(webhookDeliveries.id, id))
      .returning();
    return results[0];
  },

  async listByWebhookId(
    webhookId: string,
    options: { limit?: number; after?: string } = {},
  ) {
    const { limit = 20, after } = options;
    const conditions = [eq(webhookDeliveries.webhookId, webhookId)];

    if (after) conditions.push(lt(webhookDeliveries.id, after));

    const results = await db
      .select()
      .from(webhookDeliveries)
      .where(and(...conditions))
      .orderBy(desc(webhookDeliveries.id))
      .limit(limit + 1);

    const hasMore = results.length > limit;
    const data = hasMore ? results.slice(0, limit) : results;

    return { data, hasMore };
  },

  async findDispatchable(options: { limit?: number; now?: Date } = {}) {
    const { limit = 25, now = new Date() } = options;

    return await db
      .select()
      .from(webhookDeliveries)
      .where(
        and(
          eq(webhookDeliveries.status, "pending"),
          or(
            isNull(webhookDeliveries.nextRetryAt),
            lte(webhookDeliveries.nextRetryAt, now),
          ),
        ),
      )
      .orderBy(
        asc(webhookDeliveries.nextRetryAt),
        asc(webhookDeliveries.createdAt),
      )
      .limit(limit);
  },
};
