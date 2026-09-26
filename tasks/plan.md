# Implementation Plan: Búsqueda unificada Yu-Gi-Oh!

## Overview

Crear un módulo compartido `js/buscador.js` (`Buscador`) que unifica la búsqueda de cartas para
`armar.html` y `deck.html`, dando prioridad a YGOPRODECK (datos + imágenes, 100% del catálogo),
con fallback a Yugipedia para traducción al español (es_name/es_text) y compensación del bug de
`fname` con frases largas. Luego integrar ambos consumidores.

Spec: `SPEC-busqueda.md`. Mapa: `CAPABILITY-MAP.md`.

## Architecture Decisions

- **YGOPRODECK como fuente de datos/frame**: nivel, atk, def, tipo, atributo, habilidades, frame.
- **Yugipedia SOLO para traducción**: `es_name`, `es_text`, `es_pendulum_effect`. Un request por
  carta, cacheado por nombre EN. Si no hay traducción, se usa EN.
- **Compensación de `fname`**: `fname` falla con frases con espacios. Estrategia: probar la
  consulta completa; si falla, tokenizar (quitar palabras vacías) y buscar tokens de a pares,
  uniendo y deduplicando por id.
- **Imágenes**: `card_images[0].image_url_cropped`; si falta, URL directa
  `https://images.ygoprodeck.com/images/cards/{id}.jpg` a partir del `id`.
- **Ranking Top N en el módulo**: scoring simple (exacto > prefijo > contiene > parcial), devuelve
  top N. Cada página conserva su presentación (dropdown/opciones).
- **ES5, IIFE, sin deps**: mismo estilo que armar.js/deck.js. HTTPS vía proxy `/api?url=`.

## Task List

### Phase 1: Módulo `busqueda`
- [ ] Task 1: Crear `js/buscador.js` con `normalizar()`, ranking, normalización de la carta
  YGOPRODECK → CartaNormalizada, y generación de `arte` por ID.
- [ ] Task 2: Implementar búsqueda YGOPRODECK con estrategia `fname` + tokens + unión/dedupe.
- [ ] Task 3: Implementar fallback Yugipedia (traducción es_name/es_text) con caché.
- [ ] Task 4: Exponer `Buscador.buscar(q)` público con fusión YGOPRODECK + Yugipedia.

### Checkpoint: Módulo listo
- [ ] `node --check js/buscador.js` pasa
- [ ] Puppeteer: "Blue Eyes White Dragon", "Dragón Alternativo de Ojos Azules", "Polimerización"
- [ ] Revisión humana antes de integrar

### Phase 2: Integrar `armar` (armar.js)
- [ ] Task 5: Conectar `hacerBusqueda`/`buscarTexto` a `Buscador.buscar` manteniendo el dropdown.
- [ ] Task 6: `armarCarta` usa datos/arte de `Buscador` (mapa EN→ES ya resuelto).

### Checkpoint: armar listo
- [ ] Smoke en Chrome: búsqueda en español encuentra carta, arte cargado, PNG OK

### Phase 3: Integrar `deck` (deck.js)
- [ ] Task 7: Autocomplete (`mostrarSugerencias`) usa `Buscador.buscar`.
- [ ] Task 8: `preguntarPorNombre` y vistas de carta usan `Buscador` (datos/ES/arte).

### Checkpoint: deck listo
- [ ] Smoke en Chrome: búsqueda de mazo genérica por nombre de carta funciona, thumbnails con arte
- [ ] Revisión humana final

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| `fname` devuelve 0 con frases ("Blue Eyes White Dragon") | Med | Tokenización + pares de tokens + unión |
| YGOPRODECK no traduce a español | Med | Yugipedia es_name/es_text, cacheado |
| Card sin imagen en YGOPRODECK | Bajo | URL directa por ID generada |
| CORS en navegador | Alto | Siempre vía proxy `/api?url=` existente |
| Dependencias npm | Bajo | No se añaden; solo puppeteer (ya usado en tests) |

## Open Questions

- Ninguna. (Traducción solo nombre+texto y ranking Top N aprobados en spec.)