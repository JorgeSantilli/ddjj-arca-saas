"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import {
  clients as clientsApi,
  consultations,
  downloads,
  formDictionary,
} from "@/lib/api";
import type {
  Cliente,
  ClienteCreate,
  ClienteImportRow,
  ClienteImportResult,
  ConsultaStatus,
  Consulta,
  DownloadRecord,
  FormDictEntry,
} from "@/lib/api";
import { useTable } from "@/hooks/useTable";
import ComplianceMatrix from "./ComplianceMatrix";

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

const EyeIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
);

const EyeOffIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.542 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
  </svg>
);

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

function estadoDdjjBadge(estado: string) {
  switch (estado) {
    case "al_dia": return { label: "Al día", css: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20" };
    case "atrasado_1": return { label: "Atrasado 1 mes", css: "bg-amber-50 text-amber-700 ring-1 ring-amber-600/20" };
    case "atrasado_critico": return { label: "Atrasado +1 mes", css: "bg-red-50 text-red-700 ring-1 ring-red-600/20" };
    default: return { label: "Sin datos", css: "bg-gray-100 text-gray-500 ring-1 ring-gray-300/20" };
  }
}

// ─── Error category labels ───────────────────────────────────────────────────
const ERROR_CATEGORY_LABELS: Record<string, string> = {
  credenciales: "Credenciales incorrectas",
  cuit_no_encontrado: "CUIT no encontrado",
  timeout: "Timeout / sesión expirada",
  sin_resultados: "Sin resultados",
  arca_error: "Error en ARCA",
  desconocido: "Error desconocido",
};

function errorCategoriaBadge(categoria: string | null) {
  if (!categoria) return null;
  const label = ERROR_CATEGORY_LABELS[categoria] || categoria;
  const css = categoria === "credenciales" || categoria === "cuit_no_encontrado"
    ? "bg-red-50 text-red-700 ring-1 ring-red-600/20"
    : categoria === "timeout" || categoria === "arca_error"
    ? "bg-amber-50 text-amber-700 ring-1 ring-amber-600/20"
    : "bg-gray-100 text-gray-600 ring-1 ring-gray-300/20";
  return { label, css };
}

// ─── CSV parser ──────────────────────────────────────────────────────────────
function parseCSV(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  // Detect separator
  const firstLine = lines[0];
  const sep = firstLine.includes("\t") ? "\t" : firstLine.includes(";") ? ";" : ",";

  const headers = lines[0].split(sep).map((h) => h.trim().replace(/^["']|["']$/g, "").toLowerCase());
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const vals = lines[i].split(sep).map((v) => v.trim().replace(/^["']|["']$/g, ""));
    if (vals.length < 2) continue;
    const row: Record<string, string> = {};
    headers.forEach((h, j) => { row[h] = vals[j] || ""; });
    rows.push(row);
  }
  return rows;
}

function mapCSVRow(row: Record<string, string>): ClienteImportRow | null {
  const get = (...keys: string[]) => {
    for (const k of keys) {
      const v = row[k];
      if (v) return v;
    }
    return "";
  };
  const nombre = get("nombre", "name", "razon_social", "razón social", "razon social");
  const cuit_login = get("cuit_login", "cuit", "cuit login");
  const clave_fiscal = get("clave_fiscal", "clave", "clave fiscal", "password", "contraseña");
  const cuit_consulta = get("cuit_consulta", "cuit consulta", "cuit_de_consulta") || cuit_login;
  const tipo = get("tipo_cliente", "tipo", "type");
  const activo_str = get("activo", "active");

  if (!nombre || !cuit_login || !clave_fiscal) return null;

  return {
    nombre,
    cuit_login: cuit_login.replace(/\D/g, ""),
    clave_fiscal,
    cuit_consulta: cuit_consulta.replace(/\D/g, ""),
    tipo_cliente: tipo === "empleador" ? "empleador" : "no_empleador",
    activo: activo_str ? !["no", "false", "0", "inactivo"].includes(activo_str.toLowerCase()) : true,
  };
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
  const [onlyAtrasados, setOnlyAtrasados] = useState(false);

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
    nombre: "", cuit_login: "", clave_fiscal: "", cuit_consulta: "", activo: true, tipo_cliente: "no_empleador",
  });
  const [clientFormError, setClientFormError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loadingPassword, setLoadingPassword] = useState(false);

  // ─── Inline editing ─────────────────────────────────────────────────────
  const [editingRowId, setEditingRowId] = useState<number | null>(null);
  const [editData, setEditData] = useState<Partial<ClienteCreate>>({});

  // ─── CSV Import ────────────────────────────────────────────────────────
  const [showImportPreview, setShowImportPreview] = useState(false);
  const [importRows, setImportRows] = useState<ClienteImportRow[]>([]);
  const [importResult, setImportResult] = useState<ClienteImportResult | null>(null);
  const [importing, setImporting] = useState(false);
  const csvInputRef = useRef<HTMLInputElement>(null);

  // ─── Download selection ───────────────────────────────────────────────────
  const [selectedDownloadRows, setSelectedDownloadRows] = useState<Set<number>>(new Set());

  // ─── Form dictionary modal ────────────────────────────────────────────────
  const [showDictModal, setShowDictModal] = useState(false);
  const [dictEntries, setDictEntries] = useState<FormDictEntry[]>([]);
  const [dictForm, setDictForm] = useState({ clave: "", descripcion: "" });
  const [editingDictId, setEditingDictId] = useState<number | null>(null);
  const [dictLoading, setDictLoading] = useState(false);

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
      clientsApi.list().then(setClientes).catch(console.error);
    }
    prevRunning.current = status?.corriendo ?? false;
  }, [status?.corriendo]);

  // ─── Client filtering ────────────────────────────────────────────────────
  const visibleClientes = useMemo(() => {
    let filtered = clientes;
    if (onlyActive) filtered = filtered.filter((c) => c.activo);
    if (onlyAtrasados) filtered = filtered.filter((c) => c.estado_ddjj !== "al_dia");
    return filtered;
  }, [clientes, onlyActive, onlyAtrasados]);

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
    setClientForm({ nombre: "", cuit_login: "", clave_fiscal: "", cuit_consulta: "", activo: true, tipo_cliente: "no_empleador" });
    setClientFormError("");
    setShowPassword(false);
    setShowClientForm(true);
  }

  async function handleShowPassword() {
    if (!editingClientId) return;
    if (showPassword) {
      setShowPassword(false);
      setClientForm((f) => ({ ...f, clave_fiscal: "" }));
      return;
    }
    setLoadingPassword(true);
    try {
      const data = await clientsApi.getPassword(editingClientId);
      setClientForm((f) => ({ ...f, clave_fiscal: data.clave_fiscal }));
      setShowPassword(true);
    } catch (err) {
      setClientFormError(err instanceof Error ? err.message : "Error al obtener clave");
    } finally {
      setLoadingPassword(false);
    }
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

  // ─── Inline edit handlers ────────────────────────────────────────────────
  function startInlineEdit(c: Cliente) {
    setEditingRowId(c.id);
    setEditData({
      nombre: c.nombre,
      cuit_login: c.cuit_login,
      clave_fiscal: "",
      cuit_consulta: c.cuit_consulta,
      activo: c.activo,
      tipo_cliente: c.tipo_cliente || "no_empleador",
    });
  }

  function cancelInlineEdit() {
    setEditingRowId(null);
    setEditData({});
  }

  async function saveInlineEdit() {
    if (!editingRowId) return;
    if (!confirm("¿Guardar cambios?")) return;
    try {
      const data: Partial<ClienteCreate> = { ...editData };
      if (!data.clave_fiscal) delete data.clave_fiscal;
      await clientsApi.update(editingRowId, data);
      setEditingRowId(null);
      setEditData({});
      setClientes(await clientsApi.list());
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error al guardar");
    }
  }

  // ─── CSV import handlers ──────────────────────────────────────────────────
  function handleCSVFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const parsed = parseCSV(text);
      const mapped = parsed.map(mapCSVRow).filter(Boolean) as ClienteImportRow[];
      setImportRows(mapped);
      setImportResult(null);
      setShowImportPreview(true);
    };
    reader.readAsText(file, "UTF-8");
    // Reset input so same file can be selected again
    e.target.value = "";
  }

  async function handleImport() {
    if (importRows.length === 0) return;
    setImporting(true);
    try {
      const result = await clientsApi.import({ clientes: importRows });
      setImportResult(result);
      setClientes(await clientsApi.list());
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error al importar");
    } finally {
      setImporting(false);
    }
  }

  // ─── Consultation retry handlers ──────────────────────────────────────────
  async function handleRetryConsulta(id: number) {
    await consultations.retry(id);
    setTimeout(poll, 500);
  }

  async function handleRetryFailed() {
    const failedIds = consultaList.filter((c) => c.estado === "error").map((c) => c.id);
    if (failedIds.length === 0) return;
    if (!confirm(`¿Reintentar ${failedIds.length} consulta(s) fallida(s)?`)) return;
    await consultations.retryBatch(failedIds);
    setTimeout(poll, 500);
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
    const headers = ["Cliente", "Estado", "CUIT/CUIL", "Formulario", "Descripción", "Período", "Transacción", "Fecha de Presentación"];
    const csvRows = downloadTable.rows.map((r) => [
      r.cliente_nombre, r.estado, r.cuit_cuil, r.formulario, r.descripcion_formulario, r.periodo, r.transaccion, r.fecha_presentacion,
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

  // ─── Form dictionary handlers ─────────────────────────────────────────────
  async function openDictModal() {
    setShowDictModal(true);
    setDictLoading(true);
    try {
      const entries = await formDictionary.list();
      setDictEntries(entries);
    } catch (err) {
      console.error(err);
    } finally {
      setDictLoading(false);
    }
  }

  async function saveDictEntry() {
    if (!dictForm.clave || !dictForm.descripcion) return;
    try {
      if (editingDictId) {
        await formDictionary.update(editingDictId, dictForm);
      } else {
        await formDictionary.create(dictForm);
      }
      setDictForm({ clave: "", descripcion: "" });
      setEditingDictId(null);
      const updated = await formDictionary.list();
      setDictEntries(updated);
      // Refresh downloads to reflect new descriptions
      downloads.list().then(setRecords).catch(console.error);
    } catch (err) {
      console.error(err);
    }
  }

  async function deleteDictEntry(id: number) {
    if (id === 0) return; // default entries can't be deleted
    await formDictionary.delete(id);
    const updated = await formDictionary.list();
    setDictEntries(updated);
    downloads.list().then(setRecords).catch(console.error);
  }

  function editDictEntry(entry: FormDictEntry) {
    if (entry.is_default) {
      // Create a tenant override from a default
      setEditingDictId(null);
      setDictForm({ clave: entry.clave, descripcion: entry.descripcion });
    } else {
      setEditingDictId(entry.id);
      setDictForm({ clave: entry.clave, descripcion: entry.descripcion });
    }
  }

  // ─── Table hooks ──────────────────────────────────────────────────────────
  const clientTable = useTable<Cliente>({
    data: visibleClientes,
    defaultSort: "nombre",
    defaultSortDir: "asc",
    defaultPageSize: 25,
    searchFields: ["nombre", "cuit_login", "cuit_consulta", "tipo_cliente"],
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
    searchFields: ["cliente_nombre", "estado", "cuit_cuil", "formulario", "descripcion_formulario", "periodo", "transaccion", "fecha_presentacion"],
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
              <label className="flex items-center gap-1.5 text-sm text-gray-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={onlyAtrasados}
                  onChange={(e) => setOnlyAtrasados(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-gray-300 text-blue-600"
                />
                Solo atrasados
              </label>
            </div>
            <div className="flex items-center gap-2">
              <input
                ref={csvInputRef}
                type="file"
                accept=".csv,.tsv,.txt"
                onChange={handleCSVFile}
                className="hidden"
              />
              <button
                onClick={() => csvInputRef.current?.click()}
                className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Importar CSV
              </button>
              <button
                onClick={openNewClient}
                className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
              >
                + Nuevo cliente
              </button>
            </div>
          </div>

          <TableToolbar
            search={clientTable.search}
            onSearch={clientTable.setSearch}
            placeholder="Buscar por nombre, CUIT, tipo..."
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
                        { key: "tipo_cliente" as const, label: "Tipo" },
                        { key: "activo" as const, label: "Activo" },
                        { key: "estado_ddjj" as const, label: "Último DDJJ" },
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
                  {clientTable.rows.map((c) => {
                    const ddjjStatus = estadoDdjjBadge(c.estado_ddjj);
                    const isEditing = editingRowId === c.id;
                    return (
                      <tr
                        key={c.id}
                        className={`transition-colors ${isEditing ? "bg-yellow-50/60" : selectedClientIds.has(c.id) ? "bg-blue-50/60" : "hover:bg-gray-50/60"}`}
                      >
                        <td className="px-3 py-2.5">
                          <input
                            type="checkbox"
                            checked={selectedClientIds.has(c.id)}
                            onChange={() => toggleClientSelection(c.id)}
                            disabled={isEditing}
                            className="h-4 w-4 rounded border-gray-300 text-blue-600"
                          />
                        </td>
                        <td className="px-3 py-2.5">
                          {isEditing ? (
                            <input type="text" value={editData.nombre || ""} onChange={(e) => setEditData({ ...editData, nombre: e.target.value })} className="w-full px-2 py-1 border border-gray-300 rounded text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                          ) : (
                            <a
                              href={`/api/v1/clients/${c.id}/autologin`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm font-medium text-blue-700 hover:text-blue-900 hover:underline cursor-pointer"
                              title="Acceso rapido a ARCA"
                              onClick={(e) => e.stopPropagation()}
                            >{c.nombre}</a>
                          )}
                        </td>
                        <td className="px-3 py-2.5">
                          {isEditing ? (
                            <input type="text" value={editData.cuit_login || ""} onChange={(e) => setEditData({ ...editData, cuit_login: e.target.value })} className="w-full px-2 py-1 border border-gray-300 rounded text-sm text-gray-900 tabular-nums focus:outline-none focus:ring-1 focus:ring-blue-500" />
                          ) : (
                            <span className="text-sm text-gray-700 tabular-nums">{c.cuit_login}</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5">
                          {isEditing ? (
                            <input type="text" value={editData.cuit_consulta || ""} onChange={(e) => setEditData({ ...editData, cuit_consulta: e.target.value })} className="w-full px-2 py-1 border border-gray-300 rounded text-sm text-gray-900 tabular-nums focus:outline-none focus:ring-1 focus:ring-blue-500" />
                          ) : (
                            <span className="text-sm text-gray-700 tabular-nums">{c.cuit_consulta}</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5">
                          {isEditing ? (
                            <select value={editData.tipo_cliente || "no_empleador"} onChange={(e) => setEditData({ ...editData, tipo_cliente: e.target.value })} className="px-2 py-1 border border-gray-300 rounded text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500">
                              <option value="no_empleador">No empleador</option>
                              <option value="empleador">Empleador</option>
                            </select>
                          ) : (
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              c.tipo_cliente === "empleador"
                                ? "bg-purple-50 text-purple-700 ring-1 ring-purple-600/20"
                                : "bg-gray-100 text-gray-600 ring-1 ring-gray-300/20"
                            }`}>
                              {c.tipo_cliente === "empleador" ? "Empleador" : "No empleador"}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2.5">
                          {isEditing ? (
                            <input type="checkbox" checked={editData.activo ?? true} onChange={(e) => setEditData({ ...editData, activo: e.target.checked })} className="h-4 w-4 rounded border-gray-300 text-blue-600" />
                          ) : (
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              c.activo ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"
                            }`}>
                              {c.activo ? "Sí" : "No"}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2.5">
                          {isEditing ? (
                            <input type="password" placeholder="(sin cambios)" value={editData.clave_fiscal || ""} onChange={(e) => setEditData({ ...editData, clave_fiscal: e.target.value })} className="w-full px-2 py-1 border border-gray-300 rounded text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                          ) : (
                            <div className="flex flex-col">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${ddjjStatus.css}`}>
                                {ddjjStatus.label}
                              </span>
                              {c.ultimo_periodo && (
                                <span className="text-[10px] text-gray-400 mt-0.5">{c.ultimo_periodo}</span>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          {isEditing ? (
                            <div className="flex items-center justify-end gap-2">
                              <button onClick={saveInlineEdit} className="text-emerald-600 hover:text-emerald-800 text-xs font-medium">Guardar</button>
                              <button onClick={cancelInlineEdit} className="text-gray-500 hover:text-gray-700 text-xs font-medium">Cancelar</button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-end gap-2">
                              <button onClick={() => startInlineEdit(c)} className="text-blue-600 hover:text-blue-800 text-xs font-medium">Editar</button>
                              <button onClick={() => deleteClient(c.id)} className="text-red-500 hover:text-red-700 text-xs font-medium">Eliminar</button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {clientTable.rows.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-10 text-center text-sm text-gray-500">
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
            extra={
              consultaList.some((c) => c.estado === "error") ? (
                <button
                  onClick={handleRetryFailed}
                  className="px-3 py-1.5 text-sm font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors"
                >
                  Reintentar fallidas ({consultaList.filter((c) => c.estado === "error").length})
                </button>
              ) : undefined
            }
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
                {consultaTable.rows.map((c) => {
                  const catBadge = c.estado === "error" ? errorCategoriaBadge(c.error_categoria) : null;
                  return (
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
                        {c.reintentos > 0 && (
                          <span className="ml-1 text-[10px] text-gray-400">({c.reintentos}x)</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 max-w-xs">
                        {catBadge ? (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${catBadge.css}`} title={c.error_detalle || ""}>
                            {catBadge.label}
                          </span>
                        ) : (
                          <span className="text-sm text-red-600 truncate block" title={c.error_detalle || ""}>{c.error_detalle}</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {c.estado === "error" && (
                            <button
                              onClick={() => handleRetryConsulta(c.id)}
                              className="text-amber-600 hover:text-amber-800 text-xs font-medium"
                            >
                              Reintentar
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteConsulta(c.id)}
                            className="text-red-500 hover:text-red-700 text-xs font-medium"
                          >
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
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
         3. PLANILLA DE CUMPLIMIENTO (Matriz en tiempo real)
         ═══════════════════════════════════════════════════════════════════════ */}
      <Section title="Planilla de Cumplimiento" icon="📊" collapsible defaultOpen={true}>
        <div className="px-5 py-6">
          <ComplianceMatrix />
        </div>
      </Section>

      {/* ═══════════════════════════════════════════════════════════════════════
         4. LISTADO DE DESCARGAS / DECLARACIONES JURADAS
         ═══════════════════════════════════════════════════════════════════════ */}
      <Section title="Declaraciones Juradas" icon="📥">
        <div className="px-5 py-4">
          <TableToolbar
            search={downloadTable.search}
            onSearch={downloadTable.setSearch}
            placeholder="Buscar por cliente, CUIT, formulario, descripción, estado..."
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
                  onClick={openDictModal}
                  className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Diccionario
                </button>
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
                        { key: "cliente_nombre" as const, label: "Cliente" },
                        { key: "estado" as const, label: "Estado" },
                        { key: "cuit_cuil" as const, label: "CUIT/CUIL" },
                        { key: "formulario" as const, label: "Formulario" },
                        { key: "descripcion_formulario" as const, label: "Descripción" },
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
                      <td className="px-3 py-2.5 text-sm font-medium text-gray-900">{r.cliente_nombre}</td>
                      <td className="px-3 py-2.5">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${estadoDescargaBadge(r.estado)}`}>
                          {r.estado}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-sm text-gray-700 tabular-nums">{r.cuit_cuil}</td>
                      <td className="px-3 py-2.5 text-sm text-gray-700">{r.formulario}</td>
                      <td className="px-3 py-2.5 text-sm text-gray-500 italic">
                        {r.descripcion_formulario || <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-3 py-2.5 text-sm text-gray-700 tabular-nums">{r.periodo}</td>
                      <td className="px-3 py-2.5 text-sm text-gray-500 tabular-nums">{r.transaccion}</td>
                      <td className="px-3 py-2.5 text-sm text-gray-500">{r.fecha_presentacion}</td>
                    </tr>
                  ))}
                  {downloadTable.rows.length === 0 && (
                    <tr>
                      <td colSpan={9} className="py-12 text-center">
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
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={clientForm.clave_fiscal}
                    onChange={(e) => setClientForm({ ...clientForm, clave_fiscal: e.target.value })}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    required={!editingClientId}
                  />
                  <button
                    type="button"
                    onClick={editingClientId ? handleShowPassword : () => setShowPassword(!showPassword)}
                    disabled={loadingPassword}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50"
                    title={showPassword ? "Ocultar" : "Mostrar"}
                  >
                    {loadingPassword ? (
                      <div className="h-4 w-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                    ) : showPassword ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de cliente</label>
                <select
                  value={clientForm.tipo_cliente}
                  onChange={(e) => setClientForm({ ...clientForm, tipo_cliente: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  <option value="no_empleador">No empleador</option>
                  <option value="empleador">Empleador</option>
                </select>
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

      {/* ═══════════════════════════════════════════════════════════════════════
         FORM DICTIONARY MODAL
         ═══════════════════════════════════════════════════════════════════════ */}
      {showDictModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Diccionario de Formularios</h3>
              <button
                onClick={() => { setShowDictModal(false); setEditingDictId(null); setDictForm({ clave: "", descripcion: "" }); }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Add/Edit form */}
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                placeholder="Clave (ej: 931 v4700)"
                value={dictForm.clave}
                onChange={(e) => setDictForm({ ...dictForm, clave: e.target.value })}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
              <input
                type="text"
                placeholder="Descripción (ej: DJ EMPLEADOR)"
                value={dictForm.descripcion}
                onChange={(e) => setDictForm({ ...dictForm, descripcion: e.target.value })}
                className="flex-[2] px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
              <button
                onClick={saveDictEntry}
                disabled={!dictForm.clave || !dictForm.descripcion}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-40 transition-colors whitespace-nowrap"
              >
                {editingDictId ? "Actualizar" : "Agregar"}
              </button>
              {editingDictId && (
                <button
                  onClick={() => { setEditingDictId(null); setDictForm({ clave: "", descripcion: "" }); }}
                  className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700"
                >
                  Cancelar
                </button>
              )}
            </div>

            {/* Entries table */}
            <div className="overflow-y-auto flex-1 border border-gray-200 rounded-lg">
              {dictLoading ? (
                <div className="py-8 text-center">
                  <div className="inline-block h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <table className="min-w-full">
                  <thead className="sticky top-0 bg-gray-50">
                    <tr className="border-b border-gray-200">
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Clave</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Descripción</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Tipo</th>
                      <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600 uppercase">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {dictEntries.map((entry) => (
                      <tr key={`${entry.id}-${entry.clave}`} className="hover:bg-gray-50/60">
                        <td className="px-4 py-2 text-sm font-mono text-gray-900">{entry.clave}</td>
                        <td className="px-4 py-2 text-sm text-gray-700">{entry.descripcion}</td>
                        <td className="px-4 py-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            entry.is_default
                              ? "bg-gray-100 text-gray-500"
                              : "bg-blue-50 text-blue-700"
                          }`}>
                            {entry.is_default ? "Por defecto" : "Personalizado"}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => editDictEntry(entry)}
                              className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                            >
                              {entry.is_default ? "Personalizar" : "Editar"}
                            </button>
                            {!entry.is_default && (
                              <button
                                onClick={() => deleteDictEntry(entry.id)}
                                className="text-red-500 hover:text-red-700 text-xs font-medium"
                              >
                                Eliminar
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {dictEntries.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-sm text-gray-500">
                          Sin entradas en el diccionario
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>

            <p className="mt-3 text-xs text-gray-400">
              Las entradas por defecto aplican a todos los tenants. Las personalizadas son exclusivas de tu cuenta y tienen prioridad.
            </p>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
         CSV IMPORT PREVIEW MODAL
         ═══════════════════════════════════════════════════════════════════════ */}
      {showImportPreview && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full p-6 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Importar Clientes desde CSV
              </h3>
              <button
                onClick={() => { setShowImportPreview(false); setImportRows([]); setImportResult(null); }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {importResult ? (
              <div className="space-y-4">
                <div className="flex gap-3">
                  {importResult.created > 0 && (
                    <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-emerald-50 text-emerald-700">
                      {importResult.created} creado{importResult.created !== 1 ? "s" : ""}
                    </span>
                  )}
                  {importResult.updated > 0 && (
                    <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-blue-50 text-blue-700">
                      {importResult.updated} actualizado{importResult.updated !== 1 ? "s" : ""}
                    </span>
                  )}
                  {importResult.errors.length > 0 && (
                    <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-red-50 text-red-700">
                      {importResult.errors.length} error{importResult.errors.length !== 1 ? "es" : ""}
                    </span>
                  )}
                </div>
                {importResult.errors.length > 0 && (
                  <div className="overflow-auto max-h-48 border border-red-200 rounded-lg">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="bg-red-50 border-b border-red-200">
                          <th className="px-3 py-2 text-left text-xs font-semibold text-red-700">Fila</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-red-700">Nombre</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-red-700">Error</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-red-100">
                        {importResult.errors.map((err, i) => (
                          <tr key={i}>
                            <td className="px-3 py-2 text-gray-700">{err.row}</td>
                            <td className="px-3 py-2 text-gray-700">{err.nombre}</td>
                            <td className="px-3 py-2 text-red-600">{err.error}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <div className="flex justify-end">
                  <button
                    onClick={() => { setShowImportPreview(false); setImportRows([]); setImportResult(null); }}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            ) : (
              <>
                {importRows.length === 0 ? (
                  <div className="py-10 text-center text-sm text-gray-500">
                    No se encontraron datos válidos en el archivo CSV.
                    <br />
                    <span className="text-xs text-gray-400 mt-1 block">
                      Columnas esperadas: nombre, cuit_login, clave_fiscal, cuit_consulta (opcional), tipo_cliente (opcional), activo (opcional)
                    </span>
                  </div>
                ) : (
                  <>
                    <div className="overflow-auto flex-1 border border-gray-200 rounded-lg mb-4">
                      <table className="min-w-full text-sm">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-200">
                            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">#</th>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Nombre</th>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">CUIT Login</th>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Clave</th>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">CUIT Consulta</th>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Tipo</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {importRows.map((row, i) => (
                            <tr key={i} className="hover:bg-gray-50/60">
                              <td className="px-3 py-2 text-gray-500">{i + 1}</td>
                              <td className="px-3 py-2 text-gray-900">{row.nombre}</td>
                              <td className="px-3 py-2 text-gray-700 tabular-nums">{row.cuit_login}</td>
                              <td className="px-3 py-2 text-gray-400">{"•".repeat(Math.min(row.clave_fiscal.length, 8))}</td>
                              <td className="px-3 py-2 text-gray-700 tabular-nums">{row.cuit_consulta}</td>
                              <td className="px-3 py-2 text-gray-600">{row.tipo_cliente}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">
                        {importRows.length} cliente{importRows.length !== 1 ? "s" : ""} a importar
                      </span>
                      <div className="flex gap-3">
                        <button
                          onClick={() => { setShowImportPreview(false); setImportRows([]); }}
                          className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={handleImport}
                          disabled={importing}
                          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-40"
                        >
                          {importing ? "Importando..." : `Importar ${importRows.length} cliente${importRows.length !== 1 ? "s" : ""}`}
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
