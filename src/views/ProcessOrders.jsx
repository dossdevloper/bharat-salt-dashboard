import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";
import Icon from "../components/Icons";
import { Section, Panel } from "../components/Shell";
import { Donut } from "../components/MoreCharts";
import { BarList, Ring } from "../components/Charts";
import { COLUMNS } from "../lib/columns";
import { filterByRange, sum, delta, orderBucket, ORDER_STATES, groupSum, fmtNum, fmtDate } from "../lib/metrics";
import { prefersReduced } from "../lib/motion";
import { MODULES } from "../config";
import { openInCreator } from "../zohoapi";

const n0 = (n) => fmtNum(n, 0);
const pct = (n) => `${Math.round(n)}%`;
const TONE = Object.fromEntries(ORDER_STATES.map((s) => [s.key, s.tone]));
const toneOf = (status) => TONE[orderBucket(status)] || "muted";
const isOverdue = (o, today = new Date()) => o.endDate && o.endDate < today && !["Completed", "Cancelled"].includes(orderBucket(o.status));
const ALL = "__all";

// Most common unit across rows; quantities are only summed within one UOM.
function mainUom(rows) {
  const counts = groupSum(rows.map((r) => ({ ...r, one: 1 })), "uom", "one");
  return { uom: counts[0]?.label && counts[0].label !== "Unassigned" ? counts[0].label : "", mixed: counts.length > 1 };
}

