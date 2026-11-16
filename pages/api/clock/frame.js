const { FRAME_BYTES, frameKey, requireDevice } = require("../../../lib/clock");
const { getBinary } = require("../../../lib/r2");

// 시계가 받아가는 240x240 RGB565 원본 프레임
export default async function handler(req, res) {
  if (!requireDevice(req, res)) return;
  const frame = await getBinary(frameKey(req.query.id || ""));
  if (!frame || frame.length !== FRAME_BYTES) return res.status(404).json({ error: "Not found" });
  res.setHeader("Content-Type", "application/octet-stream");
  res.setHeader("Content-Length", String(frame.length));
  res.setHeader("Cache-Control", "private, max-age=86400, immutable");
  return res.status(200).send(frame);
}
