import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import Icon from "./Icons";
import { AnimatedNumber } from "./Animated";
import { prefersReduced } from "../lib/motion";

const STAGES = [
  { x: 95, title: "Brine intake" },
  { x: 265, title: "Evaporation" },
  { x: 440, title: "Crystallizer" },
  { x: 610, title: "Harvesting" },
  { x: 775, title: "Washing" },
  { x: 940, title: "Drying & iodizing" },
  { x: 1110, title: "Receipt & dispatch" },
];

const C = {
  line: "#3a4f9e",
  soft: "#c9d5f2",
  water: "#5fb8ec",
  waterLight: "#bfe6fb",
  salt: "#ffffff",
  saltEdge: "#9fb3e0",
  sun: "#ffc24a",
  heat: "#ff7a59",
  steel: "#e7edf9",
  brand: "#3456e8",
  teal: "#16b3c7",
};

export default function SaltLine({ stages, running, onStage }) {
  const root = useRef(null);
  const ctxRef = useRef(null);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      if (prefersReduced()) return; // static illustration
      // timeline pulse travelling across the stage dots
      gsap.fromTo("#sl-pulse", { attr: { cx: 95 } }, { attr: { cx: 1110 }, duration: 7, ease: "none", repeat: -1 });
      gsap.to(".sl-node", { scale: 1.35, transformOrigin: "center", duration: 0.6, stagger: { each: 0.5, repeat: -1, yoyo: true } });

      // brine waves
      gsap.to(".sl-wave", { x: -40, duration: 2.4, ease: "none", repeat: -1 });
      gsap.to("#sl-pump-arm", { rotation: 18, svgOrigin: "128 116", duration: 0.9, yoyo: true, repeat: -1, ease: "sine.inOut" });
      gsap.to(".sl-pipe-flow", { strokeDashoffset: -24, duration: 0.8, ease: "none", repeat: -1 });

      // sun + vapour
      gsap.to("#sl-sun-rays", { rotation: 360, svgOrigin: "265 92", duration: 18, ease: "none", repeat: -1 });
      gsap.fromTo(".sl-vapour", { y: 0, opacity: 0.8 }, { y: -34, opacity: 0, duration: 2.6, repeat: -1, stagger: 0.8, ease: "sine.out" });
      gsap.to(".sl-shimmer", { opacity: 0.25, duration: 1.2, yoyo: true, repeat: -1, stagger: 0.3 });

      // crystals forming
      gsap.fromTo(".sl-cube", { scale: 0, transformOrigin: "center bottom" }, { scale: 1, duration: 0.7, ease: "back.out(3)", stagger: { each: 0.25, repeat: -1, repeatDelay: 2.2 } });

      // harvester arm
      gsap.to("#sl-arm", { rotation: -22, svgOrigin: "625 160", duration: 1.4, yoyo: true, repeat: -1, ease: "power1.inOut" });

      // washer drum + droplets
      gsap.to("#sl-drum", { rotation: 360, svgOrigin: "775 180", duration: 3, ease: "none", repeat: -1 });
      gsap.fromTo(".sl-drop", { y: -6, opacity: 1 }, { y: 18, opacity: 0, duration: 0.9, repeat: -1, stagger: 0.3, ease: "power1.in" });

      // dryer heat
      gsap.to(".sl-heat", { opacity: 0.3, duration: 0.5, yoyo: true, repeat: -1, stagger: 0.12 });
      gsap.to(".sl-haze", { y: -8, opacity: 0, duration: 1.8, repeat: -1, stagger: 0.6, ease: "sine.out" });

      // conveyor & salt particles
      gsap.to("#sl-belt", { strokeDashoffset: -40, duration: 1, ease: "none", repeat: -1 });
      gsap.to(".sl-roller", { rotation: 360, transformOrigin: "center", duration: 1.2, ease: "none", repeat: -1 });
      gsap.utils.toArray(".sl-grain").forEach((g, i) => {
        gsap.fromTo(g, { x: 0 }, { x: 560, duration: 7, ease: "none", repeat: -1, delay: i * 1.4 });
      });

      // bags & truck
      gsap.fromTo(".sl-bag", { y: -26, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: "bounce.out", stagger: { each: 1.2, repeat: -1, repeatDelay: 2.4 } });
      gsap.to("#sl-truck", { x: 8, duration: 0.25, yoyo: true, repeat: -1, ease: "sine.inOut" });
      gsap.to(".sl-wheel", { rotation: 360, transformOrigin: "center", duration: 0.8, ease: "none", repeat: -1 });

      // intro
      gsap.from(".sl-station", { y: 30, opacity: 0, duration: 0.8, stagger: 0.08, ease: "back.out(1.6)" });
    }, root);
    ctxRef.current = ctx;
    return () => ctx.revert();
  }, []);

  useLayoutEffect(() => {
    ctxRef.current?.getTweens().forEach((t) => (running ? t.resume() : t.pause()));
  }, [running]);

  return (
    <div className="saltline" ref={root}>
      <svg viewBox="0 0 1200 330" className="saltline-svg" role="img" aria-label="Animated salt production line">
        <defs>
          <linearGradient id="sl-sea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={C.waterLight} />
            <stop offset="1" stopColor={C.water} />
          </linearGradient>
          <linearGradient id="sl-pan" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#d9f1fd" />
            <stop offset="1" stopColor="#9ed6f5" />
          </linearGradient>
          <linearGradient id="sl-tunnel" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ffe7dc" />
            <stop offset="1" stopColor="#ffc9b3" />
          </linearGradient>
          <clipPath id="sl-sea-clip">
            <rect x="30" y="170" width="130" height="78" rx="10" />
          </clipPath>
          <clipPath id="sl-drum-clip">
            <circle cx="775" cy="180" r="38" />
          </clipPath>
        </defs>

        {/* stage timeline */}
        <line x1="95" y1="42" x2="1110" y2="42" stroke={C.soft} strokeWidth="2" strokeDasharray="4 6" />
        {STAGES.map((s, i) => (
          <g key={s.x} className="sl-tick" onClick={() => onStage?.(i)} style={{ cursor: "pointer" }}>
            <text x={s.x} y="22" textAnchor="middle" className="sl-num">{String(i + 1).padStart(2, "0")}</text>
            <circle className="sl-node" cx={s.x} cy="42" r="7" fill={C.sun} stroke="#fff" strokeWidth="2" />
          </g>
        ))}
        <circle id="sl-pulse" cx="95" cy="42" r="5" fill={C.brand} stroke="#fff" strokeWidth="2" />

        {/* ground + conveyor */}
        <line x1="20" y1="300" x2="1180" y2="300" stroke={C.soft} strokeWidth="2" strokeDasharray="2 8" />
        <rect x="395" y="248" width="620" height="12" rx="6" fill={C.steel} stroke={C.line} strokeWidth="2" />
        <line id="sl-belt" x1="402" y1="254" x2="1008" y2="254" stroke={C.line} strokeWidth="3" strokeDasharray="14 10" />
        {[402, 1008].map((x) => (
          <g key={x} className="sl-roller">
            <circle cx={x} cy="254" r="11" fill="#fff" stroke={C.line} strokeWidth="2" />
            <path d={`M${x - 7} 254h14M${x} ${247}v14`} stroke={C.line} strokeWidth="2" />
          </g>
        ))}
        {[430, 560, 690, 820, 950].map((x) => (
          <line key={x} x1={x} y1="260" x2={x} y2="300" stroke={C.soft} strokeWidth="3" />
        ))}
        {[0, 1, 2, 3, 4].map((i) => (
          <rect key={i} className="sl-grain" x="440" y="238" width="12" height="10" rx="2" fill={C.salt} stroke={C.saltEdge} strokeWidth="1.5" />
        ))}

        {/* 01 brine intake */}
        <g className="sl-station">
          <rect x="30" y="170" width="130" height="78" rx="10" fill="url(#sl-sea)" stroke={C.line} strokeWidth="2" />
          <g clipPath="url(#sl-sea-clip)">
            {[0, 1].map((k) => (
              <path
                key={k}
                className="sl-wave"
                d={`M20 ${190 + k * 18} q10 -8 20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0`}
                stroke="#fff"
                strokeOpacity={0.8 - k * 0.3}
                strokeWidth="2.5"
                fill="none"
              />
            ))}
          </g>
          <rect x="120" y="120" width="26" height="50" rx="4" fill="#fff" stroke={C.line} strokeWidth="2" />
          <g id="sl-pump-arm" transform="translate(123 106)">
            <rect x="0" y="6" width="50" height="8" rx="4" fill={C.brand} />
          </g>
          <path d="M146 140 H200 V200 H230" fill="none" stroke={C.line} strokeWidth="6" strokeLinecap="round" />
          <path className="sl-pipe-flow" d="M146 140 H200 V200 H230" fill="none" stroke={C.waterLight} strokeWidth="2.5" strokeDasharray="6 6" />
          <text x="95" y="268" textAnchor="middle" className="sl-cap">SEA BRINE</text>
        </g>

        {/* 02 evaporation pans */}
        <g className="sl-station">
          <g id="sl-sun-rays" transform="translate(265 92)">
            {Array.from({ length: 12 }).map((_, i) => (
              <line key={i} x1="0" y1="-30" x2="0" y2="-40" stroke={C.sun} strokeWidth="3" strokeLinecap="round" transform={`rotate(${i * 30})`} />
            ))}
          </g>
          <circle cx="265" cy="92" r="22" fill={C.sun} />
          <rect x="215" y="196" width="105" height="34" rx="6" fill="url(#sl-pan)" stroke={C.line} strokeWidth="2" />
          <rect x="215" y="230" width="105" height="18" rx="4" fill={C.steel} stroke={C.line} strokeWidth="2" />
          {[232, 258, 284].map((x) => (
            <line key={x} className="sl-shimmer" x1={x} y1="210" x2={x + 16} y2="210" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
          ))}
          {[238, 265, 292].map((x) => (
            <path key={x} className="sl-vapour" d={`M${x} 186 q-6 -8 0 -16 t0 -16`} stroke={C.soft} strokeWidth="3" fill="none" strokeLinecap="round" />
          ))}
          <text x="265" y="268" textAnchor="middle" className="sl-cap">SOLAR PANS</text>
        </g>

        {/* 03 crystallizer */}
        <g className="sl-station">
          <rect x="385" y="160" width="110" height="80" rx="10" fill="#f3f7ff" stroke={C.line} strokeWidth="2" strokeDasharray="6 4" />
          <text x="440" y="152" textAnchor="middle" className="sl-label">CRYSTALLIZER</text>
          {[
            [400, 214], [420, 220], [440, 210], [460, 218], [478, 212],
            [410, 196], [432, 192], [452, 198], [470, 190], [442, 176],
          ].map(([x, y], i) => (
            <rect key={i} className="sl-cube" x={x} y={y} width="14" height="14" rx="2" fill={C.salt} stroke={C.saltEdge} strokeWidth="1.6" transform={`rotate(${(i % 3) * 8 - 8} ${x + 7} ${y + 7})`} />
          ))}
          <text x="440" y="285" textAnchor="middle" className="sl-cap">°Bé 25–29</text>
        </g>

        {/* 04 harvesting */}
        <g className="sl-station">
          <path d="M560 248 q50 -60 100 0z" fill={C.salt} stroke={C.saltEdge} strokeWidth="2" />
          <rect x="575" y="150" width="50" height="34" rx="6" fill={C.sun} stroke={C.line} strokeWidth="2" />
          <rect x="583" y="157" width="18" height="14" rx="3" fill="#e9f6ff" stroke={C.line} strokeWidth="1.5" />
          <g id="sl-arm" transform="translate(625 160)">
            <path d="M0 0 L40 -20 L52 18" fill="none" stroke={C.line} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M44 14 h18 l-4 12 h-14z" fill={C.brand} />
          </g>
          <rect x="570" y="184" width="62" height="14" rx="7" fill={C.line} />
          <circle cx="582" cy="191" r="4" fill="#fff" />
          <circle cx="620" cy="191" r="4" fill="#fff" />
          <text x="610" y="285" textAnchor="middle" className="sl-cap">HARVEST</text>
        </g>

        {/* 05 washing */}
        <g className="sl-station">
          <rect x="732" y="132" width="86" height="96" rx="12" fill="#fff" stroke={C.line} strokeWidth="2" />
          <circle cx="775" cy="180" r="38" fill="#e6f5fd" stroke={C.line} strokeWidth="2" />
          <g clipPath="url(#sl-drum-clip)">
            <g id="sl-drum">
              {[0, 60, 120].map((a) => (
                <line key={a} x1="737" y1="180" x2="813" y2="180" stroke={C.water} strokeWidth="3" transform={`rotate(${a} 775 180)`} />
              ))}
            </g>
          </g>
          <circle cx="775" cy="180" r="8" fill={C.brand} />
          {[755, 775, 795].map((x) => (
            <path key={x} className="sl-drop" d={`M${x} 118 q4 6 0 9 q-4 -3 0 -9z`} fill={C.water} />
          ))}
          <rect x="752" y="228" width="46" height="20" fill={C.steel} stroke={C.line} strokeWidth="2" />
          <text x="775" y="285" textAnchor="middle" className="sl-cap">WASHERY</text>
        </g>

        {/* 06 drying & iodizing */}
        <g className="sl-station">
          <rect x="868" y="168" width="148" height="68" rx="12" fill="url(#sl-tunnel)" stroke={C.heat} strokeWidth="2" strokeDasharray="6 4" />
          {[884, 906, 928, 950, 972, 994].map((x) => (
            <rect key={x} className="sl-heat" x={x} y="178" width="14" height="6" rx="3" fill={C.heat} />
          ))}
          <text x="942" y="214" textAnchor="middle" className="sl-label sl-heat-label">HEAT ZONE</text>
          {[900, 940, 980].map((x) => (
            <path key={x} className="sl-haze" d={`M${x} 160 q-5 -7 0 -14 t0 -14`} stroke={C.heat} strokeOpacity="0.5" strokeWidth="2.5" fill="none" />
          ))}
          <rect x="920" y="104" width="24" height="56" rx="4" fill="#fff" stroke={C.line} strokeWidth="2" />
          <text x="932" y="98" textAnchor="middle" className="sl-label">KIO₃</text>
          <text x="942" y="285" textAnchor="middle" className="sl-cap">DRYER</text>
        </g>

        {/* 07 bagging & truck */}
        <g className="sl-station">
          {[1040, 1066, 1092].map((x, i) => (
            <g key={x} className="sl-bag">
              <path d={`M${x} 248 v-26 q0 -6 6 -6 h12 q6 0 6 6 v26z`} fill="#fff" stroke={C.line} strokeWidth="2" />
              <text x={x + 12} y="238" textAnchor="middle" className="sl-bag-text">{i === 1 ? "I" : "S"}</text>
            </g>
          ))}
          <g id="sl-truck">
            <rect x="1036" y="128" width="92" height="56" rx="6" fill="#fff" stroke={C.brand} strokeWidth="2" />
            <text x="1082" y="161" textAnchor="middle" className="sl-label" fill={C.brand}>BHARAT SALT</text>
            <path d="M1128 146 h26 l16 20 v18 h-42z" fill={C.teal} stroke={C.line} strokeWidth="2" />
            <rect x="1136" y="152" width="16" height="12" rx="2" fill="#e6f8fb" />
            {[1058, 1146].map((cx) => (
              <g key={cx} className="sl-wheel">
                <circle cx={cx} cy="190" r="10" fill="#fff" stroke={C.line} strokeWidth="2.5" />
                <path d={`M${cx - 6} 190h12M${cx} 184v12`} stroke={C.line} strokeWidth="2" />
              </g>
            ))}
          </g>
          <text x="1100" y="285" textAnchor="middle" className="sl-cap">DISPATCH</text>
        </g>
      </svg>

      <div className="stage-cards">
        {stages.map((s, i) => (
          <button key={s.key} type="button" className={`stage-card tone-${s.tone} reveal`} onClick={() => onStage?.(i)}>
            <span className="stage-icon"><Icon name={s.icon} size={18} /></span>
            <span className="stage-body">
              <span className="stage-title"><b>{String(i + 1).padStart(2, "0")}</b> {s.title}</span>
              <span className="stage-value">
                <strong><AnimatedNumber value={s.value} format={s.format} /></strong> {s.unit}
              </span>
              <span className="stage-meter"><span data-grow style={{ width: `${Math.min(100, Math.max(3, s.progress ?? 0))}%` }} /></span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
