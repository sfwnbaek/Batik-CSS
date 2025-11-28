// src/components/CrewNonAvailability.tsx
import React, { useEffect, useMemo, useState } from "react";
import "../components/summary-glass.css"; // ⬅️ glass UI

const API_BASE = "http://localhost/batik-api/api"; // adjust to your API base
const PAGE_SIZE = 6; // show 6 crew per page

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

/** Simple glass button style object (inline) */
const glassBtn: React.CSSProperties = {
  padding: "6px 10px",
  borderRadius: 10,
  border: "1px solid rgba(255,255,255,0.08)",
  background:
    "linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))",
  color: "#e6eef3",
  cursor: "pointer",
  boxShadow: "0 6px 18px rgba(2,6,23,0.45)",
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
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
      2,
      "0"
    )}-${String(d.getDate()).padStart(2, "0")}`;
  });
  const [adding, setAdding] = useState(false);

  // event modal / editing state
  const [eventsModalCrew, setEventsModalCrew] = useState<string | null>(null);
  const [crewEvents, setCrewEvents] = useState<EventRow[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventRow | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // filtering UI state
  const [search, setSearch] = useState<string>("");
  const [posFilter, setPosFilter] = useState<string>("ALL");
  const [codeFilter, setCodeFilter] = useState<string>("ALL");
  const [minTotal, setMinTotal] = useState<number>(0);

  // pagination state
  const [page, setPage] = useState<number>(1);

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
      const res = await fetch(
        `${API_BASE}/crew_nonavailability_summary.php?${params.toString()}`,
        {
          method: "GET",
        }
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
        throw new Error(
          `Unexpected server response: ${text.substring(0, 300)}`
        );
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
      const res = await fetch(
        `${API_BASE}/crew_nonavailability_events.php?crew_id=${encodeURIComponent(
          crewId
        )}&${params.toString()}`
      );
      const text = await res.text();
      let data: any;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(`Unexpected: ${text.substring(0, 300)}`);
      }
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
      const payload: any = {
        id: editingEvent.id,
        code: editingEvent.code,
        pos: editingEvent.pos,
        name: editingEvent.name,
        event_date: editingEvent.event_date,
      };
      const res = await fetch(`${API_BASE}/update_nonavail.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || JSON.stringify(data));
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
      if (eventsModalCrew) await openCrewEvents(eventsModalCrew);
      fetchData();
      setMsg("Deleted.");
    } catch (err: any) {
      alert("Delete failed: " + (err.message || String(err)));
    } finally {
      setDeleteLoading(false);
    }
  }

  async function quickDeleteCrew(crewId: string) {
    if (
      !confirm(
        `Delete all events for ${crewId} in current date range? This cannot be undone.`
      )
    )
      return;
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
      if (q) {
        const found =
          (r.name ?? "").toLowerCase().includes(q) ||
          (r.crew_id ?? "").toLowerCase().includes(q);
        if (!found) return false;
      }
      if (
        posFilter !== "ALL" &&
        (r.pos ?? "").toUpperCase() !== posFilter.toUpperCase()
      )
        return false;
      if ((r.crew_totals || 0) < minTotal) return false;

      if (codeFilter !== "ALL") {
        const key = codeFilter === "U/A" ? "UA" : codeFilter;
        const v = (r as any)[key];
        if (!v || Number(v) <= 0) return false;
      }
      return true;
    });
  }, [rows, search, posFilter, codeFilter, minTotal]);

  const totalAll = rows.length;
  const totalVisible = filteredRows.length;

  // reset to first page when filters or data change
  useEffect(() => {
    setPage(1);
  }, [search, posFilter, codeFilter, minTotal, rows.length]);

  // pagination: slice filteredRows
  const pageCount = Math.max(1, Math.ceil(totalVisible / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const endIndex = startIndex + PAGE_SIZE;
  const pagedRows = filteredRows.slice(startIndex, endIndex);

  return (
    <div className="sg-root">
      <style>{`
        .dutytable-scroll {
          scrollbar-width: thin;
          scrollbar-color: rgba(255,255,255,0.10) rgba(255,255,255,0.03);
        }
        .dutytable-scroll::-webkit-scrollbar { width: 12px; height: 12px; }
        .dutytable-scroll::-webkit-scrollbar-track {
          background: rgba(255,255,255,0.03);
          border-radius: 12px;
        }
        .dutytable-scroll::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.08);
          border-radius: 12px;
          border: 3px solid transparent;
          background-clip: padding-box;
        }
        .dutytable-scroll::-webkit-scrollbar-thumb:hover {
          background: rgba(255,255,255,0.14);
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
          background: rgba(10,16,26,0.96);
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
          background: linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01));
          color: #e6eef3;
          padding: 8px 12px;
          border-radius: 10px;
          cursor: pointer;
          box-shadow: 0 4px 14px rgba(2,6,23,0.45);
        }
        .glass-btn.primary {
          background: linear-gradient(180deg, rgba(37,99,235,0.14), rgba(37,99,235,0.06));
          border-color: rgba(37,99,235,0.22);
        }
        .glass-btn.danger {
          background: linear-gradient(180deg, rgba(239,68,68,0.16), rgba(239,68,68,0.08));
          border-color: rgba(239,68,68,0.24);
        }

        .filters {
          display:flex;
          gap:8px;
          align-items:center;
          flex-wrap:wrap;
        }

        .small-muted { font-size:12px; color:#9ca3af; }

        .pagination {
          display:flex;
          align-items:center;
          justify-content:flex-end;
          gap:8px;
          margin-top:8px;
          font-size:12px;
          color:#cbd5e1;
        }
      `}</style>

      <div
        style={{
          maxWidth: "1180px",
          margin: "0 auto",
          padding: "14px 16px",
        }}
      >
        {/* Header */}
        <div className="sg-header" style={{ marginBottom: 12 }}>
          <h1>Crew Non-Availability</h1>
        </div>

        {/* Main glass card */}
        <div className="sg-card">
          {/* Card strip */}
          <div className="sg-strip">
            <div>Non-Availability Overview</div>
            <div style={{ fontSize: 12, opacity: 0.9 }}>
              {from || "All dates"} {to ? `→ ${to}` : ""} • {totalVisible} of{" "}
              {totalAll} crew
            </div>
          </div>

          {/* Date range + filters in one box */}
          <div
            style={{
              marginTop: 10,
              marginBottom: 10,
              padding: 10,
              borderRadius: 10,
              background: "rgba(15,23,42,0.96)",
              border: "1px solid rgba(148,163,184,0.45)",
              boxShadow: "0 8px 20px rgba(15,23,42,0.65)",
            }}
          >
            {/* Top row: date range */}
            <div
              style={{
                display: "flex",
                gap: 8,
                alignItems: "center",
                flexWrap: "wrap",
                marginBottom: 8,
              }}
            >
              <div className="sg-sub">Date range</div>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                style={{
                  padding: 6,
                  borderRadius: 8,
                  border: "1px solid rgba(148,163,184,0.5)",
                  background: "rgba(15,23,42,0.95)",
                  color: "#e6eef7",
                  fontSize: 13,
                }}
              />
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                style={{
                  padding: 6,
                  borderRadius: 8,
                  border: "1px solid rgba(148,163,184,0.5)",
                  background: "rgba(15,23,42,0.95)",
                  color: "#e6eef7",
                  fontSize: 13,
                }}
              />
              <button onClick={fetchData} style={glassBtn}>
                Apply
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

              <div
                style={{
                  marginLeft: "auto",
                  fontSize: 12,
                  color: "#9ca3af",
                }}
              >
                {loading ? "Loading…" : "Updated"}
              </div>
            </div>

            {/* Second row: filters */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 10,
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <div className="filters">
                <input
                  placeholder="Search name or crew id"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{
                    padding: 3,
                    minWidth: 220,
                    borderRadius: 8,
                    border: "1px solid rgba(148,163,184,0.6)",
                    background: "rgba(15,23,42,0.95)",
                    color: "#e6eef7",
                  }}
                />
                <select
                  value={posFilter}
                  onChange={(e) => setPosFilter(e.target.value)}
                  style={{
                    padding: 3,
                    borderRadius: 8,
                    border: "1px solid rgba(148,163,184,0.6)",
                  }}
                >
                  <option value="ALL">POS: All</option>
                  <option value="CPT">CPT</option>
                  <option value="FO">FO</option>
                  <option value="CC">CC</option>
                  <option value="ICC">ICC</option>
                </select>

                <select
                  value={codeFilter}
                  onChange={(e) => setCodeFilter(e.target.value)}
                  style={{
                    padding: 3,
                    borderRadius: 8,
                    border: "1px solid rgba(148,163,184,0.6)",
                  }}
                >
                  <option value="ALL">Code: All</option>
                  {AVAILABLE_CODES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>

                <div
                  style={{ display: "flex", alignItems: "center", gap: 6 }}
                >
                  <div className="small-muted">Min total:</div>
                  <input
                    type="number"
                    value={String(minTotal)}
                    onChange={(e) =>
                      setMinTotal(Math.max(0, Number(e.target.value || 0)))
                    }
                    style={{
                      width: 80,
                      padding: 6,
                      borderRadius: 8,
                      border: "1px solid rgba(148,163,184,0.6)",
                      background: "rgba(15,23,42,0.95)",
                      color: "#e6eef7",
                      fontSize: 13,
                    }}
                  />
                </div>

                <button
                  onClick={() => {
                    setSearch("");
                    setPosFilter("ALL");
                    setCodeFilter("ALL");
                    setMinTotal(0);
                  }}
                  className="glass-btn"
                  style={{ marginLeft: 4 }}
                >
                  Reset filters
                </button>
              </div>

              <div style={{ textAlign: "right", minWidth: 150 }}>
                <div className="small-muted">Crew in view</div>
                <div style={{ fontWeight: 700 }}>
                  {totalVisible} / {totalAll}
                </div>
              </div>
            </div>
          </div>

          {/* Quick add form */}
          <div
            style={{
              marginTop: 4,
              padding: 5,
              borderRadius: 10,
              background: "rgba(15,23,42,0.9)",
              border: "1px solid rgba(148,163,184,0.35)",
              boxShadow: "0 6px 16px rgba(15,23,42,0.65)",
            }}
          >
            <form
              onSubmit={doAddSingle}
              style={{
                display: "flex",
                gap: 8,
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <input
                placeholder="Crew ID"
                value={addCrewId}
                onChange={(e) => setAddCrewId(e.target.value)}
                style={{
                  padding: 3,
                  borderRadius: 8,
                  border: "1px solid rgba(148,163,184,0.5)",
                  minWidth: 90,
                }}
              />
              <input
                placeholder="Name"
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
                style={{
                  padding: 3,
                  borderRadius: 8,
                  border: "1px solid rgba(148,163,184,0.5)",
                  minWidth: 180,
                }}
              />
              <select
                value={addPos}
                onChange={(e) => setAddPos(e.target.value)}
                style={{
                  padding: 3,
                  borderRadius: 8,
                  border: "1px solid rgba(148,163,184,0.5)",
                }}
              >
                <option>CC</option>
                <option>CPT</option>
                <option>FO</option>
                <option>ICC</option>
              </select>
              <select
                value={addCode}
                onChange={(e) => setAddCode(e.target.value)}
                style={{
                  padding: 3,
                  borderRadius: 8,
                  border: "1px solid rgba(148,163,184,0.5)",
                }}
              >
                {AVAILABLE_CODES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
              <input
                type="date"
                value={addDate}
                onChange={(e) => setAddDate(e.target.value)}
                style={{
                  padding: 3,
                  borderRadius: 8,
                  border: "1px solid rgba(148,163,184,0.5)",
                }}
              />
              <button
                type="submit"
                style={{
                  ...glassBtn,
                  opacity: adding ? 0.6 : 1,
                  minWidth: 90,
                }}
                disabled={adding}
              >
                {adding ? "Adding…" : "Add"}
              </button>
            </form>
          </div>

          {msg && (
            <div style={{ marginBottom: 8, color: "#cbd5e1", fontSize: 13 }}>
              {msg}
            </div>
          )}

          {/* Table */}
          <div
            className="dutytable-scroll"
            style={{
              maxHeight: 420,
              overflow: "auto",
              borderRadius: 10,
              marginTop: 4,
            }}
          >
            <table
              className="sg-table"
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 13,
              }}
            >
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name / Actions</th>
                  <th style={{ textAlign: "center" }}>Total</th>
                  <th>GRND</th>
                  <th>LWP</th>
                  <th>U/A</th>
                  <th>NDOC</th>
                  <th>LMC</th>
                  <th>RFLT</th>
                  <th>NCSL</th>
                  <th>CSL</th>
                  <th>SL</th>
                  <th>EL</th>
                  <th>HSO</th>
                  <th>MIA</th>
                  <th>OFL</th>
                  <th>AWOL</th>
                  <th>COMP</th>
                  <th>INQ</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={19} style={{ padding: 12 }}>
                      <span className="sg-small">Loading…</span>
                    </td>
                  </tr>
                ) : totalVisible === 0 ? (
                  <tr>
                    <td colSpan={19} style={{ padding: 12 }}>
                      <span className="sg-small">No rows</span>
                    </td>
                  </tr>
                ) : (
                  pagedRows.map((r) => (
                    <tr key={r.crew_id}>
                      <td className="sg-mono" style={{ padding: 3 }}>
                        {r.crew_id}
                      </td>
                      <td style={{ padding: 3 }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 12,
                          }}
                        >
                          <div>
                            <div style={{ fontWeight: 700 }}>{r.name}</div>
                            <div
                              style={{
                                marginTop: 4,
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                              }}
                            >
                              <span
                                className="pos-badge"
                                style={{ background: posColor(r.pos) }}
                              >
                                {r.pos}
                              </span>
                            </div>
                          </div>
                          <div
                            style={{
                              display: "flex",
                              gap: 8,
                              alignItems: "center",
                            }}
                          >
                            <button
                              className="glass-btn"
                              onClick={() => openCrewEvents(r.crew_id)}
                              title="View events"
                            >
                              Events
                            </button>
                            <button
                              className="glass-btn danger"
                              onClick={() => quickDeleteCrew(r.crew_id)}
                              title="Delete crew events"
                              disabled={deleteLoading}
                            >
                              {deleteLoading ? "Deleting…" : "Delete Crew"}
                            </button>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: 3, textAlign: "center" }}>
                        {r.crew_totals ?? 0}
                      </td>
                      <td style={{ padding: 3, textAlign: "center" }}>
                        {r.GRND ?? 0}
                      </td>
                      <td style={{ padding: 3, textAlign: "center" }}>
                        {r.LWP ?? 0}
                      </td>
                      <td style={{ padding: 3, textAlign: "center" }}>
                        {r.UA ?? 0}
                      </td>
                      <td style={{ padding: 3, textAlign: "center" }}>
                        {r.NDOC ?? 0}
                      </td>
                      <td style={{ padding: 3, textAlign: "center" }}>
                        {r.LMC ?? 0}
                      </td>
                      <td style={{ padding: 3, textAlign: "center" }}>
                        {r.RFLT ?? 0}
                      </td>
                      <td style={{ padding: 3, textAlign: "center" }}>
                        {r.NCSL ?? 0}
                      </td>
                      <td style={{ padding: 3, textAlign: "center" }}>
                        {r.CSL ?? 0}
                      </td>
                      <td style={{ padding: 3, textAlign: "center" }}>
                        {r.SL ?? 0}
                      </td>
                      <td style={{ padding: 3, textAlign: "center" }}>
                        {r.EL ?? 0}
                      </td>
                      <td style={{ padding: 3, textAlign: "center" }}>
                        {r.HSO ?? 0}
                      </td>
                      <td style={{ padding: 3, textAlign: "center" }}>
                        {r.MIA ?? 0}
                      </td>
                      <td style={{ padding: 3, textAlign: "center" }}>
                        {r.OFL ?? 0}
                      </td>
                      <td style={{ padding: 3, textAlign: "center" }}>
                        {r.AWOL ?? 0}
                      </td>
                      <td style={{ padding: 3, textAlign: "center" }}>
                        {r.COMP ?? 0}
                      </td>
                      <td style={{ padding: 3, textAlign: "center" }}>
                        {r.INQ ?? 0}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination controls */}
          {pageCount > 1 && (
            <div className="pagination">
              <span>
                Page {currentPage} of {pageCount}
              </span>
              <button
                className="glass-btn"
                disabled={currentPage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Prev
              </button>
              <button
                className="glass-btn"
                disabled={currentPage >= pageCount}
                onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
              >
                Next
              </button>
            </div>
          )}
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
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 8,
              }}
            >
              <h3 style={{ margin: 0 }}>Events — {eventsModalCrew}</h3>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  className="glass-btn"
                  onClick={() => openCrewEvents(eventsModalCrew)}
                >
                  Refresh
                </button>
                <button className="glass-btn" onClick={closeEventsModal}>
                  Close
                </button>
              </div>
            </div>

            {eventsLoading ? (
              <div>Loading…</div>
            ) : (
              <>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    marginBottom: 10,
                    fontSize: 13,
                  }}
                >
                  <thead>
                    <tr>
                      <th style={{ padding: 3 }}>ID</th>
                      <th style={{ padding: 3 }}>Date</th>
                      <th style={{ padding: 3 }}>Code</th>
                      <th style={{ padding: 3 }}>Pos</th>
                      <th style={{ padding: 3 }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {crewEvents.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ padding: 12 }}>
                          No events
                        </td>
                      </tr>
                    ) : (
                      crewEvents.map((ev) => (
                        <tr key={ev.id}>
                          <td style={{ padding: 3 }}>{ev.id}</td>
                          <td style={{ padding: 3 }}>{ev.event_date}</td>
                          <td style={{ padding: 3 }}>{ev.code}</td>
                          <td style={{ padding: 3 }}>{ev.pos}</td>
                          <td style={{ padding: 3 }}>
                            <button
                              className="glass-btn"
                              onClick={() => openEditEvent(ev)}
                              style={{ marginRight: 8 }}
                            >
                              Edit
                            </button>
                            <button
                              className="glass-btn danger"
                              onClick={() => deleteEvent(ev.id)}
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>

                {/* inline editing panel */}
                {editingEvent && (
                  <div
                    style={{
                      marginTop: 8,
                      padding: 3,
                      background: "rgba(15,23,42,0.9)",
                      borderRadius: 8,
                      border: "1px solid rgba(148,163,184,0.35)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        gap: 8,
                        alignItems: "center",
                        flexWrap: "wrap",
                      }}
                    >
                      <div>
                        <div
                          style={{ fontSize: 12, color: "#9ca3af" }}
                        >
                          ID
                        </div>
                        <div style={{ fontWeight: 700 }}>
                          {editingEvent.id}
                        </div>
                      </div>

                      <div>
                        <div
                          style={{ fontSize: 12, color: "#9ca3af" }}
                        >
                          Date
                        </div>
                        <input
                          type="date"
                          value={editingEvent.event_date}
                          onChange={(e) =>
                            setEditingEvent({
                              ...editingEvent,
                              event_date: e.target.value,
                            })
                          }
                        />
                      </div>

                      <div>
                        <div
                          style={{ fontSize: 12, color: "#9ca3af" }}
                        >
                          Code
                        </div>
                        <select
                          value={editingEvent.code}
                          onChange={(e) =>
                            setEditingEvent({
                              ...editingEvent,
                              code: e.target.value,
                            })
                          }
                        >
                          {AVAILABLE_CODES.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <div
                          style={{ fontSize: 12, color: "#9ca3af" }}
                        >
                          Pos
                        </div>
                        <select
                          value={editingEvent.pos}
                          onChange={(e) =>
                            setEditingEvent({
                              ...editingEvent,
                              pos: e.target.value,
                            })
                          }
                        >
                          <option>CC</option>
                          <option>CPT</option>
                          <option>FO</option>
                          <option>ICC</option>
                        </select>
                      </div>

                      <div
                        style={{
                          marginLeft: "auto",
                          display: "flex",
                          gap: 8,
                        }}
                      >
                        <button
                          className="glass-btn"
                          onClick={() => setEditingEvent(null)}
                        >
                          Cancel
                        </button>
                        <button
                          className="glass-btn primary"
                          onClick={saveEditingEvent}
                        >
                          Save
                        </button>
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
