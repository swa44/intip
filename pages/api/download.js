const { requireAuth } = require("../../lib/auth");
const { FILES_KEY, readJson, signedGetUrl } = require("../../lib/r2");

export default async function handler(req, res) {
  try {
    if (!requireAuth(req, res)) return;
    if (req.method !== "GET") return res.status(405).json({ error: "Method Not Allowed" });

    const { id } = req.query;
    if (!id) return res.status(400).json({ error: "Missing file id." });

    const files = await readJson(FILES_KEY, []);
    const record = files.find((file) => file.id === id);
    if (!record) return res.status(404).json({ error: "File not found." });

    const url = await signedGetUrl({ key: record.key, name: record.name, type: record.type });
    return res.redirect(302, url);
  } catch (error) {
    return res.status(500).json({ error: error.message || "Download failed." });
  }
};
