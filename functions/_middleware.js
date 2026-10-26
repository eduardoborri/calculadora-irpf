// Cloudflare Pages: asks for a shared password before serving any page.
// The password is the SITE_PASSWORD environment variable, set in the
// Cloudflare dashboard (Settings → Variables and Secrets). Any user name is
// accepted. Without the variable the site stays closed.
export async function onRequest({ request, env, next }) {
  const expected = env.SITE_PASSWORD;
  if (!expected) {
    return new Response("Acesso não configurado: defina SITE_PASSWORD na Cloudflare.", {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const header = request.headers.get("Authorization") || "";
  if (header.startsWith("Basic ")) {
    try {
      const decoded = new TextDecoder().decode(Uint8Array.from(atob(header.slice(6)), (c) => c.charCodeAt(0)));
      const password = decoded.slice(decoded.indexOf(":") + 1);
      if (await sameText(password, expected)) return next();
    } catch {
      // Malformed header: fall through to the password prompt.
    }
  }

  return new Response("Acesso restrito à equipe do Gaia Silva Gaede Advogados.", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Calculadora IRPF-M", charset="UTF-8"',
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}

// Compares SHA-256 digests so the time taken doesn't depend on how much of
// the password matches.
async function sameText(a, b) {
  const digest = async (text) => new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)));
  const [x, y] = await Promise.all([digest(a), digest(b)]);
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}
