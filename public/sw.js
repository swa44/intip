const CACHE_NAME = "intip-shell-v2";
const APP_SHELL = ["/", "/manifest.webmanifest", "/icons/icon-192.svg", "/icons/icon-512.svg"];
const SHARE_DB = "intip-share";
const SHARE_STORE = "pending";

function openShareDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(SHARE_DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(SHARE_STORE, { keyPath: "id" });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function saveSharedFiles(files, meta = {}) {
  if (!files.length) return;

  // Read all bytes into memory FIRST, before any async gap.
  // Files from drawing/third-party apps arrive via FileProvider URIs (Android)
  // whose permissions can be revoked at any time. Calling arrayBuffer() here
  // captures the raw bytes while we still have access, so IndexedDB stores
  // plain ArrayBuffers — no URI dependency at all.
  const entries = await Promise.all(
    files.map(async (file, i) => {
      const bytes = await file.arrayBuffer();
      const createdAt = Date.now();
      return {
        id: `${createdAt}-${i}-${Math.random().toString(36).slice(2)}`,
        bytes,
        name: file.name || `shared-file-${i}`,
        type: file.type || "application/octet-stream",
        size: bytes.byteLength,
        title: meta.title || "",
        text: meta.text || "",
        createdAt,
      };
    })
  );

  const db = await openShareDb();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(SHARE_STORE, "readwrite");
    const store = tx.objectStore(SHARE_STORE);
    entries.forEach((entry) => store.put(entry));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  if (url.pathname === "/share-target" && event.request.method === "POST") {
    event.respondWith(
      (async () => {
        try {
          const formData = await event.request.formData();
          const files = formData
            .getAll("sharedFiles")
            .filter((item) => item instanceof Blob && item.size > 0);

          await saveSharedFiles(files, {
            title: formData.get("title") || "",
            text: formData.get("text") || "",
          });

          return Response.redirect(`/?shared=1&t=${Date.now()}`, 303);
        } catch (err) {
          console.error("[SW] share-target error:", err);
          return Response.redirect(
            `/?share_error=${encodeURIComponent(err.message || "unknown")}&t=${Date.now()}`,
            303,
          );
        }
      })(),
    );
    return;
  }

  if (url.pathname.startsWith("/api/")) return;
  if (event.request.method !== "GET") return;

  event.respondWith(
    fetch(event.request)
      .then((res) => {
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, res.clone()));
        return res;
      })
      .catch(() => caches.match(event.request).then((cached) => cached || caches.match("/"))),
  );
});
