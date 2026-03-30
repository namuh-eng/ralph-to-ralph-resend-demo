// ABOUTME: Metrics page layout — domain filter, date range picker, 3 collapsible metric sections (Deliverability, Bounce, Complain)

"use client";

import { BounceRateSection } from "@/components/bounce-rate-section";
import {
  ComboboxFilter,
  type ComboboxOption,
} from "@/components/combobox-filter";
import { ComplainRateSection } from "@/components/complain-rate-section";
import { DateRangePicker } from "@/components/date-range-picker";
import { DeliverabilitySection } from "@/components/deliverability-section";
import { useCallback, useEffect, useState } from "react";

// ── Date range preset → API param mapping ───────────────────────────

const DATE_RANGE_TO_API: Record<string, string> = {
  Today: "today",
  Yesterday: "yesterday",
  "Last 3 days": "last_3_days",
  "Last 7 days": "last_7_days",
  "Last 15 days": "last_15_days",
  "Last 30 days": "last_30_days",
};

// ── Types ───────────────────────────────────────────────────────────

interface DailyDataPoint {
  date: string;
  count: number;
}

interface DomainBreakdownEntry {
  domain: string;
  rate: number;
  count: number;
}

interface BounceBreakdown {
  permanent: number;
  transient: number;
  undetermined: number;
}

interface DailyBouncePoint {
  date: string;
  rate: number;
}

interface DailyComplainPoint {
  date: string;
  rate: number;
}

interface MetricsData {
  totalEmails: number;
  deliverabilityRate: number;
  bounceRate: number;
  complainRate: number;
  complained: number;
  domains: string[];
  dailyData: DailyDataPoint[];
  domainBreakdown: DomainBreakdownEntry[];
  bounceBreakdown: BounceBreakdown;
  dailyBounceData: DailyBouncePoint[];
  dailyComplainData: DailyComplainPoint[];
  lastUpdated: string;
}

// ── MetricSection (collapsible) ─────────────────────────────────────

interface MetricSectionProps {
  title: string;
  value: string;
  defaultOpen?: boolean;
  infoButton?: boolean;
  children?: React.ReactNode;
}

export function MetricSection({
  title,
  value,
  defaultOpen = true,
  infoButton = false,
  children,
}: MetricSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div
      data-section=""
      className="rounded-[12px] border border-[rgba(176,199,217,0.145)] bg-[rgba(24,25,28,0.88)]"
    >
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-5 py-4"
      >
        <div className="flex items-center gap-6">
          <span className="text-[11px] font-semibold tracking-wider text-[#A1A4A5] uppercase">
            {title}
          </span>
          <span className="text-3xl font-semibold text-[#F0F0F0]">{value}</span>
        </div>
        <div className="flex items-center gap-2">
          {infoButton && (
            <span className="text-[#A1A4A5] hover:text-[#F0F0F0] transition-colors">
              <svg
                aria-hidden="true"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M12 16v-4" />
                <path d="M12 8h.01" />
              </svg>
            </span>
          )}
          <svg
            aria-hidden="true"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#A1A4A5"
            strokeWidth="2"
            className={`transition-transform ${open ? "" : "-rotate-90"}`}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </button>
      {open && children && <div className="px-5 pb-5">{children}</div>}
    </div>
  );
}

// ── MetricsPage ─────────────────────────────────────────────────────

export function MetricsPage() {
  const [dateRange, setDateRange] = useState("Last 15 days");
  const [domain, setDomain] = useState("all");
  const [eventType, setEventType] = useState("all");
  const [data, setData] = useState<MetricsData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMetrics = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("range", DATE_RANGE_TO_API[dateRange] || "last_15_days");
    if (domain !== "all") {
      params.set("domain", domain);
    }
    if (eventType !== "all") {
      params.set("event_type", eventType);
    }
    try {
      const res = await fetch(`/api/metrics?${params.toString()}`);
      if (res.ok) {
        const json: MetricsData = await res.json();
        setData(json);
      }
    } finally {
      setLoading(false);
    }
  }, [dateRange, domain, eventType]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  // Build domain filter options
  const domainOptions: ComboboxOption[] = [
    { value: "all", label: "All Domains" },
    ...(data?.domains ?? []).map((d) => ({
      value: d,
      label: d,
    })),
  ];

  const lastUpdatedStr = data?.lastUpdated
    ? new Date(data.lastUpdated).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "--:--";

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-[#F0F0F0]">Metrics</h1>
        <div className="flex items-center gap-2">
          <ComboboxFilter
            options={domainOptions}
            value={domain}
            onChange={setDomain}
          />
          <DateRangePicker value={dateRange} onChange={setDateRange} />
        </div>
      </div>

      {/* Deliverability Rate section */}
      <div className="space-y-4">
        <MetricSection
          title="DELIVERABILITY RATE"
          value={loading ? "—" : `${data?.deliverabilityRate ?? 0}%`}
          defaultOpen={true}
        >
          <DeliverabilitySection
            data={{
              totalEmails: data?.totalEmails ?? 0,
              deliverabilityRate: data?.deliverabilityRate ?? 0,
              dailyData: data?.dailyData ?? [],
              domainBreakdown: data?.domainBreakdown ?? [],
            }}
            loading={loading}
            eventType={eventType}
            onEventTypeChange={setEventType}
          />
        </MetricSection>

        {/* Bounce Rate section */}
        <MetricSection
          title="BOUNCE RATE"
          value={loading ? "—" : `${data?.bounceRate ?? 0}%`}
          defaultOpen={true}
          infoButton={false}
        >
          <BounceRateSection
            data={{
              bounceRate: data?.bounceRate ?? 0,
              permanent: data?.bounceBreakdown?.permanent ?? 0,
              transient: data?.bounceBreakdown?.transient ?? 0,
              undetermined: data?.bounceBreakdown?.undetermined ?? 0,
              sent: data?.totalEmails ?? 0,
              dailyBounceData: data?.dailyBounceData ?? [],
            }}
            loading={loading}
            dateRange={dateRange}
          />
        </MetricSection>

        {/* Complain Rate section */}
        <MetricSection
          title="COMPLAIN RATE"
          value={loading ? "—" : `${data?.complainRate ?? 0}%`}
          defaultOpen={true}
          infoButton={false}
        >
          <ComplainRateSection
            data={{
              complainRate: data?.complainRate ?? 0,
              complaints: data?.complained ?? 0,
              sent: data?.totalEmails ?? 0,
              dailyComplainData: data?.dailyComplainData ?? [],
            }}
            loading={loading}
            dateRange={dateRange}
          />
        </MetricSection>
      </div>

      {/* Footer */}
      <div className="mt-4 text-[12px] text-[#A1A4A5]">
        Data is updated every 15 minutes. Last updated {lastUpdatedStr}.
      </div>
    </div>
  );
}
