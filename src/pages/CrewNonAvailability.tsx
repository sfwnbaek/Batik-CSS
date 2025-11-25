// src/components/CrewNonAvailability.tsx
import React, { useEffect, useMemo, useState } from "react";

const API_BASE = "http://localhost/batik-api/api"; // adjust to your API base

type Row = {
  crew_id: string;
  name: string;
  pos: string;
  crew_totals?: number;
  GRND?: number;
  LWP?: number;
  UA?: number;
  NDOC?: number;
  LMC?: number;
  RFLT?: number;
  NCSL?: number;
  CSL?: number;
  SL?: number;
  EL?: number;
  HSO?: number;
  MIA?: number;
  OFL?: number;
  AWOL?: number;
  COMP?: number;
  INQ?: number;
};

type EventRow = {
  id: number;
  crew_id: string;
  name: string;
  pos: string;
  code: string;
  event_date: string;
  created_at?: string;
};

function posColor(pos?: string) {
  if (!pos) return "#6b7280";
  const p = pos.toUpperCase();
  if (p === "CPT" || p === "CP") return "#ef4444";
  if (p === "FO") return "#059669";
  if (p === "CC") return "#2563eb";
  if (p === "ICC") return "#f97316";
  if (p === "FA") return "#8b5cf6";
  if (p === "SFA") return "#64748b";
  return "#4b5563";
}

/** Simple glass button style object (apply in-line or move to CSS) */
const glassBtn: React.CSSProperties = {
  padding: "6px 10px",
  borderRadius: 8,
  border: "1px solid rgba(255,255,255,0.06)",
  background: "linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01))",
  color: "#e6eef3",
  cursor: "pointer",
  boxShadow: "0 6px 14px rgba(2,6,23,0.32)",
};

const AVAILABLE_CODES = [
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
];

