const crypto = require("crypto");
const { requireAuth } = require("../../lib/auth");
const { FILES_KEY, readJson, writeJson } = require("../../lib/r2");

// POST   /api/share?id=<fileId>  → create (or reuse) a public share token
// DELETE /api/share?id=<fileId>  → revoke the share token
export default async function handler(req, res) {
  try {
    if (!requireAuth(req, res)) return;

    const { id } = req.query;
    if (!id) return res.status(400).json({ error: "Missing file id." });

    const files = await readJson(FILES_KEY, []);
    const record = files.find((file) => file.id === id);
    if (!record) return res.status(404).json({ error: "File not found." });

    if (req.method === "POST") {
      if (!record.shareToken) {
        record.shareToken = crypto.randomBytes(18).toString("base64url");
        record.sharedAt = new Date().toISOString();
        await writeJson(FILES_KEY, files);
      }
      return res.status(200).json({ shareToken: record.shareToken, sharedAt: record.sharedAt });
    }

    if (req.method === "DELETE") {
      if (record.shareToken) {
        delete record.shareToken;
        delete record.sharedAt;
        await writeJson(FILES_KEY, files);
      }
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: "Method Not Allowed" });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Share failed." });
  }
}
