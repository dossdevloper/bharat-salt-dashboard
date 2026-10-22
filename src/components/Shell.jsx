import { useState } from "react";
import Icon from "./Icons";
import DataTable from "./DataTable";
import { AnimatedNumber } from "./Animated";
import { RANGES } from "../lib/metrics";
import { COMPANY, MODULES } from "../config";
import { openInCreator } from "../zohoapi";
import { SECTIONS } from "../lib/sections";

export function Header({ range, setRange, loading, live, lastSync, onRefresh, active, onJump, railOpen, onToggleRail }) {
  return (
    <header className="header">
      <div className="header-row">
        <div className="brand">
          <span className="brand-mark">
            <svg viewBox="0 0 32 32" width="26" height="26" aria-hidden="true">
              <path d="M16 3l11 7v12l-11 7-11-7V10z" fill="none" stroke="#fff" strokeWidth="2" />
              <path d="M11 13h10v10H11z" fill="#bff1f8" stroke="#fff" strokeWidth="1.5" transform="rotate(8 16 18)" />
            </svg>
          </span>
          <div>
            <b>{COMPANY.name}</b>
            <span>{COMPANY.tagline}</span>
          </div>
        </div>
        <div className="seg" role="tablist" aria-label="Date range">
          {RANGES.map((r) => (
            <button key={r.key} type="button" role="tab" aria-selected={range === r.key} className={range === r.key ? "is-on" : ""} onClick={() => setRange(r.key)}>
              {r.label}
            </button>
          ))}
        </div>
        <div className="header-right">
          <span className={`sync ${loading ? "is-loading" : live ? "is-live" : "is-demo"}`}>
            <span className="live-dot" />
            {loading ? "Syncing…" : live ? `Synced ${lastSync ? lastSync.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : ""}` : "Static data"}
          </span>
          <button type="button" className={`icon-btn ${loading ? "spin" : ""}`} onClick={onRefresh} aria-label="Refresh data" title="Refresh">
            <Icon name="refresh" />
          </button>
          <button
            type="button"
            className={`icon-btn ${railOpen ? "is-on" : ""}`}
            onClick={onToggleRail}
            aria-pressed={railOpen}
            aria-label={railOpen ? "Hide side panel" : "Show side panel"}
            title={railOpen ? "Hide quick actions & alerts" : "Show quick actions & alerts"}
          >
            <Icon name="panel" />
          </button>
        </div>
      </div>
      <nav className="chips" aria-label="Sections">
        <button type="button" className={`chip ${active === "top" ? "is-on" : ""}`} onClick={() => onJump("top")}>
          <Icon name="grid" size={15} /> Overview
        </button>
        {SECTIONS.map((s) => (
          <button key={s.key} type="button" className={`chip tone-${s.tone} ${active === s.key ? "is-on" : ""}`} onClick={() => onJump(s.key)}>
            <b>{s.num}</b> {s.short}
          </button>
        ))}
      </nav>
    </header>
  );
}

