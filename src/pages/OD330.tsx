// src/pages/OD330.tsx
// Planned Roster UI for Flight 330 (A330)

import React, { useEffect, useMemo, useState } from "react";
import InsertMetricForm from "../components/InsertMetricForm"; // adjust path if needed

const API_BASE = "http://localhost/batik-api/api";

type Metric = {
  id: number;
  crew_id: number;
  name: string;
  base: string;
  ac: string;
  pos: string;
  report_date: string;
  bh_seconds: number;
  bh_text: string;
  bkt: string;
  sectors: number;
  off: number;
  lve: number;
  na_codes: number;
  trg_codes: number;
};

export default function OD330Page(): JSX.Element {
  const [rows, setRows] = useState<Metric[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [reload, setReload] = useState(0);

  // filtering state
  const [posFilter, setPosFilter] = useState<string>("ALL");
  const [crewIdFilter, setCrewIdFilter] = useState<string>("");
  const [nameFilter, setNameFilter] = useState<string>("");

  // month filter (for API)
  const [monthFilter, setMonthFilter] = useState<string>(() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    return `${yyyy}-${mm}`; // default to current month
  });

  // summary
  const [summary, setSummary] = useState<any>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  // edit modal
  const [editing, setEditing] = useState<Metric | null>(null);
  const [editLoading, setEditLoading] = useState(false);

  async function fetchMetrics(month?: string) {
    setLoading(true);
    setError(null);
    try {
      const q = month ? `?month=${encodeURIComponent(month)}` : "";
      const res = await fetch(`${API_BASE}/330_metrics.php${q}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setRows(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  }

  async function fetchSummary(month?: string) {
    setSummaryLoading(true);
    try {
      const q = month ? `?month=${encodeURIComponent(month)}` : "";
      const res = await fetch(`${API_BASE}/330_summary.php${q}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setSummary(data);
    } catch (err: any) {
      console.error("summary fetch error", err);
      setSummary(null);
    } finally {
      setSummaryLoading(false);
    }
  }

  useEffect(() => {
    // always fetch with current month filter
    fetchMetrics(monthFilter);
    fetchSummary(monthFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reload, monthFilter]);

  // prevent body scroll while modal is open
  useEffect(() => {
    const prev = document.body.style.overflow;
    if (showAddModal || !!editing) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = prev || "";
    }
    return () => {
      document.body.style.overflow = prev || "";
    };
  }, [showAddModal, editing]);

  // called after InsertMetricForm successfully adds a row
  function handleAdded() {
    setShowAddModal(false);
    setReload((s) => s + 1);
    fetchSummary(monthFilter);
  }

  // BH helpers
  function secsToHHMMSS(s: number) {
    if (!s) return "0:00";
    const hh = Math.floor(s / 3600);
    const mm = Math.floor((s % 3600) / 60).toString().padStart(2, "0");
    const ss = Math.floor(s % 60).toString().padStart(2, "0");
    return `${hh}:${mm}:${ss}`;
  }
  function fmtBHShort(s: number) {
    const hh = Math.floor(s / 3600);
    const mm = Math.floor((s % 3600) / 60).toString().padStart(2, "0");
    return `${hh}:${mm}`;
  }

  // POS badge color mapping (tolerant to CP / CPT variants)
  function posBadgeColor(pos?: string) {
    if (!pos) return "#6b7280"; // gray
    const p = pos.toUpperCase();
    if (p === "CPT" || p === "CP") return "#ef4444"; // red for captain
    if (p === "CC") return "#2563eb"; // blue
    if (p === "FO") return "#059669"; // green
    if (p === "ICC") return "#f97316"; // orange
    return "#4b5563"; // fallback gray
  }

  async function handleDelete(id?: number) {
    if (!id) return;
    if (!confirm("Delete this metric? This cannot be undone.")) return;

    const endpoint = `${API_BASE}/delete_metric_330.php?id=${encodeURIComponent(id)}`;

    try {
      let res = await fetch(endpoint, { method: "DELETE" });

      // Fallback to POST JSON if DELETE not supported
      if (!res.ok) {
        res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id }),
        });
      }

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `HTTP ${res.status}`);
      }

      try { await res.json(); } catch { /* ignore */ }

      setReload((s) => s + 1);
      alert("Deleted");
    } catch (err: any) {
      console.error("Delete failed", err);
      alert("Delete failed: " + (err.message || String(err)));
    }
  }

  // Open edit modal with the metric
  function openEdit(m: Metric) {
    setEditing({ ...m });
  }

  // after save, close and reload
  function openAfterEdit() {
    setEditing(null);
    setReload((s) => s + 1);
  }

  // handle edit form field change
  function editSet<K extends keyof Metric>(k: K, v: Metric[K]) {
    setEditing((prev) => (prev ? { ...prev, [k]: v } : prev));
  }

  async function submitEdit() {
    if (!editing) return;
    setEditLoading(true);
    try {
      const payload = {
        id: editing.id,
        report_date: editing.report_date,
        pos: editing.pos,
        bh_text: editing.bh_text,
        bh_seconds: editing.bh_seconds,
        sectors: editing.sectors,
        ac: editing.ac,
        name: editing.name,
        crew_id: editing.crew_id,
        base: editing.base,
      };
      const res = await fetch(`${API_BASE}/update_metric_330.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        data = { raw: text };
      }
      if (!res.ok) throw new Error(data.error || text || `HTTP ${res.status}`);
      setEditing(null);
      setReload((s) => s + 1);
      alert("Saved");
    } catch (err: any) {
      console.error("Update failed", err);
      alert("Update failed: " + (err.message || String(err)));
    } finally {
      setEditLoading(false);
    }
  }

  const bracketCounts = useMemo(() => {
    if (!summary || !Array.isArray(summary.brackets)) return [];
    return summary.brackets;
  }, [summary]);

  // apply pos + crew id + name filtering
  const filteredRows = useMemo(() => {
    if (!rows || rows.length === 0) return [];

    let result = [...rows];

    // POS filter (tolerant CP/CPT)
    if (posFilter && posFilter !== "ALL") {
      const pf = posFilter.toUpperCase();
      result = result.filter((r) => {
        const rp = (r.pos || "").toUpperCase();
        if ((pf === "CP" || pf === "CPT") && (rp === "CP" || rp === "CPT")) return true;
        return rp === pf;
      });
    }

    // Crew ID search
    if (crewIdFilter.trim() !== "") {
      const q = crewIdFilter.trim();
      result = result.filter((r) => String(r.crew_id).includes(q));
    }

    // Name search (case-insensitive)
    if (nameFilter.trim() !== "") {
      const q = nameFilter.trim().toLowerCase();
      result = result.filter((r) => (r.name || "").toLowerCase().includes(q));
    }

    return result;
  }, [rows, posFilter, crewIdFilter, nameFilter]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: 20, flex: 1, minHeight: 0 }}>
      <style>{`
        /* Custom thin scrollbar used for duty table scrollable regions */
        .dutytable-scroll {
          scrollbar-width: thin;
          scrollbar-color: rgba(255,255,255,0.10) rgba(255,255,255,0.03);
        }
        .dutytable-scroll::-webkit-scrollbar { width: 12px; height: 12px; }
        .dutytable-scroll::-webkit-scrollbar-track { background: rgba(255,255,255,0.03); border-radius: 12px; }
        .dutytable-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 12px; border: 3px solid transparent; background-clip: padding-box; }
        .dutytable-scroll::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.14); }

        /* glass-style buttons */
        .glass-btn {
          border: 1px solid rgba(255,255,255,0.08);
          background: linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01));
          color: #e6eef3;
          padding: 8px 12px;
          border-radius: 10px;
          box-shadow: 0 4px 14px rgba(2,6,23,0.45);
          backdrop-filter: blur(6px) saturate(120%);
          -webkit-backdrop-filter: blur(6px) saturate(120%);
          cursor: pointer;
          transition: transform .12s ease, box-shadow .12s ease, background .12s ease;
        }
        .glass-btn:hover { transform: translateY(-2px); box-shadow: 0 10px 30px rgba(2,6,23,0.5); }
        .glass-btn:active { transform: translateY(0); }
        .glass-btn.primary { background: linear-gradient(180deg, rgba(37,99,235,0.12), rgba(37,99,235,0.06)); border-color: rgba(37,99,235,0.24); }
        .glass-btn.ghost { background: transparent; border-color: rgba(255,255,255,0.06); color: #cbd5e1; }
        .glass-btn.danger { background: linear-gradient(180deg, rgba(239,68,68,0.12), rgba(239,68,68,0.06)); border-color: rgba(239,68,68,0.22); }
        .glass-btn.small { padding: 6px 8px; border-radius: 8px; font-size: 13px; }
        .glass-action { padding: 5px 8px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.04); background: rgba(255,255,255,0.02); color: #e6eef3; cursor: pointer; }

        /* card container around the table */
        .od-card {
          background: linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01));
          border: 1px solid rgba(255,255,255,0.03);
          border-radius: 10px;
          padding: 10px;
          box-shadow: 0 8px 18px rgba(2,6,23,0.36);
          min-height: 0; /* allow flex children to shrink */
        }

        /* make header sticky inside the scroll container */
        .od-table thead th { position: sticky; top: 0; z-index: 8; background: rgba(6,10,12,0.9); }

        /* compact table look */
        .od-table td, .od-table th { padding: 10px; border-bottom: 1px solid rgba(255,255,255,0.02); font-size: 13px; }

        /* modal inner styling */
        .ds-modal-inner {
          width: 720px;
          max-width: 95%;
          max-height: 80vh;
          overflow-y: auto;
          background: #0b1720;
          padding: 16px;
          border-radius: 10px;
        }
      `}</style>

      {/* header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ margin: 0 }}>Flight 330 - Planned Roaster</h1>
        </div>

        <div>
          <button onClick={() => setShowAddModal(true)} className="glass-btn primary" style={{ marginRight: 8 }}>
            Add Metric
          </button>
          <button
            onClick={() => {
              setReload((s) => s + 1);
              fetchSummary(monthFilter);
            }}
            className="glass-btn ghost"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Month filter row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginTop: 4,
          flexWrap: "wrap",
        }}
      >
        <span style={{ fontSize: 13, color: "#9aa4ad" }}>Month</span>

        <input
          type="month"
          value={monthFilter}
          onChange={(e) => {
            const v = e.target.value;
            setMonthFilter(v);
            fetchMetrics(v);
            fetchSummary(v);
          }}
          style={{
            background: "rgba(15,23,42,0.9)",
            border: "1px solid rgba(148,163,184,0.5)",
            borderRadius: 8,
            padding: "6px 8px",
            color: "#e5edf7",
            fontSize: 13,
            outline: "none",
          }}
        />

        <button
          className="glass-btn ghost"
          onClick={() => {
            const d = new Date();
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, "0");
            const m = `${yyyy}-${mm}`;
            setMonthFilter(m);
            fetchMetrics(m);
            fetchSummary(m);
          }}
        >
          This Month
        </button>
      </div>

      {/* Controls: POS + Crew ID + Name filters */}
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 13, color: "#9aa4ad" }}>POS</span>
          <select
            value={posFilter}
            onChange={(e) => setPosFilter(e.target.value)}
            style={{
              padding: 8,
              borderRadius: 8,
              border: "1px solid rgba(148,163,184,0.6)",
              background: "rgba(15,23,42,0.9)",
              color: "#e5edf7",
              fontSize: 13,
            }}
          >
            <option value="ALL">All</option>
            <option value="CPT">CPT</option>
            <option value="FO">FO</option>
            <option value="CC">CC</option>
            <option value="ICC">ICC</option>
          </select>
        </label>

        <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 13, color: "#9aa4ad" }}>Crew ID</span>
          <input
            value={crewIdFilter}
            onChange={(e) => setCrewIdFilter(e.target.value)}
            placeholder="e.g. 1234"
            style={{
              padding: "6px 8px",
              borderRadius: 8,
              border: "1px solid rgba(148,163,184,0.6)",
              background: "rgba(15,23,42,0.9)",
              color: "#e5edf7",
              fontSize: 13,
              minWidth: 90,
            }}
          />
        </label>

        <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 13, color: "#9aa4ad" }}>Name</span>
          <input
            value={nameFilter}
            onChange={(e) => setNameFilter(e.target.value)}
            placeholder="Search name"
            style={{
              padding: "6px 8px",
              borderRadius: 8,
              border: "1px solid rgba(148,163,184,0.6)",
              background: "rgba(15,23,42,0.9)",
              color: "#e5edf7",
              fontSize: 13,
              minWidth: 140,
            }}
          />
        </label>

        <button
          onClick={() => {
            setPosFilter("ALL");
            setCrewIdFilter("");
            setNameFilter("");
          }}
          className="glass-btn ghost"
          style={{ padding: "8px 10px" }}
        >
          Clear filters
        </button>

        <div style={{ marginLeft: "auto", color: "#9ca3af", fontSize: 13 }}>
          {loading ? "Loading..." : `${filteredRows.length} rows`}
        </div>
      </div>

      {/* Data table area: scrollable region */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8, minHeight: 0 }}>
        {/* Card wrapper with custom scrollbar class applied to inner scroll viewport */}
        <div className="od-card">
          <div
            className="dutytable-scroll"
            style={{
              maxHeight: 480,
              overflowY: "auto",
              overflowX: "hidden",
              WebkitOverflowScrolling: "touch",
              borderRadius: 8,
              minHeight: 0,
            }}
          >
            <table
              className="od-table"
              style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, tableLayout: "fixed" }}
            >
              <colgroup>
                <col style={{ width: "12%" }} />
                <col style={{ width: "8%" }} />
                <col style={{ width: "30%" }} />
                <col style={{ width: "8%" }} />
                <col style={{ width: "12%" }} />
                <col style={{ width: "8%" }} />
                <col style={{ width: "10%" }} />
                <col style={{ width: "12%" }} />
              </colgroup>

              <thead>
                <tr>
                  <th style={{ textAlign: "left" }}>Date</th>
                  <th style={{ textAlign: "left" }}>ID</th>
                  <th style={{ textAlign: "left" }}>Name</th>
                  <th style={{ textAlign: "left" }}>POS</th>
                  <th style={{ textAlign: "left" }}>BH</th>
                  <th style={{ textAlign: "center" }}>Sectors</th>
                  <th style={{ textAlign: "left" }}>BKT</th>
                  <th style={{ textAlign: "left" }}>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredRows.map((r) => (
                  <tr key={r.id}>
                    <td style={{ padding: 8 }}>{r.report_date}</td>
                    <td style={{ padding: 8 }}>{r.crew_id}</td>
                    <td
                      style={{
                        padding: 8,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {r.name}
                    </td>
                    <td style={{ padding: 8 }}>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "4px 8px",
                          borderRadius: 999,
                          color: "#fff",
                          fontSize: 12,
                          fontWeight: 700,
                          background: posBadgeColor(r.pos),
                        }}
                      >
                        {r.pos}
                      </span>
                    </td>
                    <td style={{ padding: 8 }}>
                      {fmtBHShort(r.bh_seconds)} {r.bh_text ? `(${r.bh_text})` : ""}
                    </td>
                    <td style={{ padding: 8, textAlign: "center" }}>{r.sectors}</td>
                    <td style={{ padding: 8 }}>{r.bkt}</td>
                    <td style={{ padding: 8 }}>
                      <button
                        onClick={() => openEdit(r)}
                        className="glass-action"
                        style={{ marginRight: 8 }}
                      >
                        Edit
                      </button>
                      <button onClick={() => handleDelete(r.id)} className="glass-btn danger">
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {!loading && filteredRows.length === 0 && (
                  <tr>
                    <td style={{ padding: 14 }} colSpan={8}>
                      No rows
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ADD METRIC MODAL */}
      {showAddModal && (
        <div
          onClick={() => setShowAddModal(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 999,
          }}
        >
          <div onClick={(e) => e.stopPropagation()} className="ds-modal-inner">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 8,
              }}
            >
              <h3 style={{ margin: 0 }}>Add Metric</h3>
              <button onClick={() => setShowAddModal(false)} className="glass-btn ghost">
                Close
              </button>
            </div>

            <InsertMetricForm
              apiBase={`${API_BASE}/insert_metric_330.php`}
              onAdded={handleAdded}
            />
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editing && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,0.5)",
            zIndex: 60,
          }}
          onClick={() => setEditing(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="ds-modal-inner"
            style={{ width: 640, maxHeight: "80vh", overflowY: "auto", padding: 12 }}
          >
            <h3 style={{ marginTop: 0 }}>Edit Metric #{editing.id}</h3>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <label style={{ display: "block" }}>
                Report date
                <input
                  type="date"
                  value={editing.report_date || ""}
                  onChange={(e) => editSet("report_date", e.target.value)}
                  style={{ width: "100%", padding: 8, marginTop: 6 }}
                />
              </label>

              <label style={{ display: "block" }}>
                POS
                <select
                  value={editing.pos || ""}
                  onChange={(e) => editSet("pos", e.target.value)}
                  style={{ width: "100%", padding: 8, marginTop: 6 }}
                >
                  <option>CP</option>
                  <option>CPT</option>
                  <option>FO</option>
                  <option>ICC</option>
                  <option>CC</option>
                </select>
              </label>

              <label>
                AC
                <input
                  value={editing.ac || ""}
                  onChange={(e) => editSet("ac", e.target.value)}
                  style={{ width: "100%", padding: 8, marginTop: 6 }}
                />
              </label>

              <label>
                BH (HH:MM:SS)
                <input
                  value={editing.bh_text || ""}
                  onChange={(e) => editSet("bh_text", e.target.value)}
                  style={{ width: "100%", padding: 8, marginTop: 6 }}
                />
              </label>

              <label>
                Sectors
                <input
                  type="number"
                  value={editing.sectors ?? 0}
                  onChange={(e) => editSet("sectors", Number(e.target.value))}
                  style={{ width: "100%", padding: 8, marginTop: 6 }}
                />
              </label>

              <label>
                Crew name
                <input
                  value={editing.name || ""}
                  onChange={(e) => editSet("name", e.target.value)}
                  style={{ width: "100%", padding: 8, marginTop: 6 }}
                />
              </label>
            </div>

            <div
              style={{
                marginTop: 12,
                display: "flex",
                gap: 8,
                justifyContent: "flex-end",
              }}
            >
              <button
                onClick={() => setEditing(null)}
                className="glass-btn ghost"
                style={{ padding: "8px 12px" }}
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  const txt = (editing.bh_text || "").trim();
                  let secs = editing.bh_seconds || 0;
                  if (txt) {
                    const parts = txt.split(":").map((p) => parseInt(p, 10) || 0);
                    if (parts.length === 3)
                      secs = parts[0] * 3600 + parts[1] * 60 + parts[2];
                    else if (parts.length === 2)
                      secs = parts[0] * 3600 + parts[1] * 60;
                    else secs = parts[0];
                    editSet("bh_seconds", secs);
                  }
                  await submitEdit();
                }}
                disabled={editLoading}
                className="glass-btn primary"
                style={{ padding: "8px 12px" }}
              >
                {editLoading ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
