export function KpiCard({ label, value, help, progress }) {
  return (
    <section className="kpi-card">
      <p className="kpi-label">{label}</p>
      <strong className="kpi-value">{value}</strong>
      {typeof progress === "number" ? (
        <div className="progress-track" aria-label={`${Math.round(progress * 100)}%`}>
          <div className="progress-fill" style={{ width: `${Math.min(progress * 100, 100)}%` }} />
        </div>
      ) : null}
      <p className="kpi-help">{help}</p>
    </section>
  );
}
