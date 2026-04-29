import { useEffect, useState } from "react";

import { getDashboardData } from "../services/dashboardService";

export function useDashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const response = await getDashboardData();
        if (!mounted) return;
        setData(response);
        setError(null);
        setLastUpdated(new Date());
      } catch (err) {
        if (!mounted) return;
        setError(err.message || "No se pudo cargar el dashboard");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    const interval = window.setInterval(load, 60000);

    return () => {
      mounted = false;
      window.clearInterval(interval);
    };
  }, []);

  return { data, error, loading, lastUpdated };
}
