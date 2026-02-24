import { useState, useMemo, useCallback } from "react";

export interface UseTableOptions<T> {
  data: T[];
  defaultSort: keyof T & string;
  defaultSortDir?: "asc" | "desc";
  defaultPageSize?: number;
  searchFields: (keyof T & string)[];
  storageKey?: string;
}

export interface UseTableReturn<T> {
  // Data
  rows: T[];
  totalFiltered: number;
  totalAll: number;
  // Search
  search: string;
  setSearch: (s: string) => void;
  // Sort
  sortField: keyof T & string;
  sortDir: "asc" | "desc";
  handleSort: (field: keyof T & string) => void;
  // Pagination
  page: number;
  pageSize: number;
  totalPages: number;
  setPage: (p: number) => void;
  setPageSize: (s: number) => void;
}

export function useTable<T extends object>(
  options: UseTableOptions<T>
): UseTableReturn<T> {
  const { data, defaultSort, defaultSortDir = "desc", defaultPageSize = 25, searchFields, storageKey } = options;

  const savedPageSize = storageKey
    ? (() => { try { return Number(sessionStorage.getItem(`${storageKey}_ps`)) || defaultPageSize; } catch { return defaultPageSize; } })()
    : defaultPageSize;

  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<keyof T & string>(defaultSort);
  const [sortDir, setSortDir] = useState<"asc" | "desc">(defaultSortDir);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeRaw] = useState(savedPageSize);

  const setPageSize = useCallback((s: number) => {
    setPageSizeRaw(s);
    setPage(1);
    if (storageKey) {
      try { sessionStorage.setItem(`${storageKey}_ps`, String(s)); } catch { /* noop */ }
    }
  }, [storageKey]);

  const handleSort = useCallback((field: keyof T & string) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
    setPage(1);
  }, [sortField]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const rec = (r: T) => r as Record<string, unknown>;
    let rows = data;
    if (q) {
      rows = rows.filter((r) =>
        searchFields.some((f) => String(rec(r)[f] ?? "").toLowerCase().includes(q))
      );
    }
    rows = [...rows].sort((a, b) => {
      const va = String(rec(a)[sortField] ?? "");
      const vb = String(rec(b)[sortField] ?? "");
      const cmp = va.localeCompare(vb, "es", { numeric: true });
      return sortDir === "asc" ? cmp : -cmp;
    });
    return rows;
  }, [data, search, sortField, sortDir, searchFields]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);

  const rows = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, safePage, pageSize]);

  return {
    rows,
    totalFiltered: filtered.length,
    totalAll: data.length,
    search,
    setSearch: (s: string) => { setSearch(s); setPage(1); },
    sortField,
    sortDir,
    handleSort,
    page: safePage,
    pageSize,
    totalPages,
    setPage,
    setPageSize,
  };
}
