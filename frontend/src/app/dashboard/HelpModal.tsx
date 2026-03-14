"use client";

import { useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────
type HelpSection = {
  id: string;
  icon: string;
  title: string;
  content: React.ReactNode;
};

// ─── Icons ────────────────────────────────────────────────────────────────────
function CloseIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg className={`h-4 w-4 transition-transform shrink-0 ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Step block: numbered step with title and description */
function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <div className="shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center mt-0.5">
        {n}
      </div>
      <div>
        <p className="text-sm font-semibold text-gray-800">{title}</p>
        <p className="text-sm text-gray-500 mt-0.5 leading-relaxed">{children}</p>
      </div>
    </div>
  );
}

/** Tip/callout block */
function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800 leading-relaxed">
      <span className="font-semibold">💡 Consejo: </span>{children}
    </div>
  );
}

/** Warning block */
function Warning({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-800 leading-relaxed">
      <span className="font-semibold">⚠️ Importante: </span>{children}
    </div>
  );
}

/** Info block */
function Info({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 text-sm text-blue-800 leading-relaxed">
      {children}
    </div>
  );
}

/** Badge reference row */
function BadgeRow({ color, label, desc }: { color: string; label: string; desc: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium shrink-0 ${color}`}>{label}</span>
      <span className="text-sm text-gray-600">{desc}</span>
    </div>
  );
}

// ─── Help sections content ────────────────────────────────────────────────────

