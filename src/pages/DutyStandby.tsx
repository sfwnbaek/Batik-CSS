// src/pages/DutyStandby.tsx
import React, { useEffect, useMemo, useState } from "react";

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

const API_BASE = "http://localhost/batik-api/api"; // adjust if needed

// ---------------- utilities (unchanged) ----------------
function toCSV(rows: RawRow[]) {
  if (!rows || rows.length === 0) return "";
  const keys = ["rep_date", "eqt", "sby_code", "crew_pos", "crew_id", "name", "mc_code", "dutyno"];
  const header = keys.join(",");
  const lines = rows.map((r) =>
    keys
      .map((k) => {
        let v: any = (r as any)[k];
        if (v === null || v === undefined) return "";
        v = String(v).replace(/"/g, '""');
        return `"${v}"`;
      })
      .join(",")
  );
  return [header, ...lines].join("\r\n");
}
function badgeColor(code?: string) {
  if (!code) return "#6b7280";
  const c = code.toUpperCase();
  if (c.startsWith("SBY")) return "#2563eb";
  if (c.startsWith("SBK")) return "#9333ea";
  if (c === "ASBY") return "#059669";
  if (c === "SKUL") return "#d97706";
  if (c === "WTF") return "#ef4444";
  if (["CPT", "FO"].includes(c)) return "#0ea5a4";
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

// ---------------- POS colour helper (new) ----------------
function posBadgeColor(pos?: string) {
  if (!pos) return "#6b7280";
  const p = pos.toUpperCase();
  if (p === "CPT" || p === "CP") return "#ef4444"; // red - Captain
  if (p === "CC") return "#2563eb"; // blue - Cabin Commander (example)
  if (p === "FO") return "#059669"; // green - First Officer
  if (p === "ICC") return "#f97316"; // orange - Inflight Check Captain (example)
  if (p === "FA") return "#8b5cf6"; // purple - Flight Attendant
  if (p === "SFA") return "#64748b"; // slate - Senior FA
  return "#4b5563"; // fallback gray
}

// ---------------- Insert form (updated button style) ----------------
function InsertDutyForm({ onAdded }: { onAdded?: () => void }) {
  const [repDate, setRepDate] = useState<string>("");
  const [sbyCode, setSbyCode] = useState<string>("SBY1");
  const [crewPos, setCrewPos] = useState<string>("CC");
  const [crewId, setCrewId] = useState<string>("");
  const [name, setName] = useState<string>("");
  const [eqt, setEqt] = useState<string>("737");
  const [mcCode, setMcCode] = useState<string>("LMC");
  const [dutyno, setDutyno] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function submit(e?: React.FormEvent) {
    e?.preventDefault();
    setMsg(null);
    if (!repDate || !sbyCode || !crewPos) {
      setMsg("repDate, sbyCode and crewPos are required");
      return;
    }
    setLoading(true);
    try {
      const body = {
        rep_date: repDate,
        sby_code: sbyCode,
        crew_pos: crewPos,
        crew_id: crewId,
        name,
        eqt,
        mc_code: mcCode,
        dutyno
      };
      const res = await fetch(`${API_BASE}/insert_duty.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || JSON.stringify(data));
      setMsg("Added (or existed): " + (data.id ?? ""));
      onAdded && onAdded();
      setCrewId("");
      setName("");
    } catch (err: any) {
      setMsg("Error: " + (err.message || String(err)));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 0, flexWrap: "wrap" }}>
      <input type="date" value={repDate} onChange={(e) => setRepDate(e.target.value)} style={{ padding: 6 }} />
      <select value={sbyCode} onChange={(e) => setSbyCode(e.target.value)} style={{ padding: 8 }}>
        <option>SBY1</option>
        <option>SBY2</option>
        <option>SBY3</option>
        <option>SBY4</option>
        <option>SBK1</option>
        <option>SBZ2</option>
        <option>ASBY</option>
        <option>SKUL</option>
      </select>
      <select value={crewPos} onChange={(e) => setCrewPos(e.target.value)} style={{ padding: 8 }}>
        <option>CC</option>
        <option>CPT</option>
        <option>FO</option>
        <option>ICC</option>
        <option>FA</option>
        <option>SFA</option>
      </select>
      <input placeholder="Crew ID" value={crewId} onChange={(e) => setCrewId(e.target.value)} style={{ padding: 8 }} />
      <input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} style={{ padding: 6, minWidth: 140 }} />
      <input placeholder="EQT" value={eqt} onChange={(e) => setEqt(e.target.value)} style={{ padding: 8, width: 80 }} />
      <input placeholder="MC" value={mcCode} onChange={(e) => setMcCode(e.target.value)} style={{ padding: 8, width: 80 }} />
      <input placeholder="DUTYNO" value={dutyno} onChange={(e) => setDutyno(e.target.value)} style={{ padding: 8, width: 90 }} />
      <button type="submit" disabled={loading} className="glass-btn primary" style={{ padding: "8px 12px" }}>{loading ? "Saving..." : "Add"}</button>
      {msg && <div style={{ marginLeft: 8, color: "#cbd5e1" }}>{msg}</div>}
    </form>
  );
}

// ---------------- Edit form (now used inside modal) ----------------
function EditDutyForm({
  row,
  onCancel,
  onSaved
}: {
  row: RawRow;
  onCancel: () => void;
  onSaved?: () => void;
}) {
  const [repDate, setRepDate] = useState<string>(formatDateIso(row.rep_date ?? row.rep_datetime));
  const [sbyCode, setSbyCode] = useState<string>(row.sby_code ?? "SBY1");
  const [crewPos, setCrewPos] = useState<string>(row.crew_pos ?? "CC");
  const [crewId, setCrewId] = useState<string>(row.crew_id ?? "");
  const [name, setName] = useState<string>(row.name ?? "");
  const [eqt, setEqt] = useState<string>(row.eqt ?? "737");
  const [mcCode, setMcCode] = useState<string>(row.mc_code ?? "");
  const [dutyno, setDutyno] = useState<string>((row.dutyno as any) ?? "");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function save(e?: React.FormEvent) {
    e?.preventDefault();
    setMsg(null);
    if (!row.id) return setMsg("Missing row id");
    setLoading(true);
    try {
      const body: any = {
        id: row.id,
        rep_date: repDate,
        sby_code: sbyCode,
        crew_pos: crewPos,
        crew_id: crewId,
        name,
        eqt,
        mc_code: mcCode,
        dutyno
      };
      const res = await fetch(`${API_BASE}/edit_duty.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || JSON.stringify(data));
      setMsg("Saved");
      onSaved && onSaved();
    } catch (err: any) {
      setMsg("Error: " + (err.message || String(err)));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: 12, borderRadius: 8, background: "rgba(0,0,0,0.04)", marginBottom: 12 }}>
      <form onSubmit={save} style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <input type="date" value={repDate} onChange={(e) => setRepDate(e.target.value)} style={{ padding: 8 }} />
        <select value={sbyCode} onChange={(e) => setSbyCode(e.target.value)} style={{ padding: 8 }}>
          <option>SBY1</option>
          <option>SBY2</option>
          <option>SBY3</option>
          <option>SBY4</option>
          <option>SBK1</option>
          <option>SBZ2</option>
          <option>ASBY</option>
          <option>SKUL</option>
        </select>
        <select value={crewPos} onChange={(e) => setCrewPos(e.target.value)} style={{ padding: 8 }}>
          <option>CC</option>
          <option>CPT</option>
          <option>FO</option>
          <option>ICC</option>
          <option>FA</option>
          <option>SFA</option>
        </select>
        <input placeholder="Crew ID" value={crewId} onChange={(e) => setCrewId(e.target.value)} style={{ padding: 8 }} />
        <input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} style={{ padding: 8, minWidth: 160 }} />
        <input placeholder="EQT" value={eqt} onChange={(e) => setEqt(e.target.value)} style={{ padding: 8, width: 80 }} />
        <input placeholder="MC" value={mcCode} onChange={(e) => setMcCode(e.target.value)} style={{ padding: 8, width: 80 }} />
        <input placeholder="DUTYNO" value={dutyno} onChange={(e) => setDutyno(e.target.value)} style={{ padding: 8, width: 90 }} />
        <button type="submit" disabled={loading} className="glass-btn primary" style={{ padding: "8px 12px" }}>{loading ? "Saving..." : "Save"}</button>
        <button type="button" onClick={onCancel} className="glass-btn ghost" style={{ padding: "8px 12px" }}>Cancel</button>
        {msg && <div style={{ color: "#cbd5e1" }}>{msg}</div>}
      </form>
    </div>
  );
}

