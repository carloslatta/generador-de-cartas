var path = require("path");
var root = path.join(__dirname, "..");
require(path.join(root, "mock-dom.js"));
window.BASE_PROXY = "http://localhost:8080";
require(path.join(root, "js", "buscador.js"));
var B = window.Buscador;

function probar(q) {
  return B.buscar(q).then(function (cartas) {
    console.log("=== " + q + " ===");
    if (!cartas.length) { console.log("  (sin resultados)"); return; }
    cartas.slice(0, 3).forEach(function (c, i) {
      console.log("  [" + (i + 1) + "]", c.nombre || "(sin nombre)", "| EN:", c.nombreEN, "| atk:", c.atk, "| def:", c.def, "| tipo:", c.tipo, "| hab:", c.habilidad, "| ps:", c.password);
      console.log("       arte:", (c.arte || "").slice(0, 90));
      console.log("       texto:", (c.texto || "").slice(0, 80));
    });
  }).catch(function (e) { console.log("  ERROR", q, e && e.message); });
}

probar("Blue Eyes White Dragon")
  .then(function () { return probar("Dragón Alternativo de Ojos Azules"); })
  .then(function () { return probar("mago oscuro"); })
  .then(function () { return probar("Dark Magician"); })
  .then(function () { return probar("Polimerización"); })
  .then(function () { return probar("zzz no existe esta carta"); });