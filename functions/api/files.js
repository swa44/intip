import { requireAuth } from "../_lib/auth.js";
import { FILES_KEY, cleanFileName, json, readJson, writeJson } from "../_lib/storage.js";

export async function onRequestGet({ request, env }) {
  const unauthorized = await requireAuth(request, env);
  if (unauthorized) return unauthorized;

  const files = await readJson(env.INTIP_BUCKET, FILES_KEY, []);
  return json({ files });
}

export async function onRequestPost({ request, env }) {
  const unauthorized = await requireAuth(request, env);
  if (unauthorized) return unauthorized;

  const form = await request.formData();
  const upload = form.get("file");
  if (!upload || typeof upload === "string") {
    return json({ error: "Missing file." }, { status: 400 });
  }

  const id = crypto.randomUUID();
  const name = cleanFileName(upload.name);
  const key = `uploads/${new Date().toISOString().slice(0, 10)}/${id}-${name}`;
  await env.INTIP_BUCKET.put(key, upload.stream(), {
    httpMetadata: {
      contentType: upload.type || "application/octet-stream",
      contentDisposition: `attachment; filename="${encodeURIComponent(name)}"`,
    },
  });

  const files = await readJson(env.INTIP_BUCKET, FILES_KEY, []);
  const record = {
    id,
    key,
    name,
    type: upload.type || "application/octet-stream",
    size: upload.size,
    createdAt: new Date().toISOString(),
  };
  files.unshift(record);
  await writeJson(env.INTIP_BUCKET, FILES_KEY, files);
  return json({ file: record });
}

export async function onRequestDelete({ request, env }) {
  const unauthorized = await requireAuth(request, env);
  if (unauthorized) return unauthorized;

  const id = new URL(request.url).searchParams.get("id");
  if (!id) return json({ error: "Missing file id." }, { status: 400 });

  const files = await readJson(env.INTIP_BUCKET, FILES_KEY, []);
  const target = files.find((file) => file.id === id);
  if (target) await env.INTIP_BUCKET.delete(target.key);

  await writeJson(
    env.INTIP_BUCKET,
    FILES_KEY,
    files.filter((file) => file.id !== id),
  );
  return json({ ok: true });
}

