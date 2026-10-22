import { UNIT } from "../config";

export const RANGES = [
  { key: "today", label: "Today" },
  { key: "week", label: "This week" },
  { key: "month", label: "This month" },
  { key: "year", label: "This year" },
  { key: "all", label: "All time" },
];

const startOfDay = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

// Returns [from, to) for the current period and the equivalent previous one.
export function rangeBounds(key, now = new Date()) {
  const today = startOfDay(now);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  let from, prevFrom, prevTo;
  switch (key) {
    case "today":
      from = today;
      prevFrom = new Date(today);
      prevFrom.setDate(today.getDate() - 1);
      prevTo = today;
      break;
    case "week": {
      from = new Date(today);
      from.setDate(today.getDate() - ((today.getDay() + 6) % 7)); // Monday
      prevFrom = new Date(from);
      prevFrom.setDate(from.getDate() - 7);
      prevTo = new Date(prevFrom);
      prevTo.setDate(prevFrom.getDate() + (today - from) / 864e5 + 1);
      break;
    }
    case "month":
      from = new Date(today.getFullYear(), today.getMonth(), 1);
      prevFrom = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      prevTo = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate() + 1);
      break;
    case "year":
      from = new Date(today.getFullYear(), 0, 1);
      prevFrom = new Date(today.getFullYear() - 1, 0, 1);
      prevTo = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate() + 1);
      break;
    default:
      return { from: null, to: null, prevFrom: null, prevTo: null };
  }
  return { from, to: tomorrow, prevFrom, prevTo };
}

export const inRange = (date, from, to) => !from || (date && date >= from && date < to);

export function filterByRange(rows, key) {
  const { from, to, prevFrom, prevTo } = rangeBounds(key);
  return {
    current: rows.filter((r) => inRange(r.date, from, to)),
    previous: from ? rows.filter((r) => inRange(r.date, prevFrom, prevTo)) : null,
  };
}

export const sum = (rows, k) => rows.reduce((a, r) => a + (r[k] || 0), 0);

export function delta(cur, prev) {
  if (prev == null || prev === 0) return null;
  return ((cur - prev) / prev) * 100;
}

// Map free-text statuses onto a fixed set so colours stay stable.
export function orderBucket(status = "") {
  const s = status.toLowerCase();
  if (/cancel|reject|void/.test(s)) return "Cancelled";
  if (/hold|pause|block/.test(s)) return "On Hold";
  if (/complete|closed|done|finish|teco/.test(s)) return "Completed";
  if (/progress|process|partial|running|release|start|wip/.test(s)) return "In Progress";
  return "Open";
}

export const ORDER_STATES = [
  { key: "Open", tone: "violet", hint: "Awaiting release" },
  { key: "In Progress", tone: "blue", hint: "On the pans" },
  { key: "Completed", tone: "good", hint: "Fully produced" },
  { key: "On Hold", tone: "warn", hint: "Paused" },
  { key: "Cancelled", tone: "bad", hint: "Withdrawn" },
];

export function assetBucket(status = "") {
  const s = status.toLowerCase();
  if (/maint|repair|service|break/.test(s)) return "Maintenance";
  if (/idle|inactive|closed|stop|dry/.test(s)) return "Idle";
  return "Active";
}

// Daily (≤ 31 days) or monthly series of a quantity field.
export function timeSeries(rows, key, valueKey = "quantity", now = new Date()) {
  const today = startOfDay(now);
  if (key === "year" || key === "all") {
    const months = key === "year" ? today.getMonth() + 1 : 12;
    const buckets = [];
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      buckets.push({ date: d, label: d.toLocaleString("en-IN", { month: "short" }), value: 0 });
    }
    const first = buckets[0].date;
    rows.forEach((r) => {
      if (!r.date || r.date < first) return;
      const idx = (r.date.getFullYear() - first.getFullYear()) * 12 + r.date.getMonth() - first.getMonth();
      if (buckets[idx]) buckets[idx].value += r[valueKey] || 0;
    });
    return { buckets, grain: "month" };
  }
  const days = key === "month" ? Math.max(14, today.getDate()) : 14;
  const buckets = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    buckets.push({ date: d, label: d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }), value: 0 });
  }
  const first = buckets[0].date;
  rows.forEach((r) => {
    if (!r.date || r.date < first) return;
    const idx = Math.round((startOfDay(r.date) - first) / 864e5);
    if (buckets[idx]) buckets[idx].value += r[valueKey] || 0;
  });
  return { buckets, grain: "day" };
}

export function groupSum(rows, groupKey, valueKey) {
  const map = new Map();
  rows.forEach((r) => {
    const k = r[groupKey] || "Unassigned";
    map.set(k, (map.get(k) || 0) + (r[valueKey] || 0));
  });
  return [...map.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
}

// ── Formatting ───────────────────────────────────────────────

export function fmtNum(n, digits = 0) {
  if (!Number.isFinite(n)) return "–";
  return n.toLocaleString("en-IN", { maximumFractionDigits: digits, minimumFractionDigits: 0 });
}

export function fmtQty(n) {
  if (!Number.isFinite(n)) return "–";
  if (Math.abs(n) >= 1e5) return `${(n / 1e5).toFixed(2)} L ${UNIT}`;
  if (Math.abs(n) >= 1e3) return `${(n / 1e3).toFixed(1)}K ${UNIT}`;
  return `${fmtNum(n, 1)} ${UNIT}`;
}

export const fmtDate = (d) =>
  d ? d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "–";
