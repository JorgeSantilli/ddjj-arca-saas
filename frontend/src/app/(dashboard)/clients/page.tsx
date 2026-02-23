"use client";

import { useEffect, useState } from "react";
import { clients } from "@/lib/api";
import type { Cliente, ClienteCreate } from "@/lib/api";

export default function ClientsPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<ClienteCreate>({
    nombre: "", cuit_login: "", clave_fiscal: "", cuit_consulta: "", activo: true,
  });
  const [error, setError] = useState("");

  useEffect(() => {
    loadClients();
  }, []);

  async function loadClients() {
    try {
      setClientes(await clients.list());
    } catch (err) {
      console.error(err);
    }
  }

  function openCreate() {
    setForm({ nombre: "", cuit_login: "", clave_fiscal: "", cuit_consulta: "", activo: true });
    setEditingId(null);
    setShowForm(true);
    setError("");
  }

  function openEdit(c: Cliente) {
    setForm({ nombre: c.nombre, cuit_login: c.cuit_login, clave_fiscal: "", cuit_consulta: c.cuit_consulta, activo: c.activo });
    setEditingId(c.id);
    setShowForm(true);
    setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      if (editingId) {
        const data: Partial<ClienteCreate> = { ...form };
        if (!data.clave_fiscal) delete data.clave_fiscal;
        await clients.update(editingId, data);
      } else {
        await clients.create(form);
      }
      setShowForm(false);
      loadClients();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Eliminar este cliente?")) return;
    await clients.delete(id);
    loadClients();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Clientes ARCA</h2>
        <button
          onClick={openCreate}
          className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
        >
          + Nuevo cliente
        </button>
      </div>

      {/* Modal form */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">
              {editingId ? "Editar cliente" : "Nuevo cliente"}
            </h3>
            {error && <div className="bg-red-50 text-red-700 p-3 rounded mb-4">{error}</div>}
            <form onSubmit={handleSubmit} className="space-y-3">
              <input
                placeholder="Nombre"
                required
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                className="w-full px-3 py-2 border rounded-md"
              />
              <input
                placeholder="CUIT Login"
                required={!editingId}
                value={form.cuit_login}
                onChange={(e) => setForm({ ...form, cuit_login: e.target.value })}
                className="w-full px-3 py-2 border rounded-md"
              />
              <input
                type="password"
                placeholder={editingId ? "Clave fiscal (dejar vacio para no cambiar)" : "Clave fiscal"}
                required={!editingId}
                value={form.clave_fiscal}
                onChange={(e) => setForm({ ...form, clave_fiscal: e.target.value })}
                className="w-full px-3 py-2 border rounded-md"
              />
              <input
                placeholder="CUIT Consulta"
                required={!editingId}
                value={form.cuit_consulta}
                onChange={(e) => setForm({ ...form, cuit_consulta: e.target.value })}
                className="w-full px-3 py-2 border rounded-md"
              />
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.activo}
                  onChange={(e) => setForm({ ...form, activo: e.target.checked })}
                />
                <span className="text-sm">Activo</span>
              </label>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2 border rounded-md">
                  Cancelar
                </button>
                <button type="submit" className="flex-1 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">CUIT Login</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">CUIT Consulta</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Activo</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {clientes.map((c) => (
              <tr key={c.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm font-medium text-gray-900">{c.nombre}</td>
                <td className="px-6 py-4 text-sm text-gray-500">{c.cuit_login}</td>
                <td className="px-6 py-4 text-sm text-gray-500">{c.cuit_consulta}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 text-xs rounded-full ${c.activo ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-500"}`}>
                    {c.activo ? "Si" : "No"}
                  </span>
                </td>
                <td className="px-6 py-4 text-right space-x-2">
                  <button onClick={() => openEdit(c)} className="text-blue-600 hover:text-blue-800 text-sm">Editar</button>
                  <button onClick={() => handleDelete(c.id)} className="text-red-600 hover:text-red-800 text-sm">Eliminar</button>
                </td>
              </tr>
            ))}
            {clientes.length === 0 && (
              <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">No hay clientes cargados</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
