import React, { useState, useRef, useEffect } from "react";
import {
  FiSun,
  FiMoon,
  FiSettings,
  FiUser,
} from "react-icons/fi";
import "./Topbar.css";

export default function Topbar({
  dark,
  setDark,
}: {
  dark: boolean;
  setDark: (v: boolean) => void;
}) {
  const [openProfile, setOpenProfile] = useState(false);
  const profileRef = useRef<HTMLDivElement | null>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (profileRef.current && !profileRef.current.contains(target)) {
        setOpenProfile(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  return (
    <header className="topbar">
      {/* LEFT SIDE — now empty (since search removed) */}
      <div className="topbar-left" />

      {/* RIGHT SIDE */}
      <div className="topbar-right">
        {/* Dark/Light mode */}
        <button
          className="icon-btn"
          onClick={() => setDark(!dark)}
          title="Dark / Light"
        >
          {dark ? <FiMoon /> : <FiSun />}
        </button>

        {/* Profile dropdown */}
        <div className="profile-menu" ref={profileRef}>
          <button
            className="icon-btn"
            title="Profile"
            onClick={(e) => {
              e.stopPropagation();
              setOpenProfile((s) => !s);
            }}
          >
            <FiUser />
          </button>

          {openProfile && (
            <div className="profile-dropdown">
              <button>Profile Settings</button>
              <button>Logout</button>
            </div>
          )}
        </div>

        {/* Settings icon */}
        <button className="icon-btn" title="Settings">
          <FiSettings />
        </button>
      </div>
    </header>
  );
}
