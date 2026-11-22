const { isAuthenticated } = require("../lib/auth");

// 4인치 메모 보드(ESP32-4848S040)로 메모/사진 보내기. 브라우저가 480x480으로 그려 RGB565(BE)로 변환해 업로드.
const HTML = `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex, nofollow">
<title>4인치 메모</title>
<style>
  :root { --bg:#f6f4ef; --panel:#fff; --ink:#202124; --muted:#756f66; --line:#ded8cf; --accent:#11685c; --accent-dark:#0c5147; --danger:#a13b24; --danger-soft:#f8e6df; --soft:#e7f2ee; }
  * { box-sizing: border-box; }
  body { margin:0; min-height:100dvh; background:var(--bg); color:var(--ink); font-family:-apple-system,BlinkMacSystemFont,"Apple SD Gothic Neo","Noto Sans KR",sans-serif; padding:16px 16px calc(24px + env(safe-area-inset-bottom)); }
  main { max-width:460px; margin:0 auto; display:grid; gap:14px; }
  .head { display:flex; align-items:center; justify-content:space-between; }
  h1 { font-size:20px; margin:0; }
  .head a { color:var(--muted); font-size:14px; text-decoration:none; }
  .head nav { display:flex; gap:8px; align-items:center; }
  .head a.go { color:var(--ink); font-weight:700; background:#fff; border:1px solid rgba(0,0,0,.1); border-radius:999px; padding:7px 12px; }
  .card { background:var(--panel); border:1px solid var(--line); border-radius:20px; padding:16px; box-shadow:0 18px 48px rgba(34,30,24,.08); }
  .preview { display:flex; justify-content:center; padding:14px; background:#1b1b1b; border-radius:16px; }
  canvas#view { width:min(100%, 360px); aspect-ratio:1; border-radius:6px; image-rendering:pixelated; background:#000; }
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
  .sizer { display:flex; gap:10px; align-items:center; }
  .sizer input { flex:1; }
  .ghost.on { background:var(--soft); border-color:var(--accent); color:var(--accent-dark); }
</style>
</head>
<body>
<main>
  <div class="head"><h1>4인치 메모</h1><nav><a class="go" href="/clock">시계 메시지 →</a><a href="/">intip</a></nav></div>

  <section class="card">
    <div class="preview"><canvas id="view" width="480" height="480"></canvas></div>
    <div class="tabs" style="margin-top:14px">
      <button type="button" data-tab="text" class="on">메시지</button>
      <button type="button" data-tab="photo">사진</button>
    </div>

    <div id="tab-text">
      <label class="f" for="text">내용</label>
      <textarea id="text" maxlength="600" placeholder="보드에 띄울 메모를 적어주세요"></textarea>
      <label class="f">배경</label>
      <div class="swatches" id="themes"></div>
      <label class="f" for="size">글자 크기 <span id="sizeLabel">자동</span></label>
      <div class="sizer">
        <input type="range" id="size" min="24" max="220" step="4" value="120">
        <button type="button" class="ghost" id="sizeAuto">자동</button>
      </div>
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
          <option value="30">30초</option><option value="60">1분</option><option value="300">5분</option>
          <option value="1800">30분</option><option value="3600">1시간</option><option value="0" selected>계속 (다음 반영까지)</option>
        </select></div>
    </div>
    <button class="send" id="send" type="button">반영하기</button>
    <p class="msg">보드 화면을 옆으로 넘기면 시계가 나와요.</p>
    <div class="msg" id="status"></div>
  </section>

  <section class="card">
    <h2>지금 보드 화면</h2>
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
const W = 480;
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
let tab = "text", theme = 0, photo = null, manualSize = 0; // 0 = 자동

const $ = (id) => document.getElementById(id);
const store = { get(k) { try { return localStorage.getItem(k); } catch { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch {} } };
$("sender").value = store.get("4inch.sender") || "";

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

function fitText(text, box, fixed) {
  if (fixed) {   // 사용자가 정한 크기: 넘쳐도 그대로 (미리보기로 확인)
    return { size: fixed, lines: wrap(text, fixed, box.w), lh: Math.round(fixed * 1.28) };
  }
  for (let size = 220; size >= 28; size -= 4) {
    const lines = wrap(text, size, box.w);
    const lh = Math.round(size * 1.28);
    if (lines.length * lh <= box.h) return { size, lines, lh };
  }
  const lines = wrap(text, 28, box.w);
  return { size: 28, lines: lines.slice(0, Math.floor(box.h / 36)), lh: 36 };
}

function drawLines(fit, fg, cx, top, h, shadow, left) {
  ctx.font = "700 " + fit.size + "px " + FONT;
  ctx.textAlign = left ? "left" : "center"; ctx.textBaseline = "middle"; ctx.fillStyle = fg;
  if (shadow) { ctx.shadowColor = "rgba(0,0,0,.65)"; ctx.shadowBlur = 12; }
  let y = left ? top + fit.lh / 2 : top + (h - fit.lines.length * fit.lh) / 2 + fit.lh / 2;   // 메모: 위에서부터
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
    const text = $("text").value.replace(/\s+$/, "") || "메모를 입력하세요";
    const bottom = sender ? 68 : 28;
    const fit = fitText(text, { w: W - 56, h: W - 28 - bottom }, manualSize);
    drawLines(fit, t.fg, 28, 28, W - 28 - bottom, false, true);   // 메모: 왼쪽 정렬
    if (!manualSize) { $("size").value = fit.size; }
    $("sizeLabel").textContent = (manualSize ? fit.size + "px" : "자동 (" + fit.size + "px)") + (fit.lines.length > 1 ? " · " + fit.lines.length + "줄" : " · 한 줄");
    if (sender) { ctx.font = "600 30px " + FONT; ctx.globalAlpha = .75; ctx.fillStyle = t.fg; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("— " + sender, W / 2, W - 40); ctx.globalAlpha = 1; }
  } else {
    ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, W);
    if (photo) {
      const s = Math.max(W / photo.width, W / photo.height);
      const w = photo.width * s, h = photo.height * s;
      ctx.drawImage(photo, (W - w) / 2, (W - h) / 2, w, h);
    } else {
      ctx.fillStyle = "#777"; ctx.font = "600 36px " + FONT; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("사진을 골라주세요", W / 2, W / 2);
    }
    const cap = [$("caption").value.trim(), sender ? "— " + sender : ""].filter(Boolean).join("  ");
    if (cap) {
      const g = ctx.createLinearGradient(0, W - 180, 0, W); g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, "rgba(0,0,0,.75)");
      ctx.fillStyle = g; ctx.fillRect(0, W - 180, W, 180);
      drawLines(fitText(cap, { w: W - 48, h: 104 }), "#fff", W / 2, W - 124, 104, true);
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
  const r = await fetch("/api/4inch/messages", { method, headers: body ? { "Content-Type": "application/json" } : {}, body: body ? JSON.stringify(body) : undefined, credentials: "same-origin" });
  if (r.status === 401) { location.href = "/"; throw new Error("로그인이 필요해요"); }
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || "요청 실패 (" + r.status + ")");
  return j;
}

function fmtSecs(s) { return s < 0 ? "다음 메시지까지" : s >= 60 ? Math.ceil(s / 60) + "분 남음" : s + "초 남음"; }
function fmtTime(iso) { const d = new Date(iso); return (d.getMonth() + 1) + "/" + d.getDate() + " " + String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0"); }
function esc(s) { return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]); }

let loaded = false;
function loadCurrent(cur) {
  if (loaded) return;
  loaded = true;
  if (!cur || cur.kind !== "text") return;
  $("text").value = cur.text || "";
  if (cur.sender !== undefined) $("sender").value = cur.sender || $("sender").value;
  if (cur.style) {
    if (Number.isInteger(cur.style.theme) && THEMES[cur.style.theme]) {
      theme = cur.style.theme;
      document.querySelectorAll(".sw").forEach((s, j) => s.classList.toggle("on", j === theme));
    }
    manualSize = Number(cur.style.size) || 0;
    if (manualSize) $("size").value = manualSize;
    setAuto(!manualSize);
  }
  render();
}

async function refresh() {
  try {
    const data = await api("GET");
    const cur = data.current;
    loadCurrent(cur || (data.history || [])[0]);
    if (cur && data.remain !== 0) {
      $("now").className = "now";
      $("now").innerHTML = (cur.thumb ? '<img src="' + cur.thumb + '" alt="">' : "") +
        '<div class="t"><b>' + esc(cur.text || (cur.kind === "photo" ? "사진" : "메시지")) + '</b><small>' + fmtSecs(data.remain) + (cur.sender ? " · " + esc(cur.sender) : "") + '</small></div>' +
        '<button class="ghost danger" id="clear" type="button">내리기</button>';
      $("clear").onclick = async () => { await api("DELETE"); refresh(); };
    } else { $("now").className = "empty"; $("now").textContent = "지금은 띄운 메모가 없어요. 보드에는 시계가 보여요."; }

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
  btn.disabled = true; st.className = "msg"; st.textContent = "반영하는 중…";
  store.set("4inch.sender", $("sender").value.trim());
  try {
    render();
    await api("POST", { kind: tab, text: tab === "text" ? $("text").value.replace(/\s+$/, "") : $("caption").value.trim(), sender: $("sender").value.trim(), seconds: Number($("secs").value), frame: toRGB565Base64(), thumb: thumb(), style: { theme, size: manualSize } });
    st.textContent = "반영했어요. 10초 안에 보드에 표시돼요.";
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
function setAuto(on) { $("sizeAuto").classList.toggle("on", on); }
$("size").addEventListener("input", () => { manualSize = Number($("size").value); setAuto(false); render(); });
$("sizeAuto").onclick = () => { manualSize = 0; setAuto(true); render(); };
setAuto(true);

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

export default function FourInchPage() {
  return null;
}
