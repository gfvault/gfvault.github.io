// GF Vault site: hash-routed pages, inventory from data/inventory.json (built from the sheet by scripts/site_inventory.py), inquiries by email.
const EMAIL = "gfvaultco@gmail.com", IG = "https://instagram.com/gfvault";
// Live inventory: the dealer portal's public feed (Apps Script web app, ?feed=1). Fallback: data/inventory.json.
const FEED_URL = "https://script.google.com/macros/s/AKfycbyXfGhkw1ClKhTPCar8ZsOjcPztJA4rVSXvnFUQ8IM5S0x6xQpGHIVui6Ykbf-GOIoa/exec";
const $ = (s, el = document) => el.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
let WATCHES = [], SOLD = [], brandFilter = "All", query = "";

const VIEWS = ["home", "inventory", "sold", "sell", "about", "contact", "founders"];
function route() {
  let name = location.hash.slice(1);
  if (!VIEWS.includes(name)) name = "home";
  document.querySelectorAll(".view").forEach(v => v.hidden = v.dataset.view !== name);
  document.querySelectorAll("nav a").forEach(a => a.classList.toggle("on", a.getAttribute("href") === "#" + name));
  document.title = (name === "home" ? "" : {inventory: "Inventory", sold: "Sold", sell: "Sell or Trade", about: "About", contact: "Contact", founders: "Founders"}[name] + " · ") + "GF Vault · Luxury Watch Company";
  if (name === "founders") { const f = $("#portal"); if (!f.src) f.src = FEED_URL; }
  $("#modal").hidden = true; closeMenu(); scrollTo(0, 0);
}
function closeMenu() { $(".top").classList.remove("open"); $(".menu").setAttribute("aria-expanded", "false"); }
$(".menu").addEventListener("click", () => $(".menu").setAttribute("aria-expanded", $(".top").classList.toggle("open")));
window.addEventListener("hashchange", route);
document.addEventListener("click", e => {
  const i = e.target.closest("[data-intent]");
  if (i) $("#sellform").elements.intent.value = i.dataset.intent;
  if (e.target.closest("nav a")) closeMenu();
  const t = e.target.closest("[data-brand]");
  if (t) {
    const b = t.dataset.brand;
    if (WATCHES.some(w => w.brand === b)) { brandFilter = b; query = $("#search").value = ""; filters(); render(); location.hash = "inventory"; }
    else { const f = $("#sellform").elements; f.intent.value = "Find a specific watch"; f.brand.value = b; location.hash = "sell"; }
  }
});

const title = w => [w.brand, w.model].filter(Boolean).join(" ");
const specs = w => [w.ref, w.year, w.dial && w.dial + " dial", w.set].filter(Boolean).join(" · ");
const price = w => w.price ? "$" + Number(w.price).toLocaleString() : "Inquire";
const photo = (w, i = 0) => w.photos && w.photos[i]
  ? `<img src="${esc(w.photos[i])}" alt="${esc(title(w))}" loading="lazy">`
  : `<div class="soon"><img class="badge" src="assets/badge.webp?v=2" alt=""><span>Image coming soon</span></div>`;

const card = w => `
    <article class="card" data-i="${WATCHES.indexOf(w)}" tabindex="0">
      <div class="ph">${photo(w)}</div>
      <div class="info">
        <span class="brandname">${esc(w.brand)}</span>
        <span class="model">${esc(w.model)}</span>
        <span class="specs">${esc(specs(w))}</span>
        <span class="price">${price(w)}<small>Details &rsaquo;</small></span>
      </div>
    </article>`;
const soldCard = w => `
    <article class="card sold">
      <div class="ph">${photo(w)}<span class="soldtag">Sold</span></div>
      <div class="info">
        <span class="brandname">${esc(w.brand)}</span>
        <span class="model">${esc(w.model)}</span>
        <span class="specs">${esc(specs(w))}</span>
        <span class="price">${w.sold ? "Sold " + esc(new Date(w.sold + "-15T12:00:00").toLocaleDateString(undefined, {month: "long", year: "numeric"})) : "Sold"}</span>
      </div>
    </article>`;
const none = `<div class="empty"><h3>New pieces are on the way</h3><p>Follow <a href="${IG}" target="_blank" rel="noopener">@gfvault</a> for new arrivals, or tell us what you're looking for.</p><a class="btn navy" href="#sell" data-intent="Find a specific watch">Request a watch</a></div>`;

