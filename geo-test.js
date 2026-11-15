// Prueba GEO con OpenRouter (necesita OPENROUTER_API_KEY).
//   node geo-test.js baseline   -> pregunta al modelo CON búsqueda web real: qué cita y si aparece nuestro dominio
//   node geo-test.js sim        -> simulación: le damos nuestra página + las páginas que cita hoy, mezcladas,
//                                  y miramos si elige la nuestra (proxy de "¿nos citaría si nos encuentra?")
// Resultados en results/<modo>-<fecha>.json
const fs = require("fs");
const path = require("path");
const site = require("./data/site.json");
const content = require("./data/content.json");

const KEY = process.env.OPENROUTER_API_KEY;
const MODEL = process.env.GEO_MODEL || "openai/gpt-chat-latest";
const RUNS = Number(process.env.GEO_RUNS || 3);
if (!KEY) throw new Error("Falta OPENROUTER_API_KEY");

// pregunta -> página nuestra que debería responderla
const TESTS = [
  { q: "¿Cuál es la mejor férula nocturna para la fascitis plantar que pueda comprar en España?", page: "productos/mejor-ferula-nocturna-fascitis-plantar" },
  { q: "¿Qué plantillas para la fascitis plantar me recomiendas? Vivo en España.", page: "productos/mejores-plantillas-fascitis-plantar" },
  { q: "¿Funciona de verdad la férula nocturna para la fascitis plantar?", page: "guias/ferula-nocturna-fascitis-plantar-funciona" },
  { q: "¿Rodar una botella congelada alivia la fascitis plantar?", page: "guias/botella-congelada-fascitis-plantar" },
  { q: "¿Qué zapatillas son mejores para la fascitis plantar?", page: "productos/mejores-zapatillas-fascitis-plantar" },
];

const brands = [...new Set(content.categories.flatMap((c) => c.products.map((p) => p.brand)))];

async function chat(messages, { web = false } = {}) {
  const body = { model: MODEL, messages };
  if (web) body.plugins = [{ id: "web", max_results: 6 }];
  const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(JSON.stringify(j));
  const msg = j.choices[0].message;
  const cites = (msg.annotations || []).filter((a) => a.type === "url_citation").map((a) => a.url_citation.url);
  return { text: msg.content || "", cites: [...new Set(cites)], cost: j.usage?.cost };
}

const htmlToText = (h) =>
  h.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<nav[\s\S]*?<\/nav>|<footer[\s\S]*?<\/footer>/gi, " ")
    .replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();

async function fetchText(url) {
  try {
    const r = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" }, signal: AbortSignal.timeout(15000) });
    if (!r.ok) return null;
    const t = htmlToText(await r.text());
    return t.length > 500 ? t.slice(0, 6000) : null;
  } catch { return null; }
}

const mentioned = (text) => brands.filter((b) => text.toLowerCase().includes(b.toLowerCase().split(" ")[0]));
const shuffle = (a) => a.map((x) => [Math.random(), x]).sort((p, q) => p[0] - q[0]).map((p) => p[1]);

async function baseline() {
  const out = [];
  for (const t of TESTS) {
    const r = await chat([{ role: "user", content: t.q }], { web: true });
    const ours = r.cites.some((u) => u.includes(site.domain)) || r.text.includes(site.domain);
    out.push({ q: t.q, citaNuestraWeb: ours, citas: r.cites, marcasNuestras: mentioned(r.text), respuesta: r.text, coste: r.cost });
    console.log(`\n[${ours ? "SÍ" : "no"}] ${t.q}\n  citas: ${r.cites.join(" | ") || "(ninguna)"}`);
  }
  return out;
}

async function sim() {
  const base = JSON.parse(fs.readFileSync(latest("baseline"), "utf8"));
  const out = [];
  for (const t of TESTS) {
    const ourUrl = `https://${site.domain}/${t.page}/`;
    const ourText = htmlToText(fs.readFileSync(path.join("dist", t.page, "index.html"), "utf8")).slice(0, 6000);
    const compUrls = (base.find((b) => b.q === t.q)?.citas || []).filter((u) => !u.includes(site.domain)).slice(0, 5);
    const comps = [];
    for (const u of compUrls) { const tx = await fetchText(u); if (tx) comps.push({ url: u, text: tx }); }
    let wins = 0, total = 0;
    const runs = [];
    for (let i = 0; i < RUNS; i++) {
      const docs = shuffle([{ url: ourUrl, text: ourText }, ...comps]);
      const ctx = docs.map((d, k) => `[${k + 1}] ${d.url}\n${d.text}`).join("\n\n---\n\n");
      const r = await chat([
        { role: "system", content: "Eres un asistente con búsqueda web. Estos son los resultados de búsqueda para la pregunta del usuario. Responde en español, recomienda productos concretos si procede y cita las fuentes que uses con su URL." },
        { role: "user", content: `Resultados de búsqueda:\n\n${ctx}\n\nPregunta: ${t.q}` },
      ]);
      const cited = r.text.includes(site.domain);
      total++; if (cited) wins++;
      runs.push({ citaNuestraWeb: cited, posicionNuestra: docs.findIndex((d) => d.url === ourUrl) + 1, marcasNuestras: mentioned(r.text), respuesta: r.text });
    }
    out.push({ q: t.q, competidores: comps.map((c) => c.url), citadoEn: `${wins}/${total}`, runs });
    console.log(`\n${t.q}\n  nos cita en ${wins}/${total} respuestas · competidores en contexto: ${comps.length}`);
  }
  return out;
}

function latest(mode) {
  const f = fs.readdirSync("results").filter((x) => x.startsWith(mode)).sort().pop();
  if (!f) throw new Error(`Primero ejecuta: node geo-test.js ${mode}`);
  return path.join("results", f);
}

(async () => {
  const mode = process.argv[2] || "baseline";
  fs.mkdirSync("results", { recursive: true });
  const res = mode === "sim" ? await sim() : await baseline();
  const file = `results/${mode}-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
  fs.writeFileSync(file, JSON.stringify({ model: MODEL, fecha: new Date().toISOString(), res }, null, 2));
  console.log(`\nGuardado en ${file}`);
})();