export default function ProcessOrdersSection({ meta, orders, range, rangeLabel, error }) {
  const [q, setQ] = useState("");
  const [bucket, setBucket] = useState(ALL);
  const [plant, setPlant] = useState(ALL);
  const [cr, setCr] = useState(ALL);
  const [type, setType] = useState(ALL);
  // ?po=COR-12 in the URL opens that order's detail drawer.
  const [open, setOpen] = useState(() => {
    const no = new URLSearchParams(window.location.search).get("po");
    return (no && orders.find((o) => o.number === no)) || null;
  });
  const [page, setPage] = useState(0);
  const rl = rangeLabel.toLowerCase();

  const inPeriod = useMemo(() => filterByRange(orders, range).current, [orders, range]);
  const prevCount = useMemo(() => filterByRange(orders, range).previous?.length, [orders, range]);
  const opts = useMemo(() => {
    const uniq = (k) => [...new Set(inPeriod.map((o) => o[k]).filter(Boolean))].sort();
    return { plants: uniq("productionPlant"), crs: uniq("crystallizer"), types: uniq("orderType") };
  }, [inPeriod]);

  // Everything except the status chip — so chip counts stay meaningful.
  const base = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return inPeriod.filter(
      (o) =>
        (plant === ALL || o.productionPlant === plant) &&
        (cr === ALL || o.crystallizer === cr) &&
        (type === ALL || o.orderType === type) &&
        (!needle || [o.number, o.material, o.crystallizer, o.productionPlant, o.status, o.notes].some((v) => String(v || "").toLowerCase().includes(needle))),
    );
  }, [inPeriod, q, plant, cr, type]);
  const rows = useMemo(() => (bucket === ALL ? base : base.filter((o) => orderBucket(o.status) === bucket)), [base, bucket]);

  const m = useMemo(() => {
    const today = new Date();
    const { uom, mixed } = mainUom(rows);
    const same = mixed ? rows.filter((r) => r.uom === uom) : rows;
    const total = sum(same, "planned");
    const actual = sum(same, "produced");
    const counts = Object.fromEntries(ORDER_STATES.map((s) => [s.key, base.filter((o) => orderBucket(o.status) === s.key).length]));
    const statuses = groupSum(rows.map((r) => ({ ...r, one: 1 })), "status", "one").map((s) => ({ ...s, color: `var(--tone-${toneOf(s.label)})` }));
    return {
      uom,
      mixed,
      total,
      actual,
      balance: sum(same, "balance"),
      delivered: sum(same, "delivered"),
      shortExc: sum(same, "shortExc"),
      completion: total ? (actual / total) * 100 : 0,
      overdue: rows.filter((o) => isOverdue(o, today)),
      counts,
      statuses,
      byCr: groupSum(same, "crystallizer", "produced"),
      byMaterial: groupSum(same, "material", "planned"),
    };
  }, [rows, base]);

  const u = m.uom ? ` ${m.uom}` : "";
  const filtersOn = q || bucket !== ALL || plant !== ALL || cr !== ALL || type !== ALL;
  const reset = () => {
    setQ("");
    setBucket(ALL);
    setPlant(ALL);
    setCr(ALL);
    setType(ALL);
    setPage(0);
  };

  const PER = 6;
  const sorted = useMemo(() => [...rows].sort((a, b) => (b.startDate || 0) - (a.startDate || 0)), [rows]);
  const pages = Math.max(1, Math.ceil(sorted.length / PER));
  const cur = Math.min(page, pages - 1);

  const toolbar = (
    <div className="po-toolbar reveal">
      <label className="search">
        <Icon name="search" size={16} />
        <input value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} placeholder="Search order, material, crystallizer…" />
      </label>
      <div className="po-chips" role="group" aria-label="Status">
        <button type="button" className={`po-chip ${bucket === ALL ? "is-on" : ""}`} onClick={() => setBucket(ALL)}>
          All <em>{base.length}</em>
        </button>
        {ORDER_STATES.map((s) => (
          <button key={s.key} type="button" className={`po-chip tone-${s.tone} ${bucket === s.key ? "is-on" : ""}`} onClick={() => { setBucket(bucket === s.key ? ALL : s.key); setPage(0); }}>
            <span className="po-dot" /> {s.key} <em>{m.counts[s.key]}</em>
          </button>
        ))}
      </div>
      <div className="po-selects">
        <Select label="Plant" value={plant} onChange={setPlant} options={opts.plants} />
        <Select label="Crystallizer" value={cr} onChange={setCr} options={opts.crs} />
        <Select label="Order type" value={type} onChange={setType} options={opts.types} />
        {filtersOn && (
          <button type="button" className="link-btn" onClick={reset}>
            <Icon name="close" size={13} /> Reset
          </button>
        )}
      </div>
    </div>
  );

  return (
    <>
      <Section
        meta={meta}
        error={error}
        records={sorted}
        columns={COLUMNS.processOrders}
        initialSort={{ key: "date", dir: -1 }}
        toolbar={toolbar}
        onRowClick={setOpen}
        kpis={[
          { label: "Orders", value: rows.length, fmt: n0, d: filtersOn ? null : delta(rows.length, prevCount) },
          { label: "Total qty", value: m.total, unit: m.uom, fmt: n0, note: m.mixed ? `${m.uom} orders only` : null },
          { label: "Actual qty", value: m.actual, unit: m.uom, fmt: n0 },
          { label: "Balance qty", value: m.balance, unit: m.uom, fmt: n0, tone: m.balance ? "warn" : "good" },
          { label: "Completion", value: m.completion, fmt: pct, tone: m.completion >= 80 ? "good" : "warn", note: "actual ÷ total qty" },
          { label: "Overdue", value: m.overdue.length, fmt: n0, tone: m.overdue.length ? "bad" : "good", note: "past end date, open" },
        ]}
      >
        {/* lifecycle pipeline */}
        <div className="card reveal po-pipeline">
          <div className="po-steps">
            {["Open", "In Progress", "Completed"].map((k, i) => (
              <button key={k} type="button" className={`po-step tone-${TONE[k]} ${bucket === k ? "is-on" : ""}`} onClick={() => setBucket(bucket === k ? ALL : k)}>
                <span className="po-step-n">{String(i + 1).padStart(2, "0")}</span>
                <span className="po-step-body">
                  <b>{m.counts[k]}</b>
                  <span>{k === "Open" ? "Created" : k === "In Progress" ? "Released / In process" : "Completed"}</span>
                </span>
                {i < 2 && <Icon name="chevron" size={18} className="po-step-arrow" />}
              </button>
            ))}
            <div className="po-side">
              {["On Hold", "Cancelled"].map((k) => (
                <button key={k} type="button" className={`po-side-pill tone-${TONE[k]} ${bucket === k ? "is-on" : ""}`} onClick={() => setBucket(bucket === k ? ALL : k)}>
                  <span className="po-dot" /> {k} <b>{m.counts[k]}</b>
                </button>
              ))}
            </div>
          </div>
          <div className="po-fulfil">
            <div className="po-fulfil-head">
              <span>Quantity fulfilment{m.uom ? ` · ${m.uom}` : ""}</span>
              <b>{n0(m.actual)} / {n0(m.total)}{u}</b>
            </div>
            <div className="po-fulfil-bar">
              <span className="pf-actual" data-grow style={{ width: `${m.total ? Math.min(100, (m.actual / m.total) * 100) : 0}%` }} />
              <span className="pf-delivered" data-grow style={{ width: `${m.total ? Math.min(100, (m.delivered / m.total) * 100) : 0}%` }} />
            </div>
            <div className="po-fulfil-legend">
              <span><i className="pf-actual" /> Actual {n0(m.actual)}</span>
              <span><i className="pf-delivered" /> Delivered {n0(m.delivered)}</span>
              <span><i className="pf-balance" /> Balance {n0(m.balance)}</span>
              <span className={m.shortExc < 0 ? "neg" : ""}>Short / excess {m.shortExc > 0 ? "+" : ""}{n0(m.shortExc)}</span>
            </div>
          </div>
        </div>

        <div className="grid g-1-2">
          <Panel title="Status mix" sub={`${rows.length} orders · ${rl}`}>
            <Donut items={m.statuses.length ? m.statuses : [{ label: "No orders", value: 0, color: "var(--tone-muted)" }]} centerLabel="orders" size={170} />
          </Panel>
          <Panel title="Production schedule" sub="Start → end date per order · bar fill = actual ÷ total">
            <Gantt rows={sorted.slice(0, 10)} onOpen={setOpen} />
          </Panel>
        </div>

        <div className="grid g-2-1">
          <Panel
            title="Orders"
            sub={`${rows.length} orders · newest first · click a card for full details`}
            right={
              pages > 1 && (
                <div className="po-pager">
                  <button type="button" disabled={cur === 0} onClick={() => setPage(cur - 1)} aria-label="Previous page"><Icon name="chevron" size={14} className="flip" /></button>
                  <span>{cur + 1} / {pages}</span>
                  <button type="button" disabled={cur >= pages - 1} onClick={() => setPage(cur + 1)} aria-label="Next page"><Icon name="chevron" size={14} /></button>
                </div>
              )
            }
          >
            <div className="po-cards">
              {sorted.length === 0 && <p className="empty">No process orders match these filters</p>}
              {sorted.slice(cur * PER, cur * PER + PER).map((o) => (
                <OrderCard key={o.id || o.number} o={o} onOpen={() => setOpen(o)} />
              ))}
            </div>
          </Panel>
          <Panel title="Actual qty by crystallizer" sub={`${m.uom || "qty"} · ${rl}`}>
            <BarList items={m.byCr} unit={m.uom} limit={6} color="var(--tone-violet)" empty="No output recorded" />
            <h4 className="sub-head">Planned by material</h4>
            <BarList items={m.byMaterial} unit={m.uom} limit={5} color="var(--series-1)" empty="—" />
          </Panel>
        </div>
      </Section>

      {open && <OrderDrawer o={open} onClose={() => setOpen(null)} />}
    </>
  );
}