const SECTIONS: HelpSection[] = [
  {
    id: "inicio",
    icon: "🚀",
    title: "Inicio rápido",
    content: (
      <div className="space-y-4">
        <p className="text-sm text-gray-600 leading-relaxed">
          DJControl automatiza la consulta de Declaraciones Juradas en ARCA (ex-AFIP). En lugar de entrar cliente por cliente, vos configurás tus clientes una sola vez y la plataforma hace todo el trabajo.
        </p>
        <div className="space-y-3">
          <Step n={1} title="Cargá tus clientes">
            En la sección <strong>Clientes</strong>, agregá cada cliente con su CUIT, clave fiscal y CUIT de consulta. También podés importar muchos clientes a la vez desde un archivo Excel, CSV o Google Sheets.
          </Step>
          <Step n={2} title="Seleccioná los clientes a consultar">
            Tildá los clientes que querés consultar usando los checkboxes. Podés usar <em>Seleccionar todos</em> o filtrar por activos / atrasados.
          </Step>
          <Step n={3} title="Elegí el período y ejecutá">
            Elegí cuántos meses hacia atrás consultar (1, 2, 3, 6 o 12 meses) y hacé clic en <strong>Ejecutar consulta</strong>. La plataforma consulta cada cliente en orden.
          </Step>
          <Step n={4} title="Revisá los resultados">
            Cuando termina, los resultados aparecen en <strong>Declaraciones Juradas</strong> y en la <strong>Planilla de Cumplimiento</strong> con semáforos de estado.
          </Step>
        </div>
        <Tip>La primera vez, instalá la extensión Chrome para poder entrar a ARCA directamente con un click desde la tabla de clientes.</Tip>
      </div>
    ),
  },

  {
    id: "clientes",
    icon: "📋",
    title: "Gestión de clientes",
    content: (
      <div className="space-y-5">
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-gray-800">Campos de un cliente</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Campo</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Descripción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {[
                  ["Nombre", "Nombre o razón social del cliente. Solo identificatorio, no afecta el scraping."],
                  ["CUIT Login", "El CUIT con el que se inicia sesión en ARCA (el del contador o el del cliente, según corresponda)."],
                  ["Clave Fiscal", "Contraseña de acceso a ARCA. Se guarda encriptada (AES-256). Nunca se muestra en texto plano en la tabla."],
                  ["CUIT Consulta", "El CUIT del contribuyente del que se quieren ver las DDJJ. Puede ser distinto al CUIT Login si el contador accede como representante."],
                  ["Tipo de cliente", "'Empleador' o 'No empleador'. Determina qué formularios se esperan en la planilla de cumplimiento."],
                  ["Activo", "Solo los clientes activos pueden ser seleccionados para ejecutar consultas."],
                ].map(([campo, desc]) => (
                  <tr key={campo} className="hover:bg-gray-50/60">
                    <td className="px-3 py-2 text-xs font-mono font-medium text-blue-700 whitespace-nowrap">{campo}</td>
                    <td className="px-3 py-2 text-gray-600">{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-gray-800">Editar un cliente</h4>
          <p className="text-sm text-gray-600 leading-relaxed">
            Hacé clic en <strong>Editar</strong> en la fila para editar inline sin abrir un modal. La fila se pone en amarillo. Si dejás la clave fiscal vacía, no se modifica.
          </p>
        </div>

        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-gray-800">Estado de DDJJ</h4>
          <div className="space-y-2">
            <BadgeRow color="bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20" label="Al día" desc="Presentó en el último período fiscal." />
            <BadgeRow color="bg-amber-50 text-amber-700 ring-1 ring-amber-600/20" label="Atrasado 1 mes" desc="Falta 1 mes de presentación." />
            <BadgeRow color="bg-red-50 text-red-700 ring-1 ring-red-600/20" label="Atrasado +1 mes" desc="Falta más de 1 mes. Requiere atención urgente." />
            <BadgeRow color="bg-gray-100 text-gray-500 ring-1 ring-gray-300/20" label="Sin datos" desc="Nunca se consultó o no hay descargas registradas para este cliente." />
          </div>
        </div>

        <Tip>Usá el filtro <strong>Solo atrasados</strong> para seleccionar rápidamente los clientes que necesitan consulta urgente.</Tip>
      </div>
    ),
  },

  {
    id: "importar",
    icon: "📤",
    title: "Importar clientes",
    content: (
      <div className="space-y-5">
        <p className="text-sm text-gray-600">Hacé clic en <strong>Importar clientes</strong> para abrir el modal. Tenés dos formas de cargar:</p>

        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-gray-800">Desde archivo (CSV o Excel)</h4>
          <div className="space-y-2">
            <Step n={1} title="Descargá la plantilla">
              En el modal, hacé clic en <strong>Plantilla CSV</strong> o <strong>Plantilla Excel (.xlsx)</strong>. La plantilla ya tiene las columnas correctas y filas de ejemplo.
            </Step>
            <Step n={2} title="Completá los datos">
              Llenás la planilla con los datos de tus clientes. Las columnas obligatorias son <code className="bg-gray-100 px-1 rounded text-xs">nombre</code>, <code className="bg-gray-100 px-1 rounded text-xs">cuit_login</code> y <code className="bg-gray-100 px-1 rounded text-xs">clave_fiscal</code>.
            </Step>
            <Step n={3} title="Subí el archivo">
              Hacé clic en <strong>Seleccionar archivo</strong> y elegí tu CSV o Excel. Se muestra una preview antes de confirmar.
            </Step>
            <Step n={4} title="Confirmá la importación">
              Revisá los datos en la tabla de preview y hacé clic en <strong>Importar</strong>. Si el CUIT ya existe, se actualiza. Si es nuevo, se crea.
            </Step>
          </div>
        </div>

        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-gray-800">Desde Google Sheets</h4>
          <div className="space-y-2">
            <Step n={1} title="Creá o abrí tu planilla en Google Sheets">
              Si no tenés una, descargá la plantilla Excel desde el tab Google Sheets e importala: en Sheets hacé <em>Archivo → Importar → Subir archivo</em>.
            </Step>
            <Step n={2} title="Compartí el Sheet como público">
              En Google Sheets: <em>Compartir → Cambiar a cualquier persona con el enlace</em>. Sin este paso, la importación va a fallar.
            </Step>
            <Step n={3} title="Copiá el link y pegalo">
              Pegá la URL del Sheet en el campo de texto y hacé clic en <strong>Cargar</strong>.
            </Step>
          </div>
        </div>

        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-gray-800">Columnas aceptadas</h4>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 font-mono text-xs text-gray-700 space-y-1">
            <p><span className="text-blue-600 font-bold">nombre</span> — obligatorio</p>
            <p><span className="text-blue-600 font-bold">cuit_login</span> — obligatorio (solo números, guiones opcionales)</p>
            <p><span className="text-blue-600 font-bold">clave_fiscal</span> — obligatorio</p>
            <p><span className="text-gray-400">cuit_consulta</span> — opcional (si no va, usa cuit_login)</p>
            <p><span className="text-gray-400">tipo_cliente</span> — opcional: empleador / no_empleador</p>
            <p><span className="text-gray-400">activo</span> — opcional: si / no</p>
          </div>
        </div>

        <Warning>El separador del CSV se detecta automáticamente (coma, punto y coma o tabulación). Si algo no se importa bien, chequeá que las columnas tengan exactamente esos nombres.</Warning>
      </div>
    ),
  },

  {
    id: "consultas",
    icon: "⚡",
    title: "Ejecutar consultas ARCA",
    content: (
      <div className="space-y-5">
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-gray-800">Cómo ejecutar una consulta</h4>
          <div className="space-y-2">
            <Step n={1} title="Seleccioná los clientes">
              Tildá los checkboxes de los clientes que querés consultar. Podés usar <em>Seleccionar todos</em> (solo toma activos) o filtrar por <em>Solo atrasados</em>.
            </Step>
            <Step n={2} title="Elegí el período">
              En el selector <strong>Período</strong>, elegí cuántos meses hacia atrás querés consultar. Recomendado: 1 mes para revisiones mensuales, 3 meses si hace tiempo que no consultás.
            </Step>
            <Step n={3} title="Ejecutá y monitoreá">
              Hacé clic en <strong>Ejecutar consulta</strong>. Los clientes se procesan uno por uno. Podés ver el progreso en tiempo real con <strong>Ver logs</strong>.
            </Step>
          </div>
        </div>

        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-gray-800">Estados de una consulta</h4>
          <div className="space-y-2">
            <BadgeRow color="bg-amber-50 text-amber-700 ring-1 ring-amber-600/20" label="pendiente" desc="En cola, esperando su turno para ejecutarse." />
            <BadgeRow color="bg-blue-50 text-blue-700 ring-1 ring-blue-600/20" label="en_proceso" desc="Ejecutándose ahora mismo en ARCA." />
            <BadgeRow color="bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20" label="exitoso" desc="Completado. Los datos están en Declaraciones Juradas." />
            <BadgeRow color="bg-red-50 text-red-700 ring-1 ring-red-600/20" label="error" desc="Falló. Ver la columna Error para entender la causa." />
          </div>
        </div>

        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-gray-800">Tipos de errores</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Error</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Solución</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {[
                  ["Credenciales incorrectas", "Verificá que la clave fiscal del cliente sea correcta y no haya vencido."],
                  ["CUIT no encontrado", "El CUIT Consulta no está habilitado como representado bajo el CUIT Login. Verificar en ARCA."],
                  ["Timeout / sesión expirada", "ARCA tardó demasiado en responder. Reintentá; suele resolverse solo."],
                  ["Sin resultados", "No hay DDJJ para ese período. El cliente puede no tener presentaciones en ese período."],
                  ["Error en ARCA", "Problema en la plataforma de ARCA. Esperá unos minutos y reintentá."],
                ].map(([err, sol]) => (
                  <tr key={err} className="hover:bg-gray-50/60">
                    <td className="px-3 py-2 text-xs font-medium text-red-700 whitespace-nowrap">{err}</td>
                    <td className="px-3 py-2 text-gray-600 text-xs">{sol}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <Tip>Usá el botón <strong>Reintentar fallidas</strong> para reintentar todas las consultas con error de una sola vez.</Tip>
        <Warning>Las consultas se ejecutan una por una. No cerrés el navegador mientras haya una consulta en proceso.</Warning>
      </div>
    ),
  },

  {
    id: "extension",
    icon: "🔌",
    title: "Extensión Chrome (Autologin)",
    content: (
      <div className="space-y-5">
        <p className="text-sm text-gray-600 leading-relaxed">
          La extensión permite entrar a ARCA directamente desde el panel haciendo clic en <strong>Entrar ARCA</strong> en la fila de un cliente. No hace falta copiar ni pegar la clave.
        </p>

        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-gray-800">Instalación (una sola vez)</h4>
          <div className="space-y-2">
            <Step n={1} title="Descargá la extensión">
              Hacé clic en el botón <strong>Descargar Extensión (.zip)</strong> en la parte superior del dashboard.
            </Step>
            <Step n={2} title="Descomprimí el archivo">
              Extraé el ZIP en una carpeta permanente (no la elimines después de instalar).
            </Step>
            <Step n={3} title="Abrí las extensiones de Chrome">
              En Chrome, abrí <code className="bg-gray-100 px-1 rounded text-xs">chrome://extensions</code> y activá el <strong>Modo desarrollador</strong> (arriba a la derecha).
            </Step>
            <Step n={4} title="Cargá la extensión">
              Hacé clic en <strong>Cargar descomprimida</strong> y seleccioná la carpeta que descomprimiste.
            </Step>
            <Step n={5} title="Verificá el ID">
              La extensión instalada debe mostrar el ID: <code className="bg-gray-100 px-1 rounded text-xs font-mono">pahlenbheihbjmakbfagmcglhifiepic</code>. Si el ID es diferente, desinstalá y volvé a intentarlo con el ZIP correcto.
            </Step>
          </div>
        </div>

        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-gray-800">Cómo usar el autologin</h4>
          <p className="text-sm text-gray-600 leading-relaxed">
            En la tabla de clientes, hacé clic en <strong>Entrar ARCA</strong> en la fila del cliente. La extensión abre ARCA en una nueva pestaña e ingresa el CUIT y la clave fiscal automáticamente. Tarda unos segundos entre cada paso para simular comportamiento humano.
          </p>
        </div>

        <Info>
          <p className="font-semibold mb-1">Requisitos</p>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li>Solo funciona en Google Chrome (no Edge, Firefox, Safari)</li>
            <li>La extensión debe estar instalada y habilitada</li>
            <li>El dashboard debe estar abierto en la misma URL de producción configurada en la extensión</li>
          </ul>
        </Info>

        <Warning>No cerrés la pestaña de ARCA que se abre hasta terminar tus gestiones. La extensión no guarda sesión.</Warning>
      </div>
    ),
  },

  {
    id: "cumplimiento",
    icon: "📊",
    title: "Planilla de cumplimiento",
    content: (
      <div className="space-y-5">
        <p className="text-sm text-gray-600 leading-relaxed">
          La Planilla de Cumplimiento es una vista visual tipo semáforo que muestra el estado de presentación de cada formulario para cada cliente. Ideal para revisiones rápidas.
        </p>

        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-gray-800">Cómo leer la planilla</h4>
          <ul className="space-y-2 text-sm text-gray-600">
            <li><strong>Filas</strong> = tus clientes (solo los activos)</li>
            <li><strong>Columnas</strong> = tipos de formulario (IVA, Ganancias, etc.)</li>
            <li><strong>Celdas</strong> = último período presentado + semáforo de estado</li>
          </ul>
        </div>

        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-gray-800">Semáforos de estado</h4>
          <div className="space-y-2">
            <BadgeRow color="bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20" label="Al día" desc="Presentó en el período fiscal vigente." />
            <BadgeRow color="bg-amber-50 text-amber-700 ring-1 ring-amber-600/20" label="Atrasado 1 mes" desc="Falta el último período. Requiere seguimiento." />
            <BadgeRow color="bg-red-50 text-red-700 ring-1 ring-red-600/20" label="Atrasado +1 mes" desc="Falta más de un mes. Urgente." />
            <BadgeRow color="bg-gray-100 text-gray-500" label="Sin datos" desc="No hay información registrada para este formulario." />
          </div>
        </div>

        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-gray-800">Funcionalidades</h4>
          <ul className="space-y-1.5 text-sm text-gray-600">
            <li>🔍 <strong>Buscador</strong> — filtrá clientes por nombre instantáneamente</li>
            <li>☑️ <strong>Columnas visibles</strong> — mostrá solo los formularios que te importan</li>
            <li>📌 <strong>Columna fija</strong> — el nombre del cliente se mantiene visible al hacer scroll horizontal</li>
            <li>🔄 <strong>Auto-actualización</strong> — se refresca automáticamente cuando termina una tanda de consultas</li>
          </ul>
        </div>

        <Tip>Si una columna aparece vacía para todos los clientes, probablemente ese formulario no está en el <strong>Diccionario de Formularios</strong>. Agregalo desde la sección Declaraciones Juradas.</Tip>
      </div>
    ),
  },

  {
    id: "ddjj",
    icon: "📥",
    title: "Declaraciones Juradas",
    content: (
      <div className="space-y-5">
        <p className="text-sm text-gray-600 leading-relaxed">
          Esta sección muestra todas las DDJJ descargadas de ARCA para tus clientes: formulario, estado, período, transacción y fecha de presentación.
        </p>

        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-gray-800">Columnas de la tabla</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Columna</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Descripción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {[
                  ["Cliente", "Nombre del cliente al que pertenece la declaración."],
                  ["Estado", "Estado de la presentación: Presentada, Pendiente, Rechazada, etc."],
                  ["CUIT/CUIL", "CUIT o CUIL del contribuyente que presentó."],
                  ["Formulario", "Código del formulario (ej: 931, F2002)."],
                  ["Descripción", "Nombre amigable del formulario, según el Diccionario de Formularios."],
                  ["Período", "Período al que corresponde la declaración (ej: 2026-02)."],
                  ["Transacción", "Número de transacción asignado por ARCA."],
                  ["Fecha de Presentación", "Fecha en que fue presentada ante ARCA."],
                ].map(([col, desc]) => (
                  <tr key={col} className="hover:bg-gray-50/60">
                    <td className="px-3 py-2 text-xs font-medium text-gray-700 whitespace-nowrap">{col}</td>
                    <td className="px-3 py-2 text-gray-600 text-xs">{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-gray-800">Exportar a CSV</h4>
          <p className="text-sm text-gray-600">
            Hacé clic en <strong>Exportar CSV</strong> para descargar la tabla actual (con los filtros aplicados) como un archivo CSV separado por punto y coma. Útil para armar reportes en Excel.
          </p>
        </div>

        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-gray-800">Eliminar registros</h4>
          <p className="text-sm text-gray-600">
            Tildá uno o más registros y hacé clic en <strong>Eliminar</strong>. Esto solo borra el registro de la DB de DJControl, no afecta nada en ARCA.
          </p>
        </div>
      </div>
    ),
  },

  {
    id: "diccionario",
    icon: "📖",
    title: "Diccionario de formularios",
    content: (
      <div className="space-y-5">
        <p className="text-sm text-gray-600 leading-relaxed">
          ARCA devuelve los formularios con códigos crípticos como <code className="bg-gray-100 px-1 rounded text-xs">931 v4700</code>. El Diccionario traduce esos códigos a nombres legibles como <em>&quot;DJ Empleador&quot;</em>.
        </p>

        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-gray-800">Cómo funciona</h4>
          <ul className="space-y-1.5 text-sm text-gray-600">
            <li>• La app trae 12 formularios comunes precargados (IVA, Ganancias, Bienes Personales, etc.)</li>
            <li>• Si un formulario no está en la lista, aparece con su código crudo en la tabla</li>
            <li>• Podés agregar códigos personalizados para tu estudio</li>
            <li>• Los personalizados tienen <strong>prioridad</strong> sobre los predeterminados</li>
          </ul>
        </div>

        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-gray-800">Cómo agregar un formulario</h4>
          <div className="space-y-2">
            <Step n={1} title="Abrí el Diccionario">
              En la sección Declaraciones Juradas, hacé clic en el botón <strong>Diccionario</strong>.
            </Step>
            <Step n={2} title="Copiá el código exacto">
              Buscá en la tabla de DDJJ el código que aparece en la columna Formulario y copialo tal cual.
            </Step>
            <Step n={3} title="Agregá la descripción">
              Pegá el código en el campo <em>Clave</em>, escribí el nombre en <em>Descripción</em> y hacé clic en <strong>Agregar</strong>.
            </Step>
          </div>
        </div>

        <Info>
          La normalización es automática: los códigos se convierten a minúsculas, se eliminan espacios y se quita la &quot;f&quot; inicial cuando corresponde. Por eso <em>F931</em>, <em>f931</em> y <em>931</em> apuntan al mismo formulario.
        </Info>
      </div>
    ),
  },

  {
    id: "logs",
    icon: "🖥️",
    title: "Logs del scraper",
    content: (
      <div className="space-y-4">
        <p className="text-sm text-gray-600 leading-relaxed">
          Los logs muestran en tiempo real qué está haciendo la automatización en ARCA. Son útiles para diagnosticar errores.
        </p>

        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-gray-800">Cómo acceder</h4>
          <p className="text-sm text-gray-600">
            Hacé clic en <strong>Ver logs</strong> en la barra de ejecución (debajo de la tabla de clientes). Se actualiza cada 3 segundos mientras hay una consulta activa.
          </p>
        </div>

        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-gray-800">Colores de los logs</h4>
          <div className="space-y-1.5 font-mono text-xs">
            <p className="text-cyan-400 bg-gray-900 px-3 py-1 rounded">INICIO / FIN — inicio y fin de un proceso completo</p>
            <p className="text-green-400 bg-gray-900 px-3 py-1 rounded">EXITOSO — consulta completada con éxito</p>
            <p className="text-red-400 bg-gray-900 px-3 py-1 rounded">ERROR — falló un paso del scraping</p>
            <p className="text-yellow-400 bg-gray-900 px-3 py-1 rounded">WARNING — advertencia no crítica</p>
            <p className="text-gray-300 bg-gray-900 px-3 py-1 rounded">Gris — información general del proceso</p>
          </div>
        </div>

        <Tip>Si una consulta falla y no entendés el error, copiá el log completo y compartilo para que podamos diagnosticar el problema.</Tip>
      </div>
    ),
  },
];

// ─── Main HelpModal ───────────────────────────────────────────────────────────

/** Full-screen help modal with sidebar navigation and per-section content */
export default function HelpModal({ onClose }: { onClose: () => void }) {
  const [activeId, setActiveId] = useState("inicio");
  const [mobileOpen, setMobileOpen] = useState<string | null>(null);

  const active = SECTIONS.find((s) => s.id === activeId) ?? SECTIONS[0];

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-3 sm:p-6">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white text-sm font-bold">?</div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Centro de Ayuda</h2>
              <p className="text-xs text-gray-500">Guía completa de DJControl</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <CloseIcon />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar — desktop */}
          <nav className="hidden sm:flex flex-col w-52 shrink-0 border-r border-gray-100 py-3 overflow-y-auto bg-gray-50/50">
            {SECTIONS.map((s) => (
              <button
                key={s.id}
                onClick={() => setActiveId(s.id)}
                className={`flex items-center gap-2.5 px-4 py-2.5 text-sm text-left transition-colors ${
                  activeId === s.id
                    ? "bg-blue-50 text-blue-700 font-semibold border-r-2 border-blue-600"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                }`}
              >
                <span className="text-base">{s.icon}</span>
                {s.title}
              </button>
            ))}
          </nav>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {/* Mobile: accordion */}
            <div className="sm:hidden divide-y divide-gray-100">
              {SECTIONS.map((s) => (
                <div key={s.id}>
                  <button
                    onClick={() => setMobileOpen(mobileOpen === s.id ? null : s.id)}
                    className="w-full flex items-center justify-between px-5 py-4 text-sm font-medium text-gray-800"
                  >
                    <span className="flex items-center gap-2">
                      <span>{s.icon}</span>{s.title}
                    </span>
                    <ChevronIcon open={mobileOpen === s.id} />
                  </button>
                  {mobileOpen === s.id && (
                    <div className="px-5 pb-5 border-t border-gray-100 bg-gray-50/40">
                      <div className="pt-4">{s.content}</div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Desktop: selected section */}
            <div className="hidden sm:block px-8 py-6">
              <h3 className="text-lg font-bold text-gray-900 mb-5 flex items-center gap-2">
                <span className="text-2xl">{active.icon}</span>
                {active.title}
              </h3>
              {active.content}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between shrink-0">
          <p className="text-xs text-gray-400">DJControl — Automatización de ARCA para contadores</p>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
