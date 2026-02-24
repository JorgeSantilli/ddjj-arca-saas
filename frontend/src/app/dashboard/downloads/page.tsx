"use client";

import { useEffect, useState } from "react";
import { downloads } from "@/lib/api";
import type { DownloadRecord } from "@/lib/api";

export default function DownloadsPage() {
  const [records, setRecords] = useState<DownloadRecord[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    downloads.list().then(setRecords).catch(console.error);
  }, []);

  const filtered = records.filter(
    (r) =>
      r.cuit_cuil.includes(search) ||
      r.formulario.toLowerCase().includes(search.toLowerCase()) ||
      r.cliente_cuit.includes(search) ||
      r.periodo.includes(search)
  );

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Descargas</h2>

      <div className="mb-4">
        <input
          type="text"
          placeholder="Buscar por CUIT, formulario, periodo..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-md text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">CUIT</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Formulario</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Periodo</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Transaccion</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Presentacion</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">CSV</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filtered.map((r, i) => (
              <tr key={i} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm text-gray-900">{r.cuit_cuil || r.cliente_cuit}</td>
                <td className="px-4 py-3 text-sm">{r.estado}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{r.formulario}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{r.periodo}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{r.transaccion}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{r.fecha_presentacion}</td>
                <td className="px-4 py-3 text-right">
                  <a
                    href={`/api/v1/downloads/file/${r.archivo}`}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    Descargar
                  </a>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                  {records.length === 0 ? "No hay descargas" : "Sin resultados para la busqueda"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
