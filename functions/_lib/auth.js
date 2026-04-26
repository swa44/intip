const SESSION_COOKIE = "intip_session";
const encoder = new TextEncoder();

function base64UrlEncode(value) {
  const bytes = typeof value === "string" ? encoder.encode(value) : value;
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function base64UrlDecode(value) {
  const padded = value.replaceAll("-", "+").replaceAll("_", "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  return atob(padded);
}

async function sign(payload, secret) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return base64UrlEncode(new Uint8Array(signature));
}

function getCookie(request, name) {
  const cookie = request.headers.get("Cookie") || "";
  return cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}

export async function createSessionCookie(env) {
  const secret = env.INTIP_SESSION_SECRET;
  if (!secret) throw new Error("INTIP_SESSION_SECRET is not configured.");

  const payload = base64UrlEncode(
    JSON.stringify({
      sub: "owner",
      exp: Date.now() + 1000 * 60 * 60 * 24 * 14,
    }),
  );
  const signature = await sign(payload, secret);
  return `${SESSION_COOKIE}=${payload}.${signature}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=1209600`;
}

export function clearSessionCookie() {
  return `${SESSION_COOKIE}=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`;
}

export async function isAuthenticated(request, env) {
  const secret = env.INTIP_SESSION_SECRET;
  const value = getCookie(request, SESSION_COOKIE);
  if (!secret || !value || !value.includes(".")) return false;

  const [payload, signature] = value.split(".");
  const expected = await sign(payload, secret);
  if (signature !== expected) return false;

  try {
    const data = JSON.parse(base64UrlDecode(payload));
    return data.exp > Date.now();
  } catch {
    return false;
  }
}

export async function requireAuth(request, env) {
  if (await isAuthenticated(request, env)) return null;
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}

