const crypto = require("crypto");
const { getEnv } = require("./env");

// 시계(ESP8684 미니 LCD) 연동 — 상세: ~/Desktop/APP/miniLCD/README.md
const CLOCK_KEY = "app/clock.json";
const FRAME_PREFIX = "clock/frames/";
const FRAME_BYTES = 240 * 240 * 2; // RGB565 빅엔디안
const HISTORY_MAX = 30;

function requireDevice(req, res) {
  const expected = getEnv("CLOCK_DEVICE_TOKEN") || "";
  const given = String(req.query.d || "");
  const ok =
    expected.length > 0 &&
    given.length === expected.length &&
    crypto.timingSafeEqual(Buffer.from(given), Buffer.from(expected));
  if (!ok) res.status(401).json({ error: "Unauthorized" });
  return ok;
}

function frameKey(id) {
  return `${FRAME_PREFIX}${String(id).replace(/[^a-z0-9-]/gi, "")}.bin`;
}

// 남은 표시 시간(초). -1 = 다음 메시지까지 계속, 0 = 없음/만료
function remainSeconds(current, now = Date.now()) {
  if (!current) return 0;
  if (!current.expiresAt) return -1;
  return Math.max(0, Math.ceil((Date.parse(current.expiresAt) - now) / 1000));
}

module.exports = { CLOCK_KEY, FRAME_BYTES, HISTORY_MAX, frameKey, remainSeconds, requireDevice };
