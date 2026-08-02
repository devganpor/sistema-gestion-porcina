import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../services/authService';

const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 30_000; // 30 segundos

interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useApi<T>(url: string, dependencies: any[] = []): UseApiState<T> {
  const [data, setData] = useState<T | null>(() => {
    const cached = cache.get(url);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) return cached.data;
    return null;
  });
  const [loading, setLoading] = useState(!cache.has(url));
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async (force = false) => {
    const cached = cache.get(url);
    if (!force && cached && Date.now() - cached.timestamp < CACHE_TTL) {
      setData(cached.data);
      setLoading(false);
      return;
    }

    abortRef.current?.abort();
    abortRef.current = new AbortController();

    try {
      setLoading(true);
      setError(null);
      const response = await api.get(url, { signal: abortRef.current.signal });
      cache.set(url, { data: response.data, timestamp: Date.now() });
      setData(response.data);
    } catch (err: any) {
      if (err.name === 'CanceledError' || err.name === 'AbortError') return;
      setError(err.response?.data?.error || 'Error cargando datos');
    } finally {
      setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    fetchData();
    return () => abortRef.current?.abort();
  }, [url, ...dependencies]);

  return { data, loading, error, refetch: () => fetchData(true) };
}

export function invalidateCache(urlPattern?: string) {
  if (!urlPattern) {
    cache.clear();
  } else {
    cache.forEach((_, key) => {
      if (key.includes(urlPattern)) cache.delete(key);
    });
  }
}

export function useApiMutation<T, P = any>() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutate = async (url: string, data: P, method: 'POST' | 'PUT' | 'DELETE' = 'POST'): Promise<T | null> => {
    try {
      setLoading(true);
      setError(null);
      let response;
      if (method === 'POST') response = await api.post(url, data);
      else if (method === 'PUT') response = await api.put(url, data);
      else response = await api.delete(url);
      invalidateCache(url.split('/')[1]);
      return response.data;
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Error en la operación';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return { mutate, loading, error };
}
