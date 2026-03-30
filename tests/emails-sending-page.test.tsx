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
      createdAt: "2026-03-29T10:00:00Z",
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
});
