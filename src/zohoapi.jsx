/* eslint-disable react-refresh/only-export-components -- plain data module, no components */
// Zoho Creator data layer — works with Widget SDK v2 (ZOHO.CREATOR.DATA)
// and falls back to v1 (ZOHO.CREATOR.API). When the SDK is absent
// (local `npm run dev`), demo data is served so the UI still renders.
import { APP_NAME, MAX_RECORDS, DATE_FORMAT, MODULES, LIVE_MODULES } from "./config";
import { buildMockData } from "./mockData";

const sdk = () => (typeof window !== "undefined" ? window.ZOHO?.CREATOR : undefined);

// Live only when the SDK is loaded AND we're embedded in Creator (an iframe).
// Add ?demo to the URL to force demo data.
export const isLive = () => {
  if (typeof window === "undefined" || /[?&]demo(=|&|$)/.test(window.location.search)) return false;
  return Boolean(sdk()) && window.self !== window.top;
};

let initPromise;
function ensureInit() {
  const c = sdk();
  if (!c) return Promise.resolve();
  if (!initPromise) initPromise = typeof c.init === "function" ? Promise.resolve(c.init()) : Promise.resolve();
  return initPromise;
}

const isNoRecords = (err) => {
  const code = err?.code ?? err?.responseText?.code;
  const msg = JSON.stringify(err ?? "");
  return code === 9280 || code === 3100 || /no records/i.test(msg);
};

async function fetchV2(reportName) {
  const c = sdk();
  const out = [];
  let cursor;
  do {
    const config = { report_name: reportName, max_records: 1000, field_config: "all" };
    if (APP_NAME) config.app_name = APP_NAME;
    if (cursor) config.record_cursor = cursor;
    let res;
    try {
      res = await c.DATA.getRecords(config);
    } catch (err) {
      if (isNoRecords(err)) break;
      throw err;
    }
    if (res?.code !== 3000) {
      if (isNoRecords(res)) break;
      throw new Error(res?.message || `Report ${reportName} returned code ${res?.code}`);
    }
    out.push(...(res.data || []));
    cursor = res.record_cursor;
  } while (cursor && out.length < MAX_RECORDS);
  return out;
}

async function fetchV1(reportName) {
  const c = sdk();
  const out = [];
  const pageSize = 200;
  for (let page = 1; out.length < MAX_RECORDS; page++) {
    const config = { reportName, page, pageSize };
    if (APP_NAME) config.appName = APP_NAME;
    let res;
    try {
      res = await c.API.getAllRecords(config);
    } catch (err) {
      if (isNoRecords(err)) break;
      throw err;
    }
    if (res?.code !== 3000) {
      if (isNoRecords(res)) break;
      throw new Error(res?.message || `Report ${reportName} returned code ${res?.code}`);
    }
    const rows = res.data || [];
    out.push(...rows);
    if (rows.length < pageSize) break;
  }
  return out;
}

export async function fetchReport(reportName) {
  await ensureInit();
  const c = sdk();
  if (c?.DATA?.getRecords) return fetchV2(reportName);
  if (c?.API?.getAllRecords) return fetchV1(reportName);
  throw new Error("Zoho Creator SDK not available");
}

// ── Field helpers ────────────────────────────────────────────

// Lookup fields arrive as { display_value, ID }; multi-selects as arrays.
export function display(v) {
  if (v == null) return "";
  if (Array.isArray(v)) return v.map(display).filter(Boolean).join(", ");
  if (typeof v === "object") return v.display_value ?? v.zc_display_value ?? v.value ?? "";
  return String(v);
}

function pickRaw(record, candidates = []) {
  for (const key of candidates) {
    if (record[key] !== undefined && record[key] !== null && record[key] !== "") return record[key];
  }
  return undefined;
}

export const pickText = (record, candidates) => display(pickRaw(record, candidates)).trim();

export function pickNumber(record, candidates) {
  const raw = display(pickRaw(record, candidates)).replace(/[^0-9.-]/g, "");
  const n = parseFloat(raw);
  return Number.isFinite(n) ? n : 0;
}

const MONTHS = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };

export function parseDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  const s = String(value).trim();
  let m;
  if ((m = s.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})/))) return new Date(+m[3], MONTHS[m[2].toLowerCase()], +m[1]);
  if ((m = s.match(/^(\d{4})-(\d{2})-(\d{2})/))) return new Date(+m[1], +m[2] - 1, +m[3]);
  if ((m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/))) {
    return DATE_FORMAT === "dd/MM/yyyy" ? new Date(+m[3], +m[2] - 1, +m[1]) : new Date(+m[3], +m[1] - 1, +m[2]);
  }
  const d = new Date(s);
  return isNaN(d) ? null : d;
}

const pickDate = (record, candidates) => parseDate(display(pickRaw(record, candidates)));

// ── Normalisers: raw Zoho records → flat dashboard rows ──────

const F = (key) => MODULES[key].fields;