// Default: Brand A-Z (then model). Watches without photos sit at the bottom, except in the two newest sorts, which are exact.
let sortMode = "brand";
function sortWatches() {
  const has = w => (w.photos && w.photos.length) ? 1 : 0, pr = w => w.price || -1;
  const cmp = {
    brand: (a, b) => String(a.brand).localeCompare(String(b.brand)) || String(a.model).localeCompare(String(b.model)),
    high: (a, b) => pr(b) - pr(a) || String(a.brand).localeCompare(String(b.brand)),
    low: (a, b) => (pr(a) < 0) - (pr(b) < 0) || pr(a) - pr(b) || String(a.brand).localeCompare(String(b.brand)),
    new: (a, b) => String(b.stock).localeCompare(String(a.stock)),   // stock numbers are assigned in the order added
    year: (a, b) => (Number(b.year) || 0) - (Number(a.year) || 0) || String(b.stock).localeCompare(String(a.stock)),
  }[sortMode];
  const exact = sortMode === "new" || sortMode === "year";
  WATCHES.sort((a, b) => (exact ? 0 : has(b) - has(a)) || cmp(a, b));
}
$("#sort").addEventListener("change", e => { sortMode = e.target.value; sortWatches(); render(); });

function render() {
  // every typed word must appear somewhere; punctuation is ignored so "21030" finds 210.30...
  const norm = s => String(s).toLowerCase().replace(/[^a-z0-9 ]/g, "");
  const words = norm(query).split(" ").filter(Boolean);
  const list = WATCHES.filter(w => (brandFilter === "All" || w.brand === brandFilter) &&
    words.every(t => norm([w.brand, w.model, w.ref, w.year, w.dial && w.dial + " dial", w.set].filter(Boolean).join(" ")).includes(t)));
  const noMatch = `<div class="empty"><h3>No matches in stock</h3><p>Try another search, or tell us what you're looking for.</p><a class="btn navy" href="#sell" data-intent="Find a specific watch">Request a watch</a></div>`;
  $("#grid").innerHTML = list.length ? list.map(card).join("") : WATCHES.length ? noMatch : none;
  // photographed watches lead the homepage
  const feat = [...WATCHES].sort((a, b) => !!(b.photos || []).length - !!(a.photos || []).length).slice(0, 4);
  const ask = `<a class="askcard" href="#sell" data-intent="Find a specific watch"><b>Not seeing it?</b><span>Tell us what you want and we'll help source it.</span><em>Request a watch &rarr;</em></a>`;
  $("#featured").innerHTML = feat.length ? feat.map(card).join("") + (feat.length < 4 ? ask : "") : none;
}

function renderSold() {
  $("#soldgrid").innerHTML = SOLD.length ? SOLD.map(soldCard).join("") : `<p class="empty">No sold watches to show yet.</p>`;
  $("#homesold").hidden = !SOLD.length;
  $("#homesoldgrid").innerHTML = SOLD.slice(0, 4).map(soldCard).join("");
}

function filters() {
  const brands = ["All", ...new Set(WATCHES.map(w => w.brand).filter(Boolean))];
  $("#filters").innerHTML = brands.length > 2 ? brands.map(b => `<button class="${b === brandFilter ? "on" : ""}" data-b="${esc(b)}">${esc(b)}</button>`).join("") : "";
}
$("#search").addEventListener("input", e => { query = e.target.value; render(); });
$("#searchform").addEventListener("submit", e => { e.preventDefault(); $("#search").blur(); });
$("#filters").addEventListener("click", e => { const b = e.target.closest("button"); if (b) { brandFilter = b.dataset.b; filters(); render(); } });

function openWatch(w) {
  const pics = w.photos && w.photos.length ? w.photos.map(p => `<img src="${esc(p)}" alt="${esc(title(w))}">`).join("") : `<div class="soon big"><img class="badge" src="assets/badge.webp?v=2" alt=""><span>Image coming soon</span></div>`;
  const rows = [["Reference", w.ref], ["Year", w.year], ["Dial", w.dial], ["Condition", w.condition], ["Box & papers", w.set], ["Stock #", w.stock]]
    .filter(r => r[1]).map(r => `<tr><td>${r[0]}</td><td>${esc(r[1])}</td></tr>`).join("");
  const desc = w.description || `${title(w)}${w.year ? ", " + w.year : ""}${w.set ? ", " + w.set.toLowerCase() : ""}. Offered by GF Vault and shipped fully insured.`;
  $("#modal-body").innerHTML = `<div class="detail"><div class="gallery">${pics}</div><div class="dinfo">
    <span class="brandname">${esc(w.brand)}</span><h2>${esc(w.model)}</h2>
    <div class="price" style="padding:0;font-size:22px">${price(w)}</div>
    <p>${esc(desc)}</p><table>${rows}</table>
    <div class="actions"><a class="cta" href="#sell" data-ask="${WATCHES.indexOf(w)}">Ask about this watch</a><a class="cta ghost" href="${IG}" target="_blank" rel="noopener">DM @gfvault</a><a class="cta ghost" href="tel:+19015505800">Call (901) 550-5800</a></div>
  </div></div>`;
  $("#modal").hidden = false;
}
["#grid", "#featured"].forEach(id => {
$(id).addEventListener("click", e => { const c = e.target.closest(".card"); if (c) openWatch(WATCHES[c.dataset.i]); });
$(id).addEventListener("keydown", e => { const c = e.target.closest(".card"); if (c && e.key === "Enter") openWatch(WATCHES[c.dataset.i]); });
});
$("#modal").addEventListener("click", e => { if (e.target.id === "modal" || e.target.closest(".x")) $("#modal").hidden = true; });
document.addEventListener("keydown", e => { if (e.key === "Escape") $("#modal").hidden = true; });

