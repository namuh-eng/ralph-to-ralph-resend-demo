import { unauthorizedResponse, validateApiKey } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { contacts, segments, topics } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const auth = await validateApiKey(request.headers.get("authorization"));
  if (!auth) return unauthorizedResponse();

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const mappingStr = formData.get("mapping") as string;
    const segmentId = formData.get("segment_id") as string;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const mapping = JSON.parse(mappingStr || "{}") as Record<string, string>;
    const text = await file.text();
    const lines = text.split(/\r?\n/);
    const header = lines[0].split(",");
    const rows = lines.slice(1).filter(l => l.trim() !== "");

    // Resolve segment if provided
    let segmentName = "";
    if (segmentId) {
      const seg = await db.query.segments.findFirst({ where: eq(segments.id, segmentId) });
      if (seg) segmentName = seg.name;
    }

    const createdIds: string[] = [];

    for (const rowText of rows) {
      const values = rowText.split(",");
      const data: Record<string, any> = {};
      const customProps: Record<string, string> = {};

      header.forEach((colName, index) => {
        const mappedKey = mapping[colName];
        if (mappedKey) {
          if (mappedKey === "email") data.email = values[index]?.trim().toLowerCase();
          else if (mappedKey === "first_name") data.firstName = values[index]?.trim();
          else if (mappedKey === "last_name") data.lastName = values[index]?.trim();
          else customProps[mappedKey] = values[index]?.trim();
        }
      });

      if (!data.email) continue;

      // Simple upsert logic
      const existing = await db.query.contacts.findFirst({
        where: eq(contacts.email, data.email),
      });

      if (existing) {
        const currentSegments = (existing.segments as string[]) ?? [];
        const updatedSegments = segmentName && !currentSegments.includes(segmentName) 
          ? [...currentSegments, segmentName] 
          : currentSegments;

        await db.update(contacts)
          .set({
            firstName: data.firstName || existing.firstName,
            lastName: data.lastName || existing.lastName,
            segments: updatedSegments,
            customProperties: { ...(existing.customProperties as any || {}), ...customProps },
          })
          .where(eq(contacts.id, existing.id));
        createdIds.push(existing.id);
      } else {
        const [inserted] = await db.insert(contacts)
          .values({
            email: data.email,
            firstName: data.firstName || null,
            lastName: data.lastName || null,
            segments: segmentName ? [segmentName] : null,
            customProperties: customProps,
          })
          .returning({ id: contacts.id });
        createdIds.push(inserted.id);
      }
    }

    return NextResponse.json({
      object: "import",
      created_count: createdIds.length,
      ids: createdIds,
    });
  } catch (error) {
    console.error("Failed contact import:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
