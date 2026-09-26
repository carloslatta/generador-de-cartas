/* Test de búsqueda y descarga: en armar.html busca 5 cartas (EN/ES, monstruo/spell/trampa),
 * espera el auto-armado con datos del Buscador y guarda el PNG en /guardar.
 * Requiere: servidor corriendo (node server.js) + Google Chrome.
 * Uso: node test-descarga.js [rutaChrome]
 */
const puppeteer = require("puppeteer-core");
const fs = require("fs");
const path = require("path");

const CARTAS = [
  { q: "Blue Eyes White Dragon", clave: "ojos azules", tag: "EN-normal" },
  { q: "Dragón Blanco Alternativo de Ojos Azules", clave: "alternativo", tag: "ES-effect" },
  { q: "Polimerización", clave: "polimerizaci", tag: "ES-spell" },
  { q: "Call of the Haunted", clave: "llamada de los condenados", tag: "EN-trap" },
  { q: "Dragón de Ojos Azules Definitivo", clave: "definitivo", tag: "ES-fusion" }
];

(async () => {
  const exec = process.argv[2] || "C:/Program Files/Google/Chrome/Application/chrome.exe";
  const browser = await puppeteer.launch({ executablePath: exec, headless: "new", args: ["--no-sandbox", "--disable-gpu"] });
  const page = await browser.newPage();
  page.on("pageerror", (e) => console.log("PAGEERROR:", e.message.slice(0, 150)));

  await page.goto("http://localhost:8080/armar.html", { waitUntil: "load", timeout: 30000 });
  await page.waitForFunction(() => window.Buscador && window.Buscador._estadoIndice && window.Buscador._estadoIndice().listo, { timeout: 20000 });
  await page.evaluate(() => { window.prompt = function () { return ""; }; });

  let ok = 0, fail = 0;
  const guardados = [];

  for (const c of CARTAS) {
    const log = "[" + c.tag + "] “" + c.q + "”";
    try {
      await page.evaluate((v) => { document.getElementById("q").value = ""; }, c.q);
      await page.focus("#q");
      await page.type("#q", c.q);
      // esperar auto-armado (estado "Lista con artwork" con el nombre correcto)
      let listo = false;
      for (let i = 0; i < 25 && !listo; i++) {
        const s = await page.evaluate(() => ({
          estado: document.getElementById("estado").textContent,
          nombre: window.CARD ? window.CARD.nombre : null
        }));
        if (s.estado.indexOf("Lista con artwork") !== -1 && (s.nombre || "").toLowerCase().indexOf(c.clave) !== -1) { listo = true; }
        await new Promise((r) => setTimeout(r, 1000));
      }
      if (!listo) throw new Error("no se armó con la carta esperada");
      await page.click("#btn-guardar");
      // esperar guardado (estado cambia a "Guardada en cartas/" o muestra error)
      let guardado = null;
      for (let i = 0; i < 30 && !guardado; i++) {
        const txt = await page.evaluate(() => document.getElementById("estado").textContent);
        if (txt.indexOf("Guardada en cartas/") !== -1) { guardado = txt; }
        if (txt.indexOf("Error al guardar") !== -1) { throw new Error(txt); }
        await new Promise((r) => setTimeout(r, 1000));
      }
      if (!guardado) throw new Error("timeout esperando guardado");
      const archivo = guardado.replace("Guardada en cartas/", "");
      const ruta = path.join(__dirname, "..", "cartas", archivo);
      const tam = fs.existsSync(ruta) ? fs.statSync(ruta).size : 0;
      if (!(tam > 1000)) throw new Error("PNG no encontrado/pequeño: " + ruta);
      ok++; guardados.push({ tag: c.tag, archivo, tam });
      console.log("  OK " + log + " -> " + archivo + " (" + tam + " bytes)");
    } catch (e) {
      fail++;
      console.log("  FAIL " + log + ": " + e.message);
    }
    // limpiar para la siguiente búsqueda
    await page.evaluate(() => { document.getElementById("q").value = ""; });
  }

  console.log("\nResultado: " + ok + " de " + CARTAS.length + " OK" + (fail ? " (" + fail + " fallaron)" : ""));
  await browser.close();
  process.exit(fail ? 1 : 0);
})();