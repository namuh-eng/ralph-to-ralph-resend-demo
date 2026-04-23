import { eq, desc, lt, gt, and } from "drizzle-orm";
import { db } from "../client";
import { emails } from "../schema";

export const emailRepo = {
  async findById(id: string) {
    return await db.query.emails.findFirst({
      where: eq(emails.id, id),
    });
  },

  async findByIdempotencyKey(key: string) {
    return await db.query.emails.findFirst({
      where: eq(emails.idempotencyKey, key),
    });
  },

  async create(data: typeof emails.$inferInsert) {
    return await db.insert(emails).values(data).returning();
  },

  async update(id: string, data: Partial<typeof emails.$inferInsert>) {
    return await db.update(emails).set(data).where(eq(emails.id, id)).returning();
  },

  async list(options: { limit?: number; after?: string; before?: string } = {}) {
    const { limit = 20, after, before } = options;
    
    let query = db.select().from(emails);
    const conditions = [];

    if (after) conditions.push(gt(emails.id, after));
    else if (before) conditions.push(lt(emails.id, before));

    const results = await db
      .select()
      .from(emails)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(emails.createdAt))
      .limit(limit + 1);

    const hasMore = results.length > limit;
    const data = hasMore ? results.slice(0, limit) : results;

    return { data, hasMore };
  }
};