function Select({ label, value, onChange, options }) {
  return (
    <label className={`po-select ${value !== ALL ? "is-set" : ""}`}>
      <span>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        <option value={ALL}>All</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  );
}

function OrderCard({ o, onOpen }) {
  const p = o.planned ? Math.min(100, (o.produced / o.planned) * 100) : 0;
  const late = isOverdue(o);
  const tone = toneOf(o.status);
  return (
    <button type="button" className={`po-card tone-${tone}`} onClick={onOpen}>
      <div className="po-card-top">
        <span className="po-card-no">{o.number}</span>
        <span className={`state tone-${tone}`}>{o.status}</span>
      </div>
      <div className="po-card-mid">
        <Ring value={p} size={58} stroke={6} tone={tone === "warn" ? "warn" : tone === "muted" || tone === "bad" ? "muted" : "blue"} />
        <div className="po-card-info">
          <b title={o.material}>{o.material || "—"}</b>
          <span>{o.crystallizer || "—"} · {o.productionPlant || o.planningPlant || "—"}</span>
          <span className="po-card-qty">{n0(o.produced)} / {n0(o.planned)} {o.uom}</span>
        </div>
      </div>
      <div className="po-card-foot">
        <span><Icon name="clock" size={13} /> {fmtDate(o.startDate).slice(0, 6)} → {fmtDate(o.endDate).slice(0, 6)}</span>
        {late ? <span className="due is-late">Overdue</span> : o.priority ? <span className="due">P{o.priority}</span> : null}
      </div>
    </button>
  );
}

function Gantt({ rows, onOpen }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dated = rows.filter((r) => r.startDate);
  if (!dated.length) return <p className="empty">No scheduled orders</p>;
  const lo = Math.min(...dated.map((r) => r.startDate.getTime()), today.getTime());
  const hi = Math.max(...dated.map((r) => (r.endDate || r.startDate).getTime()), today.getTime()) + 864e5;
  const x = (t) => ((t - lo) / (hi - lo)) * 100;
  const ticks = Array.from({ length: 5 }, (_, i) => lo + ((hi - lo) * i) / 4);
  return (
    <div className="gantt">
      <div className="gantt-axis">
        <span />
        <div className="gantt-scale">
          {ticks.map((t, i) => (
            <span key={i} style={{ left: `${(i / 4) * 100}%` }}>{new Date(t).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}</span>
          ))}
        </div>
      </div>
      {dated.map((o) => {
        const s = o.startDate.getTime();
        const e = (o.endDate || o.startDate).getTime() + 864e5;
        const p = o.planned ? Math.min(100, (o.produced / o.planned) * 100) : 0;
        return (
          <button key={o.id || o.number} type="button" className={`gantt-row tone-${toneOf(o.status)} ${isOverdue(o) ? "is-late" : ""}`} onClick={() => onOpen(o)} title={`${o.number} · ${o.status} · ${fmtDate(o.startDate)} → ${fmtDate(o.endDate)}`}>
            <span className="gantt-label"><b>{o.number}</b> {o.material}</span>
            <span className="gantt-track">
              <span className="gantt-today" style={{ left: `${x(today.getTime())}%` }} />
              <span className="gantt-bar" style={{ left: `${x(s)}%`, width: `${Math.max(1.5, x(e) - x(s))}%` }}>
                <span className="gantt-fill" style={{ width: `${p}%` }} />
              </span>
            </span>
          </button>
        );
      })}
      <div className="gantt-foot"><i /> Today</div>
    </div>
  );
}

