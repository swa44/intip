const crypto = require("crypto");
const { requireAuth } = require("./_lib/auth");
const { NOTES_KEY, readJson, writeJson } = require("./_lib/r2");

module.exports = async function handler(req, res) {
  if (!requireAuth(req, res)) return;

  if (req.method === "GET") {
    const notes = await readJson(NOTES_KEY, []);
    return res.status(200).json({ notes });
  }

  if (req.method === "POST") {
    const input = req.body || {};
    const id = input.id || crypto.randomUUID();
    const now = new Date().toISOString();
    const notes = await readJson(NOTES_KEY, []);
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

    await writeJson(NOTES_KEY, notes);
    return res.status(200).json({ note });
  }

  if (req.method === "DELETE") {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: "Missing note id." });

    const notes = await readJson(NOTES_KEY, []);
    await writeJson(
      NOTES_KEY,
      notes.filter((note) => note.id !== id),
    );
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: "Method Not Allowed" });
};
