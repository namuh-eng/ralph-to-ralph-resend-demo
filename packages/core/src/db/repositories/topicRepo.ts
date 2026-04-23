import { and, desc, eq, ilike, lt } from "drizzle-orm";
import { db } from "../client";
import { topics } from "../schema";

export const topicRepo = {
  async findById(id: string) {
    return await db.query.topics.findFirst({
      where: eq(topics.id, id),
    });
  },

  async create(data: typeof topics.$inferInsert) {
    return await db.insert(topics).values(data).returning();
  },

  async update(id: string, data: Partial<typeof topics.$inferInsert>) {
    return await db
      .update(topics)
      .set(data)
      .where(eq(topics.id, id))
      .returning();
  },

  async delete(id: string) {
    return await db.delete(topics).where(eq(topics.id, id)).returning();
  },

  async list(
    options: { limit?: number; after?: string; search?: string } = {},
  ) {
    const { limit = 20, after, search } = options;
    const conditions = [];

    if (search) conditions.push(ilike(topics.name, `%${search}%`));
    if (after) conditions.push(lt(topics.id, after));

    const results = await db
      .select()
      .from(topics)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(topics.id))
      .limit(limit + 1);

    const hasMore = results.length > limit;
    const data = hasMore ? results.slice(0, limit) : results;

    return { data, hasMore };
  },
};
