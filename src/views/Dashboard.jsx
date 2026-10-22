import { useMemo } from "react";
import { useReveal } from "../lib/useReveal";
import { TrendChart, BarList, Ring } from "../components/Charts";
import { Donut, ColumnChart, Heatmap, Composition, Bullet, Gauge } from "../components/MoreCharts";
import { Section, Panel, RightRail, HeroStat } from "../components/Shell";
import ProcessOrdersSection from "./ProcessOrders";
import { SECTIONS } from "../lib/sections";
import { buildAlerts } from "../lib/alerts";
import { COLUMNS, isPending, isInactive } from "../lib/columns";
import {
  RANGES, rangeBounds, filterByRange, sum, delta, orderBucket, ORDER_STATES, assetBucket,
  timeSeries, groupSum, fmtNum, fmtQty, fmtDate,
} from "../lib/metrics";
import { UNIT } from "../config";
import { usePersistentState } from "../lib/prefs";
import { HERO_THEMES } from "../lib/themes";

const n0 = (n) => fmtNum(n, 0);
const n1 = (n) => fmtNum(n, 1);
const pct = (n) => `${Math.round(n)}%`;
const tone = (t) => `var(--tone-${t})`;
const series = (i) => `var(--series-${i})`;
const meta = Object.fromEntries(SECTIONS.map((s) => [s.key, s]));

// BOM lines grouped into five cost families so colours stay stable.
const COST_FAMILIES = [
  { key: "Salt input", test: /brine|crude|salt/i },
  { key: "Fortificants", test: /iodate|kio|ferrous|iron|fortif/i },
  { key: "Additives", test: /anti|caking|additive|chemical/i },
  { key: "Utilities", test: /power|kwh|water|fuel|steam|electric/i },
  { key: "Packaging", test: /bag|pouch|pack|carton|film/i },
];
const familyOf = (name) => COST_FAMILIES.find((f) => f.test.test(name))?.key || "Packaging";
const familyColor = (k) => series(COST_FAMILIES.findIndex((f) => f.key === k) + 1);

const ASSET_STATES = [
  { key: "Active", tone: "good" },
  { key: "Maintenance", tone: "warn" },
  { key: "Idle", tone: "muted" },
];

function daysInRange(range) {
  const { from, to } = rangeBounds(range);
  return from ? Math.max(1, Math.round((Math.min(Date.now(), to) - from) / 864e5)) : 365;
}

