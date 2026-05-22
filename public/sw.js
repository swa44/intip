const CACHE_NAME = "intip-shell-v1";
const APP_SHELL = ["/", "/manifest.webmanifest", "/icons/icon-192.svg", "/icons/icon-512.svg"];
const SHARE_DB = "intip-share-target";
const SHARE_STORE = "shared-files";

function openShareDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(SHARE_DB, 1);

    request.onupgradeneeded = () => {
      request.result.createObjectStore(SHARE_STORE, { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function saveSharedFiles(files, meta = {}) {
  if (!files.length) return;

  const db = await openShareDb();
  await new Promise((resolve, reject) => {
    const transaction = db.transaction(SHARE_STORE, "readwrite");
    const store = transaction.objectStore(SHARE_STORE);
    const createdAt = Date.now();

    files.forEach((file, index) => {
      store.put({
        id: `${createdAt}-${index}-${Math.random().toString(36).slice(2)}`,
        file,
        name: file.name || `shared-${createdAt}-${index}`,
        type: file.type || "application/octet-stream",
        size: file.size || 0,
        title: meta.title || "",
        text: meta.text || "",
        createdAt,
      });
    });

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
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
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  if (url.pathname === "/share-target" && event.request.method === "POST") {
    event.respondWith(
      (async () => {
        const formData = await event.request.formData();
        const files = formData
          .getAll("sharedFiles")
          .filter((item) => item instanceof File && item.size > 0);

        await saveSharedFiles(files, {
          title: formData.get("title"),
          text: formData.get("text"),
        });

        return Response.redirect("/?shared=1", 303);
      })(),
    );
    return;
  }

  if (url.pathname.startsWith("/api/")) return;
  if (event.request.method !== "GET") return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request).then((cached) => cached || caches.match("/"))),
  );
});
