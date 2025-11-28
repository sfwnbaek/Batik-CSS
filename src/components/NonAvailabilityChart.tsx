// src/components/NonAvailabilityChart.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from "recharts";

const API_BASE = "http://localhost/batik-api/api"; // adjust if needed

const CODES = [
  "GRND",
  "LWP",
  "U/A",
  "NDOC",
  "LMC",
  "RFLT",
  "NCSL",
  "CSL",
  "SL",
  "EL",
  "HSO",
  "MIA",
  "OFL",
  "AWOL",
  "COMP",
  "INQ",
] as const;

const CODE_COLORS: Record<string, string> = {
  GRND: "#2563eb",
  LWP: "#9333ea",
  "U/A": "#0ea5a4",
  NDOC: "#ef4444",
  LMC: "#f97316",
  RFLT: "#06b6d4",
  NCSL: "#7c3aed",
  CSL: "#10b981",
  SL: "#ef9a9a",
  EL: "#f59e0b",
  HSO: "#ef4444",
  MIA: "#64748b",
  OFL: "#3b82f6",
  AWOL: "#ef4444",
  COMP: "#8b5cf6",
  INQ: "#6b7280",
};

const POSITIONS = ["ALL", "CPT", "FO", "CC", "ICC"] as const;

type SummaryRow = {
  crew_id: string;
  name: string;
  pos: string;
  [k: string]: any; // codes as numeric counts
};

type CrewEvent = {
  id: number;
  crew_id: string;
  name: string;
  pos: string;
  code: string;
  event_date: string;
};

type CrewDetail = {
  crew_id: string;
  name: string;
  pos: string;
  count: number;
  dates: string[];
};

