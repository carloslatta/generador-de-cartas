# Tareas — Búsqueda unificada Yu-Gi-Oh!

## Phase 1: Módulo `busqueda`
- [x] Task 1: Crear `js/buscador.js` con `normalizar()`, ranking, normalización de carta YGOPRODECK → CartaNormalizada, generación de `arte` por ID
  - Accept: funciones puras `normalizar`, `scoreNombre`, `cartaDesdeYGOPRODeck`, `urlArtePorId` exportadas en `Buscador`
  - Verify: `node --check js/buscador.js`; test puppeteer de normalización
  - Files: js/buscador.js
- [x] Task 2: Búsqueda YGOPRODECK con estrategia `fname` + tokens + unión/dedupe
  - Accept: "Blue Eyes White Dragon" vence el bug de `fname` (devuelve la carta); "Dragón Alternativo de Ojos Azules" cae a tokenización
  - Verify: test puppeteer/Node contra proxy local
  - Files: js/buscador.js
- [x] Task 3: Fallback Yugipedia (traducción es_name/es_text) con caché
  - Accept: carta EN → nombre/texto ES si existen; cacheado por nombre EN
  - Verify: test Node con Blue-Eyes White Dragon → es_name
  - Files: js/buscador.js
- [x] Task 4: Exponer `Buscador.buscar(q)` público con fusión YGOPRODECK + Yugipedia
  - Accept: un solo call devuelve top N CartaNormalizada sin duplicados, con arte y ES
  - Verify: `node --check`; test puppeteer en armar.html
  - Files: js/buscador.js, armar.html (carga del script), deck.html (carga del script)
- [x] Task extra: Índice local `cards.json` (12.891 cartas {id,name}, ~770 KB) como primer intento de `buscar()`
  - Accept: load tolerante a fallo (`_estadoIndice().listo`); match EN fuerte → detalle por `?id=`; español/basura caen a YGOPRODECK→Yugipedia igual que antes
  - Verify: `node build-cards-index.js` regenera; tests Node + puppeteer confirman que EN usa índice y ES no rompe
  - Files: build-cards-index.js, cards.json, js/buscador.js

## Checkpoint: Módulo listo
- [x] `node --check js/buscador.js` pasa
- [x] Puppeteer: "Blue Eyes White Dragon", "Dragón Alternativo de Ojos Azules", "Polimerización"
- [x] Revisión humana antes de integrar

## Phase 2: Integrar `armar` (armar.js)
- [x] Task 5: Conectar `hacerBusqueda`/`buscarTexto` a `Buscador.buscar` manteniendo dropdown
  - Accept: teclear "dragón alternativo" arma la carta correcta automáticamente
  - Verify: smoke en Chrome (localhost:8080/armar.html)
  - Files: js/armar.js
- [x] Task 6: `armarCarta` usa datos/arte de `Buscador`
  - Accept: carta renderiza con datos completos y arte YGOPRODECK; guarda PNG OK
  - Verify: smoke en Chrome + `node --check js/armar.js`
  - Files: js/armar.js

## Checkpoint: armar listo
- [x] Smoke en Chrome: búsqueda en español encuentra carta, arte cargado, PNG OK
  - `hacerBusqueda` antepone `Buscador.buscar` (value=nombreEN); si vacío/error cae a `buscarYugipediaViejo` intacto
  - `armarCarta` usa `cartasBuscador[nombreEN]` → `armarDesdeBuscador` (layout/base desde frameType, sin wikitexto); ALIAS sigue por wikitexto (verificado: "Call of the Haunted" → trampa ES)

## Phase 3: Integrar `deck` (deck.js)
- [x] Task 7: Autocomplete (`mostrarSugerencias`) usa `Buscador.buscar`
  - Accept: sugerencias muestran nombre ES + (EN), con value=nombreEN
  - Verify: smoke en Chrome (localhost:8080/deck.html) + `node --check js/deck.js`
  - Files: js/deck.js
- [x] Task 8: `preguntarPorNombre` y vistas de carta usan `Buscador` (datos/ES/arte)
  - Accept: búsqueda por nombre de carta genera deck con thumbnails y arte
  - Verify: smoke en Chrome + `node --check js/deck.js`
  - Files: js/deck.js

## Checkpoint: deck listo
- [x] Smoke en Chrome: búsqueda por nombre de carta genera deck con thumbnails y arte
  - `mostrarSugerencias` antepone `Buscador.buscar` (label ES + (EN), data-name=nombreEN)
  - `preguntarPorNombre` antepone `Buscador.buscar`; arquetipo de la carta → relacionadas (fallback al api viejo)
  - `reservarDeck`/`cartaDesdeCache`/`deckCardCache`: las vistas usan CartaNormalizada (nombre ES, texto, arte YGOPRODECK) si está en caché; si no, api(id)+obtenerEspanol intactos
  - CartaNormalizada ahora incluye `archetype` (campo extra, sin romper)
- [ ] Revisión humana final