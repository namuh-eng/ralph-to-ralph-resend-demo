import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
  useParams: () => ({ id: "test-broadcast-id" }),
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("BroadcastEditor", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    // Default: broadcast GET
    mockFetch.mockImplementation((url: string) => {
      if (typeof url === "string" && url.includes("/api/broadcasts/")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              id: "test-broadcast-id",
              name: "Untitled",
              from: "",
              replyTo: "",
              subject: "",
              previewText: "",
              html: "",
              status: "draft",
              segmentId: null,
              topicId: null,
              scheduledAt: null,
            }),
        });
      }
      if (typeof url === "string" && url.includes("/api/domains")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              data: [
                {
                  id: "d1",
                  name: "example.com",
                  status: "verified",
                },
              ],
            }),
        });
      }
      if (typeof url === "string" && url.includes("/api/segments")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              data: [{ id: "s1", name: "All contacts" }],
            }),
        });
      }
      if (typeof url === "string" && url.includes("/api/topics")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              data: [{ id: "t1", name: "Newsletter" }],
            }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      });
    });
  });

  afterEach(() => {
    cleanup();
  });

  it("renders default form fields — From, To, Subject visible", async () => {
    const { BroadcastEditor } = await import("@/components/broadcast-editor");
    render(<BroadcastEditor broadcastId="test-broadcast-id" />);

    // Wait for data to load
    const fromLabel = await screen.findByText("From");
    expect(fromLabel).toBeDefined();
    expect(screen.getByText("To")).toBeDefined();
    expect(screen.getByText("Subject")).toBeDefined();
    expect(screen.getByText("Subscribe to")).toBeDefined();
  });

  it("Reply-To, When, Preview text are toggleable (hidden by default)", async () => {
    const { BroadcastEditor } = await import("@/components/broadcast-editor");
    render(<BroadcastEditor broadcastId="test-broadcast-id" />);

    await screen.findByText("From");

    // Toggle buttons should exist
    expect(screen.getByText("Reply-To")).toBeDefined();
    expect(screen.getByText("When")).toBeDefined();
    expect(screen.getByText("Preview text")).toBeDefined();

    // Reply-To input should not be visible until toggled
    expect(screen.queryByPlaceholderText("reply@example.com")).toBeNull();

    // Click Reply-To toggle
    fireEvent.click(screen.getByText("Reply-To"));

    // Now the input should appear
    expect(screen.getByPlaceholderText("reply@example.com")).toBeDefined();
  });

  it("shows header with back arrow, breadcrumb, draft badge, Test email and Review buttons", async () => {
    const { BroadcastEditor } = await import("@/components/broadcast-editor");
    render(<BroadcastEditor broadcastId="test-broadcast-id" />);

    await screen.findByText("From");

    expect(screen.getByText("Broadcasts")).toBeDefined();
    expect(screen.getByText("Draft")).toBeDefined();
    expect(screen.getByText("Test email")).toBeDefined();
    expect(screen.getByText("Review")).toBeDefined();
  });

  it("title is inline-editable", async () => {
    const { BroadcastEditor } = await import("@/components/broadcast-editor");
    render(<BroadcastEditor broadcastId="test-broadcast-id" />);

    await screen.findByText("From");

    // Find the editable title
    const titleInput = screen.getByDisplayValue("Untitled");
    expect(titleInput).toBeDefined();

    // Edit it
    fireEvent.change(titleInput, { target: { value: "My Newsletter" } });
    expect((titleInput as HTMLInputElement).value).toBe("My Newsletter");
  });

  it("preview text has maxlength 150", async () => {
    const { BroadcastEditor } = await import("@/components/broadcast-editor");
    render(<BroadcastEditor broadcastId="test-broadcast-id" />);

    await screen.findByText("From");

    // Toggle preview text
    fireEvent.click(screen.getByText("Preview text"));

    const previewInput = screen.getByPlaceholderText(
      "Preview text (max 150 characters)",
    );
    expect(previewInput).toBeDefined();
    expect(previewInput.getAttribute("maxLength")).toBe("150");
  });

  it("From input shows autocomplete from verified domains", async () => {
    const { BroadcastEditor } = await import("@/components/broadcast-editor");

    await act(async () => {
      render(<BroadcastEditor broadcastId="test-broadcast-id" />);
    });

    // Allow all fetches (broadcast, domains, segments, topics) to resolve
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    const fromInput = screen.getByPlaceholderText("Acme <acme@example.com>");
    expect(fromInput).toBeDefined();

    // Focus to trigger autocomplete
    await act(async () => {
      fireEvent.focus(fromInput);
      fireEvent.change(fromInput, { target: { value: "test" } });
    });

    // Should show domain suggestion
    const suggestion = await screen.findByText(/@example\.com/);
    expect(suggestion).toBeDefined();
  });

  it("To input shows segments", async () => {
    const { BroadcastEditor } = await import("@/components/broadcast-editor");
    render(<BroadcastEditor broadcastId="test-broadcast-id" />);

    await screen.findByText("From");

    const toInput = screen.getByPlaceholderText("Select a segment...");
    expect(toInput).toBeDefined();

    fireEvent.focus(toInput);

    const segmentOption = await screen.findByText("All contacts");
    expect(segmentOption).toBeDefined();
  });

  it("Subscribe to shows topics dropdown", async () => {
    const { BroadcastEditor } = await import("@/components/broadcast-editor");
    render(<BroadcastEditor broadcastId="test-broadcast-id" />);

    await screen.findByText("From");

    // Find Subscribe to select
    const topicSelect = screen.getByText("Select a topic");
    expect(topicSelect).toBeDefined();

    fireEvent.click(topicSelect);

    const topicOption = await screen.findByText("Newsletter");
    expect(topicOption).toBeDefined();
  });
});
