import { useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import { fmtNum } from "../lib/metrics";
import { prefersReduced } from "../lib/motion";
import { useWidth, niceMax } from "../lib/chartUtils";

// ─────────────────────────────────────────────────────────────
//  Donut — part-to-whole with hover focus and a legend table.
// ─────────────────────────────────────────────────────────────
export function Donut({ items, size = 184, thickness = 24, centerLabel = "Total", unit = "", format = (n) => fmtNum(n) }) {
  const [hover, setHover] = useState(null);
  const svg = useRef(null);
  const shown = items.filter((i) => i.value > 0);
  const total = shown.reduce((a, b) => a + b.value, 0);
  const r = (size - thickness) / 2 - 4;
  const C = 2 * Math.PI * r;
  const gap = shown.length > 1 ? 3 : 0;
  const segs = [];
  shown.reduce((acc, it) => {
    const len = total ? (it.value / total) * C : 0;
    segs.push({ ...it, len, off: acc });
    return acc + len;
  }, 0);

  useLayoutEffect(() => {
    if (!svg.current || prefersReduced()) return;
    const arcs = svg.current.querySelectorAll(".donut-seg");
    const lens = [...arcs].map((a) => a.getAttribute("stroke-dasharray"));
    gsap.fromTo(arcs, { strokeDasharray: `0 ${C}` }, { strokeDasharray: (i) => lens[i], duration: 0.9, ease: "power3.out", stagger: 0.08, clearProps: "strokeDasharray" });
    gsap.fromTo(svg.current, { rotate: -40 }, { rotate: 0, duration: 1.2, ease: "power3.out" });
  }, [total, C]);

  const focus = hover != null ? segs[hover] : null;
  return (
    <div className="donut">
      <div className="donut-figure" style={{ width: size, height: size }}>
        <svg ref={svg} width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-2)" strokeWidth={thickness} />
          {segs.map((s, i) => (
            <circle
              key={s.label}
              className="donut-seg"
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={s.color}
              strokeWidth={hover === i ? thickness + 8 : thickness}
              strokeDasharray={`${Math.max(0, s.len - gap)} ${C}`}
              strokeDashoffset={-s.off}
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
              opacity={hover != null && hover !== i ? 0.35 : 1}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
            />
          ))}
        </svg>
        <div className="donut-center">
          <strong>{format(focus ? focus.value : total)}</strong>
          <span>{focus ? focus.label : centerLabel}</span>
          {focus && <em>{Math.round((focus.value / total) * 100)}%</em>}
        </div>
      </div>
      <ul className="legend">
        {items.map((it) => {
          const i = segs.findIndex((s) => s.label === it.label);
          return (
            <li key={it.label} className={i >= 0 && i === hover ? "is-hover" : ""} onMouseEnter={() => i >= 0 && setHover(i)} onMouseLeave={() => setHover(null)}>
              <span className="swatch" style={{ background: it.color }} />
              <span className="legend-label">{it.label}</span>
              <b>{format(it.value)}{unit && <small> {unit}</small>}</b>
              <em>{total ? Math.round((it.value / total) * 100) : 0}%</em>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  Column chart — vertical bars, rounded data-end, hover tooltip.
// ─────────────────────────────────────────────────────────────
export function ColumnChart({ buckets, unit = "", height = 230, color = "var(--series-3)" }) {
  const [wrap, width] = useWidth();
  const [hover, setHover] = useState(null);
  const svg = useRef(null);
  const pad = { t: 14, r: 8, b: 28, l: 46 };
  const iw = width - pad.l - pad.r;
  const ih = height - pad.t - pad.b;
  const max = niceMax(Math.max(...buckets.map((b) => b.value), 0) * 1.08);
  const step = iw / Math.max(1, buckets.length);
  const bw = Math.max(4, Math.min(34, step * 0.62));
  const every = Math.ceil(buckets.length / Math.max(2, Math.floor(iw / 64)));

  useLayoutEffect(() => {
    if (!svg.current || prefersReduced()) return;
    gsap.fromTo(svg.current.querySelectorAll(".col"), { scaleY: 0 }, { scaleY: 1, transformOrigin: "50% 100%", duration: 0.8, ease: "back.out(1.4)", stagger: 0.025 });
  }, [buckets]);

  return (
    <div className="chart" ref={wrap}>
      <svg ref={svg} width={width} height={height} role="img" aria-label="Column chart">
        {[0, 0.5, 1].map((f) => {
          const y = pad.t + ih - f * ih;
          return (
            <g key={f}>
              <line x1={pad.l} x2={width - pad.r} y1={y} y2={y} className="grid" />
              <text x={pad.l - 8} y={y + 4} textAnchor="end" className="axis">{fmtNum(f * max)}</text>
            </g>
          );
        })}
        {buckets.map((b, i) => {
          const h = (b.value / max) * ih;
          const x = pad.l + i * step + (step - bw) / 2;
          const y = pad.t + ih - h;
          const rr = Math.min(4, h, bw / 2);
          return (
            <g key={i} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              <rect x={pad.l + i * step} y={pad.t} width={step} height={ih} fill="transparent" />
              {h > 0 && (
                <path
                  className="col"
                  d={`M${x},${y + h} V${y + rr} Q${x},${y} ${x + rr},${y} H${x + bw - rr} Q${x + bw},${y} ${x + bw},${y + rr} V${y + h}Z`}
                  fill={color}
                  opacity={hover != null && hover !== i ? 0.45 : 1}
                />
              )}
              {(i % every === 0 || i === buckets.length - 1) && (
                <text x={x + bw / 2} y={height - 8} textAnchor="middle" className="axis">{b.label}</text>
              )}
            </g>
          );
        })}
      </svg>
      {hover != null && (
        <div className="tooltip" style={{ left: Math.min(Math.max(pad.l + hover * step + step / 2, 70), width - 70), top: pad.t + ih - (buckets[hover].value / max) * ih - 10 }}>
          <span>{buckets[hover].label}</span>
          <strong>{fmtNum(buckets[hover].value, 1)} {unit}</strong>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  Heatmap — rows × days, one-hue sequential ramp.
// ─────────────────────────────────────────────────────────────
const RAMP = ["#cde2fb", "#9ec5f4", "#6da7ec", "#3987e5", "#256abf", "#184f95"];

export function Heatmap({ rows, cols, unit = "" }) {
  const [hover, setHover] = useState(null);
  const ref = useRef(null);
  const max = Math.max(1, ...rows.flatMap((r) => r.values));
  const shade = (v) => (v <= 0 ? null : RAMP[Math.min(RAMP.length - 1, Math.floor((v / max) * RAMP.length))]);

  useLayoutEffect(() => {
    if (!ref.current || prefersReduced()) return;
    gsap.fromTo(ref.current.querySelectorAll(".hm-cell"), { scale: 0.2, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.4, ease: "back.out(2)", stagger: 0.004 });
  }, [rows]);

  return (
    <div className="heatmap" ref={ref}>
      <div className="hm-grid" style={{ gridTemplateColumns: `minmax(96px, 150px) repeat(${cols.length}, minmax(12px, 1fr))` }}>
        <span />
        {cols.map((c, i) => <span key={i} className="hm-col">{i % 2 === 0 ? c : ""}</span>)}
        {rows.map((r, ri) => [
          <span key={`${r.label}-l`} className="hm-label" title={r.label}>{r.label}</span>,
          ...r.values.map((v, ci) => (
            <span
              key={`${r.label}-${ci}`}
              className={`hm-cell ${hover && hover.r === ri && hover.c === ci ? "is-hover" : ""}`}
              style={{ background: shade(v) || "var(--surface-2)" }}
              onMouseEnter={() => setHover({ r: ri, c: ci })}
              onMouseLeave={() => setHover(null)}
            />
          )),
        ])}
      </div>
      <div className="hm-foot">
        <span className="hm-readout">
          {hover ? (
            <>
              <b>{rows[hover.r].label}</b> · {cols[hover.c]} · <b>{fmtNum(rows[hover.r].values[hover.c], 1)} {unit}</b>
            </>
          ) : (
            "Hover a cell to read the harvest for that day"
          )}
        </span>
        <span className="hm-scale">
          less {RAMP.map((c) => <i key={c} style={{ background: c }} />)} more
        </span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  Composition — one stacked 100% bar per row (2px gaps).
// ─────────────────────────────────────────────────────────────
export function Composition({ rows, colorFor, format = (n) => fmtNum(n), unit = "" }) {
  const [hover, setHover] = useState(null);
  const keys = [...new Set(rows.flatMap((r) => r.parts.map((p) => p.key)))];
  return (
    <div className="compo">
      <ul className="compo-legend">
        {keys.map((k) => (
          <li key={k} className={hover && hover !== k ? "is-dim" : ""} onMouseEnter={() => setHover(k)} onMouseLeave={() => setHover(null)}>
            <span className="swatch" style={{ background: colorFor(k) }} />
            {k}
          </li>
        ))}
      </ul>
      {rows.map((r) => {
        const total = r.parts.reduce((a, p) => a + p.value, 0) || 1;
        const hp = hover && r.parts.find((p) => p.key === hover);
        return (
          <div key={r.label} className="compo-row">
            <div className="compo-head">
              <b>{r.label}</b>
              <span>{hp ? `${hover}: ${unit}${format(hp.value)} · ${Math.round((hp.value / total) * 100)}%` : r.sub}</span>
            </div>
            <div className="compo-bar">
              {r.parts.map((p) => (
                <span
                  key={p.key}
                  data-grow
                  className={hover && hover !== p.key ? "is-dim" : ""}
                  style={{ flexGrow: p.value, background: colorFor(p.key) }}
                  onMouseEnter={() => setHover(p.key)}
                  onMouseLeave={() => setHover(null)}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  Bullet — actual vs target on a capacity track.
// ─────────────────────────────────────────────────────────────
export function Bullet({ items, unit = "" }) {
  return (
    <ul className="bullets">
      {items.map((it) => {
        const max = Math.max(it.max, it.value, it.target, 1);
        const hit = it.target ? it.value / it.target : 0;
        const tone = hit >= 0.9 ? "good" : hit >= 0.6 ? "warn" : "bad";
        return (
          <li key={it.label}>
            <div className="bullet-head">
              <b>{it.label}</b>
              <span className={`state tone-${tone}`}>{Math.round(hit * 100)}% of target</span>
            </div>
            <div className="bullet-track">
              <span className="bullet-band" style={{ width: `${(it.target / max) * 100}%` }} />
              <span className="bullet-bar" data-grow style={{ width: `${(it.value / max) * 100}%` }} />
              <span className="bullet-mark" style={{ left: `${(it.target / max) * 100}%` }} />
            </div>
            <div className="bullet-foot">
              <span>{fmtNum(it.value)} {unit} produced</span>
              <span>target {fmtNum(it.target)} · capacity {fmtNum(it.max)}</span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

// ─────────────────────────────────────────────────────────────
//  Gauge — semi-circle with banded zones and a needle.
// ─────────────────────────────────────────────────────────────
export function Gauge({ value, min = 0, max = 30, bands = [], unit = "", label = "" }) {
  const needle = useRef(null);
  const cx = 120, cy = 124, r = 92;
  const frac = (v) => (Math.min(max, Math.max(min, v)) - min) / (max - min);
  const pt = (v, rad = r) => [cx - rad * Math.cos(Math.PI * frac(v)), cy - rad * Math.sin(Math.PI * frac(v))];
  const arc = (a, b) => {
    const [x1, y1] = pt(a);
    const [x2, y2] = pt(b);
    return `M${x1},${y1} A${r},${r} 0 0 1 ${x2},${y2}`;
  };
  const deg = frac(value) * 180;
  const ticks = [...new Set([min, ...bands.map((b) => b.from), ...bands.map((b) => b.to), max])];

  useLayoutEffect(() => {
    if (!needle.current) return;
    if (prefersReduced()) {
      gsap.set(needle.current, { rotation: deg, svgOrigin: `${cx} ${cy}` });
      return;
    }
    gsap.fromTo(needle.current, { rotation: 0 }, { rotation: deg, svgOrigin: `${cx} ${cy}`, duration: 1.8, ease: "elastic.out(1, 0.5)" });
  }, [deg]);

  return (
    <div className="gauge">
      <svg viewBox="0 0 240 140" role="img" aria-label={`${label} gauge`}>
        <path d={arc(min, max)} fill="none" stroke="var(--surface-2)" strokeWidth="16" strokeLinecap="round" />
        {bands.map((b) => (
          <path key={b.from} d={arc(b.from, b.to)} fill="none" stroke={`var(--tone-${b.tone})`} strokeWidth="16" opacity="0.9" />
        ))}
        {ticks.map((v) => {
          const [x, y] = pt(v, r + 17);
          return <text key={v} x={x} y={y + 4} textAnchor="middle" className="axis">{v}</text>;
        })}
        <g ref={needle}>
          <line x1={cx} y1={cy} x2={cx - r + 18} y2={cy} stroke="var(--ink)" strokeWidth="4" strokeLinecap="round" />
        </g>
        <circle cx={cx} cy={cy} r="9" fill="var(--ink)" />
        <circle cx={cx} cy={cy} r="3.5" fill="#fff" />
      </svg>
      <div className="gauge-read">
        <strong>{fmtNum(value, 1)}<small> {unit}</small></strong>
        <span>{label}</span>
      </div>
    </div>
  );
}
