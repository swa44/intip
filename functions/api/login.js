import { createSessionCookie } from "../_lib/auth.js";
import { json } from "../_lib/storage.js";

export async function onRequestPost({ request, env }) {
  if (!env.INTIP_PASSWORD) {
    return json({ error: "INTIP_PASSWORD is not configured." }, { status: 500 });
  }

  const { password } = await request.json().catch(() => ({}));
  if (!password || password !== env.INTIP_PASSWORD) {
    return json({ error: "Wrong password." }, { status: 401 });
  }

  const cookie = await createSessionCookie(env);
  return json(
    { ok: true },
    {
      headers: {
        "Set-Cookie": cookie,
      },
    },
  );
}

