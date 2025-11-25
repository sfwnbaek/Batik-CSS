// src/pages/OD330.tsx
// Planned Roster UI for Flight 330 (A330)
// Reference screenshot (local file): /mnt/data/Screenshot 2025-11-20 103443.png

import React, { useEffect, useState } from "react";
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
    fetchMetrics();
    fetchSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reload]);

  // called after InsertMetricForm successfully adds a row
  function handleAdded() {
    setShowAddModal(false);
    setReload((s) => s + 1);
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

  // Delete a metric (confirm)
  async function handleDelete(id?: number) {
    if (!id) return;
    if (!confirm("Delete this metric? This cannot be undone.")) return;
    try {
      const res = await fetch(`${API_BASE}/delete_metric_330.php?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || `HTTP ${res.status}`);
      }
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

  const bracketCounts = React.useMemo(() => {
    if (!summary || !Array.isArray(summary.brackets)) return [];
    return summary.brackets;
  }, [summary]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, minHeight: "calc(100vh - 40px)", padding: 12 }}>
      {/* header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ margin: 0 }}>330 - Metrics</h1>
          <div style={{ color: "#9aa4ad", marginTop: 6 }}>{loading ? "Loading..." : `${rows.length} rows`}</div>
        </div>

        <div>
          <button onClick={() => setShowAddModal(true)} style={{ padding: "8px 12px", marginRight: 8 }}>
            Add Metric
          </button>
          <button
            onClick={() => {
              setReload((s) => s + 1);
              fetchSummary();
            }}
            style={{ padding: "8px 12px" }}
          >
            Refresh
          </button>
        </div>
      </div>

      {/* summary (fixed height) */}
      <div style={{ display: "flex", gap: 12, minHeight: 160 }}>
        <div style={{ flex: 1, background: "rgba(255,255,255,0.02)", borderRadius: 8, padding: 12 }}>
          <strong style={{ display: "block", marginBottom: 8 }}>Planned Roster — Flight 330 Crew</strong>
          {summaryLoading ? (
            <div>Loading summary...</div>
          ) : (
            <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: 6 }}>BH</th>
                  <th style={{ padding: 6 }}>CP</th>
                  <th style={{ padding: 6 }}>FO</th>
                  <th style={{ padding: 6 }}>ICC</th>
                  <th style={{ padding: 6 }}>CC</th>
                </tr>
              </thead>
              <tbody>
                {Array.isArray(bracketCounts) && bracketCounts.length > 0 ? (
                  bracketCounts.map((b: any) => (
                    <tr key={b.bracket}>
                      <td style={{ padding: 6 }}>{b.bracket}</td>
                      <td style={{ padding: 6, textAlign: "center" }}>{b.cp}</td>
                      <td style={{ padding: 6, textAlign: "center" }}>{b.fo}</td>
                      <td style={{ padding: 6, textAlign: "center" }}>{b.icc}</td>
                      <td style={{ padding: 6, textAlign: "center" }}>{b.cc}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td style={{ padding: 6 }} colSpan={5}>
                      No bracket data
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        <div style={{ flex: 1, background: "rgba(255,255,255,0.02)", borderRadius: 8, padding: 12 }}>
          <strong style={{ display: "block", marginBottom: 8 }}>Crew Totals & Average</strong>

          {/* Totals */}
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Totals (BH HH:MM:SS)</div>
            <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ padding: 5 }}>Pos</th>
                  <th style={{ padding: 5 }}>BH</th>
                  <th style={{ padding: 5 }}>S</th>
                  <th style={{ padding: 5 }}>OFF</th>
                  <th style={{ padding: 5 }}>LVE</th>
                  <th style={{ padding: 5 }}>N/A</th>
                  <th style={{ padding: 5 }}>TRG</th>
                  <th style={{ padding: 5 }}>#</th>
                </tr>
              </thead>
              <tbody>
                {["CP", "FO", "ICC", "CC"].map((p) => {
                  const t = (summary && summary.totals && summary.totals[p]) || {
                    total_bh_seconds: 0,
                    total_sectors: 0,
                    total_off: 0,
                    total_lve: 0,
                    total_na: 0,
                    total_trg: 0,
                    crew_count: 0,
                  };
                  return (
                    <tr key={p}>
                      <td style={{ padding: 5 }}>{p}</td>
                      <td style={{ padding: 5 }}>{secsToHHMMSS(t.total_bh_seconds)}</td>
                      <td style={{ padding: 5, textAlign: "center" }}>{t.total_sectors}</td>
                      <td style={{ padding: 5, textAlign: "center" }}>{t.total_off}</td>
                      <td style={{ padding: 5, textAlign: "center" }}>{t.total_lve}</td>
                      <td style={{ padding: 5, textAlign: "center" }}>{t.total_na}</td>
                      <td style={{ padding: 5, textAlign: "center" }}>{t.total_trg}</td>
                      <td style={{ padding: 5, textAlign: "center" }}>{t.crew_count}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Averages */}
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Average per Crew</div>
            <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ padding: 5 }}>Pos</th>
                  <th style={{ padding: 5 }}>BH</th>
                  <th style={{ padding: 5 }}>S</th>
                  <th style={{ padding: 5 }}>OFF</th>
                  <th style={{ padding: 5 }}>LVE</th>
                  <th style={{ padding: 5 }}>N/A</th>
                  <th style={{ padding: 5 }}>TRG</th>
                </tr>
              </thead>
              <tbody>
                {["CP", "FO", "ICC", "CC"].map((p) => {
                  const a = (summary && summary.averages && summary.averages[p]) || {
                    bh_per_crew_seconds: 0,
                    sectors_per_crew: 0,
                    off_per_crew: 0,
                    lve_per_crew: 0,
                    na_per_crew: 0,
                    trg_per_crew: 0,
                  };
                  return (
                    <tr key={p}>
                      <td style={{ padding: 5 }}>{p}</td>
                      <td style={{ padding: 5 }}>{secsToHHMMSS(a.bh_per_crew_seconds)}</td>
                      <td style={{ padding: 5, textAlign: "center" }}>{a.sectors_per_crew}</td>
                      <td style={{ padding: 5, textAlign: "center" }}>{a.off_per_crew}</td>
                      <td style={{ padding: 5, textAlign: "center" }}>{a.lve_per_crew}</td>
                      <td style={{ padding: 5, textAlign: "center" }}>{a.na_per_crew}</td>
                      <td style={{ padding: 5, textAlign: "center" }}>{a.trg_per_crew}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Data table area: scrollable region */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ color: "#9aa4ad" }}>{loading ? "Loading..." : `${rows.length} rows`}</div>

        <div style={{ flex: 1, overflow: "auto", borderRadius: 8, background: "rgba(0,0,0,0.03)", padding: 8 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead style={{ position: "sticky", top: 0, background: "rgba(0,0,0,0.85)", zIndex: 10 }}>
              <tr>
                <th style={{ padding: 10, textAlign: "left" }}>Date</th>
                <th style={{ padding: 10, textAlign: "left" }}>ID</th>
                <th style={{ padding: 10, textAlign: "left" }}>Name</th>
                <th style={{ padding: 10, textAlign: "left" }}>POS</th>
                <th style={{ padding: 10, textAlign: "left" }}>BH</th>
                <th style={{ padding: 10, textAlign: "left" }}>Sectors</th>
                <th style={{ padding: 10, textAlign: "left" }}>BKT</th>
                <th style={{ padding: 10, textAlign: "left" }}>Actions</th>
              </tr>
            </thead>

            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td style={{ padding: 8 }}>{r.report_date}</td>
                  <td style={{ padding: 8 }}>{r.crew_id}</td>
                  <td style={{ padding: 8 }}>{r.name}</td>
                  <td style={{ padding: 8 }}>{r.pos}</td>
                  <td style={{ padding: 8 }}>{fmtBHShort(r.bh_seconds)} ({r.bh_text ?? ""})</td>
                  <td style={{ padding: 8, textAlign: "center" }}>{r.sectors}</td>
                  <td style={{ padding: 8 }}>{r.bkt}</td>
                  <td style={{ padding: 8 }}>
                    <button onClick={() => openEdit(r)} style={{ marginRight: 8, padding: "6px 8px" }}>
                      Edit
                    </button>
                    <button onClick={() => handleDelete(r.id)} style={{ padding: "6px 8px" }}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {!loading && rows.length === 0 && (
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
          <div onClick={(e) => e.stopPropagation()} style={{ width: 720, maxWidth: "95%", background: "#0b1720", padding: 16, borderRadius: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <h3 style={{ margin: 0 }}>Add Metric</h3>
              <button onClick={() => setShowAddModal(false)} style={{ padding: "6px 8px" }}>
                Close
              </button>
            </div>

            <InsertMetricForm apiBase={`${API_BASE}/insert_metric_330.php`} />

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
          <div onClick={(e) => e.stopPropagation()} style={{ width: 640, background: "#0b1720", padding: 12, borderRadius: 8 }}>
            <h3 style={{ marginTop: 0 }}>Edit Metric #{editing.id}</h3>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <label style={{ display: "block" }}>
                Report date
                <input type="date" value={editing.report_date || ""} onChange={(e) => editSet("report_date", e.target.value)} style={{ width: "100%", padding: 8, marginTop: 6 }} />
              </label>

              <label style={{ display: "block" }}>
                POS
                <select value={editing.pos || ""} onChange={(e) => editSet("pos", e.target.value)} style={{ width: "100%", padding: 8, marginTop: 6 }}>
                  <option>CP</option>
                  <option>FO</option>
                  <option>ICC</option>
                  <option>CC</option>
                </select>
              </label>

              <label>
                AC
                <input value={editing.ac || ""} onChange={(e) => editSet("ac", e.target.value)} style={{ width: "100%", padding: 8, marginTop: 6 }} />
              </label>

              <label>
                BH (HH:MM:SS)
                <input value={editing.bh_text || ""} onChange={(e) => editSet("bh_text", e.target.value)} style={{ width: "100%", padding: 8, marginTop: 6 }} />
              </label>

              <label>
                Sectors
                <input type="number" value={editing.sectors ?? 0} onChange={(e) => editSet("sectors", Number(e.target.value))} style={{ width: "100%", padding: 8, marginTop: 6 }} />
              </label>

              <label>
                Crew name
                <input value={editing.name || ""} onChange={(e) => editSet("name", e.target.value)} style={{ width: "100%", padding: 8, marginTop: 6 }} />
              </label>
            </div>

            <div style={{ marginTop: 12, display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={() => setEditing(null)} style={{ padding: "8px 12px" }}>
                Cancel
              </button>
              <button
                onClick={async () => {
                  const txt = (editing.bh_text || "").trim();
                  let secs = editing.bh_seconds || 0;
                  if (txt) {
                    const parts = txt.split(":").map((p) => parseInt(p, 10) || 0);
                    if (parts.length === 3) secs = parts[0] * 3600 + parts[1] * 60 + parts[2];
                    else if (parts.length === 2) secs = parts[0] * 3600 + parts[1] * 60;
                    else secs = parts[0];
                    editSet("bh_seconds", secs);
                  }
                  await submitEdit();
                }}
                disabled={editLoading}
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
