import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

export type FilterValue = string | number | boolean | null | undefined;

export interface ResourceList<T> {
  data: T[];
  total: number;
  page: number;
  totalPages: number;
  loading: boolean;
  error: string | null;
  setPage: (page: number) => void;
  reload: () => void;
  mutate: (updater: (previous: T[]) => T[]) => void;
}

interface Options {
  path: string;
  pageSize?: number;
  filters?: Record<string, FilterValue>;
  debounceMs?: number;
}

interface ListResponse<T> {
  data: T[];
  total?: number;
  page?: number;
  totalPages?: number;
}

function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

function buildQueryString(
  page: number,
  pageSize: number,
  filterKey: string,
): string {
  const params = new URLSearchParams({ page: String(page), limit: String(pageSize) });
  const parsed = JSON.parse(filterKey) as Record<string, FilterValue>;
  for (const [key, value] of Object.entries(parsed)) {
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, String(value));
    }
  }
  return params.toString();
}

export function useResourceList<T>({
  path,
  pageSize = 20,
  filters,
  debounceMs = 300,
}: Options): ResourceList<T> {
  const [data, setData] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);

  const filterKey = JSON.stringify(filters ?? {});
  const debouncedFilterKey = useDebouncedValue(filterKey, debounceMs);

  const [appliedFilterKey, setAppliedFilterKey] = useState(debouncedFilterKey);
  if (appliedFilterKey !== debouncedFilterKey) {
    setAppliedFilterKey(debouncedFilterKey);
    setPage(1);
  }

  const query = buildQueryString(page, pageSize, debouncedFilterKey);
  const requestKey = `${path}?${query}:${reloadKey}`;
  const [fetchedKey, setFetchedKey] = useState('');
  const loading = fetchedKey !== requestKey;

  useEffect(() => {
    const controller = new AbortController();

    api<ListResponse<T>>(`${path}?${query}`, { signal: controller.signal })
      .then((response) => {
        if (controller.signal.aborted) return;
        setData(response.data);
        setTotal(response.total ?? response.data.length);
        setTotalPages(response.totalPages ?? 1);
        setError(null);
        if (response.data.length === 0 && page > 1) {
          setPage(Math.max(1, response.totalPages ?? 1));
        }
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : 'Failed memuat data');
      })
      .finally(() => {
        if (!controller.signal.aborted) setFetchedKey(requestKey);
      });

    return () => controller.abort();
  }, [path, query, page, requestKey]);

  return {
    data,
    total,
    page,
    totalPages,
    loading,
    error,
    setPage,
    reload: () => setReloadKey((key) => key + 1),
    mutate: (updater) => setData(updater),
  };
}
