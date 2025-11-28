// src/pages/Dashboard.tsx
import React from "react";
import Summary737 from "../components/Summary737";
import Summary330 from "../components/Summary330";
import DutyStandbySummary from "../components/DutyStandbySummary";
import NonAvailabilityChart from "../components/NonAvailabilityChart"; // <- added

export default function Dashboard(): JSX.Element {
  return (
    <div
      style={{
        height: "85vh",
        overflow: "hidden", // ← prevents page-level scrollbars
        display: "flex",
        flexDirection: "column",
        background: "linear-gradient(180deg,#071826,#081821)",
        color: "#e6eef3",
      }}
    >
      {/* Scrollbar styling (same as Standby view) */}
      <style>{`
        .dash-scroll {
          scrollbar-width: thin;
          scrollbar-color: rgba(255,255,255,0.10) rgba(255,255,255,0.03);
        }
        .dash-scroll::-webkit-scrollbar { width: 12px; }
        .dash-scroll::-webkit-scrollbar-track {
          background: rgba(255,255,255,0.03);
          border-radius: 12px;
        }
        .dash-scroll::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.08);
          border-radius: 12px;
          border: 3px solid transparent;
          background-clip: padding-box;
        }
        .dash-scroll::-webkit-scrollbar-thumb:hover {
          background: rgba(255,255,255,0.14);
        }
      `}</style>

      {/* CENTER WRAPPER */}
      <div
        style={{
          flex: 1,
          display: "flex",
          justifyContent: "center",
          padding: 16,
          minHeight: 0, // important: keeps children from pushing downward
          boxSizing: "border-box",
        }}
      >
        {/* FIXED HEIGHT SCROLLING CONTAINER */}
        <div
          className="dash-scroll"
          style={{
            width: "100%",
            maxWidth: 1200,
            height: "100%", // ← fill available height
            background: "rgba(11,23,32,0.6)",
            border: "1px solid rgba(255,255,255,0.03)",
            borderRadius: 12,
            boxShadow: "0 10px 30px rgba(2,6,23,0.45)",
            padding: 12,
            overflowY: "auto", // ← only this scrolls
            overflowX: "hidden", // ← removes bottom scrollbar
            boxSizing: "border-box",
          }}
        >
          {/* --- Dashboard content --- */}
          <h1 style={{ marginTop: 0 }}>Dashboard</h1>

          {/* Duty standby summary */}
          <div style={{ marginTop: 16, marginBottom: 20 }}>
            <DutyStandbySummary />
          </div>

          {/* 737 and 330 summaries stacked vertically */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            <Summary737 />
            <Summary330 />
          </div>

          {/* Non-availability chart: placed after flight rosters with spacing */}
          <div style={{ marginTop: 18, marginBottom: 8 }}>
            <NonAvailabilityChart />
          </div>

          {/* ... other widgets ... */}
        </div>
      </div>
    </div>
  );
}
