// build-cards-index.js  →  node build-cards-index.js
// Construye cards.json (pares {id, name} de cartas oficiales) desde YGOPRODeck.
// Idempotente: se puede re-ejecutar cuando salga un set nuevo.
const BASE = "https://db.ygoprodeck.com/api/v7/cardinfo.php";
const fs = require("fs");

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
  const cards = Object.keys(vistos)
    .map(id => ({ id: Number(id), name: vistos[id] }))
    .sort((a, b) => a.name.localeCompare(b.name));
  fs.writeFileSync("cards.json", JSON.stringify({
    generated: new Date().toISOString().slice(0, 10),
    total: cards.length,
    cards
  }, null, 1));
  console.log("OK", cards.length, "cartas -> cards.json");
})().catch(e => { console.error("ERR", e.message); process.exit(1); });