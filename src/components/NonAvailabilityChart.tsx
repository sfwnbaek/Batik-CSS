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
  "GRND", "LWP", "U/A", "NDOC", "LMC", "RFLT", "NCSL",
  "CSL", "SL", "EL", "HSO", "MIA", "OFL", "AWOL", "COMP", "INQ"
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
  // counts present as numbers or strings — normalize when loading
  [k: string]: any;
};

export default function NonAvailabilityChart(): JSX.Element {
  const [rows, setRows] = useState<SummaryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [posFilter, setPosFilter] = useState<typeof POSITIONS[number]>('ALL');

  useEffect(() => {
    fetchSummary();
  }, []);

  async function fetchSummary() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/crew_nonavailability_summary.php`);
      const text = await res.text();
      let data: any;
      try { data = JSON.parse(text); } catch { throw new Error(`Unexpected response: ${text.substring(0,300)}`); }
      if (!res.ok) {
        if (data.error) throw new Error(data.error);
        throw new Error(`Server responded ${res.status}`);
      }
      // normalize numeric counts
      const normalized: SummaryRow[] = (data || []).map((r: any) => {
        const out: SummaryRow = { crew_id: r.crew_id ?? "", name: r.name ?? "", pos: (r.pos ?? "").toUpperCase() };
        for (const c of CODES) {
          // some backends may use "U/A" vs "UA" or different casing
          const val = r[c] ?? r[c.replace("/", "")] ?? r[c.replace("/", "_")] ?? 0;
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
      if (posFilter !== 'ALL' && (r.pos ?? '').toUpperCase() !== posFilter) continue;
      for (const c of CODES) {
        const v = Number(r[c] ?? 0);
        totals[c] += isNaN(v) ? 0 : v;
      }
    }
    // convert to pie data (omit zero values)
    const data = CODES.map((c) => ({ name: c, value: totals[c] })).filter(d => d.value > 0);
    // sort descending so pie looks nicer
    data.sort((a,b) => b.value - a.value);
    return { totals, data };
  }, [rows, posFilter]);

  // if nothing to show, display placeholder
  if (loading) {
    return (
      <div style={{ padding: 12, background: "rgba(255,255,255,0.02)", borderRadius: 8 }}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>Non-Availability (by code)</div>
        <div>Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 12, background: "rgba(255,255,255,0.02)", borderRadius: 8 }}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>Non-Availability (by code)</div>
        <div style={{ color: "salmon" }}>{error}</div>
      </div>
    );
  }

  // total count (for label/percent)
  const totalCount = aggregated.data.reduce((s, d) => s + d.value, 0);

  return (
    <div style={{ background: "rgba(255,255,255,0.02)", padding: 12, borderRadius: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
        <div style={{ fontWeight: 700 }}>Non-Availability Chart</div>

        <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
          <label style={{ fontSize: 13, color: "#9aa4ad" }}>Position</label>
          <select value={posFilter} onChange={(e) => setPosFilter(e.target.value as any)} style={{ padding: 6 }}>
            {POSITIONS.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, alignItems: "center", minHeight: 260 }}>
        <div style={{ flex: "0 0 420px", height: 300 }}>
          {aggregated.data.length === 0 ? (
            <div style={{ padding: 12, color: "#9ca3af" }}>No non-availability events for selected position / range.</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={aggregated.data}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  innerRadius={40}
                  label={(entry) => `${entry.name} (${Math.round((entry.value / totalCount) * 100)}%)`}
                >
                  {aggregated.data.map((entry, idx) => {
                    const color = CODE_COLORS[entry.name] ?? ['#8884d8','#82ca9d','#ffc658'][idx % 3];
                    return <Cell key={`cell-${idx}`} fill={color} />;
                  })}
                </Pie>
                <Tooltip formatter={(v: any) => [v, "count"]} />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* summary list / legend details */}
        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ fontSize: 13, color: "#9ca3af", marginBottom: 6 }}>
            Total events: <strong>{totalCount}</strong>
            {posFilter !== 'ALL' && <span style={{ marginLeft: 12 }}>Position: <strong>{posFilter}</strong></span>}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
            {aggregated.data.map((d) => (
              <div key={d.name} style={{ display: "flex", alignItems: "center", gap: 8, padding: 6, background: "rgba(0,0,0,0.02)", borderRadius: 6 }}>
                <div style={{ width: 10, height: 10, background: CODE_COLORS[d.name] ?? "#777", borderRadius: 2 }} />
                <div style={{ fontWeight: 700 }}>{d.name}</div>
                <div style={{ marginLeft: "auto", color: "#9ca3af" }}>{d.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
