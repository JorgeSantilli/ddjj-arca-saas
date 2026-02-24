"use client";

import { useEffect, useState } from "react";
import { consultations } from "@/lib/api";
import type { ConsultaStatus } from "@/lib/api";

export default function DashboardPage() {
  const [status, setStatus] = useState<ConsultaStatus | null>(null);

  useEffect(() => {
    consultations.status().then(setStatus).catch(console.error);
  }, []);

  const exitosas = status?.consultas.filter((c) => c.estado === "exitoso").length || 0;
  const errores = status?.consultas.filter((c) => c.estado === "error").length || 0;
  const pendientes = status?.consultas.filter((c) => ["pendiente", "en_proceso"].includes(c.estado)).length || 0;

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Panel</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-500">Exitosas</p>
          <p className="text-3xl font-bold text-green-600">{exitosas}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-500">Errores</p>
          <p className="text-3xl font-bold text-red-600">{errores}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-500">En proceso</p>
          <p className="text-3xl font-bold text-blue-600">{pendientes}</p>
        </div>
      </div>

      {status?.corriendo && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-blue-700 font-medium">Ejecutando consultas...</p>
          <p className="text-blue-600 text-sm">{status.detalle}</p>
        </div>
      )}

      {/* Recent consultations */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b">
          <h3 className="font-semibold text-gray-900">Ultimas consultas</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Periodo</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {status?.consultas.slice(0, 10).map((c) => (
                <tr key={c.id}>
                  <td className="px-6 py-4 text-sm text-gray-900">{c.cliente_nombre}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{c.periodo} meses</td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-1 text-xs rounded-full font-medium ${
                        c.estado === "exitoso"
                          ? "bg-green-100 text-green-800"
                          : c.estado === "error"
                            ? "bg-red-100 text-red-800"
                            : c.estado === "en_proceso"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {c.estado}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(c.created_at).toLocaleDateString("es-AR")}
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
