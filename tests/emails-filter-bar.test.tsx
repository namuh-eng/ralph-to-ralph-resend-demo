import { EmailsSendingFilterBar } from "@/components/emails-sending-filter-bar";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(cleanup);

const defaultApiKeys = [
  { id: "key-1", name: "My API Key" },
  { id: "key-2", name: "Production Key" },
];

describe("EmailsSendingFilterBar", () => {
  it("renders search input with placeholder", () => {
    render(
      <EmailsSendingFilterBar
        apiKeys={defaultApiKeys}
        onFiltersChange={() => {}}
      />,
    );
    expect(screen.getByPlaceholderText("Search...")).toBeDefined();
  });

  it("renders date range picker with default 'Last 15 days'", () => {
    render(
      <EmailsSendingFilterBar
        apiKeys={defaultApiKeys}
        onFiltersChange={() => {}}
      />,
    );
    expect(screen.getByText("Last 15 days")).toBeDefined();
  });

  it("date range picker renders 6 preset options", () => {
    render(
      <EmailsSendingFilterBar
        apiKeys={defaultApiKeys}
        onFiltersChange={() => {}}
      />,
    );
    fireEvent.click(screen.getByText("Last 15 days"));
    expect(screen.getByText("Today")).toBeDefined();
    expect(screen.getByText("Yesterday")).toBeDefined();
    expect(screen.getByText("Last 3 days")).toBeDefined();
    expect(screen.getByText("Last 7 days")).toBeDefined();
    expect(screen.getAllByText("Last 15 days").length).toBeGreaterThanOrEqual(
      1,
    );
    expect(screen.getByText("Last 30 days")).toBeDefined();
  });

  it("renders status filter with 'All Statuses' default", () => {
    render(
      <EmailsSendingFilterBar
        apiKeys={defaultApiKeys}
        onFiltersChange={() => {}}
      />,
    );
    expect(screen.getByText("All Statuses")).toBeDefined();
  });

  it("status filter renders all 12 statuses", () => {
    render(
      <EmailsSendingFilterBar
        apiKeys={defaultApiKeys}
        onFiltersChange={() => {}}
      />,
    );
    fireEvent.click(screen.getByText("All Statuses"));
    const statuses = [
      "Bounced",
      "Canceled",
      "Clicked",
      "Complained",
      "Delivered",
      "Delivery Delayed",
      "Failed",
      "Opened",
      "Scheduled",
      "Sent",
      "Queued",
      "Suppressed",
    ];
    for (const status of statuses) {
      expect(screen.getByText(status)).toBeDefined();
    }
  });

  it("status filter options have colored indicators", () => {
    render(
      <EmailsSendingFilterBar
        apiKeys={defaultApiKeys}
        onFiltersChange={() => {}}
      />,
    );
    fireEvent.click(screen.getByText("All Statuses"));
    const dots = screen.getAllByTestId("color-dot");
    // 12 statuses should have colored dots (All Statuses has no dot)
    expect(dots.length).toBeGreaterThanOrEqual(12);
  });

  it("renders API key combobox with 'All API Keys' default", () => {
    render(
      <EmailsSendingFilterBar
        apiKeys={defaultApiKeys}
        onFiltersChange={() => {}}
      />,
    );
    expect(screen.getByText("All API Keys")).toBeDefined();
  });

  it("API key combobox shows API key options", () => {
    render(
      <EmailsSendingFilterBar
        apiKeys={defaultApiKeys}
        onFiltersChange={() => {}}
      />,
    );
    fireEvent.click(screen.getByText("All API Keys"));
    expect(screen.getByText("My API Key")).toBeDefined();
    expect(screen.getByText("Production Key")).toBeDefined();
  });

  it("renders export button", () => {
    render(
      <EmailsSendingFilterBar
        apiKeys={defaultApiKeys}
        onFiltersChange={() => {}}
      />,
    );
    expect(screen.getByLabelText("Export")).toBeDefined();
  });

  it("calls onFiltersChange when search changes", () => {
    vi.useFakeTimers();

    const onChange = vi.fn();
    render(
      <EmailsSendingFilterBar
        apiKeys={defaultApiKeys}
        onFiltersChange={onChange}
      />,
    );
    fireEvent.change(screen.getByPlaceholderText("Search..."), {
      target: { value: "test@email.com" },
    });

    vi.advanceTimersByTime(300);

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ search: "test@email.com" }),
    );

    vi.useRealTimers();
  });

  it("calls onFiltersChange when status changes", () => {
    const onChange = vi.fn();
    render(
      <EmailsSendingFilterBar
        apiKeys={defaultApiKeys}
        onFiltersChange={onChange}
      />,
    );
    fireEvent.click(screen.getByText("All Statuses"));
    fireEvent.click(screen.getByText("Delivered"));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ status: "delivered" }),
    );
  });

  it("calls onFiltersChange when date range changes", () => {
    const onChange = vi.fn();
    render(
      <EmailsSendingFilterBar
        apiKeys={defaultApiKeys}
        onFiltersChange={onChange}
      />,
    );
    fireEvent.click(screen.getByText("Last 15 days"));
    fireEvent.click(screen.getByText("Today"));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ dateRange: "Today" }),
    );
  });
});
