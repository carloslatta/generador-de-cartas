(function () {
  /* =========================================================
   * Buscador — búsqueda unificada de cartas de Yu-Gi-Oh!
   *
   * Fuente principal: YGOPRODeck (datos + imágenes, 100% catálogo).
   * Fuente de traducción (ES): Yugipedia (es_name / es_text).
   *
   * Compensa el bug de `fname` (falla con frases con espacios)
   * tokenizando la consulta y uniendo resultados por id.
   * ========================================================= */

  var YGOPRODECK = "https://db.ygoprodeck.com/api/v7/";
  var proxyBase = (typeof window !== "undefined" && window.BASE_PROXY) || "";

  function proxy(fullUrl) {
    return fetch(proxyBase + "/api?url=" + encodeURIComponent(fullUrl), { headers: { "User-Agent": "YGODeckGenerator/1.0" } })
      .then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      });
  }

  function normalizar(s) {
    return String(s || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/[\s-]+/g, " ")
      .trim();
  }

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
    var re = new RegExp("(?:^|\\n)\\|[ \\t]*" + nombre + "[ \\t]*=[ \\t]*([\\s\\S]*?)(?=\\n\\||\\n}}|$)", "i");
    var m = wt.match(re);
    return m ? limpiarWiki(m[1]) : "";
  }

  function urlArtePorId(id) {
    return "https://images.ygoprodeck.com/images/cards/" + id + ".jpg";
  }

  function scoreNombre(nt, nq) {
    if (nt === nq) return 4;
    if (nt.indexOf(nq) === 0) return 3;
    if (nt.indexOf(nq) !== -1) return 2;
    if (nq.indexOf(nt) !== -1) return 1;
    return 0;
  }

  var RACE_ES = {
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

  function esSpellTrap(card) {
    var t = String(card.type || card.frameType || "").toLowerCase();
    return t.indexOf("spell") !== -1 || t.indexOf("trap") !== -1;
  }

  /* Convierte una carta de YGOPRODeck a CartaNormalizada.
   * Datos siempre presentes; `arte` cae a URL directa por id si falta card_images. */
  function cartaDesdeYGOPRODeck(card) {
    var es = esSpellTrap(card);
    var imgs = (card.card_images || [])[0] || {};
    var frame = String(card.frameType || "");
    var hab = "Normal";
    if (/fusion/i.test(frame)) hab = "Fusion";
    else if (/synchro/i.test(frame)) hab = "Synchro";
    else if (/xyz/i.test(frame)) hab = "Xyz";
    else if (/link/i.test(frame)) hab = "Link";
    else if (/ritual/i.test(frame)) hab = "Ritual";
    else if (/token/i.test(frame)) hab = "Token";
    else if (/effect/i.test(frame) || /normal/i.test(frame)) {
      var tp = String(card.type || "");
      hab = /normal monster/i.test(tp) ? "Normal" : "Effect";
    }
    var nivel = 0;
    if (!es && card.level) nivel = card.level;
    var rango = 0;
    if (/xyz/i.test(frame) && card.level) rango = card.level;
    var link = card.linkval || 0;

    return {
      nombre: card.name,
      nombreEN: card.name,
      texto: card.desc || "",
      ptexto: "",
      tipo: es ? "" : (RACE_ES[card.race] || card.race || ""),
      habilidad: es ? "" : hab,
      atributo: es ? (String(card.type).toLowerCase().indexOf("trap") !== -1 ? "TRAP" : "SPELL") : (card.attribute || ""),
      nivel: nivel,
      rango: rango,
      link: link,
      atk: es ? "" : (card.atk != null ? card.atk : ""),
      def: es ? "" : (link ? "" : (card.def != null ? card.def : "")),
      pscale: card.scale || 0,
      password: card.id,
      esSpellTrap: es,
      subtipo: es ? (card.race || "") : "",
      frameType: frame,
      linkmarkers: card.linkmarkers || [],
      archetype: card.archetype || "",
      arte: imgs.image_url_cropped || imgs.image_url || (card.id ? urlArtePorId(card.id) : "")
    };
  }

  function topN(arr, n) {
    return arr.slice(0, n);
  }

  var STOPWORD = {
    "de": 1, "la": 1, "el": 1, "los": 1, "las": 1, "del": 1, "al": 1,
    "the": 1, "of": 1, "and": 1, "a": 1, "an": 1, "to": 1, "in": 1,
    "en": 1, "y": 1, "o": 1, "u": 1, "un": 1, "una": 1, "unos": 1, "unas": 1,
    "or": 1, "for": 1, "with": 1, "from": 1, "on": 1, "by": 1
  };

  function tokenizar(s) {
    return normalizar(s).split(/\s+/).filter(function (t) {
      return t.length >= 3 && !STOPWORD[t];
    });
  }

  function buscarYGOPRODeck(nq) {
    var tokens = tokenizar(nq);
    var consultas = [normalizar(nq)];
    if (tokens.length > 1) { consultas.push(tokens.join("-")); }
    tokens.slice(0, 4).forEach(function (t) {
      if (consultas.indexOf(t) === -1) { consultas.push(t); }
    });
    var promesas = consultas.map(function (c) {
      return proxy(YGOPRODECK + "cardinfo.php?fname=" + encodeURIComponent(c) + "&num=50&offset=0")
        .then(function (j) { return j.data || []; })
        .catch(function () { return []; });
    });
    return Promise.all(promesas).then(function (porConsulta) {
      var porId = {};
      porConsulta.forEach(function (lista) {
        lista.forEach(function (card) {
          if (!porId[card.id]) { porId[card.id] = card; }
        });
      });
      var cards = Object.keys(porId).map(function (k) { return porId[k]; });
      var nNorm = normalizar(nq);
      cards.forEach(function (card) {
        card.__score = scoreNombre(normalizar(card.name), nNorm);
      });
      cards.sort(function (a, b) { return b.__score - a.__score; });
      return cards;
    });
  }

  window.Buscador = {
    normalizar: normalizar,
    scoreNombre: scoreNombre,
    urlArtePorId: urlArtePorId,
    cartaDesdeYGOPRODeck: cartaDesdeYGOPRODeck
  };

  /* =========================================================
   * Task 3 — Yugipedia: traducción es_name/es_text con caché
   * ========================================================= */
  var YUGIPEDIA = "https://yugipedia.com/api.php";
  var tradCache = {};

  function wikitextoYugipedia(titulo, profundidad) {
    profundidad = profundidad || 0;
    if (profundidad > 3) { return Promise.resolve(""); }
    return proxy(YUGIPEDIA + "?action=query&format=json&prop=revisions&rvprop=content&titles=" + encodeURIComponent(titulo))
      .then(function (j) {
        var pg = null;
        Object.keys(j.query.pages || {}).forEach(function (id) {
          if (!pg && j.query.pages[id].revisions) { pg = j.query.pages[id]; }
        });
        if (!pg) { return ""; }
        var rev = pg.revisions[0];
        var wt = rev.slots && rev.slots.main && rev.slots.main["*"] ? rev.slots.main["*"] : rev["*"];
        wt = wt || "";
        var m = wt.match(/#REDIRECT\s*\[\[([^\]|]+)/i);
        if (m) { return wikitextoYugipedia(m[1].trim(), profundidad + 1); }
        return wt;
      })
      .catch(function () { return ""; });
  }

  function obtenerEspanol(nombreEN) {
    if (tradCache[nombreEN]) { return Promise.resolve(tradCache[nombreEN]); }
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

  /* =========================================================
   * Task 4 — Buscador.buscar(q): YGOPRODECK primero, Yugipedia de relleno
   * ========================================================= */

  function cartaCompleta(card, es) {
    var carta = cartaDesdeYGOPRODeck(card);
    carta.nombreEN = card.name;
    if (es) {
      if (es.nombre && es.nombre !== card.name) { carta.nombre = es.nombre; }
      if (es.texto) { carta.texto = es.texto; }
      if (es.ptexto) { carta.ptexto = es.ptexto; }
    }
    return carta;
  }

  function buscarYugipedia(q, nq) {
    var titles = {};
    var tokens = tokenizar(nq);
    var metas = [
      proxy(YUGIPEDIA + "?action=query&format=json&list=prefixsearch&psnamespace=0&pslimit=6&pssearch=" + encodeURIComponent(q))
        .then(function (j) {
          (j.query.prefixsearch || []).forEach(function (x) { titles[x.title] = true; });
        }).catch(function () {}),
      proxy(YUGIPEDIA + "?action=query&format=json&list=search&srnamespace=0&srlimit=10&srwhat=text&srsearch=" + encodeURIComponent(q))
        .then(function (j) {
          (j.query.search || []).forEach(function (x) { titles[x.title] = true; });
        }).catch(function () {}),
      proxy(YUGIPEDIA + "?action=query&format=json&list=search&srnamespace=0&srlimit=5&srwhat=text&srsearch=" + encodeURIComponent(nq))
        .then(function (j) {
          (j.query.search || []).forEach(function (x) { titles[x.title] = true; });
        }).catch(function () {})
    ];
    tokens.slice(0, 2).forEach(function (tok) {
      metas.push(
        proxy(YUGIPEDIA + "?action=query&format=json&list=search&srnamespace=0&srlimit=4&srwhat=text&srsearch=" + encodeURIComponent(tok))
          .then(function (j) {
            (j.query.search || []).forEach(function (x) { titles[x.title] = true; });
          }).catch(function () {})
      );
    });
    return Promise.all(metas).then(function () {
      return verificarCandidatosYugipedia(Object.keys(titles), nq);
    });
  }

  function puntuarTokens(nt, nq) {
    var tq = tokenizar(nq);
    if (!tq.length) { return 0; }
    var tn = tokenizar(nt);
    var vistos = 0;
    tq.forEach(function (t) {
      if (tn.indexOf(t) !== -1) { vistos++; }
    });
    return Math.round((vistos / tq.length) * 100);
  }

  function verificarCandidatosYugipedia(cands, nq) {
    var lote = cands.slice(0, 8);
    if (!lote.length) { return Promise.resolve([]); }
    return Promise.all(lote.map(function (t) {
      return wikitextoYugipedia(t).then(function (wt) {
        if (!/CardTable2/i.test(wt)) {
          return { t: t, es: "", wt: "", score: scoreNombre(normalizar(t), nq) };
        }
        var es = campoWiki(wt, "es_name");
        var ntEs = normalizar(es);
        var ntT = normalizar(t);
        var score = Math.max(
          scoreNombre(ntEs, nq),
          scoreNombre(ntT, nq),
          puntuarTokens(ntEs, nq),
          puntuarTokens(ntT, nq)
        );
        return { t: t, es: es, wt: wt, score: score };
      }).catch(function () {
        return { t: t, es: "", wt: "", score: scoreNombre(normalizar(t), nq) };
      });
    })).then(function (ver) {
      ver.sort(function (a, b) { return b.score - a.score; });
      var mejores = ver.filter(function (v) { return v.score >= 50; });
      if (!mejores.length) { return []; }
      var stack = mejores.slice(0, 4);
      return Promise.all(stack.map(function (v) { return cartaDesdeYugipedia(v); }))
        .then(function (cartas) {
          var vistos = {};
          return cartas.filter(function (c) {
            if (!c || !c.password || vistos[c.password]) { return false; }
            vistos[c.password] = true;
            return true;
          });
        });
    });
  }

  function cartaDesdeYugipedia(v) {
    var password = campoWiki(v.wt, "password");
    var nombreEN = campoWiki(v.wt, "name") || v.t;
    var consulta = "";
    if (/^\d+$/.test(password)) {
      consulta = "cardinfo.php?id=" + encodeURIComponent(password);
    } else {
      consulta = "cardinfo.php?name=" + encodeURIComponent(nombreEN);
    }
    return proxy(YGOPRODECK + consulta)
      .then(function (j) {
        if (!j || !j.data || !j.data.length) { return null; }
        var es = { nombre: v.es || "", texto: campoWiki(v.wt, "es_text"), ptexto: campoWiki(v.wt, "es_pendulum_effect") };
        var carta = cartaCompleta(j.data[0], es);
        carta.nombreEN = nombreEN;
        return carta;
      })
      .then(function (carta) {
        if (carta) { return carta; }
        var es = { nombre: v.es || "", texto: campoWiki(v.wt, "es_text"), ptexto: campoWiki(v.wt, "es_pendulum_effect") };
        return {
          nombre: es.nombre || v.t,
          nombreEN: nombreEN,
          texto: es.texto || "",
          ptexto: es.ptexto || "",
          tipo: "", habilidad: "Effect", atributo: "",
          nivel: 0, rango: 0, link: 0, pscale: 0,
          atk: "", def: "", password: password,
          esSpellTrap: false, subtipo: "",
          arte: urlArtePorId(password)
        };
      })
      .catch(function () { return null; });
  }

  /* =========================================================
   * Índice local (cards.json) — caché rápida de {id, name}.
   * Primer intento de Buscador.buscar: si hay match fuerte con
   * el name EN oficial, se completa el detalle por id exacto.
   * Si el índice falta, falla la carga o no acierta, se cae al
   * flujo YGOPRODeck→Yugipedia de siempre (sin cambios).
   * ========================================================= */
  var indiceListo = false;
  var indiceLista = [];   // [{id, name, nt}] con nt = name normalizado

  function cargarIndice() {
    return fetch(proxyBase + "/cards.json")
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) {
        if (!j || !j.cards || !j.cards.length) { return; }
        indiceLista = j.cards.map(function (c) {
          return { id: c.id, name: c.name, nt: normalizar(c.name) };
        });
        indiceListo = true;
      })
      .catch(function () { /* sin índice: se usa el flujo de siempre */ });
  }

  function contarTokens(nt, tq) {
    var tn = tokenizar(nt);
    var v = 0;
    tq.forEach(function (t) { if (tn.indexOf(t) !== -1) { v++; } });
    return v;
  }

  /* Devuelve top candidatos [{id,name,score}] del índice local, o [] si no hay match útil. */
  function buscarIndice(nq) {
    if (!indiceListo) { return []; }
    var tq = tokenizar(nq);
    var porId = {};
    var mejor = 0;
    for (var i = 0; i < indiceLista.length; i++) {
      var e = indiceLista[i];
      var s = scoreNombre(e.nt, nq);
      if (s < 2) { continue; }
      var count = contarTokens(e.nt, tq);
      if (!porId[e.id] || s > porId[e.id].score) {
        porId[e.id] = { id: e.id, name: e.name, score: s, count: count };
      }
      if (s > mejor) { mejor = s; }
    }
    var res = Object.keys(porId).map(function (k) { return porId[k]; });
    if (!res.length) { return []; }
    res.sort(function (a, b) {
      if (b.score !== a.score) { return b.score - a.score; }
      if (b.count !== a.count) { return b.count - a.count; }
      return a.name.localeCompare(b.name);
    });
    return res.slice(0, 5);
  }

  function constDelIndice(e) {
    return proxy(YGOPRODECK + "cardinfo.php?id=" + encodeURIComponent(e.id))
      .then(function (j) {
        if (!j || !j.data || !j.data.length) { return null; }
        return obtenerEspanol(e.name).then(function (es) {
          return cartaCompleta(j.data[0], es);
        });
      })
      .catch(function () { return null; });
  }

  function buscar(q) {
    var nq = normalizar(q);
    var candidatos = buscarIndice(nq);
    var fallback = function (cards) { return repartirYGOPRODeck(q, nq, cards); };
    if (candidatos.length) {
      return Promise.all(candidatos.map(constDelIndice)).then(function (cartas) {
        var vistos = {};
        var buenas = cartas.filter(function (c) {
          if (!c || !c.password || vistos[c.password]) { return false; }
          vistos[c.password] = true;
          return true;
        });
        if (buenas.length) { return buenas; }
        return buscarYGOPRODeck(nq).then(fallback);
      });
    }
    return buscarYGOPRODeck(nq).then(fallback);
  }

  function repartirYGOPRODeck(q, nq, cards) {
    var buenos = cards.filter(function (c) { return c.__score >= 2; });
    if (buenos.length) {
      return Promise.all(buenos.slice(0, 5).map(function (card) {
        return obtenerEspanol(card.name).then(function (es) {
          return cartaCompleta(card, es);
        });
      })).then(function (cartas) {
        var vistos = {};
        return cartas.filter(function (c) {
          if (!c.password || vistos[c.password]) { return false; }
          vistos[c.password] = true;
          return true;
        });
      });
    }
    return buscarYugipedia(q, nq);
  }

  window.Buscador = {
    buscar: buscar,
    normalizar: normalizar,
    scoreNombre: scoreNombre,
    urlArtePorId: urlArtePorId,
    cartaDesdeYGOPRODeck: cartaDesdeYGOPRODeck,
    _buscarYGOPRODeck: buscarYGOPRODeck,
    _buscarYugipedia: buscarYugipedia,
    _buscarIndice: buscarIndice,
    _estadoIndice: function () { return { listo: indiceListo, n: indiceLista.length }; }
  };

  cargarIndice();
})();