// ---------------- Main page ----------------
export default function DutyStandbyPage(): JSX.Element {
  const [rows, setRows] = useState<RawRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState<string>("");
  const [dateFilter, setDateFilter] = useState<string>(""); // YYYY-MM-DD
  const [page, setPage] = useState<number>(1);
  const perPage = 20;
  const [viewPivot, setViewPivot] = useState<boolean>(false);

  // reload trigger
  const [reloadCounter, setReloadCounter] = useState(0);

  // edit state
  const [editingRow, setEditingRow] = useState<RawRow | null>(null);

  // show/hide insert modal
  const [showInsert, setShowInsert] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (dateFilter) params.set("date", dateFilter);
    fetch(`${API_BASE}/duty_standby.php?${params.toString()}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!Array.isArray(data)) throw new Error("Unexpected response from API");
        setRows(
          data.map((r: any) => ({
            ...r,
            rep_date: r.rep_date ?? (r.rep_datetime ? formatDateIso(r.rep_datetime) : undefined),
          }))
        );
        setPage(1);
      })
      .catch((err) => {
        console.error(err);
        setError(String(err.message ?? err));
      })
      .finally(() => setLoading(false));
  }, [dateFilter, reloadCounter]);

  // prevent body scroll when add/edit modal is open
  useEffect(() => {
    const prev = document.body.style.overflow;
    if (showInsert || !!editingRow) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = prev || "";
    }
    return () => {
      document.body.style.overflow = prev || "";
    };
  }, [showInsert, editingRow]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      return (
        (r.name ?? "").toLowerCase().includes(q) ||
        (r.crew_id ?? "").toLowerCase().includes(q) ||
        (r.sby_code ?? "").toLowerCase().includes(q) ||
        (r.crew_pos ?? "").toLowerCase().includes(q) ||
        (r.mc_code ?? "").toLowerCase().includes(q) ||
        (r.eqt ?? "").toLowerCase().includes(q)
      );
    });
  }, [rows, query]);

  const total = filtered.length;
  const pages = Math.max(1, Math.ceil(total / perPage));
  const pageRows = filtered.slice((page - 1) * perPage, page * perPage);

  const pivot1 = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of filtered) {
      const p = (r.crew_pos || "UNKNOWN").toUpperCase();
      map.set(p, (map.get(p) || 0) + 1);
    }
    return Array.from(map.entries()).map(([rank, count]) => ({ rank, count }));
  }, [filtered]);

  const pivot2 = useMemo(() => {
    const sbySet = new Set<string>();
    const matrix = new Map<string, Map<string, number>>();
    for (const r of filtered) {
      const sby = (r.sby_code || "UNKNOWN").toUpperCase();
      const eqt = (r.eqt || "UNKNOWN").toUpperCase();
      const pos = (r.crew_pos || "UNKNOWN").toUpperCase();
      sbySet.add(sby);
      const key = `${eqt}||${pos}`;
      if (!matrix.has(key)) matrix.set(key, new Map());
      const inner = matrix.get(key)!;
      inner.set(sby, (inner.get(sby) || 0) + 1);
    }
    const sbyCols = Array.from(sbySet).sort();
    const rowsOut = Array.from(matrix.entries()).map(([k, inner]) => {
      const [eqt, pos] = k.split("||");
      const out: any = { eqt, crew_pos: pos, total: 0 };
      let tot = 0;
      for (const c of sbyCols) {
        const v = inner.get(c) || 0;
        out[c] = v;
        tot += v;
      }
      out.total = tot;
      return out;
    });
    rowsOut.sort((a, b) => (a.eqt !== b.eqt ? a.eqt.localeCompare(b.eqt) : a.crew_pos.localeCompare(b.crew_pos)));
    return { sbyCols, rows: rowsOut };
  }, [filtered]);

  function isoOffset(offsetDays: number) {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  function downloadCSV() {
    const csv = toCSV(viewPivot ? [] : filtered);
    if (!csv) return alert("No rows to export");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `duty_standby_${dateFilter || "all"}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  // ---- NEW: edit and delete handlers ----
  async function handleDelete(row: RawRow) {
    if (!row.id) return;
    const ok = confirm(`Delete this row?\n${row.name ?? ""} — ${row.sby_code} ${row.rep_date}`);
    if (!ok) return;
    try {
      const res = await fetch(`${API_BASE}/delete_duty.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: row.id })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || JSON.stringify(data));
      // reload
      setReloadCounter((c) => c + 1);
      alert("Deleted");
    } catch (err: any) {
      alert("Delete failed: " + (err.message || String(err)));
    }
  }

  // open row in edit modal
  function handleOpenEdit(row: RawRow) {
    setEditingRow(row);
  }

  // after save, close and reload
  function handleAfterEdit() {
    setEditingRow(null);
    setReloadCounter((c) => c + 1);
  }

  // small inline styles
  const styles: { [k: string]: React.CSSProperties } = {
    // overall page container: smaller top/bottom padding
    container: { padding: "12px 16px", maxWidth: "1100px", margin: "0 auto" },

    // controls area: slightly smaller spacing
    controls: { display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", marginBottom: 10 },

    // card: reduced padding and slightly tighter shadow
    card: {
      background: "rgba(255,255,255,0.02)",
      border: "1px solid rgba(255,255,255,0.03)",
      borderRadius: 8,
      padding: 8,
      boxShadow: "0 6px 14px rgba(2,6,23,0.35)",
      overflow: "hidden"
    },

    // table: smaller font for compact look
    table: { width: "100%", borderCollapse: "collapse", fontSize: 13 },

    // header cell compact
    th: {
      textAlign: "left",
      padding: "8px 10px",
      borderBottom: "1px solid rgba(255,255,255,0.03)",
      position: "sticky",
      top: 0,
      background: "rgba(0,0,0,0.02)",
      lineHeight: 1.1,
      fontSize: 13
    },

    // body cells compact
    td: { padding: "8px 10px", borderBottom: "1px solid rgba(255,255,255,0.02)", lineHeight: 1.1 },

    // smaller badges
    badge: { display: "inline-block", padding: "3px 7px", borderRadius: 999, color: "#fff", fontSize: 11, fontWeight: 600 },

    // pager: slightly smaller
    pager: { display: "flex", gap: 6, alignItems: "center", marginTop: 10 },

    small: { fontSize: 12, color: "#9ca3af" },

    headingRow: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },

    // small action button (edit/delete)
    actionBtn: { padding: "5px 8px", marginLeft: 6, cursor: "pointer", fontSize: 13 }
  };

  return (
    <div style={styles.container}>
      <style>{`
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

        /* POS badge (used for crew_pos) */
        .pos-badge {
          display: inline-block;
          padding: 4px 8px;
          border-radius: 999px;
          color: white;
          font-weight: 700;
          font-size: 12px;
        }

        /* simple modal inner styling */
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

      <div style={styles.headingRow}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28 }}>Duty Standby</h1>
          <div style={{ color: "#9aa4ad", fontSize: 12 }}>List / search duty standby here</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setViewPivot((v) => !v)} className="glass-btn ghost">
            {viewPivot ? "Show Raw" : "Show Pivot"}
          </button>
          <button onClick={downloadCSV} className="glass-btn ghost">
            Export CSV
          </button>
        </div>
      </div>

      <div style={styles.controls}>
        <input
          placeholder="Search name / crew id / sby / pos / mc..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ padding: "8px 12px", minWidth: 300 }}
        />
        <input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} style={{ padding: "8px 10px" }} />
        <button onClick={() => setDateFilter("")} className="glass-btn small">
          Clear date
        </button>
        <button onClick={() => setDateFilter(isoOffset(-1))} className="glass-btn small">
          Yesterday
        </button>
        <button onClick={() => setDateFilter(isoOffset(0))} className="glass-btn small">
          Today
        </button>
        <button onClick={() => setDateFilter(isoOffset(1))} className="glass-btn small">
          Tomorrow
        </button>

        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
          <div style={styles.small}>{loading ? "Loading..." : `${total} rows`}</div>
          {error && <div style={{ color: "salmon" }}>{error}</div>}
        </div>
      </div>

      <div style={{ marginBottom: 12 }}>
        <button onClick={() => setShowInsert(true)} className="glass-btn primary">
          Add Duty / Standby
        </button>
      </div>

      {/* ADD FORM AS POPUP MODAL */}
      {showInsert && (
        <div
          onClick={() => setShowInsert(false)}
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
          <div className="ds-modal-inner" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <h3 style={{ margin: 0 }}>Add Duty / Standby</h3>
              <button onClick={() => setShowInsert(false)} className="glass-btn ghost" style={{ padding: "6px 8px" }}>
                Close
              </button>
            </div>

            <InsertDutyForm
              onAdded={() => {
                // close modal, trigger reload
                setShowInsert(false);
                setReloadCounter((c) => c + 1);
              }}
            />
          </div>
        </div>
      )}

      {/* edit modal */}
      {editingRow && (
        <div
          onClick={() => setEditingRow(null)}
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
          <div className="ds-modal-inner" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <h3 style={{ margin: 0 }}>Edit Duty / Standby</h3>
              <button onClick={() => setEditingRow(null)} className="glass-btn ghost" style={{ padding: "6px 8px" }}>
                Close
              </button>
            </div>

            <EditDutyForm row={editingRow} onCancel={() => setEditingRow(null)} onSaved={() => handleAfterEdit()} />
          </div>
        </div>
      )}

      <div style={styles.card}>
        {!viewPivot && (
          <>
            <h3 style={{ marginTop: 6, fontSize: 16 }}>Duty / Standby (Raw)</h3>
            <div className="dutytable-scroll" style={{ maxHeight: 360, overflow: "auto", borderRadius: 8 }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14, tableLayout: "fixed" }}>
                <colgroup>
                  <col style={{ width: "12%" }} />
                  <col style={{ width: "9%" }} />
                  <col style={{ width: "12%" }} />
                  <col style={{ width: "10%" }} />
                  <col style={{ width: "40%" }} />
                  <col style={{ width: "17%" }} />
                </colgroup>
                <thead>
                  <tr>
                    <th style={{ position: "sticky", top: 0, zIndex: 6, background: "rgba(10,16,20,0.92)", padding: "12px", textAlign: "left", color: "#E6EEF3", fontWeight: 700 }}>Date</th>
                    <th style={{ position: "sticky", top: 0, zIndex: 6, background: "rgba(10,16,20,0.92)", padding: "12px", textAlign: "left", color: "#E6EEF3", fontWeight: 700 }}>EQT</th>
                    <th style={{ position: "sticky", top: 0, zIndex: 6, background: "rgba(10,16,20,0.92)", padding: "12px", textAlign: "left", color: "#E6EEF3", fontWeight: 700 }}>SBY</th>
                    <th style={{ position: "sticky", top: 0, zIndex: 6, background: "rgba(10,16,20,0.92)", padding: "12px", textAlign: "left", color: "#E6EEF3", fontWeight: 700 }}>Pos</th>
                    <th style={{ position: "sticky", top: 0, zIndex: 6, background: "rgba(10,16,20,0.92)", padding: "12px", textAlign: "left", color: "#E6EEF3", fontWeight: 700 }}>Crew</th>
                    <th style={{ position: "sticky", top: 0, zIndex: 6, background: "rgba(10,16,20,0.92)", padding: "12px", textAlign: "left", color: "#E6EEF3", fontWeight: 700 }}>MC</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.length === 0 && !loading && (
                    <tr><td style={{ padding: 14 }} colSpan={7}>No rows</td></tr>
                  )}
                  {pageRows.map((r) => (
                    <tr key={r.id ?? `${r.crew_id}-${r.sby_code}-${r.rep_date}`}>
                      <td style={{ padding: "12px", borderBottom: "1px solid rgba(255,255,255,0.02)" }}>{formatDateIso(r.rep_date ?? r.rep_datetime)}</td>
                      <td style={{ padding: "12px", borderBottom: "1px solid rgba(255,255,255,0.02)" }}>
                        <span style={{ display: "inline-block", padding: "4px 8px", borderRadius: 999, color: "#fff", fontSize: 12, fontWeight: 600, background: badgeColor(r.eqt) }}>{r.eqt ?? "—"}</span>
                      </td>
                      <td style={{ padding: "12px", borderBottom: "1px solid rgba(255,255,255,0.02)" }}>
                        <span style={{ display: "inline-block", padding: "4px 8px", borderRadius: 999, color: "#fff", fontSize: 12, fontWeight: 600, background: badgeColor(r.sby_code) }}>{r.sby_code ?? "—"}</span>
                      </td>
                      <td style={{ padding: "12px", borderBottom: "1px solid rgba(255,255,255,0.02)", fontWeight: 600 }}>
                        <span className="pos-badge" style={{ background: posBadgeColor(r.crew_pos) }}>
                          {r.crew_pos ?? "—"}
                        </span>
                      </td>
                      <td style={{ padding: "12px", borderBottom: "1px solid rgba(255,255,255,0.02)" }}>
                        <div style={{ fontWeight: 700 }}>{r.name ?? "—"}</div>
                        <div style={{ color: "#9ca3af", fontSize: 12 }}>{r.crew_id ?? ""}</div>
                        <div style={{ marginTop: 6 }}>
                          <button onClick={() => handleOpenEdit(r)} className="glass-action" style={{ marginRight: 8 }}>Edit</button>
                          <button onClick={() => handleDelete(r)} className="glass-btn danger">Delete</button>
                        </div>
                      </td>
                      <td style={{ padding: "12px", borderBottom: "1px solid rgba(255,255,255,0.02)" }}>{r.mc_code ?? ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div style={styles.pager}>
              <button onClick={() => setPage(1)} disabled={page === 1} className="glass-btn small">⏮</button>
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="glass-btn small">◀</button>
              <div style={{ padding: "6px 10px" }}>Page {page} of {pages}</div>
              <button onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page === pages} className="glass-btn small">▶</button>
              <button onClick={() => setPage(pages)} disabled={page === pages} className="glass-btn small">⏭</button>
              <div style={{ marginLeft: "auto", color: "#9ca3af" }}>Showing {pageRows.length} of {total}</div>
            </div>
          </>
        )}

        {viewPivot && (
          <>
            <h3 style={{ marginTop: 4 }}>Pivot — SBY matrix (eqt × rank)</h3>
            <div style={{ overflow: "auto" }}>
              <table style={{ ...styles.table, minWidth: 720 }}>
                <thead>
                  <tr>
                    <th style={styles.th}>EQT</th>
                    <th style={styles.th}>Rank</th>
                    {pivot2.sbyCols.map((c) => <th style={styles.th} key={c}>{c}</th>)}
                    <th style={styles.th}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {pivot2.rows.length === 0 && <tr><td style={styles.td} colSpan={2 + pivot2.sbyCols.length + 1}>No pivot rows</td></tr>}
                  {pivot2.rows.map((r, i) => (
                    <tr key={i}>
                      <td style={styles.td}>{r.eqt}</td>
                      <td style={styles.td}>{r.crew_pos}</td>
                      {pivot2.sbyCols.map((c) => <td key={c} style={{ ...styles.td, textAlign: "right" }}>{r[c] || 0}</td>)}
                      <td style={{ ...styles.td, textAlign: "right", fontWeight: 700 }}>{r.total}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ borderTop: "2px solid rgba(255,255,255,0.04)" }}>
                    <td style={styles.td} colSpan={2}>Grand Total</td>
                    {pivot2.sbyCols.map((c) => {
                      const sum = pivot2.rows.reduce((s, r) => s + (r[c] || 0), 0);
                      return <td key={c} style={{ ...styles.td, textAlign: "right", fontWeight: 700 }}>{sum}</td>;
                    })}
                    <td style={{ ...styles.td, textAlign: "right", fontWeight: 800 }}>{pivot2.rows.reduce((s, r) => s + r.total, 0)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
