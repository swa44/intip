const fs = require("fs");
const path = require("path");

export async function getServerSideProps({ res }) {
  const html = fs.readFileSync(path.join(process.cwd(), "index.html"), "utf8");
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.write(html);
  res.end();

  return { props: {} };
}

export default function IntipPage() {
  return null;
}

