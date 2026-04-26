const { isAuthenticated } = require("../../lib/auth");

export default function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method Not Allowed" });
  return res.status(200).json({ authenticated: isAuthenticated(req) });
};

