// Summary330.tsx (no Tailwind - uses summary-glass.css)
import React, { useEffect, useMemo, useState } from "react";
import "./summary-glass.css";

const API_BASE =
  (typeof process !== "undefined" && (process as any).env?.REACT_APP_API_BASE) ||
  (typeof (import.meta as any) !== "undefined" && (import.meta as any).env?.VITE_API_BASE) ||
  "http://localhost/batik-api/api";

type Bracket = { bracket: string; cp: number; fo: number; icc: number; cc: number };
type TotalsRow = {
  total_bh_seconds: number;
  total_sectors: number;
  total_off: number;
  total_lve: number;
  total_na: number;
  total_trg: number;
  crew_count: number;
};
type AveragesRow = {
  bh_per_crew_seconds: number;
  sectors_per_crew: number;
  off_per_crew: number;
  lve_per_crew: number;
  na_per_crew: number;
  trg_per_crew: number;
};
type SummaryShape = {
  brackets?: Bracket[];
  totals?: Record<string, TotalsRow>;
  averages?: Record<string, AveragesRow>;
};

function secsToHHMMSS(s?: number) {
  if (!s || s <= 0) return "0:00";
  const hh = Math.floor(s / 3600);
  const mm = Math.floor((s % 3600) / 60).toString().padStart(2, "0");
  const ss = Math.floor(s % 60).toString().padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

function Sparkline({ values = [] }: { values?: number[] }) {
  const max = Math.max(...values, 1);
  const points = values
    .map((v, i) => {
      const x = (i / Math.max(values.length - 1, 1)) * 100;
      const y = 100 - (v / max) * 100;
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      width="100%"
      height="36"
      aria-hidden
    >
      <defs>
        <linearGradient id="g330" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#7dd3fc" />
          <stop offset="1" stopColor="#a78bfa" />
        </linearGradient>
      </defs>
      <polyline
        points={points}
        fill="none"
        stroke="url(#g330)"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function NeonBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="sg-bar-wrap" aria-hidden>
      <div className="sg-bar" style={{ width: `${pct}%` }} />
    </div>
  );
}

export default function Summary330({ month }: { month?: string }) {
  const [summary, setSummary] = useState<SummaryShape | null>(null);
  const [loading, setLoading] = useState(false);

  // ---- NEW: month filter state ----
  const [monthFilter, setMonthFilter] = useState<string>(() => {
    if (month) return month;
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    return `${yyyy}-${mm}`; // YYYY-MM
  });

  // If parent passes a different month prop later, sync it
  useEffect(() => {
    if (month) setMonthFilter(month);
  }, [month]);

  useEffect(() => {
    let mounted = true;

    async function fetchSummary() {
      setLoading(true);
      const q = monthFilter ? `?month=${encodeURIComponent(monthFilter)}` : "";
      try {
        const res = await fetch(`${API_BASE}/330_summary.php${q}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (mounted) setSummary(data);
      } catch (err) {
        console.error("330 summary fetch error", err);
        if (mounted) setSummary(null);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    fetchSummary();
    return () => {
      mounted = false;
    };
  }, [monthFilter]);

  const positions = ["CP", "FO", "ICC", "CC"];

  const maxTotals = useMemo(() => {
    if (!summary?.totals) return { bh: 0, sectors: 0, crew: 0 };
    let maxBh = 0,
      maxS = 0,
      maxC = 0;
    for (const p of positions) {
      const t = (summary.totals as any)?.[p] as TotalsRow | undefined;
      if (!t) continue;
      if (t.total_bh_seconds > maxBh) maxBh = t.total_bh_seconds;
      if (t.total_sectors > maxS) maxS = t.total_sectors;
      if (t.crew_count > maxC) maxC = t.crew_count;
    }
    return { bh: maxBh, sectors: maxS, crew: maxC };
  }, [summary]);

  return (
    <div className="sg-root">
      {/* HEADER + FILTER BAR */}
      <div
        className="sg-header"
        style={{
          marginBottom: 12,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          gap: 12,
        }}
      >
        <div>
          <h1 style={{ marginBottom: 4 }}>Planned Roster — Flight 330 Crew</h1>
          <p style={{ margin: 0 }}>
            Monthly flight hour distribution, totals and averages
          </p>
        </div>

        {/* Month filter */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 12,
          }}
        >
          <span style={{ opacity: 0.9 }}>Month</span>
          <input
            type="month"
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
            style={{
              background: "rgba(15,23,42,0.9)",
              border: "1px solid rgba(148,163,184,0.5)",
              borderRadius: 8,
              padding: "4px 8px",
              color: "#e5edf7",
              fontSize: 12,
              outline: "none",
            }}
          />
          <button
            type="button"
            onClick={() => {
              const d = new Date();
              const yyyy = d.getFullYear();
              const mm = String(d.getMonth() + 1).padStart(2, "0");
              setMonthFilter(`${yyyy}-${mm}`);
            }}
            style={{
              borderRadius: 8,
              padding: "4px 8px",
              border: "1px solid rgba(148,163,184,0.5)",
              background:
                "linear-gradient(180deg, rgba(148,163,184,0.16), rgba(15,23,42,0.92))",
              color: "#e6eef3",
              cursor: "pointer",
              fontSize: 12,
            }}
          >
            This month
          </button>
        </div>
      </div>

      <div className="sg-grid">
        {/* Bracket card */}
        <div className="sg-card" style={{ minHeight: 180 }}>
          <div className="sg-strip">
            <div>Crew Planned Hours Bracket</div>
            <div style={{ fontSize: 12, opacity: 0.9 }}>Live</div>
          </div>

          <div style={{ marginTop: 12 }}>
            <div className="sg-sub">Breakdown by bracket &amp; position</div>

            {loading ? (
              <div className="sg-skeleton" style={{ marginTop: 12 }} />
            ) : summary?.brackets?.length ? (
              <div style={{ marginTop: 10, maxHeight: 220, overflow: "auto" }}>
                <table className="sg-table">
                  <thead>
                    <tr>
                      <th>BH</th>
                      <th style={{ textAlign: "center" }}>CP</th>
                      <th style={{ textAlign: "center" }}>FO</th>
                      <th style={{ textAlign: "center" }}>ICC</th>
                      <th style={{ textAlign: "center" }}>CC</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.brackets!.map((b) => (
                      <tr key={b.bracket}>
                        <td className="sg-pos">{b.bracket}</td>
                        <td style={{ textAlign: "center" }}>{b.cp}</td>
                        <td style={{ textAlign: "center" }}>{b.fo}</td>
                        <td style={{ textAlign: "center" }}>{b.icc}</td>
                        <td style={{ textAlign: "center" }}>{b.cc}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="sg-small" style={{ marginTop: 12 }}>
                No bracket data
              </div>
            )}
          </div>
        </div>

        {/* Totals card */}
        <div className="sg-card" style={{ minHeight: 180 }}>
          <div className="sg-strip">
            <div>Crew Totals</div>
            <div style={{ fontSize: 12, opacity: 0.9 }}>Summary</div>
          </div>

          <div style={{ marginTop: 12 }}>
            <div className="sg-sub">Total BH, sectors and counts</div>

            {loading || !summary ? (
              <div className="sg-skeleton" style={{ marginTop: 12 }} />
            ) : (
              <>
                <div style={{ marginTop: 10 }}>
                  {positions.map((p) => {
                    const t = (summary.totals as any)?.[p] as
                      | TotalsRow
                      | undefined;
                    const bh = t?.total_bh_seconds || 0;
                    return (
                      <div
                        key={p}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "80px 1fr 90px",
                          gap: 10,
                          alignItems: "center",
                          marginBottom: 8,
                        }}
                      >
                        <div className="sg-pos">{p}</div>
                        <div>
                          <NeonBar value={bh} max={maxTotals.bh} />
                        </div>
                        <div
                          style={{ textAlign: "right" }}
                          className="sg-mono"
                        >
                          {secsToHHMMSS(bh)}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="sg-totals" style={{ marginTop: 8 }}>
                  <div>
                    <div className="sg-small">Sectors</div>
                    <div>
                      {positions.reduce(
                        (acc, p) =>
                          acc +
                          ((summary.totals as any)?.[p]?.total_sectors || 0),
                        0
                      )}
                    </div>
                  </div>
                  <div>
                    <div className="sg-small">Off</div>
                    <div>
                      {positions.reduce(
                        (acc, p) =>
                          acc + ((summary.totals as any)?.[p]?.total_off || 0),
                        0
                      )}
                    </div>
                  </div>
                  <div>
                    <div className="sg-small">Crew</div>
                    <div>
                      {positions.reduce(
                        (acc, p) =>
                          acc +
                          ((summary.totals as any)?.[p]?.crew_count || 0),
                        0
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Averages card */}
        <div className="sg-card" style={{ minHeight: 180 }}>
          <div className="sg-strip">
            <div>Average per Crew</div>
            <div style={{ fontSize: 12, opacity: 0.9 }}>Per position</div>
          </div>

          <div style={{ marginTop: 12 }}>
            <div className="sg-sub">Average BH &amp; counts per position</div>

            {loading || !summary ? (
              <div className="sg-skeleton" style={{ marginTop: 12 }} />
            ) : (
              <>
                <div style={{ marginTop: 10, overflow: "auto" }}>
                  <table className="sg-table">
                    <thead>
                      <tr>
                        <th>Pos</th>
                        <th>BH</th>
                        <th style={{ textAlign: "center" }}>S</th>
                        <th style={{ textAlign: "center" }}>OFF</th>
                        <th style={{ textAlign: "center" }}>LVE</th>
                        <th style={{ textAlign: "center" }}>N/A</th>
                        <th style={{ textAlign: "center" }}>TRG</th>
                      </tr>
                    </thead>
                    <tbody>
                      {positions.map((p) => {
                        const a = (summary.averages as any)?.[p] as
                          | AveragesRow
                          | undefined;
                        const bh = a?.bh_per_crew_seconds || 0;
                        return (
                          <tr key={p}>
                            <td className="sg-pos">{p}</td>
                            <td className="sg-mono">{secsToHHMMSS(bh)}</td>
                            <td style={{ textAlign: "center" }}>
                              {a?.sectors_per_crew ?? 0}
                            </td>
                            <td style={{ textAlign: "center" }}>
                              {a?.off_per_crew ?? 0}
                            </td>
                            <td style={{ textAlign: "center" }}>
                              {a?.lve_per_crew ?? 0}
                            </td>
                            <td style={{ textAlign: "center" }}>
                              {a?.na_per_crew ?? 0}
                            </td>
                            <td style={{ textAlign: "center" }}>
                              {a?.trg_per_crew ?? 0}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div style={{ marginTop: 12 }}>
                  <div
                    style={{
                      fontSize: 12,
                      color: "#a8c7da",
                      marginBottom: 6,
                    }}
                  >
                    Overview
                  </div>
                  <div className="sg-spark">
                    <Sparkline values={[2, 3, 2, 4, 3, 5, 4]} />
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
