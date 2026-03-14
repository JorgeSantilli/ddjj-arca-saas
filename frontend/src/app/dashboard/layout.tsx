"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { auth } from "@/lib/api";
import HelpModal from "./HelpModal";

const navItems = [
  { href: "/dashboard", label: "Operaciones" },
  { href: "/dashboard/downloads", label: "Descargas" },
];

const LEGAL_CONTENT = `DJControl es una herramienta de automatización desarrollada de forma independiente. No es un producto oficial de ARCA (ex-AFIP) ni está afiliada a ningún organismo gubernamental.

• La automatización depende de la disponibilidad y el funcionamiento del sitio web de ARCA. DJControl no garantiza disponibilidad continua ante cambios en la plataforma oficial.

• El usuario es el único responsable de la veracidad, corrección y seguridad de las credenciales (CUIT y claves fiscales) ingresadas en la plataforma.

• Los resultados obtenidos deben ser verificados por el profesional contable responsable antes de tomar decisiones basadas en ellos.

• DJControl no asume responsabilidad por multas, incumplimientos, errores u omisiones derivados del uso de la plataforma, ya sea por fallas técnicas, cambios en ARCA, datos incorrectos ingresados por el usuario, o cualquier otra causa.

• El uso de esta plataforma implica la aceptación de estos términos.`;

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [showLegal, setShowLegal] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Cargando...</p>
      </div>
    );
  }

  if (!user) {
    if (typeof window !== "undefined") router.push("/login");
    return null;
  }

  async function handleLogout() {
    await auth.logout();
    router.push("/login");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-blue-900 text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <h1 className="text-xl font-bold">DJControl</h1>
            <nav className="hidden md:flex gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-1.5 rounded text-sm ${
                    pathname === item.href
                      ? "bg-blue-700 text-white"
                      : "text-blue-200 hover:bg-blue-800 hover:text-white"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
              {user.is_superadmin && (
                <Link
                  href="/admin"
                  className="px-3 py-1.5 rounded text-sm text-yellow-300 hover:bg-blue-800"
                >
                  Admin
                </Link>
              )}
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-blue-200">{user.nombre}</span>
            <button
              onClick={() => setShowHelp(true)}
              className="w-7 h-7 rounded-full bg-blue-700 hover:bg-blue-600 flex items-center justify-center text-white text-xs font-bold transition-colors"
              title="Ayuda"
            >
              ?
            </button>
            <button
              onClick={handleLogout}
              className="text-sm text-blue-300 hover:text-white"
            >
              Salir
            </button>
          </div>
        </div>
      </header>

      {/* Mobile nav */}
      <nav className="md:hidden bg-blue-800 px-4 py-2 flex gap-2 overflow-x-auto">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`px-3 py-1 rounded text-sm whitespace-nowrap ${
              pathname === item.href
                ? "bg-blue-600 text-white"
                : "text-blue-200"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">{children}</main>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white mt-8">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between text-xs text-gray-400">
          <span>&copy; {new Date().getFullYear()} DJControl</span>
          <button
            onClick={() => setShowLegal(true)}
            className="hover:text-gray-600 underline underline-offset-2 transition-colors"
          >
            Aviso legal
          </button>
        </div>
      </footer>

      {/* Help Modal */}
      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}

      {/* Legal Modal */}
      {showLegal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-gray-900">Aviso Legal y Deslinde de Responsabilidades</h3>
              <button
                onClick={() => setShowLegal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="overflow-y-auto flex-1">
              {LEGAL_CONTENT.split("\n").map((line, i) => (
                <p key={i} className={`text-sm text-gray-600 leading-relaxed ${line.startsWith("•") ? "ml-2 mb-2" : line === "" ? "mb-3" : "mb-3 font-medium text-gray-700"}`}>
                  {line}
                </p>
              ))}
            </div>
            <div className="flex justify-end mt-4 pt-4 border-t border-gray-100">
              <button
                onClick={() => setShowLegal(false)}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
