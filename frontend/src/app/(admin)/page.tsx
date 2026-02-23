"use client";

import { useEffect, useState } from "react";
import { admin } from "@/lib/api";
import type { AdminStats } from "@/lib/api";

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);

  useEffect(() => {
    admin.stats().then(setStats).catch(console.error);
  }, []);

  if (!stats) return <p className="text-gray-400">Cargando...</p>;

  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-6">Admin Dashboard</h2>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Tenants" value={stats.tenants} color="blue" />
        <StatCard label="Usuarios" value={stats.users} color="purple" />
        <StatCard label="Clientes ARCA" value={stats.clientes} color="green" />
        <StatCard label="Consultas totales" value={stats.consultas_total} color="gray" />
        <StatCard label="Exitosas" value={stats.consultas_exitosas} color="green" />
        <StatCard label="Errores" value={stats.consultas_error} color="red" />
        <StatCard label="Pendientes" value={stats.consultas_pendientes} color="yellow" />
        <StatCard label="Tasa de exito" value={`${stats.tasa_exito}%`} color="blue" />
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  const colors: Record<string, string> = {
    blue: "border-blue-500 text-blue-400",
    green: "border-green-500 text-green-400",
    red: "border-red-500 text-red-400",
    yellow: "border-yellow-500 text-yellow-400",
    purple: "border-purple-500 text-purple-400",
    gray: "border-gray-500 text-gray-400",
  };

  return (
    <div className={`bg-gray-800 rounded-lg p-4 border-l-4 ${colors[color]}`}>
      <p className="text-xs text-gray-500 uppercase">{label}</p>
      <p className={`text-2xl font-bold ${colors[color]?.split(" ")[1]}`}>{value}</p>
    </div>
  );
}
