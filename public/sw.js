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

  // Read each file's bytes eagerly while share permissions are still valid.
  // Use allSettled so a single unreadable file doesn't abort the whole batch.
  const results = await Promise.allSettled(
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

  const entries = results
    .filter((r) => r.status === "fulfilled")
    .map((r) => r.value);

  if (!entries.length) return;

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
        const redirectUrl = `/?shared=1&t=${Date.now()}`;
        try {
          let files = [];
          let meta = {};

          try {
            const formData = await event.request.formData();
            files = formData
              .getAll("sharedFiles")
              .filter((item) => item instanceof Blob && item.size > 0);
            meta = {
              title: formData.get("title") || "",
              text: formData.get("text") || "",
            };
          } catch (formErr) {
            // formData() failed — body may be unreadable (e.g. expired content URI).
            // Redirect normally; the app will open without files.
            console.error("[SW] formData() failed:", formErr);
            return Response.redirect(redirectUrl, 303);
          }

          await saveSharedFiles(files, meta);
        } catch (err) {
          console.error("[SW] share-target error:", err);
        }

        return Response.redirect(redirectUrl, 303);
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
