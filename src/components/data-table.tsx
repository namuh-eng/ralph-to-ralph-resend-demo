"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
  sortable?: boolean;
}

export interface RowAction<T> {
  label: string;
  onClick: (row: T) => void;
  separator?: boolean;
  destructive?: boolean;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  getRowId: (row: T) => string;
  checkboxEnabled?: boolean;
  onRowClick?: (row: T) => void;
  actions?: RowAction<T>[];
  emptyMessage?: string;
}

type SortDirection = "asc" | "desc";

function getComparableValue(value: unknown): number | string | null {
  if (value == null) return null;
  if (value instanceof Date) return value.getTime();
  if (typeof value === "number") return value;
  if (typeof value === "boolean") return value ? 1 : 0;
  return String(value).toLowerCase();
}

export function DataTable<T>({
  columns,
  rows,
  getRowId,
  checkboxEnabled = false,
  onRowClick,
  actions,
  emptyMessage = "No data",
}: DataTableProps<T>) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const menuRef = useRef<HTMLDivElement>(null);

  const sortedRows = useMemo(() => {
    if (!sortKey) return rows;

    return [...rows].sort((left, right) => {
      const leftValue = getComparableValue(
        (left as Record<string, unknown>)[sortKey],
      );
      const rightValue = getComparableValue(
        (right as Record<string, unknown>)[sortKey],
      );

      if (leftValue == null && rightValue == null) return 0;
      if (leftValue == null) return 1;
      if (rightValue == null) return -1;

      const order =
        typeof leftValue === "number" && typeof rightValue === "number"
          ? leftValue - rightValue
          : String(leftValue).localeCompare(String(rightValue));

      return sortDirection === "asc" ? order : -order;
    });
  }, [rows, sortDirection, sortKey]);

  const allSelected =
    sortedRows.length > 0 && selectedIds.size === sortedRows.length;

  const toggleAll = useCallback(() => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(sortedRows.map(getRowId)));
    }
  }, [allSelected, sortedRows, getRowId]);

  const toggleRow = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const toggleSort = useCallback(
    (key: string) => {
      if (sortKey !== key) {
        setSortKey(key);
        setSortDirection("asc");
        return;
      }

      if (sortDirection === "asc") {
        setSortDirection("desc");
        return;
      }

      setSortKey(null);
      setSortDirection("asc");
    },
    [sortDirection, sortKey],
  );

  // Close menu when clicking outside
  useEffect(() => {
    if (!openMenuId) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [openMenuId]);

  const hasActions = actions && actions.length > 0;
  const totalCols =
    columns.length + (checkboxEnabled ? 1 : 0) + (hasActions ? 1 : 0);

  return (
    <table className="w-full">
      <thead>
        <tr className="border-b border-[rgba(176,199,217,0.145)]">
          {checkboxEnabled && (
            <th className="w-10 px-3 py-2 text-left">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleAll}
                className="accent-white rounded cursor-pointer"
                aria-label="Select all"
              />
            </th>
          )}
          {columns.map((col) => (
            <th
              key={col.key}
              aria-sort={
                col.sortable && sortKey === col.key
                  ? sortDirection === "asc"
                    ? "ascending"
                    : "descending"
                  : "none"
              }
              className="px-3 py-2 text-left text-[12px] font-medium text-[#A1A4A5] tracking-normal"
            >
              {col.sortable ? (
                <button
                  type="button"
                  className="inline-flex items-center gap-1 hover:text-[#F0F0F0] transition-colors"
                  onClick={() => toggleSort(col.key)}
                >
                  {col.header}
                  <span aria-hidden="true" className="text-[10px]">
                    {sortKey === col.key
                      ? sortDirection === "asc"
                        ? "▲"
                        : "▼"
                      : "↕"}
                  </span>
                </button>
              ) : (
                col.header
              )}
            </th>
          ))}
          {hasActions && <th className="w-10 px-3 py-2" />}
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 ? (
          <tr>
            <td
              colSpan={totalCols}
              className="px-3 py-12 text-center text-[14px] text-[#A1A4A5]"
            >
              {emptyMessage}
            </td>
          </tr>
        ) : (
          sortedRows.map((row) => {
            const id = getRowId(row);
            return (
              <tr
                key={id}
                className="border-b border-[rgba(176,199,217,0.145)] hover:bg-[rgba(24,25,28,0.5)] transition-colors"
              >
                {checkboxEnabled && (
                  <td className="w-10 px-3 py-2">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(id)}
                      onChange={() => toggleRow(id)}
                      className="accent-white rounded cursor-pointer"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </td>
                )}
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className="px-3 py-2 text-[14px] text-[#F0F0F0]"
                    onClick={() => onRowClick?.(row)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") onRowClick?.(row);
                    }}
                    style={onRowClick ? { cursor: "pointer" } : undefined}
                  >
                    {col.render
                      ? col.render(row)
                      : String((row as Record<string, unknown>)[col.key] ?? "")}
                  </td>
                ))}
                {hasActions && (
                  <td className="w-10 px-3 py-2 relative">
                    <button
                      type="button"
                      aria-label="More actions"
                      className="p-1 rounded hover:bg-[rgba(176,199,217,0.145)] text-[#A1A4A5] hover:text-[#F0F0F0] transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenMenuId(openMenuId === id ? null : id);
                      }}
                    >
                      <svg
                        aria-hidden="true"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <circle cx="12" cy="5" r="1.5" />
                        <circle cx="12" cy="12" r="1.5" />
                        <circle cx="12" cy="19" r="1.5" />
                      </svg>
                    </button>
                    {openMenuId === id && (
                      <div
                        ref={menuRef}
                        className="absolute right-0 top-full z-50 min-w-[180px] rounded-md border border-[rgba(176,199,217,0.145)] bg-[#1a1a1a] py-1 shadow-lg"
                      >
                        {actions.map((action) => (
                          <button
                            key={action.label}
                            type="button"
                            className={`w-full text-left px-3 py-1.5 text-[13px] hover:bg-[rgba(176,199,217,0.145)] transition-colors ${
                              action.destructive
                                ? "text-red-400"
                                : "text-[#F0F0F0]"
                            } ${action.separator ? "border-t border-[rgba(176,199,217,0.145)] mt-1 pt-1.5" : ""}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              action.onClick(row);
                              setOpenMenuId(null);
                            }}
                          >
                            {action.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </td>
                )}
              </tr>
            );
          })
        )}
      </tbody>
    </table>
  );
}
