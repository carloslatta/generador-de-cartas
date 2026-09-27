// build-cards-index.js  →  node build-cards-index.js [ruta/cardinfo.json] [--offline]
// Construye cards.json (índice local de cartas) a partir de un volcado de la API de
// YGOPRODeck. El volcado es un JSON con {data:[...]}; si no se pasa ruta, se pagina
// la API. Es idempotente: se puede re-ejecutar cuando salga un set nuevo.
//
// Por cada carta guarda lo necesario para ARMARLA SIN RED:
//   id, name_en, name_es, type, humanReadableCardType, frameType, race, attribute,
//   level, atk, def, link, linkmarkers, scale, archetype, img
//
// El texto de efecto NO va aquí: pesa demasiado (8,3 MB) y solo existe en inglés.
// Lo sigue trayendo la red (YGOPRODeck/Yugipedia) como hasta ahora.
//
// `name_es` sale de db.ygoresources.com (índices es/en unidos por id interno).
// Con --offline se reutiliza el name_es del cards.json anterior en vez de la red.
const BASE = "https://db.ygoprodeck.com/api/v7/cardinfo.php";
const fs = require("fs");
const path = require("path");

const UA = { headers: { "User-Agent": "YGODeckGenerator/1.0" } };

const args = process.argv.slice(2);
const offline = args.indexOf("--offline") !== -1;
const dumpPath = args.filter((a) => a.charAt(0) !== "-")[0];

// Nombre en español desde el cards.json anterior (offline).
function esDelIndiceAnterior() {
  const mapa = {};
  try {
    const previo = JSON.parse(fs.readFileSync("cards.json", "utf8"));
    (previo.cards || []).forEach((c) => {
      const es = c.name_es || c.es;
      if (es && c.name) { mapa[c.name] = es; }
    });
  } catch (e) {
    console.log("sin cards.json previo:", e.code || e.message);
  }
  return mapa;
}

// Devuelve nameEs(nameEn) -> nombre en español ("" si no se sabe).
// Unión: EN: nameEn -> [idInterno]; reverse(ES: nameEs -> [idInterno]).
async function cargadorTraduccionES() {
  const [esIdx, enIdx] = await Promise.all([
    fetch("https://db.ygoresources.com/data/idx/card/name/es", UA).then((r) => r.text()),
    fetch("https://db.ygoresources.com/data/idx/card/name/en", UA).then((r) => r.text())
  ]);
  const ES = JSON.parse(esIdx);
  const EN = JSON.parse(enIdx);
  const idAEs = {};
  Object.keys(ES).forEach(function (nameEs) {
    (ES[nameEs] || []).forEach(function (id) { if (!idAEs[id]) idAEs[id] = nameEs; });
  });
  const cache = {};
  return function (nameEn) {
    if (nameEn in cache) return cache[nameEn];
    let es = "";
    (EN[nameEn] || []).some(function (id) {
      if (idAEs[id]) { es = idAEs[id]; return true; }
      return false;
    });
    cache[nameEn] = es;
    return es;
  };
}

// Descarta el volcado a una entrada del índice.
function aIndice(c, nameEs) {
  const imagen = (c.card_images || [])[0] || {};
  const o = { id: c.id, name_en: c.name };
  const es = nameEs(c.name);
  if (es) { o.name_es = es; }
  o.type = c.type || "";
  o.humanReadableCardType = c.humanReadableCardType || "";
  o.frameType = c.frameType || "";
  o.race = c.race || "";
  if (c.attribute) { o.attribute = c.attribute; }
  if (c.level) { o.level = c.level; }
  if (c.atk != null) { o.atk = c.atk; }
  if (c.def != null) { o.def = c.def; }
  if (c.linkval) { o.link = c.linkval; }
  if (c.linkmarkers && c.linkmarkers.length) { o.linkmarkers = c.linkmarkers; }
  if (c.scale) { o.scale = c.scale; }
  if (c.archetype) { o.archetype = c.archetype; }
  if (imagen.image_url_cropped) { o.img = imagen.image_url_cropped; }
  return o;
}

async function cartasDelVolcado(ruta) {
  console.log("leyendo volcado:", ruta);
  const j = JSON.parse(fs.readFileSync(ruta, "utf8"));
  if (!j || !Array.isArray(j.data)) {
    throw new Error("el archivo no tiene {data:[...]}");
  }
  return j.data;
}

async function cartasDeLaApi() {
  console.log("paginando la API…");
  const out = [];
  let offset = 0;
  for (;;) {
    const j = await fetch(`${BASE}?num=500&offset=${offset}`).then((r) => r.json());
    if (!j || j.error || !j.data) {
      throw new Error("error en API: " + (j && j.error ? j.error : "sin data"));
    }
    out.push.apply(out, j.data);
    if (!j.meta || j.meta.rows_remaining <= 0) break;
    offset = j.meta.next_page_offset;
  }
  return out;
}

(async () => {
  const brutas = dumpPath ? await cartasDelVolcado(dumpPath) : await cartasDeLaApi();

  const vistas = {};
  brutas.forEach((c) => {
    const id = String(c.id || "");
    if (id.length >= 6 && c.name && !vistas[id]) { vistas[id] = c; }
  });

  let nameEs;
  if (offline) {
    const porNombre = esDelIndiceAnterior();
    console.log("modo offline: reusando name_es del cards.json anterior");
    nameEs = (n) => porNombre[n] || "";
  } else {
    try {
      nameEs = await cargadorTraduccionES();
    } catch (e) {
      console.log("sin índice ES en red, reusando el anterior:", e.message);
      const porNombre = esDelIndiceAnterior();
      nameEs = (n) => porNombre[n] || "";
    }
  }

  let conEs = 0;
  let conStatsVariable = 0;
  const cards = Object.keys(vistas)
    .map((id) => {
      const o = aIndice(vistas[id], nameEs);
      if (o.name_es) { conEs++; }
      if (o.atk < 0 || o.def < 0) { conStatsVariable++; }
      return o;
    })
    .sort((a, b) => a.name_en.localeCompare(b.name_en));

  const salida = JSON.stringify({
    generated: new Date().toISOString().slice(0, 10),
    total: cards.length,
    cards
  });
  fs.writeFileSync("cards.json", salida);
  console.log("OK", cards.length, "cartas -> cards.json ("
    + (salida.length / 1048576).toFixed(2) + " MB, "
    + conEs + " con nombre ES, " + conStatsVariable + " con estadística variable)");
})().catch((e) => { console.error("ERR", e.message); process.exit(1); });
