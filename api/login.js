const { createSessionCookie } = require("./_lib/auth");
const { loadEnv } = require("./_lib/env");

function normalizePassword(value) {
  return String(value || "")
    .replace(/^"(.*)"$/, "$1")
    .replace(/^'(.*)'$/, "$1")
    .replaceAll("\\$", "$");
}

module.exports = async function handler(req, res) {
  loadEnv();
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });
  if (!process.env.INTIP_PASSWORD) return res.status(500).json({ error: "INTIP_PASSWORD is not configured." });

  const { password } = req.body || {};
  if (!password || password !== normalizePassword(process.env.INTIP_PASSWORD)) {
    return res.status(401).json({ error: "Wrong password." });
  }

  res.setHeader("Set-Cookie", createSessionCookie());
  return res.status(200).json({ ok: true });
};
