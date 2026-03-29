import { EmailsHeader } from "@/components/emails-header";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(cleanup);

// Mock next/link
vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe("Emails page layout", () => {
  it("renders Emails page title", () => {
    render(<EmailsHeader activeTab="sending" />);
    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading.textContent).toBe("Emails");
  });

  it("renders Sending and Receiving tabs", () => {
    render(<EmailsHeader activeTab="sending" />);
    expect(screen.getByText("Sending")).toBeDefined();
    expect(screen.getByText("Receiving")).toBeDefined();
  });

  it("marks Sending tab as active by default", () => {
    render(<EmailsHeader activeTab="sending" />);
    const sendingTab = screen.getByText("Sending").closest("a");
    expect(sendingTab?.getAttribute("data-state")).toBe("active");
  });

  it("marks Receiving tab as active when on receiving page", () => {
    render(<EmailsHeader activeTab="receiving" />);
    const receivingTab = screen.getByText("Receiving").closest("a");
    expect(receivingTab?.getAttribute("data-state")).toBe("active");
    const sendingTab = screen.getByText("Sending").closest("a");
    expect(sendingTab?.getAttribute("data-state")).toBe("inactive");
  });

  it("Sending tab links to /emails", () => {
    render(<EmailsHeader activeTab="sending" />);
    const sendingTab = screen.getByText("Sending").closest("a");
    expect(sendingTab?.getAttribute("href")).toBe("/emails");
  });

  it("Receiving tab links to /emails/receiving", () => {
    render(<EmailsHeader activeTab="sending" />);
    const receivingTab = screen.getByText("Receiving").closest("a");
    expect(receivingTab?.getAttribute("href")).toBe("/emails/receiving");
  });

  it("renders More actions button", () => {
    render(<EmailsHeader activeTab="sending" />);
    const moreBtn = screen.getByLabelText("More actions");
    expect(moreBtn).toBeDefined();
  });

  it("More actions dropdown shows Go to docs", () => {
    render(<EmailsHeader activeTab="sending" />);
    const moreBtn = screen.getByLabelText("More actions");
    fireEvent.click(moreBtn);
    expect(screen.getByText("Go to docs")).toBeDefined();
  });
});
