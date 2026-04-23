import { unauthorizedResponse, validateApiKey } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { contacts, segments } from "@/lib/db/schema";
import { eq, or, sql } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

async function findContact(idOrEmail: string) {
  return await db.query.contacts.findFirst({
    where: or(eq(contacts.id, idOrEmail), eq(contacts.email, idOrEmail)),
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await validateApiKey(request.headers.get("authorization"));
  if (!auth) return unauthorizedResponse();

  try {
    const { id: idOrEmail } = await params;
    const contact = await findContact(idOrEmail);

    if (!contact) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    const contactSegments = (contact.segments as string[]) ?? [];

    // Fetch segment details for the names in the contact's segments array
    const data = await Promise.all(
      contactSegments.map(async (name) => {
        const [seg] = await db
          .select({
            id: segments.id,
            name: segments.name,
            createdAt: segments.createdAt,
          })
          .from(segments)
          .where(eq(segments.name, name))
          .limit(1);
        return seg
          ? { id: seg.id, name: seg.name, created_at: seg.createdAt }
          : null;
      }),
    ).then((results) => results.filter((r) => r !== null));

    return NextResponse.json({
      object: "list",
      data,
      has_more: false,
    });
  } catch (error) {
    console.error("Failed to fetch contact segments:", error);
    return NextResponse.json(
      { error: "Failed to fetch contact segments" },
      { status: 500 },
    );
  }
}
