const { isAuthenticated } = require("../lib/auth");

// 미니 LCD 시계로 메시지/사진 보내기. 브라우저가 240x240으로 그려 RGB565로 변환해 업로드.
const HTML = `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex, nofollow">
<title>시계 메시지</title>
<style>
  :root { --bg:#f6f4ef; --panel:#fff; --ink:#202124; --muted:#756f66; --line:#ded8cf; --accent:#11685c; --accent-dark:#0c5147; --danger:#a13b24; --danger-soft:#f8e6df; --soft:#e7f2ee; }
  * { box-sizing: border-box; }
  body { margin:0; min-height:100dvh; background:var(--bg); color:var(--ink); font-family:-apple-system,BlinkMacSystemFont,"Apple SD Gothic Neo","Noto Sans KR",sans-serif; padding:16px 16px calc(24px + env(safe-area-inset-bottom)); }
  main { max-width:460px; margin:0 auto; display:grid; gap:14px; }
  .head { display:flex; align-items:center; justify-content:space-between; }
  h1 { font-size:20px; margin:0; }
  .head a { color:var(--muted); font-size:14px; text-decoration:none; }
  .card { background:var(--panel); border:1px solid var(--line); border-radius:20px; padding:16px; box-shadow:0 18px 48px rgba(34,30,24,.08); }
  .preview { display:flex; justify-content:center; padding:14px; background:#1b1b1b; border-radius:16px; }
  canvas#view { width:min(100%, 288px); aspect-ratio:1; border-radius:6px; image-rendering:pixelated; background:#000; }
  .tabs { display:grid; grid-template-columns:1fr 1fr; gap:6px; background:#f0ede6; padding:4px; border-radius:12px; margin-bottom:12px; }
  .tabs button { border:0; background:transparent; padding:10px; border-radius:9px; font:inherit; font-weight:700; color:var(--muted); cursor:pointer; }
  .tabs button.on { background:#fff; color:var(--ink); box-shadow:0 1px 3px rgba(0,0,0,.08); }
  label.f { display:block; font-size:13px; color:var(--muted); font-weight:700; margin:12px 0 6px; }
  textarea, input[type=text], select { width:100%; padding:12px 14px; border:1px solid var(--line); border-radius:12px; font:inherit; font-size:16px; background:#fff; color:var(--ink); }
  textarea { min-height:96px; resize:vertical; }
  .swatches { display:flex; flex-wrap:wrap; gap:8px; }
  .sw { width:38px; height:38px; border-radius:50%; border:2px solid transparent; cursor:pointer; box-shadow:inset 0 0 0 1px rgba(0,0,0,.12); }
  .sw.on { border-color:var(--accent); box-shadow:0 0 0 3px rgba(17,104,92,.2); }
  .row { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
  .file { display:block; padding:16px; border:1.5px dashed var(--line); border-radius:12px; text-align:center; color:var(--muted); cursor:pointer; }
  .file input { display:none; }
  .send { width:100%; margin-top:16px; padding:16px; border:0; border-radius:14px; background:var(--accent); color:#fff; font:inherit; font-size:17px; font-weight:800; cursor:pointer; }
  .send:disabled { opacity:.5; }
  .msg { font-size:14px; margin-top:10px; min-height:20px; color:var(--muted); }
  .msg.err { color:var(--danger); }
  .now { display:flex; gap:12px; align-items:center; }
  .now img, .hist img { width:56px; height:56px; border-radius:8px; background:#000; flex:none; object-fit:cover; }
  .now .t { flex:1; min-width:0; }
  .now b, .hist b { display:block; font-size:15px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .now small, .hist small { color:var(--muted); font-size:13px; }
  .ghost { border:1px solid var(--line); background:#fff; border-radius:10px; padding:8px 12px; font:inherit; font-size:14px; font-weight:700; cursor:pointer; color:var(--ink); }
  .ghost.danger { color:var(--danger); border-color:#ecc9be; }
  .hist { display:grid; gap:10px; margin:0; padding:0; list-style:none; }
  .hist li { display:flex; gap:12px; align-items:center; }
  .hist .t { flex:1; min-width:0; }
  h2 { font-size:15px; margin:0 0 12px; }
  input[type=range] { width:100%; accent-color:var(--accent); }
  .empty { color:var(--muted); font-size:14px; }
</style>
</head>
<body>
<main>
  <div class="head"><h1>시계 메시지</h1><a href="/">intip</a></div>

  <section class="card">
    <div class="preview"><canvas id="view" width="240" height="240"></canvas></div>
    <div class="tabs" style="margin-top:14px">
      <button type="button" data-tab="text" class="on">메시지</button>
      <button type="button" data-tab="photo">사진</button>
    </div>

    <div id="tab-text">
      <label class="f" for="text">내용</label>
      <textarea id="text" maxlength="300" placeholder="시계에 띄울 말을 적어주세요"></textarea>
      <label class="f">배경</label>
      <div class="swatches" id="themes"></div>
    </div>

    <div id="tab-photo" hidden>
      <label class="file"><input type="file" id="photo" accept="image/*"><span id="photoLabel">사진 고르기</span></label>
      <label class="f" for="caption">사진 위 글자 (선택)</label>
      <input type="text" id="caption" maxlength="60" placeholder="예: 오늘 점심 🍜">
    </div>

    <div class="row">
      <div><label class="f" for="sender">보낸 사람 (선택)</label><input type="text" id="sender" maxlength="20" placeholder="이름"></div>
      <div><label class="f" for="secs">표시 시간</label>
        <select id="secs">
          <option value="30">30초</option><option value="60">1분</option><option value="300" selected>5분</option>
          <option value="1800">30분</option><option value="3600">1시간</option><option value="0">다음 메시지까지</option>
        </select></div>
    </div>
    <button class="send" id="send" type="button">시계로 보내기</button>
    <div class="msg" id="status"></div>
  </section>

  <section class="card">
    <h2>지금 시계 화면</h2>
    <div id="now" class="empty">불러오는 중…</div>
  </section>

  <section class="card">
    <h2>밝기</h2>
    <input type="range" id="bri" min="5" max="100" step="5">
    <div class="msg" id="briLabel"></div>
  </section>

  <section class="card">
    <h2>보낸 기록</h2>
    <ul class="hist" id="hist"></ul>
  </section>
</main>
<script>
const W = 240;
const view = document.getElementById("view");
const ctx = view.getContext("2d");
const FONT = '"Apple SD Gothic Neo","Noto Sans KR","Malgun Gothic",sans-serif';
const THEMES = [   // 백라이트 LCD라 밝은 배경은 눈부심 → 어두운 배경 위주
  { bg: ["#000000"], fg: "#ffffff" },
  { bg: ["#000000"], fg: "#ffd60a" },
  { bg: ["#000000"], fg: "#5eead4" },
  { bg: ["#000000"], fg: "#ff8fb1" },
  { bg: ["#05081a", "#1a2456"], fg: "#ffffff" },
  { bg: ["#020f0c", "#0d3a33"], fg: "#e7fff8" },
  { bg: ["#140804", "#4a220e"], fg: "#ffe9c7" },
];
let tab = "text", theme = 0, photo = null;

const $ = (id) => document.getElementById(id);
const store = { get(k) { try { return localStorage.getItem(k); } catch { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch {} } };
$("sender").value = store.get("clock.sender") || "";

THEMES.forEach((t, i) => {
  const b = document.createElement("button");
  b.type = "button"; b.className = "sw" + (i === theme ? " on" : "");
  b.style.background = t.bg.length > 1 ? "linear-gradient(135deg," + t.bg.join(",") + ")" : "radial-gradient(circle," + t.fg + " 0 28%," + t.bg[0] + " 30%)";
  b.onclick = () => { theme = i; document.querySelectorAll(".sw").forEach((s, j) => s.classList.toggle("on", j === i)); render(); };
  $("themes").appendChild(b);
});

document.querySelectorAll(".tabs button").forEach((b) => b.onclick = () => {
  tab = b.dataset.tab;
  document.querySelectorAll(".tabs button").forEach((x) => x.classList.toggle("on", x === b));
  $("tab-text").hidden = tab !== "text"; $("tab-photo").hidden = tab !== "photo";
  render();
});

function wrap(text, size, maxW) {
  ctx.font = "700 " + size + "px " + FONT;
  const lines = [];
  for (const para of text.split("\\n")) {
    let line = "";
    for (const ch of Array.from(para)) {
      const test = line + ch;
      if (ctx.measureText(test).width > maxW && line) {
        const sp = line.lastIndexOf(" ");
        if (sp > 0 && ch !== " ") { lines.push(line.slice(0, sp)); line = line.slice(sp + 1) + ch; }
        else { lines.push(line); line = ch === " " ? "" : ch; }
      } else line = test;
    }
    lines.push(line);
  }
  return lines;
}

function fitText(text, box) {
  for (let size = 76; size >= 14; size -= 2) {
    const lines = wrap(text, size, box.w);
    const lh = Math.round(size * 1.28);
    if (lines.length * lh <= box.h) return { size, lines, lh };
  }
  const lines = wrap(text, 14, box.w);
  return { size: 14, lines: lines.slice(0, Math.floor(box.h / 18)), lh: 18 };
}

function drawLines(fit, fg, cx, top, h, shadow) {
  ctx.font = "700 " + fit.size + "px " + FONT;
  ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillStyle = fg;
  if (shadow) { ctx.shadowColor = "rgba(0,0,0,.65)"; ctx.shadowBlur = 6; }
  let y = top + (h - fit.lines.length * fit.lh) / 2 + fit.lh / 2;
  for (const l of fit.lines) { ctx.fillText(l, cx, y); y += fit.lh; }
  ctx.shadowBlur = 0;
}

function render() {
  const sender = $("sender").value.trim();
  ctx.clearRect(0, 0, W, W);
  if (tab === "text") {
    const t = THEMES[theme];
    if (t.bg.length > 1) { const g = ctx.createLinearGradient(0, 0, W, W); g.addColorStop(0, t.bg[0]); g.addColorStop(1, t.bg[1]); ctx.fillStyle = g; }
    else ctx.fillStyle = t.bg[0];
    ctx.fillRect(0, 0, W, W);
    const text = $("text").value.trim() || "메시지를 입력하세요";
    const bottom = sender ? 34 : 14;
    drawLines(fitText(text, { w: W - 28, h: W - 14 - bottom }), t.fg, W / 2, 14, W - 14 - bottom, false);
    if (sender) { ctx.font = "600 16px " + FONT; ctx.globalAlpha = .75; ctx.fillStyle = t.fg; ctx.textAlign = "center"; ctx.fillText("— " + sender, W / 2, W - 20); ctx.globalAlpha = 1; }
  } else {
    ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, W);
    if (photo) {
      const s = Math.max(W / photo.width, W / photo.height);
      const w = photo.width * s, h = photo.height * s;
      ctx.drawImage(photo, (W - w) / 2, (W - h) / 2, w, h);
    } else {
      ctx.fillStyle = "#777"; ctx.font = "600 18px " + FONT; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("사진을 골라주세요", W / 2, W / 2);
    }
    const cap = [$("caption").value.trim(), sender ? "— " + sender : ""].filter(Boolean).join("  ");
    if (cap) {
      const g = ctx.createLinearGradient(0, W - 90, 0, W); g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, "rgba(0,0,0,.75)");
      ctx.fillStyle = g; ctx.fillRect(0, W - 90, W, 90);
      drawLines(fitText(cap, { w: W - 24, h: 52 }), "#fff", W / 2, W - 62, 52, true);
    }
  }
}

function toRGB565Base64() {
  const d = ctx.getImageData(0, 0, W, W).data;
  const out = new Uint8Array(W * W * 2);
  for (let i = 0, j = 0; i < d.length; i += 4, j += 2) {
    const v = ((d[i] & 0xf8) << 8) | ((d[i + 1] & 0xfc) << 3) | (d[i + 2] >> 3);
    out[j] = v >> 8; out[j + 1] = v & 0xff;
  }
  let bin = "";
  for (let i = 0; i < out.length; i += 0x8000) bin += String.fromCharCode.apply(null, out.subarray(i, i + 0x8000));
  return btoa(bin);
}

function thumb() {
  const c = document.createElement("canvas"); c.width = c.height = 96;
  c.getContext("2d").drawImage(view, 0, 0, 96, 96);
  return c.toDataURL("image/jpeg", 0.7);
}

async function api(method, body) {
  const r = await fetch("/api/clock/messages", { method, headers: body ? { "Content-Type": "application/json" } : {}, body: body ? JSON.stringify(body) : undefined, credentials: "same-origin" });
  if (r.status === 401) { location.href = "/"; throw new Error("로그인이 필요해요"); }
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || "요청 실패 (" + r.status + ")");
  return j;
}

function fmtSecs(s) { return s < 0 ? "다음 메시지까지" : s >= 60 ? Math.ceil(s / 60) + "분 남음" : s + "초 남음"; }
function fmtTime(iso) { const d = new Date(iso); return (d.getMonth() + 1) + "/" + d.getDate() + " " + String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0"); }
function esc(s) { return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]); }

async function refresh() {
  try {
    const data = await api("GET");
    const cur = data.current;
    if (cur && data.remain !== 0) {
      $("now").className = "now";
      $("now").innerHTML = (cur.thumb ? '<img src="' + cur.thumb + '" alt="">' : "") +
        '<div class="t"><b>' + esc(cur.text || (cur.kind === "photo" ? "사진" : "메시지")) + '</b><small>' + fmtSecs(data.remain) + (cur.sender ? " · " + esc(cur.sender) : "") + '</small></div>' +
        '<button class="ghost danger" id="clear" type="button">내리기</button>';
      $("clear").onclick = async () => { await api("DELETE"); refresh(); };
    } else { $("now").className = "empty"; $("now").textContent = "지금은 시계 화면이에요."; }

    $("bri").value = data.brightness || 45;
    $("briLabel").textContent = data.brightness ? data.brightness + "% (밤 23~7시는 자동으로 어둡게)" : "기본 45% (밤 23~7시는 자동으로 어둡게)";

    const hist = data.history || [];
    $("hist").innerHTML = hist.length ? "" : '<li class="empty">아직 보낸 메시지가 없어요.</li>';
    for (const m of hist) {
      const li = document.createElement("li");
      li.innerHTML = (m.thumb ? '<img src="' + m.thumb + '" alt="">' : '<img alt="">') +
        '<div class="t"><b>' + esc(m.text || (m.kind === "photo" ? "사진" : "메시지")) + '</b><small>' + fmtTime(m.createdAt) + (m.sender ? " · " + esc(m.sender) : "") + '</small></div>';
      const b = document.createElement("button"); b.className = "ghost"; b.type = "button"; b.textContent = "다시 띄우기";
      b.onclick = async () => { try { await api("POST", { action: "resend", id: m.id, seconds: Number($("secs").value) }); refresh(); } catch (e) { alert(e.message); } };
      li.appendChild(b); $("hist").appendChild(li);
    }
  } catch (e) { $("now").textContent = e.message; }
}

$("send").onclick = async () => {
  const btn = $("send"), st = $("status");
  if (tab === "text" && !$("text").value.trim()) { st.className = "msg err"; st.textContent = "내용을 입력해주세요."; return; }
  if (tab === "photo" && !photo) { st.className = "msg err"; st.textContent = "사진을 골라주세요."; return; }
  btn.disabled = true; st.className = "msg"; st.textContent = "보내는 중…";
  store.set("clock.sender", $("sender").value.trim());
  try {
    render();
    await api("POST", { kind: tab, text: tab === "text" ? $("text").value.trim() : $("caption").value.trim(), sender: $("sender").value.trim(), seconds: Number($("secs").value), frame: toRGB565Base64(), thumb: thumb() });
    st.textContent = "보냈어요. 10초 안에 시계에 표시돼요.";
    if (tab === "text") $("text").value = "";
    refresh();
  } catch (e) { st.className = "msg err"; st.textContent = e.message; }
  btn.disabled = false;
};

let briTimer;
$("bri").oninput = () => { $("briLabel").textContent = $("bri").value + "%"; clearTimeout(briTimer); briTimer = setTimeout(() => api("POST", { action: "brightness", value: Number($("bri").value) }).catch((e) => alert(e.message)), 400); };

$("photo").onchange = () => {
  const f = $("photo").files[0]; if (!f) return;
  const img = new Image();
  img.onload = () => { photo = img; $("photoLabel").textContent = f.name; render(); };
  img.src = URL.createObjectURL(f);
};
["text", "caption", "sender"].forEach((id) => $(id).addEventListener("input", render));

(document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(render);
refresh();
setInterval(refresh, 15000);
</script>
</body>
</html>`;

export async function getServerSideProps({ req, res }) {
  if (!isAuthenticated(req)) {
    return { redirect: { destination: "/", permanent: false } };
  }
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.write(HTML);
  res.end();
  return { props: {} };
}

export default function ClockPage() {
  return null;
}
