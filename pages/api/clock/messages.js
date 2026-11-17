const crypto = require("crypto");
const { requireAuth } = require("../../../lib/auth");
const { CLOCK_KEY, FRAME_BYTES, HISTORY_MAX, frameKey, remainSeconds } = require("../../../lib/clock");
const { deleteObject, putBinary, readJson, writeJson } = require("../../../lib/r2");

export const config = { api: { bodyParser: { sizeLimit: "1mb" } } };

const EMPTY = { current: null, history: [], brightness: null };

// 로그인한 사용자(intip 비밀번호)만: 보내기 / 목록 / 내리기 / 밝기
export default async function handler(req, res) {
  if (!requireAuth(req, res)) return;
  const data = await readJson(CLOCK_KEY, EMPTY);

  if (req.method === "GET") {
    return res.status(200).json({ ...data, remain: remainSeconds(data.current) });
  }

  if (req.method === "POST") {
    const input = req.body || {};
    if (input.action === "brightness") {
      const v = Number(input.value);
      data.brightness = Number.isInteger(v) && v >= 5 && v <= 100 ? v : null;
      await writeJson(CLOCK_KEY, data);
      return res.status(200).json({ ok: true, brightness: data.brightness });
    }

    if (input.action === "resend") {
      const old = (data.history || []).find((m) => m.id === input.id);
      if (!old) return res.status(404).json({ error: "기록을 찾을 수 없어요." });
      const secs = Number(input.seconds);
      const at = new Date();
      // 같은 프레임을 다시 띄움. 시계는 id+rev(createdAt)로 새 표시인지 구분
      data.current = { ...old, createdAt: at.toISOString(), expiresAt: secs > 0 ? new Date(at.getTime() + secs * 1000).toISOString() : null };
      await writeJson(CLOCK_KEY, data);
      return res.status(200).json({ message: data.current });
    }

    const frame = Buffer.from(String(input.frame || ""), "base64");
    if (frame.length !== FRAME_BYTES) return res.status(400).json({ error: "프레임 크기가 올바르지 않아요." });

    const id = `${Date.now().toString(36)}-${crypto.randomBytes(3).toString("hex")}`;
    const seconds = Number(input.seconds);
    const now = new Date();
    const message = {
      id,
      kind: input.kind === "photo" ? "photo" : "text",
      text: String(input.text || "").slice(0, 300),
      sender: String(input.sender || "").slice(0, 40),
      style: {
        theme: Number.isInteger(input.style?.theme) && input.style.theme >= 0 && input.style.theme < 20 ? input.style.theme : 0,
        size: Number.isInteger(input.style?.size) && input.style.size >= 14 && input.style.size <= 110 ? input.style.size : 0,
      },
      thumb: /^data:image\/jpeg;base64,[A-Za-z0-9+/=]{1,40000}$/.test(input.thumb || "") ? input.thumb : "",
      createdAt: now.toISOString(),
      expiresAt: seconds > 0 ? new Date(now.getTime() + seconds * 1000).toISOString() : null,
    };

    await putBinary(frameKey(id), frame);
    data.current = message;
    data.history = [message, ...(data.history || [])];
    for (const old of data.history.splice(HISTORY_MAX)) {
      await deleteObject(frameKey(old.id)).catch(() => {});
    }
    await writeJson(CLOCK_KEY, data);
    return res.status(200).json({ message });
  }

  if (req.method === "DELETE") {
    data.current = null; // 화면에서 내리기 (기록은 유지)
    await writeJson(CLOCK_KEY, data);
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: "Method Not Allowed" });
}
