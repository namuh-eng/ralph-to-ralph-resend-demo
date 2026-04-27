import { EmailsSendingPage } from "@/components/emails-sending-page";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mockReplace = vi.fn();
let mockSearchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  usePathname: () => "/emails",
  useRouter: () => ({ replace: mockReplace }),
  useSearchParams: () => mockSearchParams,
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
    [key: string]: unknown;
  }) => {
    const React = require("react");
    return React.createElement("a", { href, ...props }, children);
  },
}));

afterEach(() => {
  cleanup();
  mockReplace.mockReset();
  mockSearchParams = new URLSearchParams();
});

function daysAgo(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

describe("EmailsSendingPage", () => {
  const apiKeys = [
    { id: "key-1", name: "Production Key" },
    { id: "key-2", name: "Sandbox Key" },
  ];

  const emails = [
    {
      id: "email-1",
      to: ["alice@example.com"],
      lastEvent: "delivered",
      subject: "Welcome email",
      createdAt: daysAgo(1),
    },
    {
      id: "email-2",
      to: ["bob@example.com"],
      lastEvent: "bounced",
      subject: "Follow-up email",
      createdAt: daysAgo(2),
    },
  ];

  it("syncs combined filter state to URL query params", async () => {
    vi.useFakeTimers();

    render(<EmailsSendingPage apiKeys={apiKeys} emails={emails} />);

    fireEvent.change(screen.getByPlaceholderText("Search..."), {
      target: { value: "alice" },
    });
    vi.advanceTimersByTime(350);

    fireEvent.click(screen.getByText("All Statuses"));
    const deliveredOption = screen
      .getAllByText("Delivered")
      .find((element) => element.closest("button"));
    expect(deliveredOption).toBeDefined();
    if (!deliveredOption) {
      throw new Error("Delivered filter option was not rendered");
    }
    fireEvent.click(deliveredOption);

    fireEvent.click(screen.getByText("All API Keys"));
    fireEvent.click(screen.getByText("Production Key"));

    fireEvent.click(screen.getByText("Last 15 days"));
    fireEvent.click(screen.getByText("Today"));

    vi.useRealTimers();

    await waitFor(() => {
      expect(mockReplace).toHaveBeenLastCalledWith(
        "/emails?search=alice&status=delivered&apiKeyId=key-1&dateRange=Today",
      );
    });
  });

  it("resyncs the filter bar and table when search params change after mount", async () => {
    mockSearchParams = new URLSearchParams("search=alice&status=delivered");

    const { rerender } = render(
      <EmailsSendingPage apiKeys={apiKeys} emails={emails} />,
    );

    expect(screen.getByPlaceholderText("Search...").getAttribute("value")).toBe(
      "alice",
    );
    expect(screen.getByRole("button", { name: /Delivered/i })).toBeDefined();
    expect(screen.getByText("alice@example.com")).toBeDefined();
    expect(screen.queryByText("bob@example.com")).toBeNull();

    mockSearchParams = new URLSearchParams("search=bob&status=bounced");
    rerender(<EmailsSendingPage apiKeys={apiKeys} emails={emails} />);

    await waitFor(() => {
      expect(
        screen.getByPlaceholderText("Search...").getAttribute("value"),
      ).toBe("bob");
      expect(screen.getByRole("button", { name: /Bounced/i })).toBeDefined();
      expect(screen.getByText("bob@example.com")).toBeDefined();
    });

    expect(screen.queryByText("alice@example.com")).toBeNull();
  });
});
