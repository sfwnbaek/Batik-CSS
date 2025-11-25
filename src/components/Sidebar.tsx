import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./Sidebar.css";

type NavItem = { id: string; label: string; };

const mainMenu: NavItem[] = [{ id: "dashboard", label: "Dashboard" }];
const managementMenu: NavItem[] = [
  { id: "duty", label: "Duty and Standby" },
  { id: "non_avail", label: "Crew Non-Availability" },
];
const flightMenu: NavItem[] = [
  { id: "od737", label: "OD737" },
  { id: "od330", label: "OD330" },
];
const systemMenu: NavItem[] = [
  { id: "announcement", label: "Announcement" },
  { id: "setting", label: "Setting" },
];

const routeMap: Record<string, string> = {
  dashboard: "/",
  duty: "/duty-standby",
  non_avail: "/crew-non-availability",
  od737: "/flight/od737",
  od330: "/flight/od330",
  announcement: "/announcement",
  setting: "/setting",
};

export default function Sidebar(): React.ReactElement {
  const [collapsed, setCollapsed] = React.useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const getActiveFromPath = (path: string) => {
    const entry = Object.entries(routeMap).find(([_, route]) => route === path);
    return entry ? entry[0] : "dashboard";
  };

  const [active, setActive] = React.useState<string>(getActiveFromPath(location.pathname));

  function handleNav(id: string) {
    setActive(id);
    const route = routeMap[id] ?? "/";
    navigate(route);
  }

  React.useEffect(() => {
    const a = getActiveFromPath(location.pathname);
    setActive(a);
  }, [location.pathname]);

  return (
    <aside className={`batik-sidebar ${collapsed ? "collapsed" : ""}`}>
      <div className="brand">
  <div className="brand-logo">BA</div>
  <div className="brand-text">
    <div className="brand-title">Batik Air CSS</div>
    <div className="brand-sub">Crew Scheduling System</div>
  </div>
</div>



      <div className="nav">
        <nav className="nav-section">
          <div className="section-title">Main Menu</div>
          <ul className="nav-list">
            {mainMenu.map((item) => (
              <li key={item.id} className={`nav-item ${active === item.id ? "active" : ""}`} onClick={() => handleNav(item.id)}>
                <span className="nav-icon">🏠</span>
                <span className="nav-label">{item.label}</span>
              </li>
            ))}
          </ul>
        </nav>

        <nav className="nav-section">
          <div className="section-title">Management</div>
          <ul className="nav-list">
            {managementMenu.map((item) => (
              <li key={item.id} className={`nav-item ${active === item.id ? "active" : ""}`} onClick={() => handleNav(item.id)}>
                <span className="nav-icon">👥</span>
                <span className="nav-label">{item.label}</span>
              </li>
            ))}
          </ul>
        </nav>

        <nav className="nav-section">
          <div className="section-title">Flight Roaster</div>
          <ul className="nav-list">
            {flightMenu.map((item) => (
              <li key={item.id} className={`nav-item ${active === item.id ? "active" : ""}`} onClick={() => handleNav(item.id)}>
                <span className="nav-icon">✈️</span>
                <span className="nav-label">{item.label}</span>
              </li>
            ))}
          </ul>
        </nav>

        <nav className="nav-section bottom">
          <div className="section-title">System</div>
          <ul className="nav-list">
            {systemMenu.map((item) => (
              <li key={item.id} className={`nav-item ${active === item.id ? "active" : ""}`} onClick={() => handleNav(item.id)}>
                <span className="nav-icon">⚙️</span>
                <span className="nav-label">{item.label}</span>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <div className="sidebar-footer">
        <div className="user-mini">
          <div className="avatar">S</div>
          <div className="user-info">
            <div className="name">Safwan</div>
            <div className="role">Dispatcher</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
