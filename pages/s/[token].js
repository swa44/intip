const { FILES_KEY, readJson, signedGetUrl } = require("../../lib/r2");

// Public share link: /s/<token>
// No login required. Anyone with the link gets redirected to a short-lived
// signed R2 URL, so the file itself never passes through Vercel.
const INLINE_TYPES = /^(image\/|video\/|audio\/|text\/plain|application\/pdf)/;

export async function getServerSideProps({ params, query, res }) {
  const token = String(params?.token || "");
  const files = token.length >= 16 ? await readJson(FILES_KEY, []) : [];
  const record = files.find((file) => file.shareToken && file.shareToken === token);

  if (!record) {
    res.statusCode = 404;
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    res.end(
      '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
        '<title>링크 없음</title><body style="font-family:system-ui;padding:40px;text-align:center;color:#444">' +
        "<h2>공유 링크가 없거나 해제되었습니다.</h2></body>",
    );
    return { props: {} };
  }

  const type = record.type || "application/octet-stream";
  const url = await signedGetUrl({
    key: record.key,
    name: record.name,
    type,
    inline: query.download === undefined && INLINE_TYPES.test(type),
  });

  res.setHeader("Cache-Control", "no-store");
  return { redirect: { destination: url, permanent: false } };
}

export default function SharePage() {
  return null;
}
