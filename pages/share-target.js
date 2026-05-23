// POST: SW was not yet active (cold start). The act of loading this page
// activates the SW so the next share attempt goes through the SW directly
// to R2 with no file size limit.
// GET: navigation fallback — redirect to home.
export async function getServerSideProps({ req, res }) {
  if (req.method === "POST") {
    // Drain the body so the connection closes cleanly, but don't read bytes.
    await new Promise((resolve) => {
      req.on("data", () => {});
      req.on("end", resolve);
    });
    res.setHeader("Location", "/?share_retry=1");
    res.statusCode = 303;
    res.end();
    return { props: {} };
  }

  res.setHeader("Location", "/");
  res.statusCode = 303;
  res.end();
  return { props: {} };
}

export default function ShareTargetPage() {
  return null;
}
