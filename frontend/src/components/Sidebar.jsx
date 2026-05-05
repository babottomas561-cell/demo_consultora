import { NavLink } from "react-router-dom";

const NAV = [
  { to: "/",            label: "Dashboard",   icon: "⊞" },
  { to: "/ventas",      label: "Ventas",       icon: "🧾" },
  { to: "/clientes",    label: "Clientes",     icon: "👥" },
  { to: "/articulos",   label: "Artículos",    icon: "📦" },
  { to: "/vendedores",  label: "Vendedores",   icon: "👤" },
  { to: "/eerr",        label: "EERR",         icon: "📊" },
];

export function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <span className="brand-mark">DC</span>
        <span className="sidebar-brand-name">Demo Consultora</span>
      </div>
      <nav className="sidebar-nav">
        {NAV.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) => `sidebar-link${isActive ? " active" : ""}`}
          >
            <span className="sidebar-icon">{icon}</span>
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
