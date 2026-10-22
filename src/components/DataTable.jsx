import { useMemo, useState } from "react";
import Icon from "./Icons";

const PAGE = 12;

export default function DataTable({ rows, columns, initialSort, onRowClick }) {
  const [q, setQ] = useState("");
  const [sort, setSort] = useState(initialSort || { key: columns[0].key, dir: -1 });
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let out = needle
      ? rows.filter((r) => columns.some((c) => String(c.text ? c.text(r) : r[c.key] ?? "").toLowerCase().includes(needle)))
      : rows;
    const col = columns.find((c) => c.key === sort.key);
    const get = col?.sortValue || ((r) => r[sort.key]);
    out = [...out].sort((a, b) => {
      const x = get(a), y = get(b);
      if (x == null || x === "") return 1;
      if (y == null || y === "") return -1;
      return (x > y ? 1 : x < y ? -1 : 0) * sort.dir;
    });
    return out;
  }, [rows, columns, q, sort]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE));
  const cur = Math.min(page, pages - 1);
  const slice = filtered.slice(cur * PAGE, cur * PAGE + PAGE);

  const toggle = (key) => setSort((s) => ({ key, dir: s.key === key ? -s.dir : -1 }));

  return (
    <div className="dt">
      <div className="dt-bar">
        <label className="search">
          <Icon name="search" size={16} />
          <input value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} placeholder="Search records…" />
        </label>
        <span className="dt-count">{filtered.length} of {rows.length} records</span>
      </div>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c.key} className={c.num ? "num" : ""}>
                  <button type="button" className={`th-btn ${sort.key === c.key ? "is-sorted" : ""}`} onClick={() => toggle(c.key)}>
                    {c.label}
                    {sort.key === c.key && <Icon name={sort.dir > 0 ? "arrowUp" : "arrowDown"} size={12} stroke={2.4} />}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {slice.length === 0 && (
              <tr><td colSpan={columns.length} className="empty">No records match</td></tr>
            )}
            {slice.map((r, i) => (
              <tr key={r.id || i} className={onRowClick ? "is-clickable" : ""} onClick={onRowClick ? () => onRowClick(r) : undefined}>
                {columns.map((c) => (
                  <td key={c.key} className={`${c.num ? "num" : ""} ${c.mono ? "mono" : ""}`}>
                    {c.render ? c.render(r) : (r[c.key] ?? "—") || "—"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pages > 1 && (
        <div className="dt-pager">
          <button type="button" disabled={cur === 0} onClick={() => setPage(cur - 1)}>Prev</button>
          <span>Page {cur + 1} / {pages}</span>
          <button type="button" disabled={cur >= pages - 1} onClick={() => setPage(cur + 1)}>Next</button>
        </div>
      )}
    </div>
  );
}
