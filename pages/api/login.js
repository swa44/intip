const { createSessionCookie } = require("../../lib/auth");
const { getEnv } = require("../../lib/env");

function normalizePassword(value) {
  return String(value || "")
    .replace(/^"(.*)"$/, "$1")
    .replace(/^'(.*)'$/, "$1")
    .replaceAll("\\$", "$");
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });
    const configuredPassword = normalizePassword(getEnv("INTIP_PASSWORD"));
    if (!configuredPassword) return res.status(500).json({ error: "INTIP_PASSWORD is not configured." });

    const { password } = req.body || {};
    if (!password || password !== configuredPassword) {
      return res.status(401).json({ error: "Wrong password." });
    }

    res.setHeader("Set-Cookie", createSessionCookie());
    return res.status(200).json({ ok: true });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Login failed." });
  }
};
