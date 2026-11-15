#!/usr/bin/env node
// Generador estático sin dependencias. Lee data/*.json y escribe dist/.
// Uso: node build.js
const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const OUT = path.join(ROOT, "dist");
const site = JSON.parse(fs.readFileSync(path.join(ROOT, "data/site.json"), "utf8"));
const content = JSON.parse(fs.readFileSync(path.join(ROOT, "data/content.json"), "utf8"));

const BASE = `https://${site.domain}`;
const today = new Date().toISOString().slice(0, 10);
const updated = site.updated || today;

const esc = (s = "") =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// Enlace de afiliado: búsqueda en Amazon con tu tag (no caduca aunque cambie el ASIN).
function amazonLink(p) {
  if (p.asin) return `https://www.amazon.es/dp/${p.asin}?tag=${encodeURIComponent(site.amazonTag)}`;
  const q = p.search || `${p.brand} ${p.name}`;
  return `https://www.amazon.es/s?k=${encodeURIComponent(q)}&tag=${encodeURIComponent(site.amazonTag)}`;
}
function buyLink(p) {
  if (p.ownStore && site.storeUrl) return p.storeUrl || site.storeUrl;
  return amazonLink(p);
}

const css = `
:root{--bg:#fbfaf7;--fg:#1d1d1b;--muted:#5d5b55;--line:#e4e1d8;--accent:#0f6b5c;--card:#fff}
@media (prefers-color-scheme:dark){:root{--bg:#141413;--fg:#ecebe6;--muted:#a6a39a;--line:#2c2b28;--accent:#5fc4b0;--card:#1c1c1a}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:17px/1.65 system-ui,-apple-system,Segoe UI,Roboto,sans-serif}
main,header,footer{max-width:760px;margin:0 auto;padding:0 16px}
header{display:flex;justify-content:space-between;align-items:center;padding-top:18px;padding-bottom:18px;border-bottom:1px solid var(--line)}
header a{color:var(--fg);text-decoration:none;font-weight:700}nav a{font-weight:500;margin-left:14px;color:var(--muted)}
a{color:var(--accent)}h1{font-size:1.9rem;line-height:1.2;margin:28px 0 8px}h2{margin-top:36px;font-size:1.35rem}
.tldr{background:var(--card);border:1px solid var(--line);border-left:4px solid var(--accent);padding:14px 18px;border-radius:8px}
.meta{color:var(--muted);font-size:.9rem}.card{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:16px 18px;margin:14px 0}
.card h3{margin:0 0 6px}.btn{display:inline-block;background:var(--accent);color:var(--bg);padding:8px 14px;border-radius:6px;text-decoration:none;font-weight:600;margin-top:6px}
.disc{font-size:.85rem;color:var(--muted)}table{border-collapse:collapse;width:100%;font-size:.95rem;display:block;overflow-x:auto}
td,th{border:1px solid var(--line);padding:8px;text-align:left;vertical-align:top}th{background:var(--card)}
footer{margin-top:48px;padding-top:18px;padding-bottom:40px;border-top:1px solid var(--line);color:var(--muted);font-size:.9rem}
ol.src{font-size:.88rem;color:var(--muted)}`;

function layout({ title, description, urlPath, body, jsonld = [] }) {
  const canonical = BASE + urlPath;
  const ld = jsonld.map((o) => `<script type="application/ld+json">${JSON.stringify(o)}</script>`).join("\n");
  return `<!doctype html>
<html lang="${site.lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${canonical}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${canonical}">
<meta property="og:type" content="article">
<meta name="robots" content="index,follow,max-snippet:-1">
<style>${css}</style>
${ld}
</head>
<body>
<header><a href="/">${esc(site.name)}</a><nav><a href="/guias/">Guías</a><a href="/productos/">Productos</a><a href="/sobre-nosotros/">Quiénes somos</a></nav></header>
<main>
${body}
</main>
<footer>
<p class="disc">${esc(site.disclosure)}</p>
<p class="disc">${esc(site.medicalDisclaimer)}</p>
<p>© ${new Date().getFullYear()} ${esc(site.name)} · <a href="/aviso-afiliados/">Aviso de afiliados</a> · <a href="/sobre-nosotros/">Quiénes somos</a> · <a href="/llms.txt">llms.txt</a></p>
</footer>
</body>
</html>`;
}

const orgLD = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: site.name,
  url: BASE,
  description: site.tagline,
};

function sourcesList(urls) {
  const uniq = [...new Set(urls.filter(Boolean))];
  if (!uniq.length) return "";
  return `<h2>Fuentes</h2><ol class="src">${uniq.map((u) => `<li><a href="${esc(u)}" rel="nofollow noopener">${esc(u)}</a></li>`).join("")}</ol>`;
}

