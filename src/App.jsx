import { useCallback, useEffect, useRef, useState } from "react";
import "./App.css";
import { loadDashboardData } from "./zohoapi";
import { Header } from "./components/Shell";
import { SECTIONS } from "./lib/sections";
import Dashboard from "./views/Dashboard";
import BootLoader from "./components/BootLoader";
import { usePersistentState } from "./lib/prefs";

const EMPTY = { processOrders: [], dailyProduction: [], bom: [], productionReceipt: [], crystallizers: [], plants: [] };
const REFRESH_MS = 5 * 60 * 1000;

export default function App() {
  const [data, setData] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [live, setLive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [fatal, setFatal] = useState(null);
  const [lastSync, setLastSync] = useState(null);
  const [range, setRange] = useState("month");
  const [active, setActive] = useState("top");
  const [booted, setBooted] = useState(false);
  const [bootStatus, setBootStatus] = useState({});
  const [railOpen, setRailOpen] = usePersistentState("rail-open", true);
  const scroller = useRef(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await loadDashboardData((key, st) => setBootStatus((s) => ({ ...s, [key]: st })));
      setData(res.data);
      setErrors(res.errors);
      setLive(res.live);
      setLastSync(new Date());
      setFatal(null);
    } catch (err) {
      console.error(err);
      setFatal(err?.message || "Unable to reach Zoho Creator");
      setBootStatus((s) => Object.fromEntries(SECTIONS.map((x) => [x.key, s[x.key] || "error"])));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const first = setTimeout(refresh, 0);
    const t = setInterval(refresh, REFRESH_MS);
    return () => {
      clearTimeout(first);
      clearInterval(t);
    };
  }, [refresh]);

  // Highlight the section chip that's currently in view.
  useEffect(() => {
    if (!booted || !scroller.current) return;
    const ids = ["top", ...SECTIONS.map((s) => s.key)];
    const io = new IntersectionObserver(
      (entries) => {
        const hit = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (hit) setActive(hit.target.id.replace("sec-", ""));
      },
      { root: scroller.current, rootMargin: "-140px 0px -55% 0px" },
    );
    ids.forEach((id) => {
      const el = document.getElementById(`sec-${id}`);
      if (el) io.observe(el);
    });
    return () => io.disconnect();
  }, [booted]);

  const jump = (key) => {
    const el = document.getElementById(`sec-${key}`);
    if (!el || !scroller.current) return;
    const header = scroller.current.querySelector(".header")?.offsetHeight || 0;
    const top = el.getBoundingClientRect().top - scroller.current.getBoundingClientRect().top + scroller.current.scrollTop;
    scroller.current.scrollTo({ top: top - header - 12, behavior: "smooth" });
  };

  if (!booted) return <BootLoader status={bootStatus} ready={!loading} onDone={() => setBooted(true)} />;

  return (
    <div className="app" ref={scroller}>
      <Header range={range} setRange={setRange} loading={loading} live={live} lastSync={lastSync} onRefresh={refresh} active={active} onJump={jump} railOpen={railOpen} onToggleRail={() => setRailOpen((o) => !o)} />
      <main className="content">
        {fatal && <div className="banner banner-bad">{fatal}</div>}
        <Dashboard data={data} errors={errors} range={range} onJump={jump} railOpen={railOpen} onCloseRail={() => setRailOpen(false)} />
      </main>
    </div>
  );
}

