"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { clients as clientsApi, consultations } from "@/lib/api";
import type { Cliente, ConsultaStatus } from "@/lib/api";

export default function ConsultationsPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [status, setStatus] = useState<ConsultaStatus | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [periodo, setPeriodo] = useState("1");
  const [executing, setExecuting] = useState(false);
  const [error, setError] = useState("");
  const [logs, setLogs] = useState<string[]>([]);
  const [showLogs, setShowLogs] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    clientsApi.list().then(setClientes).catch(console.error);
    consultations.status().then(setStatus).catch(console.error);
  }, []);

  // Polling status + logs
  const poll = useCallback(() => {
    consultations.status().then(setStatus).catch(console.error);
  }, []);

  const pollLogs = useCallback(() => {
    consultations.logs(200).then((res) => {
      setLogs(res.logs);
      // Auto-scroll to bottom
      setTimeout(() => {
        if (logRef.current) {
          logRef.current.scrollTop = logRef.current.scrollHeight;
        }
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

  // Also poll logs when log panel is opened
  useEffect(() => {
    if (showLogs) {
      pollLogs();
      const interval = setInterval(pollLogs, 3000);
      return () => clearInterval(interval);
    }
  }, [showLogs, pollLogs]);

  function toggleClient(id: number) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  }

  function selectAllActive() {
    setSelectedIds(clientes.filter((c) => c.activo).map((c) => c.id));
  }

  async function handleExecute() {
    if (selectedIds.length === 0) {
      setError("Selecciona al menos un cliente");
      return;
    }
    setError("");
    setExecuting(true);
    setShowLogs(true);
    try {
      await consultations.execute({ cliente_ids: selectedIds, periodo, headless: true });
      setSelectedIds([]);
      setTimeout(poll, 1000);
      setTimeout(pollLogs, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al ejecutar");
    } finally {
      setExecuting(false);
    }
  }

  async function handleDeleteConsulta(id: number) {
    await consultations.delete(id);
    poll();
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Consultas ARCA</h2>

      {/* Execute form */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h3 className="font-semibold text-gray-900 mb-4">Ejecutar consulta</h3>
        {error && <div className="bg-red-50 text-red-700 p-3 rounded mb-4">{error}</div>}

        <div className="mb-4">
          <div className="flex gap-2 mb-3">
            <button onClick={selectAllActive} className="text-sm text-blue-600 hover:text-blue-800">
              Seleccionar activos
            </button>
            <button onClick={() => setSelectedIds([])} className="text-sm text-gray-600 hover:text-gray-800">
              Deseleccionar
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto">
            {clientes.map((c) => (
              <label key={c.id} className="flex items-center gap-2 p-2 rounded hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedIds.includes(c.id)}
                  onChange={() => toggleClient(c.id)}
                />
                <span className="text-sm text-gray-900">{c.nombre}</span>
                {!c.activo && <span className="text-xs text-gray-400">(inactivo)</span>}
              </label>
            ))}
          </div>
        </div>

        <div className="flex items-end gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Periodo (meses)</label>
            <select
              value={periodo}
              onChange={(e) => setPeriodo(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="1">1 mes</option>
              <option value="2">2 meses</option>
              <option value="3">3 meses</option>
              <option value="6">6 meses</option>
              <option value="12">12 meses</option>
            </select>
          </div>
          <button
            onClick={handleExecute}
            disabled={executing || status?.corriendo}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {status?.corriendo ? "Ejecutando..." : executing ? "Encolando..." : "Ejecutar consulta"}
          </button>
          <button
            onClick={() => setShowLogs(!showLogs)}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 text-sm"
          >
            {showLogs ? "Ocultar logs" : "Ver logs"}
          </button>
        </div>

        {status?.corriendo && (
          <div className="mt-4 bg-blue-50 border border-blue-200 rounded p-3">
            <p className="text-blue-700 text-sm font-medium">{status.detalle || "Procesando..."}</p>
          </div>
        )}
      </div>

      {/* Log viewer */}
      {showLogs && (
        <div className="bg-gray-900 rounded-lg shadow mb-6 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 bg-gray-800">
            <span className="text-gray-300 text-sm font-mono">Logs del scraper</span>
            <div className="flex gap-2">
              <button
                onClick={pollLogs}
                className="text-xs text-gray-400 hover:text-white"
              >
                Actualizar
              </button>
              <button
                onClick={() => setShowLogs(false)}
                className="text-xs text-gray-400 hover:text-white"
              >
                Cerrar
              </button>
            </div>
          </div>
          <div
            ref={logRef}
            className="p-4 max-h-80 overflow-y-auto font-mono text-xs leading-5"
          >
            {logs.length === 0 ? (
              <p className="text-gray-500">Sin logs aun. Ejecuta una consulta para ver la actividad.</p>
            ) : (
              logs.map((line, i) => (
                <div
                  key={i}
                  className={`${
                    line.includes("ERROR") ? "text-red-400" :
                    line.includes("WARNING") ? "text-yellow-400" :
                    line.includes("EXITOSO") ? "text-green-400" :
                    line.includes("INICIO") || line.includes("FIN") ? "text-cyan-400" :
                    "text-gray-300"
                  }`}
                >
                  {line}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* History table */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b">
          <h3 className="font-semibold text-gray-900">Historial de consultas</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Periodo</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Error</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {status?.consultas.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(c.created_at).toLocaleString("es-AR")}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">{c.cliente_nombre}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{c.periodo}m</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                      c.estado === "exitoso" ? "bg-green-100 text-green-800" :
                      c.estado === "error" ? "bg-red-100 text-red-800" :
                      c.estado === "en_proceso" ? "bg-blue-100 text-blue-800" :
                      "bg-yellow-100 text-yellow-800"
                    }`}>
                      {c.estado}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-red-600 max-w-xs truncate">
                    {c.error_detalle}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleDeleteConsulta(c.id)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