const normalise = {
  processOrders: (r) => {
    const f = F("processOrders");
    const planned = pickNumber(r, f.planned);
    const produced = pickNumber(r, f.produced);
    const rawBalance = pickText(r, f.balance);
    const start = pickDate(r, f.startDate);
    return {
      id: r.ID,
      number: pickText(r, f.number) || `PO-${String(r.ID ?? "").slice(-5)}`,
      material: pickText(r, f.material),
      productionPlant: pickText(r, f.productionPlant),
      planningPlant: pickText(r, f.planningPlant),
      crystallizer: pickText(r, f.crystallizer),
      orderType: pickText(r, f.orderType),
      planning: pickText(r, f.planning),
      uom: pickText(r, f.uom),
      planned,
      produced,
      balance: rawBalance ? pickNumber(r, f.balance) : Math.max(0, planned - produced),
      shortExc: pickNumber(r, f.shortExc),
      delivered: pickNumber(r, f.delivered),
      status: pickText(r, f.status) || "Created",
      startDate: start,
      endDate: pickDate(r, f.endDate),
      releaseDate: pickDate(r, f.releaseDate),
      goodsReceipt: pickText(r, f.goodsReceipt),
      schedType: pickText(r, f.schedType),
      reduction: pickText(r, f.reduction),
      priority: pickText(r, f.priority),
      notes: pickText(r, f.notes),
      marginKey: pickText(r, f.marginKey),
      floatBefore: pickNumber(r, f.floatBefore),
      floatAfter: pickNumber(r, f.floatAfter),
      releasePeriod: pickNumber(r, f.releasePeriod),
      // period filters use the start date (falls back to when it was added)
      date: start || pickDate(r, f.created),
      // aliases used by the overview / alerts
      product: pickText(r, f.material),
      plant: pickText(r, f.productionPlant) || pickText(r, f.planningPlant),
    };
  },
  dailyProduction: (r) => ({
    id: r.ID,
    number: pickText(r, F("dailyProduction").number),
    date: pickDate(r, F("dailyProduction").date),
    plant: pickText(r, F("dailyProduction").plant),
    crystallizer: pickText(r, F("dailyProduction").crystallizer),
    processOrder: pickText(r, F("dailyProduction").processOrder),
    shift: pickText(r, F("dailyProduction").shift),
    quantity: pickNumber(r, F("dailyProduction").quantity),
    density: pickNumber(r, F("dailyProduction").density),
  }),
  bom: (r) => {
    const comps = pickRaw(r, F("bom").components);
    return {
      id: r.ID,
      number: pickText(r, F("bom").number),
      product: pickText(r, F("bom").product),
      plant: pickText(r, F("bom").plant),
      quantity: pickNumber(r, F("bom").quantity),
      components: Array.isArray(comps) ? comps.length : comps ? 1 : 0,
      items: [], // per-item composition needs a BOM-items report; static data fills this
      status: pickText(r, F("bom").status) || "Active",
      date: pickDate(r, F("bom").date),
    };
  },
  productionReceipt: (r) => ({
    id: r.ID,
    number: pickText(r, F("productionReceipt").number),
    date: pickDate(r, F("productionReceipt").date),
    processOrder: pickText(r, F("productionReceipt").processOrder),
    plant: pickText(r, F("productionReceipt").plant),
    product: pickText(r, F("productionReceipt").product),
    quantity: pickNumber(r, F("productionReceipt").quantity),
    warehouse: pickText(r, F("productionReceipt").warehouse),
    status: pickText(r, F("productionReceipt").status) || "Received",
  }),
  crystallizers: (r) => ({
    id: r.ID,
    code: pickText(r, F("crystallizers").code),
    name: pickText(r, F("crystallizers").name) || pickText(r, F("crystallizers").code),
    plant: pickText(r, F("crystallizers").plant),
    capacity: pickNumber(r, F("crystallizers").capacity),
    area: pickNumber(r, F("crystallizers").area),
    status: pickText(r, F("crystallizers").status) || "Active",
  }),
  plants: (r) => ({
    id: r.ID,
    code: pickText(r, F("plants").code),
    name: pickText(r, F("plants").name) || pickText(r, F("plants").code),
    location: pickText(r, F("plants").location),
    capacity: pickNumber(r, F("plants").capacity),
    status: pickText(r, F("plants").status) || "Active",
  }),
};

// Loads every module in parallel. A failing report doesn't sink the
// others — its error is returned in `errors[key]` and its rows are [].
// Loads every module. Keys in LIVE_MODULES are fetched from Zoho (inside
// Creator); the rest come from the static sample data. A failing report
// doesn't sink the others — its error is returned in `errors[key]`.
// `onProgress(key, "done" | "error")` fires as each module settles.
export async function loadDashboardData(onProgress = () => {}) {
  const keys = Object.keys(MODULES);
  const mock = buildMockData();
  const liveKeys = isLive() ? keys.filter((k) => LIVE_MODULES.includes(k)) : [];
  const data = {};
  const errors = {};

  keys.filter((k) => !liveKeys.includes(k)).forEach((k) => {
    data[k] = mock[k];
    onProgress(k, "done");
  });

  const results = await Promise.allSettled(
    liveKeys.map((k) =>
      fetchReport(MODULES[k].report).then(
        (rows) => (onProgress(k, "done"), rows),
        (err) => {
          onProgress(k, "error");
          throw err;
        },
      ),
    ),
  );
  results.forEach((res, i) => {
    const key = liveKeys[i];
    if (res.status === "fulfilled") {
      data[key] = res.value.map(normalise[key]);
    } else {
      data[key] = [];
      errors[key] = res.reason?.message || display(res.reason?.responseText) || "Failed to load report";
      console.error(`[Dashboard] ${MODULES[key].report}:`, res.reason);
    }
  });
  return { data, errors, live: liveKeys.length > 0, liveKeys };
}

// Opens a Creator form/report in the parent window (no-op in local dev).
export function openInCreator(target) {
  const c = sdk();
  if (!c?.UTIL?.navigateParentURL) return;
  c.UTIL.navigateParentURL({ action: "open", url: `#${target}`, window: "same" });
}
