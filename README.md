# TalónLibre: web de afiliados con GEO (fascitis plantar)

Idea sacada del experimento de @bowtiedbills: ChatGPT recomienda lo que encuentra explicado
en una página clara. Aquí la página no es de una marca falsa, sino de **comparativas honestas de productos reales**
con enlaces de afiliado de Amazon.es. La fase 2 es una tienda de dropshipping (ver `dropshipping/PLAN.md`).

## Por qué este nicho
- La gente hace preguntas muy concretas ("¿funciona la férula nocturna?", "plantillas para fascitis plantar").
- Hay pocas páginas claras en español con fuentes médicas.
- Hay productos de 20 a 120 € y se suele comprar más de uno (plantilla + férula + rodillo).

## Qué hay
- `data/site.json`: nombre, dominio, **tag de Amazon**, textos legales.
- `data/content.json`: datos médicos con fuente, 5 comparativas y 8 guías (una por pregunta).
- `build.js`: genera `dist/` sin dependencias. Cada página tiene:
  - respuesta corta al principio, que es lo que los LLM citan;
  - datos estructurados JSON-LD (Article, FAQPage, ItemList);
  - fuentes citadas.

  También genera `sitemap.xml`, un `robots.txt` que permite GPTBot, OAI-SearchBot, ClaudeBot y PerplexityBot,
  y un `llms.txt`.
- `ping-indexnow.js`: avisa a Bing de las URLs. ChatGPT Search usa el índice de Bing.

## Lanzamiento (en este orden)
1. **Amazon Afiliados España**: date de alta en https://afiliados.amazon.es. Pon tu ID (termina en `-21`) en
   `amazonTag` dentro de `data/site.json`. Tienes que hacer 3 ventas en 180 días o te cierran la cuenta.
   Amazon pide que la web ya exista, así que publícala antes de darte de alta.
2. **Dominio**: compra `talonlibre.es` (o el que quieras) y cambia `domain` en `site.json`.
3. **Compila**: `node build.js`
4. **Publica gratis en Cloudflare Pages**:
   `npx wrangler pages deploy dist --project-name talonlibre`. Después conecta el dominio desde el panel.
5. **Indexación**:
   - da de alta la web en Bing Webmaster Tools (lo más importante para ChatGPT) y en Google Search Console;
   - envía el sitemap a las dos;
   - ejecuta `node ping-indexnow.js`.
6. **Una mención externa**, como el post de Substack del experimento: escribe un artículo en Substack o Medium
   (y una respuesta útil en Reddit o en un foro de running) que enlace a la guía principal. Sin spam.
7. **Mide a las 3 semanas**: pregunta en ChatGPT (con búsqueda activada), Perplexity y Google AI Mode:
   - "¿Cuál es la mejor férula nocturna para la fascitis plantar en España?"
   - "¿Qué plantillas para la fascitis plantar recomiendas?"
   - "¿Rodar una botella congelada alivia la fascitis plantar?"

   Apunta si citan la web, y revisa los clics en el panel de Amazon.

## Mantenerlo
- Antes de publicar, comprueba en Amazon.es que cada producto existe y que el precio orientativo sigue valiendo.
  Si un producto tiene ASIN fijo, añade `"asin": "B0..."` y el enlace irá directo a su ficha;
  si no, el enlace lleva a una búsqueda en Amazon con tu tag.
- Para añadir una guía, añade un objeto a `guides` en `content.json` y recompila.
  Una pregunta real = una página.
- Actualiza `updated` cuando revises el contenido. Los LLM prefieren lo reciente.

## Límites (léelos)
- No inventes reseñas ni testimonios, y no digas que has probado lo que no has probado.
  Lo prohíben Amazon y la ley de consumidores, y si te pillan pierdes la cuenta de afiliado.
- Es contenido de salud: mantén los avisos médicos y las fuentes.
- No prometo tráfico ni ventas. El experimento del tweet mide si ChatGPT te nombra, no si alguien compra.
