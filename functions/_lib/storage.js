export const NOTES_KEY = "app/notes.json";
export const FILES_KEY = "app/files.json";

export async function readJson(bucket, key, fallback) {
  const object = await bucket.get(key);
  if (!object) return fallback;

  try {
    return await object.json();
  } catch {
    return fallback;
  }
}

export async function writeJson(bucket, key, value) {
  await bucket.put(key, JSON.stringify(value, null, 2), {
    httpMetadata: { contentType: "application/json; charset=utf-8" },
  });
}

export function json(data, init = {}) {
  return Response.json(data, {
    ...init,
    headers: {
      "Cache-Control": "no-store",
      ...(init.headers || {}),
    },
  });
}

export function cleanFileName(name) {
  return name
    .normalize("NFKC")
    .replace(/[\\/:*?"<>|#%{}^~[\]`]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 140) || "file";
}

