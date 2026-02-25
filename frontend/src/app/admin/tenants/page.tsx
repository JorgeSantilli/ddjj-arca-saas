"use client";

import { useEffect, useState } from "react";
import { admin } from "@/lib/api";
import type { Tenant } from "@/lib/api";

interface TenantDetail {
  id: number;
  nombre: string;
  email: string;
  plan: string;
  activo: boolean;
  created_at: string;
  clientes_count: number;
  consultas_count: number;
}

export default function TenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [details, setDetails] = useState<Record<number, TenantDetail>>({});

  useEffect(() => {
    admin.tenants().then(async (list) => {
      setTenants(list);
      const detailMap: Record<number, TenantDetail> = {};
      const results = await Promise.all(
        list.map((t) => admin.tenantDetail(t.id).catch(() => null))
      );
      results.forEach((d) => {
        if (d) detailMap[(d as TenantDetail).id] = d as TenantDetail;
      });
      setDetails(detailMap);
    }).catch(console.error);
  }, []);

  async function toggleTenant(id: number) {
    await admin.toggleTenant(id);
    setTenants((prev) =>
      prev.map((t) => (t.id === id ? { ...t, activo: !t.activo } : t))
    );
  }

  const totalEstudios = tenants.length;
  const totalClientes = Object.values(details).reduce((s, d) => s + d.clientes_count, 0);
  const totalConsultas = Object.values(details).reduce((s, d) => s + d.consultas_count, 0);

  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-6">Estudios Contables</h2>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-gray-800 rounded-lg p-5 border-l-4 border-blue-500">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Estudios registrados</p>
          <p className="text-3xl font-bold text-blue-400 mt-1">{totalEstudios}</p>
        </div>
        <div className="bg-gray-800 rounded-lg p-5 border-l-4 border-green-500">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Clientes cargados</p>
          <p className="text-3xl font-bold text-green-400 mt-1">{totalClientes}</p>
        </div>
        <div className="bg-gray-800 rounded-lg p-5 border-l-4 border-purple-500">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Consultas realizadas</p>
          <p className="text-3xl font-bold text-purple-400 mt-1">{totalConsultas}</p>
        </div>
      </div>

      {/* Tenants table */}
      <div className="bg-gray-800 rounded-lg shadow overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-700">
          <thead className="bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Estudio</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Email</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-400 uppercase">Clientes</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-400 uppercase">Consultas</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Registro</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Estado</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {tenants.map((t) => {
              const d = details[t.id];
              return (
                <tr key={t.id} className="hover:bg-gray-750">
                  <td className="px-6 py-4 text-sm text-white font-medium">{t.nombre}</td>
                  <td className="px-6 py-4 text-sm text-gray-400">{t.email}</td>
                  <td className="px-6 py-4 text-center">
                    <span className="text-sm font-semibold text-green-400">
                      {d ? d.clientes_count : "—"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="text-sm font-semibold text-purple-400">
                      {d ? d.consultas_count : "—"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-400">
                    {t.created_at ? new Date(t.created_at).toLocaleDateString("es-AR") : "—"}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs rounded-full ${t.activo ? "bg-green-900 text-green-300" : "bg-red-900 text-red-300"}`}>
                      {t.activo ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => toggleTenant(t.id)}
                      className={`text-sm ${t.activo ? "text-red-400 hover:text-red-300" : "text-green-400 hover:text-green-300"}`}
                    >
                      {t.activo ? "Desactivar" : "Activar"}
                    </button>
                  </td>
                </tr>
              );
            })}
            {tenants.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                  No hay estudios registrados aún
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
