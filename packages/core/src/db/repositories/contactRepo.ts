import { and, desc, eq, gt, lt, or } from "drizzle-orm";
import { db } from "../client";
import { contacts } from "../schema";

export const contactRepo = {
  async findById(id: string) {
    return await db.query.contacts.findFirst({
      where: eq(contacts.id, id),
    });
  },

  async findByEmail(email: string) {
    return await db.query.contacts.findFirst({
      where: eq(contacts.email, email.toLowerCase().trim()),
    });
  },

  async findByIdOrEmail(idOrEmail: string) {
    return await db.query.contacts.findFirst({
      where: or(eq(contacts.id, idOrEmail), eq(contacts.email, idOrEmail)),
    });
  },

  async create(data: typeof contacts.$inferInsert) {
    return await db.insert(contacts).values(data).returning();
  },

  async update(id: string, data: Partial<typeof contacts.$inferInsert>) {
    return await db
      .update(contacts)
      .set(data)
      .where(eq(contacts.id, id))
      .returning();
  },

  async delete(id: string) {
    return await db
      .delete(contacts)
      .where(eq(contacts.id, id))
      .returning({ id: contacts.id });
  },

  async list(options: { limit?: number; after?: string; where?: any } = {}) {
    const { limit = 40, after, where } = options;
    const conditions = [];
    if (where) conditions.push(where);
    if (after) conditions.push(lt(contacts.id, after));

    const results = await db
      .select()
      .from(contacts)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(contacts.id))
      .limit(limit + 1);

    const hasMore = results.length > limit;
    const data = hasMore ? results.slice(0, limit) : results;

    return { data, hasMore };
  },
};
