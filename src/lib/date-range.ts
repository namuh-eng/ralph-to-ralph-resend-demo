export const DATE_RANGE_PRESETS = [
  "Today",
  "Yesterday",
  "Last 3 days",
  "Last 7 days",
  "Last 15 days",
  "Last 30 days",
] as const;

export type DateRangePreset = (typeof DATE_RANGE_PRESETS)[number];

const PRESET_DAYS: Record<DateRangePreset, number> = {
  Today: 1,
  Yesterday: 1,
  "Last 3 days": 3,
  "Last 7 days": 7,
  "Last 15 days": 15,
  "Last 30 days": 30,
};

function cloneDate(date: Date): Date {
  return new Date(date.getTime());
}

export function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseIsoDate(value: string): Date {
  return new Date(`${value}T00:00:00`);
}

export function isCustomDateRange(value: string): boolean {
  return value.startsWith("custom:");
}

export function parseCustomDateRange(
  value: string,
): { startDate: string; endDate: string } | null {
  if (!isCustomDateRange(value)) {
    return null;
  }

  const parts = value.split(":");
  if (parts.length !== 3) {
    return null;
  }

  const [, startDate, endDate] = parts;
  if (!startDate || !endDate) {
    return null;
  }

  return { startDate, endDate };
}

export function serializeCustomDateRange(start: Date, end: Date): string {
  const startDate = toIsoDate(start);
  const endDate = toIsoDate(end);
  return `custom:${startDate}:${endDate}`;
}

export function getDateRangeBounds(
  value: string,
  nowInput: Date = new Date(),
): { start: Date; end: Date } {
  const customRange = parseCustomDateRange(value);
  if (customRange) {
    return {
      start: startOfDay(parseIsoDate(customRange.startDate)),
      end: endOfDay(parseIsoDate(customRange.endDate)),
    };
  }

  const now = cloneDate(nowInput);
  const end = endOfDay(now);

  if (value === "Yesterday") {
    const yesterday = cloneDate(now);
    yesterday.setDate(yesterday.getDate() - 1);
    return {
      start: startOfDay(yesterday),
      end: endOfDay(yesterday),
    };
  }

  if (value === "Today") {
    return {
      start: startOfDay(now),
      end,
    };
  }

  const days = PRESET_DAYS[(value as DateRangePreset) || "Last 15 days"] ?? 15;
  const start = cloneDate(now);
  start.setDate(start.getDate() - (days - 1));
  return {
    start: startOfDay(start),
    end,
  };
}

export function formatDateRangeLabel(value: string): string {
  const customRange = parseCustomDateRange(value);
  if (!customRange) {
    return value;
  }

  const start = parseIsoDate(customRange.startDate);
  const end = parseIsoDate(customRange.endDate);

  const startLabel = start.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  const endLabel = end.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  if (customRange.startDate === customRange.endDate) {
    return startLabel;
  }

  return `${startLabel} - ${endLabel}`;
}

export function startOfDay(date: Date): Date {
  const next = cloneDate(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

export function endOfDay(date: Date): Date {
  const next = cloneDate(date);
  next.setHours(23, 59, 59, 999);
  return next;
}
