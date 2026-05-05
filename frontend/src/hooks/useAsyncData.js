import { useEffect, useRef, useState } from "react";

export function useAsyncData(fetchFn, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    setLoading(true);

    fetchFn()
      .then((result) => {
        if (mountedRef.current) {
          setData(result);
          setError(null);
        }
      })
      .catch((err) => {
        if (mountedRef.current) setError(err.message ?? "Error al cargar datos");
      })
      .finally(() => {
        if (mountedRef.current) setLoading(false);
      });

    return () => { mountedRef.current = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, loading, error };
}
