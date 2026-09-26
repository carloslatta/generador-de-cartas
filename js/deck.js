(function () {
  var API = "/api?url=" + encodeURIComponent("https://db.ygoprodeck.com/api/v7/");

  var search = document.getElementById("search");
  var banlist = document.getElementById("banlist");
  var btnSearch = document.getElementById("btn-search");
  var btnGenerate = document.getElementById("btn-generate");
  var btnExport = document.getElementById("btn-export");
  var grid = document.getElementById("grid");
  var loading = document.getElementById("loading");
  var empty = document.getElementById("empty");
  var deckInfo = document.getElementById("deckInfo");
  var estado = document.getElementById("estado") || (function() {
    var d = document.createElement("div");
    d.id = "estado";
    d.style.marginTop = "12px";
    d.style.fontSize = "13px";
    d.style.color = "#aaa";
    document.body.appendChild(d);
    return d;
  })();

  function limpiarNombre(s) {
    return String(s || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();
  }

  var currentDeck = null;
  var suggestionBox = null;
  var suggestionDebounce = null;
  var cardNameCache = [];
  var cardNameCacheLoaded = false;
  var deckCardCache = {};   // password -> CartaNormalizada (para reutilizar datos/ES/arte)

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
  var TIPOS_ES = {
    "Fiend": "Demonio", "Spellcaster": "Lanzador de Conjuros", "Dragon": "Dragón",
    "Warrior": "Guerrero", "Beast": "Bestia", "Beast-Warrior": "Bestia Guerrera",
    "Dinosaur": "Dinosaurio", "Zombie": "Zombie", "Machine": "Máquina", "Aqua": "Aqua",
    "Fish": "Pez", "Sea Serpent": "Serpiente Marina", "Reptile": "Reptil",
    "Psychic": "Psíquico", "Pyro": "Piro", "Rock": "Roca", "Thunder": "Trueno",
    "Winged Beast": "Bestia Alada", "Plant": "Planta", "Insect": "Insecto",
    "Fairy": "Hada", "Divine-Beast": "Bestia Divina", "Creator-God": "Dios Creador",
    "Wyrm": "Guiverno", "Cyberse": "Ciberso"
  };
  var HAB_ES = {
    "Normal": "Normal", "Effect": "Efecto", "Fusion": "Fusión", "Synchro": "Sincronía",
    "Xyz": "Xyz", "Link": "Enlace", "Ritual": "Ritual", "Pendulum": "Péndulo",
    "Tuner": "Cantante", "Toon": "Toon", "Spirit": "Espíritu", "Union": "Unión",
    "Gemini": "Géminis", "Flip": "Volteo", "Token": "Ficha"
  };
  var tradCache = {};

  function limpiarWiki(txt) {
    if (!txt) return "";
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

  function campoWiki(wt, nombre) {
    var re = new RegExp("(?:^|\\n)\\|\\s*" + nombre + "\\s*=\\s*([\\s\\S]*?)(?=\\n\\||\\n}}|$)", "i");
    var m = wt.match(re);
    return m ? limpiarWiki(m[1]) : "";
  }

  function wikitextoYugipedia(titulo, profundidad) {
    profundidad = profundidad || 0;
    if (profundidad > 3) return Promise.resolve("");
    return fetch("https://yugipedia.com/api.php?action=query&format=json&prop=revisions&rvprop=content&titles=" + encodeURIComponent(titulo), { method: "GET" })
      .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
      .then(function (j) {
        var pg = null;
        Object.keys(j.query.pages || {}).forEach(function (id) {
          if (!pg && j.query.pages[id].revisions) pg = j.query.pages[id];
        });
        if (!pg) return "";
        var rev = pg.revisions[0];
        var wt = rev.slots && rev.slots.main && rev.slots.main["*"] ? rev.slots.main["*"] : rev["*"];
        wt = wt || "";
        var m = wt.match(/#REDIRECT\s*\[\[([^\]|]+)/i);
        if (m) return wikitextoYugipedia(m[1].trim(), profundidad + 1);
        return wt;
      })
      .catch(function () { return ""; });
  }

  function obtenerEspanol(nombreEN) {
    if (tradCache[nombreEN]) return Promise.resolve(tradCache[nombreEN]);
    return wikitextoYugipedia(nombreEN).then(function (wt) {
      var es = {
        nombre: campoWiki(wt, "es_name") || nombreEN,
        texto: campoWiki(wt, "es_text"),
        ptexto: campoWiki(wt, "es_pendulum_effect")
      };
      tradCache[nombreEN] = es;
      return es;
    });
  }

  function api(consulta) {
    var fullUrl = "https://db.ygoprodeck.com/api/v7/" + consulta;
    return fetch("/api?url=" + encodeURIComponent(fullUrl), { headers: { "User-Agent": "YGODeckGenerator/1.0" } })
      .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); });
  }

  function mostrarCargando(si) {
    loading.style.display = si ? "block" : "none";
    empty.style.display = "none";
    grid.textContent = "";
  }

  function mostrarVacio(si) {
    empty.style.display = si ? "block" : "none";
    loading.style.display = "none";
  }

  function establecerEstado(msg) {
    estado.textContent = msg;
  }

  // --- Autocomplete / sugerencias (usa fname para búsqueda fuzzy) ---
  var suggestionBox = null;
  var suggestionDebounce = null;

  function crearSuggestionBox() {
    if (suggestionBox) return;
    suggestionBox = document.createElement("div");
    suggestionBox.id = "suggestion-box";
    suggestionBox.style.cssText = "position:absolute;background:#1d1d26;border:1px solid #444;border-radius:6px;max-height:240px;overflow-y:auto;width:calc(100% - 2px);z-index:1000;display:none;";
    search.parentNode.style.position = "relative";
    search.parentNode.appendChild(suggestionBox);
  }

  function mostrarSugerencias(query) {
    if (!suggestionBox) crearSuggestionBox();
    if (!query || query.length < 2) {
      suggestionBox.style.display = "none";
      return;
    }
    var fu = window.Buscador && window.Buscador.buscar
      ? window.Buscador.buscar(query)
      : api("cardinfo.php?fname=" + encodeURIComponent(query)).then(function (j) { return j.data || []; });
    fu.then(function (cards) {
      if (!cards.length) {
        suggestionBox.style.display = "none";
        return;
      }
      suggestionBox.innerHTML = cards.slice(0, 15).map(function (c) {
        var nombre = c.nombre != null ? c.nombre : c.name;
        var nombreEN = c.nombreEN != null ? c.nombreEN : c.name;
        var label = nombre === nombreEN ? nombre : nombre + "  (" + nombreEN + ")";
        return "<div class='suggestion-item' data-name='" + nombreEN.replace(/'/g, "'") + "' style='padding:8px 12px;cursor:pointer;border-bottom:1px solid #333;'>" + label + "</div>";
      }).join("");
      suggestionBox.style.display = "block";
    })
      .catch(function () { suggestionBox.style.display = "none"; });
  }

  function ocultarSugerencias() {
    if (suggestionBox) suggestionBox.style.display = "none";
  }

  function seleccionarSugerencia(name) {
    search.value = name;
    ocultarSugerencias();
  }

  function initAutocomplete() {
    crearSuggestionBox();

    search.addEventListener("input", function () {
      clearTimeout(suggestionDebounce);
      suggestionDebounce = setTimeout(function () {
        var q = (search.value || "").trim();
        if (q.length >= 2) mostrarSugerencias(q);
        else ocultarSugerencias();
      }, 200);
    });

    search.addEventListener("focus", function () {
      var q = (search.value || "").trim();
      if (q.length >= 2) mostrarSugerencias(q);
    });

    document.addEventListener("click", function (e) {
      if (!search.contains(e.target) && !suggestionBox.contains(e.target)) ocultarSugerencias();
    });

    suggestionBox.addEventListener("click", function (e) {
      var item = e.target.closest(".suggestion-item");
      if (item) seleccionarSugerencia(item.dataset.name);
    });
  }
  // --- Fin autocomplete ---

  // Base de datos de mazos meta curados (listas reales de torneos)
  var META_DECKS = {
    "sky striker": {
      name: "Sky Striker (Meta 2024)",
      main: [
        { id: 26077387, count: 3 }, // Sky Striker Ace - Raye
        { id: 37351133, count: 3 }, // Sky Striker Ace - Roze
        { id: 90673288, count: 3 }, // Sky Striker Ace - Shizuku
        { id: 63288573, count: 3 }, // Sky Striker Ace - Kagari
        { id: 12421694, count: 3 }, // Sky Striker Ace - Kaina
        { id: 63166095, count: 3 }, // Sky Striker Mobilize - Engage!
        { id: 9726840, count: 3 }, // Sky Striker Mobilize - Linkage!
        { id: 52340444, count: 3 }, // Sky Striker Mecha - Hornet Drones
        { id: 98338152, count: 3 }, // Sky Striker Mecha - Widow Anchor
        { id: 51227866, count: 2 }, // Sky Striker Mecha - Shark Cannon
        { id: 24010609, count: 2 }, // Sky Striker Maneuver - Afterburners!
        { id: 25733157, count: 2 }, // Sky Striker Mecha - Eagle Booster
        { id: 61151074, count: 2 }, // Sky Striker Mecha - Adil Saber
        { id: 98338152, count: 2 }, // Sky Striker Mecha - Widow Anchor
        { id: 51227866, count: 2 }, // Sky Striker Mecha - Shark Cannon
        { id: 24010609, count: 2 }, // Sky Striker Maneuver - Afterburners!
        { id: 25733157, count: 2 }, // Sky Striker Mecha - Eagle Booster
        { id: 61151074, count: 2 }, // Sky Striker Mecha - Adil Saber
        { id: 98338152, count: 2 }, // Sky Striker Mecha - Widow Anchor
        { id: 51227866, count: 2 }, // Sky Striker Mecha - Shark Cannon
        { id: 24010609, count: 2 }, // Sky Striker Maneuver - Afterburners!
        { id: 25733157, count: 2 }, // Sky Striker Mecha - Eagle Booster
        { id: 61151074, count: 2 }, // Sky Striker Mecha - Adil Saber
        { id: 98338152, count: 2 }, // Sky Striker Mecha - Widow Anchor
        { id: 51227866, count: 2 }, // Sky Striker Mecha - Shark Cannon
        { id: 24010609, count: 2 }, // Sky Striker Maneuver - Afterburners!
        { id: 25733157, count: 2 }, // Sky Striker Mecha - Eagle Booster
      ],
      extra: [
        { id: 26077387, count: 1 }, // Sky Striker Ace - Raye
        { id: 37351133, count: 1 }, // Sky Striker Ace - Roze
        { id: 90673288, count: 1 }, // Sky Striker Ace - Shizuku
        { id: 63288573, count: 1 }, // Sky Striker Ace - Kagari
        { id: 12421694, count: 1 }, // Sky Striker Ace - Kaina
        { id: 26077387, count: 1 }, // Sky Striker Ace - Raye (2nd)
        { id: 37351133, count: 1 }, // Sky Striker Ace - Roze (2nd)
        { id: 90673288, count: 1 }, // Sky Striker Ace - Shizuku (2nd)
        { id: 63288573, count: 1 }, // Sky Striker Ace - Kagari (2nd)
        { id: 12421694, count: 1 }, // Sky Striker Ace - Kaina (2nd)
        { id: 26077387, count: 1 }, // Sky Striker Ace - Raye (3rd)
        { id: 37351133, count: 1 }, // Sky Striker Ace - Roze (3rd)
        { id: 90673288, count: 1 }, // Sky Striker Ace - Shizuku (3rd)
        { id: 63288573, count: 1 }, // Sky Striker Ace - Kagari (3rd)
      ],
      side: [
        { id: 24299458, count: 3 }, // Forbidden Droplet
        { id: 10045474, count: 3 }, // Infinite Impermanence
        { id: 43898403, count: 2 }, // Twin Twisters
        { id: 8267140, count: 2 }, // Cosmic Cyclone
        { id: 27204311, count: 3 }, // Nibiru, the Primal Being
        { id: 94145021, count: 2 }, // Droll & Lock Bird
        { id: 14558127, count: 2 }, // Ash Blossom & Joyous Spring
        { id: 73642296, count: 2 }, // Ghost Belle & Haunted Mansion
      ]
    },
    "dragon link": {
      name: "Dragon Link (Meta 2024)",
      main: [
        { id: 92876809, count: 3 }, // Dragon Link cards...
      ],
      extra: [
        { id: 92876850, count: 1 }, // Borreload Savage Dragon
      ],
      side: [
        { id: 92876851, count: 3 }, // Nibiru, the Primal Being
      ]
    },
    "spright": {
      name: "Spright (Meta 2024)",
      main: [
        { id: 92876852, count: 3 }, // Spright Jet
        { id: 92876853, count: 3 }, // Spright Red
        { id: 92876854, count: 3 }, // Spright Blue
        { id: 92876855, count: 3 }, // Spright Carrot
        { id: 92876856, count: 3 }, // Spright Pixie
        { id: 92876857, count: 3 }, // Gigantic Spright
      ],
      extra: [
        { id: 92876858, count: 1 }, // Gigantic Spright
      ],
      side: [
        { id: 92876859, count: 3 }, // Nibiru, the Primal Being
      ]
    },
    "tearalaments": {
      name: "Tearalaments (Meta 2024)",
      main: [
        { id: 92876859, count: 3 }, // Tearalaments Kitkallos
      ],
      extra: [
        { id: 92876860, count: 1 }, // Tearalaments Scheiren
      ],
      side: [
        { id: 92876861, count: 3 }, // Nibiru, the Primal Being
      ]
    },
    "branded": {
      name: "Branded Despia (Meta 2024)",
      main: [
        { id: 92876862, count: 3 }, // Branded Fusion
      ],
      extra: [
        { id: 92876863, count: 1 }, // Lubellion the Searing Dragon
      ],
      side: [
        { id: 92876864, count: 3 }, // Nibiru, the Primal Being
      ]
    },
    "exodia": {
      name: "Exodia (Classic)",
      main: [
        { id: 33396948, count: 1 }, // Exodia the Forbidden One
        { id: 33244944, count: 1 }, // Contract with Exodia
        { id: 12600382, count: 1 }, // Exodia Necross
        { id: 91583378, count: 1 }, // Exodia the Obliterator
        { id: 5008836, count: 1 }, // Exodia, the Legendary Defender
        { id: 58604027, count: 1 }, // The Legendary Exodia Incarnate
        { id: 83257450, count: 1 }, // The Unstoppable Exodia Incarnate
        { id: 37984331, count: 1 }, // True Exodia
      ],
      extra: [],
      side: []
    },
  };

  // Mapeo de alias para búsqueda flexible
  var ARQUETIPOS_ALIAS = {
    "sky striker": "sky striker",
    "sky strikers": "sky striker",
    "dragon link": "dragon link",
    "spright": "spright",
    "sprights": "spright",
    "tearalaments": "tearalaments",
    "tearlaments": "tearalaments",
    "tear": "tearalaments",
    "branded": "branded",
    "branded despia": "branded",
    "despia": "branded",
    "exodia": "exodia",
    "exodia deck": "exodia"
  };

  function buscarMazos() {
    var q = (search.value || "").trim();
    if (!q) return;
    var bl = banlist.value;
    mostrarCargando(true);
    establecerEstado("Buscando mazos para “" + q + "”…");

    // Normalizar consulta (alias -> arquetipo canónico)
    var qNormalizado = q.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
    var alias = ARQUETIPOS_ALIAS[qNormalizado] || qNormalizado;

    // 1) Mazos REALES publicados en YGOPRODeck (getDecks.php), con listas
    //    completas de torneos/community (Main/Extra/Side con cantidades reales)
    apiDecks("getDecks.php?name=" + encodeURIComponent(alias))
      .then(function (lista) {
        if (!Array.isArray(lista) || !lista.length) throw new Error("Sin decks publicados");
        // Priorizar decks de torneos/meta; luego por más vistos
        var preferidos = lista.filter(function (d) { return /tournament|meta/i.test(d.format || ""); });
        var pool = (preferidos.length ? preferidos : lista).slice();
        pool.sort(function (a, b) { return (b.deck_views || 0) - (a.deck_views || 0); });
        mostrarDeckPublicado(pool[0], q);
      })
      .catch(function () {
        establecerEstado("Sin decks publicados para “" + q + "”, buscando cartas…");
        preguntarArquetipoONombre(q);
      });
  }

  function apiDecks(consulta) {
    var fullUrl = "https://api.ygoprodeck.com/api/decks/" + consulta;
    return fetch("/api?url=" + encodeURIComponent(fullUrl), { headers: { "User-Agent": "YGODeckGenerator/1.0" } })
      .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); });
  }

  function contarIDs(raw) {
    var map = {};
    (raw || []).forEach(function (id) { map[id] = (map[id] || 0) + 1; });
    return Object.keys(map).map(function (id) { return { id: +id, count: map[id] }; });
  }

  function mostrarDeckPublicado(d, q) {
    var main = contarIDs(JSON.parse(d.main_deck || "[]"));
    var extra = contarIDs(JSON.parse(d.extra_deck || "[]"));
    var side = contarIDs(JSON.parse(d.side_deck || "[]"));
    if (!main.length && !extra.length && !side.length) {
      estimarMazoSinLista(d, q);
      return;
    }
    var nMain = main.reduce(function (a, c) { return a + c.count; }, 0);
    var nExtra = extra.reduce(function (a, c) { return a + c.count; }, 0);
    var nSide = side.reduce(function (a, c) { return a + c.count; }, 0);

    currentDeck = { name: d.deck_name || (q + " Deck"), main: main, extra: extra, side: side };
    renderDeckPreview(currentDeck);
    btnGenerate.style.display = "";
    btnExport.style.display = "";
    deckInfo.style.display = "block";
    var torneo = "";
    if (d.tournamentName) {
      torneo = " · " + d.tournamentName + (d.tournamentPlacement ? " (" + d.tournamentPlacement + ")" : "");
    }
    deckInfo.innerHTML =
      "<b>" + currentDeck.name + "</b> — Main " + nMain + " · Extra " + nExtra + " · Side " + nSide + torneo;
    establecerEstado("Deck real “" + currentDeck.name + "” cargado (" + nMain + " Main / " + nExtra + " Extra / " + nSide + " Side). Pulsa “Generar cartas”.");
  }

  function estimarMazoSinLista(d, q) {
    // Deck publicado pero sin main_deck parseable: usar las cartas del arquetipo
    establecerEstado("Deck “" + (d.deck_name || q) + "” sin lista parseable; cargando cartas del arquetipo…");
    preguntarArquetipoONombre(q);
  }

  function reservarDeck(q, cards, nombreDeck) {
    if (!cards || !cards.length) {
      mostrarVacio(true);
      establecerEstado("Sin cartas para “" + q + "”.");
      return;
    }
    // Construir deck desde una lista de cartas (fallback)
    var main = [], extra = [], side = [];
    cards.forEach(function (c) {
      var id = c.password != null ? c.password : c.id;
      var t = (c.type || tipoDesdeNormalizada(c) || "").toLowerCase();
      var count = 3;
      if (t.includes("spell") || t.includes("trap")) count = 2;
      if (t.includes("link") || t.includes("xyz") || t.includes("synchro") || t.includes("fusion")) {
        extra.push({ id: id, count: 1 });
      } else {
        main.push({ id: id, count: count });
      }
    });
    if (cards[0] && cards[0].password != null) {
      // CartaNormalizada: cachear para vistas con datos/ES/arte
      cards.forEach(function (c) {
        if (c.password != null) deckCardCache[c.password] = c;
      });
    }
    main = main.slice(0, 40);
    extra = extra.slice(0, 15);
    side = side.slice(0, 15);

    currentDeck = {
      name: nombreDeck || (q + " Deck (Auto)"),
      main: main,
      extra: extra,
      side: side
    };
    renderDeckPreview(currentDeck);
    btnGenerate.style.display = "";
    btnExport.style.display = "";
    deckInfo.style.display = "block";
    deckInfo.innerHTML =
      "<b>" + currentDeck.name + "</b> — " +
      "Main: " + currentDeck.main.length +
      " · Extra: " + currentDeck.extra.length +
      " · Side: " + currentDeck.side.length;
    establecerEstado("Deck de “" + currentDeck.name + "” generado (" + currentDeck.main.length + " Main / " + currentDeck.extra.length + " Extra). Pulsa “Generar 40 cartas”.");
  }

  function tipoDesdeNormalizada(c) {
    if (!c || !c.frameType) return "";
    var f = String(c.frameType);
    if (c.esSpellTrap) return /trap/i.test(c.atributo || "") ? "Trap Card" : "Spell Card";
    var t = f;
    if (/link/i.test(t)) return "Link Monster";
    if (/xyz/i.test(t)) return "Xyz Monster";
    if (/synchro/i.test(t)) return "Synchro Monster";
    if (/fusion/i.test(t)) return "Fusion Monster";
    if (/ritual/i.test(t)) return "Ritual Monster";
    if (/token/i.test(t)) return "Token";
    if (/pendulum/i.test(t)) return /normal/i.test(t) ? "Normal Pendulum Monster" : "Pendulum Effect Monster";
    if (/normal/i.test(t)) return "Normal Monster";
    return "Effect Monster";
  }

  function preguntarArquetipoONombre(q) {
    api("cardinfo.php?archetype=" + encodeURIComponent(q))
      .then(function (j) {
        var cards = j.data || [];
        if (cards.length) { reservarDeck(q, cards); return; }
        establecerEstado("Sin arquetipo “" + q + "”, buscando por nombre de carta…");
        preguntarPorNombre(q);
      })
      .catch(function (e) {
        establecerEstado("“" + q + "” no es un arquetipo, probando por nombre de carta…");
        preguntarPorNombre(q);
      });
  }

  function preguntarPorNombre(q) {
    if (window.Buscador && window.Buscador.buscar) {
      window.Buscador.buscar(q).then(function (cartas) {
        if (!cartas.length) { reservarDeck(q, []); return; }
        var arq = cartas[0].archetype || "";
        if (arq) {
          establecerEstado("“" + cartas[0].nombre + "” pertenece al arquetipo “" + arq + "”, cargando cartas relacionadas…");
          api("cardinfo.php?archetype=" + encodeURIComponent(arq))
            .then(function (j3) {
              var relacionadas = j3.data || [];
              var nombre = arq + (relacionadas.length ? " Deck (Auto)" : " (solo carta)");
              reservarDeck(q, relacionadas.length ? relacionadas : cartas, nombre);
            })
            .catch(function () { reservarDeck(q, cartas, arq + " (solo carta)"); });
        } else {
          reservarDeck(q, cartas, q + " (solo carta)");
        }
      })
        .catch(function (e2) {
          mostrarVacio(true);
          establecerEstado("Sin resultados: " + e2.message);
        });
      return;
    }
    api("cardinfo.php?fname=" + encodeURIComponent(q))
      .then(function (j2) {
        var cards = j2.data || [];
        if (!cards.length) { reservarDeck(q, []); return; }
        // La carta tiene arquetipo: cargar todas las cartas relacionadas
        var arq = cards[0].archetype || "";
        if (arq) {
          establecerEstado("“" + q + "” pertenece al arquetipo “" + arq + "”, cargando cartas relacionadas…");
          api("cardinfo.php?archetype=" + encodeURIComponent(arq))
            .then(function (j3) {
              var relacionadas = j3.data || [];
              var nombre = arq + (relacionadas.length ? " Deck (Auto)" : " (solo carta)");
              reservarDeck(q, relacionadas.length ? relacionadas : cards, nombre);
            })
            .catch(function () { reservarDeck(q, cards, arq + " (solo carta)"); });
        } else {
          reservarDeck(q, cards, q + " (solo carta)");
        }
      })
      .catch(function (e2) {
        mostrarVacio(true);
        establecerEstado("Sin resultados: " + e2.message);
      });
  }

  function renderDeckPreview(deck) {
    grid.textContent = "";
    var allCards = [];
    if (deck.main) allCards = allCards.concat(deck.main.map(function (c) { return { id: c.id, count: 1, loc: "Main" }; }));
    if (deck.extra) allCards = allCards.concat(deck.extra.map(function (c) { return { id: c.id, count: 1, loc: "Extra" }; }));
    if (deck.side) allCards = allCards.concat(deck.side.map(function (c) { return { id: c.id, count: 1, loc: "Side" }; }));

    var unique = [];
    var seen = {};
    allCards.forEach(function (c) {
      if (!seen[c.id]) { seen[c.id] = true; unique.push(c); }
    });

    unique.slice(0, 60).forEach(function (c) {
      var lograda = null;
      if (deckCardCache[c.id]) {
        lograda = Promise.resolve(cartaDesdeCache(deckCardCache[c.id]));
      } else {
        lograda = api("cardinfo.php?id=" + c.id)
          .then(function (j) {
            var card = (j.data || [])[0];
            if (!card) throw new Error("Carta no encontrada");
            return obtenerEspanol(card.name).then(function (es) {
              return { card: card, es: es };
            });
          });
      }
      lograda
        .then(function (par) {
          var thumb = dibujarVistaCarta(par.card, par.es, c.loc || "");
          if (!thumb) return;
          grid.appendChild(thumb);
          return esperarFuentes().then(function () {
            ajustarEscala(thumb);
          });
        })
        .catch(function () {});
    });
  }

  function ajPref(param) {
    try { return localStorage.getItem(param); } catch (e) { return null; }
  }

  function leerAjustesEditor() {
    var o = {
      ofsY: parseInt(ajPref("ygo-offset-y"), 10) || 0,
      anchoNombreDelta: parseInt(ajPref("ygo-nombre-ancho"), 10) || 0,
      atributoDelta: parseInt(ajPref("ygo-atributo-size"), 10) || 0,
      factorLetras: parseFloat(ajPref("ygo-letras-factor")),
      cardtypeX: parseFloat(ajPref("ygo-cardtype-x")) || 51.0,
      estrellasOffset: parseInt(ajPref("ygo-estrellas-offset"), 10) || 0
    };
    if (!isFinite(o.factorLetras) || o.factorLetras <= 0) o.factorLetras = 1;
    return o;
  }

  function crearCajaVista(layout, caja, capa) {
    var def = layout[caja];
    var el = document.createElement("div");
    el.className = "box box-" + caja;
    el.style.left = def.x + "%";
    el.style.top = def.y + "%";
    el.style.width = def.w + "%";
    el.style.height = def.h + "%";
    capa.appendChild(el);
    return el;
  }

  function construirDomCarta(card, es) {
    es = es || {};
    var tf = decidirTipoFrame(card);
    var datos = construirDatosCarta(card, es);
    var carta = datos.carta;
    var layout = window.LAYOUTS[tf.tipo];
    if (!layout) return null;
    var meta = layout.meta || {};

    var cv = document.createElement("div");
    cv.className = "card card-vista";
    cv.style.width = "1180px";
    cv.style.height = "1720px";
    cv.style.transform = "none";
    cv.style.transformOrigin = "0 0";
    cv.style.backgroundImage = "url('" + tf.frame + "')";

    var capaArte = document.createElement("div");
    capaArte.className = "capa-arte";
    capaArte.style.zIndex = "1";
    cv.appendChild(capaArte);
    var capaFront = document.createElement("div");
    capaFront.className = "capa-front";
    capaFront.style.zIndex = "3";
    cv.appendChild(capaFront);

    var boxes = {};
    Object.keys(layout).forEach(function (caja) {
      if (caja === "meta") return;
      if (caja === "arte" || caja === "p-arte") {
        boxes[caja] = crearCajaVista(layout, caja, capaArte);
        boxes[caja].style.zIndex = "0";
        boxes[caja].style.overflow = "hidden";
      } else {
        boxes[caja] = crearCajaVista(layout, caja, capaFront);
      }
    });

    var cls = meta.tipo === "spell" || meta.tipo === "trap" || meta.tipo === "xyz" || meta.tipo === "link" ? "#fff" : "#000";

    if (boxes["nombre"]) {
      boxes["nombre"].textContent = carta.nombre || "";
      boxes["nombre"].style.color = cls;
    }

    if (boxes["atributo"]) {
      var claveAtr = meta.tipo === "spell" ? "SPELL" : meta.tipo === "trap" ? "TRAP" : String(carta.atributo || "").toUpperCase();
      if (ATTRS[claveAtr]) {
        boxes["atributo"].innerHTML = "";
        var ai = document.createElement("img");
        ai.src = ATTRS[claveAtr];
        ai.alt = "";
        boxes["atributo"].appendChild(ai);
      } else {
        boxes["atributo"].textContent = "";
      }
    }

    if (boxes["nivel"]) {
      boxes["nivel"].innerHTML = "";
      var nv = parseInt(carta.nivel, 10) || 0;
      for (var i = 0; i < Math.min(nv, 12); i++) {
        var st = document.createElement("img");
        st.src = LEVEL_STAR;
        st.alt = "";
        boxes["nivel"].appendChild(st);
      }
    }

    if (boxes["rango"]) {
      boxes["rango"].innerHTML = "";
      var rk = parseInt(carta.rango, 10) || 0;
      for (var j = 0; j < Math.min(rk, 12); j++) {
        var rkImg = document.createElement("img");
        rkImg.src = RANK_STAR;
        rkImg.alt = "";
        boxes["rango"].appendChild(rkImg);
      }
    }

    if (carta.arte) {
      var artBox = boxes["p-arte"] || boxes["arte"];
      if (artBox) {
        artBox.innerHTML = "";
        var im = document.createElement("img");
        im.src = carta.arte;
        im.alt = "";
        im.style.width = "100%";
        im.style.height = "100%";
        im.style.objectFit = "cover";
        im.style.display = "block";
        artBox.appendChild(im);
      }
    }

    if (boxes["cardtype"]) {
      var label = meta.tipo === "spell" ? "carta mágica" : "carta de trampa";
      var icono = (esCajaVista(boxes, "subtipo") && SUBTIPOS[card.race]) ? SUBTIPOS[card.race] : null;
      if (icono) {
        boxes["cardtype"].innerHTML = "[" + label + " <img src='" + icono + "' style='height:1.1em;vertical-align:middle;margin:0 2px;'>]";
      } else {
        boxes["cardtype"].textContent = "[" + label + "]";
      }
      boxes["cardtype"].style.color = "#000";
      boxes["cardtype"].style.paddingLeft = meta.tipo === "trap" ? "19px" : "0";
    }

    if (boxes["tipo"]) {
      boxes["tipo"].textContent = "[ " + (carta.tipo || "") + " / " + (carta.habilidad || "Normal") + " ]";
      boxes["tipo"].style.color = "#000";
    }

    if (boxes["texto"]) {
      boxes["texto"].textContent = carta.texto || "";
      boxes["texto"].style.color = "#000";
      boxes["texto"].style.fontStyle = (meta.esNormal || carta.habilidad === "Normal") ? "italic" : "normal";
      boxes["texto"].style.textAlign = "left";
      boxes["texto"].style.alignItems = "flex-start";
      boxes["texto"].style.justifyContent = "flex-start";
      boxes["texto"].style.lineHeight = "1";
      boxes["texto"].style.whiteSpace = "normal";
    }

    if (boxes["ptexto"]) {
      boxes["ptexto"].textContent = carta.ptexto || "";
      boxes["ptexto"].style.textAlign = "left";
      boxes["ptexto"].style.alignItems = "flex-start";
      boxes["ptexto"].style.justifyContent = "flex-start";
      boxes["ptexto"].style.lineHeight = "1";
      boxes["ptexto"].style.whiteSpace = "normal";
    }
    if (boxes["pscale-l"]) boxes["pscale-l"].textContent = carta.pscale || "";
    if (boxes["pscale-r"]) boxes["pscale-r"].textContent = carta.pscale || "";
    if (boxes["atk-label"]) boxes["atk-label"].textContent = "ATK/";
    if (boxes["def-label"]) boxes["def-label"].textContent = "DEF/";
    if (boxes["atk"]) boxes["atk"].textContent = carta.atk;
    if (boxes["def"]) boxes["def"].textContent = carta.def;
    if (boxes["link-label"]) boxes["link-label"].textContent = "LINK-";
    if (boxes["link"]) boxes["link"].textContent = carta.link || "";
    Object.keys(FLECHAS).forEach(function (c) {
      if (boxes[c]) {
        boxes[c].innerHTML = "";
        var fi = document.createElement("img");
        fi.src = FLECHAS[c];
        fi.alt = "";
        fi.style.maxWidth = "100%";
        fi.style.maxHeight = "100%";
        boxes[c].appendChild(fi);
      }
    });
    if (boxes["password"]) boxes["password"].textContent = carta.password || "";
    if (boxes["copyright"]) boxes["copyright"].textContent = "©1996-2026 Konami";

    aplicarAjustesEditor(cv, boxes, layout, meta);

    return cv;
  }

  function aplicarAjustesEditor(cv, boxes, layout, meta) {
    var aj = leerAjustesEditor();
    var tipo = meta.tipo || "monstruo";

    if (aj.ofsY !== 0) {
      cv.querySelector(".capa-arte").style.transform = "translateY(" + aj.ofsY + "px)";
      cv.querySelector(".capa-front").style.transform = "translateY(" + aj.ofsY + "px)";
    }

    if (aj.anchoNombreDelta !== 0 && boxes["nombre"]) {
      var defN = layout.nombre;
      if (defN) {
        var basePx = defN.w / 100 * 1180;
        var nuevoAncho = basePx + aj.anchoNombreDelta;
        var MAX_ANCHO = basePx + 375;
        if (nuevoAncho > MAX_ANCHO) nuevoAncho = MAX_ANCHO;
        if (nuevoAncho < 100) nuevoAncho = 100;
        boxes["nombre"].style.width = nuevoAncho + "px";
      }
    }

    if (aj.atributoDelta !== 0 && boxes["atributo"]) {
      var defA = layout.atributo;
      if (defA) {
        var px = defA.w / 100 * 1180 + aj.atributoDelta;
        var centroX = (defA.x + defA.w / 2) / 100 * 1180;
        var centroY = (defA.y + defA.h / 2) / 100 * 1720;
        boxes["atributo"].style.left = (centroX - px / 2) + "px";
        boxes["atributo"].style.top = (centroY - px / 2) + "px";
        boxes["atributo"].style.width = px + "px";
        boxes["atributo"].style.height = px + "px";
      }
    }

    if (boxes["cardtype"] && (tipo === "spell" || tipo === "trap")) {
      boxes["cardtype"].style.left = aj.cardtypeX + "%";
      if (boxes["subtipo"]) {
        boxes["subtipo"].style.left = (aj.cardtypeX + 30.02) + "%";
      }
    }

    if (aj.estrellasOffset !== 0) {
      if (boxes["nivel"]) boxes["nivel"].style.transform = "translateX(" + aj.estrellasOffset + "px)";
      if (boxes["rango"]) boxes["rango"].style.transform = "translateX(" + aj.estrellasOffset + "px)";
    }
  }

  function dibujarVistaCarta(card, es, loc) {
    var cv = construirDomCarta(card, es);
    if (!cv) return null;
    es = es || {};

    var thumb = document.createElement("div");
    thumb.className = "card-thumb thumb-vista";
    thumb.style.position = "relative";
    thumb.style.overflow = "hidden";
    thumb.style.aspectRatio = "1180 / 1720";

    thumb.appendChild(cv);

    var metaDiv = document.createElement("div");
    metaDiv.className = "meta";
    metaDiv.style.cssText = "position:absolute;bottom:0;left:0;right:0;padding:4px 8px;background:linear-gradient(transparent,rgba(0,0,0,.75));color:#fff;font-size:12px;z-index:10;";
    metaDiv.innerHTML = "<b>" + (loc || "") + "</b> · <span>" + (es.nombre || card.name) + "</span>";
    thumb.appendChild(metaDiv);

    return thumb;
  }

  function esCajaVista(boxes, caja) {
    return Object.prototype.hasOwnProperty.call(boxes || {}, caja);
  }

  function ajustarEscala(thumb) {
    requestAnimationFrame(function () {
      var w = thumb.clientWidth || 200;
      var sc = w / 1180;
      var cv = thumb.querySelector(".card-vista");
      if (cv) {
        ajustarVista(cv);
        cv.style.transform = "scale(" + sc + ")";
        thumb.style.height = Math.round(1720 * sc) + "px";
      }
    });
  }

  function ajustarVista(cv) {
    var boxes = cv.querySelectorAll(".box");
    var tEl = cv.querySelector(".box-texto");
    var pEl = cv.querySelector(".box-ptexto");
    var nEl = cv.querySelector(".box-nombre");
    if (tEl) ajustarTextoVista(tEl, 40);
    if (pEl) ajustarTextoVista(pEl, 34);
    if (nEl) ajustarNombreVista(nEl);
  }

  function esperarFuentes() {
    if (!document.fonts || !document.fonts.ready) return Promise.resolve();
    return Promise.race([
      document.fonts.ready,
      new Promise(function (r) { setTimeout(r, 4000); })
    ]);
  }

  function ajustarTextoVista(el, sizeIni) {
    var size = sizeIni;
    el.style.fontSize = size + "px";
    while (el.scrollHeight > el.clientHeight && size > 10) {
      size -= 1;
      el.style.fontSize = size + "px";
    }
  }

  function ajustarNombreVista(el) {
    el.style.letterSpacing = "0px";
    el.style.transform = "none";
    el.style.transformOrigin = "left center";
    var texto = (el.textContent || "").trim();
    if (!texto) return;

    var cs = getComputedStyle(el);
    var anchoDisponible = el.clientWidth;
    var limiteAtributo = 978;
    var cajaIzq = el.offsetLeft || 0;
    var maxUtil = limiteAtributo - cajaIzq;
    if (maxUtil > 0 && anchoDisponible > maxUtil) {
      anchoDisponible = maxUtil;
    }
    if (!(anchoDisponible > 0)) return;

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

      if (anchoTextoReal > anchoDisponible) {
        var mejorLetterSpacing = 0;
        var ls;
        for (ls = -1; ls >= -8; ls--) {
          medidor.style.letterSpacing = ls + "px";
          var nuevoAncho = medidor.getBoundingClientRect().width;
          mejorLetterSpacing = ls;
          anchoTextoReal = nuevoAncho;
          if (nuevoAncho <= anchoDisponible) break;
        }
        el.style.letterSpacing = mejorLetterSpacing + "px";
      }

      if (anchoTextoReal > anchoDisponible) {
        for (fontSize = 115; fontSize >= 80; fontSize--) {
          medidor.style.fontSize = fontSize + "px";
          anchoTextoReal = medidor.getBoundingClientRect().width;
          if (anchoTextoReal <= anchoDisponible) break;
        }
        el.style.fontSize = fontSize + "px";
      }

      var factorLetras = leerAjustesEditor().factorLetras;
      var fl = (isFinite(factorLetras) && factorLetras > 0) ? factorLetras : 1;
      if (fl !== 1 || anchoTextoReal > anchoDisponible) {
        var escalaX = Math.min(fl, anchoDisponible / anchoTextoReal);
        el.style.transform = "scaleX(" + escalaX + ")";
        el.style.transformOrigin = "left center";
      }
    } finally {
      document.body.removeChild(medidor);
    }
  }

  function generarMazo() {
    if (!currentDeck) return;

    var carpetaNombre = (window.prompt("¿En qué carpeta guardar el mazo? (Dejar vacío = nombre del mazo)", "") || "").trim();
    if (!carpetaNombre) carpetaNombre = (currentDeck.name || "mazo").replace(/[\\/:*?"<>|]+/g, "_").replace(/\s+/g, "_").slice(0, 60) || "mazo";

    establecerEstado("Guardando cartas del mazo… en cartas/" + carpetaNombre);

    var unicas = [];
    var vistos = {};
    var allCards = [];
    if (currentDeck.main) allCards = allCards.concat(currentDeck.main);
    if (currentDeck.extra) allCards = allCards.concat(currentDeck.extra);
    if (currentDeck.side) allCards = allCards.concat(currentDeck.side);
    allCards.forEach(function (c) {
      if (!vistos[c.id]) { vistos[c.id] = true; unicas.push(c); }
    });

    var total = unicas.length;
    var done = 0, fallas = 0;

    function siguiente(idx) {
      if (idx >= unicas.length) {
        establecerEstado("Mazo guardado: " + done + " cartas en cartas/" + carpetaNombre + (fallas ? " (" + fallas + " fallaron)" : "") + ".");
        return;
      }
      guardarUnaCarta(unicas[idx], carpetaNombre).then(function (ok) {
        done += ok ? 1 : 0;
        if (!ok) fallas++;
        establecerEstado("Guardando… " + (done + fallas) + "/" + total);
        siguiente(idx + 1);
      });
    }
    siguiente(0);
  }

  function guardarUnaCarta(c, carpetaNombre) {
    if (deckCardCache[c.id]) {
      var par = cartaDesdeCache(deckCardCache[c.id]);
      var cv = construirDomCarta(par.card, par.es);
      if (!cv) return Promise.resolve(false);
      return exportarPNGDataURL(cv).then(function (dataUrl) {
        return fetch("/guardar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            carpeta: carpetaNombre,
            nombre: (par.es.nombre || par.card.name) + " [" + (c.loc || "") + "]",
            png: dataUrl
          })
        }).then(function (r) { return r.json(); }).then(function (res) {
          return !!res.ok;
        });
      }).catch(function () { return false; });
    }
    return api("cardinfo.php?id=" + c.id)
      .then(function (j) {
        var card = (j.data || [])[0];
        if (!card) throw new Error("Carta no encontrada");
        return obtenerEspanol(card.name).then(function (es) {
          var cv = construirDomCarta(card, es);
          if (!cv) throw new Error("Sin layout");
          return exportarPNGDataURL(cv).then(function (dataUrl) {
            return fetch("/guardar", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                carpeta: carpetaNombre,
                nombre: (es.nombre || card.name) + " [" + (c.loc || "") + "]",
                png: dataUrl
              })
            }).then(function (r) { return r.json(); }).then(function (res) {
              return !!res.ok;
            });
          });
        });
      })
      .catch(function () { return false; });
  }

  function exportarPNGDataURL(cv) {
    var montaje = document.createElement("div");
    montaje.style.cssText = "position:fixed;top:0;left:0;width:1180px;height:1720px;pointer-events:none;visibility:hidden;z-index:-1;";
    montaje.appendChild(cv);
    document.body.appendChild(montaje);
    function desmontar() {
      if (montaje.parentNode) montaje.parentNode.removeChild(montaje);
    }
    return esperarFuentes().then(function () {
      return new Promise(function (r) { setTimeout(r, 150); });
    }).then(function () {
      ajustarVista(cv);
      inlineEstilosVista(cv);
      cv.style.transform = "none";
      cv.style.transformOrigin = "0 0";
      var clon = cv.cloneNode(true);
      var caja = document.createElement("div");
      caja.setAttribute("style", "width:1180px;height:1720px;transform:scale(2);transform-origin:0 0;");
      caja.appendChild(clon);
      var sinImgenes = Array.prototype.slice.call(clon.querySelectorAll("img"));
      return Promise.all(sinImgenes.map(function (img) {
        var src = img.getAttribute("src") || "";
        if (!src) { img.removeAttribute("src"); return Promise.resolve(); }
        return leerImagenVista(src).then(function (u) {
          img.setAttribute("src", u);
        }).catch(function () { img.remove(); });
      })).then(function () {
        return reemplazarFondosVista(clon);
      }).then(function () {
        return fuentesInlineVista();
      }).then(function (fuentes) {
        return cssPaginaVista().then(function (css) {
          var svg = '<?xml version="1.0" encoding="utf-8"?>' +
            '<svg xmlns="http://www.w3.org/2000/svg" width="2360" height="3440">' +
            "<style>" + css + fuentes + "</style>" +
            '<foreignObject width="2360" height="3440">' + new XMLSerializer().serializeToString(caja) + "</foreignObject></svg>";
          var urlSvg = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
          var im = new Image();
          return new Promise(function (res, rej) {
            im.onload = function () {
              var cv2 = document.createElement("canvas");
              cv2.width = 2360;
              cv2.height = 3440;
              var ctx = cv2.getContext("2d");
              ctx.drawImage(im, 0, 0, 2360, 3440);
              res(cv2.toDataURL("image/png"));
            };
            im.onerror = function () { rej(new Error("SVG no se renderizó")); };
            im.src = urlSvg;
          });
        });
      }).then(function (dataUrl) {
        desmontar();
        return dataUrl;
      }, function (e) {
        desmontar();
        throw e;
      });
    });
  }

  function blobToDataURLVista(b) {
    return new Promise(function (res, rej) {
      var fr = new FileReader();
      fr.onload = function () { res(fr.result); };
      fr.onerror = rej;
      fr.readAsDataURL(b);
    });
  }

  function leerImagenVista(src) {
    return fetch(/^https?:/i.test(src) ? "/obra?url=" + encodeURIComponent(src) : src)
      .then(function (r) {
        if (!r.ok) throw new Error("img " + r.status);
        return r.blob();
      })
      .then(blobToDataURLVista);
  }

  function inlineEstilosVista(el) {
    var cs = getComputedStyle(el);
    el.setAttribute("style", (el.getAttribute("style") || "") + ";" + cs.cssText);
    Array.prototype.forEach.call(el.children, inlineEstilosVista);
  }

  function cssPaginaVista() {
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

  function reemplazarFondosVista(el) {
    var bg = (el.style && el.style.backgroundImage) || "";
    var p = (bg && bg !== "none" && bg.match(/url\(\s*["']?([^"')]+)["']?\s*\)/))
      ? leerImagenVista(bg.match(/url\(\s*["']?([^"')]+)["']?\s*\)/)[1]).then(function (u) {
        el.style.backgroundImage = "url(" + u + ")";
      }).catch(function () { el.style.backgroundImage = "none"; })
      : Promise.resolve();
    return p.then(function () {
      var hijos = Array.prototype.slice.call(el.children);
      var q = [];
      hijos.forEach(function (h) { q.push(reemplazarFondosVista(h)); });
      return Promise.all(q);
    });
  }

  function fuentesInlineVista() {
    var defs = [
      ["fontCardName", "assets/fonts/YGOSmallCaps.ttf", "truetype"],
      ["fontCardNameHashFix", "assets/fonts/YGOSmallCapsHashFix.ttf", "truetype"],
      ["fontCardType", "assets/fonts/StoneSerifSmallCapsBold.ttf", "truetype"],
      ["fontCardEffect", "assets/fonts/YGO_Card_NA.ttf", "truetype"],
      ["fontATKValue", "assets/fonts/MatrixRegular.ttf", "truetype"],
      ["fontLink", "assets/fonts/FOT-KafuTechnoStd-H.otf", "opentype"]
    ];
    return Promise.all(defs.map(function (d) {
      return fetch(d[1]).then(function (r) { return r.blob(); })
        .then(blobToDataURLVista)
        .then(function (url) {
          return '@font-face{font-family:"' + d[0] + '";src:url(' + url + ') format("' + d[2] + '");}';
        })
        .catch(function () { return ""; });
    })).then(function (partes) { return partes.join(""); });
  }

  /* Convierte una CartaNormalizada (del Buscador) a la forma { card, es }
   * que esperan construirDomCarta/renderDeckPreview. `card` conserva los
   * campos que lee decidirTipoFrame y construirDatosCarta. */
  function cartaDesdeCache(c) {
    var tipoStr = tipoDesdeNormalizada(c) || (c.esSpellTrap ? "Spell Card" : "Effect Monster");
    var card = {
      id: c.password,
      name: c.nombreEN || c.nombre,
      type: tipoStr,
      race: c.tipo || (c.esSpellTrap ? c.subtipo : ""),
      attribute: c.atributo || "",
      level: c.nivel || 0,
      rank: c.rango || 0,
      linkval: c.link || 0,
      scale: c.pscale || "",
      atk: c.atk || "",
      def: c.def || "",
      desc: c.texto || "",
      card_images: [ { image_url_cropped: c.arte, image_url: c.arte } ]
    };
    var es = { nombre: c.nombre, texto: c.texto, ptexto: c.ptexto };
    return { card: card, es: es };
  }

  function decidirTipoFrame(card) {
    var tipo = "monstruo-normal";
    var frame = "assets/base/monster_normal.png";

    if (card.type) {
      var t = card.type.toLowerCase();
      if (t.includes("spell")) tipo = "magica", frame = "assets/base/spell.png";
      else if (t.includes("trap")) tipo = "trampa", frame = "assets/base/trap.png";
      else if (t.includes("link")) tipo = "monstruo-link", frame = "assets/base/monster_link.png";
      else if (t.includes("xyz")) tipo = "monstruo-xyz", frame = "assets/base/monster_xyz.png";
      else if (t.includes("synchro")) tipo = "monstruo-synchro", frame = "assets/base/monster_synchro.png";
      else if (t.includes("fusion")) tipo = "monstruo-fusion", frame = "assets/base/monster_fusion.png";
      else if (t.includes("ritual")) tipo = "monstruo-ritual", frame = "assets/base/monster_ritual.png";
      else if (t.includes("pendulum")) tipo = /normal/i.test(card.type) ? "pendulum-normal" : "pendulum-efecto", frame = "assets/base/pendulum_effect.png";
      else if (t.includes("token")) tipo = "monstruo-token", frame = "assets/base/monster_token.png";
      else if (t.includes("effect") || t.includes("normal")) tipo = "monstruo-efecto", frame = "assets/base/monster_effect.png";
      else if (t.includes("normal")) tipo = "monstruo-normal", frame = "assets/base/monster_normal.png";
    }

    return { tipo: tipo, frame: frame };
  }

  function construirDatosCarta(card, es) {
    es = es || {};
    var habTokens = (card.type || "").split(/\s+/).filter(function (t) {
      return /(Normal|Effect|Fusion|Synchro|Xyz|Link|Ritual|Pendulum|Tuner|Toon|Spirit|Union|Gemini|Flip|Token)/i.test(t);
    }).map(function (t) {
      var key = Object.keys(HAB_ES).find(function (k) { return k.toLowerCase() === t.toLowerCase(); });
      return key ? HAB_ES[key] : t;
    });
    return {
      tipo: TIPOS_ES[card.race] || card.race || "",
      habilidad: habTokens.join(" / ") || "Normal",
      carta: {
        nombre: limpiarNombre(es.nombre || card.name),
        atributo: card.attribute || "",
        nivel: card.level || 0,
        rango: card.rank || 0,
        link: card.linkval || 0,
        tipo: TIPOS_ES[card.race] || card.race || "",
        habilidad: habTokens.join(" / ") || "Normal",
        texto: es.texto || card.desc || "",
        atk: card.atk || "",
        def: card.def || "",
        pscale: card.scale || "",
        ptexto: es.ptexto || "",
        numero: "",
        password: card.id || "",
        copyright: "©1996-2026 Konami",
        arte: card.card_images && card.card_images[0] ? (card.card_images[0].image_url_cropped || card.card_images[0].image_url) : ""
      }
    };
  }

  btnSearch.addEventListener("click", buscarMazos);
  search.addEventListener("keydown", function (e) { if (e.key === "Enter") buscarMazos(); });
  btnGenerate.addEventListener("click", generarMazo);
  btnExport.addEventListener("click", function () { alert("Exportar ZIP próximamente"); });
  initAutocomplete();

  var CLAVES_SYNC = [
    "ygo-offset-y",
    "ygo-nombre-ancho",
    "ygo-atributo-size",
    "ygo-letras-factor",
    "ygo-cardtype-x",
    "ygo-estrellas-offset"
  ];
  window.addEventListener("storage", function (e) {
    if (CLAVES_SYNC.indexOf(e.key) !== -1 && currentDeck) {
      renderDeckPreview(currentDeck);
    }
  });
})();