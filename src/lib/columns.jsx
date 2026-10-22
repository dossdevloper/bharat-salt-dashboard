/* eslint-disable react-refresh/only-export-components -- column config, not components */
import { orderBucket, assetBucket, fmtNum, fmtDate } from "./metrics";
import { UNIT } from "../config";

const n0 = (n) => fmtNum(n, 0);
const n1 = (n) => fmtNum(n, 1);

const TONE = { Completed: "good", "In Progress": "blue", Open: "violet", "On Hold": "warn", Cancelled: "bad", Active: "good", Maintenance: "warn", Idle: "muted" };
const State = ({ bucket, text }) => <span className={`state tone-${TONE[bucket] || "muted"}`}>{text || bucket}</span>;

const dateCol = (label = "Date") => ({ key: "date", label, render: (r) => fmtDate(r.date), sortValue: (r) => r.date?.getTime() });
const isPending = (s) => /pend|qc|hold/i.test(s);
const isInactive = (s) => /inactive|obsolete|draft/i.test(s);

export const COLUMNS = {
  processOrders: [
    { key: "number", label: "Process order", mono: true },
    { key: "material", label: "Material" },
    { key: "productionPlant", label: "Production plant" },
    { key: "crystallizer", label: "Crystallizer" },
    { key: "orderType", label: "Type" },
    { key: "date", label: "Start", render: (r) => fmtDate(r.startDate), sortValue: (r) => r.startDate?.getTime() },
    { key: "endDate", label: "End", render: (r) => fmtDate(r.endDate), sortValue: (r) => r.endDate?.getTime() },
    { key: "planned", label: "Total qty", num: true, render: (r) => n0(r.planned) },
    { key: "produced", label: "Actual", num: true, render: (r) => n0(r.produced) },
    { key: "balance", label: "Balance", num: true, render: (r) => n0(r.balance) },
    {
      key: "progress",
      label: "Progress",
      sortValue: (r) => (r.planned ? r.produced / r.planned : 0),
      render: (r) => {
        const p = r.planned ? Math.min(100, (r.produced / r.planned) * 100) : 0;
        return (
          <span className="cell-progress">
            <i><span style={{ width: `${p}%` }} /></i>
            <em>{Math.round(p)}%</em>
          </span>
        );
      },
    },
    { key: "uom", label: "UOM" },
    { key: "status", label: "Status", render: (r) => <State bucket={orderBucket(r.status)} text={r.status} /> },
  ],
  dailyProduction: [
    dateCol(),
    { key: "plant", label: "Plant" },
    { key: "crystallizer", label: "Crystallizer" },
    { key: "processOrder", label: "Process order", mono: true },
    { key: "shift", label: "Shift" },
    { key: "density", label: "°Bé", num: true, render: (r) => (r.density ? n1(r.density) : "—") },
    { key: "quantity", label: `Qty (${UNIT})`, num: true, render: (r) => n1(r.quantity) },
  ],
  bom: [
    { key: "number", label: "BOM no.", mono: true },
    { key: "product", label: "Product" },
    { key: "plant", label: "Plant" },
    { key: "quantity", label: "Base qty (kg)", num: true, render: (r) => n0(r.quantity) },
    { key: "components", label: "Lines", num: true },
    { key: "cost", label: "Cost / MT (₹)", num: true, sortValue: (r) => r.cost || 0, render: (r) => (r.cost ? n0(r.cost) : "—") },
    dateCol("Effective"),
    { key: "status", label: "Status", render: (r) => <State bucket={isInactive(r.status) ? "Idle" : "Active"} text={r.status} /> },
  ],
  productionReceipt: [
    { key: "number", label: "Receipt no.", mono: true },
    dateCol(),
    { key: "processOrder", label: "Process order", mono: true },
    { key: "plant", label: "Plant" },
    { key: "product", label: "Product" },
    { key: "warehouse", label: "Warehouse" },
    { key: "quantity", label: `Qty (${UNIT})`, num: true, render: (r) => n1(r.quantity) },
    { key: "status", label: "Status", render: (r) => <State bucket={isPending(r.status) ? "Maintenance" : "Active"} text={r.status} /> },
  ],
  crystallizers: [
    { key: "code", label: "Code", mono: true },
    { key: "name", label: "Name" },
    { key: "plant", label: "Plant" },
    { key: "area", label: "Area (ac)", num: true, render: (r) => (r.area ? n1(r.area) : "—") },
    { key: "capacity", label: "Capacity", num: true, render: (r) => n0(r.capacity) },
    { key: "harvested", label: "Harvested", num: true, render: (r) => n1(r.harvested || 0) },
    { key: "status", label: "Status", render: (r) => <State bucket={assetBucket(r.status)} text={r.status} /> },
  ],
  plants: [
    { key: "code", label: "Code", mono: true },
    { key: "name", label: "Plant" },
    { key: "location", label: "Location" },
    { key: "crystallizers", label: "Crystallizers", num: true },
    { key: "capacity", label: "Capacity / yr", num: true, render: (r) => n0(r.capacity) },
    { key: "output", label: "Output", num: true, render: (r) => n1(r.output || 0) },
    { key: "status", label: "Status", render: (r) => <State bucket={assetBucket(r.status)} text={r.status} /> },
  ],
};

export { isPending, isInactive };
