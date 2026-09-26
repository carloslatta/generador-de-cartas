(function () {
  var API = "https://yugipedia.com/api.php";

  var q = document.getElementById("q");
  var resultados = document.getElementById("resultados");
  var btnBuscar = document.getElementById("btn-buscar");
  var btnArmar = document.getElementById("btn-armar");
  var btnGuardar = document.getElementById("btn-guardar");
  var card = document.getElementById("card");
  var estado = document.getElementById("estado");
  var fich = document.getElementById("fich");
  var obrasDiv = null;
  var infoNombre = document.getElementById("info-nombre");
  var infoDetalles = document.getElementById("info-detalles");

  card.style.width = "1180px";
  card.style.height = "1720px";

  var factorLetras = 1;

  var ATTRS = {
    DARK: "assets/icons/attr_DARK.png",
    DIVINE: "assets/icons/attr_DIVINE.png",
    EARTH: "assets/icons/attr_EARTH.png",
    FIRE: "assets/icons/attr_FIRE.png",
    LIGHT: "assets/icons/attr_LIGHT.png",
    WATER: "assets/icons/attr_WATER.png",
    WIND: "assets/icons/attr_WIND.png",
    SPELL: "assets/icons/attr_SPELL.png",
    TRAP: "assets/icons/attr_TRAP.png"
  };
  var TIPOS_ES = {
    "Fiend": "Demonio",
    "Spellcaster": "Lanzador de Conjuros",
    "Dragon": "Dragón",
    "Warrior": "Guerrero",
    "Beast": "Bestia",
    "Beast-Warrior": "Bestia Guerrera",
    "Dinosaur": "Dinosaurio",
    "Zombie": "Zombie",
    "Machine": "Máquina",
    "Aqua": "Aqua",
    "Fish": "Pez",
    "Sea Serpent": "Serpiente Marina",
    "Reptile": "Reptil",
    "Psychic": "Psíquico",
    "Pyro": "Piro",
    "Rock": "Roca",
    "Thunder": "Trueno",
    "Winged Beast": "Bestia Alada",
    "Plant": "Planta",
    "Insect": "Insecto",
    "Fairy": "Hada",
    "Divine-Beast": "Bestia Divina",
    "Creator-God": "Dios Creador",
    "Wyrm": "Guiverno",
    "Cyberse": "Ciberso"
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
  var FLECHA_MAP = {
    "Top-Center": "Up", "Top-Left": "UpLeft", "Top-Right": "UpRight",
    "Bottom-Center": "Down", "Bottom-Left": "DownLeft", "Bottom-Right": "DownRight",
    "Left": "Left", "Right": "Right",
    "Center-Left": "Left", "Center-Right": "Right",
    "Upper-Left": "UpLeft", "Upper-Right": "UpRight",
    "Lower-Left": "DownLeft", "Lower-Right": "DownRight"
  };

  var boxEls = {};

  var busquedaToken = 0;
  var armarToken = null;
  var armarProgramado = null;
  var cartasBuscador = {};   // nombreEN -> CartaNormalizada (para armar sin wikitexto)
  var FLECHA_MAP_YGO = {
    "Top": "Up", "Bottom": "Down", "Left": "Left", "Right": "Right",
    "Top-Left": "UpLeft", "Top-Right": "UpRight",
    "Bottom-Left": "DownLeft", "Bottom-Right": "DownRight"
  };

  var ALIASES = {
    "llamada de los condenados": "Call of the Haunted",
    "call of the haunted": "Call of the Haunted",
    "convoca al craneo": "Summoned Skull",
    "convoca a el craneo": "Summoned Skull",
    "convocar al craneo": "Summoned Skull",
    "convocar a el craneo": "Summoned Skull",
    "craneo convocado": "Summoned Skull"
  };

  function sinTildes(s) {
    return String(s || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();
  }

  function debounce(fn, ms) {
    var t = null;
    return function () {
      var a = arguments;
      clearTimeout(t);
      t = setTimeout(function () {
        fn.apply(null, a);
      }, ms);
    };
  }

  function api(consulta) {
    return fetch(API + "?" + consulta, { method: "GET" }).then(function (r) {
      if (!r.ok) {
        throw new Error("HTTP " + r.status);
      }
      return r.json();
    });
  }

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

  function obtenerWikitexto(titulo, prefijo, profundidad) {
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
          return obtenerWikitexto(prefijo + m[1].trim(), prefijo, profundidad + 1);
        }
        return { titulo: pg.title, wt: wt };
      });
  }

  /* ---------- render ---------- */

  function construir() {
    card.innerHTML = "";
    boxEls = {};
    var layout = window.LAYOUTS[window.CONFIG.layout];
    var marco = document.createElement("div");
    marco.className = "marco";
    marco.style.backgroundImage = "url('" + window.CONFIG.base + "')";
    card.appendChild(marco);

    var capaArte = document.createElement("div");
    capaArte.className = "capa-arte";
    var capaFront = document.createElement("div");
    capaFront.className = "capa-front";
    card.appendChild(capaArte);
    card.appendChild(capaFront);

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
      var capa = caja === "arte" || caja === "p-arte" ? capaArte : capaFront;
      capa.appendChild(el);
      boxEls[caja] = el;
    });
  }

  function esCaja(caja) {
    return Object.prototype.hasOwnProperty.call(boxEls, caja);
  }

  function imagen(caja, src) {
    boxEls[caja].textContent = "";
    var img = document.createElement("img");
    img.src = src;
    img.alt = "";
    boxEls[caja].appendChild(img);
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
      // Para p-arte (péndulos): alinear borde superior de la imagen con el borde superior del agujero
      if (el.classList && el.classList.contains("p-arte")) {
        img.style.objectPosition = "50% 0%";
      }
    } else {
      img.removeAttribute("src");
      img.style.visibility = "hidden";
    }
  }

  function formatearTipo(tipo, habilidad) {
    var tipoEs = TIPOS_ES[tipo] || tipo;
    return "[ " + tipoEs + " / " + (habilidad || "Normal").trim() + " ]";
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
    medidor.style.fontWeight = cs.fontWeight;
    medidor.style.letterSpacing = "0px";
    medidor.textContent = texto;
    document.body.appendChild(medidor);

try {
      var fontSize = 116;
      medidor.style.fontSize = fontSize + "px";
      var anchoTextoReal = medidor.getBoundingClientRect().width;
      console.log("[AJUSTAR] ancho disp:", anchoDisponible, "| texto real:", anchoTextoReal, "| fontSize:", fontSize);

      // 1) Letter-spacing -1..-8
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
        console.log("[AJUSTAR] letter-spacing:", mejorLetterSpacing, "| nuevo ancho:", anchoTextoReal);
      }

      // 2) Reducir font-size 116 -> 80
      if (anchoTextoReal > anchoDisponible) {
        for (fontSize = 115; fontSize >= 80; fontSize--) {
          medidor.style.fontSize = fontSize + "px";
          anchoTextoReal = medidor.getBoundingClientRect().width;
          if (anchoTextoReal <= anchoDisponible) {
            break;
          }
        }
        el.style.fontSize = fontSize + "px";
        console.log("[AJUSTAR] fontSize reducido a:", fontSize, "| ancho:", anchoTextoReal);
      }

      // 3) Compresión forzada por factorLetras (si ≠ 1)
      var fl = (typeof window.factorLetras === "number" && window.factorLetras > 0) ? window.factorLetras : 1;
      if (fl !== 1) {
        el.style.transform = "scaleX(" + fl + ")";
        el.style.transformOrigin = "left center";
        console.log("[AJUSTAR] scaleX forzado por factorLetras:", fl);
      } else if (anchoTextoReal > anchoDisponible) {
        // 3b) Último recurso: scaleX por desbordamiento
        var factorEscalaX = anchoDisponible / anchoTextoReal;
        var fl2 = (typeof window.factorLetras === "number" && window.factorLetras > 0) ? window.factorLetras : 1;
        el.style.transform = "scaleX(" + (factorEscalaX * fl2) + ")";
        el.style.transformOrigin = "left center";
        console.log("[AJUSTAR] scaleX por desbordamiento:", factorEscalaX * fl2);
      }
    } finally {
      document.body.removeChild(medidor);
    }
  }

  function render() {
    var c = window.CARD;
    var meta = (window.LAYOUTS[window.CONFIG.layout] || {}).meta || { tipo: "monstruo" };
    var tipo = meta.tipo;
    var esNormal = !!meta.esNormal || c.habilidad === "Normal";
    var nombreClaro = tipo === "spell" || tipo === "trap" || tipo === "xyz" || tipo === "link";

    // Leer ajustes del editor (localStorage)
    var ofsY = parseInt(localStorage.getItem("ygo-offset-y"), 10) || 0;
    var anchoNombreDelta = parseInt(localStorage.getItem("ygo-nombre-ancho"), 10) || 0;
    var atributoDelta = parseInt(localStorage.getItem("ygo-atributo-size"), 10) || 0;
    var factorLetras = parseFloat(localStorage.getItem("ygo-letras-factor"));
    if (isNaN(factorLetras)) { factorLetras = 1; }
    window.factorLetras = factorLetras;

    var cardtypeX = parseFloat(localStorage.getItem("ygo-cardtype-x")) || 51.0;
    var layoutCardtype = (window.LAYOUTS[window.CONFIG.layout] || {}).cardtype;
    if (layoutCardtype) {
      layoutCardtype.x = cardtypeX;
    }

    var corcheteGap = parseInt(localStorage.getItem("ygo-corchete-gap"), 10) || 5;
    window.corcheteGap = corcheteGap;

    // Aplicar offset Y global
    if (ofsY !== 0) {
      var capaArte = document.querySelector(".capa-arte");
      var capaFront = document.querySelector(".capa-front");
      if (capaArte) {
        capaArte.style.transform = "translateY(" + ofsY + "px)";
      }
      if (capaFront) {
        capaFront.style.transform = "translateY(" + ofsY + "px)";
      }
    }

    // Aplicar ancho nombre (delta en px) — clampeado a base + 375 px máx.
    if (anchoNombreDelta !== 0 && esCaja("nombre")) {
      var defNombre = (window.LAYOUTS[window.CONFIG.layout] || {}).nombre;
      if (defNombre) {
        var basePx = defNombre.w / 100 * 1180;
        var nuevoAncho = basePx + anchoNombreDelta;
        var MAX_ANCHO = basePx + 375;
        if (nuevoAncho > MAX_ANCHO) { nuevoAncho = MAX_ANCHO; }
        if (nuevoAncho < 100) { nuevoAncho = 100; }
        boxEls["nombre"].style.width = nuevoAncho + "px";
      }
    }

    // Aplicar tamaño atributo (centrado)
    if (atributoDelta !== 0 && esCaja("atributo")) {
      var defAtr = (window.LAYOUTS[window.CONFIG.layout] || {}).atributo;
      if (defAtr) {
        var px = defAtr.w / 100 * 1180 + atributoDelta;
        var centroX = (defAtr.x + defAtr.w / 2) / 100 * 1180;
        var centroY = (defAtr.y + defAtr.h / 2) / 100 * 1720;
        boxEls["atributo"].style.left = (centroX - px / 2) + "px";
        boxEls["atributo"].style.top = (centroY - px / 2) + "px";
        boxEls["atributo"].style.width = px + "px";
        boxEls["atributo"].style.height = px + "px";
      }
    }

    if (esCaja("nombre")) {
      var nombreTexto = sinTildes(c.nombre || "");
      boxEls["nombre"].textContent = nombreTexto;
      boxEls["nombre"].style.color = nombreClaro ? "#fff" : "#000";
      console.log("[RENDER] Ajustando nombre:", nombreTexto, "| ancho caja:", boxEls["nombre"].clientWidth, "| factorLetras:", window.factorLetras);
      ajustarNombre(boxEls["nombre"]);
    }

    if (esCaja("atributo")) {
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
      var estrellasOffset = parseInt(localStorage.getItem("ygo-estrellas-offset"), 10) || 0;
      if (estrellasOffset !== 0) {
        boxEls["nivel"].style.transform = "translateX(" + estrellasOffset + "px)";
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
      var estrellasOffset = parseInt(localStorage.getItem("ygo-estrellas-offset"), 10) || 0;
      if (estrellasOffset !== 0) {
        boxEls["rango"].style.transform = "translateX(" + estrellasOffset + "px)";
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
        boxEls["cardtype"].innerHTML = "[" + label + " <img src='" + icono + "' style='height:1.1em;vertical-align:middle;margin:0 2px;'>]";
        if (esCaja("subtipo")) { boxEls["subtipo"].textContent = ""; }
      } else {
        boxEls["cardtype"].textContent = (tipo === "spell" ? "[ spell card ]" : "[ trap card ]");
        if (esCaja("subtipo")) { boxEls["subtipo"].textContent = ""; }
      }
      boxEls["cardtype"].style.color = "#000";
      if (tipo === "trap") {
        boxEls["cardtype"].style.paddingLeft = "19px";
      } else {
        boxEls["cardtype"].style.paddingLeft = "0";
      }
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
      flechasArr = String(c.flechas).split(",").map(function (s) {
        return s.trim();
      }).filter(Boolean);
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
  }

  /* ---------- autollenado desde CardTable2 ---------- */

  function interpretarYArreglar(wt, titulo) {
    var nombre = campo(wt, "es_name") || titulo;
    var cardType = campo(wt, "card_type");
    var attribute = campo(wt, "attribute");
    var types = campo(wt, "types");
    var texto = campo(wt, "es_text");
    var password = campo(wt, "password");
    var atk = numero(campo(wt, "atk"));
    var def = numero(campo(wt, "def"));
    var carte;
    var layout;
    var esSpell = /^spell/i.test(cardType);
    var esTrap = /^trap/i.test(cardType);

    if (esSpell || esTrap) {
      layout = esSpell ? "magica" : "trampa";
      carte = {
        nombre: nombre,
        atributo: esSpell ? "SPELL" : "TRAP",
        subtipo: campo(wt, "property"),
        habilidad: "",
        tipo: "",
        texto: texto,
        atk: "",
        def: "",
        arte: "",
        numero: "",
        password: password,
        copyright: "©1996-2026 Konami"
      };
    } else {
      var tokens = types.split("/").map(function (t) {
        return t.trim();
      }).filter(Boolean);
      var tipo = tokens[0] || "";
      var habilidad = tokens.slice(1).filter(function (t) {
        return /(Normal|Effect|Fusion|Synchro|Xyz|Link|Ritual|Pendulum|Tuner|Toon|Spirit|Union|Gemini|Flip|Token)/i.test(t);
      }).join(" / ") || "Normal";
      var esPendulo = /Pendulum/i.test(habilidad);
      var esLink = /Link/i.test(habilidad);
      var esXyz = /Xyz/i.test(habilidad);
      var esRitual = /Ritual/i.test(habilidad);
      var esFusion = /Fusion/i.test(habilidad);
      var esSynchro = /Synchro/i.test(habilidad);

      carte = {
        nombre: nombre,
        atributo: attribute,
        subtipo: "",
        habilidad: habilidad,
        tipo: tipo,
        texto: texto,
        atk: atk,
        def: esLink ? "" : def,
        arte: "",
        numero: "",
        password: password,
        copyright: "©1996-2026 Konami"
      };

      if (esPendulo) {
        layout = /Normal/i.test(habilidad) ? "pendulum-normal" : "pendulum-efecto";
        carte.pscale = numero(campo(wt, "pendulum_scale"));
        carte.ptexto = campo(wt, "es_pendulum_effect");
      } else if (esLink) {
        layout = "monstruo-link";
        var flechas = campo(wt, "link_arrows").split(",").map(function (s) {
          return s.trim();
        }).filter(Boolean).map(function (s) {
          return FLECHA_MAP[s] || null;
        }).filter(Boolean);
        carte.flechas = flechas.join(",");
        carte.link = numero(campo(wt, "link")) || flechas.length;
      } else if (esXyz) {
        layout = "monstruo-xyz";
        carte.rango = numero(campo(wt, "rank"));
      } else if (esRitual) {
        layout = "monstruo-ritual";
        carte.nivel = numero(campo(wt, "level"));
      } else if (esFusion) {
        layout = "monstruo-fusion";
        carte.nivel = numero(campo(wt, "level"));
      } else if (esSynchro) {
        layout = "monstruo-synchro";
        carte.nivel = numero(campo(wt, "level"));
      } else if (/Token/i.test(habilidad)) {
        layout = "monstruo-token";
      } else if (/Normal/i.test(habilidad)) {
        layout = "monstruo-normal";
      } else {
        layout = "monstruo-efecto";
      }

      if (carte.nivel === undefined && carte.rango === undefined && !esLink && !esPendulo) {
        carte.nivel = numero(campo(wt, "level"));
      }
    }

    var base = window.CONFIG_BASE[layout] || "assets/base/monster_normal.png";
    return { layout: layout, base: base, carta: carte };
  }

  function resolverUrlArchivo(nombreArchivo) {
    return api("action=query&format=json&prop=imageinfo&iiprop=url|mime&titles=" + encodeURIComponent("File:" + nombreArchivo))
      .then(function (j) {
        var pg = null;
        Object.keys(j.query.pages).forEach(function (id) {
          if (!pg && j.query.pages[id].imageinfo) {
            pg = j.query.pages[id];
          }
        });
        return pg ? { url: pg.imageinfo[0].url, mime: pg.imageinfo[0].mime || "" } : null;
      });
  }

  function parsearObras(wt) {
    var lista = [];
    var gal = /<gallery[^>]*>([\s\S]*?)<\/gallery>/gi;
    var gm;
    while ((gm = gal.exec(wt || "")) !== null) {
      gm[1].split("\n").forEach(function (linea) {
        var t = linea.trim();
        if (!t) { return; }
        var p = t.split("|");
        var file = (p[0] || "").trim();
        var caption = (p[1] || "").trim();
        if (!file) { return; }
        var score = 0;
        if (/Collector.s cards/i.test(caption)) { score += 4; }
        if (/NAS anime/i.test(caption)) { score += 3; }
        if (/1st.*OCG/i.test(caption)) { score += 2; }
        if (/2nd.*TCG/i.test(caption)) { score += 2; }
        lista.push({ file: file, caption: caption, score: score, arte: /artwork/i.test(file) });
      });
    }
    lista.sort(function (a, b) {
      if (b.score !== a.score) { return b.score - a.score; }
      return (b.arte ? 1 : 0) - (a.arte ? 1 : 0);
    });
    return lista;
  }

  function cargarMejorObra(titulo) {
    return obtenerWikitexto("Card Artworks:" + titulo, "Card Artworks:")
      .then(function (r) {
        var lista = parsearObras(r ? r.wt : "");
        if (!lista.length) { return null; }
        return Promise.all(lista.slice(0, 5).map(function (o) {
          return resolverUrlArchivo(o.file).then(function (u) {
            o.url = u ? u.url : "";
            return o;
          });
        })).then(function (res) {
          var conUrl = res.filter(function (o) { return !!o.url; });
          return conUrl.length ? conUrl[0].url : null;
        });
      });
  }

  function arteDesdeYGOProDeck(password, nombreIgles) {
    var consulta = null;
    if (password && /^\d+$/.test(password)) {
      consulta = "cardinfo.php?id=" + encodeURIComponent(password);
    } else if (nombreIgles) {
      consulta = "cardinfo.php?name=" + encodeURIComponent(nombreIgles);
    }
    if (!consulta) { return Promise.resolve(null); }
    return fetch("/api?url=" + encodeURIComponent("https://db.ygoprodeck.com/api/v7/" + consulta), { headers: { "User-Agent": "YGODeckGenerator/1.0" } })
      .then(function (r) {
        if (!r.ok) { return null; }
        return r.json();
      })
      .then(function (j) {
        if (!j || !j.data || !j.data.length) { return null; }
        var card = j.data[0];
        if (!card.card_images || !card.card_images.length) { return null; }
        return card.card_images[0].image_url_cropped || card.card_images[0].image_url || null;
      })
      .catch(function () { return null; });
  }

  function detallesDeCarta(c) {
    var meta = (window.LAYOUTS[window.CONFIG.layout] || {}).meta || {};
    var piezas = [];
    piezas.push(meta.tipo);
    if (c.nivel) { piezas.push("Nivel " + c.nivel); }
    if (c.rango) { piezas.push("Rango " + c.rango); }
    if (c.link) { piezas.push("LINK-" + c.link); }
    if (c.atk !== "" && c.atk != null) { piezas.push("ATK/" + c.atk); }
    if (c.def !== "" && c.def != null) { piezas.push("DEF/" + c.def); }
    if (c.pscale) { piezas.push("Escala " + c.pscale); }
    piezas.push('[' + (c.tipo || "") + ' / ' + (c.habilidad || "Normal") + ']');
    return piezas.join(" · ");
  }

  /* ---------- armar desde CartaNormalizada (Buscador) ---------- */

  function armarDesdeBuscador(c, opts) {
    opts = opts || {};
    armarToken = c.nombreEN || c.nombre;
    estado.textContent = (opts.auto ? "Previsualizando " : "Cargando ") + (c.nombre || c.nombreEN) + "…";
    var layout = layoutDesdeBuscador(c);
    var base = window.CONFIG_BASE[layout] || "assets/base/monster_normal.png";
    window.CONFIG.base = base;
    window.CONFIG.layout = layout;
    window.CARD = cartaDesdeBuscador(c);
    construir();
    render();
    infoNombre.textContent = c.nombre || c.nombreEN || "";
    infoDetalles.textContent = detallesDeCarta(window.CARD);
    if (!fich.value || fich.dataset.tocado !== "1") {
      fich.value = (c.nombre || c.nombreEN || "carta").replace(/[\\/:*?"<>|]+/g, "_");
    }
    fich.dataset.tocado = "0";
    btnGuardar.style.display = "";
    if (c.arte) {
      window.CARD.arte = c.arte;
      render();
      estado.textContent = "Lista con artwork. Guarda el PNG.";
    } else {
      estado.textContent = "Lista (sin artwork). Guarda el PNG.";
    }
  }

  function layoutDesdeBuscador(c) {
    if (c.esSpellTrap) {
      return c.atributo === "TRAP" || (c.frameType || "").indexOf("trap") !== -1 ? "trampa" : "magica";
    }
    var ft = String(c.frameType || "");
    var pendulo = ft.indexOf("pendulum") !== -1;
    if (pendulo) {
      return /normal/i.test(c.habilidad) ? "pendulum-normal" : "pendulum-efecto";
    }
    if (/link/i.test(ft)) { return "monstruo-link"; }
    if (/xyz/i.test(ft)) { return "monstruo-xyz"; }
    if (/ritual/i.test(ft)) { return "monstruo-ritual"; }
    if (/fusion/i.test(ft)) { return "monstruo-fusion"; }
    if (/synchro/i.test(ft)) { return "monstruo-synchro"; }
    if (/token/i.test(ft) || /token/i.test(c.habilidad)) { return "monstruo-token"; }
    if (c.habilidad === "Normal" || /normal/i.test(ft)) { return "monstruo-normal"; }
    return "monstruo-efecto";
  }

  function cartaDesdeBuscador(c) {
    var es = c.esSpellTrap;
    var base = {
      nombre: c.nombre || c.nombreEN || "",
      atributo: es ? (c.atributo === "SPELL" ? "SPELL" : "TRAP") : (c.atributo || ""),
      subtipo: es ? (c.subtipo || "") : "",
      habilidad: es ? "" : (c.habilidad || "Normal"),
      tipo: es ? "" : (c.tipo || ""),
      texto: c.texto || "",
      atk: es ? "" : (c.atk != null ? c.atk : ""),
      def: es ? "" : (c.link ? "" : (c.def != null ? c.def : "")),
      arte: "",
      numero: "",
      password: c.password || "",
      copyright: "©1996-2026 Konami"
    };
    if (es) { return base; }
    var ft = String(c.frameType || "").toLowerCase();
    if (ft.indexOf("pendulum") !== -1) {
      base.pscale = c.pscale || "";
      base.ptexto = c.ptexto || "";
    }
    if (ft.indexOf("link") !== -1) {
      base.link = c.link || 0;
      base.flechas = (c.linkmarkers || []).map(function (m) {
        return FLECHA_MAP_YGO[m] || null;
      }).filter(Boolean).join(",");
      base.def = "";
    } else if (ft.indexOf("xyz") !== -1) {
      base.rango = c.rango || 0;
    } else if (c.nivel) {
      base.nivel = c.nivel;
    }
    return base;
  }

  function armarCarta(titulo, opts) {
    opts = opts || {};
    var cartaBuscador = cartasBuscador[titulo];
    if (cartaBuscador) {
      armarDesdeBuscador(cartaBuscador, opts);
      return;
    }
    armarToken = titulo;
    estado.textContent = (opts.auto ? "Previsualizando " : "Cargando ") + titulo + "…";
    obtenerWikitexto(titulo, "")
      .then(function (r) {
        if (!r || !/CardTable2/i.test(r.wt)) {
          throw new Error("«" + titulo + "» no es una página de carta.");
        }
        var d = interpretarYArreglar(r.wt, r.titulo);
        window.CONFIG.base = d.base;
        window.CONFIG.layout = d.layout;
        window.CARD = Object.assign({}, d.carta);
        construir();
        render();
        infoNombre.textContent = d.carta.nombre;
        infoDetalles.textContent = detallesDeCarta(d.carta);
        if (!fich.value || fich.dataset.tocado !== "1") {
          fich.value = d.carta.nombre.replace(/[\\/:*?"<>|]+/g, "_");
        }
        fich.dataset.tocado = "0";
        btnGuardar.style.display = "";
        estado.textContent = "Lista. Buscando artwork…";
        var nombreIgles = campo(r.wt, "name") || r.titulo;
        return arteDesdeYGOProDeck(d.carta.password, nombreIgles)
          .then(function (url) {
            return url || cargarMejorObra(r.titulo);
          });
      })
      .then(function (urlObra) {
        if (urlObra) {
          window.CARD.arte = urlObra;
          render();
          estado.textContent = "Lista con artwork. Guarda el PNG.";
        } else {
          estado.textContent = "Lista (sin artwork encontrado). Guarda el PNG.";
        }
      })
      .catch(function (e) {
        estado.textContent = "Error: " + e.message;
      });
  }

  /* ---------- exportar PNG ---------- */

  function blobToDataURL(b) {
    return new Promise(function (res, rej) {
      var fr = new FileReader();
      fr.onload = function () { res(fr.result); };
      fr.onerror = rej;
      fr.readAsDataURL(b);
    });
  }

  function leerImagen(src) {
    return fetch(/^https?:/i.test(src) ? "/obra?url=" + encodeURIComponent(src) : src)
      .then(function (r) {
        if (!r.ok) {
          throw new Error("img " + r.status);
        }
        return r.blob();
      })
      .then(blobToDataURL);
  }

  function inlineEstilos(el) {
    var cs = getComputedStyle(el);
    var previo = el.getAttribute("style") || "";
    var css = (cs.cssText || "").trim();
    el.setAttribute("style", [previo, css].filter(Boolean).join(";"));
    Array.prototype.forEach.call(el.children, inlineEstilos);
  }

  function cssPagina() {
    var links = Array.prototype.map.call(document.querySelectorAll('link[rel="stylesheet"]'), function (l) {
      return l.getAttribute("href") || "";
    }).filter(Boolean);
    return Promise.all(links.map(function (href) {
      return fetch(href).then(function (r) { return r.ok ? r.text() : ""; }).catch(function () { return ""; });
    })).then(function (textos) {
      var extra = "";
      Array.prototype.forEach.call(document.querySelectorAll("style"), function (s) {
        extra += "\n" + s.textContent;
      });
      return textos.concat([extra]).join("\n").replace(/@font-face\s*\{[^}]*\}/g, "");
    });
  }

  async function reemplazarFondos(el) {
    var bg = (el.style && el.style.backgroundImage) || "";
    if (bg && bg !== "none") {
      var m = bg.match(/url\(\s*["']?([^"')]+)["']?\s*\)/);
      if (m) {
        try {
          el.style.backgroundImage = "url(" + await leerImagen(m[1]) + ")";
        } catch (e) {
          el.style.backgroundImage = "none";
        }
      }
    }
    for (var i = 0; i < el.children.length; i++) {
      await reemplazarFondos(el.children[i]);
    }
  }

  function fuentesInline() {
    var defs = [
      ["fontCardName", "assets/fonts/YGOSmallCaps.ttf", "truetype"],
      ["fontCardNameHashFix", "assets/fonts/YGOSmallCapsHashFix.ttf", "truetype"],
      ["fontCardEffect", "assets/fonts/YGO_Card_NA.ttf", "truetype"],
      ["fontCardType", "assets/fonts/StoneSerifSmallCapsBold.ttf", "truetype"],
      ["fontATKValue", "assets/fonts/MatrixRegular.ttf", "truetype"],
      ["fontLink", "assets/fonts/FOT-KafuTechnoStd-H.otf", "opentype"]
    ];
    return Promise.all(defs.map(function (d) {
      return fetch(d[1]).then(function (r) {
        return r.blob();
      }).then(blobToDataURL).then(function (url) {
        return '@font-face{font-family:"' + d[0] + '";src:url(' + url + ') format("' + d[2] + '");}';
      }).catch(function () {
        return "";
      });
    })).then(function (partes) {
      return partes.join("");
    });
  }

  function xmlSerializar(el) {
    return new XMLSerializer().serializeToString(el);
  }

  async function exportarPNG() {
    estado.textContent = "Generando PNG…";
    await Promise.race([
      document.fonts ? document.fonts.ready : Promise.resolve(),
      new Promise(function (r) { setTimeout(r, 4000); })
    ]);
    await new Promise(function (r) { setTimeout(r, 150); });

    var montaje = document.createElement("div");
    montaje.setAttribute("style", "position:fixed;top:0;left:0;width:1180px;height:1720px;pointer-events:none;visibility:hidden;z-index:-1;");
    var fuente = card.cloneNode(true);
    montaje.appendChild(fuente);
    document.body.appendChild(montaje);

    try {
      inlineEstilos(fuente);
      fuente.style.transform = "none";
      fuente.style.transformOrigin = "0 0";

      var clon = fuente.cloneNode(true);

      var imgs = Array.prototype.slice.call(clon.querySelectorAll("img"));
      await Promise.all(imgs.map(async function (img) {
        var src = img.getAttribute("src") || "";
        if (!src) {
          img.removeAttribute("src");
          return;
        }
        try {
          img.setAttribute("src", await leerImagen(src));
        } catch (e) {
          img.remove();
        }
      }));
      await reemplazarFondos(clon);

      var fuentes = await fuentesInline();
      var css = await cssPagina();

      var caja = document.createElement("div");
      caja.setAttribute("style", "width:1180px;height:1720px;transform:scale(2);transform-origin:0 0;");
      caja.appendChild(clon);

      var svg = '<?xml version="1.0" encoding="utf-8"?>' +
        '<svg xmlns="http://www.w3.org/2000/svg" width="2360" height="3440">' +
        "<style>" + css + fuentes + "</style>" +
        '<foreignObject width="2360" height="3440">' + xmlSerializar(caja) + "</foreignObject></svg>";

      var urlSvg = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);

      var im = new Image();
      await new Promise(function (res, rej) {
        im.onload = res;
        im.onerror = function () { rej(new Error("el SVG no se renderizó")); };
        im.src = urlSvg;
      });

      var cv = document.createElement("canvas");
      cv.width = 2360;
      cv.height = 3440;
      var ctx = cv.getContext("2d");
      ctx.drawImage(im, 0, 0, 2360, 3440);

      return cv.toDataURL("image/png");
    } finally {
      document.body.removeChild(montaje);
    }
  }

  function guardarPNG() {
    var nombre = (fich.value || window.CARD.nombre || "carta").trim();
    var carpeta = (window.prompt("¿En qué carpeta guardar la carta? (Dejar vacío = cartas/)", "") || "").trim();
    exportarPNG().then(function (dataUrl) {
      return fetch("/guardar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          carpeta: carpeta || undefined,
          nombre: nombre + ".png",
          png: dataUrl
        })
      }).then(function (r) {
        return r.json();
      }).then(function (res) {
        if (res.ok) {
          estado.textContent = "Guardada en cartas/" + res.archivo;
        } else {
          throw new Error(res.archivo || "error");
        }
      });
    }).catch(function (e) {
      estado.textContent = "Error al guardar: " + e.message;
    });
  }

  /* ---------- eventos ---------- */

  function rankResultados(query, hits) {
    var nq = sinTildes(query);
    return hits.map(function (h) {
      var nt = sinTildes(h.title);
      var score =
        nt === nq ? 4 :
        nt.indexOf(nq) === 0 ? 3 :
        nt.indexOf(nq) !== -1 ? 2 :
        nq.indexOf(nt) !== -1 ? 1 : 0;
      return { h: h, score: score };
    }).sort(function (a, b) {
      return b.score - a.score;
    });
  }

  function programarArmar(titulo) {
    armarProgramado = titulo;
    clearTimeout(programarArmar._t);
    programarArmar._t = setTimeout(function () {
      if (armarProgramado !== titulo) { return; }
      if (armarToken === titulo) { return; }
      armarCarta(titulo, { auto: true });
    }, 650);
  }

  function rellenarResultados(opciones, mejor, autoArmar) {
    resultados.textContent = "";
    opciones.forEach(function (o, i) {
      var op = document.createElement("option");
      op.value = o.value;
      op.textContent = o.label;
      resultados.appendChild(op);
      if (i === 0) { resultados.selectedIndex = 0; }
    });
    if (!opciones.length) {
      estado.textContent = "Sin resultados.";
      return;
    }
    estado.textContent = opciones.length + " resultado(s).";
    if (autoArmar && mejor) {
      programarArmar(mejor);
    }
  }

  function puntuarNombre(nt, nq) {
    if (nt === nq) { return 4; }
    if (nt.indexOf(nq) === 0) { return 3; }
    if (nt.indexOf(nq) !== -1) { return 2; }
    return 0;
  }

  function puntuarNombre(nt, nq) {
    if (nt === nq) { return 4; }
    if (nt.indexOf(nq) === 0) { return 3; }
    if (nt.indexOf(nq) !== -1) { return 2; }
    if (nq.indexOf(nt) !== -1) { return 1; }
    return 0;
  }

  function verificarCandidatos(cands, nq) {
    var lote = cands.slice(0, 6);
    return Promise.all(lote.map(function (t) {
      return obtenerWikitexto(t, "").then(function (r) {
        var es = r && /CardTable2/i.test(r.wt) ? campo(r.wt, "es_name") : "";
        var score = Math.max(
          puntuarNombre(sinTildes(es), nq),
          puntuarNombre(sinTildes(t), nq)
        );
        return { t: t, es: es, score: score };
      }).catch(function () {
        return { t: t, es: "", score: puntuarNombre(sinTildes(t), nq) };
      });
    })).then(function (verificados) {
      verificados.sort(function (a, b) {
        return b.score - a.score;
      });
      var mejores = verificados.filter(function (v) {
        return v.score >= 2;
      });
      return {
        mejor: mejores.length ? mejores[0].t : null,
        opciones: verificados.map(function (v) {
          return { value: v.t, label: v.es ? v.es + "  (" + v.t + ")" : v.t };
        })
      };
    });
  }

  function buscarPorArray(busq, token) {
    var vistas = {};
    var metas = [
      api("action=query&format=json&list=prefixsearch&psnamespace=0&pslimit=6&pssearch=" + encodeURIComponent(busq))
        .then(function (j) {
          (j.query.prefixsearch || []).forEach(function (x) { vistas[x.title] = true; });
        }),
      api("action=query&format=json&list=search&srnamespace=0&srlimit=8&srwhat=text&srsearch=" + encodeURIComponent(busq))
        .then(function (j) {
          (j.query.search || []).forEach(function (x) { vistas[x.title] = true; });
        })
    ];
    sinTildes(busq).split(/\s+/).filter(function (tok) {
      return tok.length >= 3;
    }).slice(0, 3).forEach(function (tok) {
      metas.push(
        api("action=query&format=json&list=search&srnamespace=0&srlimit=4&srwhat=text&srsearch=" + encodeURIComponent(tok))
          .then(function (j) {
            (j.query.search || []).forEach(function (x) { vistas[x.title] = true; });
          })
      );
    });
    return Promise.all(metas).then(function () {
      if (token !== busquedaToken) { return null; }
      var claves = Object.keys(vistas);
      return claves.length ? claves : null;
    });
  }

  function buscarTexto(busq, token) {
    return buscarPorArray(busq, token).then(function (cands) {
      if (!cands) { return null; }
      return verificarCandidatos(cands, sinTildes(busq));
    });
  }

  function hacerBusqueda(busq, autoArmar) {
    var token = ++busquedaToken;
    if (!busq) {
      resultados.textContent = "";
      estado.textContent = "";
      return;
    }
    var alias = ALIASES[sinTildes(busq)];
    if (alias) {
      estado.textContent = "Nombre alternativo reconocido.";
      rellenarResultados([{ value: alias, label: alias }], alias, autoArmar);
      return;
    }
    estado.textContent = "Buscando \u201C" + busq + "\u201D\u2026";
    if (window.Buscador && window.Buscador.buscar) {
      return window.Buscador.buscar(busq).then(function (cartas) {
        if (token !== busquedaToken) { return; }
        if (cartas && cartas.length) {
          cartasBuscador = {};
          cartas.forEach(function (c) {
            cartasBuscador[c.nombreEN || c.nombre] = c;
          });
          rellenarResultados(
            cartas.map(function (c) {
              var label = c.nombre;
              if (c.nombreEN && c.nombreEN !== c.nombre) { label += "  (" + c.nombreEN + ")"; }
              return { value: c.nombreEN || c.nombre, label: label };
            }),
            cartas[0].nombreEN || cartas[0].nombre,
            autoArmar
          );
          return;
        }
        return buscarYugipediaViejo(busq, token, autoArmar);
      }).catch(function () {
        if (token === busquedaToken) {
          return buscarYugipediaViejo(busq, token, autoArmar);
        }
      });
    }
    return buscarYugipediaViejo(busq, token, autoArmar);
  }

  function buscarYugipediaViejo(busq, token, autoArmar) {
    cartasBuscador = {};
    return api("action=query&format=json&list=search&srnamespace=0&srlimit=10&srsearch=" + encodeURIComponent(busq))
      .then(function (j) {
        if (token !== busquedaToken) { return; }
        var hits = j.query.search || [];
        var puestos = rankResultados(busq, hits);
        if (puestos.length && puestos[0].score >= 2) {
          rellenarResultados(
            puestos.map(function (p) {
              return { value: p.h.title, label: p.h.title };
            }),
            puestos[0].h.title,
            autoArmar
          );
          return;
        }
        return buscarTexto(busq, token).then(function (txt) {
          if (token !== busquedaToken) { return; }
          if (txt) {
            rellenarResultados(txt.opciones, txt.mejor, autoArmar);
          } else {
            estado.textContent = "Sin resultados para \u201C" + busq + "\u201D. Prueba por su nombre en ingl\u00E9s, ej. Call of the Haunted.";
          }
        });
      })
      .catch(function (e) {
        if (token === busquedaToken) {
          estado.textContent = "Error: " + e.message;
        }
      });
  }

  var enInput = debounce(function () {
    var busq = (q.value || "").trim();
    if (sinTildes(busq).length < 2) {
      busquedaToken++;
      armarProgramado = null;
      clearTimeout(programarArmar._t);
      resultados.textContent = "";
      if (!busq) { estado.textContent = ""; }
      return;
    }
    hacerBusqueda(busq, true);
  }, 260);

  btnBuscar.addEventListener("click", function () {
    var busq = (q.value || "").trim();
    if (!busq) { return; }
    busquedaToken++;
    armarProgramado = null;
    clearTimeout(programarArmar._t);
    hacerBusqueda(busq, true);
  });

  q.addEventListener("input", enInput);

  q.addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
      e.preventDefault();
      if (resultados.value) {
        armarProgramado = null;
        clearTimeout(programarArmar._t);
        armarCarta(resultados.value);
      }
    }
  });

  btnArmar.addEventListener("click", function () {
    if (resultados.value) {
      armarCarta(resultados.value);
    }
  });

  btnGuardar.addEventListener("click", guardarPNG);

  fich.addEventListener("input", function () {
    fich.dataset.tocado = "1";
  });

  resultados.addEventListener("change", function () {
    if (resultados.value) {
      armarProgramado = null;
      clearTimeout(programarArmar._t);
      armarCarta(resultados.value);
    }
  });

  // Streaming: re-render en vivo al cambiar ajustes en el editor (otra pestaña)
  var CLAVES_SYNC = [
    "ygo-offset-y",
    "ygo-nombre-ancho",
    "ygo-atributo-size",
    "ygo-letras-factor",
    "ygo-estrellas-offset",
    "ygo-corchete-gap"
  ];
  window.addEventListener("storage", function (e) {
    if (CLAVES_SYNC.indexOf(e.key) !== -1 && window.CARD && window.CARD.nombre) {
      console.log("[STREAMING] localStorage cambió:", e.key, "->", e.newValue);
      console.log("[STREAMING] Disparando render()...");
      render();
    }
  });

