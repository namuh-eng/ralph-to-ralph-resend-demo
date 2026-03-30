// ABOUTME: Unit tests for complain rate section — rate calculation, info panel, chart, breakdown table

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/metrics",
  useSearchParams: () => new URLSearchParams(),
}));

afterEach(() => {
  cleanup();
});

describe("Complain Rate Section", () => {
  describe("calculateComplainRate", () => {
    it("should calculate complain rate from complaints / sent * 100", async () => {
      const mod = await import("../src/components/complain-rate-section");
      const result = mod.calculateComplainRate({
        complaints: 1,
        sent: 1000,
      });
      expect(result).toBe(0.1);
    });

    it("should return 0 when sent is 0", async () => {
      const mod = await import("../src/components/complain-rate-section");
      const result = mod.calculateComplainRate({
        complaints: 0,
        sent: 0,
      });
      expect(result).toBe(0);
    });

    it("should round to 2 decimal places", async () => {
      const mod = await import("../src/components/complain-rate-section");
      const result = mod.calculateComplainRate({
        complaints: 3,
        sent: 7000,
      });
      // 3/7000 = 0.04285... → 0.04
      expect(result).toBe(0.04);
    });
  });

  describe("ComplainRateSection component", () => {
    it("should export ComplainRateSection component", async () => {
      const mod = await import("../src/components/complain-rate-section");
      expect(mod.ComplainRateSection).toBeDefined();
      expect(typeof mod.ComplainRateSection).toBe("function");
    });

    it("should render SVG chart when daily data exists", async () => {
      const mod = await import("../src/components/complain-rate-section");
      const { container } = render(
        React.createElement(mod.ComplainRateSection, {
          data: {
            complainRate: 0.1,
            complaints: 1,
            sent: 1000,
            dailyComplainData: [
              { date: "2026-03-28", rate: 0.05 },
              { date: "2026-03-29", rate: 0.15 },
            ],
          },
          loading: false,
          dateRange: "Last 15 days",
        }),
      );
      const svgs = container.querySelectorAll("svg[role='application']");
      expect(svgs.length).toBeGreaterThanOrEqual(1);
    });

    it("should render breakdown table with single Complained row", async () => {
      const mod = await import("../src/components/complain-rate-section");
      render(
        React.createElement(mod.ComplainRateSection, {
          data: {
            complainRate: 0.1,
            complaints: 1,
            sent: 1000,
            dailyComplainData: [],
          },
          loading: false,
          dateRange: "Last 15 days",
        }),
      );
      expect(screen.getByText("Complained")).toBeDefined();
    });

    it("should render info chevron button to open info panel", async () => {
      const mod = await import("../src/components/complain-rate-section");
      render(
        React.createElement(mod.ComplainRateSection, {
          data: {
            complainRate: 0,
            complaints: 0,
            sent: 0,
            dailyComplainData: [],
          },
          loading: false,
          dateRange: "Last 15 days",
        }),
      );
      const infoBtn = screen.getByRole("button", {
        name: /complain rate info/i,
      });
      expect(infoBtn).toBeDefined();
    });

    it("should open info panel with 'How Complain Rate Works' title on info click", async () => {
      const mod = await import("../src/components/complain-rate-section");
      render(
        React.createElement(mod.ComplainRateSection, {
          data: {
            complainRate: 0,
            complaints: 0,
            sent: 0,
            dailyComplainData: [],
          },
          loading: false,
          dateRange: "Last 15 days",
        }),
      );
      const infoBtn = screen.getByRole("button", {
        name: /complain rate info/i,
      });
      fireEvent.click(infoBtn);
      expect(screen.getByText("How Complain Rate Works")).toBeDefined();
    });

    it("should close info panel on close button click", async () => {
      const mod = await import("../src/components/complain-rate-section");
      render(
        React.createElement(mod.ComplainRateSection, {
          data: {
            complainRate: 0,
            complaints: 0,
            sent: 0,
            dailyComplainData: [],
          },
          loading: false,
          dateRange: "Last 15 days",
        }),
      );
      const infoBtn = screen.getByRole("button", {
        name: /complain rate info/i,
      });
      fireEvent.click(infoBtn);
      expect(screen.getByText("How Complain Rate Works")).toBeDefined();

      const closeBtn = screen.getByRole("button", { name: /close/i });
      fireEvent.click(closeBtn);
      expect(screen.queryByText("How Complain Rate Works")).toBeNull();
    });

    it("should show breakdown row percentage for complained", async () => {
      const mod = await import("../src/components/complain-rate-section");
      render(
        React.createElement(mod.ComplainRateSection, {
          data: {
            complainRate: 0.1,
            complaints: 1,
            sent: 1000,
            dailyComplainData: [],
          },
          loading: false,
          dateRange: "Last 15 days",
        }),
      );
      expect(screen.getByText("0.1%")).toBeDefined();
    });

    it("should show loading state", async () => {
      const mod = await import("../src/components/complain-rate-section");
      render(
        React.createElement(mod.ComplainRateSection, {
          data: {
            complainRate: 0,
            complaints: 0,
            sent: 0,
            dailyComplainData: [],
          },
          loading: true,
          dateRange: "Last 15 days",
        }),
      );
      expect(screen.getByText("Loading...")).toBeDefined();
    });

    it("should render breakdown row link with statuses=complained and date params", async () => {
      const mod = await import("../src/components/complain-rate-section");
      const { container } = render(
        React.createElement(mod.ComplainRateSection, {
          data: {
            complainRate: 0.1,
            complaints: 1,
            sent: 1000,
            dailyComplainData: [],
          },
          loading: false,
          dateRange: "Last 7 days",
        }),
      );
      const links = container.querySelectorAll("a[href*='/emails']");
      expect(links.length).toBe(1);
      const href = links[0].getAttribute("href") || "";
      expect(href).toContain("statuses=complained");
      expect(href).toContain("startDate=");
      expect(href).toContain("endDate=");
    });

    it("should show 0% for zero complain rate", async () => {
      const mod = await import("../src/components/complain-rate-section");
      render(
        React.createElement(mod.ComplainRateSection, {
          data: {
            complainRate: 0,
            complaints: 0,
            sent: 100,
            dailyComplainData: [],
          },
          loading: false,
          dateRange: "Last 15 days",
        }),
      );
      expect(screen.getByText("0%")).toBeDefined();
    });
  });
});
