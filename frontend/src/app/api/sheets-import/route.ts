import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const rawUrl = request.nextUrl.searchParams.get("url");
  if (!rawUrl) {
    return NextResponse.json({ error: "URL requerida" }, { status: 400 });
  }

  // Validar el hostname con URL parsing real (no con includes/regex sobre el string crudo)
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return NextResponse.json(
      { error: "URL inválida." },
      { status: 400 }
    );
  }

  if (parsed.hostname !== "docs.google.com") {
    return NextResponse.json(
      { error: "URL inválida. Debe ser una URL de Google Sheets (docs.google.com)." },
      { status: 400 }
    );
  }

  // Extraer el Sheet ID del pathname (nunca usar la URL del usuario directamente)
  const sheetIdMatch = parsed.pathname.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (!sheetIdMatch) {
    return NextResponse.json(
      { error: "No se pudo extraer el ID del spreadsheet desde la URL." },
      { status: 400 }
    );
  }

  // Construir URL segura desde el ID extraído (nunca desde la URL del usuario)
  const sheetId = sheetIdMatch[1];
  const safeExportUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(safeExportUrl, { signal: controller.signal });
    clearTimeout(timeout);

    if (!response.ok) {
      return NextResponse.json(
        { error: "No se pudo acceder al spreadsheet. Verificá que esté compartido con 'Cualquier persona con el enlace'." },
        { status: 400 }
      );
    }

    const csv = await response.text();
    return new NextResponse(csv, {
      headers: { "Content-Type": "text/csv; charset=utf-8" },
    });
  } catch (err) {
    const isTimeout = err instanceof Error && err.name === "AbortError";
    return NextResponse.json(
      { error: isTimeout ? "Tiempo de espera agotado al conectar con Google Sheets." : "Error al conectar con Google Sheets." },
      { status: 500 }
    );
  }
}
