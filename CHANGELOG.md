# Changelog

## [1.0.0] - 2026-09-26

### Added

- Búsqueda unificada de cartas por nombre (español o inglés) o por número ID, usando índice local, YGOPRODeck y Yugipedia.
- Armador de cartas con auto-armado y edición manual, con layouts por tipo (normal, efecto, xyz, link, sincronía, fusión, ritual, péndulo, mágica, trampa y token).
- Arte péndulo alineado al tope del marco, con ajuste de posición/zoom propio por arte (compartido entre vista previa y PNG final).
- Guardado del PNG (2360×3440) desde el botón o desde un archivo `.ydk` (lee los IDs, arma y guarda las cartas automáticamente, respetando repeticiones).
- Generador de decks con autocomplete, banlists (TCG / OCG / Goat Format) y exportación de 40 cartas o ZIP.
- Traducción ES disponible para ~96 % de las cartas del índice local.

### Fixed

- El nombre de la carta podía quedar pequeño o tapado si la fuente no había cargado al medir (re-render tras `document.fonts.ready`).
- El arte péndulo en `armar.html` no aplicaba los ajustes de posición/zoom del editor y quedaba centrado (ahora usa la misma configuración que la vista previa).
- Error de consola `construirCajas is not defined` al cargar `armar.html`.