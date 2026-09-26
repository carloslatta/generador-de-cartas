// build-cards-index.js  →  node build-cards-index.js
// Construye cards.json (pares {id, name, es?} de cartas oficiales) desde YGOPRODeck.
// `es` es el nombre en español, obtenido en masa desde db.ygoresources.com
// (índices nombre->id interno de los idiomas es y en, unidos por el id interno).
// Idempotente: se puede re-ejecutar cuando salga un set nuevo.
const BASE = "https://db.ygoprodeck.com/api/v7/cardinfo.php";
const fs = require("fs");

const UA = { headers: { "User-Agent": "YGODeckGenerator/1.0" } };

// Devuelve una función nameEs(nameEn) -> nombre en español ("" si no se sabe).
// Unión: EN: nameEn -> [idInterno]; reverse(ES: nameEs -> [idInterno]).
async function cargarTraduccionES() {
  const [esIdx, enIdx] = await Promise.all([
    fetch("https://db.ygoresources.com/data/idx/card/name/es", UA).then(r => r.text()),
    fetch("https://db.ygoresources.com/data/idx/card/name/en", UA).then(r => r.text())
  ]);
  const ES = JSON.parse(esIdx); // nameEs -> [idInterno]
  const EN = JSON.parse(enIdx); // nameEn -> [idInterno]
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

(async () => {
  const vistos = {};
  let offset = 0;
  for (;;) {
    const j = await fetch(`${BASE}?num=500&offset=${offset}`).then(r => r.json());
    if (!j || j.error || !j.data) {
      console.error("error en API:", j && j.error ? j.error : "sin data");
      process.exit(1);
    }
    (j.data || []).forEach(c => {
      const id = String(c.id || "");
      if (id.length === 8 && c.name && !vistos[id]) vistos[id] = c.name;
    });
    if (!j.meta || j.meta.rows_remaining <= 0) break;
    offset = j.meta.next_page_offset;
  }
  const nameEs = await cargarTraduccionES();
  let conEs = 0;
  const cards = Object.keys(vistos)
    .map(id => {
      const card = { id: Number(id), name: vistos[id] };
      const es = nameEs(card.name);
      if (es) { card.es = es; conEs++; }
      return card;
    })
    .sort((a, b) => a.name.localeCompare(b.name));
  fs.writeFileSync("cards.json", JSON.stringify({
    generated: new Date().toISOString().slice(0, 10),
    total: cards.length,
    cards
  }, null, 1));
  console.log("OK", cards.length, "cartas -> cards.json (" + conEs + " con nombre ES)");
})().catch(e => { console.error("ERR", e.message); process.exit(1); });