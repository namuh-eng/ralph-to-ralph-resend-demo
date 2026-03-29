"use client";

import { DataTable } from "@/components/data-table";
import { StatusBadge } from "@/components/status-badge";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

interface LogRow {
  id: string;
  method: string;
  path: string;
  statusCode: number;
  duration: number | null;
  createdAt: string;
}

function getMethodVariant(
  method: string,
): "success" | "error" | "warning" | "info" | "default" {
  switch (method.toUpperCase()) {
    case "GET":
      return "info";
    case "POST":
      return "success";
    case "PUT":
    case "PATCH":
      return "warning";
    case "DELETE":
      return "error";
    default:
      return "default";
  }
}

function getStatusVariant(
  code: number,
): "success" | "error" | "warning" | "info" | "default" {
  if (code >= 200 && code < 300) return "success";
  if (code >= 300 && code < 400) return "info";
  if (code >= 400 && code < 500) return "warning";
  if (code >= 500) return "error";
  return "default";
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const month = months[d.getMonth()];
  const day = d.getDate();
  const hours = d.getHours();
  const minutes = d.getMinutes().toString().padStart(2, "0");
  const seconds = d.getSeconds().toString().padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  const h = hours % 12 || 12;
  return `${month} ${day}, ${h}:${minutes}:${seconds} ${ampm}`;
}

export function LogsListPage({ logs }: { logs: LogRow[] }) {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  const filteredLogs = useMemo(() => {
    let filtered = logs;

    if (statusFilter !== "all") {
      filtered = filtered.filter((log) => {
        if (statusFilter === "2xx")
          return log.statusCode >= 200 && log.statusCode < 300;
        if (statusFilter === "4xx")
          return log.statusCode >= 400 && log.statusCode < 500;
        if (statusFilter === "5xx") return log.statusCode >= 500;
        return true;
      });
    }

    if (dateFrom) {
      const from = new Date(dateFrom);
      filtered = filtered.filter((log) => new Date(log.createdAt) >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo);
      to.setDate(to.getDate() + 1);
      filtered = filtered.filter((log) => new Date(log.createdAt) < to);
    }

    return filtered;
  }, [logs, statusFilter, dateFrom, dateTo]);

  const columns = [
    {
      key: "method",
      header: "Method",
      render: (row: LogRow) => (
        <StatusBadge
          status={row.method.toUpperCase()}
          variant={getMethodVariant(row.method)}
        />
      ),
    },
    {
      key: "path",
      header: "Endpoint",
      render: (row: LogRow) => (
        <span className="font-mono text-[13px]">{row.path}</span>
      ),
    },
    {
      key: "statusCode",
      header: "Status",
      render: (row: LogRow) => (
        <StatusBadge
          status={String(row.statusCode)}
          variant={getStatusVariant(row.statusCode)}
        />
      ),
    },
    {
      key: "duration",
      header: "Duration",
      render: (row: LogRow) => (
        <span className="text-[#A1A4A5] text-[13px]">
          {row.duration != null ? `${row.duration}ms` : "-"}
        </span>
      ),
    },
    {
      key: "createdAt",
      header: "Created",
      render: (row: LogRow) => (
        <span className="text-[#A1A4A5] text-[13px]">
          {formatDate(row.createdAt)}
        </span>
      ),
    },
  ];

  return (
    <div>
      <h1 className="text-2xl font-semibold text-[#F0F0F0] mb-6">Logs</h1>

      {/* Filters */}
      <div className="flex items-center gap-4 mb-4">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-[rgba(24,25,28,0.88)] border border-[rgba(176,199,217,0.145)] text-[#F0F0F0] text-[13px] rounded-md px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-[rgba(176,199,217,0.3)]"
        >
          <option value="all">All statuses</option>
          <option value="2xx">2xx Success</option>
          <option value="4xx">4xx Client Error</option>
          <option value="5xx">5xx Server Error</option>
        </select>

        <div className="flex items-center gap-2">
          <label htmlFor="date-from" className="text-[12px] text-[#A1A4A5]">
            From
          </label>
          <input
            id="date-from"
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="bg-[rgba(24,25,28,0.88)] border border-[rgba(176,199,217,0.145)] text-[#F0F0F0] text-[13px] rounded-md px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-[rgba(176,199,217,0.3)]"
          />
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="date-to" className="text-[12px] text-[#A1A4A5]">
            To
          </label>
          <input
            id="date-to"
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="bg-[rgba(24,25,28,0.88)] border border-[rgba(176,199,217,0.145)] text-[#F0F0F0] text-[13px] rounded-md px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-[rgba(176,199,217,0.3)]"
          />
        </div>

        {(statusFilter !== "all" || dateFrom || dateTo) && (
          <button
            type="button"
            onClick={() => {
              setStatusFilter("all");
              setDateFrom("");
              setDateTo("");
            }}
            className="text-[12px] text-[#A1A4A5] hover:text-[#F0F0F0] transition-colors"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Table */}
      <div className="border border-[rgba(176,199,217,0.145)] rounded-lg overflow-hidden">
        <DataTable
          columns={columns}
          rows={filteredLogs}
          getRowId={(row) => row.id}
          onRowClick={(row) => router.push(`/logs/${row.id}`)}
          emptyMessage="No logs found"
        />
      </div>
    </div>
  );
}
