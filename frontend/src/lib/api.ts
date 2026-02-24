const API_BASE = "/api/v1";

interface FetchOptions extends RequestInit {
  json?: unknown;
}

async function fetchApi<T = unknown>(path: string, options: FetchOptions = {}): Promise<T> {
  const { json, ...fetchOpts } = options;

  const headers: HeadersInit = {
    ...(options.headers || {}),
  };

  if (json) {
    (headers as Record<string, string>)["Content-Type"] = "application/json";
    fetchOpts.body = JSON.stringify(json);
  }

  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    ...fetchOpts,
    headers,
  });

  if (res.status === 401) {
    if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
      window.location.href = "/login";
    }
    throw new Error("No autenticado");
  }

  if (res.status === 204) {
    return undefined as T;
  }

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: "Error del servidor" }));
    throw new Error(error.detail || `Error ${res.status}`);
  }

  return res.json();
}

// Auth
export const auth = {
  login: (email: string, password: string) =>
    fetchApi("/auth/login", { method: "POST", json: { email, password } }),
  register: (data: { email: string; password: string; nombre: string; nombre_estudio: string }) =>
    fetchApi("/auth/register", { method: "POST", json: data }),
  logout: () => fetchApi("/auth/logout", { method: "POST" }),
  me: () => fetchApi<User>("/auth/me"),
};

// Clients
export const clients = {
  list: () => fetchApi<Cliente[]>("/clients/"),
  create: (data: ClienteCreate) => fetchApi<Cliente>("/clients/", { method: "POST", json: data }),
  update: (id: number, data: Partial<ClienteCreate>) =>
    fetchApi<Cliente>(`/clients/${id}`, { method: "PUT", json: data }),
  delete: (id: number) => fetchApi(`/clients/${id}`, { method: "DELETE" }),
};

// Consultations
export const consultations = {
  list: () => fetchApi<Consulta[]>("/consultations/"),
  execute: (data: { cliente_ids: number[]; periodo: string; headless: boolean }) =>
    fetchApi("/consultations/execute", { method: "POST", json: data }),
  status: () => fetchApi<ConsultaStatus>("/consultations/status"),
  delete: (id: number) => fetchApi(`/consultations/${id}`, { method: "DELETE" }),
  deleteBatch: (ids: number[]) =>
    fetchApi("/consultations/delete-batch", { method: "POST", json: ids }),
  logs: (lines = 100) => fetchApi<{ logs: string[] }>(`/consultations/logs?lines=${lines}`),
};

// Downloads
export const downloads = {
  list: () => fetchApi<DownloadRecord[]>("/downloads/"),
  deleteBatch: (paths: string[]) =>
    fetchApi("/downloads/delete-batch", { method: "POST", json: paths }),
};

// Admin
export const admin = {
  tenants: () => fetchApi<Tenant[]>("/admin/tenants"),
  stats: () => fetchApi<AdminStats>("/admin/stats"),
  tenantDetail: (id: number) => fetchApi(`/admin/tenants/${id}`),
  toggleTenant: (id: number) => fetchApi(`/admin/tenants/${id}/toggle`, { method: "POST" }),
  consultations: () => fetchApi("/admin/consultations"),
};

// Types
export interface User {
  id: number;
  email: string;
  nombre: string;
  tenant_id: number;
  is_superadmin: boolean;
}

export interface Tenant {
  id: number;
  nombre: string;
  email: string;
  plan: string;
  activo: boolean;
}

export interface Cliente {
  id: number;
  nombre: string;
  cuit_login: string;
  cuit_consulta: string;
  activo: boolean;
  created_at: string;
}

export interface ClienteCreate {
  nombre: string;
  cuit_login: string;
  clave_fiscal: string;
  cuit_consulta: string;
  activo: boolean;
}

export interface Consulta {
  id: number;
  cliente_id: number;
  cliente_nombre: string | null;
  periodo: string;
  estado: string;
  error_detalle: string | null;
  archivo_csv: string | null;
  created_at: string;
}

export interface ConsultaStatus {
  corriendo: boolean;
  detalle: string;
  consultas: Consulta[];
}

export interface DownloadRecord {
  cliente_cuit: string;
  estado: string;
  cuit_cuil: string;
  formulario: string;
  periodo: string;
  transaccion: string;
  fecha_presentacion: string;
  archivo: string;
}

export interface AdminStats {
  tenants: number;
  users: number;
  clientes: number;
  consultas_total: number;
  consultas_exitosas: number;
  consultas_error: number;
  consultas_pendientes: number;
  tasa_exito: number;
}
