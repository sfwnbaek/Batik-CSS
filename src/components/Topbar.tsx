import React from "react";
import { FiUser, FiSettings, FiSun, FiMoon } from "react-icons/fi";
import "./Topbar.css";

export default function Topbar({
  dark,
  setDark,
}: {
  dark: boolean;
  setDark: (v: boolean) => void;
}) {
  return (
    <header className="neo-topbar">
      {/* Title / App name */}
      <div className="neo-topbar-title"></div>

      {/* Buttons */}
      <div className="neo-topbar-actions">

        {/* Theme toggle */}
        <button
          className="neo-btn"
          onClick={() => setDark(!dark)}
          title="Toggle theme"
        >
          {dark ? <FiMoon /> : <FiSun />}
        </button>


        {/* Settings */}
        <button className="neo-btn" title="Settings">
          <FiSettings />
        </button>
      </div>
    </header>
  );
}
