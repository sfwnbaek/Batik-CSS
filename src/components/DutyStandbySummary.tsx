// src/components/DutyStandbySummary.tsx
import React, { useEffect, useState } from "react";

type RawRow = {
  id?: number;
  rep_date?: string;
  rep_datetime?: string;
  mc_code?: string;
  sby_code?: string;
  crew_pos?: string;
  crew_id?: string;
  name?: string;
  eqt?: string;
  dutyno?: string | null;
};

const API_BASE = "http://localhost/batik-api/api"; // adjust if you pass a prop or env

function isoOffset(offsetDays: number) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function posBadgeColor(pos?: string) {
  if (!pos) return "#6b7280";
  const p = pos.toUpperCase();
  if (p === "CPT" || p === "CP") return "#ef4444"; // red
  if (p === "CC") return "#2563eb"; // blue
  if (p === "FO") return "#059669"; // green
  if (p === "ICC") return "#f97316"; // orange
  if (p === "FA") return "#8b5cf6"; // purple
  if (p === "SFA") return "#64748b"; // slate
  return "#4b5563";
}

function formatDateIso(d?: string) {
  if (!d) return "";
  if (/^\d{4}-\d{2}-\d{2}/.test(d)) return d.split("T")[0];
  const m = d.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if (m) {
    const [_, dd, mm, yy] = m;
    const y = yy.length === 2 ? "20" + yy : yy;
    return `${y}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
  }
  return d;
}

export default function DutyStandbySummary({ apiBase }: { apiBase?: string }) {
  const base = apiBase || API_BASE;
  const dates = [
    { key: "yesterday", label: "Yesterday", date: isoOffset(-1) },
    { key: "today", label: "Today", date: isoOffset(0) },
    { key: "tomorrow", label: "Tomorrow", date: isoOffset(1) },
  ] as const;

  const [data, setData] = useState<Record<string, RawRow[]>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<Record<string, string | null>>({});

  async function fetchFor(dateStr: string, key: string) {
    setLoading((s) => ({ ...s, [key]: true }));
    setError((s) => ({ ...s, [key]: null }));
    try {
      const params = new URLSearchParams();
      params.set("date", dateStr);
      const res = await fetch(`${base}/duty_standby.php?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const rows = await res.json();
      if (!Array.isArray(rows)) throw new Error("Unexpected response");
      setData((d) => ({ ...d, [key]: rows }));
    } catch (err: any) {
      console.error("fetch duty standby", err);
      setError((s) => ({ ...s, [key]: err.message || String(err) }));
      setData((d) => ({ ...d, [key]: [] }));
    } finally {
      setLoading((s) => ({ ...s, [key]: false }));
    }
  }

  async function refreshAll() {
    for (const { date, key } of dates) {
      // fire requests in parallel but keep separate states
      fetchFor(date, key);
    }
  }

  useEffect(() => {
    refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // how many per card to show
  const cardLimit = 4;

  return (
    <div style={{ width: "100%" }}>
      <style>{`
        .ds-summary-wrap {
          display: flex;
          flex-direction: column;
          gap: 10px;
          font-size: 13px;
          color: #e6eef3;
        }

        /* HEADER */
        .ds-summary-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
        }
        .ds-title-main {
          margin: 0;
          font-size: 18px;
          font-weight: 700;
        }
        .ds-title-sub {
          margin: 2px 0 0 0;
          font-size: 12px;
          color: #9aa4ad;
        }

        .ds-summary-actions {
          display: flex;
          gap: 8px;
        }

        /* GRID */
        .ds-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
          width: 100%;
        }

        /* section heading under the first row (MC Counts) */
        .ds-section-heading {
          grid-column: 1 / -1;
          margin-top: 14px;
          margin-bottom: 4px;
          font-size: 18px;          /* match ds-title-main */
          font-weight: 700;         /* match ds-title-main */
          color: #e2e8f0;
        }

        /* GLASS CARD */
        .glass-card {
          background: radial-gradient(circle at 0% 0%, rgba(59,130,246,0.10), rgba(15,23,42,0.96));
          border-radius: 12px;
          border: 1px solid rgba(148,163,184,0.24);
          padding: 10px 12px;
          box-shadow: 0 10px 24px rgba(15,23,42,0.8);
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .glass-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 8px;
          padding-bottom: 6px;
          border-bottom: 1px solid rgba(148,163,184,0.25);
        }

        .glass-card-label {
          font-size: 11px;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: #a5b4fc;
          font-weight: 700;
        }

        .glass-card-type {
          font-size: 11px;
          color: #c4d0ff;
          margin-top: 2px;
        }

        .glass-card-date {
          font-size: 12px;
          color: #9aa4ad;
        }

        .glass-card-count-main {
          font-size: 18px;
          font-weight: 800;
          text-align: right;
        }

        .glass-card-count-sub {
          font-size: 11px;
          color: #94a3b8;
          text-align: right;
        }

        /* BUTTON */
        .glass-btn {
          border: 1px solid rgba(148,163,184,0.5);
          background: linear-gradient(180deg, rgba(148,163,184,0.16), rgba(15,23,42,0.92));
          color: #e6eef3;
          padding: 6px 10px;
          border-radius: 9px;
          cursor: pointer;
          font-size: 13px;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          box-shadow: 0 7px 18px rgba(15,23,42,0.7);
          transition: transform 120ms ease, box-shadow 120ms ease, background 120ms ease;
          border-width: 1px;
        }

        .glass-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 10px 26px rgba(15,23,42,0.9);
          background: linear-gradient(180deg, rgba(96,165,250,0.26), rgba(15,23,42,0.98));
        }

        /* LIST ITEMS */
        .mini-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-top: 6px;
        }

        .mini-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }

        .mini-left {
          display: flex;
          gap: 8px;
          align-items: center;
          min-width: 0;
        }

        .mini-crew-id {
          width: 56px;
          text-align: left;
          font-weight: 700;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 13px;
        }

        .mini-name {
          font-weight: 700;
          font-size: 13px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .mini-sub {
          color: #94a3b8;
          font-size: 11px;
          margin-top: 2px;
        }

        .pos-pill {
          padding: 4px 8px;
          border-radius: 999px;
          color: white;
          font-weight: 700;
          font-size: 11px;
        }

        .muted {
          color: #9aa4ad;
          font-size: 12px;
        }

        .mini-right-date {
          font-size: 11px;
          color: #9ca3af;
          margin-top: 4px;
        }

        @media (max-width: 900px) {
          .ds-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div className="ds-summary-wrap">
        {/* Header row */}
        <div className="ds-summary-header">
          <div className="ds-summary-title">
            <h2 className="ds-title-main">Standby</h2>
            <p className="ds-title-sub">Separated view for yesterday, today & tomorrow</p>
          </div>

          <div className="ds-summary-actions">
            <button className="glass-btn" onClick={() => refreshAll()}>
              Refresh
            </button>
            <button
              className="glass-btn"
              onClick={() => {
                window.location.href = "/duty-standby";
              }}
            >
              View All
            </button>
          </div>
        </div>

        {/* 6 glass cards: first row Standby(Y/T/T), second row MC(Y/T/T) */}
        <div className="ds-grid">
          {/* Standby cards */}
          {dates.map(({ key, label, date }) => {
            const rows = data[key] || [];
            const isLoading = !!loading[key];
            const err = error[key];

            const standbyRows = rows.filter((r) => (r.sby_code ?? "").trim() !== "");
            const standbyCount = standbyRows.length;

            return (
              <div key={`standby-${key}`} className="glass-card">
                <div className="glass-card-header">
                  <div>
                    <div className="glass-card-label">{label}</div>
                    <div className="glass-card-type">Standby</div>
                    <div className="glass-card-date">{date}</div>
                  </div>
                  <div>
                    <div className="glass-card-count-main">{standbyCount}</div>
                    <div className="glass-card-count-sub">crew</div>
                  </div>
                </div>

                <div className="mini-list">
                  {isLoading && <div className="muted">Loading…</div>}
                  {err && <div style={{ color: "salmon", fontSize: 12 }}>{err}</div>}
                  {!isLoading && !err && standbyCount === 0 && (
                    <div className="muted">No standby duty.</div>
                  )}

                  {!isLoading &&
                    !err &&
                    standbyRows.slice(0, cardLimit).map((r) => (
                      <div
                        key={r.id ?? `sby-${key}-${r.crew_id}-${r.sby_code}`}
                        className="mini-item"
                      >
                        <div className="mini-left">
                          <div className="mini-crew-id">{r.crew_id ?? "—"}</div>
                          <div style={{ minWidth: 0 }}>
                            <div className="mini-name">{r.name ?? "—"}</div>
                            <div className="mini-sub">
                              {r.sby_code ?? ""}{r.mc_code ? ` • ${r.mc_code}` : ""}
                            </div>
                          </div>
                        </div>

                        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                          <div
                            className="pos-pill"
                            style={{ background: posBadgeColor(r.crew_pos) }}
                          >
                            {r.crew_pos ?? "—"}
                          </div>
                          <div className="mini-right-date">
                            {formatDateIso(r.rep_date ?? r.rep_datetime)}
                          </div>
                        </div>
                      </div>
                    ))}

                  {!isLoading && !err && standbyCount > cardLimit && (
                    <div style={{ marginTop: 4 }}>
                      <button
                        className="glass-btn"
                        onClick={() => {
                          window.location.href = `/duty-standby?date=${encodeURIComponent(
                            date
                          )}`;
                        }}
                        style={{ width: "100%", justifyContent: "center" }}
                      >
                        +{standbyCount - cardLimit} more
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* MC title row – now same style as "Standby" */}
          <h2 className="ds-section-heading">MC Counts</h2>

          {/* MC cards */}
          {dates.map(({ key, label, date }) => {
            const rows = data[key] || [];
            const isLoading = !!loading[key];
            const err = error[key];

            const mcRows = rows.filter((r) => (r.mc_code ?? "").trim() !== "");
            const mcCount = mcRows.length;

            return (
              <div key={`mc-${key}`} className="glass-card">
                <div className="glass-card-header">
                  <div>
                    <div className="glass-card-label">{label}</div>
                    <div className="glass-card-type">MC</div>
                    <div className="glass-card-date">{date}</div>
                  </div>
                  <div>
                    <div className="glass-card-count-main">{mcCount}</div>
                    <div className="glass-card-count-sub">crew</div>
                  </div>
                </div>

                <div className="mini-list">
                  {isLoading && <div className="muted">Loading…</div>}
                  {err && <div style={{ color: "salmon", fontSize: 12 }}>{err}</div>}
                  {!isLoading && !err && mcCount === 0 && (
                    <div className="muted">No MC records.</div>
                  )}

                  {!isLoading &&
                    !err &&
                    mcRows.slice(0, cardLimit).map((r) => (
                      <div
                        key={r.id ?? `mc-${key}-${r.crew_id}-${r.mc_code}`}
                        className="mini-item"
                      >
                        <div className="mini-left">
                          <div className="mini-crew-id">{r.crew_id ?? "—"}</div>
                          <div style={{ minWidth: 0 }}>
                            <div className="mini-name">{r.name ?? "—"}</div>
                            <div className="mini-sub">
                              {r.mc_code ?? ""}{r.sby_code ? ` • ${r.sby_code}` : ""}
                            </div>
                          </div>
                        </div>

                        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                          <div
                            className="pos-pill"
                            style={{ background: posBadgeColor(r.crew_pos) }}
                          >
                            {r.crew_pos ?? "—"}
                          </div>
                          <div className="mini-right-date">
                            {formatDateIso(r.rep_date ?? r.rep_datetime)}
                          </div>
                        </div>
                      </div>
                    ))}

                  {!isLoading && !err && mcCount > cardLimit && (
                    <div style={{ marginTop: 4 }}>
                      <button
                        className="glass-btn"
                        onClick={() => {
                          window.location.href = `/duty-standby?date=${encodeURIComponent(
                            date
                          )}`;
                        }}
                        style={{ width: "100%", justifyContent: "center" }}
                      >
                        +{mcCount - cardLimit} more
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
