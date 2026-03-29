import { DataTable } from "@/components/data-table";
import type { Column } from "@/components/data-table";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

afterEach(() => {
  cleanup();
});

interface TestRow {
  id: string;
  name: string;
  status: string;
  created: Date;
}

const columns: Column<TestRow>[] = [
  { key: "name", header: "Name", sortable: true },
  { key: "status", header: "Status" },
  {
    key: "created",
    header: "Created",
    render: (row) => row.created.toISOString(),
  },
];

const rows: TestRow[] = [
  {
    id: "1",
    name: "Item A",
    status: "Active",
    created: new Date("2026-01-01"),
  },
  {
    id: "2",
    name: "Item B",
    status: "Draft",
    created: new Date("2026-01-02"),
  },
  {
    id: "3",
    name: "Item C",
    status: "Sent",
    created: new Date("2026-01-03"),
  },
];

describe("DataTable", () => {
  it("renders table with headers and rows", () => {
    render(<DataTable columns={columns} rows={rows} getRowId={(r) => r.id} />);
    expect(screen.getByText("Name")).toBeDefined();
    expect(screen.getByText("Status")).toBeDefined();
    expect(screen.getByText("Created")).toBeDefined();
    expect(screen.getByText("Item A")).toBeDefined();
    expect(screen.getByText("Item B")).toBeDefined();
    expect(screen.getByText("Item C")).toBeDefined();
  });

  it("renders custom cell content via render function", () => {
    render(<DataTable columns={columns} rows={rows} getRowId={(r) => r.id} />);
    expect(screen.getByText("2026-01-01T00:00:00.000Z")).toBeDefined();
  });

  it("renders empty state when no rows", () => {
    render(
      <DataTable
        columns={columns}
        rows={[] as TestRow[]}
        getRowId={(r) => r.id}
        emptyMessage="No items found"
      />,
    );
    expect(screen.getByText("No items found")).toBeDefined();
  });

  it("checkbox select all toggles all rows", () => {
    render(
      <DataTable
        columns={columns}
        rows={rows}
        getRowId={(r) => r.id}
        checkboxEnabled={true}
      />,
    );
    const checkboxes = screen.getAllByRole("checkbox");
    expect(checkboxes.length).toBe(4); // 1 header + 3 rows

    // Click header checkbox — should check all
    fireEvent.click(checkboxes[0]);
    const allChecked = screen
      .getAllByRole("checkbox")
      .every((cb) => (cb as HTMLInputElement).checked);
    expect(allChecked).toBe(true);

    // Click header checkbox again — should uncheck all
    fireEvent.click(checkboxes[0]);
    const allUnchecked = screen
      .getAllByRole("checkbox")
      .every((cb) => !(cb as HTMLInputElement).checked);
    expect(allUnchecked).toBe(true);
  });

  it("individual row checkbox toggles independently", () => {
    render(
      <DataTable
        columns={columns}
        rows={rows}
        getRowId={(r) => r.id}
        checkboxEnabled={true}
      />,
    );
    const checkboxes = screen.getAllByRole("checkbox");
    fireEvent.click(checkboxes[1]);
    expect((checkboxes[1] as HTMLInputElement).checked).toBe(true);
    expect((checkboxes[2] as HTMLInputElement).checked).toBe(false);
  });

  it("calls onRowClick when a row is clicked", () => {
    const clickedRows: TestRow[] = [];
    render(
      <DataTable
        columns={columns}
        rows={rows}
        getRowId={(r) => r.id}
        onRowClick={(row) => {
          clickedRows.push(row);
        }}
      />,
    );
    fireEvent.click(screen.getByText("Item B"));
    expect(clickedRows.length).toBe(1);
    expect(clickedRows[0].name).toBe("Item B");
  });

  it("renders row actions menu button when actions provided", () => {
    render(
      <DataTable
        columns={columns}
        rows={rows}
        getRowId={(r) => r.id}
        actions={[{ label: "Delete", onClick: () => {} }]}
      />,
    );
    const buttons = screen.getAllByRole("button", { name: "More actions" });
    expect(buttons.length).toBe(3);
  });

  it("shows action menu items when action button is clicked", () => {
    render(
      <DataTable
        columns={columns}
        rows={rows}
        getRowId={(r) => r.id}
        actions={[
          { label: "Edit", onClick: () => {} },
          { label: "Delete", onClick: () => {} },
        ]}
      />,
    );
    const buttons = screen.getAllByRole("button", { name: "More actions" });
    fireEvent.click(buttons[0]);
    expect(screen.getByText("Edit")).toBeDefined();
    expect(screen.getByText("Delete")).toBeDefined();
  });

  it("does not render checkbox column when checkboxEnabled is false", () => {
    render(
      <DataTable
        columns={columns}
        rows={rows}
        getRowId={(r) => r.id}
        checkboxEnabled={false}
      />,
    );
    const checkboxes = screen.queryAllByRole("checkbox");
    expect(checkboxes.length).toBe(0);
  });

  it("renders correct number of columns", () => {
    render(<DataTable columns={columns} rows={rows} getRowId={(r) => r.id} />);
    const headerCells = screen.getAllByRole("columnheader");
    expect(headerCells.length).toBe(3);
  });

  it("renders correct number of rows", () => {
    render(<DataTable columns={columns} rows={rows} getRowId={(r) => r.id} />);
    const dataRows = screen.getAllByRole("row");
    // 1 header row + 3 data rows
    expect(dataRows.length).toBe(4);
  });

  it("sorts rows ascending and descending when a sortable header is clicked", () => {
    const unsortedRows = [rows[2], rows[0], rows[1]];
    render(
      <DataTable
        columns={columns}
        rows={unsortedRows}
        getRowId={(r) => r.id}
      />,
    );

    const nameHeader = screen.getByRole("button", { name: /Name/ });
    fireEvent.click(nameHeader);

    let renderedRows = screen
      .getAllByRole("row")
      .slice(1)
      .map((row) => row.textContent);
    expect(renderedRows[0]).toContain("Item A");
    expect(renderedRows[1]).toContain("Item B");
    expect(renderedRows[2]).toContain("Item C");
    expect(
      screen
        .getByRole("columnheader", { name: /Name/ })
        .getAttribute("aria-sort"),
    ).toBe("ascending");

    fireEvent.click(nameHeader);
    renderedRows = screen
      .getAllByRole("row")
      .slice(1)
      .map((row) => row.textContent);
    expect(renderedRows[0]).toContain("Item C");
    expect(renderedRows[1]).toContain("Item B");
    expect(renderedRows[2]).toContain("Item A");
    expect(
      screen
        .getByRole("columnheader", { name: /Name/ })
        .getAttribute("aria-sort"),
    ).toBe("descending");
  });
});
