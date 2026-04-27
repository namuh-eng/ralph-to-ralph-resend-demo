"use client";

import { StatusBadge } from "@/components/status-badge";

interface Webhook {
  id: string;
  url: string;
  status: "active" | "disabled";
  eventTypes: string[];
  createdAt: string;
}

export function WebhooksList({ webhooks }: { webhooks: Webhook[] }) {
  return (
    <div className="mt-8">
      <div className="overflow-hidden rounded-lg border border-white/5 bg-black">
        <table className="min-w-full divide-y divide-white/5">
          <thead>
            <tr>
              <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-white/40">
                Endpoint
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-white/40">
                Status
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-white/40">
                Events
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-white/40">
                Created
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {webhooks.map((webhook) => (
              <tr key={webhook.id} className="hover:bg-white/[0.02]">
                <td className="whitespace-nowrap px-6 py-4 text-sm text-[#F0F0F0]">
                  {webhook.url}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm">
                  <StatusBadge
                    status={webhook.status === "active" ? "active" : "failed"}
                  />
                </td>
                <td className="px-6 py-4 text-sm text-white/40">
                  {webhook.eventTypes.join(", ")}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-white/40">
                  {new Date(webhook.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
            {webhooks.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  className="px-6 py-12 text-center text-sm text-white/40"
                >
                  No webhooks configured.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
