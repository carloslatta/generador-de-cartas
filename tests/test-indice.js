/* tests/test-indice.js → node tests/test-indice.js
 * El índice local (cards.json) debe bastar para armar la carta: sin servidor,
 * sin API. Se comprueba con búsquedas por passcode y por nombre.
 */
var path = require("path");
var root = path.join(__dirname, "..");
require(path.join(root, "mock-dom.js"));
require(path.join(root, "js", "buscador.js"));
var B = window.Buscador;

var fallos = 0;
function ok(cond, msg, extra) {
  if (cond) {
    console.log("  ok   " + msg);
  } else {
    fallos++;
    console.log("  FALLA " + msg + (extra ? "  -> " + extra : ""));
  }
}

function porPasscode(id) {
  return B.buscar(String(id)).then(function (cartas) {
    ok(cartas.length === 1, "passcode " + id + " devuelve 1 carta", "n=" + cartas.length);
    return cartas[0] || {};
  });
}

B._estadoIndice();
var cargando = new Promise(function (resolve) {
  (function esperar() {
    if (B._estadoIndice().listo) { resolve(); return; }
    setTimeout(esperar, 25);
  })();
});

cargando
  .then(function () {
    var st = B._estadoIndice();
    console.log("=== índice local: " + st.n + " cartas ===");
    ok(st.n > 12000, "el índice tiene más de 12.000 cartas", "n=" + st.n);
  })
  .then(function () {
    console.log("=== passcode 46986414 (Mago Oscuro) ===");
    return porPasscode(46986414).then(function (c) {
      ok(c.nombre === "Mago Oscuro", "nombre en español desde el índice", c.nombre);
      ok(c.nombreEN === "Dark Magician", "nombre en inglés", c.nombreEN);
      ok(c.nivel === 7, "nivel 7", c.nivel);
      ok(c.tipo === "Lanzador de Conjuros", "tipo traducido", c.tipo);
      ok(c.atributo === "DARK", "atributo DARK", c.atributo);
      ok(c.frameType === "normal", "marco normal", c.frameType);
      ok(c.atk === 2500 && c.def === 2100, "atk/def numéricos", c.atk + "/" + c.def);
      ok(/46986414\.jpg$/.test(c.arte || ""), "arte desde el índice", c.arte);
      ok(c.deIndice === true, "la carta viene del índice local");
    });
  })
  .then(function () {
    console.log("=== passcode 10678778 (Aegaion, atk variable) ===");
    return porPasscode(10678778).then(function (c) {
      ok(c.atk === "?", "atk -1 se muestra como ?", c.atk);
      ok(c.def === 3000, "def fijo se respeta", c.def);
      ok(c.rango === 8, "rango (XYZ) 8", c.rango);
    });
  })
  .then(function () {
    console.log("=== passcode de un Link (Apollousa) ===");
    return B.buscar("4280258").then(function (cartas) {
      var c = cartas[0] || {};
      ok(c.link > 0, "link > 0", c.link);
      ok(c.def === "", "link no tiene def", JSON.stringify(c.def));
      ok(c.atk === "?", "atk variable del link como ?", c.atk);
    });
  })
  .then(function () {
    console.log("=== passcode 24094653 (Polimerización, mágica) ===");
    return porPasscode(24094653).then(function (c) {
      ok(c.esSpellTrap === true, "marcada como spell/trap");
      ok(c.atributo === "SPELL", "atributo SPELL", c.atributo);
      ok(c.nombre === "Polimerización", "nombre en español", c.nombre);
    });
  })
  .then(function () {
    console.log("=== búsqueda por nombre (sin red) ===");
    return B.buscar("Dark Magician").then(function (cartas) {
      ok(cartas.length > 0, "encuentra 'Dark Magician'", "n=" + cartas.length);
      ok(cartas[0].nombre === "Mago Oscuro", "el 1º es Mago Oscuro", cartas[0].nombre);
      ok(cartas[0].atk === 2500, "con datos de la plantilla", cartas[0].atk);
    });
  })
  .then(function () {
    console.log("=== passcode inexistente ===");
    return B.buscar("99999999").then(function (cartas) {
      ok(cartas.length === 0, "passcode inexistente no devuelve nada", "n=" + cartas.length);
    });
  })
  .then(function () {
    console.log(fallos ? "\n" + fallos + " FALLO(S)" : "\nTodo OK");
    process.exit(fallos ? 1 : 0);
  })
  .catch(function (e) {
    console.error("ERROR:", e && e.stack || e);
    process.exit(1);
  });
