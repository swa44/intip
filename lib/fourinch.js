const crypto = require("crypto");
const { getEnv } = require("./env");

// 4인치 메모 보드(ESP32-4848S040, 480x480) 연동 — 상세: ~/Desktop/APP/4inch/README.md
const BOARD_KEY = "app/4inch.json";
const FRAME_PREFIX = "4inch/frames/";
const FRAME_BYTES = 480 * 480 * 2; // RGB565 빅엔디안
const HISTORY_MAX = 30;

// 기기 토큰: FOURINCH_DEVICE_TOKEN 이 없으면 미니 LCD 시계 토큰을 같이 씀
function deviceToken() {
  return getEnv("FOURINCH_DEVICE_TOKEN") || getEnv("CLOCK_DEVICE_TOKEN") || "";
}

function requireDevice(req, res) {
  const expected = deviceToken();
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

// 남은 표시 시간(초). -1 = 다음 메모까지 계속, 0 = 없음/만료
function remainSeconds(current, now = Date.now()) {
  if (!current) return 0;
  if (!current.expiresAt) return -1;
  return Math.max(0, Math.ceil((Date.parse(current.expiresAt) - now) / 1000));
}

module.exports = { BOARD_KEY, FRAME_BYTES, HISTORY_MAX, frameKey, remainSeconds, requireDevice };
