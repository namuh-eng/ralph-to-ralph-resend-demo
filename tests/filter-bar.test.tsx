import { ComboboxFilter } from "@/components/combobox-filter";
import { DateRangePicker } from "@/components/date-range-picker";
import { DropdownFilter } from "@/components/dropdown-filter";
import { ExportButton } from "@/components/export-button";
import { SearchInput } from "@/components/search-input";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(cleanup);

describe("SearchInput", () => {
  it("renders with placeholder text", () => {
    render(<SearchInput value="" onChange={() => {}} />);
    expect(screen.getByPlaceholderText("Search...")).toBeTruthy();
  });

  it("calls onChange when typing", () => {
    const onChange = vi.fn();
    render(<SearchInput value="" onChange={onChange} />);
    fireEvent.change(screen.getByPlaceholderText("Search..."), {
      target: { value: "test" },
    });
    expect(onChange).toHaveBeenCalledWith("test");
  });

  it("renders search icon", () => {
    render(<SearchInput value="" onChange={() => {}} />);
    const svg = document.querySelector("svg");
    expect(svg).toBeTruthy();
  });
});

describe("DateRangePicker", () => {
  const presets = [
    "Today",
    "Yesterday",
    "Last 3 days",
    "Last 7 days",
    "Last 15 days",
    "Last 30 days",
  ];

  it("renders button with default label", () => {
    render(<DateRangePicker value="Last 15 days" onChange={() => {}} />);
    expect(screen.getByText("Last 15 days")).toBeTruthy();
  });

  it("shows 6 presets when opened", () => {
    render(<DateRangePicker value="Last 15 days" onChange={() => {}} />);
    fireEvent.click(screen.getByText("Last 15 days"));
    for (const preset of presets) {
      // Some presets may appear in both trigger and dropdown
      const matches = screen.getAllByText(preset);
      expect(matches.length).toBeGreaterThanOrEqual(1);
    }
  });

  it("shows calendar month view when opened", () => {
    render(<DateRangePicker value="Last 15 days" onChange={() => {}} />);
    fireEvent.click(screen.getByText("Last 15 days"));
    // Calendar should show day-of-week headers (some letters repeat)
    const allText = document.body.textContent ?? "";
    expect(allText).toContain("S");
    expect(allText).toContain("M");
    expect(allText).toContain("W");
    expect(allText).toContain("F");
  });

  it("calls onChange when preset is selected", () => {
    const onChange = vi.fn();
    render(<DateRangePicker value="Last 15 days" onChange={onChange} />);
    fireEvent.click(screen.getByText("Last 15 days"));
    fireEvent.click(screen.getByText("Last 7 days"));
    expect(onChange).toHaveBeenCalledWith("Last 7 days");
  });

  it("shows checkmark on selected preset", () => {
    render(<DateRangePicker value="Last 15 days" onChange={() => {}} />);
    fireEvent.click(screen.getByText("Last 15 days"));
    // The selected preset row should contain a checkmark — find the one inside the popover
    const allButtons = screen.getAllByText("Last 15 days");
    const popoverButton = allButtons[allButtons.length - 1].closest("button");
    expect(popoverButton?.querySelector("svg")).toBeTruthy();
  });

  it("has month navigation arrows", () => {
    render(<DateRangePicker value="Last 15 days" onChange={() => {}} />);
    fireEvent.click(screen.getByText("Last 15 days"));
    expect(screen.getByLabelText("Previous month")).toBeTruthy();
    expect(screen.getByLabelText("Next month")).toBeTruthy();
  });

  it("calls onChange with a custom range when two calendar days are selected", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-29T12:00:00Z"));

    const onChange = vi.fn();
    render(<DateRangePicker value="Last 15 days" onChange={onChange} />);

    fireEvent.click(screen.getByText("Last 15 days"));
    fireEvent.click(screen.getByText("20"));
    fireEvent.click(screen.getByText("25"));

    expect(onChange).toHaveBeenCalledWith("custom:2026-03-20:2026-03-25");

    vi.useRealTimers();
  });
});

