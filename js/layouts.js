window.LAYOUTS = {};

(function () {
  var MONSTRUO = {
    nombre:       { x: 6.50,  y: 5.58,  w: 76.55, h: 4.42 },
    atributo:     { x: 83.05, y: 4.77,  w: 9.32,  h: 6.40 },
    nivel:        { x: 6.60,  y: 12.33, w: 83.30, h: 4.42 },
    arte:         { x: 12.37, y: 18.49, w: 75.42, h: 51.74 },
    numeroserie:  { x: 71.02, y: 71.86, w: 18.64, h: 1.74 },
    tipo:         { x: 8.47,  y: 75.12, w: 83.05, h: 2.44 },
    texto:        { x: 7.80,  y: 78.14, w: 84.75, h: 12.67 },
    "atk-label":  { x: 49.83, y: 91.28, w: 10.00, h: 2.44 },
    atk:          { x: 59.15, y: 91.28, w: 10.00, h: 2.44 },
    "def-label":  { x: 72.54, y: 91.28, w: 9.32,  h: 2.44 },
    def:          { x: 81.36, y: 91.28, w: 10.00, h: 2.44 },
    password:     { x: 5.93,  y: 95.35, w: 42.37, h: 1.51 },
    copyright:    { x: 51.69, y: 95.35, w: 42.37, h: 1.51 }
  };

  function monstruo(key, meta) {
    LAYOUTS[key] = Object.assign({ meta: meta }, MONSTRUO);
  }

  monstruo("monstruo-normal",  { tipo: "monstruo", esNormal: true });
  monstruo("monstruo-efecto",  { tipo: "monstruo" });
  monstruo("monstruo-ritual",  { tipo: "monstruo" });
  monstruo("monstruo-fusion",  { tipo: "monstruo" });
  monstruo("monstruo-synchro", { tipo: "monstruo" });
  monstruo("monstruo-token",   { tipo: "token" });

  var XYZ = Object.assign({ meta: { tipo: "xyz" } }, MONSTRUO);
  delete XYZ.nivel;
  XYZ.rango = { x: 7.63, y: 12.33, w: 84.92, h: 4.42 };
  LAYOUTS["monstruo-xyz"] = XYZ;

  var LINK = Object.assign({ meta: { tipo: "link" } }, MONSTRUO);
  delete LINK.nivel;
  delete LINK["def-label"];
  delete LINK.def;
  LINK.numeroserie = { x: 63.56, y: 71.86, w: 18.64, h: 1.74 };
  LINK["link-label"] = { x: 72.20, y: 90.81, w: 15.93, h: 2.44 };
  LINK.link        = { x: 87.63, y: 91.05, w: 3.73, h: 2.44 };
  LINK["f-ul"]     = { x: 8.98,  y: 16.16, w: 6.78, h: 4.65 };
  LINK["f-u"]      = { x: 42.37, y: 14.88, w: 15.25, h: 4.07 };
  LINK["f-ur"]     = { x: 84.58, y: 16.16, w: 6.78, h: 4.65 };
  LINK["f-l"]      = { x: 6.78,  y: 39.07, w: 5.93, h: 10.47 };
  LINK["f-r"]      = { x: 87.63, y: 39.07, w: 5.93, h: 10.47 };
  LINK["f-dl"]     = { x: 8.98,  y: 67.91, w: 6.78, h: 4.65 };
  LINK["f-d"]      = { x: 42.37, y: 69.77, w: 15.25, h: 4.07 };
  LINK["f-dr"]     = { x: 84.58, y: 67.91, w: 6.78, h: 4.65 };
  LAYOUTS["monstruo-link"] = LINK;

  var PEND = Object.assign({ meta: { tipo: "pendulum" } }, MONSTRUO);
  delete PEND.arte;
  PEND["p-arte"]   = { x: 6.95,  y: 18.02, w: 86.27, h: 44.30 };
  PEND["pscale-l"] = { x: 8.31,  y: 67.91, w: 4.75, h: 4.19 };
  PEND["pscale-r"] = { x: 86.95, y: 67.91, w: 4.75, h: 4.19 };
  PEND.ptexto      = { x: 15.59, y: 63.14, w: 69.15, h: 10.93 };
  PEND.numeroserie = { x: 8.47,  y: 91.86, w: 18.64, h: 1.74 };
  LAYOUTS["pendulum-normal"] = Object.assign({ meta: { tipo: "pendulum", esNormal: true } }, PEND);
  LAYOUTS["pendulum-efecto"] = PEND;

  function magicaOTrampa(key, tipo) {
    LAYOUTS[key] = {
      meta: { tipo: tipo },
      nombre:      MONSTRUO.nombre,
      atributo:    MONSTRUO.atributo,
      cardtype:    { x: 51.0, y: 12.21, w: 36.00, h: 4.65 },
      subtipo:     { x: 81.02, y: 12.67, w: 5.76, h: 3.95 },
      arte:        MONSTRUO.arte,
      texto:       { x: 7.80, y: 75.47, w: 84.75, h: 18.02 },
      numeroserie: MONSTRUO.numeroserie,
      password:    MONSTRUO.password,
      copyright:   MONSTRUO.copyright
    };
  }
  magicaOTrampa("magica", "spell");
  magicaOTrampa("trampa", "trap");
})();