window.exportarPNGGlobal = function (nombre) {
    var cardEl = document.getElementById("card");
    if (!cardEl) return Promise.reject(new Error("No card element"));

    function blobToDataURL(b) {
      return new Promise(function (res, rej) {
        var fr = new FileReader();
        fr.onload = function () { res(fr.result); };
        fr.onerror = rej;
        fr.readAsDataURL(b);
      });
    }

    function leerImagen(src) {
      return fetch(/^https?:/i.test(src) ? "/obra?url=" + encodeURIComponent(src) : src)
        .then(function (r) { if (!r.ok) throw new Error("img " + r.status); return r.blob(); })
        .then(blobToDataURL);
    }

    return Promise.race([
      document.fonts ? document.fonts.ready : Promise.resolve(),
      new Promise(function (r) { setTimeout(r, 4000); })
    ]).then(function () {
      return new Promise(function (r) { setTimeout(r, 150); });
    }).then(function () {
      // inline estilos
      var cs = getComputedStyle(card);
      card.setAttribute("style", [card.getAttribute("style") || "", cs.cssText || ""].filter(Boolean).join(";"));
      Array.prototype.forEach.call(card.children, function inline(el) {
        var cs = getComputedStyle(el);
        el.setAttribute("style", [el.getAttribute("style") || "", cs.cssText || ""].filter(Boolean).join(";"));
        Array.prototype.forEach.call(el.children, inline);
      });

      card.style.transform = "none";
      card.style.transformOrigin = "0 0";

      var clon = card.cloneNode(true);

      // reemplazar imágenes
      var imgs = Array.prototype.slice.call(clon.querySelectorAll("img"));
      return Promise.all(imgs.map(function (img) {
        var src = img.getAttribute("src") || "";
        if (!src) { img.removeAttribute("src"); return; }
        return leerImagen(src).then(function (url) {
          img.setAttribute("src", url);
        }).catch(function () { img.remove(); });
      }));

    }).then(function () {
      // reemplazar fondos
      function reemplazarFondos(el) {
        var bg = (el.style && el.style.backgroundImage) || "";
        if (bg && bg !== "none") {
          var m = bg.match(/url\(\s*["']?([^"')]+)["']?\s*\)/);
          if (m) {
            return leerImagen(m[1]).then(function (url) {
              el.style.backgroundImage = "url(" + url + ")";
            }).catch(function () { el.style.backgroundImage = "none"; });
          }
        }
        for (var i = 0; i < el.children.length; i++) {
          return reemplazarFondos(el.children[i]).then(function () {});
        }
        return Promise.resolve();
      }
      return reemplazarFondos(clon);
    }).then(function () {
      // fuentes
      function blobToDataURL(b) {
        return new Promise(function (res, rej) {
          var fr = new FileReader();
          fr.onload = function () { res(fr.result); };
          fr.onerror = rej;
          fr.readAsDataURL(b);
        });
      }
      var defs = [
        ["fontCardName", "assets/fonts/YGOSmallCaps.ttf", "truetype"],
        ["fontCardNameHashFix", "assets/fonts/YGOSmallCapsHashFix.ttf", "truetype"],
        ["fontCardEffect", "assets/fonts/YGO_Card_NA.ttf", "truetype"],
        ["fontCardType", "assets/fonts/StoneSerifSmallCapsBold.ttf", "truetype"],
        ["fontATKValue", "assets/fonts/MatrixRegular.ttf", "truetype"],
        ["fontLink", "assets/fonts/FOT-KafuTechnoStd-H.otf", "opentype"]
      ];
      return Promise.all(defs.map(function (d) {
        return fetch(d[1]).then(function (r) { return r.blob(); })
          .then(function (b) { return blobToDataURL(b); })
          .then(function (url) { return '@font-face{font-family:"' + d[0] + '";src:url(' + url + ') format("' + d[2] + '");}'; })
          .catch(function () { return ""; });
      })).then(function (partes) { return partes.join(""); });
    }).then(function (fuentes) {
      return cssPagina().then(function (css) {
        var caja = document.createElement("div");
        caja.setAttribute("style", "width:1180px;height:1720px;transform:scale(2);transform-origin:0 0;");
        caja.appendChild(clon);

        var svg = '<?xml version="1.0" encoding="utf-8"?>' +
          '<svg xmlns="http://www.w3.org/2000/svg" width="2360" height="3440">' +
          "<style>" + css + fuentes + "</style>" +
          '<foreignObject width="2360" height="3440">' + new XMLSerializer().serializeToString(caja) + "</foreignObject></svg>";

        var urlSvg = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);

        var im = new Image();
        return new Promise(function (res, rej) {
          im.onload = res;
          im.onerror = function () { rej(new Error("el SVG no se renderizó")); };
          im.src = urlSvg;
        }).then(function () {
          var cv = document.createElement("canvas");
          cv.width = 2360;
          cv.height = 3440;
          var ctx = cv.getContext("2d");
          ctx.drawImage(im, 0, 0, 2360, 3440);
          return cv.toDataURL("image/png");
        });
      });
    });
  };
})();

  // Re-render cuando las fuentes de carta terminan de cargar (misma práctica que renderer.js)
  // Esto soluciona el bug donde el nombre queda "pequeño" o tapado si las fuentes
  // aún no han cargado al momento de medir (tanto en uso manual como en test).
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () {
      if (window.CARD && window.CARD.nombre) {
        render();
      }
    });
  }

window.construirCajas = construirCajas;
window.render = render;
window.CONFIG = window.CONFIG || {};
window.CARD = window.CARD || {};
window.CARTAS = window.CARTAS || {};
window.LAYOUTS = window.LAYOUTS || {};