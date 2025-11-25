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

    // UI: show small list (limit 4 items) per date
    const limit = 4;

    return (
        <div style={{ display: "flex", gap: 12, alignItems: "stretch", width: "100%" }}>
        <style>{`
            .glass-card {
            background: linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01));
            border: 1px solid rgba(255,255,255,0.04);
            border-radius: 10px;
            padding: 12px;
            box-shadow: 0 8px 18px rgba(2,6,23,0.28);
            min-width: 0;
            }
            .glass-btn {
            border: 1px solid rgba(255,255,255,0.08);
            background: linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01));
            color: #e6eef3;
            padding: 6px 10px;
            border-radius: 8px;
            cursor: pointer;
            }
            .mini-list { display: flex; flex-direction: column; gap: 8; margin-top: 8px; }
            .mini-item { display: flex; gap: 8; align-items: center; justify-content: space-between; }
            .mini-left { display:flex; gap:8; align-items:center; min-width:0; }
            .pos-pill { padding:4px 8px; border-radius:999px; color:white; font-weight:700; font-size:12px; }
            .muted { color: #9aa4ad; font-size: 12px; }
        `}</style>

        {/* Header controls (single row spanning 3 columns) */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
            <div>
                <strong style={{ fontSize: 16 }}>Duty / Standby</strong>
                <div style={{ color: "#9aa4ad", fontSize: 12 }}>Yesterday / Today / Tomorrow</div>
            </div>

            <div style={{ display: "flex", gap: 8 }}>
                <button className="glass-btn" onClick={() => refreshAll()}>Refresh</button>
                <button
                className="glass-btn"
                onClick={() => {
                    // link to full duty standby page in app
                    window.location.href = "/duty-standby";
                }}
                >
                View All
                </button>
            </div>
            </div>

            {/* Three columns */}
            <div style={{ display: "flex", gap: 12 }}>
            {dates.map(({ key, label, date }) => {
                const rows = data[key] || [];
                const isLoading = !!loading[key];
                const err = error[key];

                return (
                <div key={key} className="glass-card" style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                        <div style={{ fontWeight: 800 }}>{label}</div>
                        <div className="muted">{date}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 14, fontWeight: 700 }}>{rows.length}</div>
                        <div className="muted" style={{ fontSize: 12 }}>items</div>
                    </div>
                    </div>

                    <div className="mini-list" style={{ marginTop: 8 }}>
                    {isLoading && <div className="muted">Loading…</div>}
                    {err && <div style={{ color: "salmon" }}>{err}</div>}
                    {!isLoading && !err && rows.length === 0 && <div className="muted">No rows</div>}

                    {!isLoading &&
                        !err &&
                        rows.slice(0, limit).map((r) => (
                        <div key={r.id ?? `${r.crew_id}-${r.sby_code}`} className="mini-item">
                            <div className="mini-left">
                            <div style={{ width: 56, textAlign: "left", fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {r.crew_id ?? "—"}
                            </div>
                            <div style={{ minWidth: 0 }}>
                                <div style={{ fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name ?? "—"}</div>
                                <div className="muted" style={{ marginTop: 2 }}>{r.sby_code ?? ""} • {r.mc_code ?? ""}</div>
                            </div>
                            </div>

                            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                            <div className="pos-pill" style={{ background: posBadgeColor(r.crew_pos) }}>{r.crew_pos ?? "—"}</div>
                            <div className="muted" style={{ marginTop: 6 }}>{formatDateIso(r.rep_date ?? r.rep_datetime)}</div>
                            </div>
                        </div>
                        ))}

                    {/* + more link */}
                    {!isLoading && rows.length > limit && (
                        <div style={{ marginTop: 4 }}>
                        <button
                            className="glass-btn"
                            onClick={() => {
                            // go to the duty page with the date filter applied
                            window.location.href = `/duty-standby?date=${encodeURIComponent(date)}`;
                            }}
                            style={{ width: "100%" }}
                        >
                            +{rows.length - limit} more
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
