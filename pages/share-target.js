export async function getServerSideProps({ res }) {
  // Redirect to home page with a status code 303 (See Other)
  // This changes the POST request to a GET request to the homepage,
  // preventing 404 errors during cold starts when the Service Worker is not yet active.
  res.setHeader("Location", "/?shared_fallback=1");
  res.statusCode = 303;
  res.end();

  return { props: {} };
}

export default function ShareTargetPage() {
  return null;
}
