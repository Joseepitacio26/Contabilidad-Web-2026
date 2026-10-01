import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "jsr:@supabase/supabase-js@2.49.8";
import * as kv from "./kv_store.tsx";

const app = new Hono();

app.use("*", logger(console.log));
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// ── Health ────────────────────────────────────────────────────────────────────
app.get("/make-server-2a581011/health", (c) => c.json({ status: "ok" }));

// ── Auth helper ───────────────────────────────────────────────────────────────
async function getUserId(token: string): Promise<string> {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) throw new Error("Unauthorized");
  return user.id;
}

function authToken(c: any): string {
  return (c.req.header("Authorization") ?? "").replace("Bearer ", "");
}

// ── Jobs ──────────────────────────────────────────────────────────────────────
app.get("/make-server-2a581011/jobs", async (c) => {
  try {
    const uid = await getUserId(authToken(c));
    const data = await kv.get(`${uid}/jobs`);
    return c.json(data ?? []);
  } catch (e: any) {
    return c.json({ error: e.message }, 401);
  }
});

app.put("/make-server-2a581011/jobs", async (c) => {
  try {
    const uid = await getUserId(authToken(c));
    const body = await c.req.json();
    await kv.set(`${uid}/jobs`, body);
    return c.json({ ok: true });
  } catch (e: any) {
    return c.json({ error: e.message }, 401);
  }
});

// ── Employees ─────────────────────────────────────────────────────────────────
app.get("/make-server-2a581011/employees", async (c) => {
  try {
    const uid = await getUserId(authToken(c));
    const data = await kv.get(`${uid}/employees`);
    return c.json(data ?? []);
  } catch (e: any) {
    return c.json({ error: e.message }, 401);
  }
});

app.put("/make-server-2a581011/employees", async (c) => {
  try {
    const uid = await getUserId(authToken(c));
    const body = await c.req.json();
    await kv.set(`${uid}/employees`, body);
    return c.json({ ok: true });
  } catch (e: any) {
    return c.json({ error: e.message }, 401);
  }
});

// ── Settings ──────────────────────────────────────────────────────────────────
app.get("/make-server-2a581011/settings", async (c) => {
  try {
    const uid = await getUserId(authToken(c));
    const data = await kv.get(`${uid}/settings`);
    return c.json(data ?? null);
  } catch (e: any) {
    return c.json({ error: e.message }, 401);
  }
});

app.put("/make-server-2a581011/settings", async (c) => {
  try {
    const uid = await getUserId(authToken(c));
    const body = await c.req.json();
    await kv.set(`${uid}/settings`, body);
    return c.json({ ok: true });
  } catch (e: any) {
    return c.json({ error: e.message }, 401);
  }
});

Deno.serve(app.fetch);
