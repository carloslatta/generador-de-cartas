# Generador de Cartas Yu-Gi-Oh!

Generador offline (servidor Node local) para armar cartas y decks de Yu-Gi-Oh!.

> **Aviso legal:** Proyecto de fans sin fines de lucro. Yu-Gi-Oh! y sus cartas, nombres e imágenes pertenecen a Konami Digital Entertainment. Este proyecto no está afiliado ni respaldado por Konami; el contenido generado es solo para uso personal y de colección.

## Requisitos

- Node.js (para el servidor y los tests)
- Google Chrome instalado en `C:/Program Files/Google/Chrome/Application/chrome.exe` (para los tests de navegador)

## Cómo arrancar

```bash
node server.js
```

Abrir en el navegador:

- **Armador de cartas**: `http://localhost:8080/armar.html`
- **Generador de decks**: `http://localhost:8080/deck.html`

El servidor expone `http://localhost:8080/api?url=...` como proxy para YGOPRODeck y Yugipedia (indispensable para buscar y bajar imágenes).

## Qué funciona (verificado)

### Búsqueda unificada (`js/buscador.js`)

Usado por `armar.html` y `deck.html`. Pipeta de fuentes en orden:

1. **Índice local** `cards.json` (12.891 cartas EN, `build-cards-index.js` lo regenera) → respuestas instantáneas sin red.
2. **YGOPRODeck** (`api.yugipedia...` vía proxy) → datos completos + texto ES + arte (imagen `images.ygoprodeck.com`).
3. **Yugipedia** (solo traducción de nombre/texto ES) → cae cuando el nombre buscado es ES y no hay coincidencia EN.

API pública: `window.Buscador.buscar(consulta)` → array de cartas `{nombre (ES), nombreEN, atk, def, nivel, tipo, habilidad, texto, password, arte, frameType, atributo, escala, linkmarkers, archetype}`.

- `Buscador._estadoIndice()` → `{listo, n}` (indica si el índice local cargó).
- Errores de red nunca rompen: cada fuente tiene fallback a la siguiente.

### Armador de cartas (`armar.html`, `js/armar.js`)

- Búsqueda por texto: teclea un nombre (EN o ES) y **auto-arma** la carta con datos del Buscador.
  - EN (o ES con match exacto en índice): arma directo con arte YGOPRODECK.
  - ES sin match: cae al flujo viejo (wikitexto de Yugipedia).
  - Borrar el campo vuelve al modo manual.
- Layouts según `frameType`: monstruo normal/efecto, xyz, link, synchro, fusion, ritual, pendulum, spell, trampa, token.
- Datos automáticos: nombre (ES), atributo, nivel/rank/link, atk/def, tipos, habilidades, texto ES, password, arte (imagen YGOPRODECK o máscara con la carta).
- Edición manual de todos los campos si hace falta (select de layouts `auto` por defecto).
- **Guardar PNG**: botón "Guardar PNG" → escriba nombre → `/cartas/<nombre>.png` vía `POST /guardar` (soporta subcarpetas con `carpeta`).
- `window.CARD` expone la carta activa; `obtenerTextoES` cachea traducciones.

### Generador de decks (`deck.html`, `js/deck.js`)

- **Autocomplete** al teclear: sugiere cartas con nombre ES + (EN) usando el Buscador.
- Búsqueda por texto:
  - **Nombre de carta** (ES o EN) → genera un deck con esa carta (y sus arquetipos relacionados si `archetype` disponible), con thumbnails y nombres en español.
  - **Deck publicado** → busca `cardinfo.php`/deck search y muestra resultados con thumbnails.
- Banlist: TCG / OCG / Goat Format.
- Exportar: **Generar 40 cartas** (usa el armador por detrás) y **Exportar ZIP**.
- `renderDeckPreview`: usa la CartaNormalizada del Buscador (nombre ES, texto, arte) cuando está en caché; si no, el camino viejo (`cardinfo.php?id` + `obtenerEspanol`) intacto.

## Browser tests (`tests/`)

Requieren el servidor corriendo (`node server.js`) y Chrome.

```bash
cd tests
npm install            # primera vez (puppeteer-core)
# navegador (E2E real):
node test-armar.js     # armar.html: EN (índice) y ES con auto-armado
node test-deck.js      # deck.html: autocomplete + búsqueda por carta ES
node test-descarga.js  # busca 5 cartas variadas y las guarda como PNG en cartas/
```

### Test de búsqueda + descarga (ejemplo)

```bash
node test-descarga.js
```

Busca 5 cartas (`Blue Eyes White Dragon` EN, `Dragón Blanco Alternativo de Ojos Azules` ES-effect, `Polimerización` ES-spell, `Call of the Haunted` trap, `Dragón de Ojos Azules Definitivo` ES-fusion), espera el auto-armado con el `password` esperado y guarda el PNG vía el servidor. Resultado esperado: `5 de 5 OK` y 5 PNGs en `cartas/`.

## Tests de módulo (Node, sin navegador)

```bash
node tests/test-buscador.js
```

Carga `mock-dom.js` + `js/buscador.js` y consulta el proxy real (requiere servidor). Corrobora el pipeline índice/YGOPRODECK/Yugipedia y el caso "sin resultados".

## Estructura de carpetas

```
armar.html          # Armador de cartas
deck.html           # Generador de decks
js/buscador.js      # Búsqueda unificada (núcleo, cacheado, con fallbacks)
js/armar.js         # Lógica del armador
js/deck.js          # Lógica de decks
js/content.js       # Datos de layouts/tipos
js/layouts.js       # Layouts de la carta (CSS)
css/card.css        # Estilos de la carta
server.js           # Servidor local + proxy /api + POST /guardar
cards.json          # Índice local de cartas EN (generado)
build-cards-index.js# Regenera cards.json
mock-dom.js         # Stub de DOM/data para tests de Node
tests/              # Tests (ver arriba)
tasks/              # Plan y todo
SPEC-*.md           # Specs
```

## Nota

`docs/CALIBRACION.md` documenta la calibración del dibujo; `tasks/todo.md` y `plan.md` llevan el plan. `cartas/` contiene PNGs generados (ignorados por git).

## Versiones

Ver [CHANGELOG.md](CHANGELOG.md) para el historial de releases. La última versión definitiva es `v1.0.0`.