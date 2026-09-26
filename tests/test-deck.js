/* Smoke de deck.html en Chrome: autocomplete con Buscador, búsqueda por carta
 * (EN con deck publicado, ES por nombre que cae al Buscador) y thumbnails con ES/arte.
 * Requiere: node server.js + Google Chrome. Uso: node test-deck.js [rutaChrome]
 */
const puppeteer = require("puppeteer-core");

(async () => {
  const exec = process.argv[2] || "C:/Program Files/Google/Chrome/Application/chrome.exe";
  const browser = await puppeteer.launch({ executablePath: exec, headless: "new", args: ["--no-sandbox", "--disable-gpu"] });
  const page = await browser.newPage();
  page.on("pageerror", (e) => console.log("PAGEERROR:", e.message.slice(0, 150)));

  await page.goto("http://localhost:8080/deck.html", { waitUntil: "load", timeout: 30000 });
  await page.waitForFunction(() => window.Buscador && window.Buscador._estadoIndice().listo, { timeout: 20000 });

  console.log("--- autocomplete: blue-e ---");
  await page.type("#search", "blue-e");
  await new Promise((r) => setTimeout(r, 2500));
  console.log(JSON.stringify(await page.evaluate(() => ({
    items: Array.from(document.querySelectorAll("#suggestion-box .suggestion-item")).slice(0, 5).map((d) => d.textContent),
    visible: document.getElementById("suggestion-box").style.display
  })), null, 2));

  async function busca(q, ms) {
    await page.evaluate((v) => {
      document.getElementById("search").value = v;
      if (document.getElementById("suggestion-box")) document.getElementById("suggestion-box").style.display = "none";
    }, q);
    await page.evaluate(() => document.getElementById("btn-search").click());
    const t0 = Date.now();
    let s = null;
    do {
      s = await page.evaluate(() => ({
        t: document.querySelectorAll(".card-thumb").length,
        e: document.getElementById("estado").textContent,
        vacio: document.getElementById("empty").style.display
      }));
      if (s.t > 0 || s.vacio === "block" || /Sin resultados|existe/.test(s.e)) break;
      await new Promise((r) => setTimeout(r, 800));
    } while (Date.now() - t0 < ms);
    return page.evaluate(() => ({
      estado: document.getElementById("estado").textContent,
      deckInfo: document.getElementById("deckInfo").textContent,
      thumbs: document.querySelectorAll(".card-thumb").length,
      primerMeta: (document.querySelector(".card-thumb .meta") || {}).textContent || "",
      arte: (function () { var i = document.querySelector(".card-vista .capa-arte img"); return i ? (i.getAttribute("src") || "").slice(0, 60) : ""; })()
    }));
  }

  console.log("--- ES: Polimerización (solo carta) ---");
  console.log(JSON.stringify(await busca("Polimerización", 45000), null, 2));

  console.log("--- ES con arquetipo: Dragón Blanco Alternativo de Ojos Azules ---");
  console.log(JSON.stringify(await busca("Dragón Blanco Alternativo de Ojos Azules", 45000), null, 2));

  await browser.close();
})();