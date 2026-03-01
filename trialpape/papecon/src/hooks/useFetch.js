import { useState, useEffect } from "react";
import API from "../api/axiosInstance";

/**
 * Generic data-fetching hook.
 * @param {string} url  — API endpoint (relative to baseURL)
 * @param {object} opts — { params, enabled }
 */
export default function useFetch(url, opts = {}) {
  const { params = {}, enabled = true } = opts;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await API.get(url, { params });
      setData(res.data);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (enabled) fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, enabled, JSON.stringify(params)]);

  return { data, loading, error, refetch: fetchData };
}
