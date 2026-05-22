const CACHE_NAME = "intip-shell-v1.2";
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
  if (!files.length) return null;

  const db = await openShareDb();
  const batchId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
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
        batchId,
        title: meta.title || "",
        text: meta.text || "",
        createdAt,
      });
    });

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
  db.close();
  return batchId;
}

async function focusOrOpenShareClient(targetUrl) {
  const opened = await self.clients.openWindow(targetUrl);
  if (opened) return true;

  const windowClients = await self.clients.matchAll({
    type: "window",
    includeUncontrolled: true,
  });

  for (const client of windowClients) {
    const clientUrl = new URL(client.url);
    if (clientUrl.origin !== self.location.origin) continue;

    if ("focus" in client) {
      await client.focus();
    }
    if ("navigate" in client) {
      await client.navigate(targetUrl);
    }
    return true;
  }

  return false;
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
        try {
          const formData = await event.request.formData();
          const files = formData
            .getAll("sharedFiles")
            .filter((item) => (item instanceof Blob || (typeof File !== "undefined" && item instanceof File)) && item.size > 0);

          const batchId = await saveSharedFiles(files, {
            title: formData.get("title"),
            text: formData.get("text"),
          });

          const redirectUrl = `/share-target?batch=${encodeURIComponent(batchId || "")}&t=${Date.now()}`;
          event.waitUntil(focusOrOpenShareClient(redirectUrl));

          return Response.redirect(redirectUrl, 303);
        } catch (error) {
          console.error("Share target fetch error in service worker:", error);
          return Response.redirect(`/share-target?shared_error=${encodeURIComponent(error.message || "unknown")}&t=${Date.now()}`, 303);
        }
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
