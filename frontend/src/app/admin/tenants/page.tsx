"use client";

import { useEffect, useState } from "react";
import { admin } from "@/lib/api";
import type { Tenant } from "@/lib/api";

export default function TenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);

  useEffect(() => {
    admin.tenants().then(setTenants).catch(console.error);
  }, []);

  async function toggleTenant(id: number) {
    await admin.toggleTenant(id);
    setTenants((prev) =>
      prev.map((t) => (t.id === id ? { ...t, activo: !t.activo } : t))
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-6">Tenants</h2>

      <div className="bg-gray-800 rounded-lg shadow overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-700">
          <thead className="bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Estudio</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Plan</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Estado</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {tenants.map((t) => (
              <tr key={t.id} className="hover:bg-gray-750">
                <td className="px-6 py-4 text-sm text-gray-300">{t.id}</td>
                <td className="px-6 py-4 text-sm text-white font-medium">{t.nombre}</td>
                <td className="px-6 py-4 text-sm text-gray-400">{t.email}</td>
                <td className="px-6 py-4 text-sm text-gray-400">{t.plan}</td>
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
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
