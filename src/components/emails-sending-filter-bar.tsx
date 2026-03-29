"use client";

import { ComboboxFilter } from "@/components/combobox-filter";
import { DateRangePicker } from "@/components/date-range-picker";
import { DropdownFilter } from "@/components/dropdown-filter";
import type { DropdownFilterOption } from "@/components/dropdown-filter";
import { ExportButton } from "@/components/export-button";
import { SearchInput } from "@/components/search-input";
import { useState } from "react";

export interface EmailFilters {
  search: string;
  dateRange: string;
  status: string;
  apiKeyId: string;
}

interface EmailsSendingFilterBarProps {
  apiKeys: { id: string; name: string }[];
  onFiltersChange: (filters: EmailFilters) => void;
}

const STATUS_OPTIONS: DropdownFilterOption[] = [
  { value: "", label: "All Statuses" },
  { value: "bounced", label: "Bounced", color: "#EF4444" },
  { value: "canceled", label: "Canceled", color: "#6B7280" },
  { value: "clicked", label: "Clicked", color: "#8B5CF6" },
  { value: "complained", label: "Complained", color: "#F97316" },
  { value: "delivered", label: "Delivered", color: "#22C55E" },
  { value: "delivery_delayed", label: "Delivery Delayed", color: "#EAB308" },
  { value: "failed", label: "Failed", color: "#EF4444" },
  { value: "opened", label: "Opened", color: "#3B82F6" },
  { value: "scheduled", label: "Scheduled", color: "#A1A4A5" },
  { value: "sent", label: "Sent", color: "#22C55E" },
  { value: "queued", label: "Queued", color: "#A1A4A5" },
  { value: "suppressed", label: "Suppressed", color: "#6B7280" },
];

export function EmailsSendingFilterBar({
  apiKeys,
  onFiltersChange,
}: EmailsSendingFilterBarProps) {
  const [search, setSearch] = useState("");
  const [dateRange, setDateRange] = useState("Last 15 days");
  const [status, setStatus] = useState("");
  const [apiKeyId, setApiKeyId] = useState("");

  const emitChange = (overrides: Partial<EmailFilters>) => {
    const next: EmailFilters = {
      search,
      dateRange,
      status,
      apiKeyId,
      ...overrides,
    };
    onFiltersChange(next);
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    emitChange({ search: value });
  };

  const handleDateRangeChange = (value: string) => {
    setDateRange(value);
    emitChange({ dateRange: value });
  };

  const handleStatusChange = (value: string) => {
    setStatus(value);
    emitChange({ status: value });
  };

  const handleApiKeyChange = (value: string) => {
    setApiKeyId(value);
    emitChange({ apiKeyId: value });
  };

  const handleExport = () => {
    // Export functionality - CSV download
  };

  const apiKeyOptions = [
    { value: "", label: "All API Keys" },
    ...apiKeys.map((k) => ({ value: k.id, label: k.name })),
  ];

  return (
    <div className="flex items-center gap-2 mt-4">
      <div className="w-[200px]">
        <SearchInput value={search} onChange={handleSearchChange} />
      </div>
      <DateRangePicker value={dateRange} onChange={handleDateRangeChange} />
      <DropdownFilter
        options={STATUS_OPTIONS}
        value={status}
        onChange={handleStatusChange}
      />
      <ComboboxFilter
        options={apiKeyOptions}
        value={apiKeyId}
        onChange={handleApiKeyChange}
      />
      <div className="ml-auto">
        <ExportButton onClick={handleExport} />
      </div>
    </div>
  );
}
