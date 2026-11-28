// Edge cache + safety net for the inventory feed (Apps Script). Visitors get the feed from Cloudflare's edge
// in milliseconds, Apps Script is hit about once a minute no matter how many visitors there are, and if Apps
// Script is down or over quota the last good copy keeps the site showing watches.
const APPS = "https://script.google.com/macros/s/AKfycbyXfGhkw1ClKhTPCar8ZsOjcPztJA4rVSXvnFUQ8IM5S0x6xQpGHIVui6Ykbf-GOIoa/exec?feed=1";
const JSON_HEADERS = {"content-type": "application/json; charset=utf-8"};

export async function onRequestGet(ctx) {
  const cache = caches.default, origin = new URL(ctx.request.url).origin;
  const goodKey = new Request(origin + "/__feed_last_good");
  try {
    const r = await fetch(APPS, {redirect: "follow", cf: {cacheTtl: 45, cacheEverything: true}});
    if (!r.ok) throw new Error("upstream " + r.status);
    const body = await r.text();
    const d = JSON.parse(body);
    if (!d || !Array.isArray(d.watches)) throw new Error("bad shape");
    ctx.waitUntil(cache.put(goodKey, new Response(body, {headers: {...JSON_HEADERS, "cache-control": "max-age=604800"}})));
    return new Response(body, {headers: {...JSON_HEADERS, "cache-control": "public, max-age=30, stale-while-revalidate=300"}});
  } catch (err) {
    const old = await cache.match(goodKey);
    if (old) return new Response(await old.text(), {headers: {...JSON_HEADERS, "cache-control": "public, max-age=15", "x-feed": "stale"}});
    return new Response(JSON.stringify({error: "feed unavailable"}), {status: 502, headers: {...JSON_HEADERS, "cache-control": "no-store"}});
  }
}
