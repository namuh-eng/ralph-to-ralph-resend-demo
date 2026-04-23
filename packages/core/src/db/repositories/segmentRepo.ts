import { eq, and, desc, ilike, lt } from "drizzle-orm";
import { db } from "../client";
import { segments } from "../schema";

export const segmentRepo = {
  async findById(id: string) {
    return await db.query.segments.findFirst({
      where: eq(segments.id, id),
    });
  },

  async findByName(name: string) {
    return await db.query.segments.findFirst({
      where: eq(segments.name, name),
    });
  },

  async create(data: typeof segments.$inferInsert) {
    return await db.insert(segments).values(data).returning();
  },

  async delete(id: string) {
    return await db.delete(segments).where(eq(segments.id, id)).returning();
  },

  async list(options: { limit?: number; after?: string; search?: string } = {}) {
    const { limit = 20, after, search } = options;
    const conditions = [];

    if (search) conditions.push(ilike(segments.name, `%${search}%`));
    if (after) conditions.push(lt(segments.id, after));

    const results = await db
      .select()
      .from(segments)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(segments.id))
      .limit(limit + 1);

    const hasMore = results.length > limit;
    const data = hasMore ? results.slice(0, limit) : results;

    return { data, hasMore };
  }
};
