const CACHE_NAME = "intip-shell-v3";
const APP_SHELL = ["/", "/manifest.webmanifest", "/icons/icon-192.svg", "/icons/icon-512.svg"];

// Upload one file to R2 using the existing presigned-URL flow.
// This runs entirely within the SW — no Vercel body-size limit applies because
// the file goes directly from the device to R2 (only the metadata JSON hits Vercel).
async function uploadToR2Direct(file) {
  const type = file.type || "application/octet-stream";

  const signRes = await fetch("/api/files", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "upload-url",
      name: file.name || "shared-file",
      type,
      size: file.size,
    }),
  });
  if (!signRes.ok) throw new Error(`presign 실패 (${signRes.status})`);
  const signed = await signRes.json();

  const putRes = await fetch(signed.uploadUrl, {
    method: "PUT",
    body: file,
    headers: { "Content-Type": type },
  });
  if (!putRes.ok) throw new Error(`R2 업로드 실패 (${putRes.status})`);

  const completeRes = await fetch("/api/files", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "complete", file: signed.file }),
  });
  if (!completeRes.ok) throw new Error(`완료 처리 실패 (${completeRes.status})`);
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
        const doneUrl = `/?shared_done=1&t=${Date.now()}`;
        try {
          const formData = await event.request.formData();
          const files = formData
            .getAll("sharedFiles")
            .filter((item) => item instanceof Blob && item.size > 0);

          // Upload each file directly to R2 — no file-size limit
          const results = await Promise.allSettled(files.map((f) => uploadToR2Direct(f)));
          results.forEach((r, i) => {
            if (r.status === "rejected") console.error(`[SW] file ${i} failed:`, r.reason);
          });
        } catch (err) {
          // formData() itself failed — server-side fallback will handle this
          // via pages/share-target.js when the SW wasn't active (cold start)
          console.error("[SW] share-target error:", err);
        }
        return Response.redirect(doneUrl, 303);
      })(),
    );
    return;
  }

  // Let all other non-GET requests (and /api/ calls) go to the network
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
