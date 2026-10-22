import { useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import { fmtNum } from "../lib/metrics";
import { prefersReduced } from "../lib/motion";
import { useWidth, niceMax } from "../lib/chartUtils";

const smooth = (pts) =>
  pts.reduce((d, [x, y], i, a) => {
    if (i === 0) return `M${x},${y}`;
    const [px, py] = a[i - 1];
    const cx = (px + x) / 2;
    return `${d} C${cx},${py} ${cx},${y} ${x},${y}`;
  }, "");

// Single-series area chart with a crosshair tooltip.
export function TrendChart({ buckets, unit = "", height = 240, highlightLast = true }) {
  const [wrap, width] = useWidth();
  const [hover, setHover] = useState(null);
  const svg = useRef(null);
  const pad = { t: 16, r: 16, b: 30, l: 52 };
  const iw = width - pad.l - pad.r;
  const ih = height - pad.t - pad.b;
  const max = niceMax(Math.max(...buckets.map((b) => b.value), 0) * 1.1);
  const step = buckets.length > 1 ? iw / (buckets.length - 1) : iw;
  const pts = buckets.map((b, i) => [pad.l + i * step, pad.t + ih - (b.value / max) * ih]);
  const line = smooth(pts);
  const area = pts.length ? `${line} L${pts.at(-1)[0]},${pad.t + ih} L${pts[0][0]},${pad.t + ih}Z` : "";
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * max);
  const every = Math.ceil(buckets.length / Math.max(2, Math.floor(iw / 70)));

  useLayoutEffect(() => {
    const path = svg.current?.querySelector(".trend-line");
    if (!path || prefersReduced()) return;
    const len = path.getTotalLength();
    gsap.fromTo(path, { strokeDasharray: len, strokeDashoffset: len }, { strokeDashoffset: 0, duration: 1.4, ease: "power2.out", clearProps: "strokeDasharray,strokeDashoffset" });
    gsap.fromTo(svg.current.querySelector(".trend-area"), { opacity: 0 }, { opacity: 1, duration: 1.2, delay: 0.3 });
  }, [buckets]);

  const onMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * width;
    const i = Math.round((x - pad.l) / step);
    setHover(i >= 0 && i < buckets.length ? i : null);
  };

  return (
    <div className="chart" ref={wrap}>
      <svg ref={svg} width={width} height={height} onMouseMove={onMove} onMouseLeave={() => setHover(null)} role="img" aria-label="Production trend">
        <defs>
          <linearGradient id="trend-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--series-1)" stopOpacity="0.28" />
            <stop offset="1" stopColor="var(--series-1)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {ticks.map((t) => {
          const y = pad.t + ih - (t / max) * ih;
          return (
            <g key={t}>
              <line x1={pad.l} x2={width - pad.r} y1={y} y2={y} className="grid" />
              <text x={pad.l - 10} y={y + 4} textAnchor="end" className="axis">{fmtNum(t)}</text>
            </g>
          );
        })}
        {buckets.map((b, i) =>
          i % every === 0 || i === buckets.length - 1 ? (
            <text key={i} x={pad.l + i * step} y={height - 8} textAnchor="middle" className="axis">{b.label}</text>
          ) : null,
        )}
        <path className="trend-area" d={area} fill="url(#trend-fill)" />
        <path className="trend-line" d={line} fill="none" stroke="var(--series-1)" strokeWidth="2.5" strokeLinecap="round" />
        {highlightLast && pts.length > 0 && (
          <g>
            <circle cx={pts.at(-1)[0]} cy={pts.at(-1)[1]} r="9" className="pulse-ring" />
            <circle cx={pts.at(-1)[0]} cy={pts.at(-1)[1]} r="5" fill="var(--series-1)" stroke="var(--surface)" strokeWidth="2" />
          </g>
        )}
        {hover != null && (
          <g pointerEvents="none">
            <line x1={pts[hover][0]} x2={pts[hover][0]} y1={pad.t} y2={pad.t + ih} className="crosshair" />
            <circle cx={pts[hover][0]} cy={pts[hover][1]} r="5" fill="var(--series-1)" stroke="var(--surface)" strokeWidth="2" />
          </g>
        )}
      </svg>
      {hover != null && (
        <div className="tooltip" style={{ left: Math.min(Math.max(pts[hover][0], 70), width - 70), top: pts[hover][1] - 12 }}>
          <span>{buckets[hover].label}</span>
          <strong>{fmtNum(buckets[hover].value, 1)} {unit}</strong>
        </div>
      )}
    </div>
  );
}

// Ranked horizontal bars, one hue (single measure).
export function BarList({ items, unit = "", max, limit = 6, color = "var(--series-1)", empty = "No data for this period" }) {
  const [hover, setHover] = useState(null);
  const shown = items.slice(0, limit);
  const top = max ?? Math.max(...shown.map((i) => i.value), 1);
  if (!shown.length) return <p className="empty">{empty}</p>;
  return (
    <ul className="barlist">
      {shown.map((it, i) => (
        <li key={it.label} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} className={hover === i ? "is-hover" : ""}>
          <div className="barlist-head">
            <span className="barlist-label" title={it.label}>{it.label}</span>
            <span className="barlist-value">{fmtNum(it.value, 1)} <small>{unit}</small></span>
          </div>
          <div className="barlist-track">
            <span data-grow style={{ width: `${Math.max(2, (it.value / top) * 100)}%`, background: it.color || color }} />
          </div>
          {it.sub && <div className="barlist-sub">{it.sub}</div>}
        </li>
      ))}
    </ul>
  );
}

// Part-to-whole strip for status buckets (2px surface gap between segments).
export function StatusStrip({ items }) {
  const total = items.reduce((a, b) => a + b.value, 0) || 1;
  const [hover, setHover] = useState(null);
  return (
    <div className="strip-wrap">
      <div className="strip">
        {items.filter((i) => i.value > 0).map((it) => (
          <span
            key={it.key}
            data-grow
            className={`strip-seg tone-bg-${it.tone} ${hover && hover !== it.key ? "is-dim" : ""}`}
            style={{ flexGrow: it.value }}
            onMouseEnter={() => setHover(it.key)}
            onMouseLeave={() => setHover(null)}
            title={`${it.key}: ${it.value} (${Math.round((it.value / total) * 100)}%)`}
          />
        ))}
      </div>
    </div>
  );
}

// Circular gauge for utilisation.
export function Ring({ value, size = 64, stroke = 7, tone = "blue", label }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const ref = useRef(null);
  const pct = Math.min(100, Math.max(0, value || 0));
  useLayoutEffect(() => {
    if (!ref.current) return;
    if (prefersReduced()) {
      ref.current.style.strokeDashoffset = c * (1 - pct / 100);
      return;
    }
    gsap.fromTo(ref.current, { strokeDashoffset: c }, { strokeDashoffset: c * (1 - pct / 100), duration: 1.3, ease: "power3.out" });
  }, [pct, c]);
  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} className="ring-track" strokeWidth={stroke} fill="none" />
        <circle
          ref={ref}
          cx={size / 2}
          cy={size / 2}
          r={r}
          className={`ring-fill tone-stroke-${tone}`}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <span className="ring-label">{label ?? `${Math.round(pct)}%`}</span>
    </div>
  );
}
