const API_BASE = import.meta.env.VITE_API_BASE || "/api";

function getToken() {
  return localStorage.getItem("house_pulse_token") || "";
}

export function setToken(token) {
  if (token) {
    localStorage.setItem("house_pulse_token", token);
  } else {
    localStorage.removeItem("house_pulse_token");
  }
}

async function request(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  const token = getToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  if (options.body && typeof options.body === "object") {
    headers["Content-Type"] = "application/json";
    options.body = JSON.stringify(options.body);
  }
  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = { message: "服务暂时无法响应" };
  }
  if (!response.ok) {
    if (response.status === 401) {
      setToken("");
    }
    const error = new Error(payload.message || "请求失败");
    error.status = response.status;
    throw error;
  }
  return payload.data;
}

export const api = {
  get: (path, params) => {
    const query = params
      ? `?${new URLSearchParams(
          Object.entries(params).filter(([, value]) => value !== "" && value != null)
        ).toString()}`
      : "";
    return request(`${path}${query}`);
  },
  post: (path, body) => request(path, { method: "POST", body }),
  put: (path, body) => request(path, { method: "PUT", body }),
  patch: (path, body) => request(path, { method: "PATCH", body }),
  delete: (path) => request(path, { method: "DELETE" }),
};
