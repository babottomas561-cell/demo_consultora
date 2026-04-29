import { useAuth } from "../hooks/useAuth";

export function Navbar() {
  const { email, logout } = useAuth();

  return (
    <header className="topbar">
      <div className="brand-lockup">
        <span className="brand-mark">DC</span>
        <span>Demo Consultora</span>
      </div>
      <div className="topbar-actions">
        <span className="status-pill">
          <span className="status-dot" />
          API conectada
        </span>
        {email ? <span className="muted">{email}</span> : null}
        <button className="ghost-button" type="button" onClick={logout}>
          Salir
        </button>
      </div>
    </header>
  );
}
