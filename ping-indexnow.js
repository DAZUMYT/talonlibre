// Avisa a Bing/Yandex (IndexNow) de todas las URLs del sitemap. ChatGPT Search usa el índice de Bing.
// Uso: node ping-indexnow.js   (tras desplegar dist/)
const fs = require("fs");
const site = require("./data/site.json");
const urls = [...fs.readFileSync("dist/sitemap.xml", "utf8").matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1]);
fetch("https://api.indexnow.org/indexnow", {
  method: "POST",
  headers: { "Content-Type": "application/json; charset=utf-8" },
  body: JSON.stringify({ host: site.domain.split("/")[0], key: site.indexNowKey, keyLocation: `https://${site.domain}/${site.indexNowKey}.txt`, urlList: urls }),
}).then((r) => console.log("IndexNow:", r.status, urls.length, "URLs"));