describe("DropdownFilter", () => {
  const options = [
    { value: "all", label: "All Statuses" },
    { value: "delivered", label: "Delivered", color: "#22c55e" },
    { value: "bounced", label: "Bounced", color: "#ef4444" },
    { value: "failed", label: "Failed", color: "#ef4444" },
  ];

  it("renders with selected value label", () => {
    render(
      <DropdownFilter options={options} value="all" onChange={() => {}} />,
    );
    expect(screen.getByText("All Statuses")).toBeTruthy();
  });

  it("shows all options when opened", () => {
    render(
      <DropdownFilter options={options} value="all" onChange={() => {}} />,
    );
    fireEvent.click(screen.getByText("All Statuses"));
    for (const opt of options) {
      const matches = screen.getAllByText(opt.label);
      expect(matches.length).toBeGreaterThanOrEqual(1);
    }
  });

  it("shows colored dot indicators", () => {
    render(
      <DropdownFilter options={options} value="all" onChange={() => {}} />,
    );
    fireEvent.click(screen.getByText("All Statuses"));
    const dots = document.querySelectorAll('[data-testid="color-dot"]');
    // Options with color should have dots
    expect(dots.length).toBeGreaterThanOrEqual(2);
  });

  it("calls onChange when option selected", () => {
    const onChange = vi.fn();
    render(
      <DropdownFilter options={options} value="all" onChange={onChange} />,
    );
    fireEvent.click(screen.getByText("All Statuses"));
    fireEvent.click(screen.getByText("Delivered"));
    expect(onChange).toHaveBeenCalledWith("delivered");
  });

  it("shows checkmark on selected option", () => {
    render(
      <DropdownFilter options={options} value="all" onChange={() => {}} />,
    );
    fireEvent.click(screen.getByText("All Statuses"));
    const selectedOption = screen
      .getAllByText("All Statuses")[1]
      .closest("button");
    expect(selectedOption?.querySelector("svg")).toBeTruthy();
  });
});

describe("ComboboxFilter", () => {
  const options = [
    { value: "all", label: "All API Keys" },
    { value: "key1", label: "Production Key" },
    { value: "key2", label: "Test Key" },
  ];

  it("renders with selected value label", () => {
    render(
      <ComboboxFilter options={options} value="all" onChange={() => {}} />,
    );
    expect(screen.getByText("All API Keys")).toBeTruthy();
  });

  it("shows search input when opened", () => {
    render(
      <ComboboxFilter options={options} value="all" onChange={() => {}} />,
    );
    fireEvent.click(screen.getByText("All API Keys"));
    expect(screen.getByPlaceholderText("Search...")).toBeTruthy();
  });

  it("filters options based on search", () => {
    render(
      <ComboboxFilter options={options} value="all" onChange={() => {}} />,
    );
    fireEvent.click(screen.getByText("All API Keys"));
    fireEvent.change(screen.getByPlaceholderText("Search..."), {
      target: { value: "prod" },
    });
    expect(screen.getByText("Production Key")).toBeTruthy();
    expect(screen.queryByText("Test Key")).toBeNull();
  });

  it("calls onChange when option selected", () => {
    const onChange = vi.fn();
    render(
      <ComboboxFilter options={options} value="all" onChange={onChange} />,
    );
    fireEvent.click(screen.getByText("All API Keys"));
    fireEvent.click(screen.getByText("Production Key"));
    expect(onChange).toHaveBeenCalledWith("key1");
  });
});

describe("ExportButton", () => {
  it("renders export button with icon", () => {
    render(<ExportButton onClick={() => {}} />);
    const button = screen.getByLabelText("Export");
    expect(button).toBeTruthy();
    expect(button.querySelector("svg")).toBeTruthy();
  });

  it("calls onClick when clicked", () => {
    const onClick = vi.fn();
    render(<ExportButton onClick={onClick} />);
    fireEvent.click(screen.getByLabelText("Export"));
    expect(onClick).toHaveBeenCalled();
  });
});
