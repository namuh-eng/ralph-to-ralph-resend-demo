"use client";

import { Modal } from "@/components/modal";
import { useState } from "react";

interface ExportModalProps {
  open: boolean;
  onClose: () => void;
  apiKeys: { id: string; name: string }[];
}

const STATUS_OPTIONS = [
  { value: "bounced", label: "Bounced" },
  { value: "canceled", label: "Canceled" },
  { value: "clicked", label: "Clicked" },
  { value: "complained", label: "Complained" },
  { value: "delivered", label: "Delivered" },
  { value: "delivery_delayed", label: "Delivery Delayed" },
  { value: "failed", label: "Failed" },
  { value: "opened", label: "Opened" },
  { value: "scheduled", label: "Scheduled" },
  { value: "sent", label: "Sent" },
  { value: "queued", label: "Queued" },
  { value: "suppressed", label: "Suppressed" },
] as const;

function downloadCsv(filename: string, csvContent: string) {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function toCsv(rows: Array<Record<string, unknown>>): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const escapeCsv = (v: unknown): string => {
    const s = String(v ?? "");
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };
  const lines = [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => escapeCsv(r[h])).join(",")),
  ];
  return lines.join("\n");
}

export function ExportModal({ open, onClose, apiKeys }: ExportModalProps) {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedStatuses, setSelectedStatuses] = useState<Set<string>>(
    new Set(),
  );
  const [apiKeyId, setApiKeyId] = useState("");
  const [exporting, setExporting] = useState(false);

  const toggleStatus = (value: string) => {
    setSelectedStatuses((prev) => {
      const next = new Set(prev);
      if (next.has(value)) {
        next.delete(value);
      } else {
        next.add(value);
      }
      return next;
    });
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      if (dateFrom) params.set("date_from", dateFrom);
      if (dateTo) params.set("date_to", dateTo);
      if (selectedStatuses.size > 0) {
        params.set("statuses", Array.from(selectedStatuses).join(","));
      }
      if (apiKeyId) params.set("api_key_id", apiKeyId);

      const res = await fetch(`/api/emails?${params.toString()}`);
      if (!res.ok) {
        throw new Error("Failed to fetch emails");
      }

      const json = await res.json();
      const emails: Array<Record<string, unknown>> = (json.data ?? []).map(
        (e: Record<string, unknown>) => ({
          id: e.id,
          from: e.from,
          to: Array.isArray(e.to) ? (e.to as string[]).join("; ") : e.to,
          subject: e.subject,
          status: e.last_event,
          created_at: e.created_at,
        }),
      );

      if (emails.length === 0) {
        alert("No emails found matching the filters.");
        return;
      }

      const csv = toCsv(emails);
      const timestamp = new Date().toISOString().slice(0, 10);
      downloadCsv(`emails-export-${timestamp}.csv`, csv);
      onClose();
    } catch {
      alert("Export failed. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Export Emails"
      actionLabel={exporting ? "Exporting..." : "Export CSV"}
      onAction={handleExport}
      actionDisabled={exporting}
    >
      <div className="space-y-4">
        {/* Date Range */}
        <div>
          <span className="block text-[12px] font-medium text-[#A1A4A5] tracking-wider mb-2">
            DATE RANGE
          </span>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="flex-1 px-3 py-1.5 text-[13px] text-[#F0F0F0] bg-[rgba(24,25,28,0.88)] border border-[rgba(176,199,217,0.145)] rounded-[8px] outline-none focus:border-[rgba(176,199,217,0.3)]"
              aria-label="Date from"
            />
            <span className="text-[13px] text-[#A1A4A5]">to</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="flex-1 px-3 py-1.5 text-[13px] text-[#F0F0F0] bg-[rgba(24,25,28,0.88)] border border-[rgba(176,199,217,0.145)] rounded-[8px] outline-none focus:border-[rgba(176,199,217,0.3)]"
              aria-label="Date to"
            />
          </div>
        </div>

        {/* Status Multi-select */}
        <div>
          <span className="block text-[12px] font-medium text-[#A1A4A5] tracking-wider mb-2">
            STATUS
          </span>
          <div className="flex flex-wrap gap-1.5">
            {STATUS_OPTIONS.map((opt) => {
              const isSelected = selectedStatuses.has(opt.value);
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => toggleStatus(opt.value)}
                  className={`px-2.5 py-1 text-[12px] rounded-full border transition-colors ${
                    isSelected
                      ? "bg-white text-black border-white"
                      : "text-[#A1A4A5] border-[rgba(176,199,217,0.145)] hover:text-[#F0F0F0] hover:border-[rgba(176,199,217,0.3)]"
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* API Key Filter */}
        <div>
          <label
            className="block text-[12px] font-medium text-[#A1A4A5] tracking-wider mb-2"
            htmlFor="export-api-key"
          >
            API KEY
          </label>
          <select
            id="export-api-key"
            value={apiKeyId}
            onChange={(e) => setApiKeyId(e.target.value)}
            className="w-full px-3 py-1.5 text-[13px] text-[#F0F0F0] bg-[rgba(24,25,28,0.88)] border border-[rgba(176,199,217,0.145)] rounded-[8px] outline-none focus:border-[rgba(176,199,217,0.3)]"
            aria-label="API Key filter"
          >
            <option value="">All API Keys</option>
            {apiKeys.map((k) => (
              <option key={k.id} value={k.id}>
                {k.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </Modal>
  );
}
