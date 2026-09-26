(function () {
  var qs = new URLSearchParams(location.search);
  var debug = qs.get("debug") === "1";
  var escalaIni = parseFloat(qs.get("escala") || "0.3178");
  var guardado = parseFloat(localStorage.getItem("ygo-prev-escala"));
  var escala = isFinite(guardado) ? guardado : escalaIni;
  var ofsY = parseInt(localStorage.getItem("ygo-offset-y"), 10) || 0;
  var anchoNombreDelta = parseInt(localStorage.getItem("ygo-nombre-ancho"), 10) || 0;
  var atributoDelta = parseInt(localStorage.getItem("ygo-atributo-size"), 10) || 0;
  var factorLetras = parseFloat(localStorage.getItem("ygo-letras-factor"));
  if (!isFinite(factorLetras) || factorLetras <= 0) {
    factorLetras = 1;
  }
  var capaArteRef = null;
  var capaFrontRef = null;

  var cardClip = document.getElementById("card-clip");
  var card = document.getElementById("card");
  var estado = document.getElementById("estado");
  var tam = window.CONFIG.tam || { w: 1180, h: 1720 };
  var selectCarta = document.getElementById("f-carta");

  card.style.width = tam.w + "px";
  card.style.height = tam.h + "px";

  var fEscalaVal = document.getElementById("f-escala-val");
  var fAlejar = document.getElementById("f-alejar");
  var fAcercar = document.getElementById("f-acercar");
  var fEscalaReset = document.getElementById("f-escala-reset");
  var fOfsY = document.getElementById("f-desplazar");
  var fOfsVal = document.getElementById("f-desplazar-val");

  

  function applyEscala(val) {
    escala = val;
    card.style.transform = "scale(" + escala + ")";
    cardClip.style.width = Math.round(tam.w * escala) + "px";
    cardClip.style.height = Math.round(tam.h * escala) + "px";
    if (fEscalaVal) {
      fEscalaVal.textContent = Math.round(escala * 100) + "%";
    }
  }
  applyEscala(escala);

  function applyDesplazamiento(px) {
    ofsY = px;
    if (capaArteRef) {
      capaArteRef.style.transform = "translateY(" + px + "px)";
    }
    if (capaFrontRef) {
      capaFrontRef.style.transform = "translateY(" + px + "px)";
    }
    if (fOfsVal) {
      fOfsVal.textContent = px + "px";
    }
  }
  if (debug) {
    card.classList.add("debug");
  }

  var ATTRS = {
    DARK: "assets/icons/attr_DARK.png",
    DIVINE: "assets/icons/attr_DIVINE.png",
    EARTH: "assets/icons/attr_EARTH.png",
    FIRE: "assets/icons/attr_FIRE.png",
    LIGHT: "assets/icons/attr_LIGHT.png",
    WATER: "assets/icons/attr_WATER.png",
    WIND: "assets/icons/attr_WIND.png"
  };

  var SUBTIPOS = {
    "Counter": "assets/icons/GUI_T_Icon1_Icon01.png",
    "Field": "assets/icons/GUI_T_Icon1_Icon02.png",
    "Equip": "assets/icons/GUI_T_Icon1_Icon03.png",
    "Continuous": "assets/icons/GUI_T_Icon1_Icon04.png",
    "Quick-Play": "assets/icons/GUI_T_Icon1_Icon05.png",
    "Ritual": "assets/icons/GUI_T_Icon1_Icon06.png"
  };

  var FLECHAS = {
    "f-ul": "assets/icons/L_UL.png", "f-u": "assets/icons/L_U.png",
    "f-ur": "assets/icons/L_UR.png", "f-l": "assets/icons/L_L.png",
    "f-r": "assets/icons/L_R.png", "f-dl": "assets/icons/L_DL.png",
    "f-d": "assets/icons/L_D.png", "f-dr": "assets/icons/L_DR.png"
  };

  var LEVEL_STAR = "assets/icons/GUI_T_Icon1_Other_Level_Yugipedia64.png";
  var RANK_STAR = "assets/icons/GUI_T_Icon1_Other_Rank_Yugipedia64.png";

  var campos = {};
  ["nombre", "atributo", "nivel", "rango", "link", "flechas", "pscale", "subtipo", "tipo", "habilidad", "texto", "ptexto", "atk", "def", "arte", "numero", "password", "copyright"].forEach(function (k) {
    campos[k] = document.getElementById("f-" + k);
  });

  var boxEls = {};

  function construirCajas() {
    card.innerHTML = "";
    card.style.backgroundImage = "";
    boxEls = {};
    var layout = window.LAYOUTS[window.CONFIG.layout];
    if (!layout) {
      estado.textContent = "Layout no encontrado: " + window.CONFIG.layout;
      return;
    }
    var marco = document.createElement("div");
    marco.className = "marco";
    marco.style.backgroundImage = "url('" + window.CONFIG.base + "')";
    card.appendChild(marco);

    capaArteRef = document.createElement("div");
    capaArteRef.className = "capa-arte";
    capaFrontRef = document.createElement("div");
    capaFrontRef.className = "capa-front";
    card.appendChild(capaArteRef);
    card.appendChild(capaFrontRef);

    Object.keys(layout).forEach(function (caja) {
      if (caja === "meta") {
        return;
      }
      var def = layout[caja];
      var el = document.createElement("div");
      el.className = "box box-" + caja;
      el.dataset.nombre = caja;
      el.style.left = def.x + "%";
      el.style.top = def.y + "%";
      el.style.width = def.w + "%";
      el.style.height = def.h + "%";
      var capa = caja === "arte" || caja === "p-arte" ? capaArteRef : capaFrontRef;
      capa.appendChild(el);
      boxEls[caja] = el;
    });

    applyDesplazamiento(ofsY);
  }

  function formatearTipo(tipo, habilidad) {
    tipo = (tipo || "").trim();
    habilidad = (habilidad || "Normal").trim();
    return "[ " + tipo + " / " + habilidad + " ]";
  }

  function ajustarTexto(el, sizeIni) {
    var size = sizeIni;
    el.style.fontSize = size + "px";
    while (el.scrollHeight > el.clientHeight && size > 10) {
      size -= 1;
      el.style.fontSize = size + "px";
    }
  }

  function ajustarNombre(el) {
    el.style.letterSpacing = "0px";
    el.style.transform = "none";
    el.style.transformOrigin = "left center";
    var texto = (el.textContent || "").trim();
    if (!texto) {
      return;
    }
    var cs = getComputedStyle(el);
    var anchoDisponible = el.clientWidth;
    var limiteAtributo = 978;
    var cajaIzq = el.offsetLeft || 0;
    var maxUtil = limiteAtributo - cajaIzq;
    if (maxUtil > 0 && anchoDisponible > maxUtil) {
      anchoDisponible = maxUtil;
    }
    if (!(anchoDisponible > 0)) {
      return;
    }

    var medidor = document.createElement("span");
    medidor.style.visibility = "hidden";
    medidor.style.position = "absolute";
    medidor.style.whiteSpace = "nowrap";
    medidor.style.fontFamily = cs.fontFamily;
    medidor.style.fontSize = "116px";
    medidor.style.fontWeight = cs.fontWeight;
    medidor.style.letterSpacing = "0px";
    medidor.textContent = texto;
    document.body.appendChild(medidor);

    try {
      var anchoTextoReal = medidor.getBoundingClientRect().width;

      if (anchoTextoReal > anchoDisponible) {
        var mejorLetterSpacing = 0;
        var ls;
        for (ls = -1; ls >= -8; ls--) {
          medidor.style.letterSpacing = ls + "px";
          var nuevoAncho = medidor.getBoundingClientRect().width;
          mejorLetterSpacing = ls;
          anchoTextoReal = nuevoAncho;
          if (nuevoAncho <= anchoDisponible) {
            break;
          }
        }

        el.style.letterSpacing = mejorLetterSpacing + "px";

        if (anchoTextoReal > anchoDisponible) {
          var factorEscalaX = anchoDisponible / anchoTextoReal;
          el.style.transform = "scaleX(" + (factorEscalaX * factorLetras) + ")";
          var alineacionCentrada = getComputedStyle(el).justifyContent === "center";
          el.style.transformOrigin = alineacionCentrada ? "center center" : "left center";
        }
      }
    } finally {
      document.body.removeChild(medidor);
    }
  }

  function imagen(caja, src) {
    boxEls[caja].textContent = "";
    var img = document.createElement("img");
    img.src = src;
    img.alt = "";
    boxEls[caja].appendChild(img);
  }

  function esCaja(caja) {
    return Object.prototype.hasOwnProperty.call(boxEls, caja);
  }

  function render() {
    var c = window.CARD;
    var meta = (window.LAYOUTS[window.CONFIG.layout] || {}).meta || { tipo: "monstruo" };
    var tipo = meta.tipo;
    var esNormal = !!meta.esNormal || c.habilidad === "Normal";

    var nombreClaro = tipo === "spell" || tipo === "trap" || tipo === "xyz" || tipo === "link";

    if (esCaja("nombre")) {
      boxEls["nombre"].textContent = c.nombre || "";
      boxEls["nombre"].style.color = nombreClaro ? "#fff" : "#000";
      aplicarAnchoNombre();
      ajustarNombre(boxEls["nombre"]);
    }

    if (esCaja("atributo")) {
      aplicarAtributo();
      var clave;
      if (tipo === "spell") {
        clave = "SPELL";
      } else if (tipo === "trap") {
        clave = "TRAP";
      } else {
        clave = String(c.atributo).toUpperCase();
      }
      if (ATTRS[clave]) {
        imagen("atributo", ATTRS[clave]);
      } else {
        boxEls["atributo"].textContent = "";
      }
    }

    if (esCaja("nivel")) {
      var nivel = parseInt(c.nivel, 10) || 0;
      boxEls["nivel"].textContent = "";
      for (var i = 0; i < Math.min(nivel, 12); i++) {
        var star = document.createElement("img");
        star.src = LEVEL_STAR;
        star.alt = "";
        boxEls["nivel"].appendChild(star);
      }
    }

    if (esCaja("rango")) {
      var rango = parseInt(c.rango, 10) || 0;
      boxEls["rango"].textContent = "";
      for (var j = 0; j < Math.min(rango, 12); j++) {
        var rk = document.createElement("img");
        rk.src = RANK_STAR;
        rk.alt = "";
        boxEls["rango"].appendChild(rk);
      }
    }

    if (esCaja("arte")) {
      ponerArte(boxEls["arte"], c.arte, "cover");
    }
    if (esCaja("p-arte")) {
      ponerArte(boxEls["p-arte"], c.arte, "cover");
    }

    if (esCaja("cardtype")) {
      var label = tipo === "spell" ? "spell card" : "trap card";
      var icono = (esCaja("subtipo") && SUBTIPOS[c.subtipo]) ? SUBTIPOS[c.subtipo] : null;
      if (icono) {
        console.log("[RENDER] icono:", icono);
        boxEls["cardtype"].innerHTML = "[" + label + " <img src='" + icono + "' style='height:1.1em;vertical-align:middle;margin:0 2px;'>]";
        boxEls["cardtype"].style.color = "#000";
      } else {
        boxEls["cardtype"].textContent = (tipo === "spell" ? "[ spell card ]" : "[ trap card ]");
        boxEls["cardtype"].style.color = "#000";
      }
      if (tipo === "trap") {
        boxEls["cardtype"].style.paddingLeft = "19px";
      } else {
        boxEls["cardtype"].style.paddingLeft = "0";
      }
      if (esCaja("subtipo")) { boxEls["subtipo"].textContent = ""; }
    }

    if (esCaja("tipo")) {
      boxEls["tipo"].textContent = formatearTipo(c.tipo, c.habilidad);
      boxEls["tipo"].style.color = "#000";
    }

    if (esCaja("texto")) {
      var tEl = boxEls["texto"];
      tEl.textContent = c.texto || "";
      tEl.style.fontStyle = esNormal ? "italic" : "normal";
      tEl.style.color = "#000";
      ajustarTexto(tEl, 40);
    }

    if (esCaja("ptexto")) {
      var pEl = boxEls["ptexto"];
      pEl.textContent = c.ptexto || "";
      pEl.style.fontStyle = "normal";
      pEl.style.color = "#000";
      ajustarTexto(pEl, 34);
    }

    if (esCaja("pscale-l")) {
      boxEls["pscale-l"].textContent = c.pscale || "";
    }
    if (esCaja("pscale-r")) {
      boxEls["pscale-r"].textContent = c.pscale || "";
    }

    if (esCaja("atk-label")) {
      boxEls["atk-label"].textContent = "ATK/";
    }
    if (esCaja("def-label")) {
      boxEls["def-label"].textContent = "DEF/";
    }
    if (esCaja("atk")) {
      boxEls["atk"].textContent = c.atk;
    }
    if (esCaja("def")) {
      boxEls["def"].textContent = c.def;
    }

    if (esCaja("link-label")) {
      boxEls["link-label"].textContent = "LINK-";
    }
    if (esCaja("link")) {
      boxEls["link"].textContent = c.link || "";
    }

    var flechasArr = [];
    if (c.flechas) {
      flechasArr = String(c.flechas).split(",").map(function (s) { return s.trim(); }).filter(Boolean);
    }
    Object.keys(FLECHAS).forEach(function (box) {
      if (esCaja(box)) {
        var nombreF = box.slice(2).toLowerCase();
        if (flechasArr.indexOf(nombreF) !== -1) {
          imagen(box, FLECHAS[box]);
        } else {
          boxEls[box].textContent = "";
        }
      }
    });

    var pieClaro = tipo === "xyz";
    ["numeroserie", "password", "copyright"].forEach(function (box) {
      if (esCaja(box)) {
        var valor = c[box === "numeroserie" ? "numero" : box] || "";
        boxEls[box].textContent = valor;
        boxEls[box].style.color = pieClaro ? "rgb(224,224,224)" : "#000";
      }
    });

    syncBloquePendulo();
    syncBloqueEstrellas();
  }

  function ponerArte(el, arte, fit) {
    var img = el.querySelector("img");
    if (!img) {
      img = document.createElement("img");
      img.alt = "";
      el.appendChild(img);
    }
    if (arte) {
      img.src = arte;
      img.style.visibility = "visible";
      img.style.objectFit = fit;
    } else {
      img.removeAttribute("src");
      img.style.visibility = "hidden";
    }
  }

  function syncInputs() {
    var c = window.CARD;
    Object.keys(campos).forEach(function (k) {
      campos[k].value = c[k] == null ? "" : c[k];
    });
    if (fBuscarTitulo && !fBuscarTitulo.dataset.tocado) {
      fBuscarTitulo.value = c.ingles || c.nombre || "";
    }
  }

  Object.keys(campos).forEach(function (k) {
    campos[k].addEventListener("input", function () {
      var val = campos[k].value;
      if (k === "nivel" || k === "rango" || k === "link") {
        window.CARD[k] = parseInt(val, 10) || 0;
      } else {
        window.CARD[k] = val;
      }
      render();
    });
  });

  var bloquePendulo = document.getElementById("ajuste-pendulo");
  var fArtPos = document.getElementById("f-art-pos");
  var fArtZoom = document.getElementById("f-art-zoom");
  var fArtGuardar = document.getElementById("f-art-guardar");
  var fArtReiniciar = document.getElementById("f-art-reiniciar");

  function esPendulo() {
    return (window.LAYOUTS[window.CONFIG.layout] || {}).meta.tipo === "pendulum";
  }

  function claveAjusteArte() {
    return "ygo-art-pendulo:" + (window.CARD.arte || "");
  }

  function cargarAjusteInputs() {
    var a = { pos: 0, zoom: 100 };
    try {
      var g = JSON.parse(localStorage.getItem(claveAjusteArte()));
      if (g) {
        a.pos = +g.pos || 0;
        a.zoom = +g.zoom || 100;
      }
    } catch (e) {}
    fArtPos.value = a.pos;
    fArtZoom.value = a.zoom;
  }

  function aplicarAjusteArte() {
    if (!esCaja("p-arte")) {
      return;
    }
    var img = boxEls["p-arte"].querySelector("img");
    if (!img) {
      return;
    }
    var pos = parseInt(fArtPos.value, 10) || 0;
    var zoom = parseInt(fArtZoom.value, 10) || 100;
    img.style.objectPosition = "50% " + (50 + pos) + "%";
    img.style.transform = "scale(" + (zoom / 100) + ")";
    img.style.transformOrigin = "50% 50%";
  }

  var fNombreAncho = document.getElementById("f-nombre-ancho");
  var fNombreAnchoVal = document.getElementById("f-nombre-ancho-val");
  var fNombreAnchoReiniciar = document.getElementById("f-nombre-ancho-reiniciar");

  function aplicarAnchoNombre() {
    var def = (window.LAYOUTS[window.CONFIG.layout] || {}).nombre;
    if (!def || !esCaja("nombre")) {
      return;
    }
    var basePx = def.w / 100 * tam.w;
    boxEls["nombre"].style.width = (basePx + anchoNombreDelta) + "px";
    if (fNombreAnchoVal) {
      fNombreAnchoVal.textContent = (anchoNombreDelta > 0 ? "+" : "") + anchoNombreDelta + "px";
    }
  }

  if (fNombreAncho) {
    fNombreAncho.value = anchoNombreDelta;
    fNombreAncho.addEventListener("input", function () {
      anchoNombreDelta = parseInt(fNombreAncho.value, 10) || 0;
      localStorage.setItem("ygo-nombre-ancho", String(anchoNombreDelta));
      aplicarAnchoNombre();
      if (esCaja("nombre")) {
        ajustarNombre(boxEls["nombre"]);
      }
    });
  }
  if (fNombreAnchoReiniciar) {
    fNombreAnchoReiniciar.addEventListener("click", function () {
      anchoNombreDelta = 0;
      localStorage.removeItem("ygo-nombre-ancho");
      fNombreAncho.value = 0;
      aplicarAnchoNombre();
      if (esCaja("nombre")) {
        ajustarNombre(boxEls["nombre"]);
      }
      fNombreAnchoVal.textContent = "0px";
      estado.textContent = "Caja de nombre restablecida";
    });
  }

  var fLetras = document.getElementById("f-letras-factor");
  var fLetrasVal = document.getElementById("f-letras-factor-val");
  var fLetrasReiniciar = document.getElementById("f-letras-reiniciar");

  var fAtrSize = document.getElementById("f-atributo-size");
  var fAtrSizeVal = document.getElementById("f-atributo-size-val");
  var fAtrSizeReiniciar = document.getElementById("f-atributo-size-reiniciar");

  function aplicarAtributo() {
    var def = (window.LAYOUTS[window.CONFIG.layout] || {}).atributo;
    if (!def || !esCaja("atributo")) {
      return;
    }
    var px = def.w / 100 * tam.w + atributoDelta;
    var centroX = (def.x + def.w / 2) / 100 * tam.w;
    var centroY = (def.y + def.h / 2) / 100 * tam.h;
    boxEls["atributo"].style.left = (centroX - px / 2) + "px";
    boxEls["atributo"].style.top = (centroY - px / 2) + "px";
    boxEls["atributo"].style.width = px + "px";
    boxEls["atributo"].style.height = px + "px";
    if (fAtrSizeVal) {
      fAtrSizeVal.textContent = (atributoDelta > 0 ? "+" : "") + atributoDelta + "px";
    }
  }

  if (fAtrSize) {
    fAtrSize.value = atributoDelta;
    fAtrSize.addEventListener("input", function () {
      atributoDelta = parseInt(fAtrSize.value, 10) || 0;
      localStorage.setItem("ygo-atributo-size", String(atributoDelta));
      aplicarAtributo();
    });
  }
  if (fAtrSizeReiniciar) {
    fAtrSizeReiniciar.addEventListener("click", function () {
      atributoDelta = 0;
      localStorage.removeItem("ygo-atributo-size");
      fAtrSize.value = 0;
      aplicarAtributo();
      fAtrSizeVal.textContent = "0px";
      estado.textContent = "Tamaño de atributo restablecido";
    });
  }

  var fCardtypeX = document.getElementById("f-cardtype-x");
  var fCardtypeXVal = document.getElementById("f-cardtype-x-val");
  var fCardtypeXReiniciar = document.getElementById("f-cardtype-x-reiniciar");
  var cardtypeX = parseFloat(localStorage.getItem("ygo-cardtype-x")) || 51.0;
  var cardtypeSubtipoOffset = 30.02; // subtipo.x - cardtype.x original (81.02 - 51.0)

  var fCorcheteGap = document.getElementById("f-corchete-gap");
  var fCorcheteGapVal = document.getElementById("f-corchete-gap-val");
  var fCorcheteGapReiniciar = document.getElementById("f-corchete-gap-reiniciar");
  var corcheteGap = parseInt(localStorage.getItem("ygo-corchete-gap"), 10) || 5;

  function aplicarCardtypeX() {
    var layout = window.LAYOUTS[window.CONFIG.layout];
    if (layout && layout.cardtype) {
      layout.cardtype.x = cardtypeX;
    }
    if (layout && layout.subtipo) {
      layout.subtipo.x = cardtypeX + cardtypeSubtipoOffset;
    }
    // Mover DOM directamente
    if (boxEls["cardtype"]) {
      boxEls["cardtype"].style.left = cardtypeX + "%";
    }
    if (boxEls["subtipo"]) {
      boxEls["subtipo"].style.left = (cardtypeX + cardtypeSubtipoOffset) + "%";
    }
    if (fCardtypeXVal) {
      fCardtypeXVal.textContent = cardtypeX.toFixed(1) + "%";
    }
  }

  if (fCardtypeX) {
    fCardtypeX.value = cardtypeX;
    fCardtypeX.addEventListener("input", function () {
      cardtypeX = parseFloat(fCardtypeX.value) || 51.0;
      localStorage.setItem("ygo-cardtype-x", String(cardtypeX));
      aplicarCardtypeX();
    });
  }
  if (fCardtypeXReiniciar) {
    fCardtypeXReiniciar.addEventListener("click", function () {
      cardtypeX = 51.0;
      localStorage.setItem("ygo-cardtype-x", String(cardtypeX));
      fCardtypeX.value = cardtypeX;
      aplicarCardtypeX();
      estado.textContent = "Cardtype X restablecido a 51.0%";
    });
  }

  aplicarCardtypeX();

  var fCorcheteGap = document.getElementById("f-corchete-gap");
  var fCorcheteGapVal = document.getElementById("f-corchete-gap-val");
  var fCorcheteGapReiniciar = document.getElementById("f-corchete-gap-reiniciar");
  var corcheteGap = parseInt(localStorage.getItem("ygo-corchete-gap"), 10) || 5;

  function aplicarCorcheteGap() {
    if (fCorcheteGapVal) {
      fCorcheteGapVal.textContent = corcheteGap + "px";
    }
    if (window.CARD && window.CARD.nombre) {
      render();
    }
  }

  if (fCorcheteGap) {
    fCorcheteGap.value = corcheteGap;
    fCorcheteGap.addEventListener("input", function () {
      corcheteGap = parseInt(fCorcheteGap.value, 10) || 0;
      localStorage.setItem("ygo-corchete-gap", String(corcheteGap));
      aplicarCorcheteGap();
    });
  }
  if (fCorcheteGapReiniciar) {
    fCorcheteGapReiniciar.addEventListener("click", function () {
      corcheteGap = 5;
      localStorage.setItem("ygo-corchete-gap", String(corcheteGap));
      fCorcheteGap.value = corcheteGap;
      aplicarCorcheteGap();
      estado.textContent = "Espacio corchete restablecido a 5px";
    });
  }

  aplicarCorcheteGap();

  function aplicarLetras() {
    if (fLetrasVal) {
      fLetrasVal.textContent = Math.round(factorLetras * 100) + "%";
    }
    if (esCaja("nombre")) {
      ajustarNombre(boxEls["nombre"]);
    }
  }

  if (fLetras) {
    fLetras.value = Math.round(factorLetras * 100);
    fLetras.addEventListener("input", function () {
      factorLetras = (parseInt(fLetras.value, 10) || 100) / 100;
      localStorage.setItem("ygo-letras-factor", String(factorLetras));
      aplicarLetras();
    });
  }
  if (fLetrasReiniciar) {
    fLetrasReiniciar.addEventListener("click", function () {
      factorLetras = 1;
      localStorage.removeItem("ygo-letras-factor");
      fLetras.value = 100;
      aplicarLetras();
      fLetrasVal.textContent = "100%";
      estado.textContent = "Aplastamiento de letras restablecido";
    });
  }

  function syncBloquePendulo() {
    bloquePendulo.style.display = esPendulo() ? "" : "none";
    if (esPendulo()) {
      cargarAjusteInputs();
      aplicarAjusteArte();
    }
  }

  var bloqueEstrellas = document.getElementById("ajuste-estrellas");
  var fEstrellas = document.getElementById("f-estrellas");
  var fEstrellasVal = document.getElementById("f-estrellas-val");
  var fEstrellasReiniciar = document.getElementById("f-estrellas-reiniciar");

  function aplicarEstrellas() {
    if (!esCaja("nivel")) {
      return;
    }
    var px = parseInt(fEstrellas.value, 10) || 0;
    boxEls["nivel"].style.transform = "translateX(" + px + "px)";
    fEstrellasVal.textContent = px + "px";
  }

  function claveEstrellas() {
    return "ygo-estrellas-offset";
  }

  function syncBloqueEstrellas() {
    var ok = esCaja("nivel");
    if (bloqueEstrellas) {
      bloqueEstrellas.style.display = ok ? "" : "none";
    }
    if (ok) {
      fEstrellas.value = parseInt(localStorage.getItem(claveEstrellas()), 10) || 0;
      aplicarEstrellas();
    }
  }

  if (fEstrellas) {
    fEstrellas.addEventListener("input", function () {
      aplicarEstrellas();
      localStorage.setItem(claveEstrellas(), String(parseInt(fEstrellas.value, 10) || 0));
    });
  }
  if (fEstrellasReiniciar) {
    fEstrellasReiniciar.addEventListener("click", function () {
      localStorage.removeItem(claveEstrellas());
      fEstrellas.value = 0;
      aplicarEstrellas();
      estado.textContent = "Ajuste de estrellas restablecido";
    });
  }

  if (fArtPos && fArtZoom) {
    fArtPos.addEventListener("input", aplicarAjusteArte);
    fArtZoom.addEventListener("input", aplicarAjusteArte);
  }
  if (fArtGuardar) {
    fArtGuardar.addEventListener("click", function () {
      localStorage.setItem(claveAjusteArte(), JSON.stringify({ pos: +fArtPos.value, zoom: +fArtZoom.value }));
      estado.textContent = "Ajuste de arte péndulo guardado para " + (window.CARD.nombre || "");
    });
  }
  if (fArtReiniciar) {
    fArtReiniciar.addEventListener("click", function () {
      localStorage.removeItem(claveAjusteArte());
      cargarAjusteInputs();
      aplicarAjusteArte();
      estado.textContent = "Ajuste de arte péndulo restablecido";
    });
  }

  if (fAlejar) {
    fAlejar.addEventListener("click", function () {
      applyEscala(Math.max(0.1, escala - 0.05));
      localStorage.setItem("ygo-prev-escala", String(escala));
    });
  }
  if (fAcercar) {
    fAcercar.addEventListener("click", function () {
      applyEscala(Math.min(0.7, escala + 0.05));
      localStorage.setItem("ygo-prev-escala", String(escala));
    });
  }
  if (fEscalaReset) {
    fEscalaReset.addEventListener("click", function () {
      localStorage.removeItem("ygo-prev-escala");
      applyEscala(escalaIni);
    });
  }
  if (fOfsY) {
    fOfsY.value = ofsY;
    fOfsY.addEventListener("input", function () {
      applyDesplazamiento(parseInt(fOfsY.value, 10) || 0);
      localStorage.setItem("ygo-offset-y", String(ofsY));
    });
  }

  var fBuscarTitulo = document.getElementById("f-buscar-titulo");
  if (fBuscarTitulo) {
    fBuscarTitulo.addEventListener("input", function () {
      fBuscarTitulo.dataset.tocado = "1";
    });
  }
  var fBuscarObras = document.getElementById("f-buscar-obras");
  var fObras = document.getElementById("f-obras");
  var fObrasUsar = document.getElementById("f-obras-usar");
  var fObrasDescargar = document.getElementById("f-obras-descargar");
  var API = "https://yugipedia.com/api.php";
  var obrasLista = [];

  function api(urlQuery) {
    return fetch(API + "?" + urlQuery, { method: "GET" }).then(function (r) {
      if (!r.ok) {
        throw new Error("HTTP " + r.status);
      }
      return r.json();
    });
  }

  function obtenerWikitexto(titulo, profundidad) {
    profundidad = profundidad || 0;
    if (profundidad > 3) {
      return Promise.reject(new Error("demasiadas redirecciones"));
    }
    return api("action=query&format=json&prop=revisions&rvprop=content&titles=" + encodeURIComponent(titulo))
      .then(function (j) {
        var pg = null;
        Object.keys(j.query.pages).forEach(function (id) {
          if (!pg && j.query.pages[id].revisions) {
            pg = j.query.pages[id];
          }
        });
        if (!pg) {
          return null;
        }
        var rev = pg.revisions[0];
        var wt = rev.slots && rev.slots.main && rev.slots.main["*"] ? rev.slots.main["*"] : rev["*"];
        wt = wt || "";
        var m = wt.match(/#REDIRECT\s*\[\[([^\]|]+)/i);
        if (m) {
          return obtenerWikitexto("Card Artworks:" + m[1].trim(), profundidad + 1);
        }
        return wt;
      });
  }

  function buscarPagina(titulo) {
    return obtenerWikitexto(titulo).then(function (wt) {
      if (wt != null) {
        return wt;
      }
      return api("action=query&format=json&list=search&srsearch=" + encodeURIComponent(titulo) + "&srnamespace=3012&srlimit=5")
        .then(function (j) {
          var hits = j.query.search || [];
          var cola = hits.map(function (h) { return h.title; });
          function siguiente() {
            if (!cola.length) {
              return Promise.resolve(null);
            }
            return obtenerWikitexto(cola.shift()).then(function (w2) {
              return w2 != null ? w2 : siguiente();
            });
          }
          return siguiente();
        });
    });
  }

  function parsearObras(wt) {
    var lista = [];
    var gal = /<gallery[^>]*>([\s\S]*?)<\/gallery>/gi;
    var gm;
    while ((gm = gal.exec(wt || "")) !== null) {
      gm[1].split("\n").forEach(function (linea) {
        var t = linea.trim();
        if (!t) {
          return;
        }
        var p = t.split("|");
        var file = (p[0] || "").trim();
        var caption = (p[1] || "").trim();
        if (!file) {
          return;
        }
        var score = 0;
        if (/Collector.s cards/i.test(caption)) {
          score += 4;
        }
        if (/NAS anime/i.test(caption)) {
          score += 3;
        }
        if (/1st.*OCG/i.test(caption)) {
          score += 2;
        }
        if (/2nd.*TCG/i.test(caption)) {
          score += 2;
        }
        lista.push({ file: file, caption: caption, score: score, arte: /artwork/i.test(file) });
      });
    }
    lista.sort(function (a, b) {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return (b.arte ? 1 : 0) - (a.arte ? 1 : 0);
    });
    return lista;
  }

  function resolverUrl(file) {
    return api("action=query&format=json&prop=imageinfo&iiprop=url|mime&titles=" + encodeURIComponent("File:" + file))
      .then(function (j) {
        var pg = null;
        Object.keys(j.query.pages).forEach(function (id) {
          if (!pg && j.query.pages[id].imageinfo) {
            pg = j.query.pages[id];
          }
        });
        if (!pg) {
          return null;
        }
        return { url: pg.imageinfo[0].url, mime: pg.imageinfo[0].mime || "" };
      });
  }

  function rellenarObras(lista) {
    fObras.textContent = "";
    var op0 = document.createElement("option");
    op0.value = "";
    op0.textContent = "— Elegir una obra —";
    fObras.appendChild(op0);
    lista.forEach(function (o, i) {
      var op = document.createElement("option");
      op.value = String(i);
      op.textContent = o.file + (o.caption ? "  (" + o.caption + ")" : "");
      fObras.appendChild(op);
    });
  }

  function establecerEstado(mensaje) {
    if (estado) {
      estado.textContent = mensaje;
    }
  }

  if (fBuscarObras && fObras) {
    fBuscarObras.addEventListener("click", function () {
      var titulo = (fBuscarTitulo ? fBuscarTitulo.value : "").trim() || (window.CARD.ingles || window.CARD.nombre || "");
      if (!titulo) {
        establecerEstado("Escribe un título para buscar obras.");
        return;
      }
      establecerEstado("Buscando obras de “" + titulo + "” en Yugipedia…");
      buscarPagina("Card Artworks:" + titulo)
        .then(function (wt) {
          var lista = parsearObras(wt);
          if (!lista.length) {
            fObras.textContent = "";
            establecerEstado("No se encontraron obras para “" + titulo + "”.");
            return;
          }
          return Promise.all(lista.slice(0, 12).map(function (o) {
            return resolverUrl(o.file).then(function (r) {
              o.url = r ? r.url : "";
              o.mime = r ? r.mime : "";
              return o;
            });
          })).then(function (resueltas) {
            obrasLista = resueltas.filter(function (o) {
              return !!o.url;
            });
            if (!obrasLista.length) {
              fObras.textContent = "";
              establecerEstado("Se hallaron ficheros pero no se resolvieron sus URLs.");
              return;
            }
            rellenarObras(obrasLista);
            establecerEstado(obrasLista.length + " obra(s) encontrada(s) para “" + titulo + "”.");
          });
        })
        .catch(function (e) {
          establecerEstado("Error al buscar: " + e.message);
        });
    });

    fObrasUsar.addEventListener("click", function () {
      var idx = parseInt(fObras.value, 10);
      if (isNaN(idx) || !obrasLista[idx]) {
        establecerEstado("Primero elige una obra de la lista.");
        return;
      }
      var o = obrasLista[idx];
      window.CARD.arte = o.url;
      campos["arte"].value = o.url;
      campos["arte"].dispatchEvent(new Event("input", { bubbles: true }));
      render();
      establecerEstado("Obra aplicada: " + o.file);
    });

    fObrasDescargar.addEventListener("click", function () {
      var idx = parseInt(fObras.value, 10);
      if (isNaN(idx) || !obrasLista[idx]) {
        establecerEstado("Primero elige una obra de la lista.");
        return;
      }
      var o = obrasLista[idx];
      var nombre = decodeURIComponent(o.url.split("/").pop());
      establecerEstado("Descargando “" + nombre + "”…");
      var fuentes = [
        o.url,
        "https://corsproxy.io/?url=" + encodeURIComponent(o.url),
        "https://api.allorigins.win/raw?url=" + encodeURIComponent(o.url)
      ];
      var intento = 0;
      function probar() {
        if (intento >= fuentes.length) {
          window.open(o.url, "_blank");
          establecerEstado("No se pudo descargar directamente; se abrió la imagen. Guárdala con clic derecho.");
          return;
        }
        fetch(fuentes[intento])
          .then(function (r) {
            if (!r.ok) {
              throw new Error("HTTP " + r.status);
            }
            return r.blob();
          })
          .then(function (blob) {
            var a = document.createElement("a");
            a.href = URL.createObjectURL(blob);
            a.download = nombre;
            document.body.appendChild(a);
            a.click();
            a.remove();
            setTimeout(function () {
              URL.revokeObjectURL(a.href);
            }, 4000);
            establecerEstado("Descargada: " + nombre);
          })
          .catch(function () {
            intento += 1;
            probar();
          });
      }
      probar();
    });
  }

  var fBuscarCarta = document.getElementById("f-buscar-carta");
  var fBuscarCartaBtn = document.getElementById("f-buscar-carta-btn");
  var fResultados = document.getElementById("f-resultados");
  var fCargarCarta = document.getElementById("f-cargar-carta");

  function limpiarWiki(txt) {
    if (!txt) {
      return "";
    }
    return String(txt)
      .replace(/<ref[\s\S]*?<\/ref>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\{\{[\s\S]*?\}\}/g, "")
      .replace(/\[\[[^\]|]*\|([^\]]*)\]\]/g, "$1")
      .replace(/\[\[([^\]]*)\]\]/g, "$1")
      .replace(/'''+/g, "")
      .replace(/''/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function campo(wt, nombre) {
    var re = new RegExp("(?:^|\\n)\\|\\s*" + nombre + "\\s*=\\s*([\\s\\S]*?)(?=\\n\\||\\n}}|$)", "i");
    var m = wt.match(re);
    return m ? limpiarWiki(m[1]) : "";
  }

  function numero(o) {
    var n = parseInt(String(o).replace(/[^0-9-]/g, ""), 10);
    return isFinite(n) ? n : null;
  }

  function obtenerCardWikitexto(titulo, profundidad) {
    profundidad = profundidad || 0;
    if (profundidad > 3) {
      return Promise.reject(new Error("demasiadas redirecciones"));
    }
    return api("action=query&format=json&prop=revisions&rvprop=content&titles=" + encodeURIComponent(titulo))
      .then(function (j) {
        var pg = null;
        Object.keys(j.query.pages).forEach(function (id) {
          if (!pg && j.query.pages[id].revisions) {
            pg = j.query.pages[id];
          }
        });
        if (!pg) {
          return null;
        }
        var rev = pg.revisions[0];
        var wt = rev.slots && rev.slots.main && rev.slots.main["*"] ? rev.slots.main["*"] : rev["*"];
        wt = wt || "";
        var m = wt.match(/#REDIRECT\s*\[\[([^\]|]+)/i);
        if (m) {
          return obtenerCardWikitexto(m[1].trim(), profundidad + 1);
        }
        return { titulo: pg.title, wt: wt };
      });
  }

  var FLECHA_MAP = {
    "Top-Center": "Up",
    "Top-Left": "UpLeft",
    "Top-Right": "UpRight",
    "Bottom-Center": "Down",
    "Bottom-Left": "DownLeft",
    "Bottom-Right": "DownRight",
    "Left": "Left",
    "Right": "Right",
    "Center-Left": "Left",
    "Center-Right": "Right",
    "Upper-Left": "UpLeft",
    "Upper-Right": "UpRight",
    "Lower-Left": "DownLeft",
    "Lower-Right": "DownRight"
  };

  function aplicarCartaWebResultado(datos) {
    var slug = window.aplicarCartaWeb(datos);
    if (selectCarta) {
      var esNuevo = !selectCarta.querySelector('option[value="' + slug + '"]');
      if (esNuevo) {
        var op = document.createElement("option");
        op.value = slug;
        op.textContent = datos.carta.nombre + " (web)";
        selectCarta.appendChild(op);
      }
      selectCarta.value = slug;
    }
    syncInputs();
    construirCajas();
    render();
    actualizarEstado();
    establecerEstado("Carta cargada: " + datos.carta.nombre + "  →  layout " + datos.layout);
  }

  function cargarCartaResultado() {
    var titulo = fResultados ? fResultados.value : "";
    if (!titulo) {
      establecerEstado("Elige un resultado de la lista.");
      return;
    }
    establecerEstado("Cargando " + titulo + "…");
    obtenerCardWikitexto(titulo)
      .then(function (r) {
        if (!r) {
          establecerEstado("Sin datos para " + titulo);
          return null;
        }
        var wt = r.wt;
        if (!/CardTable2/i.test(wt)) {
          establecerEstado("«" + r.titulo + "» no parece ser una página de carta.");
          return null;
        }
        return r;
      })
      .then(function (r) {
        if (!r) {
          return;
        }
        var wt = r.wt;
        var nombre = campo(wt, "es_name") || r.titulo;
        var cardType = campo(wt, "card_type");
        var attribute = campo(wt, "attribute");
        var types = campo(wt, "types");
        var atk = numero(campo(wt, "atk"));
        var def = numero(campo(wt, "def"));
        var password = campo(wt, "password");
        var texto = campo(wt, "es_text");
        var arterPrevia = window.CARD.arte || "";
        var copyright = window.CARD.copyright || "";

        var carta;
        var layout;
        var esSpell = /^spell/i.test(cardType);
        var esTrap = /^trap/i.test(cardType);

        if (esSpell || esTrap) {
          layout = esSpell ? "magica" : "trampa";
          carta = {
            nombre: nombre,
            atributo: esSpell ? "SPELL" : "TRAP",
            subtipo: campo(wt, "property"),
            habilidad: "",
            tipo: "",
            texto: texto,
            atk: "",
            def: "",
            arte: arterPrevia,
            numero: "",
            password: password,
            copyright: copyright
          };
        } else {
          var tokens = types.split("/").map(function (t) {
            return t.trim();
          }).filter(Boolean);
          var tipo = tokens[0] || "";
          var habilidadTokens = tokens.slice(1).filter(function (t) {
            return /(Normal|Effect|Fusion|Synchro|Xyz|Link|Ritual|Pendulum|Tuner|Toon|Spirit|Union|Gemini|Flip|Token)/i.test(t);
          });
          var habilidad = habilidadTokens.join(" / ") || "Normal";
          var esPendulo = /Pendulum/i.test(habilidad);
          var esLink = /Link/i.test(habilidad);
          var esXyz = /Xyz/i.test(habilidad);
          var esRitual = /Ritual/i.test(habilidad);
          var esFusion = /Fusion/i.test(habilidad);
          var esSynchro = /Synchro/i.test(habilidad);

          carta = {
            nombre: nombre,
            atributo: attribute,
            subtipo: "",
            habilidad: habilidad,
            tipo: tipo,
            texto: texto,
            atk: atk,
            def: esLink ? "" : def,
            arte: arterPrevia,
            numero: "",
            password: password,
            copyright: copyright
          };

          if (esPendulo) {
            layout = /Normal/i.test(habilidad) ? "pendulum-normal" : "pendulum-efecto";
            carta.pscale = numero(campo(wt, "pendulum_scale"));
            carta.ptexto = campo(wt, "es_pendulum_effect");
          } else if (esLink) {
            layout = "monstruo-link";
            var flechas = campo(wt, "link_arrows").split(",").map(function (s) {
              return s.trim();
            }).filter(Boolean).map(function (s) {
              return FLECHA_MAP[s] || null;
            }).filter(Boolean);
            carta.flechas = flechas.join(",");
            carta.link = numero(campo(wt, "link")) || flechas.length;
          } else if (esXyz) {
            layout = "monstruo-xyz";
            carta.rango = numero(campo(wt, "rank"));
          } else if (esRitual) {
            layout = "monstruo-ritual";
            carta.nivel = numero(campo(wt, "level"));
          } else if (esFusion) {
            layout = "monstruo-fusion";
            carta.nivel = numero(campo(wt, "level"));
          } else if (esSynchro) {
            layout = "monstruo-synchro";
            carta.nivel = numero(campo(wt, "level"));
          } else if (/Token/i.test(habilidad)) {
            layout = "monstruo-token";
          } else if (/Normal/i.test(habilidad)) {
            layout = "monstruo-normal";
          } else {
            layout = "monstruo-efecto";
          }

          if (!carta.nivel && !carta.rango && !esLink && !esPendulo) {
            carta.nivel = numero(campo(wt, "level"));
          }
        }

        var base = window.CONFIG_BASE[layout];
        if (!base) {
          base = "assets/base/monster_normal.png";
        }
        aplicarCartaWebResultado({ base: base, layout: layout, carta: carta });
      })
      .catch(function (e) {
        establecerEstado("Error al cargar: " + e.message);
      });
  }

  if (fBuscarCartaBtn && fResultados) {
    fBuscarCartaBtn.addEventListener("click", function () {
      var q = (fBuscarCarta ? fBuscarCarta.value : "").trim();
      if (!q) {
        establecerEstado("Escribe un nombre para buscar.");
        return;
      }
      establecerEstado("Buscando “" + q + "”…");
      api("action=query&format=json&list=search&srnamespace=0&srlimit=12&srsearch=" + encodeURIComponent(q))
        .then(function (j) {
          var hits = j.query.search || [];
          fResultados.textContent = "";
          if (!hits.length) {
            fResultados.appendChild(document.createElement("option"));
            fResultados.options[0].textContent = "— sin resultados —";
            establecerEstado("Sin resultados para “" + q + "”.");
            return;
          }
          hits.forEach(function (h) {
            var op = document.createElement("option");
            op.value = h.title;
            op.textContent = h.title;
            fResultados.appendChild(op);
          });
          establecerEstado(hits.length + " resultado(s). Elige uno y pulsa «Rellenar carta».");
        })
        .catch(function (e) {
          establecerEstado("Error al buscar: " + e.message);
        });
    });

    fCargarCarta.addEventListener("click", cargarCartaResultado);
  }

  if (selectCarta) {
    Object.keys(window.CARTAS).forEach(function (nombre) {
      var op = document.createElement("option");
      op.value = nombre;
      op.textContent = window.CARTAS[nombre].etiqueta;
      selectCarta.appendChild(op);
    });
    selectCarta.addEventListener("change", function () {
      window.cargarPreset(selectCarta.value);
      syncInputs();
      construirCajas();
      render();
      actualizarEstado();
    });
  }

  function actualizarEstado() {
    var lineas = [];
    lineas.push((debug ? "MODO DEBUG activo. " : "") + "Layout: " + window.CONFIG.layout + " · Marco: " + tam.w + "x" + tam.h + " · Escala: " + escala.toFixed(4));
    lineas.push("Assets de referencia: daominah.github.io (BSD-2-Clause) · Fuentes Master Duel");
    estado.textContent = lineas.join("  |  ");
  }

  construirCajas();
  syncInputs();
  render();
  actualizarEstado();

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () {
      render();
      actualizarEstado();
    });
  }
})();