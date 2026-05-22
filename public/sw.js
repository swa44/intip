const CACHE_NAME = "intip-shell-v1.3";
const APP_SHELL = ["/", "/manifest.webmanifest", "/icons/icon-192.svg", "/icons/icon-512.svg"];
const SHARE_DB = "intip-share-target";
const SHARE_STORE = "shared-files";

function shareRedirectHtml(targetUrl) {
  const escapedUrl = JSON.stringify(targetUrl);
  return `<!doctype html>
<html lang="ko">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <meta name="robots" content="noindex,nofollow">
    <title>intip 공유 연결 중</title>
    <style>
      body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f6f4ef;color:#202124;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
      main{padding:24px;text-align:center}
      a{color:#11685c}
    </style>
  </head>
  <body>
    <main>
      <p>공유 화면으로 이동 중입니다.</p>
      <p><a id="link" href=${escapedUrl}>계속하기</a></p>
    </main>
    <script>
      const targetUrl = ${escapedUrl};
      const link = document.getElementById("link");
      if (link) link.href = targetUrl;
      window.location.replace(targetUrl);
    </script>
  </body>
</html>`;
}

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
          const clonedReq = event.request.clone();
          const formData = await clonedReq.formData();
          const files = formData
            .getAll("sharedFiles")
            .filter((item) => (item instanceof Blob || (typeof File !== "undefined" && item instanceof File)) && item.size > 0);

          const batchId = await saveSharedFiles(files, {
            title: formData.get("title"),
            text: formData.get("text"),
          });

          const redirectUrl = `/share-target?batch=${encodeURIComponent(batchId || "")}&t=${Date.now()}`;
          return new Response(shareRedirectHtml(redirectUrl), {
            status: 200,
            headers: {
              "Content-Type": "text/html; charset=utf-8",
              "Cache-Control": "no-store",
            },
          });
        } catch (error) {
          console.error("Share target fetch error in service worker:", error);
          const errorUrl = `/share-target?shared_error=${encodeURIComponent(error.message || "unknown")}&t=${Date.now()}`;
          return new Response(shareRedirectHtml(errorUrl), {
            status: 200,
            headers: {
              "Content-Type": "text/html; charset=utf-8",
              "Cache-Control": "no-store",
            },
          });
        }
      })(),
    );
    return;
  }

  if (url.pathname.startsWith("/api/")) return;
  if (url.pathname === "/share-target") return;
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
