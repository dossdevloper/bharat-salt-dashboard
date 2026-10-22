import { orderBucket, assetBucket, rangeBounds } from "./metrics";
import { MODULES } from "../config";

// Rule-based alerts shown in the strip under the hero.
export function buildAlerts(data, errors) {
  const out = [];
  Object.entries(errors).forEach(([k, msg]) =>
    out.push({ tone: "bad", title: `${MODULES[k].label} not loaded`, text: msg, view: k }),
  );
  const today = new Date();
  const overdue = data.processOrders.filter((o) => o.endDate && o.endDate < today && !["Completed", "Cancelled"].includes(orderBucket(o.status)));
  if (overdue.length) out.push({ tone: "bad", title: `${overdue.length} process orders overdue`, text: overdue.slice(0, 3).map((o) => o.number).join(", "), view: "processOrders" });
  const hold = data.processOrders.filter((o) => orderBucket(o.status) === "On Hold");
  if (hold.length) out.push({ tone: "warn", title: `${hold.length} orders on hold`, text: "Review blockers before next shift", view: "processOrders" });
  const maint = data.crystallizers.filter((c) => assetBucket(c.status) === "Maintenance");
  if (maint.length) out.push({ tone: "warn", title: `${maint.length} crystallizers in maintenance`, text: maint.slice(0, 3).map((c) => c.name).join(", "), view: "crystallizers" });
  const { from } = rangeBounds("today");
  const todayEntries = data.dailyProduction.filter((p) => p.date && p.date >= from);
  if (!todayEntries.length) out.push({ tone: "info", title: "No production entry today", text: "Daily Production Entry is pending for today", view: "dailyProduction" });
  else out.push({ tone: "good", title: `${todayEntries.length} production entries today`, text: "Daily log is up to date", view: "dailyProduction" });
  const pending = data.productionReceipt.filter((r) => /pend|qc|hold/i.test(r.status));
  if (pending.length) out.push({ tone: "info", title: `${pending.length} receipts pending QC`, text: "Awaiting quality clearance", view: "productionReceipt" });
  return out;
}
