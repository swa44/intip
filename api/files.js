const crypto = require("crypto");
const { requireAuth } = require("./_lib/auth");
const {
  FILES_KEY,
  cleanFileName,
  deleteObject,
  readJson,
  signedGetUrl,
  signedPutUrl,
  writeJson,
} = require("./_lib/r2");

module.exports = async function handler(req, res) {
  if (!requireAuth(req, res)) return;

  if (req.method === "GET") {
    const files = await readJson(FILES_KEY, []);
    return res.status(200).json({ files });
  }

  if (req.method === "POST") {
    const input = req.body || {};

    if (input.action === "upload-url") {
      const id = crypto.randomUUID();
      const name = cleanFileName(input.name);
      const type = String(input.type || "application/octet-stream");
      const size = Number(input.size || 0);
      const key = `uploads/${new Date().toISOString().slice(0, 10)}/${id}-${name}`;
      const uploadUrl = await signedPutUrl({ key, type });

      return res.status(200).json({
        uploadUrl,
        file: {
          id,
          key,
          name,
          type,
          size,
          createdAt: new Date().toISOString(),
        },
      });
    }

    if (input.action === "complete") {
      const record = input.file;
      if (!record?.id || !record?.key) return res.status(400).json({ error: "Missing file record." });

      const files = await readJson(FILES_KEY, []);
      if (!files.some((file) => file.id === record.id)) {
        files.unshift(record);
        await writeJson(FILES_KEY, files);
      }
      return res.status(200).json({ file: record });
    }

    return res.status(400).json({ error: "Unknown action." });
  }

  if (req.method === "DELETE") {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: "Missing file id." });

    const files = await readJson(FILES_KEY, []);
    const target = files.find((file) => file.id === id);
    if (target) await deleteObject(target.key);

    await writeJson(
      FILES_KEY,
      files.filter((file) => file.id !== id),
    );
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: "Method Not Allowed" });
};
