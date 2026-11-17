// ToDoMe API. Static files (the app) are served by Workers Assets; only /api/* reaches this code.
//
// Sync model: the browser keeps the whole list on the device and sends what changed.
// Each item is stored as one row; on conflict the change with the newer `updatedAt` wins.
// Every write gets a new `seq`, so a device asks "what changed since seq N?".

interface Env {
  DB: D1Database;
  /** Set with: wrangler secret put APP_PASSWORD (or in the Cloudflare dashboard). */
  APP_PASSWORD?: string;
}

const COOKIE = "todome_session";
const MAX_CHANGES = 500;
const PAGE = 1000;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    try {
      if (url.pathname === "/api/login" && request.method === "POST") return login(request, env);
      if (url.pathname === "/api/logout" && request.method === "POST") return logout();

      if (!(await isSignedIn(request, env))) return json({ error: "signed_out" }, 401);

      if (url.pathname === "/api/session") return json({ ok: true });
      if (url.pathname === "/api/sync" && request.method === "POST") return sync(request, env);
      return json({ error: "not_found" }, 404);
    } catch (err) {
      console.error(err);
      return json({ error: "server_error" }, 500);
    }
  },
} satisfies ExportedHandler<Env>;

// ---------- auth: one password, a long-lived cookie ----------

async function sessionToken(password: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode("todome-session-v1"));
  return btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function sameString(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function readCookie(request: Request, name: string): string | null {
  const header = request.headers.get("Cookie") ?? "";
  for (const part of header.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return v.join("=");
  }
  return null;
}

async function isSignedIn(request: Request, env: Env): Promise<boolean> {
  if (!env.APP_PASSWORD) return false;
  const got = readCookie(request, COOKIE);
  return !!got && sameString(got, await sessionToken(env.APP_PASSWORD));
}

async function login(request: Request, env: Env): Promise<Response> {
  if (!env.APP_PASSWORD) return json({ error: "no_password_set" }, 503);
  const body = (await request.json().catch(() => null)) as { password?: unknown } | null;
  const given = typeof body?.password === "string" ? body.password : "";
  const [a, b] = await Promise.all([sessionToken(given), sessionToken(env.APP_PASSWORD)]);
  if (!sameString(a, b)) {
    await new Promise((r) => setTimeout(r, 600)); // slow down guessing
    return json({ error: "wrong_password" }, 401);
  }
  return json({ ok: true }, 200, {
    "Set-Cookie": `${COOKIE}=${b}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=34560000`,
  });
}

function logout(): Response {
  return json({ ok: true }, 200, { "Set-Cookie": `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0` });
}

// ---------- sync ----------

let schemaReady = false;
async function ensureSchema(db: D1Database) {
  if (schemaReady) return;
  await db.batch([
    db.prepare(
      "CREATE TABLE IF NOT EXISTS items (id TEXT PRIMARY KEY, data TEXT NOT NULL, updated_at INTEGER NOT NULL, seq INTEGER NOT NULL)",
    ),
    db.prepare("CREATE INDEX IF NOT EXISTS items_seq ON items (seq)"),
  ]);
  schemaReady = true;
}

interface IncomingItem {
  id: string;
  updatedAt: number;
  [k: string]: unknown;
}

function validItem(x: unknown): x is IncomingItem {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return typeof o.id === "string" && o.id.length > 0 && o.id.length <= 64 && typeof o.updatedAt === "number";
}

async function sync(request: Request, env: Env): Promise<Response> {
  const db = env.DB;
  await ensureSchema(db);

  const body = (await request.json().catch(() => null)) as { since?: unknown; changes?: unknown } | null;
  const since = typeof body?.since === "number" && body.since >= 0 ? body.since : 0;
  const changes = Array.isArray(body?.changes) ? body.changes.filter(validItem).slice(0, MAX_CHANGES) : [];

  if (changes.length) {
    const upsert = db.prepare(
      `INSERT INTO items (id, data, updated_at, seq)
       VALUES (?1, ?2, ?3, (SELECT COALESCE(MAX(seq), 0) + 1 FROM items))
       ON CONFLICT (id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at, seq = excluded.seq
       WHERE excluded.updated_at > items.updated_at`,
    );
    const rows = changes
      .map((c) => [c.id, JSON.stringify(c), c.updatedAt] as const)
      .filter(([, data]) => data.length <= 20_000);
    if (rows.length) await db.batch(rows.map((r) => upsert.bind(...r)));
  }

  // Everything newer than the device's cursor…
  const { results } = await db
    .prepare("SELECT data, seq FROM items WHERE seq > ?1 ORDER BY seq LIMIT ?2")
    .bind(since, PAGE)
    .all<{ data: string; seq: number }>();
  const more = results.length === PAGE;
  const cursor = results.length ? results[results.length - 1].seq : since;

  // …plus the server's copy of anything the device sent, so a losing edit gets corrected.
  const seen = new Set(results.map((r) => (JSON.parse(r.data) as IncomingItem).id));
  const sentIds = changes.map((c) => c.id).filter((id) => !seen.has(id));
  const corrections: string[] = [];
  for (let i = 0; i < sentIds.length; i += 90) {
    const chunk = sentIds.slice(i, i + 90);
    const r = await db
      .prepare(`SELECT data FROM items WHERE id IN (${chunk.map(() => "?").join(",")})`)
      .bind(...chunk)
      .all<{ data: string }>();
    corrections.push(...r.results.map((x) => x.data));
  }

  const items = [...results.map((r) => r.data), ...corrections].map((d) => JSON.parse(d));
  return json({ items, cursor, more });
}

function json(data: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...headers },
  });
}
