"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { reports, type ComplianceMatrixResponse } from "@/lib/api";

const SearchIcon = () => (
  <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const FilterIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 4.5h18m-18 7.5h12m-12 7.5h6" />
  </svg>
);

export default function ComplianceMatrix() {
  const [data, setData] = useState<ComplianceMatrixResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(new Set());
  const [showColumnSelector, setShowColumnSelector] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await reports.getComplianceMatrix();
      setData(res);
      setVisibleColumns((prev) => {
        if (prev.size === 0 && res.columns.length > 0) return new Set(res.columns);
        return prev;
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error al cargar la matriz";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredRows = useMemo(() => {
    if (!data) return [];
    return data.rows.filter(row => 
      row.cliente_nombre.toLowerCase().includes(search.toLowerCase())
    );
  }, [data, search]);

  const toggleColumn = (col: string) => {
    const next = new Set(visibleColumns);
    if (next.has(col)) next.delete(col);
    else next.add(col);
    setVisibleColumns(next);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "al_dia":
        return { icon: "✅", css: "bg-emerald-50 text-emerald-700 ring-emerald-600/20", label: "Al día" };
      case "atrasado_1":
        return { icon: "⚠️", css: "bg-amber-50 text-amber-700 ring-amber-600/20", label: "Atrasado" };
      case "atrasado_critico":
        return { icon: "❌", css: "bg-red-50 text-red-700 ring-red-600/20", label: "Crítico" };
      default:
        return { icon: "⚪", css: "bg-gray-50 text-gray-400 ring-gray-300/20", label: "Sin datos" };
    }
  };

  if (loading && !data) {
    return (
      <div className="py-20 text-center">
        <div className="inline-block h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="mt-4 text-gray-500 text-sm">Generando matriz de cumplimiento...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center text-red-600 bg-red-50 rounded-xl border border-red-100">
        <p className="font-medium">{error}</p>
        <button onClick={fetchData} className="mt-4 text-sm font-semibold underline">Reintentar</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="relative flex-1 max-w-sm">
          <span className="absolute left-3 top-1/2 -translate-y-1/2"><SearchIcon /></span>
          <input
            type="text"
            placeholder="Buscar cliente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>

        <div className="relative">
          <button
            onClick={() => setShowColumnSelector(!showColumnSelector)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <FilterIcon />
            Seleccionar DDJJ ({visibleColumns.size})
          </button>

          {showColumnSelector && (
            <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-100 z-50 p-4 max-h-[400px] overflow-y-auto">
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-100">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Declaraciones</span>
                <button 
                  onClick={() => setVisibleColumns(new Set(data?.columns || []))}
                  className="text-[10px] text-blue-600 font-semibold hover:underline"
                >
                  Todas
                </button>
              </div>
              <div className="space-y-2">
                {data?.columns.map(col => (
                  <label key={col} className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={visibleColumns.has(col)}
                      onChange={() => toggleColumn(col)}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500/20"
                    />
                    <span className="text-sm text-gray-700 group-hover:text-blue-600 transition-colors">{col}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Table Container */}
      <div className="flex-1 overflow-x-auto border border-gray-200 rounded-xl shadow-sm bg-white">
        <table className="min-w-full border-separate border-spacing-0">
          <thead className="bg-gray-50 sticky top-0 z-10">
            <tr>
              <th className="sticky left-0 bg-gray-50 px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-r border-gray-200 z-20">
                Cliente
              </th>
              {data?.columns.filter(c => visibleColumns.has(c)).map(col => (
                <th key={col} className="px-4 py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200 whitespace-nowrap">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredRows.map((row) => (
              <tr key={row.cliente_id} className="hover:bg-blue-50/30 transition-colors">
                <td className="sticky left-0 bg-white px-6 py-4 text-sm font-semibold text-gray-900 border-r border-gray-200 z-10">
                  <div className="truncate max-w-[180px]">{row.cliente_nombre}</div>
                </td>
                {data?.columns.filter(c => visibleColumns.has(c)).map(col => {
                  const status = row.data[col];
                  const badge = getStatusBadge(status?.estado || "sin_datos");
                  return (
                    <td key={col} className="px-4 py-4 text-center border-l first:border-l-0 border-gray-50">
                      <div className="flex flex-col items-center gap-1 group relative">
                        <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-lg ${badge.css} ring-1 ring-inset shadow-sm`}>
                          {badge.icon}
                        </span>
                        {status?.periodo && (
                          <span className="text-[10px] font-medium text-gray-400 tabular-nums">
                            {status.periodo}
                          </span>
                        )}
                        
                        {/* Tooltip simple */}
                        <div className="absolute bottom-full mb-2 hidden group-hover:block z-30">
                          <div className="bg-gray-900 text-white text-[10px] px-2 py-1 rounded shadow-lg whitespace-nowrap">
                            {badge.label}: {status?.periodo || "N/A"}
                          </div>
                        </div>
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
            {filteredRows.length === 0 && (
              <tr>
                <td colSpan={(visibleColumns.size || 0) + 1} className="py-20 text-center text-gray-400 italic text-sm">
                  No se encontraron clientes activos con los filtros seleccionados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      {/* Legend */}
      <div className="mt-6 flex flex-wrap items-center gap-6 px-2 py-3 bg-gray-50 rounded-lg border border-gray-100">
        <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Leyenda:</span>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
          <span className="text-xs text-gray-600 font-medium">Al día</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-amber-500"></span>
          <span className="text-xs text-gray-600 font-medium">1 mes de atraso</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-red-500"></span>
          <span className="text-xs text-gray-600 font-medium">2+ meses de atraso</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-gray-300"></span>
          <span className="text-xs text-gray-600 font-medium">Sin datos</span>
        </div>
      </div>
    </div>
  );
}
