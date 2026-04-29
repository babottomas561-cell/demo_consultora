import { useState } from "react";
import { Navigate } from "react-router-dom";

import { useAuth } from "../hooks/useAuth";
import { login } from "../services/authService";

export function LoginPage() {
  const { isAuthenticated, setSession } = useAuth();
  const [email, setEmail] = useState("qa1777425810905@democonsultora.com");
  const [password, setPassword] = useState("Test1234");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = await login(email, password);
      setSession({ token: result.access_token, email });
    } catch {
      setError("No pudimos iniciar sesión con esas credenciales.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-screen">
      <section className="login-hero">
        <div className="brand-lockup">
          <span className="brand-mark">DC</span>
          <span>Demo Consultora</span>
        </div>
        <div>
          <h1>Control económico vivo para pymes.</h1>
          <p>
            Una app de gestión analítica que conecta ventas, margen, clientes y punto de
            equilibrio en una vista operativa para tomar decisiones con datos.
          </p>
          <div className="login-proof">
            <div className="proof-item">
              <span className="proof-value">4.136</span>
              <span className="proof-label">ventas demo cargadas</span>
            </div>
            <div className="proof-item">
              <span className="proof-value">60s</span>
              <span className="proof-label">refresco automático</span>
            </div>
            <div className="proof-item">
              <span className="proof-value">5</span>
              <span className="proof-label">módulos iniciales</span>
            </div>
          </div>
        </div>
      </section>

      <section className="login-panel-wrap">
        <form className="login-panel" onSubmit={handleSubmit}>
          <h2>Entrar a San Miguel</h2>
          <p>Usá el usuario QA ya creado para recorrer la demo conectada a Railway.</p>
          {error ? <div className="error-box">{error}</div> : null}
          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              autoComplete="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              autoComplete="current-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>
          <button className="primary-button" type="submit" disabled={loading}>
            {loading ? "Entrando..." : "Entrar"}
          </button>
          <p className="demo-note">
            Esta demo usa datos ficticios pero realistas de una distribuidora tucumana.
          </p>
        </form>
      </section>
    </main>
  );
}
