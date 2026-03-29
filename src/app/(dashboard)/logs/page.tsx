import { LogsListPage } from "@/components/logs-list-page";
import { db } from "@/lib/db";
import { logs } from "@/lib/db/schema";
import { desc } from "drizzle-orm";

export default async function LogsPage() {
  let logRows: {
    id: string;
    method: string;
    path: string;
    statusCode: number;
    duration: number | null;
    createdAt: string;
  }[] = [];

  try {
    const rows = await db
      .select({
        id: logs.id,
        method: logs.method,
        path: logs.path,
        statusCode: logs.statusCode,
        duration: logs.duration,
        createdAt: logs.createdAt,
      })
      .from(logs)
      .orderBy(desc(logs.createdAt))
      .limit(200);

    logRows = rows.map((r) => ({
      id: r.id,
      method: r.method,
      path: r.path,
      statusCode: r.statusCode,
      duration: r.duration,
      createdAt: r.createdAt.toISOString(),
    }));
  } catch {
    logRows = [];
  }

  return <LogsListPage logs={logRows} />;
}
