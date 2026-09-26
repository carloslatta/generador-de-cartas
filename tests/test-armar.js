/* Smoke de armar.html en Chrome: búsqueda EN (índice) y ES (Yugipedia) con auto-armado.
 * Verifica que hacerBusqueda antepone Buscador y que armarCarta usa datos/arte del Buscador.
 * Requiere: node server.js + Google Chrome. Uso: node test-armar.js [rutaChrome]
 */
const puppeteer = require("puppeteer-core");

(async () => {
  const exec = process.argv[2] || "C:/Program Files/Google/Chrome/Application/chrome.exe";
  const browser = await puppeteer.launch({ executablePath: exec, headless: "new", args: ["--no-sandbox", "--disable-gpu"] });
  const page = await browser.newPage();
  page.on("pageerror", (e) => console.log("PAGEERROR:", e.message.slice(0, 150)));

  await page.goto("http://localhost:8080/armar.html", { waitUntil: "load", timeout: 30000 });
  await page.waitForFunction(() => window.Buscador && window.Buscador._estadoIndice().listo, { timeout: 20000 });

  const estado = () => page.evaluate(() => ({
    options: Array.from(document.querySelectorAll("#resultados option")).map((o) => o.textContent),
    estado: document.getElementById("estado").textContent,
    layout: window.CONFIG ? window.CONFIG.layout : null,
    nombre: window.CARD ? window.CARD.nombre : null,
    arte: window.CARD ? (window.CARD.arte || "").slice(0, 70) : null,
    fich: document.getElementById("fich").value
  }));

  console.log("--- ES: Dragón Blanco de Ojos Azules ---");
  await page.type("#q", "Dragón Blanco de Ojos Azules");
  await new Promise((r) => setTimeout(r, 6500));
  console.log(JSON.stringify(await estado(), null, 2));

  console.log("--- EN: Blue-Eyes White Dragon ---");
  await page.focus("#q");
  for (const ch of "Blue-Eyes White Dragon") { await page.keyboard.press("Backspace"); }
  await page.type("#q", "Blue-Eyes White Dragon");
  await new Promise((r) => setTimeout(r, 4000));
  console.log(JSON.stringify(await estado(), null, 2));

  await browser.close();
})();