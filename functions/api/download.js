import { requireAuth } from "../_lib/auth.js";
import { FILES_KEY, json, readJson } from "../_lib/storage.js";

export async function onRequestGet({ request, env }) {
  const unauthorized = await requireAuth(request, env);
  if (unauthorized) return unauthorized;

  const id = new URL(request.url).searchParams.get("id");
  if (!id) return json({ error: "Missing file id." }, { status: 400 });

  const files = await readJson(env.INTIP_BUCKET, FILES_KEY, []);
  const record = files.find((file) => file.id === id);
  if (!record) return json({ error: "File not found." }, { status: 404 });

  const object = await env.INTIP_BUCKET.get(record.key);
  if (!object) return json({ error: "File object not found." }, { status: 404 });

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("Cache-Control", "private, no-store");
  headers.set("Content-Disposition", `attachment; filename="${encodeURIComponent(record.name)}"`);
  return new Response(object.body, { headers });
}

