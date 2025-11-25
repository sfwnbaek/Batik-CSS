import React, { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import Dashboard from './pages/Dashboard';
import DutyStandby from './pages/DutyStandby';
import CrewNonAvailability from './pages/CrewNonAvailability';
import OD737 from './pages/OD737';
import OD330 from './pages/OD330';
import Announcement from './pages/Announcement';
import Setting from './pages/Setting';
import './App.css';

export default function App() {
  const [dark, setDark] = useState(true);

  return (
    <div className={dark ? 'app dark' : 'app light'}>
      <Sidebar />
      <div className="main-area">
        <Topbar dark={dark} setDark={setDark} />
        <div className="content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/duty-standby" element={<DutyStandby />} />
            <Route path="/crew-non-availability" element={<CrewNonAvailability />} />
            <Route path="/flight/od737" element={<OD737 />} />
            <Route path="/flight/od330" element={<OD330 />} />
            <Route path="/announcement" element={<Announcement />} />
            <Route path="/setting" element={<Setting />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}