export default function NonAvailabilityChart(): JSX.Element {
  const [rows, setRows] = useState<SummaryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [posFilter, setPosFilter] =
    useState<(typeof POSITIONS)[number]>("ALL");

  // date filter
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");

  // modal state
  const [activeCode, setActiveCode] = useState<string | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [crewDetails, setCrewDetails] = useState<CrewDetail[]>([]);

  useEffect(() => {
    fetchSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to]);

  async function fetchSummary() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (from) params.set("from", from);
      if (to) params.set("to", to);

      const res = await fetch(
        `${API_BASE}/crew_nonavailability_summary.php?${params.toString()}`
      );
      const text = await res.text();
      let data: any;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(`Unexpected response: ${text.substring(0, 300)}`);
      }
      if (!res.ok) {
        if (data.error) throw new Error(data.error);
        throw new Error(`Server responded ${res.status}`);
      }

      const normalized: SummaryRow[] = (data || []).map((r: any) => {
        const out: SummaryRow = {
          crew_id: r.crew_id ?? "",
          name: r.name ?? "",
          pos: (r.pos ?? "").toUpperCase(),
        };
        for (const c of CODES) {
          const val =
            r[c] ?? r[c.replace("/", "")] ?? r[c.replace("/", "_")] ?? 0;
          out[c] = Number(val || 0);
        }
        return out;
      });
      setRows(normalized);
    } catch (err: any) {
      console.error("fetchSummary err:", err);
      setRows([]);
      setError("Failed to load summary: " + (err.message || String(err)));
    } finally {
      setLoading(false);
    }
  }

  // aggregated totals by code for the current pos filter
  const aggregated = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const c of CODES) totals[c] = 0;
    for (const r of rows) {
      if (posFilter !== "ALL" && (r.pos ?? "").toUpperCase() !== posFilter)
        continue;
      for (const c of CODES) {
        const v = Number(r[c] ?? 0);
        totals[c] += isNaN(v) ? 0 : v;
      }
    }
    const data = CODES.map((c) => ({
      name: c,
      value: totals[c],
    })).filter((d) => d.value > 0);
    data.sort((a, b) => b.value - a.value);
    return { totals, data };
  }, [rows, posFilter]);

  const totalCount = aggregated.data.reduce((s, d) => s + d.value, 0);

  // -------- MODAL LOGIC (fetch dates per crew for selected code) --------
  async function openModalForCode(code: string) {
    setActiveCode(code);
    setModalLoading(true);
    setCrewDetails([]);

    try {
      // Which crews have this code (respect pos filter)
      const relevantCrews = rows.filter((r) => {
        if (posFilter !== "ALL" && (r.pos ?? "").toUpperCase() !== posFilter)
          return false;
        return Number(r[code] ?? 0) > 0;
      });

      const details: CrewDetail[] = [];

      for (const r of relevantCrews) {
        const params = new URLSearchParams();
        params.set("crew_id", r.crew_id);
        if (from) params.set("from", from);
        if (to) params.set("to", to);

        try {
          const res = await fetch(
            `${API_BASE}/crew_nonavailability_events.php?${params.toString()}`
          );
          const text = await res.text();
          let data: any;
          try {
            data = JSON.parse(text);
          } catch {
            console.error("events parse fail:", text.substring(0, 200));
            continue;
          }
          if (!Array.isArray(data)) continue;

          const events: CrewEvent[] = data;
          const datesForCode = events
            .filter((ev) => (ev.code ?? "").toUpperCase() === code.toUpperCase())
            .map((ev) => ev.event_date)
            .sort();

          if (datesForCode.length) {
            details.push({
              crew_id: r.crew_id,
              name: r.name,
              pos: r.pos,
              count: datesForCode.length,
              dates: datesForCode,
            });
          }
        } catch (e) {
          console.error("events fetch error for", r.crew_id, e);
        }
      }

      details.sort(
        (a, b) => b.count - a.count || a.name.localeCompare(b.name)
      );
      setCrewDetails(details);
    } finally {
      setModalLoading(false);
    }
  }

  function closeModal() {
    setActiveCode(null);
    setCrewDetails([]);
  }

  function onSliceClick(entry: any) {
    if (!entry || !entry.name) return;
    openModalForCode(entry.name);
  }

  function onLegendClick(code: string) {
    openModalForCode(code);
  }

  // --------- RENDER ---------
  if (loading) {
    return (
      <div
        style={{
          padding: 12,
          background: "rgba(15,23,42,0.85)",
          borderRadius: 12,
        }}
      >
        <div style={{ fontWeight: 700, marginBottom: 8 }}>
          Non-Availability (by code)
        </div>
        <div>Loading…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          padding: 12,
          background: "rgba(15,23,42,0.85)",
          borderRadius: 12,
        }}
      >
        <div style={{ fontWeight: 700, marginBottom: 8 }}>
          Non-Availability (by code)
        </div>
        <div style={{ color: "salmon" }}>{error}</div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        .na-glass-card {
          background: radial-gradient(circle at top left, rgba(56,189,248,0.12), transparent 55%),
                      radial-gradient(circle at bottom right, rgba(129,140,248,0.1), transparent 55%),
                      rgba(15,23,42,0.94);
          border-radius: 12px;
          border: 1px solid rgba(148,163,184,0.18);
          box-shadow: 0 18px 45px rgba(15,23,42,0.75);
        }
        .na-chip {
          padding: 4px 8px;
          border-radius: 999px;
          font-size: 11px;
          border: 1px solid rgba(148,163,184,0.35);
          background: rgba(15,23,42,0.9);
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }
        .na-chip-dot {
          width: 8px;
          height: 8px;
          border-radius: 999px;
        }
        .na-glass-btn {
          border-radius: 999px;
          border: 1px solid rgba(148,163,184,0.5);
          background: linear-gradient(135deg, rgba(15,23,42,0.95), rgba(15,23,42,0.85));
          color: #e5f0ff;
          padding: 6px 12px;
          font-size: 13px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .na-glass-btn:hover {
          border-color: rgba(96,165,250,0.8);
          box-shadow: 0 8px 24px rgba(15,23,42,0.8);
        }
        .na-glass-btn.ghost {
          background: transparent;
          border-color: rgba(148,163,184,0.35);
          color: #cbd5f5;
        }

        .na-modal-backdrop {
          position: fixed;
          inset: 0;
          background: radial-gradient(circle at top, rgba(15,23,42,0.85), rgba(15,23,42,0.96));
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1400;
        }
        .na-modal-inner {
          width: 860px;
          max-width: 95%;
          max-height: 80vh;
          border-radius: 18px;
          overflow: hidden;
          background: radial-gradient(circle at top left, rgba(56,189,248,0.16), transparent 55%),
                      radial-gradient(circle at bottom right, rgba(129,140,248,0.15), transparent 55%),
                      #020617;
          border: 1px solid rgba(148,163,184,0.35);
          box-shadow: 0 30px 80px rgba(15,23,42,0.9);
          display: flex;
          flex-direction: column;
        }
        .na-modal-header {
          padding: 14px 16px 10px;
          border-bottom: 1px solid rgba(15,23,42,0.9);
          background: linear-gradient(90deg, rgba(15,23,42,1), rgba(15,23,42,0.9));
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .na-modal-title {
          font-size: 15px;
          font-weight: 700;
        }
        .na-modal-body {
          padding: 10px 16px 14px;
          overflow: auto;
        }
        .na-modal-sub {
          font-size: 12px;
          color: #9ca3af;
        }
        .na-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
        }
        .na-table thead th {
          position: sticky;
          top: 0;
          background: rgba(15,23,42,0.98);
          padding: 8px;
          text-align: left;
          border-bottom: 1px solid rgba(30,64,175,0.8);
          z-index: 2;
        }
        .na-table tbody td {
          padding: 8px;
          border-bottom: 1px solid rgba(15,23,42,0.9);
        }
        .na-tag {
          padding: 3px 7px;
          border-radius: 999px;
          font-size: 11px;
          border: 1px solid rgba(148,163,184,0.5);
        }
        .na-date-pill {
          display: inline-flex;
          align-items: center;
          padding: 2px 6px;
          border-radius: 999px;
          font-size: 11px;
          background: rgba(15,23,42,0.9);
          border: 1px solid rgba(31,41,55,0.9);
          margin: 1px;
        }
      `}</style>

      <div className="na-glass-card" style={{ padding: 12 }}>
        {/* Header + filters */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 10,
          }}
        >
          <div>
            <div style={{ fontWeight: 700 }}>Crew Non-Availability</div>
            <div style={{ fontSize: 12, color: "#9ca3af" }}>
              Distribution by code, filterable by position & date range
            </div>
          </div>

          {/* Date range filter */}
          <div
            style={{
              marginLeft: "auto",
              display: "flex",
              gap: 8,
              alignItems: "center",
            }}
          >
            <span style={{ fontSize: 12 }}>From</span>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              style={{ padding: 4, fontSize: 12 }}
            />
            <span style={{ fontSize: 12 }}>To</span>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              style={{ padding: 4, fontSize: 12 }}
            />
            <button
              className="na-glass-btn ghost"
              type="button"
              onClick={() => {
                setFrom("");
                setTo("");
              }}
            >
              Clear
            </button>
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ fontSize: 12, color: "#9ca3af" }}>Position</span>
            <select
              value={posFilter}
              onChange={(e) => setPosFilter(e.target.value as any)}
              style={{ padding: 4, fontSize: 12 }}
            >
              {POSITIONS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Chart + legend panel */}
        <div
          style={{
            display: "flex",
            gap: 12,
            alignItems: "center",
            minHeight: 260,
          }}
        >
          <div style={{ flex: "0 0 420px", height: 300 }}>
            {aggregated.data.length === 0 ? (
              <div style={{ padding: 12, color: "#9ca3af" }}>
                No non-availability events for selected filters.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={aggregated.data}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={95}
                    innerRadius={45}
                    label={(entry) =>
                      `${entry.name} (${Math.round(
                        (entry.value / totalCount) * 100
                      )}%)`
                    }
                    onClick={(entry) => onSliceClick(entry)}
                  >
                    {aggregated.data.map((entry, idx) => {
                      const color =
                        CODE_COLORS[entry.name] ??
                        ["#8884d8", "#82ca9d", "#ffc658"][idx % 3];
                      return (
                        <Cell
                          key={`cell-${idx}`}
                          fill={color}
                          style={{ cursor: "pointer" }}
                        />
                      );
                    })}
                  </Pie>
                  <Tooltip formatter={(v: any) => [v, "count"]} />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Legend / summary */}
          <div style={{ flex: 1, minWidth: 220 }}>
            <div
              style={{
                fontSize: 13,
                color: "#9ca3af",
                marginBottom: 6,
                display: "flex",
                justifyContent: "space-between",
              }}
            >
              <div>
                Total events: <strong>{totalCount}</strong>
                {posFilter !== "ALL" && (
                  <span style={{ marginLeft: 8 }}>
                    Pos: <strong>{posFilter}</strong>
                  </span>
                )}
              </div>
              <div>
                <span style={{ fontSize: 11 }}>
                  Click a row or slice to view crew details
                </span>
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 6,
              }}
            >
              {aggregated.data.map((d) => (
                <button
                  key={d.name}
                  type="button"
                  onClick={() => onLegendClick(d.name)}
                  className="na-glass-btn"
                  style={{
                    justifyContent: "flex-start",
                    borderRadius: 10,
                    background: "rgba(15,23,42,0.8)",
                  }}
                >
                  <span
                    className="na-chip-dot"
                    style={{
                      background:
                        CODE_COLORS[d.name] ??
                        "linear-gradient(135deg,#38bdf8,#6366f1)",
                    }}
                  />
                  <span style={{ fontWeight: 700 }}>{d.name}</span>
                  <span
                    style={{
                      marginLeft: "auto",
                      fontVariantNumeric: "tabular-nums",
                      opacity: 0.8,
                    }}
                  >
                    {d.value}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Better modal UI */}
      {activeCode && (
        <div className="na-modal-backdrop" onClick={closeModal}>
          <div className="na-modal-inner" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="na-modal-header">
              <div>
                <div className="na-modal-title">
                  Non-Availability — {activeCode}
                </div>
                <div className="na-modal-sub">
                  {posFilter !== "ALL" ? (
                    <>
                      Position: <strong>{posFilter}</strong>
                    </>
                  ) : (
                    "All positions"
                  )}
                  {from || to ? (
                    <>
                      {" "}
                      · Range:{" "}
                      <strong>
                        {from || "…"} → {to || "…"}
                      </strong>
                    </>
                  ) : (
                    <> · Full range</>
                  )}
                </div>
              </div>

              <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                <button
                  className="na-glass-btn ghost"
                  type="button"
                  onClick={closeModal}
                >
                  Close
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="na-modal-body">
              {modalLoading ? (
                <div style={{ padding: 10 }}>Loading crew details…</div>
              ) : crewDetails.length === 0 ? (
                <div style={{ padding: 10 }}>
                  No crew found with {activeCode} in this filter range.
                </div>
              ) : (
                <>
                  <div
                    style={{
                      marginBottom: 6,
                      fontSize: 12,
                      color: "#9ca3af",
                    }}
                  >
                    {crewDetails.length} crew · click dates to copy if needed.
                  </div>
                  <table className="na-table">
                    <thead>
                      <tr>
                        <th>Crew ID</th>
                        <th>Name</th>
                        <th>Pos</th>
                        <th style={{ textAlign: "right" }}>Count</th>
                        <th>Dates</th>
                      </tr>
                    </thead>
                    <tbody>
                      {crewDetails.map((c) => (
                        <tr key={c.crew_id}>
                          <td>{c.crew_id}</td>
                          <td>{c.name}</td>
                          <td>
                            <span className="na-tag">{c.pos}</span>
                          </td>
                          <td
                            style={{
                              textAlign: "right",
                              fontVariantNumeric: "tabular-nums",
                            }}
                          >
                            {c.count}
                          </td>
                          <td>
                            {c.dates.map((d, idx) => (
                              <span key={idx} className="na-date-pill">
                                {d}
                              </span>
                            ))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
