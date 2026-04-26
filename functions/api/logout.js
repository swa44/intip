import { clearSessionCookie } from "../_lib/auth.js";
import { json } from "../_lib/storage.js";

export function onRequestPost() {
  return json(
    { ok: true },
    {
      headers: {
        "Set-Cookie": clearSessionCookie(),
      },
    },
  );
}