export default function Dashboard({ data, errors, range, onJump, railOpen, onCloseRail }) {
  const [heroKey, setHeroKey] = usePersistentState("hero-theme", "ocean");
  const hero = HERO_THEMES.find((t) => t.key === heroKey) || HERO_THEMES[0];
  const rangeLabel = RANGES.find((r) => r.key === range)?.label;
  const rl = rangeLabel.toLowerCase();

  const m = useMemo(() => {
    const today = new Date();
    // ── period slices
    const prod = filterByRange(data.dailyProduction, range);
    const rec = filterByRange(data.productionReceipt, range);
    const orders = filterByRange(data.processOrders, range);

    // ── process orders
    const planned = sum(orders.current, "planned");
    const orderProduced = sum(orders.current, "produced");
    const status = Object.fromEntries(ORDER_STATES.map((s) => [s.key, 0]));
    orders.current.forEach((o) => status[orderBucket(o.status)]++);
    const overdue = data.processOrders.filter((o) => o.endDate && o.endDate < today && !["Completed", "Cancelled"].includes(orderBucket(o.status)));
    const running = data.processOrders
      .filter((o) => orderBucket(o.status) === "In Progress")
      .sort((a, b) => (a.endDate || 0) - (b.endDate || 0));
    const byProduct = [...new Set(orders.current.map((o) => o.product))].map((p) => {
      const rows = orders.current.filter((o) => o.product === p);
      return { label: p || "Unassigned", planned: sum(rows, "planned"), produced: sum(rows, "produced") };
    }).sort((a, b) => b.planned - a.planned);

    // ── daily production
    const produced = sum(prod.current, "quantity");
    const dens = prod.current.filter((p) => p.density > 0);
    const avgDensity = dens.length ? sum(dens, "density") / dens.length : 0;
    const days = groupSum(prod.current.map((p) => ({ ...p, d: fmtDate(p.date) })), "d", "quantity");
    const shifts = groupSum(prod.current, "shift", "quantity");
    const heatDays = Array.from({ length: 14 }, (_, i) => {
      const d = new Date(today);
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - 13 + i);
      return d;
    });
    const topCr = groupSum(data.dailyProduction.filter((p) => p.date >= heatDays[0]), "crystallizer", "quantity").slice(0, 8);
    const heatRows = topCr.map((c) => ({
      label: c.label,
      values: heatDays.map((d) => sum(data.dailyProduction.filter((p) => p.crystallizer === c.label && p.date && p.date.toDateString() === d.toDateString()), "quantity")),
    }));

    // ── BOM
    const boms = data.bom.map((b) => ({ ...b, cost: (b.items || []).reduce((a, i) => a + (i.cost || 0), 0) }));
    const bomStatus = [
      { label: "Active", value: boms.filter((b) => !isInactive(b.status)).length, color: tone("good") },
      { label: "Draft", value: boms.filter((b) => /draft/i.test(b.status)).length, color: tone("warn") },
      { label: "Inactive", value: boms.filter((b) => /inactive|obsolete/i.test(b.status)).length, color: tone("muted") },
    ];
    const productBoms = [...new Map(boms.filter((b) => b.items?.length).map((b) => [b.product, b])).values()];
    const compoRows = productBoms
      .map((b) => {
        const fam = new Map();
        b.items.forEach((i) => fam.set(familyOf(i.name), (fam.get(familyOf(i.name)) || 0) + i.cost));
        return {
          label: b.product,
          sub: `₹${n0(b.cost)} per MT · ${b.items.length} lines`,
          cost: b.cost,
          parts: COST_FAMILIES.filter((f) => fam.has(f.key)).map((f) => ({ key: f.key, value: fam.get(f.key) })),
        };
      })
      .sort((a, b) => b.cost - a.cost);

    // ── receipts
    const received = sum(rec.current, "quantity");
    const pending = rec.current.filter((r) => isPending(r.status));
    const wh = groupSum(rec.current, "warehouse", "quantity");

    // ── crystallizers
    const prodByCr = Object.fromEntries(groupSum(prod.current, "crystallizer", "quantity").map((g) => [g.label, g.value]));
    const crystals = data.crystallizers.map((c) => ({ ...c, bucket: assetBucket(c.status), harvested: prodByCr[c.name] || prodByCr[c.code] || 0 }));
    const crCount = Object.fromEntries(ASSET_STATES.map((s) => [s.key, crystals.filter((c) => c.bucket === s.key).length]));

    // ── plants
    const nDays = daysInRange(range);
    const byPlant = Object.fromEntries(groupSum(prod.current, "plant", "quantity").map((g) => [g.label, g.value]));
    const plants = data.plants.map((p) => ({
      ...p,
      bucket: assetBucket(p.status),
      crystallizers: data.crystallizers.filter((c) => c.plant === p.name).length,
      output: byPlant[p.name] || 0,
      target: (p.capacity * nDays) / 365,
    }));

    return {
      prod, rec, orders, planned, orderProduced, status, overdue, running, byProduct,
      produced, avgDensity, days, shifts, heatDays, heatRows,
      boms, bomStatus, compoRows,
      received, pending, wh, crystals, crCount, plants,
      attainment: planned ? (orderProduced / planned) * 100 : 0,
      prodDelta: delta(produced, prod.previous && sum(prod.previous, "quantity")),
      recDelta: delta(received, rec.previous && sum(rec.previous, "quantity")),
      ordDelta: delta(orders.current.length, orders.previous?.length),
      trend: timeSeries(data.dailyProduction, range, "quantity"),
      recTrend: timeSeries(data.productionReceipt, range, "quantity"),
    };
  }, [data, range]);

  const scope = useReveal([range, data]);
  const alerts = useMemo(() => buildAlerts(data, errors), [data, errors]);
  const todayLabel = new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  const bestDay = m.days[0];

  return (
    <div className={`layout ${railOpen ? "" : "is-collapsed"}`} ref={scope}>
    <div className="page">
      {/* ═════════ HERO ═════════ */}
      <section id="sec-top" className="hero reveal" style={{ "--hero-grad": hero.grad, "--hero-glow": hero.glow }}>
        <div className="hero-themes" role="radiogroup" aria-label="Banner colour">
          {HERO_THEMES.map((t) => (
            <button
              key={t.key}
              type="button"
              role="radio"
              aria-checked={t.key === hero.key}
              title={t.label}
              className={t.key === hero.key ? "is-on" : ""}
              style={{ background: t.grad }}
              onClick={() => setHeroKey(t.key)}
            />
          ))}
        </div>
        <div className="hero-glow" />
        <div className="hero-grid" />
        <div className="hero-main">
          <p className="eyebrow"><span className="live-dot" /> LIVE · {todayLabel.toUpperCase()}</p>
          <h1>Production Command</h1>
          <p className="hero-sub">Brine-to-bag overview across six processes · {rangeLabel}</p>
          <div className="hero-kpis">
            <HeroStat label="Salt produced" value={m.produced} unit={UNIT} d={m.prodDelta} />
            <HeroStat label="Received to stock" value={m.received} unit={UNIT} d={m.recDelta} />
            <HeroStat label="Process orders" value={m.orders.current.length} d={m.ordDelta} />
            <HeroStat label="Overdue orders" value={m.overdue.length} sub={`${m.running.length} running now`} />
          </div>
        </div>
        <div className="hero-side">
          <Ring value={m.attainment} size={136} stroke={11} tone="light" label={<><b>{Math.round(m.attainment)}%</b><small>plan attainment</small></>} />
          <p className="hero-side-note">{fmtQty(m.orderProduced)} of {fmtQty(m.planned)} planned</p>
        </div>
      </section>

      {/* ═════════ 01 PROCESS ORDERS (live) ═════════ */}
      <ProcessOrdersSection meta={meta.processOrders} orders={data.processOrders} range={range} rangeLabel={rangeLabel} error={errors.processOrders} />

      {/* ═════════ 02 DAILY PRODUCTION ═════════ */}
      <Section
        meta={meta.dailyProduction}
        error={errors.dailyProduction}
        records={m.prod.current}
        columns={COLUMNS.dailyProduction}
        initialSort={{ key: "date", dir: -1 }}
        kpis={[
          { label: "Salt harvested", value: m.produced, unit: UNIT, fmt: n0, d: m.prodDelta },
          { label: "Entries", value: m.prod.current.length, fmt: n0, d: delta(m.prod.current.length, m.prod.previous?.length) },
          { label: "Avg per entry", value: m.prod.current.length ? m.produced / m.prod.current.length : 0, unit: UNIT, fmt: n1 },
          { label: "Avg brine density", value: m.avgDensity, unit: "°Bé", fmt: n1, tone: m.avgDensity >= 25 && m.avgDensity <= 28.5 ? "good" : "warn" },
          { label: "Best day", value: bestDay?.value || 0, unit: UNIT, fmt: n0, note: bestDay?.label || "—" },
        ]}
      >
        <div className="grid g-2-1">
          <Panel title="Harvest trend" sub={`${UNIT} per ${m.trend.grain} · ${rl}`} right={<div className="head-stat"><strong>{fmtQty(m.produced)}</strong><span>{rangeLabel}</span></div>}>
            <TrendChart buckets={m.trend.buckets} unit={UNIT} />
          </Panel>
          <Panel title="Brine density" sub="Average °Bé · ideal crystallising band 25–28.5">
            <Gauge value={m.avgDensity} min={15} max={30} bands={[{ from: 15, to: 25, tone: "warn" }, { from: 25, to: 28.5, tone: "good" }, { from: 28.5, to: 30, tone: "bad" }]} unit="°Bé" label="avg brine density" />
            <h4 className="sub-head">Output by shift</h4>
            <BarList items={m.shifts.map((s, i) => ({ ...s, color: series(i + 1) }))} unit={UNIT} limit={3} />
          </Panel>
        </div>
        <Panel title="Crystallizer heatmap" sub={`Daily harvest, last 14 days · top ${m.heatRows.length} crystallizers`}>
          <Heatmap rows={m.heatRows} cols={m.heatDays.map((d) => d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }))} unit={UNIT} />
        </Panel>
      </Section>

      {/* ═════════ 03 BOM ═════════ */}
      <Section
        meta={meta.bom}
        error={errors.bom}
        records={m.boms}
        columns={COLUMNS.bom}
        kpis={[
          { label: "BOMs", value: m.boms.length, fmt: n0 },
          { label: "Active", value: m.bomStatus[0].value, fmt: n0, tone: "good" },
          { label: "Products covered", value: new Set(m.boms.map((b) => b.product)).size, fmt: n0 },
          { label: "Avg lines / BOM", value: m.boms.length ? sum(m.boms, "components") / m.boms.length : 0, fmt: n1 },
          { label: "Highest cost / MT", value: m.compoRows[0]?.cost || 0, unit: "₹", fmt: n0, note: m.compoRows[0]?.label },
        ]}
      >
        <div className="grid g-2-1">
          <Panel title="Cost composition per MT" sub="Each bar = one product's BOM, split by cost family · hover to compare">
            {m.compoRows.length ? (
              <Composition rows={m.compoRows} colorFor={familyColor} unit="₹" />
            ) : (
              <p className="empty">BOM line items aren’t available yet</p>
            )}
          </Panel>
          <Panel title="BOM status" sub={`${m.boms.length} bills of material`}>
            <Donut items={m.bomStatus} centerLabel="BOMs" size={168} />
            <h4 className="sub-head">BOMs per plant</h4>
            <BarList items={groupSum(m.boms.map((b) => ({ ...b, one: 1 })), "plant", "one")} unit="BOMs" color={tone("coral")} limit={4} />
          </Panel>
        </div>
      </Section>

      {/* ═════════ 04 PRODUCTION RECEIPT ═════════ */}
      <Section
        meta={meta.productionReceipt}
        error={errors.productionReceipt}
        records={m.rec.current}
        columns={COLUMNS.productionReceipt}
        initialSort={{ key: "date", dir: -1 }}
        kpis={[
          { label: "Received", value: m.received, unit: UNIT, fmt: n0, d: m.recDelta },
          { label: "Receipts", value: m.rec.current.length, fmt: n0 },
          { label: "Orders covered", value: new Set(m.rec.current.map((r) => r.processOrder).filter(Boolean)).size, fmt: n0 },
          { label: "Received ÷ harvested", value: m.produced ? (m.received / m.produced) * 100 : 0, fmt: pct, note: "stock vs pan output" },
          { label: "Pending QC", value: m.pending.length, fmt: n0, tone: m.pending.length ? "warn" : "good" },
        ]}
      >
        <div className="grid g-2-1">
          <Panel title="Receipts to stock" sub={`${UNIT} received per ${m.recTrend.grain} · ${rl}`}>
            <ColumnChart buckets={m.recTrend.buckets} unit={UNIT} color={tone("green")} />
          </Panel>
          <Panel title="By warehouse" sub={`${UNIT} · ${rl}`}>
            <Donut items={m.wh.map((w, i) => ({ ...w, color: series(i + 1) }))} centerLabel={UNIT} size={168} />
          </Panel>
        </div>
        <Panel title="Latest receipts" sub={`${m.rec.current.length} receipts · ${rl}`}>
          <ol className="timeline">
            {m.rec.current.length === 0 && <p className="empty">No receipts in this period</p>}
            {[...m.rec.current].sort((a, b) => b.date - a.date).slice(0, 6).map((r) => (
              <li key={r.id || r.number} className={isPending(r.status) ? "is-pending" : ""}>
                <span className="tl-dot" />
                <span className="tl-date">{fmtDate(r.date).slice(0, 6)}</span>
                <span className="tl-main"><b className="mono">{r.number}</b> · {r.product}</span>
                <span className="tl-sub">{r.processOrder} → {r.warehouse}</span>
                <b className="tl-qty">{n1(r.quantity)} <small>{UNIT}</small></b>
                <span className={`state tone-${isPending(r.status) ? "warn" : "good"}`}>{r.status}</span>
              </li>
            ))}
          </ol>
        </Panel>
      </Section>

      {/* ═════════ 05 CRYSTALLIZERS ═════════ */}
      <Section
        meta={meta.crystallizers}
        error={errors.crystallizers}
        records={m.crystals}
        columns={COLUMNS.crystallizers}
        kpis={[
          { label: "Crystallizers", value: m.crystals.length, fmt: n0 },
          { label: "Active", value: m.crCount.Active, fmt: n0, tone: "good" },
          { label: "Maintenance", value: m.crCount.Maintenance, fmt: n0, tone: m.crCount.Maintenance ? "warn" : "good" },
          { label: "Total capacity", value: sum(m.crystals, "capacity"), unit: UNIT, fmt: n0 },
          { label: "Pan area", value: sum(m.crystals, "area"), unit: "acres", fmt: n1 },
        ]}
      >
        <div className="grid g-1-2">
          <Panel title="Fleet status" sub="Crystallizer Master">
            <Donut items={ASSET_STATES.map((s) => ({ label: s.key, value: m.crCount[s.key], color: tone(s.tone) }))} centerLabel="units" size={168} />
            <h4 className="sub-head">Capacity by plant</h4>
            <BarList items={groupSum(m.crystals, "plant", "capacity")} unit={UNIT} color={tone("teal")} limit={4} />
          </Panel>
          <Panel title="Pan utilisation" sub={`Harvested ÷ capacity · ${rl}`}>
            <div className="fleet">
              {m.crystals.length === 0 && <p className="empty">No crystallizers in Crystallizer Master</p>}
              {m.crystals.map((c) => {
                const util = c.capacity ? (c.harvested / c.capacity) * 100 : 0;
                const t = c.bucket === "Active" ? "blue" : c.bucket === "Maintenance" ? "warn" : "muted";
                return (
                  <div key={c.id || c.code} className={`fleet-tile is-${c.bucket.toLowerCase()}`}>
                    <Ring value={util} size={52} stroke={6} tone={t} />
                    <div className="fleet-info">
                      <b title={c.name}>{c.name}</b>
                      <span>{c.code} · {c.plant || "—"}</span>
                      <span className="fleet-meta">{n0(c.harvested)} / {n0(c.capacity)} {UNIT}</span>
                      <span className={`state state-${c.bucket.toLowerCase()}`}>{c.bucket}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </Panel>
        </div>
      </Section>

      {/* ═════════ 06 PLANTS ═════════ */}
      <Section
        meta={meta.plants}
        error={errors.plants}
        records={m.plants}
        columns={COLUMNS.plants}
        kpis={[
          { label: "Plants", value: m.plants.length, fmt: n0 },
          { label: "Online", value: m.plants.filter((p) => p.bucket === "Active").length, fmt: n0, tone: "good" },
          { label: "Installed capacity", value: sum(m.plants, "capacity"), unit: `${UNIT}/yr`, fmt: n0 },
          { label: "Output", value: sum(m.plants, "output"), unit: UNIT, fmt: n0, note: rangeLabel },
          { label: "Utilisation", value: sum(m.plants, "target") ? (sum(m.plants, "output") / sum(m.plants, "target")) * 100 : 0, fmt: pct, note: "output ÷ pro-rated capacity" },
        ]}
      >
        <div className="grid g-2-1">
          <Panel title="Output vs pro-rated capacity" sub={`Target = yearly capacity × ${daysInRange(range)} days ÷ 365`}>
            <div className="pair-legend">
              <span><i className="bl-bar" /> Output</span>
              <span><i className="bl-band" /> Target zone</span>
              <span><i className="bl-mark" /> Target</span>
            </div>
            <Bullet items={m.plants.map((p) => ({ label: p.name, value: p.output, target: p.target, max: p.target * 1.25 }))} unit={UNIT} />
          </Panel>
          <Panel title="Plant directory" sub="Plant Master">
            <div className="plant-list">
              {m.plants.map((p) => (
                <div key={p.id || p.code} className="plant-row">
                  <div className="plant-badge">{(p.code || p.name).slice(0, 5)}</div>
                  <div className="plant-info">
                    <b>{p.name}</b>
                    <span>{p.location || "—"}</span>
                    <span>{p.crystallizers} crystallizers · {n0(p.capacity)} {UNIT}/yr</span>
                  </div>
                  <span className={`state state-${p.bucket.toLowerCase()}`}>{p.bucket}</span>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </Section>
    </div>
    {railOpen && <RightRail alerts={alerts} onJump={onJump} onClose={onCloseRail} />}
    </div>
  );
}
