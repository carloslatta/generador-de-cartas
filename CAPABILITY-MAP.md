# Capability Map: Búsqueda unificada Yu-Gi-Oh!

| Module id | Responsibility | Depends on |
|---|---|---|
| `busqueda` | Nuevo `js/buscador.js`: normalización, búsqueda YGOPRODECK primaria (`fname` + estrategia de tokens), fallback Yugipedia (cubre español), URL directa de imagen por ID, fusión/dedupe, caché de traducciones | — |
| `armar` | `armar.js`: usar `busqueda` en `hacerBusqueda` y `armarCarta` (dato + arte) | `busqueda` |
| `deck` | `deck.js`: usar `busqueda` en autocompletado, `buscarMazos`/`preguntarPorNombre`, vista de cartas, exportación | `busqueda` |

Build order: `busqueda` → `armar`, `deck` (en paralelo tras el primero).

## Decisiones de diseño aprobadas

1. **Español**: YGOPRODECK NO traduce a español (idiomas: en/fr/de/it/pt, verificado). El texto y nombre ES se resuelven vía Yugipedia.
2. **Flujo búsqueda de cartas**: YGOPRODECK con consulta normalizada (inglés) primero; si no hay aciertos útiles O la consulta no parece inglés, consultar Yugipedia (tiene `es_name`) y fusionar ambos resultados sin duplicados.
3. **Imágenes**: primero `card_images` de YGOPRODECK; si falta, construir URL directa `https://images.ygoprodeck.com/images/cards/{id}.jpg`.
4. **Bug conocido de `fname`**: falla con frases con espacios ("Blue Eyes White Dragon" → 0) pero funciona por tokens/guiones. El módulo compensa con tokenización + unión + ranking local.