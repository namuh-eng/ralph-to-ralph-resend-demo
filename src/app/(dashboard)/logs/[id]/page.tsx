import { LogDetail } from "@/components/log-detail";
import { db } from "@/lib/db";
import { logs } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";

export default async function LogDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  try {
    const [logResult] = await db
      .select()
      .from(logs)
      .where(eq(logs.id, id))
      .limit(1);

    if (!logResult) {
      notFound();
    }

    const logData = {
      id: logResult.id,
      method: logResult.method,
      path: logResult.path,
      statusCode: logResult.statusCode,
      duration: logResult.duration,
      apiKeyId: logResult.apiKeyId,
      requestBody: logResult.requestBody as Record<string, unknown> | null,
      responseBody: logResult.responseBody as Record<string, unknown> | null,
      createdAt: logResult.createdAt.toISOString(),
    };

    return <LogDetail log={logData} />;
  } catch {
    notFound();
  }
}
