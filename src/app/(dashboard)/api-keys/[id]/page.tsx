import { ApiKeyDetail } from "@/components/api-key-detail";
import { db } from "@/lib/db";
import { apiKeys, domains } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";

export default async function ApiKeyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [keyResult] = await db
    .select({
      id: apiKeys.id,
      name: apiKeys.name,
      tokenPreview: apiKeys.tokenPreview,
      permission: apiKeys.permission,
      domain: apiKeys.domain,
      createdAt: apiKeys.createdAt,
    })
    .from(apiKeys)
    .where(eq(apiKeys.id, id))
    .limit(1);

  if (!keyResult) {
    notFound();
  }

  // Fetch domain name
  const [domainResult, domainList] = await Promise.all([
    keyResult.domain
      ? db
          .select({ name: domains.name })
          .from(domains)
          .where(eq(domains.name, keyResult.domain))
          .limit(1)
      : Promise.resolve([]),
    db
      .select({ id: domains.id, name: domains.name })
      .from(domains)
      .orderBy(domains.name),
  ]);

  const domainName = domainResult[0]?.name ?? "All domains";

  return (
    <ApiKeyDetail
      apiKey={{
        id: keyResult.id,
        name: keyResult.name,
        tokenPreview: keyResult.tokenPreview ?? "",
        permission: keyResult.permission as "full_access" | "sending_access",
        domain: keyResult.domain,
        domainName,
        totalUses: 0,
        lastUsedAt: keyResult.createdAt.toISOString(),
        createdAt: keyResult.createdAt.toISOString(),
        creatorEmail: "",
      }}
      domains={domainList}
    />
  );
}
