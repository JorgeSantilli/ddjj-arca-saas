"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/api";

/* ───────── Intersection Observer hook for scroll animations ───────── */
function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.15 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return { ref, visible };
}

function Reveal({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const { ref, visible } = useReveal();
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(32px)",
        transition: `opacity 0.7s cubic-bezier(.22,1,.36,1) ${delay}s, transform 0.7s cubic-bezier(.22,1,.36,1) ${delay}s`,
      }}
    >
      {children}
    </div>
  );
}

/* ───────── SVG Icons (inline, no deps) ───────── */
function ClockIcon() {
  return (
    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  );
}
function ShieldIcon() {
  return (
    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
    </svg>
  );
}
function ChartIcon() {
  return (
    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
    </svg>
  );
}
function KeyIcon() {
  return (
    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1 1 21.75 8.25Z" />
    </svg>
  );
}
function UsersIcon() {
  return (
    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
    </svg>
  );
}
function BoltIcon() {
  return (
    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />
    </svg>
  );
}
function CheckCircleIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  );
}
function ArrowRightIcon() {
  return (
    <svg className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
    </svg>
  );
}

/* ───────── LANDING PAGE ───────── */
export default function LandingPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  // If already logged in → redirect to dashboard
  useEffect(() => {
    auth.me()
      .then(() => router.replace("/dashboard"))
      .catch(() => setChecking(false));
  }, [router]);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-gray-900 overflow-x-hidden">
      {/* ─── NAVBAR ─── */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-white/80 backdrop-blur-lg border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm tracking-tight">DJ</span>
            </div>
            <span className="text-xl font-bold tracking-tight text-gray-900">
              DJ<span className="text-blue-600">Control</span>
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm font-medium text-gray-600 hover:text-gray-900 px-4 py-2 rounded-lg transition-colors"
            >
              Iniciar sesión
            </Link>
            <Link
              href="/register"
              className="text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 px-5 py-2.5 rounded-lg transition-colors shadow-sm shadow-blue-600/20"
            >
              Comenzar gratis
            </Link>
          </div>
        </div>
      </nav>

      {/* ─── HERO ─── */}
      <section className="pt-32 pb-20 md:pt-44 md:pb-32 relative">
        {/* Subtle background pattern */}
        <div className="absolute inset-0 -z-10" style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, #e5e7eb 1px, transparent 0)",
          backgroundSize: "40px 40px",
          opacity: 0.5,
        }} />
        <div className="absolute top-20 right-0 w-[500px] h-[500px] bg-blue-50 rounded-full blur-3xl -z-10 opacity-60" />

        <div className="max-w-6xl mx-auto px-6">
          <div className="max-w-3xl">
            <Reveal>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-100 rounded-full text-sm text-blue-700 font-medium mb-8">
                <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                Plataforma para estudios contables
              </div>
            </Reveal>

            <Reveal delay={0.1}>
              <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight leading-[1.1] text-gray-900">
                Dejá de perder{" "}
                <span className="relative">
                  <span className="text-blue-600">horas en ARCA</span>
                  <span className="absolute bottom-1 left-0 right-0 h-3 bg-blue-100 -z-10 rounded" />
                </span>{" "}
                cada mes
              </h1>
            </Reveal>

            <Reveal delay={0.2}>
              <p className="mt-6 text-lg md:text-xl text-gray-500 leading-relaxed max-w-2xl">
                Automatizá la consulta de Declaraciones Juradas de todos tus clientes.
                Un click, todos los CUIT, resultados al instante.
              </p>
            </Reveal>

            <Reveal delay={0.3}>
              <div className="mt-10 flex flex-col sm:flex-row items-start gap-4">
                <Link
                  href="/register"
                  className="group inline-flex items-center text-base font-semibold text-white bg-blue-600 hover:bg-blue-700 px-8 py-4 rounded-xl transition-all shadow-lg shadow-blue-600/25 hover:shadow-xl hover:shadow-blue-600/30"
                >
                  Comenzar gratis
                  <ArrowRightIcon />
                </Link>
                <div className="flex items-center gap-2 text-sm text-gray-400 pt-2 sm:pt-4">
                  <CheckCircleIcon className="w-4 h-4 text-green-500" />
                  Sin tarjeta de crédito
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ─── PROBLEMA ─── */}
      <section className="py-20 bg-gray-50 border-y border-gray-100">
        <div className="max-w-6xl mx-auto px-6">
          <Reveal>
            <p className="text-sm font-semibold text-blue-600 uppercase tracking-widest mb-3">El problema</p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-gray-900 max-w-xl">
              Cada mes, el mismo proceso tedioso
            </h2>
          </Reveal>

          <div className="mt-12 grid md:grid-cols-3 gap-6">
            {[
              {
                title: "Horas perdidas",
                desc: "Entrar a ARCA cliente por cliente, navegar menús, aceptar juramentos, exportar datos. Repetido 50 veces.",
                accent: "bg-red-50 text-red-600 border-red-100",
              },
              {
                title: "Olvidos costosos",
                desc: "Un cliente sin presentar a tiempo significa multas e intereses. Es imposible hacer seguimiento manual de todos.",
                accent: "bg-amber-50 text-amber-600 border-amber-100",
              },
              {
                title: "Credenciales dispersas",
                desc: "CUIT y claves fiscales repartidos en planillas, post-its, chats. Sin orden ni seguridad.",
                accent: "bg-orange-50 text-orange-600 border-orange-100",
              },
            ].map((item, i) => (
              <Reveal key={item.title} delay={i * 0.1}>
                <div className={`rounded-2xl border p-8 h-full ${item.accent}`}>
                  <h3 className="text-lg font-bold mb-3">{item.title}</h3>
                  <p className="text-sm leading-relaxed opacity-80">{item.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ─── BENEFICIOS ─── */}
      <section className="py-24">
        <div className="max-w-6xl mx-auto px-6">
          <Reveal>
            <p className="text-sm font-semibold text-blue-600 uppercase tracking-widest mb-3">Beneficios</p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-gray-900 max-w-xl">
              Todo lo que necesitás, en un solo lugar
            </h2>
          </Reveal>

          <div className="mt-16 grid md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-12">
            {[
              { icon: <ClockIcon />, title: "Ahorrá +18 horas al mes", desc: "Más de 2 jornadas laborales completas que podés dedicar a asesorar clientes en lugar de navegar ARCA." },
              { icon: <ShieldIcon />, title: "Cero olvidos, cero multas", desc: "Visualizá de un vistazo qué clientes están al día y cuáles están atrasados con badges de estado automáticos." },
              { icon: <KeyIcon />, title: "Credenciales centralizadas", desc: "Todas las claves fiscales y CUIT de tus clientes organizados y accesibles desde un solo panel." },
              { icon: <ChartIcon />, title: "Historial completo", desc: "Registro de cada consulta realizada con fecha, estado y resultados. Trazabilidad total para tu estudio." },
              { icon: <UsersIcon />, title: "Multi-cliente", desc: "Gestioná 10, 50 o 200 clientes con la misma facilidad. La plataforma escala con tu estudio." },
              { icon: <BoltIcon />, title: "Ejecución automática", desc: "Un click para consultar todos tus clientes. La plataforma se encarga del resto mientras vos seguís trabajando." },
            ].map((item, i) => (
              <Reveal key={item.title} delay={(i % 3) * 0.1}>
                <div className="group">
                  <div className="w-14 h-14 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-5 group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300">
                    {item.icon}
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{item.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{item.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CÓMO FUNCIONA ─── */}
      <section className="py-24 bg-gray-50 border-y border-gray-100">
        <div className="max-w-6xl mx-auto px-6">
          <Reveal>
            <p className="text-sm font-semibold text-blue-600 uppercase tracking-widest mb-3">Cómo funciona</p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-gray-900 max-w-xl">
              Tres pasos. Así de simple.
            </h2>
          </Reveal>

          <div className="mt-16 grid md:grid-cols-3 gap-8">
            {[
              { step: "01", title: "Cargá tus clientes", desc: "Ingresá el CUIT y las credenciales de cada cliente una sola vez. Después, la plataforma los recuerda." },
              { step: "02", title: "Ejecutá la consulta", desc: "Con un solo click, DJControl consulta las DDJJ de todos tus clientes en ARCA automáticamente." },
              { step: "03", title: "Revisá los resultados", desc: "Toda la información organizada en un panel claro: quién presentó, quién no, qué formularios y qué períodos." },
            ].map((item, i) => (
              <Reveal key={item.step} delay={i * 0.15}>
                <div className="relative bg-white rounded-2xl border border-gray-200 p-8 h-full hover:border-blue-200 hover:shadow-lg hover:shadow-blue-50 transition-all duration-300">
                  <span className="text-5xl font-black text-blue-100 absolute top-6 right-8 select-none">
                    {item.step}
                  </span>
                  <div className="relative">
                    <h3 className="text-lg font-bold text-gray-900 mb-3 mt-4">{item.title}</h3>
                    <p className="text-sm text-gray-500 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ─── NÚMEROS DE IMPACTO ─── */}
      <section className="py-24">
        <div className="max-w-6xl mx-auto px-6">
          <Reveal>
            <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-3xl p-10 md:p-16 text-white relative overflow-hidden">
              {/* Decorative circles */}
              <div className="absolute -top-20 -right-20 w-64 h-64 bg-white/5 rounded-full" />
              <div className="absolute -bottom-32 -left-16 w-80 h-80 bg-white/5 rounded-full" />

              <div className="relative">
                <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-12 text-center">
                  El impacto en números
                </h2>

                <div className="grid sm:grid-cols-3 gap-8 text-center">
                  {[
                    { number: "+18hs", label: "ahorradas por mes", sub: "Más de 2 jornadas laborales" },
                    { number: "1 click", label: "para todos tus clientes", sub: "Ejecución masiva automática" },
                    { number: "100%", label: "control de vencimientos", sub: "Nunca más un olvido" },
                  ].map((item, i) => (
                    <Reveal key={item.number} delay={i * 0.1}>
                      <div>
                        <p className="text-4xl md:text-5xl font-black mb-2">{item.number}</p>
                        <p className="text-base font-semibold text-blue-100">{item.label}</p>
                        <p className="text-sm text-blue-200 mt-1">{item.sub}</p>
                      </div>
                    </Reveal>
                  ))}
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ─── CTA FINAL ─── */}
      <section className="py-24 border-t border-gray-100">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <Reveal>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-gray-900">
              Empezá a ahorrar tiempo hoy
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="mt-4 text-lg text-gray-500 max-w-lg mx-auto">
              Registrate gratis y automatizá la consulta de DDJJ de todos tus clientes en minutos.
            </p>
          </Reveal>
          <Reveal delay={0.2}>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/register"
                className="group inline-flex items-center text-base font-semibold text-white bg-blue-600 hover:bg-blue-700 px-10 py-4 rounded-xl transition-all shadow-lg shadow-blue-600/25 hover:shadow-xl hover:shadow-blue-600/30"
              >
                Crear cuenta gratis
                <ArrowRightIcon />
              </Link>
              <Link
                href="/login"
                className="text-base font-medium text-gray-500 hover:text-gray-900 px-6 py-4 transition-colors"
              >
                Ya tengo cuenta
              </Link>
            </div>
          </Reveal>
          <Reveal delay={0.3}>
            <div className="mt-6 flex items-center justify-center gap-6 text-sm text-gray-400">
              <span className="flex items-center gap-1.5">
                <CheckCircleIcon className="w-4 h-4 text-green-500" />
                Gratis para empezar
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircleIcon className="w-4 h-4 text-green-500" />
                Sin tarjeta de crédito
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircleIcon className="w-4 h-4 text-green-500" />
                Configuración en minutos
              </span>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="py-10 border-t border-gray-100 bg-gray-50">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-blue-600 flex items-center justify-center">
              <span className="text-white font-bold text-xs">DJ</span>
            </div>
            <span className="text-sm font-semibold text-gray-900">DJControl</span>
          </div>
          <p className="text-sm text-gray-400">
            &copy; {new Date().getFullYear()} DJControl. Todos los derechos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
