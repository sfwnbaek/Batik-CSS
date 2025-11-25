// src/components/InsertMetricForm.tsx
import React, { useState } from "react";

type Props = { onAdded?: () => void; apiBase?: string; endpoint?: string };

function hhmmssToSeconds(hhmmss: string) {
  if (!hhmmss) return 0;
  const parts = hhmmss.split(":").map((p) => parseInt(p, 10) || 0);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 3600 + parts[1] * 60;
  return parts[0];
}

export default function InsertMetricForm({ onAdded, apiBase = "/batik-api/api", endpoint }: Props) {
  const [crewId, setCrewId] = useState<string>("");
  const [name, setName] = useState<string>("");
  const [base, setBase] = useState<string>("KUL");
  const [ac, setAc] = useState<string>("M738");
  const [pos, setPos] = useState<string>("CC");
  const [reportDate, setReportDate] = useState<string>("");
  const [bhText, setBhText] = useState<string>("00:00:00");
  const [sectors, setSectors] = useState<string>("");
  const [off, setOff] = useState<string>("");
  const [lve, setLve] = useState<string>("");
  const [naCodes, setNaCodes] = useState<string>("");
  const [trgCodes, setTrgCodes] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    setMsg(null);
    if (!reportDate) return setMsg("Please pick a report date");
    if (!crewId && !name) return setMsg("Crew ID or Name required");

    const payload: any = {
      crew_id: crewId ? Number(crewId) : null,
      name: name || null,
      base,
      ac,
      pos,
      report_date: reportDate,
      bh_text: bhText,
      bh_seconds: hhmmssToSeconds(bhText),
      sectors: sectors ? Number(sectors) : 0,
      off: off ? Number(off) : 0,
      lve: lve ? Number(lve) : 0,
      na_codes: naCodes ? Number(naCodes) : 0,
      trg_codes: trgCodes ? Number(trgCodes) : 0,
    };

    setLoading(true);
    try {
      // prefer explicit endpoint prop, then apiBase that contains .php, otherwise append default file
      const url = endpoint
        ? endpoint
        : apiBase.trim().toLowerCase().endsWith(".php")
        ? apiBase
        : `${apiBase.replace(/\/+$/, "")}/insert_metric_330.php`;

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch { data = { raw: text }; }

      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);

      setMsg("Saved");
      setCrewId("");
      setName("");
      setBhText("00:00:00");
      onAdded && onAdded();
    } catch (err: any) {
      setMsg("Save failed: " + (err.message || String(err)));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
      <input placeholder="Crew ID" value={crewId} onChange={(e) => setCrewId(e.target.value)} style={{ padding: 6 }} />
      <input placeholder="Name (if new)" value={name} onChange={(e) => setName(e.target.value)} style={{ padding: 6, minWidth: 180 }} />
      <select value={base} onChange={(e) => setBase(e.target.value)} style={{ padding: 6 }}>
        <option>KUL</option>
        <option>CGK</option>
        <option>SZB</option>
      </select>
      <input placeholder="AC" value={ac} onChange={(e) => setAc(e.target.value)} style={{ padding: 6, width: 90 }} />
      <select value={pos} onChange={(e) => setPos(e.target.value)} style={{ padding: 6 }}>
        <option>CP</option>
        <option>FO</option>
        <option>ICC</option>
        <option>CC</option>
      </select>
      <input type="date" value={reportDate} onChange={(e) => setReportDate(e.target.value)} style={{ padding: 6 }} />
      <input placeholder="BH HH:MM:SS" value={bhText} onChange={(e) => setBhText(e.target.value)} style={{ padding: 6, width: 110 }} />
      <input placeholder="Sectors" value={sectors} onChange={(e) => setSectors(e.target.value)} style={{ padding: 6, width: 80 }} />
      <input placeholder="OFF" value={off} onChange={(e) => setOff(e.target.value)} style={{ padding: 6, width: 80 }} />
      <input placeholder="LVE" value={lve} onChange={(e) => setLve(e.target.value)} style={{ padding: 6, width: 80 }} />
      <input placeholder="N/A" value={naCodes} onChange={(e) => setNaCodes(e.target.value)} style={{ padding: 6, width: 80 }} />
      <input placeholder="TRG" value={trgCodes} onChange={(e) => setTrgCodes(e.target.value)} style={{ padding: 6, width: 80 }} />
      <button type="submit" disabled={loading} style={{ padding: "8px 12px" }}>{loading ? "Saving..." : "Add"}</button>
      {msg && <div style={{ marginLeft: 8, color: "#cbd5e1" }}>{msg}</div>}
    </form>
  );
}