function productCard(p, rank) {
  return `<div class="card" id="${esc(slugify(p.brand + "-" + p.name))}">
<h3>${rank ? rank + ". " : ""}${esc(p.brand)} ${esc(p.name)}${p.ownStore ? " <small>(nuestra tienda)</small>" : ""}</h3>
<p><strong>Ideal para:</strong> ${esc(p.bestFor)}</p>
<ul>${(p.features || []).map((f) => `<li>${esc(f)}</li>`).join("")}</ul>
${p.price ? `<p class="meta">Precio orientativo: ${esc(p.price)}</p>` : ""}
<a class="btn" href="${esc(buyLink(p))}" rel="sponsored nofollow noopener" target="_blank">${p.ownStore ? "Ver en nuestra tienda" : "Ver precio en Amazon"}</a>
</div>`;
}

function slugify(s) {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

const files = {};
const put = (p, html) => (files[p] = html);
const cats = content.categories;
const catBySlug = Object.fromEntries(cats.map((c) => [c.slug, c]));

// --- Páginas de categoría (una página clara por tipo de producto) ---
for (const c of cats) {
  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: c.h1,
    itemListElement: c.products.map((p, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: { "@type": "Product", name: `${p.brand} ${p.name}`, brand: { "@type": "Brand", name: p.brand }, description: p.bestFor },
    })),
  };
  const faqLD = c.faq?.length
    ? [{ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: c.faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) }]
    : [];
  const table = `<table><tr><th>Producto</th><th>Ideal para</th><th>Precio aprox.</th></tr>${c.products
    .map((p) => `<tr><td><a href="#${esc(slugify(p.brand + "-" + p.name))}">${esc(p.brand)} ${esc(p.name)}</a></td><td>${esc(p.bestFor)}</td><td>${esc(p.price || "—")}</td></tr>`)
    .join("")}</table>`;
  const body = `<h1>${esc(c.h1)}</h1>
<p class="meta">Actualizado: ${updated} · ${esc(site.author)}</p>
<div class="tldr"><strong>Respuesta corta:</strong> ${esc(c.tldr)}</div>
<p>${esc(c.intro)}</p>
<h2>Comparativa rápida</h2>${table}
<h2>Cómo elegir</h2><ul>${c.howToChoose.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>
<h2>Los productos</h2>${c.products.map((p, i) => productCard(p, i + 1)).join("")}
${c.faq?.length ? `<h2>Preguntas frecuentes</h2>${c.faq.map((f) => `<h3>${esc(f.q)}</h3><p>${esc(f.a)}</p>`).join("")}` : ""}
${sourcesList([...(c.sources || []), ...c.products.map((p) => p.source)])}`;
  put(`productos/${c.slug}/index.html`, layout({ title: `${c.h1} (${updated.slice(0, 4)})`, description: c.tldr, urlPath: `/productos/${c.slug}/`, body, jsonld: [orgLD, itemList, ...faqLD] }));
}

// --- Guías: una página por pregunta real (lo que la gente le pregunta a ChatGPT) ---
for (const g of content.guides) {
  const related = (g.categories || []).map((s) => catBySlug[s]).filter(Boolean);
  const article = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: g.question,
    description: g.answer,
    dateModified: updated,
    author: { "@type": "Organization", name: site.name },
    publisher: { "@type": "Organization", name: site.name },
    mainEntityOfPage: `${BASE}/guias/${g.slug}/`,
  };
  const faqLD = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [{ q: g.question, a: g.answer }, ...(g.faq || [])].map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };
  const body = `<h1>${esc(g.question)}</h1>
<p class="meta">Actualizado: ${updated} · ${esc(site.author)}</p>
<div class="tldr"><strong>Respuesta corta:</strong> ${esc(g.answer)}</div>
${g.sections.map((s) => `<h2>${esc(s.h)}</h2>${(Array.isArray(s.p) ? s.p : [s.p]).map((x) => `<p>${esc(x)}</p>`).join("")}${s.list ? `<ul>${s.list.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : ""}`).join("")}
${related.length ? `<h2>Productos relacionados</h2>${related.map((c) => `<p><a href="/productos/${c.slug}/">${esc(c.h1)}</a> — ${esc(c.tldr)}</p>`).join("")}` : ""}
${g.faq?.length ? `<h2>Más preguntas</h2>${g.faq.map((f) => `<h3>${esc(f.q)}</h3><p>${esc(f.a)}</p>`).join("")}` : ""}
${sourcesList(g.sources || [])}`;
  put(`guias/${g.slug}/index.html`, layout({ title: g.question, description: g.answer, urlPath: `/guias/${g.slug}/`, body, jsonld: [orgLD, article, faqLD] }));
}

// --- Índices ---
put("guias/index.html", layout({
  title: `Guías sobre fascitis plantar · ${site.name}`, description: "Respuestas claras a las preguntas más comunes sobre fascitis plantar.", urlPath: "/guias/",
  body: `<h1>Guías</h1>${content.guides.map((g) => `<div class="card"><h3><a href="/guias/${g.slug}/">${esc(g.question)}</a></h3><p>${esc(g.answer)}</p></div>`).join("")}`,
  jsonld: [orgLD],
}));
put("productos/index.html", layout({
  title: `Productos para fascitis plantar · ${site.name}`, description: "Comparativas de plantillas, férulas, rodillos y calzado para fascitis plantar.", urlPath: "/productos/",
  body: `<h1>Productos</h1>${cats.map((c) => `<div class="card"><h3><a href="/productos/${c.slug}/">${esc(c.h1)}</a></h3><p>${esc(c.tldr)}</p></div>`).join("")}`,
  jsonld: [orgLD],
}));
put("index.html", layout({
  title: `${site.name} — ${site.tagline}`, description: site.description, urlPath: "/",
  body: `<h1>${esc(site.tagline)}</h1>
