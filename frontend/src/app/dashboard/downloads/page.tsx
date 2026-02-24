"use client";

import { useEffect, useState, useMemo } from "react";
import { downloads } from "@/lib/api";
import type { DownloadRecord } from "@/lib/api";

type SortField = "estado" | "cuit_cuil" | "formulario" | "periodo" | "transaccion" | "fecha_presentacion";
type SortDir = "asc" | "desc";

export default function DownloadsPage() {
  const [records, setRecords] = useState<DownloadRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("fecha_presentacion");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());

  useEffect(() => {
    downloads
      .list()
      .then(setRecords)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    let rows = records.filter(
      (r) =>
        r.cuit_cuil.toLowerCase().includes(q) ||
        r.formulario.toLowerCase().includes(q) ||
        r.periodo.toLowerCase().includes(q) ||
        r.transaccion.toLowerCase().includes(q) ||
        r.estado.toLowerCase().includes(q) ||
        r.fecha_presentacion.toLowerCase().includes(q)
    );

    rows.sort((a, b) => {
      const va = a[sortField] || "";
      const vb = b[sortField] || "";
      const cmp = va.localeCompare(vb, "es", { numeric: true });
      return sortDir === "asc" ? cmp : -cmp;
    });

    return rows;
  }, [records, search, sortField, sortDir]);

  function toggleRow(idx: number) {
    setSelectedRows((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }

  function toggleAll() {
    if (selectedRows.size === filtered.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(filtered.map((_, i) => i)));
    }
  }

  async function handleDeleteSelected() {
    const paths = Array.from(selectedRows).map((i) => filtered[i].archivo);
    if (paths.length === 0) return;
    if (!confirm(`Eliminar ${paths.length} registro(s)?`)) return;
    try {
      await downloads.deleteBatch(paths);
      setSelectedRows(new Set());
      const updated = await downloads.list();
      setRecords(updated);
    } catch (e) {
      console.error(e);
    }
  }

  function exportTableCSV() {
    const headers = ["Estado", "CUIT/CUIL", "Formulario", "Período", "Transacción", "Fecha de Presentación"];
    const rows = filtered.map((r) => [
      r.estado, r.cuit_cuil, r.formulario, r.periodo, r.transaccion, r.fecha_presentacion,
    ]);
    const csv = [headers, ...rows].map((row) => row.map((c) => `"${c}"`).join(";")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ddjj_descargas_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const columns: { key: SortField; label: string; width?: string }[] = [
    { key: "estado", label: "Estado" },
    { key: "cuit_cuil", label: "CUIT/CUIL" },
    { key: "formulario", label: "Formulario" },
    { key: "periodo", label: "Período" },
    { key: "transaccion", label: "Transacción" },
    { key: "fecha_presentacion", label: "Fecha de Presentación" },
  ];

  function estadoBadge(estado: string) {
    const lower = estado.toLowerCase();
    if (lower.includes("present") || lower.includes("aceptada"))
      return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20";
    if (lower.includes("rechaz") || lower.includes("error"))
      return "bg-red-50 text-red-700 ring-1 ring-red-600/20";
    if (lower.includes("pendi"))
      return "bg-amber-50 text-amber-700 ring-1 ring-amber-600/20";
    return "bg-gray-50 text-gray-700 ring-1 ring-gray-600/20";
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <span className="text-gray-300 ml-1">↕</span>;
    return <span className="text-blue-600 ml-1">{sortDir === "asc" ? "↑" : "↓"}</span>;
  };

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Declaraciones Juradas</h2>
          <p className="text-sm text-gray-500 mt-1">
            {records.length} registro{records.length !== 1 ? "s" : ""} encontrado{records.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex gap-2">
          {selectedRows.size > 0 && (
            <button
              onClick={handleDeleteSelected}
              className="px-3 py-2 text-sm font-medium text-red-700 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
            >
              Eliminar ({selectedRows.size})
            </button>
          )}
          <button
            onClick={exportTableCSV}
            disabled={filtered.length === 0}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 transition-colors"
          >
            Exportar CSV
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="mb-4">
        <div className="relative max-w-md">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Buscar por CUIT, formulario, estado, periodo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-shadow"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="px-6 py-16 text-center">
            <div className="inline-block h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-sm text-gray-500">Cargando declaraciones...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/80">
                  <th className="w-10 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={filtered.length > 0 && selectedRows.size === filtered.length}
                      onChange={toggleAll}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  {columns.map((col) => (
                    <th
                      key={col.key}
                      onClick={() => handleSort(col.key)}
                      className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer select-none hover:text-gray-900 transition-colors"
                    >
                      <span className="inline-flex items-center">
                        {col.label}
                        <SortIcon field={col.key} />
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((r, i) => (
                  <tr
                    key={i}
                    className={`transition-colors ${
                      selectedRows.has(i)
                        ? "bg-blue-50/60"
                        : "hover:bg-gray-50/60"
                    }`}
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedRows.has(i)}
                        onChange={() => toggleRow(i)}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${estadoBadge(r.estado)}`}>
                        {r.estado}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 tabular-nums">
                      {r.cuit_cuil}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {r.formulario}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 tabular-nums">
                      {r.periodo}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 tabular-nums">
                      {r.transaccion}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {r.fecha_presentacion}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filtered.length === 0 && (
              <div className="px-6 py-16 text-center">
                <svg className="mx-auto h-10 w-10 text-gray-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
                <p className="text-sm font-medium text-gray-900 mb-1">
                  {records.length === 0 ? "Sin declaraciones" : "Sin resultados"}
                </p>
                <p className="text-sm text-gray-500">
                  {records.length === 0
                    ? "Las declaraciones aparecerán aquí cuando ejecutes consultas"
                    : "Probá con otro término de búsqueda"}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer info */}
      {filtered.length > 0 && (
        <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
          <span>
            Mostrando {filtered.length} de {records.length} registro{records.length !== 1 ? "s" : ""}
          </span>
          {search && (
            <button
              onClick={() => setSearch("")}
              className="text-blue-600 hover:text-blue-800"
            >
              Limpiar búsqueda
            </button>
          )}
        </div>
      )}
    </div>
  );
}
