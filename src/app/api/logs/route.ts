import { unauthorizedResponse, validateApiKey } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { logs } from "@/lib/db/schema";
import { type SQL, and, desc, eq, gte, lte } from "drizzle-orm";

export async function GET(request: Request): Promise<Response> {
  const auth = await validateApiKey(request.headers.get("authorization"));
  if (!auth) return unauthorizedResponse();

  const url = new URL(request.url);
  const limit = Math.min(
    Math.max(Number(url.searchParams.get("limit")) || 20, 1),
    100,
  );
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
  const offset = (page - 1) * limit;
  const status = url.searchParams.get("status");
  const method = url.searchParams.get("method");
  const after = url.searchParams.get("after");
  const before = url.searchParams.get("before");

  try {
    const conditions: SQL[] = [];

    if (status) {
      conditions.push(eq(logs.statusCode, Number(status)));
    }
    if (method) {
      conditions.push(eq(logs.method, method.toUpperCase()));
    }
    if (after) {
      conditions.push(gte(logs.createdAt, new Date(after)));
    }
    if (before) {
      conditions.push(lte(logs.createdAt, new Date(before)));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const results = await db
      .select({
        id: logs.id,
        method: logs.method,
        path: logs.path,
        statusCode: logs.statusCode,
        apiKeyId: logs.apiKeyId,
        duration: logs.duration,
        createdAt: logs.createdAt,
      })
      .from(logs)
      .where(whereClause)
      .orderBy(desc(logs.createdAt))
      .limit(limit)
      .offset(offset);

    return Response.json({
      object: "list",
      data: results.map((l) => ({
        id: l.id,
        method: l.method,
        path: l.path,
        status_code: l.statusCode,
        api_key_id: l.apiKeyId,
        duration: l.duration,
        created_at: l.createdAt,
      })),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to list logs";
    return Response.json({ error: message }, { status: 500 });
  }
}
