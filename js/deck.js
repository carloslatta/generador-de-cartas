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

  var currentDeck = null;
  var suggestionBox = null;
  var suggestionDebounce = null;
  var cardNameCache = [];
  var cardNameCacheLoaded = false;
  var exportSeq = 0;

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
    // Usar fname para búsqueda fuzzy (prefijo) - SIN num parameter
    api("cardinfo.php?fname=" + encodeURIComponent(query))
      .then(function (j) {
        var cards = j.data || [];
        if (!cards.length) {
          suggestionBox.style.display = "none";
          return;
        }
        suggestionBox.innerHTML = cards.slice(0, 15).map(function (c) {
          return "<div class='suggestion-item' data-name='" + c.name.replace(/'/g, "'") + "' style='padding:8px 12px;cursor:pointer;border-bottom:1px solid #333;'>" + c.name + "</div>";
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
      var t = (c.type || "").toLowerCase();
      var count = 3;
      if (t.includes("spell") || t.includes("trap")) count = 2;
      if (t.includes("link") || t.includes("xyz") || t.includes("synchro") || t.includes("fusion")) {
        extra.push({ id: c.id, count: 1 });
      } else {
        main.push({ id: c.id, count: count });
      }
    });
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
      api("cardinfo.php?id=" + c.id)
        .then(function (j) {
          var card = (j.data || [])[0];
          if (!card) throw new Error("Carta no encontrada");
          return obtenerEspanol(card.name).then(function (es) {
            var thumb = dibujarVistaCarta(card, es, c.loc || "");
            if (thumb) {
              grid.appendChild(thumb);
              ajustarEscala(thumb);
            }
          });
        })
        .catch(function () {});
    });
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

  function dibujarVistaCarta(card, es, loc) {
    es = es || {};
    var tf = decidirTipoFrame(card);
    var datos = construirDatosCarta(card, es);
    var carta = datos.carta;
    var layout = window.LAYOUTS[tf.tipo];
    if (!layout) return null;
    var meta = layout.meta || {};

    var thumb = document.createElement("div");
    thumb.className = "card-thumb thumb-vista";
    thumb.style.position = "relative";
    thumb.style.overflow = "hidden";
    thumb.style.aspectRatio = "1180 / 1720";

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
      boxes["nombre"].style.fontSize = "46px";
      boxes["nombre"].style.letterSpacing = "0px";
      boxes["nombre"].style.whiteSpace = "nowrap";
      boxes["nombre"].style.textOverflow = "ellipsis";
    }

    if (boxes["atributo"]) {
      var claveAtr = meta.tipo === "spell" ? "SPELL" : meta.tipo === "trap" ? "TRAP" : String(carta.atributo || "").toUpperCase();
      if (ATTRS[claveAtr]) {
        boxes["atributo"].innerHTML = "";
        var ai = document.createElement("img");
        ai.src = ATTRS[claveAtr];
        ai.alt = "";
        ai.style.maxWidth = "100%";
        ai.style.maxHeight = "100%";
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
        st.style.height = "78%";
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
        rkImg.style.height = "78%";
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
      boxes["cardtype"].style.fontSize = "34px";
      boxes["cardtype"].style.paddingLeft = meta.tipo === "trap" ? "19px" : "0";
    }

    if (boxes["tipo"]) {
      boxes["tipo"].textContent = "[ " + (carta.tipo || "") + " / " + (carta.habilidad || "Normal") + " ]";
      boxes["tipo"].style.color = "#000";
      boxes["tipo"].style.fontSize = "34px";
    }

    if (boxes["texto"]) {
      boxes["texto"].textContent = carta.texto || "";
      boxes["texto"].style.color = "#000";
      boxes["texto"].style.fontSize = "40px";
      boxes["texto"].style.fontStyle = (meta.esNormal || carta.habilidad === "Normal") ? "italic" : "normal";
    }

    if (boxes["ptexto"]) boxes["ptexto"].textContent = carta.ptexto || "";
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
        cv.style.transform = "scale(" + sc + ")";
        thumb.style.height = Math.round(1720 * sc) + "px";
      }
    });
  }

  function generarMazo() {
    if (!currentDeck) return;
    establecerEstado("Generando cartas del mazo…");
    var allCards = [];
    if (currentDeck.main) allCards = allCards.concat(currentDeck.main);
    if (currentDeck.extra) allCards = allCards.concat(currentDeck.extra);
    if (currentDeck.side) allCards = allCards.concat(currentDeck.side);

    var total = allCards.length;
    var done = 0;

    function siguiente(idx) {
      if (idx >= allCards.length) {
        establecerEstado("¡Mazo generado! " + done + " cartas.");
        return;
      }
      var c = allCards[idx];
      generarCarta(c.id, c.count || 1).then(function () {
        done++;
        establecerEstado("Generando… " + done + "/" + total);
        siguiente(idx + 1);
      }).catch(function () { siguiente(idx + 1); });
    }
    siguiente(0);
  }

  function generarCarta(id, count) {
    return api("cardinfo.php?id=" + id)
      .then(function (j) {
        var card = (j.data || [])[0];
        if (!card) throw new Error("Carta no encontrada");
        return obtenerEspanol(card.name).then(function (es) {
          return armarCartaDesdeAPI(card, count, es);
        });
      });
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
        nombre: es.nombre || card.name,
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

  function armarCartaDesdeAPI(card, count, es) {
    var tf = decidirTipoFrame(card);
    var datos = construirDatosCarta(card, es);
    var carta = datos.carta;

    window.CONFIG.base = tf.frame;
    window.CONFIG.layout = tf.tipo;
    window.CARD = carta;

    if (typeof construirCajas === "function") construirCajas();
    if (typeof render === "function") render();

    return exportarPNG(es.nombre || card.name);
  }

  function exportarPNG(nombre) {
    return new Promise(function (resolve) {
      exportSeq++;
      var n = String(nombre)
        .replace(/[\\/:*?"<>|]/g, "")
        .trim()
        .slice(0, 80) + "_" + String(exportSeq).padStart(3, "0");
      if (typeof exportarPNGGlobal === "function") {
        exportarPNGGlobal(n).then(resolve).catch(function () { resolve(); });
      } else {
        setTimeout(resolve, 100);
      }
    });
  }

  btnSearch.addEventListener("click", buscarMazos);
  search.addEventListener("keydown", function (e) { if (e.key === "Enter") buscarMazos(); });
  btnGenerate.addEventListener("click", generarMazo);
  btnExport.addEventListener("click", function () { alert("Exportar ZIP próximamente"); });
  initAutocomplete();
})();