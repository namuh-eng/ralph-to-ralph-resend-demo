import { eq, and, desc, lt } from "drizzle-orm";
import { db } from "../client";
import { logs } from "../schema";

export const logRepo = {
  async findById(id: string) {
    return await db.query.logs.findFirst({
      where: eq(logs.id, id),
    });
  },

  async create(data: typeof logs.$inferInsert) {
    return await db.insert(logs).values(data).returning();
  },

  async list(options: { limit?: number; after?: string; status?: number; method?: string } = {}) {
    const { limit = 20, after, status, method } = options;
    const conditions = [];

    if (status) conditions.push(eq(logs.status, status));
    if (method) conditions.push(eq(logs.method, method));
    if (after) conditions.push(lt(logs.id, after));

    const results = await db
      .select()
      .from(logs)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(logs.id))
      .limit(limit + 1);

    const hasMore = results.length > limit;
    const data = hasMore ? results.slice(0, limit) : results;

    return { data, hasMore };
  }
};
