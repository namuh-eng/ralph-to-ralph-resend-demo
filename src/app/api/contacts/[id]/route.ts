import { unauthorizedResponse, validateApiKey } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { contacts } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const auth = await validateApiKey(request.headers.get("authorization"));
  if (!auth) return unauthorizedResponse();

  const { id } = await params;

  try {
    const contact = await db.query.contacts.findFirst({
      where: eq(contacts.id, id),
      with: {
        segments: {
          with: { segment: true },
        },
        topics: {
          with: { topic: true },
        },
      },
    });

    if (!contact) {
      return Response.json({ error: "Contact not found" }, { status: 404 });
    }

    return Response.json({
      object: "contact",
      id: contact.id,
      email: contact.email,
      first_name: contact.firstName,
      last_name: contact.lastName,
      unsubscribed: contact.unsubscribed,
      properties: contact.properties,
      segments: contact.segments.map((cs) => ({
        id: cs.segment.id,
        name: cs.segment.name,
      })),
      topics: contact.topics.map((ct) => ({
        id: ct.topic.id,
        name: ct.topic.name,
        subscribed: ct.subscribed,
      })),
      created_at: contact.createdAt,
      updated_at: contact.updatedAt,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to retrieve contact";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const auth = await validateApiKey(request.headers.get("authorization"));
  if (!auth) return unauthorizedResponse();

  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (body.email !== undefined) updateData.email = body.email;
    if (body.first_name !== undefined) updateData.firstName = body.first_name;
    if (body.last_name !== undefined) updateData.lastName = body.last_name;
    if (body.unsubscribed !== undefined)
      updateData.unsubscribed = body.unsubscribed;
    if (body.properties !== undefined) updateData.properties = body.properties;

    const [updated] = await db
      .update(contacts)
      .set(updateData)
      .where(eq(contacts.id, id))
      .returning();

    if (!updated) {
      return Response.json({ error: "Contact not found" }, { status: 404 });
    }

    return Response.json({
      object: "contact",
      id: updated.id,
      email: updated.email,
      first_name: updated.firstName,
      last_name: updated.lastName,
      unsubscribed: updated.unsubscribed,
      properties: updated.properties,
      created_at: updated.createdAt,
      updated_at: updated.updatedAt,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to update contact";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const auth = await validateApiKey(request.headers.get("authorization"));
  if (!auth) return unauthorizedResponse();

  const { id } = await params;

  try {
    const [deleted] = await db
      .delete(contacts)
      .where(eq(contacts.id, id))
      .returning({ id: contacts.id });

    if (!deleted) {
      return Response.json({ error: "Contact not found" }, { status: 404 });
    }

    return Response.json({ success: true });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to delete contact";
    return Response.json({ error: message }, { status: 500 });
  }
}
