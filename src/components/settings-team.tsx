"use client";

import { StatusBadge } from "@/components/status-badge";
import { useState } from "react";

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: "admin" | "member";
  status: "active" | "pending";
}

const MOCK_MEMBERS: TeamMember[] = [
  { id: "1", name: "Ashley", email: "ashley@example.com", role: "admin", status: "active" },
  { id: "2", name: "Jaeyun", email: "jaeyun@example.com", role: "admin", status: "active" },
];

export function TeamTab() {
  const [members] = useState<TeamMember[]>(MOCK_MEMBERS);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-[14px] text-[#A1A4A5]">
          Manage your team members and their access levels.
        </p>
        <button
          type="button"
          className="h-9 px-4 text-[13px] font-medium bg-white text-black rounded-md hover:bg-gray-200 transition-colors"
        >
          Invite member
        </button>
      </div>

      <div className="border border-[rgba(176,199,217,0.145)] rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[rgba(176,199,217,0.145)] bg-[rgba(24,25,28,0.3)]">
              <th className="px-4 py-3 text-left text-[11px] font-medium text-[#A1A4A5] tracking-wider uppercase">Member</th>
              <th className="px-4 py-3 text-left text-[11px] font-medium text-[#A1A4A5] tracking-wider uppercase">Role</th>
              <th className="px-4 py-3 text-left text-[11px] font-medium text-[#A1A4A5] tracking-wider uppercase">Status</th>
              <th className="px-4 py-3 text-right"></th>
            </tr>
          </thead>
          <tbody>
            {members.map((member) => (
              <tr key={member.id} className="border-b border-[rgba(176,199,217,0.145)] last:border-0 hover:bg-[rgba(24,25,28,0.5)] transition-colors">
                <td className="px-4 py-4">
                  <div className="flex flex-col">
                    <span className="text-[14px] text-[#F0F0F0] font-medium">{member.name}</span>
                    <span className="text-[12px] text-[#A1A4A5]">{member.email}</span>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <span className="text-[13px] text-[#F0F0F0] capitalize">{member.role}</span>
                </td>
                <td className="px-4 py-4">
                  <StatusBadge 
                    status={member.status === "active" ? "Active" : "Pending"} 
                    variant={member.status === "active" ? "success" : "warning"} 
                  />
                </td>
                <td className="px-4 py-4 text-right">
                  <button type="button" className="text-[12px] text-[#A1A4A5] hover:text-[#F0F0F0] transition-colors">
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
