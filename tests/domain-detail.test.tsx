import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

import { DomainDetail } from "@/components/domain-detail";
import type { DomainDetailData } from "@/components/domain-detail";

afterEach(cleanup);

const baseDomain: DomainDetailData = {
  id: "d1",
  name: "updates.foreverbrowsing.com",
  status: "verified",
  region: "us-east-1",
  createdAt: new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString(),
  clickTracking: false,
  openTracking: false,
  tls: true,
  records: [
    {
      type: "TXT",
      name: "resend._domainkey.updates",
      value: "p=MIGfMA0GCSqGSIb3DQ...",
      status: "verified",
      ttl: "Auto",
    },
  ],
  events: [
    {
      type: "domain_added",
      timestamp: new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString(),
    },
    {
      type: "dns_verified",
      timestamp: new Date(Date.now() - 19.9 * 60 * 60 * 1000).toISOString(),
    },
    {
      type: "domain_verified",
      timestamp: new Date(Date.now() - 19.8 * 60 * 60 * 1000).toISOString(),
    },
  ],
};

describe("DomainDetail", () => {
  it("renders domain name and breadcrumb", () => {
    render(<DomainDetail domain={baseDomain} />);
    expect(screen.getByText("Domains")).toBeTruthy();
    expect(screen.getByText("updates.foreverbrowsing.com")).toBeTruthy();
  });

  it("renders metadata fields", () => {
    render(<DomainDetail domain={baseDomain} />);
    expect(screen.getByText("CREATED")).toBeTruthy();
    expect(screen.getByText("STATUS")).toBeTruthy();
    expect(screen.getByText("PROVIDER")).toBeTruthy();
    expect(screen.getByText("REGION")).toBeTruthy();
    expect(screen.getAllByText("Verified").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/North Virginia/)).toBeTruthy();
  });

  it("renders domain events timeline in order", () => {
    render(<DomainDetail domain={baseDomain} />);
    expect(screen.getByText("DOMAIN EVENTS")).toBeTruthy();
    expect(screen.getByText("Domain added")).toBeTruthy();
    expect(screen.getByText("DNS verified")).toBeTruthy();
    expect(screen.getByText("Domain verified")).toBeTruthy();
  });

  it("renders verified banner when domain is verified", () => {
    render(<DomainDetail domain={baseDomain} />);
    expect(
      screen.getByText(/Your domain is ready to send emails/),
    ).toBeTruthy();
  });

  it("shows Records tab by default with DNS Records", () => {
    render(<DomainDetail domain={baseDomain} />);
    const recordsTab = screen.getByText("Records");
    expect(recordsTab.getAttribute("data-state")).toBe("active");
    expect(screen.getByText("DNS Records")).toBeTruthy();
  });

  it("switches to Configuration tab", () => {
    render(<DomainDetail domain={baseDomain} />);
    const configTab = screen.getByText("Configuration");
    fireEvent.click(configTab);
    expect(configTab.getAttribute("data-state")).toBe("active");
    expect(screen.getByText("Click Tracking")).toBeTruthy();
    expect(screen.getByText("Open Tracking")).toBeTruthy();
  });

  it("renders DNS records table with correct columns", () => {
    render(<DomainDetail domain={baseDomain} />);
    expect(screen.getByText("Type")).toBeTruthy();
    expect(screen.getByText("Name")).toBeTruthy();
    expect(screen.getByText("Content")).toBeTruthy();
    expect(screen.getByText("TTL")).toBeTruthy();
    expect(screen.getByText("Status")).toBeTruthy();
    expect(screen.getByText("TXT")).toBeTruthy();
  });

  it("renders more actions dropdown with options", () => {
    render(<DomainDetail domain={baseDomain} />);
    const moreBtn = screen.getByLabelText("More actions");
    fireEvent.click(moreBtn);
    expect(screen.getByText("Restart")).toBeTruthy();
    expect(screen.getByText("Go to docs")).toBeTruthy();
    expect(screen.getByText("Delete domain")).toBeTruthy();
  });

  it("renders domain icon", () => {
    render(<DomainDetail domain={baseDomain} />);
    expect(screen.getByTestId("domain-icon")).toBeTruthy();
  });

  it("shows pending status without verified banner", () => {
    const pendingDomain = {
      ...baseDomain,
      status: "pending",
      events: [baseDomain.events[0]],
    };
    render(<DomainDetail domain={pendingDomain} />);
    expect(screen.getByText("Pending")).toBeTruthy();
    expect(
      screen.queryByText(/Your domain is ready to send emails/),
    ).toBeNull();
  });

  it("renders Auto configure button in Records tab", () => {
    render(<DomainDetail domain={baseDomain} />);
    expect(screen.getByText("Auto configure")).toBeTruthy();
  });
});
