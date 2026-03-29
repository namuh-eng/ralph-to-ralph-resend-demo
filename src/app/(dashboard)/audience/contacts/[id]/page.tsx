import { ContactDetail } from "@/components/contact-detail";
import { db } from "@/lib/db";
import {
  contactSegments,
  contactTopics,
  contacts,
  segments,
  topics,
} from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";

export default async function ContactDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  try {
    const [contact] = await db
      .select()
      .from(contacts)
      .where(eq(contacts.id, id))
      .limit(1);

    if (!contact) {
      notFound();
    }

    // Fetch segments
    const segmentRows = await db
      .select({
        id: segments.id,
        name: segments.name,
      })
      .from(contactSegments)
      .innerJoin(segments, eq(segments.id, contactSegments.segmentId))
      .where(eq(contactSegments.contactId, id));

    // Fetch topics
    const topicRows = await db
      .select({
        id: topics.id,
        name: topics.name,
      })
      .from(contactTopics)
      .innerJoin(topics, eq(topics.id, contactTopics.topicId))
      .where(eq(contactTopics.contactId, id));

    const contactData = {
      id: contact.id,
      email: contact.email,
      firstName: contact.firstName,
      lastName: contact.lastName,
      status: (contact.unsubscribed ? "unsubscribed" : "subscribed") as
        | "subscribed"
        | "unsubscribed",
      segments: segmentRows,
      topics: topicRows,
      properties: (contact.properties || {}) as Record<string, string>,
      createdAt: contact.createdAt.toISOString(),
      activity: [
        {
          type: "Contact created",
          timestamp: contact.createdAt.toISOString(),
        },
      ],
    };

    return <ContactDetail contact={contactData} />;
  } catch {
    notFound();
  }
}