// One module block: numbered header, KPI pills, insights ↔ records toggle.
export function Section({ meta, kpis, records, columns, initialSort, error, toolbar, onRowClick, children }) {
  const [tab, setTab] = useState("insights");
  const mod = MODULES[meta.key];
  return (
    <section id={`sec-${meta.key}`} className={`section tone-${meta.tone}`}>
      <header className="section-head reveal">
        <span className="section-num">{meta.num}</span>
        <span className="section-icon"><Icon name={meta.icon} size={22} /></span>
        <div className="section-title">
          <h2>{mod.label}</h2>
          <p>Report · <code>{mod.report}</code> · {records.length} records</p>
        </div>
        <div className="section-actions">
          <div className="seg seg-sm">
            <button type="button" className={tab === "insights" ? "is-on" : ""} onClick={() => setTab("insights")}>Insights</button>
            <button type="button" className={tab === "records" ? "is-on" : ""} onClick={() => setTab("records")}>Records</button>
          </div>
          <button type="button" className="btn-tone" onClick={() => openInCreator(`Form:${mod.form}`)}>
            <Icon name="plus" size={15} stroke={2.4} /> New
          </button>
        </div>
      </header>

      {error && (
        <div className="banner banner-bad">
          <Icon name="alert" /> Couldn’t load <b>{mod.report}</b>: {error}
        </div>
      )}

      {toolbar}

      <div className="kpi-strip">
        {kpis.map((k) => (
          <div key={k.label} className={`kpi reveal ${k.tone ? `kpi-${k.tone}` : ""}`}>
            <span className="kpi-label">{k.label}</span>
            <strong className="kpi-value">
              <AnimatedNumber value={k.value} format={k.fmt} />
              {k.unit && <small> {k.unit}</small>}
            </strong>
            {k.d != null ? (
              <span className={`delta ${k.d >= 0 ? "up" : "down"}`}>
                <Icon name={k.d >= 0 ? "arrowUp" : "arrowDown"} size={13} stroke={2.4} />
                {Math.abs(k.d).toFixed(1)}% vs prev.
              </span>
            ) : (
              <span className="delta muted">{k.note || " "}</span>
            )}
          </div>
        ))}
      </div>

      {tab === "insights" ? (
        children
      ) : (
        <div className="card">
          <DataTable rows={records} columns={columns} initialSort={initialSort} onRowClick={onRowClick} />
        </div>
      )}
    </section>
  );
}

export function Panel({ title, sub, icon, className = "", right, children }) {
  return (
    <div className={`card reveal ${className}`}>
      <header className="card-head">
        <div className="card-title">
          {icon && <span className="card-icon"><Icon name={icon} /></span>}
          <div>
            <h3>{title}</h3>
            {sub && <p>{sub}</p>}
          </div>
        </div>
        {right}
      </header>
      {children}
    </div>
  );
}

const ACTIONS = [
  { key: "processOrders", label: "New process order", icon: "orders", tone: "violet" },
  { key: "dailyProduction", label: "Daily production entry", icon: "production", tone: "blue" },
  { key: "productionReceipt", label: "Production receipt", icon: "receipt", tone: "green" },
  { key: "bom", label: "Create BOM", icon: "bom", tone: "coral" },
  { key: "crystallizers", label: "Add crystallizer", icon: "crystal", tone: "teal" },
  { key: "plants", label: "Add plant", icon: "plant", tone: "amber" },
];

// Right-hand column: quick links to Creator forms + live alerts.
export function RightRail({ alerts, onJump, onClose }) {
  return (
    <aside className="rail">
      <button type="button" className="rail-close" onClick={onClose} aria-label="Hide side panel" title="Hide panel">
        <Icon name="close" size={14} stroke={2.2} />
      </button>
      <p className="rail-head">Quick actions</p>
      <div className="actions">
        {ACTIONS.map((a) => (
          <button key={a.key} type="button" className={`action tone-${a.tone}`} onClick={() => openInCreator(`Form:${MODULES[a.key].form}`)}>
            <span className="action-icon"><Icon name={a.icon} size={17} /></span>
            <span className="action-label">{a.label}</span>
            <Icon name="chevron" size={14} className="action-chev" />
          </button>
        ))}
      </div>
      <p className="rail-head">Live alerts <em>{alerts.length}</em></p>
      <div className="alerts">
        {alerts.map((a, i) => (
          <button key={i} type="button" className={`alert tone-${a.tone}`} onClick={() => onJump(a.view)}>
            <Icon name={a.tone === "good" ? "check" : "alert"} size={16} />
            <span>
              <b>{a.title}</b>
              <small>{a.text}</small>
            </span>
          </button>
        ))}
      </div>
    </aside>
  );
}

export function HeroStat({ label, value, unit, sub, d }) {
  return (
    <div className="glass">
      <span className="glass-label">{label}</span>
      <strong>
        <AnimatedNumber value={value} /> {unit && <small>{unit}</small>}
      </strong>
      {d != null ? (
        <span className={`delta ${d >= 0 ? "up" : "down"}`}>
          <Icon name={d >= 0 ? "arrowUp" : "arrowDown"} size={13} stroke={2.4} />
          {Math.abs(d).toFixed(1)}% vs prev.
        </span>
      ) : (
        <span className="delta muted">{sub}</span>
      )}
    </div>
  );
}
