// 公開用ビルド: スプレッドシートの内容から、検索エンジンが読める固定ページを作ります。
import fs from "node:fs";
import vm from "node:vm";

const OWNER = process.env.OWNER || "user";
const REPO = process.env.REPO || "repo";
const SITE = (process.env.SITE_URL || (REPO.endsWith(".github.io") ? `https://${REPO}/` : `https://${OWNER}.github.io/${REPO}/`)).replace(/\/?$/, "/");
const BASE = new URL(SITE).pathname;
const NAME = "ほしいものガイド";
const esc = s => String(s).replace(/[&<>"']/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));

let html = fs.readFileSync("index.html", "utf8");
let code = html.match(/<script>([\s\S]*)<\/script>/)[1];
if (process.env.SHEET_CSV_URL) code = code.replace(/const SHEET_CSV_URL = ".*?";/, `const SHEET_CSV_URL = ${JSON.stringify(process.env.SHEET_CSV_URL)};`);
code = code.slice(0, code.lastIndexOf("load().then")) + "globalThis.__api={load,route,items:()=>ITEMS,hasSheet:()=>!!SHEET_CSV_URL,loaded:()=>LOADED};";

const els = {};
const el = id => (els[id] ??= { innerHTML: "", textContent: "", href: "", hasAttribute: () => false, addEventListener() {} });
const document = { title: "", getElementById: el };
const location = { hash: "" };
const window = { scrollTo() {}, addEventListener() {} };
const myFetch = async u => u.startsWith("file:") ? { ok: true, status: 200, text: async () => fs.readFileSync(new URL(u), "utf8") } : fetch(u);
const ctx = vm.createContext({ document, location, window, fetch: myFetch, console });
vm.runInContext(code, ctx);
const api = ctx.__api;
await api.load();
if (api.hasSheet() && !api.loaded()) {
  console.error("スプレッドシートを読み込めませんでした。前回のサイトを残すため、作り直しを中止します。");
  process.exit(1);
}
const items = api.items();
if (api.hasSheet() && items.length === 0) {
  console.error("スプレッドシートから商品を1件も読み取れませんでした。前回のサイトを残すため、作り直しを中止します。");
  process.exit(1);
}
const live = api.hasSheet() && items.length > 0;
const idList = live ? items.map(i => i.id.slice(1)).join(",") : "";
const preData = live ? `<script>window.__PRE=${JSON.stringify(items.map(i => ({ id: i.id, title: i.title, text: i.text, codeLink: i.codeLink, codeImg: i.codeImg, cat: i.cat, catManual: i.catManual }))).replace(/</g, "\\u003c")};</script>` : "";
const year = new Date().getFullYear();
const today = new Date().toISOString().slice(0, 10);
html = html.replace('<span id="yr">2026</span>', `<span id="yr">${year}</span>`);

function render({ hash, url, title, desc, img, extra = "", itemId = "" }) {
  location.hash = hash; api.route();
  const main = el("app").innerHTML;
  const head = `<meta name="description" content="${esc(desc)}"><link rel="canonical" href="${url}"><meta property="og:type" content="website"><meta property="og:site_name" content="${NAME}"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:url" content="${url}">${img ? `<meta property="og:image" content="${esc(img)}">` : ""}<meta name="twitter:card" content="summary">${extra}`;
  let out = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(title)}</title>`)
    .replace(/<meta name="description"[^>]*>/, "")
    .replace("</head>", head + "</head>")
    .replace("<script>", preData + "<script>")
    .replace('<main id="app"></main>', `<main id="app" data-pre data-base="${BASE}" data-ids="${idList}"${itemId ? ` data-item="${itemId}"` : ""}>${main}</main>`);
  if (!live) out = out.replace(/<meta name="robots"[^>]*>/, '<meta name="robots" content="noindex">');
  return out
    .replace(/href="#\/item\/i(\d+)"/g, (_, n) => `href="${BASE}item/${n}/"`)
    .replace(/href="#\/(about|privacy|contact|cat\/\d+)"/g, (_, p) => `href="${BASE}#/${p}"`)
    .replace(/href="#\/"/g, `href="${BASE}"`)
    .replace(/href="(favicon[^"]*|apple-touch-icon\.png)"/g, (_, f) => `href="${BASE}${f}"`);
}

fs.rmSync("dist", { recursive: true, force: true });
fs.mkdirSync("dist", { recursive: true });
fs.writeFileSync("dist/.nojekyll", "");
for (const f of ["favicon.svg", "favicon-192.png", "favicon.ico", "apple-touch-icon.png"]) if (fs.existsSync(f)) fs.copyFileSync(f, `dist/${f}`);
const homeDesc = "楽天市場のおすすめ商品を紹介する「ほしいものガイド」。気になる見出しをタップすると、くわしい紹介が見られます。";
const jld = o => `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, "\\u003c")}</script>`;
const ld = jld({ "@context": "https://schema.org", "@type": "WebSite", name: NAME, url: SITE, inLanguage: "ja" });
const ldItem = (it, url, desc, img) => jld({ "@context": "https://schema.org", "@graph": [
  { "@type": "WebPage", "@id": url, url, name: it.title, headline: it.title, description: desc, inLanguage: "ja", dateModified: today, isPartOf: { "@type": "WebSite", name: NAME, url: SITE }, ...(img ? { primaryImageOfPage: { "@type": "ImageObject", url: img } } : {}) },
  { "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "ホーム", item: SITE }, { "@type": "ListItem", position: 2, name: it.title, item: url }] }
] });
fs.writeFileSync("dist/index.html", render({ hash: "#/", url: SITE, title: NAME, desc: homeDesc, img: items[0]?.img?.startsWith("http") ? items[0].img : "", extra: ld }));

const urls = [SITE];
if (live) for (const it of items) {
  const n = it.id.slice(1), url = `${SITE}item/${n}/`;
  fs.mkdirSync(`dist/item/${n}`, { recursive: true });
  fs.writeFileSync(`dist/item/${n}/index.html`, render({
    hash: `#/item/${it.id}`, itemId: it.id, url, title: `${it.title}｜${NAME}`,
    desc: it.text.replace(/\s+/g, " ").trim().slice(0, 110) || homeDesc,
    img: it.img?.startsWith("http") ? it.img : "",
    extra: ldItem(it, url, it.text.replace(/\s+/g, " ").trim().slice(0, 110) || homeDesc, it.img?.startsWith("http") ? it.img : "")
  }));
  urls.push(url);
}
if (live) {
  fs.writeFileSync("dist/sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(u => `<url><loc>${u}</loc><lastmod>${today}</lastmod></url>`).join("\n")}\n</urlset>\n`);
  fs.writeFileSync("dist/robots.txt", `User-agent: *\nAllow: /\nSitemap: ${SITE}sitemap.xml\n`);
}
console.log(`built: ${urls.length} pages, live=${live}, site=${SITE}`);
