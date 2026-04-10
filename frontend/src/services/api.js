const API_URL =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  "http://localhost:4000";

let refreshInFlight = null;

async function doFetch(path, { method = "GET", token = "", body } = {}) {
  return fetch(`${API_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    credentials: "include",
    body: body ? JSON.stringify(body) : undefined
  });
}

async function readJsonSafe(res) {
  return res.json().catch(() => ({}));
}

async function refreshAccessToken() {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    const refreshToken = localStorage.getItem("examedge_refresh") || "";
    if (!refreshToken) throw new Error("Session expired. Please login again.");

    const res = await doFetch("/auth/refresh", {
      method: "POST",
      body: { refreshToken }
    });
    const data = await readJsonSafe(res);
    if (!res.ok || data?.ok === false || !data?.accessToken) {
      throw new Error(data?.message || "Session expired. Please login again.");
    }

    localStorage.setItem("examedge_access", data.accessToken);
    if (data.refreshToken) localStorage.setItem("examedge_refresh", data.refreshToken);
    return data.accessToken;
  })();

  try {
    return await refreshInFlight;
  } finally {
    refreshInFlight = null;
  }
}

export async function apiFetch(path, { method = "GET", token = "", body } = {}) {
  // Prefer latest token from localStorage, so refreshed tokens are reused.
  const initialToken = localStorage.getItem("examedge_access") || token || "";
  let res = await doFetch(path, { method, token: initialToken, body });
  let data = await readJsonSafe(res);

  // Auto-refresh once for authenticated requests when access token is expired/invalid.
  if (res.status === 401 && initialToken) {
    try {
      const refreshedToken = await refreshAccessToken();
      res = await doFetch(path, { method, token: refreshedToken, body });
      data = await readJsonSafe(res);
    } catch {
      localStorage.removeItem("examedge_access");
      localStorage.removeItem("examedge_refresh");
      const authErr = new Error("Session expired. Please login again.");
      authErr.status = 401;
      authErr.code = "SESSION_EXPIRED";
      throw authErr;
    }
  }

  if (!res.ok || data?.ok === false) {
    const err = new Error(data?.message || `Request failed (${res.status})`);
    err.status = res.status;
    err.code = data?.code || "REQUEST_FAILED";
    throw err;
  }
  return data;
}

