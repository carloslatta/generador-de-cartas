# Spec: `busqueda` — Módulo compartido de búsqueda (js/buscador.js)

## Objective

Crear un módulo plano global `Buscador` que unifica la búsqueda de cartas de Yu-Gi-Oh! para
`armar.html` y `deck.html`. Hoy `armar.js` busca solo en Yugipedia y `deck.js` solo en
YGOPRODECK, con comportamientos divergentes. El módulo debe:

- Dar prioridad a YGOPRODECK como fuente de datos e imágenes (100% cartas TCG/OCG).
- Caer a Yugipedia cuando YGOPRODECK no acierta o el usuario escribe en español.
- Compensar el bug de `fname` con frases (ver Decisiones aprobadas) mediante tokenización.
- Devolver un objeto de carta normalizado que ambos consumidores puedan renderizar sin cambios
  en sus DOM.

Usuarios: el operador que armma una carta individual (armar.html) y el que genera un mazo
(deck.html). Éxito: ambas páginas encuentran las mismas cartas, con datos e imagen, escribiendo
tanto en inglés como en español ("Dragón Alternativo" → "Dragón Blanco Alternativo de Ojos Azules").

## Tech Stack

- JavaScript ES5 (IIFE), sin dependencias nuevas, `fetch` + proxy `/api` ya existente.
- HTTP DND simple contra `https://db.ygoprodeck.com/api/v7/cardinfo.php`.
- Yugipedia: `https://yugipedia.com/api.php` (MediaWiki API, action=query).

## Commands

- Servir/desarrollar: `node server.js` → http://localhost:8080
- Sintaxis: `node --check js/buscador.js`
- Smoke test manual: editor, armar.html y deck.html en navegador.

## Project Structure

```
js/buscador.js   → Nuevo módulo (este spec). Se carga ANTES de armar.js/deck.js en ambos HTML.
js/armar.js      → Módulo `armar`: consumidor (integrado en fase 2).
js/deck.js       → Módulo `deck`: consumidor (integrado en fase 3).
```

## Code Style

ES5, IIFE, `var`, funciones nombradas, sin arrow functions, sin template literals — igual que
armar.js/deck.js. Expone una API global mínima:

```js
window.Buscador = {
  buscar: function (q) { /* => Promise<Array<CartaNormalizada>> */ },
  normalizar: function (s) { /* => String */ }
};
```

CartaNormalizada (campos comunes que hoy cada página deduce por su cuenta):

```js
{
  nombre: "Dragón Blanco Alternativo de Ojos Azules",   // ES si hay traducción
  nombreEN: "Blue-Eyes Alternative White Dragon",
  texto: "…",        // ES si hay traducción, si no desc EN
  ptexto: "",        // efecto péndulo ES
  tipo: "Dragón",    // race traducida
  habilidad: "Effect",
  atributo: "LIGHT",
  nivel: 8, rango: 0, link: 0, pscale: 0,
  atk: 2500, def: 2000,
  password: 23015896,
  esSpellTrap: false,
  subtipo: "",       // property
  arte: "https://images.ygoprodeck.com/images/cards/…jpg"
}
```

## Testing Strategy

Sin framework de test instalado. Cobertura práctica:

1. `node --check` después de cada edición.
2. Scripts puppeteer ad-hoc en `C:\Users\RYZEN\AppData\Local\Temp\opencode\rgtest`
   (test2x.js) que abren localhost, escriben consultas y verifican contra el DOM.
3. Verificación por consola de Node del módulo con un stub de DOM (mock-dom.js) o
   extracción de la función pura.

## Boundaries

- Always: usar el proxy `/api?url=` para YGOPRODECK y Yugipedia (CORS + UA). Normalizar toda
  entrada con `normalizar()`. Mantener ES5. No duplicar lógica de ranking que ya exista.
- Ask first: añadir dependencias npm; cambiar el endpoint proxy del servidor; reescribir la
  lógica de render de contenido del DOM integrado.
- Never: consultas directas cross-origin; guardar claves/secretos; tocar la API de YGOPRODECK
  sin pasar por el proxy.

## Success Criteria

- [ ] `Buscador.buscar("Blue Eyes White Dragon")` devuelve la carta (bug de `fname` vencido).
- [ ] `Buscador.buscar("Dragón Alternativo de Ojos Azules")` encuentra "Dragón Blanco Alternativo de Ojos Azules" con `nombre` en español y `arte` de YGOPRODECK.
- [ ] `arte` siempre presente cuando existe ID (URL directa generada) aunque `card_images` venga vacío.
- [ ] Resultados únicos (sin duplicados al fusionar YGOPRODECK + Yugipedia).
- [ ] `node --check js/buscador.js` pasa.
- [ ] Fase 2/3: armar.html y deck.html consumen `Buscador` sin regresiones (smoke en Chrome).

## Decisiones cerradas

- **Traducción**: YGOPRODECK es la fuente de datos/frame (nivel, atk, tipo, etc.). Yugipedia SOLO
  aporta `es_name`/`es_text`/`es_pendulum_effect` (un request por carta, sin wikitexto completo).
  Si la carta no tiene traducción, se usan `name`/`desc` en inglés.
- **Ranking**: el módulo ordena por score simple y entrega los top N. Cada página conserva su
  presentación (dropdown/opciones), pero no su propia lógica de ranking de búsqueda.