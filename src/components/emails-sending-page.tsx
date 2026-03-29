"use client";

import { EmailsHeader } from "@/components/emails-header";
import {
  type EmailFilters,
  EmailsSendingFilterBar,
} from "@/components/emails-sending-filter-bar";
import { useState } from "react";

interface EmailsSendingPageProps {
  apiKeys: { id: string; name: string }[];
}

export function EmailsSendingPage({ apiKeys }: EmailsSendingPageProps) {
  const [_filters, setFilters] = useState<EmailFilters>({
    search: "",
    dateRange: "Last 15 days",
    status: "",
    apiKeyId: "",
  });

  return (
    <div>
      <EmailsHeader activeTab="sending" />
      <EmailsSendingFilterBar apiKeys={apiKeys} onFiltersChange={setFilters} />
    </div>
  );
}