const formNote = $("#formstatus").textContent;
function resetFormNote() { $("#formstatus").className = "fine"; $("#formstatus").textContent = formNote; }
$("#sellform").addEventListener("input", resetFormNote);

$("#sellform").addEventListener("submit", async e => {
  e.preventDefault();
  const form = e.target, btn = form.querySelector("button[type=submit]"), status = $("#formstatus");
  btn.disabled = true; btn.textContent = "Sending\u2026"; status.className = "fine";
  try {
    // a plain-text body keeps this a "simple" request, which Apps Script accepts from another site
    const r = await fetch(FEED_URL, {method: "POST", body: JSON.stringify(Object.fromEntries(new FormData(form))), signal: AbortSignal.timeout(20000)});
    if (!(await r.json()).ok) throw new Error("not sent");
    form.reset(); status.className = "fine sent";
    status.textContent = "Sent. Thanks \u2014 we'll be in touch soon.";
  } catch {
    status.className = "fine failed";
    status.textContent = "We couldn't confirm your inquiry was sent. Please call or text (901) 550-5800, or email gfvaultco@gmail.com.";
  }
  btn.disabled = false; btn.textContent = "Send inquiry";
});

// "Ask about this watch" opens the form already filled in
$("#modal").addEventListener("click", e => {
  const a = e.target.closest("[data-ask]");
  if (!a) return;
  const w = WATCHES[a.dataset.ask], f = $("#sellform").elements;
  f.intent.value = "Ask about a watch in stock"; f.brand.value = w.brand || ""; f.model.value = [w.model, w.ref].filter(Boolean).join(" ");
  f.year.value = w.year || ""; f.set.value = w.set || "Full set"; f.price.value = ""; f.notes.value = `Is this watch still available? (Stock ${w.stock})`;
  resetFormNote(); $("#modal").hidden = true;
});

function parseCSV(t) {
  const rows = []; let row = [], f = "", q = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (q) { if (c === '"') { if (t[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
    else if (c === '"') q = true; else if (c === ",") { row.push(f); f = ""; }
    else if (c === "\n" || c === "\r") { if (c === "\r" && t[i + 1] === "\n") i++; row.push(f); rows.push(row); row = []; f = ""; }
    else f += c;
  }
  if (f || row.length) { row.push(f); rows.push(row); }
  const head = rows.shift() || [];
  return rows.filter(r => r[0]).map(r => Object.fromEntries(head.map((h, i) => [h, r[i] || ""])));
}
function fromSheet(list) {
  return list.map(w => ({...w, year: w.year ? Number(w.year) : null,
    price: Number(String(w.price).replace(/[^0-9.]/g, "")) || null,
    photos: String(w.photos || "").split(/\s+/).filter(Boolean)}));
}
function show(watches, updated, sold) {
  WATCHES = [...watches]; sortWatches();
  SOLD = sold || []; renderSold();
  $("#updated").textContent = updated === "live" ? "Live inventory" : updated ? "Inventory updated " + updated : "";
  filters(); render();
}
const fallback = () => fetch("data/inventory.json", {cache: "no-store"}).then(r => r.json())
  .then(d => d.watches && d.watches.length ? d : Promise.reject())
  .then(d => show(d.watches, d.updated ? new Date(d.updated + "T12:00:00").toLocaleDateString(undefined, {month: "long", day: "numeric", year: "numeric"}) : ""))
  .catch(() => { $("#grid").innerHTML = $("#featured").innerHTML = `<p class="empty">We couldn't load the inventory. Refresh the page, or DM <a href="${IG}">@gfvault</a> to see what's available.</p>`; $("#soldgrid").innerHTML = `<p class="empty">We couldn't load sold watches. Please refresh the page.</p>`; });
if (FEED_URL) fetch(FEED_URL + "?feed=1&t=" + Date.now()).then(r => r.ok ? r.json() : Promise.reject())
  .then(d => show(d.watches || [], "live", d.sold)).catch(fallback);
else fallback();
route();
