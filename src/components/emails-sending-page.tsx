"use client";

import { EmailsHeader } from "@/components/emails-header";
import {
  type EmailListItem,
  EmailsSendingDataTable,
} from "@/components/emails-sending-data-table";
import {
  type EmailFilters,
  EmailsSendingFilterBar,
} from "@/components/emails-sending-filter-bar";
import { useMemo, useState } from "react";

interface EmailsSendingPageProps {
  apiKeys: { id: string; name: string }[];
  emails: EmailListItem[];
}

export function EmailsSendingPage({ apiKeys, emails }: EmailsSendingPageProps) {
  const [filters, setFilters] = useState<EmailFilters>({
    search: "",
    dateRange: "Last 15 days",
    status: "",
    apiKeyId: "",
  });

  const filteredEmails = useMemo(() => {
    let result = emails;
    if (filters.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(
        (e) =>
          e.to.some((t) => t.toLowerCase().includes(q)) ||
          e.subject.toLowerCase().includes(q),
      );
    }
    if (filters.status) {
      result = result.filter((e) => e.lastEvent === filters.status);
    }
    return result;
  }, [emails, filters.search, filters.status]);

  return (
    <div>
      <EmailsHeader activeTab="sending" apiKeys={apiKeys} />
      <EmailsSendingFilterBar apiKeys={apiKeys} onFiltersChange={setFilters} />
      <div className="mt-4">
        <EmailsSendingDataTable emails={filteredEmails} />
      </div>
    </div>
  );
}
