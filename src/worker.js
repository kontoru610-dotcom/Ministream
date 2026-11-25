
const DEFAULTS = {
  title: "MiniStream",
  description: "Selamat datang di MiniStream.",
  video_type: "mp4",
  video_url: "",
  referral_1: "https://example.com/ref1",
  referral_2: "https://example.com/ref2",
  referral_3: "https://example.com/ref3"
};

const ALLOWED_KEYS = new Set(Object.keys(DEFAULTS));
const R2_PUBLIC_URL = "https://pub-9abcf2641023481fa3bd540740914dee.r2.dev";
const MAX_UPLOAD_SIZE = 95 * 1024 * 1024;

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff"
    }
  });
}

function validHttpUrl(value) {
  try {
    const u = new URL(value);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

function safeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

function authorized(request, env) {
  const expected = env.ADMIN_PASSWORD;
  const auth = request.headers.get("authorization") || "";
  const supplied = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  return Boolean(expected) && safeEqual(supplied, expected);
}

async function readSettings(db) {
  const result = await db.prepare("SELECT key, value FROM settings").all();
  const values = { ...DEFAULTS };
  for (const row of (result.results || [])) values[row.key] = row.value;
  return values;
}

async function adminApi(request, env, path) {
  if (!authorized(request, env)) {
    return json({ error: "Password admin salah atau belum diatur." }, 401);
  }

  if (request.method === "POST" && path === "/api/admin/upload") {
    if (!env.VIDEOS) {
      return json({ error: "Binding R2 VIDEOS belum tersedia." }, 500);
    }

    let form;
    try {
      form = await request.formData();
    } catch {
      return json({ error: "Data upload tidak valid." }, 400);
    }

    const file = form.get("video");

    if (!file || typeof file.arrayBuffer !== "function") {
      return json({ error: "Pilih file video terlebih dahulu." }, 400);
    }

    if (!file.name || !file.name.toLowerCase().endsWith(".mp4")) {
      return json({ error: "File harus berformat MP4." }, 400);
    }

    if (file.size <= 0 || file.size > MAX_UPLOAD_SIZE) {
      return json({ error: "Ukuran video maksimal 95 MB." }, 400);
    }

    const key = `videos/${crypto.randomUUID()}.mp4`;

    await env.VIDEOS.put(key, await file.arrayBuffer(), {
      httpMetadata: {
        contentType: "video/mp4",
        cacheControl: "public, max-age=31536000"
      }
    });

    return json({
      ok: true,
      video_url: `${R2_PUBLIC_URL}/${key}`
    });
  }

  if (request.method === "GET" && path === "/api/admin/settings") {
    return json({ settings: await readSettings(env.DB) });
  }

  if (request.method === "POST" && path === "/api/admin/settings") {
    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: "JSON tidak valid." }, 400);
    }

    const updates = body && body.settings;
    if (!updates || typeof updates !== "object") {
      return json({ error: "Data pengaturan tidak ditemukan." }, 400);
    }

    const clean = {};
    for (const [key, raw] of Object.entries(updates)) {
      if (!ALLOWED_KEYS.has(key)) continue;
      const value = String(raw ?? "").trim();

      if (value.length > 2000) {
        return json({ error: `Nilai ${key} terlalu panjang.` }, 400);
      }

      if (key.startsWith("referral_") && !validHttpUrl(value)) {
        return json({ error: `Link ${key} harus berupa URL http:// atau https:// yang valid.` }, 400);
      }

      if (key === "video_type" && !["mp4", "hls", "youtube"].includes(value)) {
        return json({ error: "Jenis video tidak valid." }, 400);
      }

      if (key === "video_url" && value && !validHttpUrl(value)) {
        return json({ error: "URL video harus berupa URL http:// atau https:// yang valid." }, 400);
      }

      clean[key] = value;
    }

    const statements = Object.entries(clean).map(([key, value]) =>
      env.DB.prepare(
        "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
      ).bind(key, value)
    );

    if (statements.length) await env.DB.batch(statements);

    return json({ ok: true, settings: await readSettings(env.DB) });
  }

  if (request.method === "GET" && path === "/api/admin/stats") {
    const rows = await env.DB.prepare(
      "SELECT referral_index, COUNT(*) AS clicks FROM referral_clicks GROUP BY referral_index"
    ).all();

    const counts = [0, 0, 0];
    for (const row of (rows.results || [])) {
      counts[row.referral_index] = row.clicks;
    }

    return json({ clicks: counts });
  }

  return json({ error: "Endpoint tidak ditemukan." }, 404);
}

async function handle(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;

  if (path.startsWith("/api/admin/")) {
    return adminApi(request, env, path);
  }

  if (request.method === "GET" && path === "/api/public") {
    const s = await readSettings(env.DB);
    return json({
      title: s.title,
      description: s.description,
      video_type: s.video_type,
      video_url: s.video_url
    });
  }

  if (request.method === "GET" && path === "/go/next") {
    const state = await env.DB.prepare(
      "UPDATE referral_state SET last_index = (last_index + 1) % 3 WHERE id = 1 RETURNING last_index"
    ).first();

    const index = Number(state?.last_index ?? 0);
    const s = await readSettings(env.DB);
    const target = s[`referral_${index + 1}`];

    if (!validHttpUrl(target)) {
      return new Response("Link referral belum diatur oleh admin.", { status: 503 });
    }

    await env.DB.prepare(
      "INSERT INTO referral_clicks (referral_index) VALUES (?)"
    ).bind(index).run();

    return Response.redirect(target, 302);
  }

  return env.ASSETS.fetch(request);
}

export default {
  async fetch(request, env) {
    try {
      return await handle(request, env);
    } catch (error) {
      return json({
        error: "Terjadi kesalahan server.",
        detail: env.ENVIRONMENT === "development" ? String(error) : undefined
      }, 500);
    }
  }
};
