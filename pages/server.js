const { isAuthenticated } = require("../lib/auth");

const HTML = `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>지화자 서버</title>
<style>
  :root { --bg:#f6f4ef; --panel:#fff; --ink:#202124; --muted:#756f66; --line:#ded8cf; --accent:#11685c; --danger:#a13b24; --danger-soft:#f8e6df; --soft:#e7f2ee; }
  * { box-sizing: border-box; }
  body { margin: 0; min-height: 100dvh; background: var(--bg); color: var(--ink); font-family: -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif; display: flex; align-items: center; justify-content: center; padding: 20px; }
  main { width: 100%; max-width: 420px; background: var(--panel); border: 1px solid var(--line); border-radius: 22px; padding: 26px; box-shadow: 0 18px 48px rgba(34,30,24,.1); }
  .head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 22px; }
  h1 { font-size: 20px; margin: 0; }
  .head a { color: var(--muted); font-size: 14px; text-decoration: none; }
  .status { display: flex; align-items: center; gap: 14px; padding: 18px; border-radius: 16px; background: #f4f2ed; }
  .status.on { background: var(--soft); }
  .status.busy { background: #fff4d6; }
  .dot { width: 18px; height: 18px; border-radius: 50%; background: #b5afa6; flex: none; }
  .on .dot { background: #1fa971; box-shadow: 0 0 0 5px rgba(31,169,113,.18); }
  .busy .dot { background: #e6a117; animation: blink 1s infinite; }
  @keyframes blink { 50% { opacity: .35; } }
  .status b { display: block; font-size: 24px; }
  .status small { display: block; color: var(--muted); margin-top: 3px; font-size: 14px; }
  .warn { margin: 12px 0 0; padding: 10px 14px; border-radius: 12px; background: var(--danger-soft); color: var(--danger); font-size: 14px; font-weight: 700; }
  button, .open { display: block; width: 100%; margin-top: 12px; padding: 16px; border: 0; border-radius: 14px; font: inherit; font-size: 17px; font-weight: 800; text-align: center; text-decoration: none; cursor: pointer; }
  button:disabled { opacity: .45; cursor: default; }
  #start { background: var(--accent); color: #fff; }
  #stop { background: var(--danger-soft); color: var(--danger); }
  .open { background: var(--soft); color: var(--accent); }
  .hidden { display: none; }
  .foot { color: var(--muted); font-size: 13px; margin: 16px 0 0; line-height: 1.5; }
  .err { color: var(--danger); font-size: 14px; font-weight: 700; margin: 12px 0 0; }
</style>
</head>
<body>
<main>
  <div class="head"><h1>지화자 서버</h1><a href="/">← intip</a></div>
  <div class="status busy" id="box"><i class="dot"></i><div><b id="label">확인 중</b><small id="sub"></small></div></div>
  <p class="warn hidden" id="warn"></p>
  <a class="open hidden" id="open" href="https://oox.kr" target="_blank" rel="noopener">oox.kr 열기</a>
  <button id="start" class="hidden" type="button">서버 켜기</button>
  <button id="stop" class="hidden" type="button">서버 끄기</button>
  <p class="err hidden" id="err"></p>
  <p class="foot">켜 둔 시간만큼 요금이 나가요. 자동으로 꺼지지 않으니 다 쓰면 꺼 주세요. 큰 행사는 30분~1시간 전에 켜 두세요.</p>
</main>
<script>
(function () {
  const $ = (id) => document.getElementById(id);
  let pending = null, last = null, timer = null;

  const fmtSince = (iso) => {
    const min = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
    return min < 60 ? min + "분째 켜져 있어요" : Math.floor(min / 60) + "시간 " + (min % 60) + "분째 켜져 있어요";
  };

  function draw(s) {
    last = s;
    // 켜기/끄기를 누른 뒤 목표 상태가 될 때까지는 진행 중으로 보여준다
    if (pending === "start" && s.ready) pending = null;
    if (pending === "stop" && s.state === "stopped") pending = null;
    const on = s.state === "started" && s.ready && !pending;
    const off = s.state === "stopped" && !pending;
    const suspended = s.state === "suspended" && !pending;
    const busy = !on && !off && !suspended;
    $("box").className = "status " + (on ? "on" : busy ? "busy" : "");
    $("label").textContent = on ? "켜져 있어요" : off ? "꺼져 있어요" : suspended ? "일시 중단됨" : pending === "stop" || s.state === "stopping" ? "끄는 중…" : "켜는 중…";
    const parts = [];
    if (on && s.connections != null) parts.push("접속 " + s.connections + "개");
    if (on && s.startedAt) parts.push(fmtSince(s.startedAt));
    if (off) parts.push("지금은 아무도 접속할 수 없어요");
    $("sub").textContent = parts.join(" · ");
    $("start").classList.toggle("hidden", !(off || suspended));
    $("stop").classList.toggle("hidden", !on);
    $("open").classList.toggle("hidden", !on);
    const warn = on && s.connections > 0;
    $("warn").classList.toggle("hidden", !warn);
    if (warn) $("warn").textContent = "지금 " + s.connections + "개가 접속 중이에요. 행사 중인지 확인하세요.";
  }

  async function refresh() {
    clearTimeout(timer);
    try {
      const response = await fetch("/api/jihwaja-server", { cache: "no-store" });
      if (response.status === 401) { location.href = "/"; return; }
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "상태를 불러오지 못했어요.");
      $("err").classList.add("hidden");
      draw(data);
    } catch (error) {
      $("err").textContent = error.message || "상태를 불러오지 못했어요.";
      $("err").classList.remove("hidden");
    }
    if (!document.hidden) timer = setTimeout(refresh, pending || (last && last.state !== "started" && last.state !== "stopped") ? 2000 : 8000);
  }

  async function act(action) {
    if (action === "stop") {
      const n = last && last.connections;
      const message = n > 0
        ? "지금 " + n + "개가 접속 중이에요!\\n끄면 모두 연결이 끊기고 진행 중인 게임이 멈춰요. 그래도 끌까요?"
        : "서버를 끌까요? 다시 켜기 전까지 아무도 접속할 수 없어요.";
      if (!confirm(message)) return;
    }
    pending = action;
    if (last) draw(last);
    try {
      const response = await fetch("/api/jihwaja-server", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
      const data = await response.json().catch(() => ({}));
      if (response.status === 401) { location.href = "/"; return; }
      if (!response.ok) throw new Error(data.error || "조작에 실패했어요.");
    } catch (error) {
      pending = null;
      $("err").textContent = error.message || "조작에 실패했어요.";
      $("err").classList.remove("hidden");
    }
    refresh();
  }

  $("start").onclick = () => act("start");
  $("stop").onclick = () => act("stop");
  document.addEventListener("visibilitychange", () => { if (!document.hidden) refresh(); });
  refresh();
})();
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

export default function ServerPage() {
  return null;
}
