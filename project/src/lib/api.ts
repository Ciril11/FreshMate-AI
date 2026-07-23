export const API_BASE = "/api";

function getToken(): string | null {
  return localStorage.getItem("freshmate_token");
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem("freshmate_token", token);
  else localStorage.removeItem("freshmate_token");
}

export function getUser(): { id: number; name: string; email: string } | null {
  const raw = localStorage.getItem("freshmate_user");
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setUser(user: { id: number; name: string; email: string } | null) {
  if (user) localStorage.setItem("freshmate_user", JSON.stringify(user));
  else localStorage.removeItem("freshmate_user");
}

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    ...(init?.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  if (res.status === 401) {
    setToken(null);
    setUser(null);
    window.location.href = "/auth";
    throw new Error("Session expired. Please log in again.");
  }
  if (!res.ok) {
    let msg = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.error) msg = body.error;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  return res.json() as Promise<T>;
}

export function uploadFile(
  path: string,
  file: File,
  extraFields?: Record<string, string>
): Promise<any> {
  const fd = new FormData();
  fd.append("file", file);
  if (extraFields) {
    for (const [k, v] of Object.entries(extraFields)) fd.append(k, v);
  }
  return http(path, { method: "POST", body: fd });
}

export function postJson(path: string, body: unknown): Promise<any> {
  return http(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function putJson(path: string, body: unknown): Promise<any> {
  return http(path, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function deleteJson(path: string): Promise<any> {
  return http(path, { method: "DELETE" });
}

export function getJson<T>(path: string): Promise<T> {
  return http<T>(path);
}
