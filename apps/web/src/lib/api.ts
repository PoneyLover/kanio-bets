const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export class ApiError extends Error {
  status: number;
  code: string;
  details?: unknown;
  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

async function parseResponse(res: Response) {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function rawRequest(path: string, options: RequestInit = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });
  return res;
}

/**
 * Wrapper fetch centralisant : URL de base, cookies d'auth (credentials:include),
 * parsing JSON et gestion d'erreur. En cas de 401, tente un refresh de session
 * une seule fois puis rejoue la requete initiale (evite de deconnecter
 * l'utilisateur a chaque expiration de l'access token de 15 min).
 */
export async function apiFetch<T = unknown>(path: string, options: RequestInit = {}, _retried = false): Promise<T> {
  const res = await rawRequest(path, options);

  if (res.status === 401 && !_retried && path !== "/api/auth/refresh" && path !== "/api/auth/login") {
    const refreshRes = await rawRequest("/api/auth/refresh", { method: "POST" });
    if (refreshRes.ok) {
      return apiFetch<T>(path, options, true);
    }
  }

  const body = await parseResponse(res);

  if (!res.ok) {
    const error = body?.error ?? { code: "UNKNOWN", message: "Une erreur est survenue" };
    throw new ApiError(res.status, error.code, error.message, error.details);
  }

  return body as T;
}

export const api = {
  get: <T,>(path: string) => apiFetch<T>(path, { method: "GET" }),
  post: <T,>(path: string, data?: unknown) =>
    apiFetch<T>(path, { method: "POST", body: data !== undefined ? JSON.stringify(data) : undefined }),
  put: <T,>(path: string, data?: unknown) =>
    apiFetch<T>(path, { method: "PUT", body: data !== undefined ? JSON.stringify(data) : undefined }),
};