export default function CrewNonAvailability(): JSX.Element {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [msg, setMsg] = useState<string | null>(null);

  // Add-form state
  const [addCrewId, setAddCrewId] = useState("");
  const [addName, setAddName] = useState("");
  const [addPos, setAddPos] = useState("CC");
  const [addCode, setAddCode] = useState("GRND");
  const [addDate, setAddDate] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });

  const [adding, setAdding] = useState(false);

  // event modal / editing state
  const [eventsModalCrew, setEventsModalCrew] = useState<string | null>(null);
  const [crewEvents, setCrewEvents] = useState<EventRow[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventRow | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // NEW: filtering UI state
  const [search, setSearch] = useState<string>("");
  const [posFilter, setPosFilter] = useState<string>("ALL");
  const [codeFilter, setCodeFilter] = useState<string>("ALL");
  const [minTotal, setMinTotal] = useState<number>(0);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchData() {
    setLoading(true);
    setMsg(null);
    try {
      const params = new URLSearchParams();
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      const res = await fetch(`${API_BASE}/crew_nonavailability_summary.php?${params.toString()}`, {
        method: "GET",
      });

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

      const normalized = (data || []).map((r: any) => ({
        crew_id: r.crew_id ?? "",
        name: r.name ?? "",
        pos: r.pos ?? "",
        crew_totals: Number(r.crew_totals || 0),
        GRND: Number(r.GRND || 0),
        LWP: Number(r.LWP || 0),
        UA: Number(r.UA || r["U/A"] || 0),
        NDOC: Number(r.NDOC || 0),
        LMC: Number(r.LMC || 0),
        RFLT: Number(r.RFLT || 0),
        NCSL: Number(r.NCSL || 0),
        CSL: Number(r.CSL || 0),
        SL: Number(r.SL || 0),
        EL: Number(r.EL || 0),
        HSO: Number(r.HSO || 0),
        MIA: Number(r.MIA || 0),
        OFL: Number(r.OFL || 0),
        AWOL: Number(r.AWOL || 0),
        COMP: Number(r.COMP || 0),
        INQ: Number(r.INQ || 0),
      }));
      setRows(normalized);
    } catch (err: any) {
      console.error("fetchData err:", err);
      setRows([]);
      setMsg("Failed to fetch data: " + (err.message || String(err)));
    } finally {
      setLoading(false);
    }
  }

  // -- single add (quick add) --
  async function doAddSingle(e?: React.FormEvent) {
    e?.preventDefault();
    setMsg(null);

    const crew_id = addCrewId.trim();
    const name = addName.trim();
    const code = addCode.trim();
    const event_date = addDate;

    if (!crew_id || !name || !code || !event_date) {
      setMsg("crew_id, name, code and date are required.");
      return;
    }

    setAdding(true);

    try {
      const body = {
        rows: [
          {
            crew_id,
            name,
            pos: addPos,
            code,
            event_date,
          },
        ],
      };

      const res = await fetch(`${API_BASE}/crew_nonavailability_insert.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const text = await res.text();
      let data: any;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(`Unexpected server response: ${text.substring(0, 300)}`);
      }

      if (!res.ok) {
        if (data.error) throw new Error(data.error);
        if (Array.isArray(data.errors) && data.errors.length) {
          throw new Error(data.errors.join("; "));
        }
        throw new Error(`Server responded ${res.status}`);
      }

      const inserted = Number(data.inserted_count || 0);
      setMsg(`Inserted ${inserted} row(s).`);
      setAddCrewId("");
      setAddName("");
      setAddPos("CC");
      setAddCode("GRND");
      fetchData();
    } catch (err: any) {
      console.error("doAddSingle err:", err);
      setMsg("Insert failed: " + (err.message || String(err)));
    } finally {
      setAdding(false);
    }
  }

  // --- events modal handlers ---
  async function openCrewEvents(crewId: string) {
    setEventsModalCrew(crewId);
    setEventsLoading(true);
    setCrewEvents([]);
    try {
      const params = new URLSearchParams();
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      const res = await fetch(`${API_BASE}/crew_nonavailability_events.php?crew_id=${encodeURIComponent(crewId)}&${params.toString()}`);
      const text = await res.text();
      let data: any;
      try { data = JSON.parse(text); } catch { throw new Error(`Unexpected: ${text.substring(0,300)}`); }
      if (!res.ok) {
        if (data.error) throw new Error(data.error);
        throw new Error(`Server ${res.status}`);
      }
      setCrewEvents(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error("openCrewEvents err:", err);
      setMsg("Failed to load events: " + (err.message || String(err)));
      setCrewEvents([]);
    } finally {
      setEventsLoading(false);
    }
  }

  function closeEventsModal() {
    setEventsModalCrew(null);
    setCrewEvents([]);
    setEditingEvent(null);
  }

  function openEditEvent(ev: EventRow) {
    setEditingEvent({ ...ev });
  }

  async function saveEditingEvent() {
    if (!editingEvent) return;
    try {
      const payload: any = { id: editingEvent.id, code: editingEvent.code, pos: editingEvent.pos, name: editingEvent.name, event_date: editingEvent.event_date };
      const res = await fetch(`${API_BASE}/update_nonavail.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || JSON.stringify(data));
      // refresh
      if (eventsModalCrew) await openCrewEvents(eventsModalCrew);
      await fetchData();
      setEditingEvent(null);
      setMsg("Saved.");
    } catch (err: any) {
      alert("Save failed: " + (err.message || String(err)));
    }
  }

  async function deleteEvent(id?: number) {
    if (!id) return;
    if (!confirm("Delete this non-availability event?")) return;
    try {
      setDeleteLoading(true);
      const res = await fetch(`${API_BASE}/delete_nonavail.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || JSON.stringify(data));
      // refresh
      if (eventsModalCrew) await openCrewEvents(eventsModalCrew);
      fetchData();
      setMsg("Deleted.");
    } catch (err: any) {
      alert("Delete failed: " + (err.message || String(err)));
    } finally {
      setDeleteLoading(false);
    }
  }

  // delete all for crew in date range
  async function quickDeleteCrew(crewId: string) {
    if (!confirm(`Delete all events for ${crewId} in current date range? This cannot be undone.`)) return;
    try {
      setDeleteLoading(true);
      const body: any = { crew_id: crewId };
      if (from) body.from = from;
      if (to) body.to = to;
      const res = await fetch(`${API_BASE}/delete_nonavail.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || JSON.stringify(data));
      setMsg(`Deleted ${data.deleted_count || 0} event(s).`);
      fetchData();
      closeEventsModal();
    } catch (err: any) {
      alert("Delete failed: " + (err.message || String(err)));
    } finally {
      setDeleteLoading(false);
    }
  }

  // --- filtering logic (client-side) ---
  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      // search filter
      if (q) {
        const found =
          (r.name ?? "").toLowerCase().includes(q) ||
          (r.crew_id ?? "").toLowerCase().includes(q);
        if (!found) return false;
      }
      // pos filter
      if (posFilter !== "ALL" && (r.pos ?? "").toUpperCase() !== posFilter.toUpperCase()) return false;
      // min total filter
      if ((r.crew_totals || 0) < minTotal) return false;
      // code filter: check that the selected code column has > 0 (or if ALL, skip)
      if (codeFilter !== "ALL") {
        // code column in summary may be "U/A" stored as UA or "U/A" depending on backend; normalize
        const key = codeFilter === "U/A" ? "UA" : codeFilter;
        const v = (r as any)[key];
        if (!v || Number(v) <= 0) return false;
      }
      return true;
    });
  }, [rows, search, posFilter, codeFilter, minTotal]);

  const totalVisible = filteredRows.length;
  const totalAll = rows.length;

  return (
    <div style={{ padding: 12, maxWidth: "100%" }}>
      <style>{`
        .dutytable-scroll {
          scrollbar-width: thin;
          scrollbar-color: rgba(255,255,255,0.10) rgba(255,255,255,0.03);
        }
        .dutytable-scroll::-webkit-scrollbar { width: 12px; height: 12px; }
        .dutytable-scroll::-webkit-scrollbar-track { background: rgba(255,255,255,0.03); border-radius: 12px; }
        .dutytable-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 12px; border: 3px solid transparent; background-clip: padding-box; }
        .dutytable-scroll::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.14); }

        .card {
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.03);
          border-radius: 8px;
          padding: 10px;
          box-shadow: 0 6px 14px rgba(2,6,23,0.35);
        }

        .pos-badge {
          display: inline-block;
          padding: 4px 8px;
          border-radius: 999px;
          color: white;
          font-weight: 700;
          font-size: 12px;
        }

        thead th {
          position: sticky;
          top: 0;
          background: rgba(0,0,0,0.85);
          z-index: 4;
        }

        .modal-inner {
          width: 820px;
          max-width: 95%;
          max-height: 80vh;
          overflow-y: auto;
          background: #0b1720;
          padding: 16px;
          border-radius: 10px;
        }

        .glass-btn {
          border: 1px solid rgba(255,255,255,0.08);
          background: linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01));
          color: #e6eef3;
          padding: 8px 12px;
          border-radius: 10px;
          cursor: pointer;
        }

        .glass-btn.danger {
          background: linear-gradient(180deg, rgba(239,68,68,0.12), rgba(239,68,68,0.06));
        }

        .glass-btn.primary {
          background: linear-gradient(180deg, rgba(37,99,235,0.12), rgba(37,99,235,0.06));
          border-color: rgba(37,99,235,0.22);
        }

        .filters {
          display:flex;
          gap:8px;
          align-items:center;
          flex-wrap:wrap;
        }

        .small-muted { font-size:12px; color:#9ca3af; }
      `}</style>

      <div className="card">
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
          <div style={{ fontWeight: 700 }}>Crew Non-Availability</div>

          <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} style={{ padding: 6 }} />
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} style={{ padding: 6 }} />
            <button onClick={fetchData} style={glassBtn}>
              Filter
            </button>
            <button
              onClick={() => {
                setFrom("");
                setTo("");
                fetchData();
              }}
              style={glassBtn}
            >
              Clear
            </button>
          </div>
        </div>

        {/* quick add form */}
        <form onSubmit={doAddSingle} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10, flexWrap: "wrap" }}>
          <input placeholder="Crew ID" value={addCrewId} onChange={(e) => setAddCrewId(e.target.value)} style={{ padding: 8 }} />
          <input placeholder="Name" value={addName} onChange={(e) => setAddName(e.target.value)} style={{ padding: 8, minWidth: 180 }} />
          <select value={addPos} onChange={(e) => setAddPos(e.target.value)} style={{ padding: 8 }}>
            <option>CC</option>
            <option>CPT</option>
            <option>FO</option>
            <option>ICC</option>
          </select>
          <select value={addCode} onChange={(e) => setAddCode(e.target.value)} style={{ padding: 8 }}>
            {AVAILABLE_CODES.map((c) => <option key={c}>{c}</option>)}
          </select>
          <input type="date" value={addDate} onChange={(e) => setAddDate(e.target.value)} style={{ padding: 8 }} />
          <button type="submit" style={{ ...glassBtn, opacity: adding ? 0.6 : 1 }} disabled={adding}>
            {adding ? "Adding..." : "Add"}
          </button>
        </form>

        {/* NEW: Filters row (search, pos, code, min total) */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, gap: 8 }}>
          <div className="filters">
            <input placeholder="Search name or crew id" value={search} onChange={(e) => setSearch(e.target.value)} style={{ padding: 8, minWidth: 220 }} />
            <select value={posFilter} onChange={(e) => setPosFilter(e.target.value)} style={{ padding: 8 }}>
              <option value="ALL">POS: All</option>
              <option value="CPT">CPT</option>
              <option value="FO">FO</option>
              <option value="CC">CC</option>
              <option value="ICC">ICC</option>
            </select>

            <select value={codeFilter} onChange={(e) => setCodeFilter(e.target.value)} style={{ padding: 8 }}>
              <option value="ALL">Code: All</option>
              {AVAILABLE_CODES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>

            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div className="small-muted">Min total:</div>
              <input type="number" value={String(minTotal)} onChange={(e) => setMinTotal(Math.max(0, Number(e.target.value || 0)))} style={{ width: 80, padding: 6 }} />
            </div>

            <button onClick={() => { setSearch(""); setPosFilter("ALL"); setCodeFilter("ALL"); setMinTotal(0); }} className="glass-btn" style={{ marginLeft: 6 }}>Reset</button>
          </div>

          <div style={{ textAlign: "right", minWidth: 150 }}>
            <div className="small-muted">Showing</div>
            <div style={{ fontWeight: 700 }}>{totalVisible} / {totalAll}</div>
          </div>
        </div>

        {msg && <div style={{ marginBottom: 8, color: "#cbd5e1" }}>{msg}</div>}

        {/* scrollable table container (like DutyStandby) */}
        <div className="dutytable-scroll" style={{ maxHeight: 420, overflow: "auto", borderRadius: 8 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr>
                <th style={{ padding: 8, textAlign: "left" }}>ID</th>
                <th style={{ padding: 8, textAlign: "left" }}>Name</th>
                <th style={{ padding: 8, textAlign: "left" }}>Crew Totals</th>
                <th style={{ padding: 8 }}>GRND</th>
                <th style={{ padding: 8 }}>LWP</th>
                <th style={{ padding: 8 }}>U/A</th>
                <th style={{ padding: 8 }}>NDOC</th>
                <th style={{ padding: 8 }}>LMC</th>
                <th style={{ padding: 8 }}>RFLT</th>
                <th style={{ padding: 8 }}>NCSL</th>
                <th style={{ padding: 8 }}>CSL</th>
                <th style={{ padding: 8 }}>SL</th>
                <th style={{ padding: 8 }}>EL</th>
                <th style={{ padding: 8 }}>HSO</th>
                <th style={{ padding: 8 }}>MIA</th>
                <th style={{ padding: 8 }}>OFL</th>
                <th style={{ padding: 8 }}>AWOL</th>
                <th style={{ padding: 8 }}>COMP</th>
                <th style={{ padding: 8 }}>INQ</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={19} style={{ padding: 12 }}>
                    Loading...
                  </td>
                </tr>
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={19} style={{ padding: 12 }}>
                    No rows
                  </td>
                </tr>
              ) : (
                filteredRows.map((r) => (
                  <tr key={r.crew_id}>
                    <td style={{ padding: 8 }}>{r.crew_id}</td>
                    <td style={{ padding: 8 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div>
                          <div style={{ fontWeight: 700 }}>{r.name}</div>
                          <div style={{ color: "#9ca3af", fontSize: 12 }}>{/* optional subtitle */}</div>
                        </div>

                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <button className="glass-btn" onClick={() => openCrewEvents(r.crew_id)} title="View events">Events</button>
                          <button className="glass-btn danger" onClick={() => quickDeleteCrew(r.crew_id)} title="Delete crew events" disabled={deleteLoading}>
                            {deleteLoading ? "Deleting..." : "Delete Crew"}
                          </button>
                        </div>
                      </div>

                      <div style={{ marginTop: 8 }}>
                        <span className="pos-badge" style={{ background: posColor(r.pos) }}>{r.pos}</span>
                      </div>
                    </td>
                    <td style={{ padding: 8, textAlign: "center" }}>{r.crew_totals ?? 0}</td>
                    <td style={{ padding: 8, textAlign: "center" }}>{r.GRND ?? 0}</td>
                    <td style={{ padding: 8, textAlign: "center" }}>{r.LWP ?? 0}</td>
                    <td style={{ padding: 8, textAlign: "center" }}>{r.UA ?? 0}</td>
                    <td style={{ padding: 8, textAlign: "center" }}>{r.NDOC ?? 0}</td>
                    <td style={{ padding: 8, textAlign: "center" }}>{r.LMC ?? 0}</td>
                    <td style={{ padding: 8, textAlign: "center" }}>{r.RFLT ?? 0}</td>
                    <td style={{ padding: 8, textAlign: "center" }}>{r.NCSL ?? 0}</td>
                    <td style={{ padding: 8, textAlign: "center" }}>{r.CSL ?? 0}</td>
                    <td style={{ padding: 8, textAlign: "center" }}>{r.SL ?? 0}</td>
                    <td style={{ padding: 8, textAlign: "center" }}>{r.EL ?? 0}</td>
                    <td style={{ padding: 8, textAlign: "center" }}>{r.HSO ?? 0}</td>
                    <td style={{ padding: 8, textAlign: "center" }}>{r.MIA ?? 0}</td>
                    <td style={{ padding: 8, textAlign: "center" }}>{r.OFL ?? 0}</td>
                    <td style={{ padding: 8, textAlign: "center" }}>{r.AWOL ?? 0}</td>
                    <td style={{ padding: 8, textAlign: "center" }}>{r.COMP ?? 0}</td>
                    <td style={{ padding: 8, textAlign: "center" }}>{r.INQ ?? 0}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* EVENTS MODAL */}
      {eventsModalCrew && (
        <div
          onClick={closeEventsModal}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1200,
          }}
        >
          <div onClick={(e) => e.stopPropagation()} className="modal-inner">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <h3 style={{ margin: 0 }}>Events — {eventsModalCrew}</h3>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="glass-btn" onClick={() => openCrewEvents(eventsModalCrew)}>Refresh</button>
                <button className="glass-btn ghost" onClick={closeEventsModal}>Close</button>
              </div>
            </div>

            {eventsLoading ? (
              <div>Loading...</div>
            ) : (
              <>
                <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 10 }}>
                  <thead>
                    <tr>
                      <th style={{ padding: 8 }}>ID</th>
                      <th style={{ padding: 8 }}>Date</th>
                      <th style={{ padding: 8 }}>Code</th>
                      <th style={{ padding: 8 }}>Pos</th>
                      <th style={{ padding: 8 }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {crewEvents.length === 0 ? (
                      <tr><td colSpan={5} style={{ padding: 12 }}>No events</td></tr>
                    ) : crewEvents.map((ev) => (
                      <tr key={ev.id}>
                        <td style={{ padding: 8 }}>{ev.id}</td>
                        <td style={{ padding: 8 }}>{ev.event_date}</td>
                        <td style={{ padding: 8 }}>{ev.code}</td>
                        <td style={{ padding: 8 }}>{ev.pos}</td>
                        <td style={{ padding: 8 }}>
                          <button className="glass-btn" onClick={() => openEditEvent(ev)} style={{ marginRight: 8 }}>Edit</button>
                          <button className="glass-btn danger" onClick={() => deleteEvent(ev.id)}>Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* inline editing panel */}
                {editingEvent && (
                  <div style={{ marginTop: 8, padding: 8, background: "rgba(255,255,255,0.01)", borderRadius: 8 }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                      <div>
                        <div style={{ fontSize: 12, color: "#9ca3af" }}>ID</div>
                        <div style={{ fontWeight: 700 }}>{editingEvent.id}</div>
                      </div>

                      <div>
                        <div style={{ fontSize: 12, color: "#9ca3af" }}>Date</div>
                        <input type="date" value={editingEvent.event_date} onChange={(e) => setEditingEvent({ ...editingEvent, event_date: e.target.value })} />
                      </div>

                      <div>
                        <div style={{ fontSize: 12, color: "#9ca3af" }}>Code</div>
                        <select value={editingEvent.code} onChange={(e) => setEditingEvent({ ...editingEvent, code: e.target.value })}>
                          {AVAILABLE_CODES.map((c) => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>

                      <div>
                        <div style={{ fontSize: 12, color: "#9ca3af" }}>Pos</div>
                        <select value={editingEvent.pos} onChange={(e) => setEditingEvent({ ...editingEvent, pos: e.target.value })}>
                          <option>CC</option>
                          <option>CPT</option>
                          <option>FO</option>
                          <option>ICC</option>
                        </select>
                      </div>

                      <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                        <button className="glass-btn" onClick={() => setEditingEvent(null)}>Cancel</button>
                        <button className="glass-btn primary" onClick={saveEditingEvent}>Save</button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