// Slide-over with every field from the Process Order form.
function OrderDrawer({ o, onClose }) {
  const panel = useRef(null);
  const tone = toneOf(o.status);
  const p = o.planned ? (o.produced / o.planned) * 100 : 0;
  const mod = MODULES.processOrders;

  useLayoutEffect(() => {
    if (prefersReduced() || !panel.current) return;
    gsap.fromTo(panel.current, { x: 60, opacity: 0 }, { x: 0, opacity: 1, duration: 0.35, ease: "power3.out" });
  }, [o]);
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const v = (x) => (x === 0 || x ? x : "—");
  const groups = [
    { title: "General", icon: "orders", items: [["Material name", o.material], ["Production plant", o.productionPlant], ["Planning plant", o.planningPlant], ["Crystallizer", o.crystallizer], ["Process order type", o.orderType], ["Production planning", o.planning], ["UOM", o.uom]] },
    { title: "Dates / times", icon: "clock", items: [["Start date", fmtDate(o.startDate)], ["End date", fmtDate(o.endDate)], ["Release", fmtDate(o.releaseDate)], ["Goods receipt", o.goodsReceipt]] },
    { title: "Scheduling", icon: "sort", items: [["Type", o.schedType], ["Reduction", o.reduction], ["Priority", o.priority], ["Notes", o.notes]] },
    { title: "Floats", icon: "production", items: [["Sched. margin key", o.marginKey], ["Float before prodn", n0(o.floatBefore)], ["Float after prdn", n0(o.floatAfter)], ["Release period", n0(o.releasePeriod)]] },
  ];

  return (
    <div className="drawer-wrap" onClick={onClose}>
      <aside className={`drawer tone-${tone}`} ref={panel} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={`Process order ${o.number}`}>
        <header className="drawer-head">
          <div>
            <p className="drawer-eyebrow">Process order</p>
            <h3>{o.number}</h3>
            <span className={`state tone-${tone}`}>{o.status}</span>
            {isOverdue(o) && <span className="due is-late">Overdue</span>}
          </div>
          <button type="button" className="rail-close" onClick={onClose} aria-label="Close"><Icon name="close" size={14} stroke={2.2} /></button>
        </header>

        <div className="drawer-hero">
          <Ring value={p} size={96} stroke={9} tone={tone === "warn" ? "warn" : "blue"} label={<><b>{Math.round(p)}%</b><small>complete</small></>} />
          <div className="drawer-qty">
            {[["Total qty", o.planned], ["Actual qty", o.produced], ["Balance qty", o.balance], ["Delivered", o.delivered], ["Short / exc. rec", o.shortExc]].map(([k, val]) => (
              <div key={k}>
                <span>{k}</span>
                <b>{n0(val)} <small>{o.uom}</small></b>
              </div>
            ))}
          </div>
        </div>

        <div className="drawer-timeline">
          {[["Start", o.startDate], ["Release", o.releaseDate], ["End", o.endDate]].map(([k, d]) => (
            <div key={k} className={d && d <= new Date() ? "is-past" : ""}>
              <i />
              <span>{k}</span>
              <b>{fmtDate(d)}</b>
            </div>
          ))}
        </div>

        {groups.map((g) => (
          <section key={g.title} className="drawer-group">
            <h4><Icon name={g.icon} size={14} /> {g.title}</h4>
            <dl>
              {g.items.map(([k, val]) => (
                <div key={k} className={k === "Notes" ? "is-wide" : ""}>
                  <dt>{k}</dt>
                  <dd>{v(val)}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}

        <footer className="drawer-foot">
          <button type="button" className="btn-tone" onClick={() => openInCreator(`Form:${mod.form}?recLinkID=${o.id}&viewLinkName=${mod.report}`)}>
            <Icon name="external" size={14} /> Edit in Creator
          </button>
          <button type="button" className="btn-ghost" onClick={onClose}>Close</button>
        </footer>
      </aside>
    </div>
  );
}