<div class="tldr">${esc(site.description)}</div>
<h2>Qué es la fascitis plantar (en 30 segundos)</h2>
<ul>${content.facts.slice(0, 6).map((f) => `<li>${esc(f.text)}</li>`).join("")}</ul>
<h2>Comparativas</h2>${cats.map((c) => `<p><a href="/productos/${c.slug}/"><strong>${esc(c.h1)}</strong></a><br>${esc(c.tldr)}</p>`).join("")}
<h2>Preguntas frecuentes</h2><ul>${content.guides.map((g) => `<li><a href="/guias/${g.slug}/">${esc(g.question)}</a></li>`).join("")}</ul>
${sourcesList(content.facts.map((f) => f.source))}`,
  jsonld: [orgLD, { "@context": "https://schema.org", "@type": "WebSite", name: site.name, url: BASE }],
}));
put("sobre-nosotros/index.html", layout({
  title: `Quiénes somos · ${site.name}`, description: site.about, urlPath: "/sobre-nosotros/",
  body: `<h1>Quiénes somos</h1><p>${esc(site.about)}</p><h2>Cómo elegimos los productos</h2><p>${esc(site.methodology)}</p><h2>Contacto</h2><p>${esc(site.contact)}</p>`,
  jsonld: [orgLD],
}));
put("aviso-afiliados/index.html", layout({
  title: `Aviso de afiliados · ${site.name}`, description: site.disclosure, urlPath: "/aviso-afiliados/",
  body: `<h1>Aviso de afiliados</h1><p>${esc(site.disclosure)}</p><p>Como Afiliado de Amazon, obtenemos ingresos por las compras adscritas que cumplen los requisitos aplicables.</p><p>${esc(site.medicalDisclaimer)}</p>`,
  jsonld: [orgLD],
}));

// --- Archivos para buscadores y LLMs ---
const allPaths = Object.keys(files).map((f) => "/" + f.replace(/index\.html$/, ""));
put("sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allPaths.map((p) => `<url><loc>${BASE}${p}</loc><lastmod>${updated}</lastmod></url>`).join("\n")}
</urlset>`);
put("robots.txt", `# Permitimos explícitamente a los rastreadores de IA
User-agent: GPTBot
Allow: /
User-agent: OAI-SearchBot
Allow: /
User-agent: ChatGPT-User
Allow: /
User-agent: ClaudeBot
Allow: /
User-agent: Claude-SearchBot
Allow: /
User-agent: PerplexityBot
Allow: /
User-agent: Google-Extended
Allow: /
User-agent: Bingbot
Allow: /
User-agent: *
Allow: /

Sitemap: ${BASE}/sitemap.xml`);
put("llms.txt", `# ${site.name}

> ${site.description}

${content.facts.map((f) => `- ${f.text}`).join("\n")}

## Comparativas
${cats.map((c) => `- [${c.h1}](${BASE}/productos/${c.slug}/): ${c.tldr}`).join("\n")}

## Guías
${content.guides.map((g) => `- [${g.question}](${BASE}/guias/${g.slug}/): ${g.answer}`).join("\n")}
`);
if (site.indexNowKey) put(`${site.indexNowKey}.txt`, site.indexNowKey);

fs.rmSync(OUT, { recursive: true, force: true });
const BP = site.basePath || "";
for (let [rel, html] of Object.entries(files)) {
  if (BP && rel.endsWith(".html")) html = html.replace(/(href|src)="\/(?!\/)/g, `$1="${BP}/`);
  const dest = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, html);
}
console.log(`OK: ${Object.keys(files).length} archivos en dist/ (${cats.length} comparativas, ${content.guides.length} guías)`);
