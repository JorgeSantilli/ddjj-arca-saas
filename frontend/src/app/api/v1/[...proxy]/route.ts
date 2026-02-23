import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";

async function proxyRequest(req: NextRequest, method: string) {
  const path = req.nextUrl.pathname; // /api/v1/...
  const search = req.nextUrl.search;
  const url = `${BACKEND_URL}${path}${search}`;

  const headers: HeadersInit = {};
  const cookie = req.headers.get("cookie");
  if (cookie) headers["cookie"] = cookie;
  const contentType = req.headers.get("content-type");
  if (contentType) headers["content-type"] = contentType;

  const fetchOpts: RequestInit = { method, headers };

  if (method !== "GET" && method !== "HEAD") {
    try {
      fetchOpts.body = await req.text();
    } catch {
      // no body
    }
  }

  const backendRes = await fetch(url, fetchOpts);

  const responseHeaders = new Headers();
  // Forward Set-Cookie from backend
  const setCookie = backendRes.headers.get("set-cookie");
  if (setCookie) responseHeaders.set("set-cookie", setCookie);
  responseHeaders.set("content-type", backendRes.headers.get("content-type") || "application/json");

  if (backendRes.status === 204) {
    return new NextResponse(null, { status: 204, headers: responseHeaders });
  }

  const body = await backendRes.text();
  return new NextResponse(body, {
    status: backendRes.status,
    headers: responseHeaders,
  });
}

export async function GET(req: NextRequest) {
  return proxyRequest(req, "GET");
}

export async function POST(req: NextRequest) {
  return proxyRequest(req, "POST");
}

export async function PUT(req: NextRequest) {
  return proxyRequest(req, "PUT");
}

export async function DELETE(req: NextRequest) {
  return proxyRequest(req, "DELETE");
}

export async function PATCH(req: NextRequest) {
  return proxyRequest(req, "PATCH");
}
