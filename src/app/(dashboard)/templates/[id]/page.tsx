import { TemplateDetail } from "@/components/template-detail";
import { db } from "@/lib/db";
import { templates } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";

export default async function TemplateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  try {
    const [template] = await db
      .select()
      .from(templates)
      .where(eq(templates.id, id))
      .limit(1);

    if (!template) {
      notFound();
    }

    const templateData = {
      id: template.id,
      name: template.name,
      alias: template.alias,
      from: template.from,
      subject: template.subject,
      html: template.html,
      text: template.text,
      published: template.published,
      variables: template.variables ?? [],
      createdAt: template.createdAt.toISOString(),
      updatedAt: template.updatedAt.toISOString(),
    };

    return <TemplateDetail template={templateData} />;
  } catch {
    notFound();
  }
}
