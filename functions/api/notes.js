import { requireAuth } from "../_lib/auth.js";
import { NOTES_KEY, json, readJson, writeJson } from "../_lib/storage.js";

export async function onRequestGet({ request, env }) {
  const unauthorized = await requireAuth(request, env);
  if (unauthorized) return unauthorized;

  const notes = await readJson(env.INTIP_BUCKET, NOTES_KEY, []);
  return json({ notes });
}

export async function onRequestPost({ request, env }) {
  const unauthorized = await requireAuth(request, env);
  if (unauthorized) return unauthorized;

  const input = await request.json().catch(() => ({}));
  const id = input.id || crypto.randomUUID();
  const now = new Date().toISOString();
  const notes = await readJson(env.INTIP_BUCKET, NOTES_KEY, []);
  const existing = notes.findIndex((note) => note.id === id);
  const note = {
    id,
    title: String(input.title || "Untitled").slice(0, 160),
    body: String(input.body || ""),
    createdAt: existing >= 0 ? notes[existing].createdAt : now,
    updatedAt: now,
  };

  if (existing >= 0) notes[existing] = note;
  else notes.unshift(note);

  await writeJson(env.INTIP_BUCKET, NOTES_KEY, notes);
  return json({ note });
}

export async function onRequestDelete({ request, env }) {
  const unauthorized = await requireAuth(request, env);
  if (unauthorized) return unauthorized;

  const id = new URL(request.url).searchParams.get("id");
  if (!id) return json({ error: "Missing note id." }, { status: 400 });

  const notes = await readJson(env.INTIP_BUCKET, NOTES_KEY, []);
  await writeJson(
    env.INTIP_BUCKET,
    NOTES_KEY,
    notes.filter((note) => note.id !== id),
  );
  return json({ ok: true });
}

