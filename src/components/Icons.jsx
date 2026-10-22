// Minimal stroke icon set (24×24, currentColor).
const P = {
  grid: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z",
  orders: "M8 4h8l1 2h3v14H4V6h3zM8 11h8M8 15h5",
  production: "M3 20h18M5 20V10l5 3V10l5 3V6l4 2v12",
  bom: "M12 3l8 4.5v9L12 21l-8-4.5v-9zM12 12l8-4.5M12 12v9M12 12L4 7.5",
  receipt: "M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6M9 16h3",
  crystal: "M12 2l6 6-6 14L6 8zM6 8h12M12 2v20",
  plant: "M3 21V11l5-3v4l5-3v4l5-3v11zM3 21h18M7 17h2M12 17h2M17 17h1",
  refresh: "M20 11a8 8 0 0 0-14.6-4.5L4 8M4 4v4h4M4 13a8 8 0 0 0 14.6 4.5L20 16M20 20v-4h-4",
  search: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4",
  plus: "M12 5v14M5 12h14",
  arrowUp: "M7 14l5-5 5 5",
  arrowDown: "M7 10l5 5 5-5",
  chevron: "M9 6l6 6-6 6",
  alert: "M12 4l9 16H3zM12 10v4M12 17v.5",
  check: "M5 12l4 4 10-10",
  pause: "M9 6v12M15 6v12",
  sun: "M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10zM12 1v3M12 20v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M1 12h3M20 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1",
  drop: "M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11z",
  menu: "M4 7h16M4 12h16M4 17h16",
  clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2",
  truck: "M3 6h11v10H3zM14 10h4l3 3v3h-7M7 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM17 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4z",
  sort: "M8 6l-3 3h6zM8 18l-3-3h6zM14 8h6M14 12h4M14 16h2",
  external: "M14 4h6v6M20 4l-9 9M18 14v6H4V6h6",
  panel: "M4 5h16v14H4zM15 5v14",
  close: "M6 6l12 12M18 6L6 18",
};

export default function Icon({ name, size = 18, stroke = 1.8, className = "" }) {
  return (
    <svg
      className={`icon ${className}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={P[name] || P.grid} />
    </svg>
  );
}
