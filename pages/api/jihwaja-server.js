const { requireAuth } = require("../../lib/auth");
const { getEnv } = require("../../lib/env");

// 지화자(oox.kr) Fly 서버 켜기/끄기
// GET  /api/jihwaja-server                      → 현재 상태
// POST /api/jihwaja-server { action: "start" | "stop" }
const APP = "jihwaja";
const SITE = "https://oox.kr";
const FLY_API = `https://api.machines.dev/v1/apps/${APP}/machines`;

function flyHeaders() {
  const token = String(getEnv("FLY_API_TOKEN") || "").trim();
  if (!token) throw new Error("FLY_API_TOKEN이 설정되어 있지 않아요.");
  return {
    Authorization: token.startsWith("FlyV1 ") ? token : `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

// 응답 본문에 민감한 값이 섞이지 않도록 Fly 오류 내용은 그대로 돌려주지 않는다
async function fly(path, method = "GET") {
  const response = await fetch(`${FLY_API}${path}`, {
    method,
    headers: flyHeaders(),
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error(`Fly 요청 실패 (${response.status})`);
  return response.status === 204 ? null : response.json().catch(() => null);
}

async function getMachine() {
  const machines = await fly("");
  if (!machines || !machines.length) throw new Error("Fly 서버를 찾지 못했어요.");
  return machines[0];
}

// 서버가 실제로 접속을 받는지와 현재 접속 수
async function siteHealth() {
  try {
    const response = await fetch(`${SITE}/healthz`, { signal: AbortSignal.timeout(2500) });
    if (!response.ok) return { ready: false, connections: null };
    const data = await response.json();
    return { ready: true, connections: data.sockets };
  } catch {
    return { ready: false, connections: null };
  }
}

async function getStatus() {
  const machine = await getMachine();
  const on = machine.state === "started";
  const started = (machine.events || []).find((e) => e.type === "start" && e.status === "started");
  const health = on ? await siteHealth() : { ready: false, connections: null };
  return {
    state: machine.state,
    ...health,
    startedAt: on && started ? started.timestamp : null,
    size: machine.config && machine.config.guest
      ? `${machine.config.guest.cpu_kind}-${machine.config.guest.cpus}x / ${machine.config.guest.memory_mb}MB`
      : null,
    site: SITE,
  };
}

export default async function handler(req, res) {
  try {
    if (!requireAuth(req, res)) return;
    res.setHeader("Cache-Control", "no-store");

    if (req.method === "GET") return res.status(200).json(await getStatus());

    if (req.method === "POST") {
      const { action } = req.body || {};
      if (!["start", "stop"].includes(action)) return res.status(400).json({ error: "잘못된 요청이에요." });
      const machine = await getMachine();
      await fly(`/${machine.id}/${action}`, "POST");
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: "Method Not Allowed" });
  } catch (error) {
    return res.status(502).json({ error: error.message || "서버 조작에 실패했어요." });
  }
}
