# Dropshipping — fase 2 (TalónLibre)

**Orden:** primero la web de afiliados (fase 1). La tienda solo se abre cuando la web reciba tráfico
y ChatGPT/Perplexity ya la citen, porque la tienda vive de ese tráfico.

## Qué vender (y qué NO)

| Producto | ¿Vender? | Por qué |
|---|---|---|
| Rodillo de frío + pelota de masaje | **Sí** | Producto de masaje/bienestar, sin finalidad médica. |
| Pelotas de pinchos | **Sí** | Igual. Coste muy bajo, buen margen. |
| Férulas nocturnas, plantillas "para fascitis", taloneras ortopédicas | **No, de momento** | Si las vendes con finalidad médica son producto sanitario clase I (Reglamento UE 2017/745 y RD 192/2023, AEMPS). Con tu marca pasas a ser el fabricante: marcado CE, documentación técnica, UDI, registro en EUDAMED. Casi ningún proveedor de AliExpress/CJ entrega esa documentación. Para estos, usa el enlace de afiliado a marcas que ya cumplen (Orliman, Scholl, FUTURO…). |

Reglas para las fichas: **cero promesas médicas** ("cura", "trata la fascitis", "alivia el espolón").
Habla de masaje, relajación y descanso. Si dudas, consulta a un experto en regulación sanitaria antes de publicar.

## Pasos

1. Proveedor: busca "frozen foot massage roller" y "spiky massage ball" en CJdropshipping (tiene almacén en la UE,
   lo que evita aduanas y envíos de 3 semanas). Pide una muestra y comprueba calidad, plazo y etiqueta CE
   general (seguridad de producto, Reglamento UE 2023/988 GPSR: el responsable en la UE tiene que figurar en el producto).
2. Shopify (plan Basic) en `tienda.talonlibre.es`. Importa `shopify-productos.csv`
   (Productos → Importar). Los productos entran como borrador: añade fotos, el coste real y la conexión con la app de CJ.
3. Precio: coste del proveedor + envío ×2,5 como mínimo (las devoluciones y la publicidad se comen el margen).
4. Legal en España: alta de autónomo o sociedad, aviso legal, política de privacidad y cookies, condiciones de venta,
   **14 días de desistimiento**, garantía legal de 3 años (la asumes tú, no el proveedor), IVA 21%.
5. Conecta con la web: en `data/site.json` pon `"storeUrl": "https://tienda.talonlibre.es"` y en `data/content.json`
   añade a la categoría de rodillos un producto con `"ownStore": true`. La web lo marca como "(nuestra tienda)".
   Tiene que quedar claro que es tuyo, tanto para el lector como para que la comparativa siga siendo creíble.
