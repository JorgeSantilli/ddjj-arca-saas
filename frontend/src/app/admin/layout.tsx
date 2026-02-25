"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { auth } from "@/lib/api";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Cargando...</p>
      </div>
    );
  }

  if (!user || !user.is_superadmin) {
    if (typeof window !== "undefined") router.push("/login");
    return null;
  }

  async function handleLogout() {
    await auth.logout();
    router.push("/login");
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <header className="bg-gray-800 text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <h1 className="text-xl font-bold text-yellow-400">DJControl Admin</h1>
            <nav className="flex gap-1">
              <Link
                href="/admin"
                className={`px-3 py-1.5 rounded text-sm ${
                  pathname === "/admin" ? "bg-gray-700 text-white" : "text-gray-300 hover:bg-gray-700"
                }`}
              >
                Dashboard
              </Link>
              <Link
                href="/admin/tenants"
                className={`px-3 py-1.5 rounded text-sm ${
                  pathname === "/admin/tenants" ? "bg-gray-700 text-white" : "text-gray-300 hover:bg-gray-700"
                }`}
              >
                Tenants
              </Link>
              <Link
                href="/dashboard"
                className="px-3 py-1.5 rounded text-sm text-blue-300 hover:bg-gray-700"
              >
                Ir al panel
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-400">{user.nombre}</span>
            <button onClick={handleLogout} className="text-sm text-gray-400 hover:text-white">
              Salir
            </button>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
