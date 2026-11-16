const { CLOCK_KEY, remainSeconds, requireDevice } = require("../../../lib/clock");
const { readJson } = require("../../../lib/r2");

// 시계가 10초마다 호출: 지금 띄울 메시지 id와 남은 시간
export default async function handler(req, res) {
  if (!requireDevice(req, res)) return;
  const data = await readJson(CLOCK_KEY, { current: null, history: [], brightness: null });
  const remain = remainSeconds(data.current);
  res.setHeader("Cache-Control", "no-store");
  return res.status(200).json({
    id: remain !== 0 ? data.current.id : "",
    rev: remain !== 0 ? Date.parse(data.current.createdAt).toString(36) : "", // 같은 메시지 재전송 구분용
    remain,
    bri: Number.isInteger(data.brightness) ? data.brightness : 45, // 기본 45% (백라이트 눈부심 완화)
  });
}
