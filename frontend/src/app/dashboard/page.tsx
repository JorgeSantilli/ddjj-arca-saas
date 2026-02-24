"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import {
  clients as clientsApi,
  consultations,
  downloads,
} from "@/lib/api";
import type {
  Cliente,
  ClienteCreate,
  ConsultaStatus,
  Consulta,
  DownloadRecord,
} from "@/lib/api";
import { useTable } from "@/hooks/useTable";

// ─── Icons ────────────────────────────────────────────────────────────────────
const SearchIcon = () => (
  <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const ChevronIcon = ({ open }: { open: boolean }) => (
  <svg className={`h-5 w-5 transition-transform ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
  </svg>
);

const SortIcon = ({ active, dir }: { active: boolean; dir: "asc" | "desc" }) => {
  if (!active) return <span className="text-gray-300 ml-1">↕</span>;
  return <span className="text-blue-600 ml-1">{dir === "asc" ? "↑" : "↓"}</span>;
};

// ─── Shared: Table Search + Pagination bar ────────────────────────────────────
function TableToolbar({
  search,
  onSearch,
  placeholder,
  totalFiltered,
  totalAll,
  page,
  totalPages,
  pageSize,
  onPageChange,
  onPageSizeChange,
  extra,
}: {
  search: string;
  onSearch: (s: string) => void;
  placeholder: string;
  totalFiltered: number;
  totalAll: number;
  page: number;
  totalPages: number;
  pageSize: number;
  onPageChange: (p: number) => void;
  onPageSizeChange: (s: number) => void;
  extra?: React.ReactNode;
}) {
  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
        <div className="relative flex-1 max-w-sm">
          <span className="absolute left-3 top-1/2 -translate-y-1/2"><SearchIcon /></span>
          <input
            type="text"
            placeholder={placeholder}
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>
        {extra}
      </div>
      <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
        <span>
          {totalFiltered === totalAll
            ? `${totalAll} registro${totalAll !== 1 ? "s" : ""}`
            : `${totalFiltered} de ${totalAll} registros`}
        </span>
        <div className="flex items-center gap-3">
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="border border-gray-300 rounded px-2 py-1 text-xs text-gray-700"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              className="px-2 py-1 rounded border border-gray-300 disabled:opacity-30 hover:bg-gray-100"
            >
              ←
            </button>
            <span className="px-2">{page}/{totalPages}</span>
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              className="px-2 py-1 rounded border border-gray-300 disabled:opacity-30 hover:bg-gray-100"
            >
              →
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────
function Section({
  title,
  icon,
  collapsible = false,
  defaultOpen = true,
  badge,
  children,
}: {
  title: string;
  icon: string;
  collapsible?: boolean;
  defaultOpen?: boolean;
  badge?: React.ReactNode;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <button
        type="button"
        onClick={collapsible ? () => setOpen(!open) : undefined}
        className={`w-full flex items-center justify-between px-5 py-4 ${collapsible ? "cursor-pointer hover:bg-gray-50/50" : "cursor-default"} transition-colors`}
      >
        <div className="flex items-center gap-2.5">
          <span className="text-lg">{icon}</span>
          <h3 className="text-base font-semibold text-gray-900">{title}</h3>
          {badge}
        </div>
        {collapsible && <ChevronIcon open={open} />}
      </button>
      {open && <div className="border-t border-gray-100">{children}</div>}
    </div>
  );
}

// ─── Estado badges ────────────────────────────────────────────────────────────
function estadoConsultaBadge(estado: string) {
  switch (estado) {
    case "exitoso": return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20";
    case "error": return "bg-red-50 text-red-700 ring-1 ring-red-600/20";
    case "en_proceso": return "bg-blue-50 text-blue-700 ring-1 ring-blue-600/20";
    default: return "bg-amber-50 text-amber-700 ring-1 ring-amber-600/20";
  }
}

function estadoDescargaBadge(estado: string) {
  const lower = estado.toLowerCase();
  if (lower.includes("present") || lower.includes("aceptada"))
    return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20";
  if (lower.includes("rechaz") || lower.includes("error"))
    return "bg-red-50 text-red-700 ring-1 ring-red-600/20";
  if (lower.includes("pendi"))
    return "bg-amber-50 text-amber-700 ring-1 ring-amber-600/20";
  return "bg-gray-50 text-gray-700 ring-1 ring-gray-600/20";
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════════
export default function DashboardPage() {
  // ─── Shared state ─────────────────────────────────────────────────────────
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [status, setStatus] = useState<ConsultaStatus | null>(null);
  const [records, setRecords] = useState<DownloadRecord[]>([]);
  const [loadingClientes, setLoadingClientes] = useState(true);
  const [loadingRecords, setLoadingRecords] = useState(true);

  // ─── Client selection ─────────────────────────────────────────────────────
  const [selectedClientIds, setSelectedClientIds] = useState<Set<number>>(new Set());
  const [onlyActive, setOnlyActive] = useState(false);

  // ─── Execution ────────────────────────────────────────────────────────────
  const [periodo, setPeriodo] = useState("1");
  const [executing, setExecuting] = useState(false);
  const [execError, setExecError] = useState("");

  // ─── Logs ─────────────────────────────────────────────────────────────────
  const [logs, setLogs] = useState<string[]>([]);
  const [showLogs, setShowLogs] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);

  // ─── Client CRUD modal ────────────────────────────────────────────────────
  const [showClientForm, setShowClientForm] = useState(false);
  const [editingClientId, setEditingClientId] = useState<number | null>(null);
  const [clientForm, setClientForm] = useState<ClienteCreate>({
    nombre: "", cuit_login: "", clave_fiscal: "", cuit_consulta: "", activo: true,
  });
  const [clientFormError, setClientFormError] = useState("");

  // ─── Download selection ───────────────────────────────────────────────────
  const [selectedDownloadRows, setSelectedDownloadRows] = useState<Set<number>>(new Set());

  // ─── Initial data load ────────────────────────────────────────────────────
  useEffect(() => {
    clientsApi.list().then(setClientes).catch(console.error).finally(() => setLoadingClientes(false));
    consultations.status().then(setStatus).catch(console.error);
    downloads.list().then(setRecords).catch(console.error).finally(() => setLoadingRecords(false));
  }, []);

  // ─── Polling ──────────────────────────────────────────────────────────────
  const poll = useCallback(() => {
    consultations.status().then(setStatus).catch(console.error);
  }, []);

  const pollLogs = useCallback(() => {
    consultations.logs(200).then((res) => {
      setLogs(res.logs);
      setTimeout(() => {
        if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
      }, 50);
    }).catch(console.error);
  }, []);

  useEffect(() => {
    if (!status?.corriendo) return;
    const interval = setInterval(() => {
      poll();
      if (showLogs) pollLogs();
    }, 3000);
    return () => clearInterval(interval);
  }, [status?.corriendo, poll, pollLogs, showLogs]);

  useEffect(() => {
    if (!showLogs) return;
    pollLogs();
    const interval = setInterval(pollLogs, 3000);
    return () => clearInterval(interval);
  }, [showLogs, pollLogs]);

  // Refresh downloads when execution finishes
  const prevRunning = useRef(false);
  useEffect(() => {
    if (prevRunning.current && !status?.corriendo) {
      downloads.list().then(setRecords).catch(console.error);
    }
    prevRunning.current = status?.corriendo ?? false;
  }, [status?.corriendo]);

  // ─── Client filtering ────────────────────────────────────────────────────
  const visibleClientes = useMemo(
    () => (onlyActive ? clientes.filter((c) => c.activo) : clientes),
    [clientes, onlyActive]
  );

  // ─── Client selection handlers ────────────────────────────────────────────
  function toggleClientSelection(id: number) {
    setSelectedClientIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function selectAllClients() {
    setSelectedClientIds(new Set(visibleClientes.filter((c) => c.activo).map((c) => c.id)));
  }

  function deselectAllClients() {
    setSelectedClientIds(new Set());
  }

  // ─── Execute consultation ─────────────────────────────────────────────────
  async function handleExecute() {
    if (selectedClientIds.size === 0) {
      setExecError("Seleccioná al menos un cliente");
      return;
    }
    setExecError("");
    setExecuting(true);
    setShowLogs(true);
    try {
      await consultations.execute({
        cliente_ids: Array.from(selectedClientIds),
        periodo,
        headless: true,
      });
      setSelectedClientIds(new Set());
      setTimeout(poll, 1000);
      setTimeout(pollLogs, 2000);
    } catch (err) {
      setExecError(err instanceof Error ? err.message : "Error al ejecutar");
    } finally {
      setExecuting(false);
    }
  }

  // ─── Client CRUD ──────────────────────────────────────────────────────────
  function openNewClient() {
    setEditingClientId(null);
    setClientForm({ nombre: "", cuit_login: "", clave_fiscal: "", cuit_consulta: "", activo: true });
    setClientFormError("");
    setShowClientForm(true);
  }

  function openEditClient(c: Cliente) {
    setEditingClientId(c.id);
    setClientForm({
      nombre: c.nombre,
      cuit_login: c.cuit_login,
      clave_fiscal: "",
      cuit_consulta: c.cuit_consulta,
      activo: c.activo,
    });
    setClientFormError("");
    setShowClientForm(true);
  }

  async function saveClient() {
    setClientFormError("");
    try {
      if (editingClientId) {
        const data: Partial<ClienteCreate> = { ...clientForm };
        if (!data.clave_fiscal) delete data.clave_fiscal;
        await clientsApi.update(editingClientId, data);
      } else {
        await clientsApi.create(clientForm);
      }
      setShowClientForm(false);
      const updated = await clientsApi.list();
      setClientes(updated);
    } catch (err) {
      setClientFormError(err instanceof Error ? err.message : "Error al guardar");
    }
  }

  async function deleteClient(id: number) {
    if (!confirm("¿Eliminar este cliente?")) return;
    await clientsApi.delete(id);
    setClientes(await clientsApi.list());
    setSelectedClientIds((prev) => { const n = new Set(prev); n.delete(id); return n; });
  }

  // ─── Consultation delete ──────────────────────────────────────────────────
  async function handleDeleteConsulta(id: number) {
    await consultations.delete(id);
    poll();
  }

  // ─── Download batch delete ────────────────────────────────────────────────
  async function handleDeleteDownloads() {
    const ids = Array.from(selectedDownloadRows).map((i) => downloadTable.rows[i]?.id).filter(Boolean);
    if (ids.length === 0) return;
    if (!confirm(`Eliminar ${ids.length} registro(s)?`)) return;
    await downloads.deleteBatch(ids);
    setSelectedDownloadRows(new Set());
    setRecords(await downloads.list());
  }

  // ─── Export downloads CSV ─────────────────────────────────────────────────
  function exportDownloadsCSV() {
    const headers = ["Estado", "CUIT/CUIL", "Formulario", "Período", "Transacción", "Fecha de Presentación"];
    const csvRows = downloadTable.rows.map((r) => [
      r.estado, r.cuit_cuil, r.formulario, r.periodo, r.transaccion, r.fecha_presentacion,
    ]);
    const csv = [headers, ...csvRows].map((row) => row.map((c) => `"${c}"`).join(";")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ddjj_descargas_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ─── Table hooks ──────────────────────────────────────────────────────────
  const clientTable = useTable<Cliente>({
    data: visibleClientes,
    defaultSort: "nombre",
    defaultSortDir: "asc",
    defaultPageSize: 25,
    searchFields: ["nombre", "cuit_login", "cuit_consulta"],
    storageKey: "clients",
  });

  const consultaList = useMemo(() => status?.consultas ?? [], [status]);
  const consultaTable = useTable<Consulta>({
    data: consultaList,
    defaultSort: "created_at",
    defaultSortDir: "desc",
    defaultPageSize: 10,
    searchFields: ["cliente_nombre", "periodo", "estado", "error_detalle"] as (keyof Consulta & string)[],
    storageKey: "consultas",
  });

  const downloadTable = useTable<DownloadRecord>({
    data: records,
    defaultSort: "fecha_presentacion",
    defaultSortDir: "desc",
    defaultPageSize: 25,
    searchFields: ["estado", "cuit_cuil", "formulario", "periodo", "transaccion", "fecha_presentacion"],
    storageKey: "downloads",
  });

  // ─── Download row selection helpers ───────────────────────────────────────
  function toggleDownloadRow(idx: number) {
    setSelectedDownloadRows((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  }

  function toggleAllDownloads() {
    if (selectedDownloadRows.size === downloadTable.rows.length) {
      setSelectedDownloadRows(new Set());
    } else {
      setSelectedDownloadRows(new Set(downloadTable.rows.map((_, i) => i)));
    }
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═════════════════════════════════════════════════════════════════════════════
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Centro de Operaciones</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Seleccioná clientes, ejecutá consultas y consultá los resultados
          </p>
        </div>
        {status?.corriendo && (
          <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-4 py-2">
            <div className="h-2.5 w-2.5 rounded-full bg-blue-500 animate-pulse" />
            <span className="text-sm text-blue-700 font-medium">
              {status.detalle || "Procesando..."}
            </span>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
         1. MÓDULO CLIENTES
         ═══════════════════════════════════════════════════════════════════════ */}
      <Section title="Clientes" icon="📋">
        <div className="px-5 py-4">
          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-3 flex-wrap">
              <button onClick={selectAllClients} className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                Seleccionar todos
              </button>
              <button onClick={deselectAllClients} className="text-sm text-gray-500 hover:text-gray-700">
                Deseleccionar todos
              </button>
              <label className="flex items-center gap-1.5 text-sm text-gray-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={onlyActive}
                  onChange={(e) => setOnlyActive(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-gray-300 text-blue-600"
                />
                Solo activos
              </label>
            </div>
            <button
              onClick={openNewClient}
              className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              + Nuevo cliente
            </button>
          </div>

          <TableToolbar
            search={clientTable.search}
            onSearch={clientTable.setSearch}
            placeholder="Buscar por nombre, CUIT..."
            totalFiltered={clientTable.totalFiltered}
            totalAll={clientTable.totalAll}
            page={clientTable.page}
            totalPages={clientTable.totalPages}
            pageSize={clientTable.pageSize}
            onPageChange={clientTable.setPage}
            onPageSizeChange={clientTable.setPageSize}
          />

          {/* Table */}
          {loadingClientes ? (
            <div className="py-12 text-center">
              <div className="inline-block h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mb-2" />
              <p className="text-sm text-gray-500">Cargando clientes...</p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-gray-50/80 border-b border-gray-200">
                    <th className="w-10 px-3 py-2.5">
                      <input
                        type="checkbox"
                        checked={visibleClientes.length > 0 && selectedClientIds.size === visibleClientes.filter(c => c.activo).length && visibleClientes.filter(c => c.activo).every(c => selectedClientIds.has(c.id))}
                        onChange={() => selectedClientIds.size > 0 ? deselectAllClients() : selectAllClients()}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600"
                      />
                    </th>
                    {(
                      [
                        { key: "nombre" as const, label: "Nombre" },
                        { key: "cuit_login" as const, label: "CUIT Login" },
                        { key: "cuit_consulta" as const, label: "CUIT Consulta" },
                        { key: "activo" as const, label: "Activo" },
                      ] as const
                    ).map((col) => (
                      <th
                        key={col.key}
                        onClick={() => clientTable.handleSort(col.key)}
                        className="px-3 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer select-none hover:text-gray-900"
                      >
                        <span className="inline-flex items-center">
                          {col.label}
                          <SortIcon active={clientTable.sortField === col.key} dir={clientTable.sortDir} />
                        </span>
                      </th>
                    ))}
                    <th className="px-3 py-2.5 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {clientTable.rows.map((c) => (
                    <tr
                      key={c.id}
                      className={`transition-colors ${selectedClientIds.has(c.id) ? "bg-blue-50/60" : "hover:bg-gray-50/60"}`}
                    >
                      <td className="px-3 py-2.5">
                        <input
                          type="checkbox"
                          checked={selectedClientIds.has(c.id)}
                          onChange={() => toggleClientSelection(c.id)}
                          className="h-4 w-4 rounded border-gray-300 text-blue-600"
                        />
                      </td>
                      <td className="px-3 py-2.5 text-sm font-medium text-gray-900">{c.nombre}</td>
                      <td className="px-3 py-2.5 text-sm text-gray-700 tabular-nums">{c.cuit_login}</td>
                      <td className="px-3 py-2.5 text-sm text-gray-700 tabular-nums">{c.cuit_consulta}</td>
                      <td className="px-3 py-2.5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          c.activo ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"
                        }`}>
                          {c.activo ? "Sí" : "No"}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEditClient(c)}
                            className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => deleteClient(c.id)}
                            className="text-red-500 hover:text-red-700 text-xs font-medium"
                          >
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {clientTable.rows.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-sm text-gray-500">
                        {clientes.length === 0
                          ? "No hay clientes cargados. Agregá uno con el botón de arriba."
                          : "Sin resultados para esta búsqueda"}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Execution bar */}
          <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-gray-200">
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">
                <span className="font-semibold text-gray-900">{selectedClientIds.size}</span> cliente{selectedClientIds.size !== 1 ? "s" : ""} seleccionado{selectedClientIds.size !== 1 ? "s" : ""}
              </span>
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">Periodo:</label>
                <select
                  value={periodo}
                  onChange={(e) => setPeriodo(e.target.value)}
                  className="px-2.5 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="1">1 mes</option>
                  <option value="2">2 meses</option>
                  <option value="3">3 meses</option>
                  <option value="6">6 meses</option>
                  <option value="12">12 meses</option>
                </select>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowLogs(!showLogs)}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                {showLogs ? "Ocultar logs" : "Ver logs"}
              </button>
              <button
                onClick={handleExecute}
                disabled={selectedClientIds.size === 0 || executing || status?.corriendo}
                className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {status?.corriendo ? "Ejecutando..." : executing ? "Encolando..." : "Ejecutar consulta"}
              </button>
            </div>
          </div>

          {execError && (
            <div className="mt-3 bg-red-50 text-red-700 text-sm p-3 rounded-lg">{execError}</div>
          )}

          {/* Log viewer */}
          {showLogs && (
            <div className="mt-4 bg-gray-900 rounded-lg overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2 bg-gray-800">
                <span className="text-gray-300 text-sm font-mono">Logs del scraper</span>
                <div className="flex gap-3">
                  <button onClick={pollLogs} className="text-xs text-gray-400 hover:text-white">Actualizar</button>
                  <button onClick={() => setShowLogs(false)} className="text-xs text-gray-400 hover:text-white">Cerrar</button>
                </div>
              </div>
              <div ref={logRef} className="p-4 max-h-64 overflow-y-auto font-mono text-xs leading-5">
                {logs.length === 0 ? (
                  <p className="text-gray-500">Sin logs aún. Ejecutá una consulta para ver la actividad.</p>
                ) : (
                  logs.map((line, i) => (
                    <div
                      key={i}
                      className={
                        line.includes("ERROR") ? "text-red-400" :
                        line.includes("WARNING") ? "text-yellow-400" :
                        line.includes("EXITOSO") ? "text-green-400" :
                        line.includes("INICIO") || line.includes("FIN") ? "text-cyan-400" :
                        "text-gray-300"
                      }
                    >
                      {line}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </Section>

      {/* ═══════════════════════════════════════════════════════════════════════
         2. HISTORIAL DE CONSULTAS (colapsable)
         ═══════════════════════════════════════════════════════════════════════ */}
      <Section
        title="Historial de Consultas"
        icon="📜"
        collapsible
        defaultOpen={false}
        badge={
          <span className="ml-2 bg-gray-100 text-gray-600 text-xs font-medium px-2 py-0.5 rounded-full">
            {consultaList.length}
          </span>
        }
      >
        <div className="px-5 py-4">
          <TableToolbar
            search={consultaTable.search}
            onSearch={consultaTable.setSearch}
            placeholder="Buscar por cliente, estado, periodo..."
            totalFiltered={consultaTable.totalFiltered}
            totalAll={consultaTable.totalAll}
            page={consultaTable.page}
            totalPages={consultaTable.totalPages}
            pageSize={consultaTable.pageSize}
            onPageChange={consultaTable.setPage}
            onPageSizeChange={consultaTable.setPageSize}
          />

          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="min-w-full">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-200">
                  {(
                    [
                      { key: "created_at" as const, label: "Fecha" },
                      { key: "cliente_nombre" as const, label: "Cliente" },
                      { key: "periodo" as const, label: "Periodo" },
                      { key: "estado" as const, label: "Estado" },
                      { key: "error_detalle" as const, label: "Error" },
                    ] as const
                  ).map((col) => (
                    <th
                      key={col.key}
                      onClick={() => consultaTable.handleSort(col.key)}
                      className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer select-none hover:text-gray-900"
                    >
                      <span className="inline-flex items-center">
                        {col.label}
                        <SortIcon active={consultaTable.sortField === col.key} dir={consultaTable.sortDir} />
                      </span>
                    </th>
                  ))}
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {consultaTable.rows.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-4 py-2.5 text-sm text-gray-500 whitespace-nowrap">
                      {new Date(c.created_at).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td className="px-4 py-2.5 text-sm text-gray-900">{c.cliente_nombre}</td>
                    <td className="px-4 py-2.5 text-sm text-gray-700">{c.periodo}m</td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${estadoConsultaBadge(c.estado)}`}>
                        {c.estado}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-sm text-red-600 max-w-xs truncate">{c.error_detalle}</td>
                    <td className="px-4 py-2.5 text-right">
                      <button
                        onClick={() => handleDeleteConsulta(c.id)}
                        className="text-red-500 hover:text-red-700 text-xs font-medium"
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
                {consultaTable.rows.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-sm text-gray-500">
                      Sin consultas registradas
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Section>

      {/* ═══════════════════════════════════════════════════════════════════════
         3. LISTADO DE DESCARGAS / DECLARACIONES JURADAS
         ═══════════════════════════════════════════════════════════════════════ */}
      <Section title="Declaraciones Juradas" icon="📥">
        <div className="px-5 py-4">
          <TableToolbar
            search={downloadTable.search}
            onSearch={downloadTable.setSearch}
            placeholder="Buscar por CUIT, formulario, estado, periodo..."
            totalFiltered={downloadTable.totalFiltered}
            totalAll={downloadTable.totalAll}
            page={downloadTable.page}
            totalPages={downloadTable.totalPages}
            pageSize={downloadTable.pageSize}
            onPageChange={downloadTable.setPage}
            onPageSizeChange={downloadTable.setPageSize}
            extra={
              <div className="flex gap-2">
                {selectedDownloadRows.size > 0 && (
                  <button
                    onClick={handleDeleteDownloads}
                    className="px-3 py-1.5 text-sm font-medium text-red-700 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                  >
                    Eliminar ({selectedDownloadRows.size})
                  </button>
                )}
                <button
                  onClick={exportDownloadsCSV}
                  disabled={downloadTable.rows.length === 0}
                  className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 transition-colors"
                >
                  Exportar CSV
                </button>
              </div>
            }
          />

          {loadingRecords ? (
            <div className="py-12 text-center">
              <div className="inline-block h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mb-2" />
              <p className="text-sm text-gray-500">Cargando declaraciones...</p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-gray-50/80 border-b border-gray-200">
                    <th className="w-10 px-3 py-2.5">
                      <input
                        type="checkbox"
                        checked={downloadTable.rows.length > 0 && selectedDownloadRows.size === downloadTable.rows.length}
                        onChange={toggleAllDownloads}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600"
                      />
                    </th>
                    {(
                      [
                        { key: "estado" as const, label: "Estado" },
                        { key: "cuit_cuil" as const, label: "CUIT/CUIL" },
                        { key: "formulario" as const, label: "Formulario" },
                        { key: "periodo" as const, label: "Período" },
                        { key: "transaccion" as const, label: "Transacción" },
                        { key: "fecha_presentacion" as const, label: "Fecha Presentación" },
                      ] as const
                    ).map((col) => (
                      <th
                        key={col.key}
                        onClick={() => downloadTable.handleSort(col.key)}
                        className="px-3 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer select-none hover:text-gray-900"
                      >
                        <span className="inline-flex items-center">
                          {col.label}
                          <SortIcon active={downloadTable.sortField === col.key} dir={downloadTable.sortDir} />
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {downloadTable.rows.map((r, i) => (
                    <tr
                      key={r.id}
                      className={`transition-colors ${
                        selectedDownloadRows.has(i) ? "bg-blue-50/60" : "hover:bg-gray-50/60"
                      }`}
                    >
                      <td className="px-3 py-2.5">
                        <input
                          type="checkbox"
                          checked={selectedDownloadRows.has(i)}
                          onChange={() => toggleDownloadRow(i)}
                          className="h-4 w-4 rounded border-gray-300 text-blue-600"
                        />
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${estadoDescargaBadge(r.estado)}`}>
                          {r.estado}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-sm font-medium text-gray-900 tabular-nums">{r.cuit_cuil}</td>
                      <td className="px-3 py-2.5 text-sm text-gray-700">{r.formulario}</td>
                      <td className="px-3 py-2.5 text-sm text-gray-700 tabular-nums">{r.periodo}</td>
                      <td className="px-3 py-2.5 text-sm text-gray-500 tabular-nums">{r.transaccion}</td>
                      <td className="px-3 py-2.5 text-sm text-gray-500">{r.fecha_presentacion}</td>
                    </tr>
                  ))}
                  {downloadTable.rows.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-12 text-center">
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
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Section>

      {/* ═══════════════════════════════════════════════════════════════════════
         CLIENT FORM MODAL
         ═══════════════════════════════════════════════════════════════════════ */}
      {showClientForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {editingClientId ? "Editar cliente" : "Nuevo cliente"}
            </h3>
            {clientFormError && (
              <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg mb-4">{clientFormError}</div>
            )}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                <input
                  type="text"
                  value={clientForm.nombre}
                  onChange={(e) => setClientForm({ ...clientForm, nombre: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">CUIT Login</label>
                <input
                  type="text"
                  value={clientForm.cuit_login}
                  onChange={(e) => setClientForm({ ...clientForm, cuit_login: e.target.value })}
                  disabled={!!editingClientId}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 disabled:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Clave Fiscal {editingClientId && <span className="text-gray-400 font-normal">(dejar vacío para no cambiar)</span>}
                </label>
                <input
                  type="password"
                  value={clientForm.clave_fiscal}
                  onChange={(e) => setClientForm({ ...clientForm, clave_fiscal: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  required={!editingClientId}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">CUIT Consulta</label>
                <input
                  type="text"
                  value={clientForm.cuit_consulta}
                  onChange={(e) => setClientForm({ ...clientForm, cuit_consulta: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  required
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={clientForm.activo}
                  onChange={(e) => setClientForm({ ...clientForm, activo: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600"
                />
                <span className="text-sm text-gray-700">Activo</span>
              </label>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowClientForm(false)}
                className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={saveClient}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
