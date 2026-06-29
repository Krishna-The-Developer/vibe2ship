const BASE = import.meta.env.VITE_API_BASE_URL
  ?? "http://localhost:8000";

async function apiFetch(path, options = {}) {
  const url = `${BASE}${path}`;

  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(), 10000
  );

  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers ?? {}),
      },
    });
    clearTimeout(timer);

    if (!res.ok) {
      throw new Error(
        `HTTP error! status: ${res.status}`
      );
    }

    return await res.json();

  } catch (err) {
    clearTimeout(timer);
    if (err.name === "AbortError") {
      throw new Error(`Timeout: ${path}`);
    }
    console.error(
      `[apiFetch] failed for ${path}:`, err.message
    );
    throw err;
  }
}

export const api = {
  get:  (path)       => apiFetch(path),
  post: (path, body) => apiFetch(path, {
    method: "POST",
    body: JSON.stringify(body),
  }),
  getUrgentTasks:  () =>
    api.get("/api/disasters/urgent-tasks"),
  getEarthquakes:  () =>
    api.get("/api/disasters/earthquakes"),
  getHealth:       () =>
    api.get("/health"),
  analyzeDisaster: (d) =>
    api.post("/api/ai/analyze", d),
};
