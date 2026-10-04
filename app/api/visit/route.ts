import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

/*
  Visitor counter, kept in Upstash Redis (installed from the Vercel
  Marketplace, which sets the env vars below). Two numbers: unique visitors
  (a browser counted once, remembered by a random id it keeps locally) and
  page views (counted once per browser session). No cookies, no IPs, nothing
  personal is stored. Without the env vars the counter reports itself as
  not configured and the footer hides it.
*/

export const dynamic = "force-dynamic";

const VISITORS = "portfolio:visitors";
const VIEWS = "portfolio:views";
const SEEN = "portfolio:seen"; // set of visitor ids

function redis() {
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? new Redis({ url, token }) : null;
}

async function totals(r: Redis) {
  const [visitors, views] = await r.mget<[number | null, number | null]>(VISITORS, VIEWS);
  return { configured: true, visitors: Number(visitors ?? 0), views: Number(views ?? 0) };
}

const noStore = { headers: { "Cache-Control": "no-store" } };

export async function GET() {
  const r = redis();
  if (!r) return NextResponse.json({ configured: false }, noStore);
  try {
    return NextResponse.json(await totals(r), noStore);
  } catch {
    return NextResponse.json({ configured: false }, noStore);
  }
}

/** Records a view; a visitor id seen for the first time also counts as a visitor. */
export async function POST(req: Request) {
  const r = redis();
  if (!r) return NextResponse.json({ configured: false }, noStore);
  try {
    const ua = req.headers.get("user-agent") ?? "";
    if (/bot|crawl|spider|preview|headless/i.test(ua)) return NextResponse.json(await totals(r), noStore);
    const body = (await req.json().catch(() => ({}))) as { id?: unknown };
    const id = typeof body.id === "string" && /^[a-z0-9]{8,40}$/.test(body.id) ? body.id : null;
    const p = r.pipeline();
    p.incr(VIEWS);
    if (id) p.sadd(SEEN, id);
    const res = await p.exec<[number, number?]>();
    if (id && res[1] === 1) await r.incr(VISITORS);
    return NextResponse.json(await totals(r), noStore);
  } catch {
    return NextResponse.json({ configured: false }, noStore);
  }
}
