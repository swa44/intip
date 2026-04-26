const crypto = require("crypto");
const { loadEnv } = require("./env");

const SESSION_COOKIE = "intip_session";

function parseCookies(req) {
  return Object.fromEntries(
    String(req.headers.cookie || "")
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const index = part.indexOf("=");
        return [part.slice(0, index), decodeURIComponent(part.slice(index + 1))];
      }),
  );
}

function base64Url(value) {
  return Buffer.from(value).toString("base64url");
}

function sign(payload, secret) {
  return crypto.createHmac("sha256", secret).update(payload).digest("base64url");
}

function timingSafeEqual(a, b) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function createSessionCookie() {
  loadEnv();
  if (!process.env.INTIP_SESSION_SECRET) {
    throw new Error("INTIP_SESSION_SECRET is not configured.");
  }

  const payload = base64Url(
    JSON.stringify({
      sub: "owner",
      exp: Date.now() + 1000 * 60 * 60 * 24 * 14,
    }),
  );
  const signature = sign(payload, process.env.INTIP_SESSION_SECRET);
  return `${SESSION_COOKIE}=${encodeURIComponent(`${payload}.${signature}`)}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=1209600`;
}

function clearSessionCookie() {
  return `${SESSION_COOKIE}=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`;
}

function isAuthenticated(req) {
  loadEnv();
  const secret = process.env.INTIP_SESSION_SECRET;
  const cookie = parseCookies(req)[SESSION_COOKIE];
  if (!secret || !cookie || !cookie.includes(".")) return false;

  const [payload, signature] = cookie.split(".");
  if (!timingSafeEqual(signature, sign(payload, secret))) return false;

  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return data.exp > Date.now();
  } catch {
    return false;
  }
}

function requireAuth(req, res) {
  if (isAuthenticated(req)) return true;
  res.status(401).json({ error: "Unauthorized" });
  return false;
}

module.exports = {
  clearSessionCookie,
  createSessionCookie,
  isAuthenticated,
  requireAuth,
};
