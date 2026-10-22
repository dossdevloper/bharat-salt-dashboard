import { useEffect, useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import { SECTIONS } from "../lib/sections";
import { COMPANY, MODULES } from "../config";
import { prefersReduced } from "../lib/motion";

const STEP_MS = 280; // pace at which settled reports are ticked off
const ORBITS = [
  { rx: 104, ry: 30, rot: -18, speed: 5.5, color: "#3456e8" },
  { rx: 96, ry: 26, rot: 42, speed: 7, color: "#16b3c7" },
  { rx: 88, ry: 22, rot: 102, speed: 9, color: "#6250d6" },
];

// Full-screen boot sequence shown on first load.
// `status` maps module key → "pending" | "done" | "error".
export default function BootLoader({ status, ready, onDone }) {
  const root = useRef(null);
  const pctRef = useRef(null);
  const [shown, setShown] = useState(0);
  const exiting = useRef(false);
  const total = SECTIONS.length;

  // Tick modules off one at a time, in section order, once each has settled.
  useEffect(() => {
    if (shown >= total) return;
    const t = setTimeout(() => {
      if (status[SECTIONS[shown].key] && status[SECTIONS[shown].key] !== "pending") setShown((n) => n + 1);
    }, shown === 0 ? STEP_MS * 2 : STEP_MS);
    return () => clearTimeout(t);
  }, [shown, status, total]);

  // Ambient loops.
  useLayoutEffect(() => {
    const reduced = prefersReduced();
    const ctx = gsap.context(() => {
      if (reduced) return;
      gsap.from(".boot-stage", { scale: 0.6, opacity: 0, duration: 0.9, ease: "back.out(1.6)" });
      gsap.from(".boot-copy > *", { y: 16, opacity: 0, duration: 0.6, stagger: 0.08, delay: 0.25, ease: "power3.out" });

      gsap.to(".boot-crystal", { y: -10, duration: 1.8, yoyo: true, repeat: -1, ease: "sine.inOut" });
      gsap.to(".boot-core", { rotation: 360, svgOrigin: "120 120", duration: 6, repeat: -1, ease: "none" });
      gsap.fromTo(".boot-shine", { attr: { x1: -1, x2: 0 } }, { attr: { x1: 1, x2: 2 }, duration: 2.2, repeat: -1, ease: "power2.inOut", repeatDelay: 0.6 });
      gsap.fromTo(".boot-wave", { scale: 0.4, opacity: 0.7 }, { scale: 1.6, opacity: 0, transformOrigin: "50% 50%", duration: 2.6, repeat: -1, stagger: 0.85, ease: "power1.out" });
      gsap.to(".boot-ticks", { rotation: 360, svgOrigin: "120 120", duration: 24, repeat: -1, ease: "none" });

      // satellites travelling along tilted elliptical orbits
      ORBITS.forEach((o, i) => {
        const dot = root.current.querySelector(`.boot-sat-${i}`);
        const trail = root.current.querySelector(`.boot-trail-${i}`);
        const a = { t: i * 120 };
        gsap.to(a, {
          t: `+=360`,
          duration: o.speed,
          repeat: -1,
          ease: "none",
          onUpdate: () => {
            const rad = (a.t * Math.PI) / 180;
            const x = o.rx * Math.cos(rad);
            const y = o.ry * Math.sin(rad);
            dot.setAttribute("cx", x);
            dot.setAttribute("cy", y);
            trail.setAttribute("cx", o.rx * Math.cos(rad - 0.25));
            trail.setAttribute("cy", o.ry * Math.sin(rad - 0.25));
            // behind the crystal on the far half of the orbit
            dot.style.opacity = Math.sin(rad) < -0.2 ? 0.35 : 1;
          },
        });
      });

      // rising salt grains
      gsap.utils.toArray(".boot-grain").forEach((g) => {
        const tl = gsap.timeline({ repeat: -1, repeatRefresh: true, delay: gsap.utils.random(0, 2.5) });
        tl.fromTo(
          g,
          { x: "random(-50, 50)", y: 150, rotation: "random(0, 90)", scale: "random(0.5, 1.2)", opacity: 0 },
          { y: "random(-170, -110)", rotation: "+=180", duration: 3.2, ease: "power1.out" },
        )
          .to(g, { opacity: 1, duration: 0.6 }, 0)
          .to(g, { opacity: 0, duration: 0.9 }, 2.3);
      });
    }, root);
    return () => ctx.revert();
  }, []);

  // Percentage counter follows ticked-off modules.
  useEffect(() => {
    const target = Math.round((shown / total) * 100);
    const obj = { v: parseFloat(pctRef.current?.textContent) || 0 };
    const tw = gsap.to(obj, {
      v: target,
      duration: prefersReduced() ? 0 : 0.5,
      ease: "power2.out",
      onUpdate: () => pctRef.current && (pctRef.current.textContent = Math.round(obj.v)),
    });
    return () => tw.kill();
  }, [shown, total]);

  // Exit once every module is ticked and data is in hand.
  useEffect(() => {
    if (!ready || shown < total || exiting.current) return;
    exiting.current = true;
    if (prefersReduced()) {
      onDone();
      return;
    }
    const tl = gsap.timeline({ delay: 0.35, onComplete: onDone });
    tl.to(".boot-copy", { y: 20, opacity: 0, duration: 0.35, ease: "power2.in" })
      .to(".boot-crystal", { scale: 1.25, duration: 0.3, ease: "power2.out" }, "<")
      .to(".boot-stage", { scale: 0.2, opacity: 0, duration: 0.45, ease: "back.in(1.8)" })
      .to(root.current, { clipPath: "circle(0% at 50% 42%)", duration: 0.6, ease: "power3.inOut" }, "-=0.15");
  }, [ready, shown, total, onDone]);

  const current = SECTIONS[Math.min(shown, total - 1)];
  const anyError = SECTIONS.slice(0, shown).some((s) => status[s.key] === "error");

  return (
    <div className="boot" ref={root} role="status" aria-live="polite">
      <div className="boot-grid" />
      <div className="boot-scan" />
      <div className="boot-aura" />

      <div className="boot-stage">
        <svg viewBox="0 0 240 240" className="boot-svg" aria-hidden="true">
          <defs>
            <linearGradient id="bt-top" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#ffffff" />
              <stop offset="1" stopColor="#cfe9ff" />
            </linearGradient>
            <linearGradient id="bt-left" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#7fb2ff" />
              <stop offset="1" stopColor="#3456e8" />
            </linearGradient>
            <linearGradient id="bt-right" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#7ce8f2" />
              <stop offset="1" stopColor="#16b3c7" />
            </linearGradient>
            <linearGradient id="bt-shine" className="boot-shine" x1="-1" y1="0" x2="0" y2="1">
              <stop offset="0.4" stopColor="#fff" stopOpacity="0" />
              <stop offset="0.5" stopColor="#fff" stopOpacity="0.85" />
              <stop offset="0.6" stopColor="#fff" stopOpacity="0" />
            </linearGradient>
            <radialGradient id="bt-glow">
              <stop offset="0" stopColor="#7ce8f2" stopOpacity="0.55" />
              <stop offset="1" stopColor="#7ce8f2" stopOpacity="0" />
            </radialGradient>
          </defs>

          <circle cx="120" cy="120" r="110" fill="url(#bt-glow)" />
          {[0, 1, 2].map((i) => (
            <circle key={i} className="boot-wave" cx="120" cy="120" r="70" fill="none" stroke="#3456e8" strokeWidth="1.5" />
          ))}
          <g className="boot-ticks">
            {Array.from({ length: 60 }).map((_, i) => (
              <line
                key={i}
                x1="120"
                y1={i % 5 === 0 ? 8 : 12}
                x2="120"
                y2="16"
                stroke={i % 5 === 0 ? "#3456e8" : "#b9c8ee"}
                strokeWidth={i % 5 === 0 ? 2 : 1}
                transform={`rotate(${i * 6} 120 120)`}
              />
            ))}
          </g>

          {/* orbits — back halves */}
          {ORBITS.map((o, i) => (
            <g key={`o${i}`} transform={`translate(120 120) rotate(${o.rot})`}>
              <ellipse rx={o.rx} ry={o.ry} fill="none" stroke={o.color} strokeOpacity="0.28" strokeWidth="1.2" strokeDasharray="3 5" />
            </g>
          ))}

          {/* isometric salt crystal */}
          <g className="boot-crystal">
            <polygon points="120,62 168,90 120,118 72,90" fill="url(#bt-top)" stroke="#fff" strokeWidth="2" strokeLinejoin="round" />
            <polygon points="72,90 120,118 120,174 72,146" fill="url(#bt-left)" stroke="#fff" strokeWidth="2" strokeLinejoin="round" />
            <polygon points="120,118 168,90 168,146 120,174" fill="url(#bt-right)" stroke="#fff" strokeWidth="2" strokeLinejoin="round" />
            <polygon points="72,90 120,118 120,174 72,146 120,62 168,90 168,146" fill="url(#bt-shine)" opacity="0.7" />
            <g className="boot-core">
              <rect x="108" y="106" width="24" height="24" rx="3" fill="none" stroke="#fff" strokeWidth="2" opacity="0.9" />
              <rect x="113" y="111" width="14" height="14" rx="2" fill="#fff" opacity="0.65" />
            </g>
            <path d="M120 62 V118 M72 90 L120 118 L168 90" stroke="#fff" strokeOpacity="0.6" strokeWidth="1" fill="none" />
          </g>

          {/* satellites */}
          {ORBITS.map((o, i) => (
            <g key={`s${i}`} transform={`translate(120 120) rotate(${o.rot})`}>
              <circle className={`boot-trail-${i}`} r="3" fill={o.color} opacity="0.35" />
              <circle className={`boot-sat-${i}`} r="5" fill={o.color} stroke="#fff" strokeWidth="2" />
            </g>
          ))}
        </svg>
        <div className="boot-grains" aria-hidden="true">
          {Array.from({ length: 14 }).map((_, i) => <span key={i} className="boot-grain" />)}
        </div>
      </div>

      <div className="boot-copy">
        <p className="boot-eyebrow">{COMPANY.tagline}</p>
        <h1 className="boot-title">{COMPANY.name}</h1>
        <div className="boot-pct">
          <span ref={pctRef}>0</span>
          <small>%</small>
        </div>
        <p className="boot-now">
          {shown >= total ? (
            <>{anyError ? "Ready — some reports need attention" : "All systems ready"}</>
          ) : (
            <>
              <span className="boot-caret" /> Syncing <b>{MODULES[current.key].label}</b>
              <code>{MODULES[current.key].report}</code>
            </>
          )}
        </p>

        <div className="boot-bar">
          {SECTIONS.map((s, i) => (
            <span key={s.key} className={`tone-${s.tone} ${i < shown ? "is-done" : i === shown ? "is-active" : ""}`} />
          ))}
        </div>

      </div>
    </div>
  );
}
