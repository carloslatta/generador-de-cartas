# Spec: Generador de cartas Yu-Gi-Oh (coordenadas + cajas CSS)

## Objetivo

Crear un generador web que, a partir de la **imagen de una carta base** (marco oficial de Yu-Gi-Oh,
provista por el usuario), superponga **cajas CSS** en posiciones definidas por coordenadas para
colocar: nombre, atributo, nivel/estrellas, arte de la carta, tipo/línea de tipo, texto/efecto,
ATK/DEF, número de carta y otros elementos.

La gracia: una vez calibradas las coordenadas de las cajas contra la carta base, se define un
**layout único** y crear cartas nuevas solo requiere **reemplazar contenido** (textos, imagen,
símbolos) sin tocar posiciones.

El usuario habla español; el contenido de las cartas se puede editar en español o inglés.

## Tech Stack

- HTML + CSS + JavaScript vanilla. **Sin frameworks ni build system.** Cero npm.
- Todo se abre con doble clic en `index.html`. Sin servidor necesario (el arte desde URL externa
  requiere internet; si estás offline, pon imágenes en `assets/art/`).
- **Assets locales de referencia**: marco limpio, fuentes oficiales (Matrix Regular, Yu-GiOh Small
  Caps, Stone Serif Small Caps, YGO Card NA) e iconos (atributos, estrellas) extraídos de
  **daominah.github.io** (licencia BSD 2-Clause, © Dao Thanh Tung). Incluidos en `assets/`.

## Commands

- Ver: abrir `index.html` en el navegador (doble clic).
- Servidor local opcional: `npx serve .` (o abrir el archivo directamente).
- Validación de datos: revisión manual + chequeo de `layout.json` bien formado (JSON válido).
- No hay build ni lint por ahora (proyecto vanillajs).

## Project Structure

```
/ (raíz)
  index.html          → página que renderiza la carta (cajas sobre el marco)
  css/
    card.css          → estilos de la carta y de las cajas + @font-face (fuentes locales)
    editor.css        → estilos del panel lateral (inputs para reemplazar contenido)
  js/
    renderer.js       → lee layout + content y dibuja/actualiza las cajas sobre el marco
    layouts.js        → definición de layouts por tipo de carta (coordenadas % del marco 1180×1720)
    content.js        → contenido reemplazable de ejemplo (pantalla inicial: Mago Oscuro)
  assets/
    base/             → marcos de carta por tipo (monster_normal.png 1180×1720, etc.)
    art/              → (opcional) imágenes de arte locales
    fonts/            → .ttf locales (MatrixRegular, YGOSmallCaps, StoneSerifSmallCapsBold, ...)
    icons/            → atributos (attr_*.png, incl. SPELL/TRAP), estrellas (Yugipedia64)
  docs/
    CALIBRACION.md    → créditos de assets + cómo verificar/calibrar una carta base nueva
  SPEC-card-generator.md → este documento
  tasks/plan.md       → plan de implementación
  tasks/todo.md       → lista de tareas
```

## Code Style

- JS en español para nombres conceptuales mínimos e inglés para valores de datos si aplica.
- Las coordenadas de cajas se expresan en **porcentajes relativos al marco** 1180×1720
  (`{ x, y, w, h }` con 0–100), extraídas de las posiciones exactas del renderer de referencia.
  El renderer las convierte a `top/left/width/height (%)` y el marco entero se escala con
  `transform: scale()` para la vista (ancho ≈375px por defecto).
- Ejemplo de layout (`js/layouts.js`):

```js
const LAYOUT_MONSTRUO_NORMAL = {
  nombre:       { x: 7.46,  y: 5.58,  w: 74.58, h: 4.42 },  // banda del nombre
  atributo:     { x: 83.05, y: 4.77,  w: 9.49,  h: 6.51 },  // icono del atributo
  nivel:        { x: 10.34, y: 12.33, w: 79.32, h: 4.42 },  // estrellas (derecha)
  arte:         { x: 12.37, y: 18.49, w: 75.42, h: 51.74 }, // ventana de arte
  numeroserie:  { x: 71.02, y: 71.86, w: 18.64, h: 1.74 },  // código de set (SDY-006)
  tipo:         { x: 8.47,  y: 75.12, w: 83.05, h: 2.44 },  // "[ Lanzador de Conjuros / Normal ]"
  texto:        { x: 7.80,  y: 78.14, w: 84.75, h: 12.67 }, // caja de texto/efecto (auto-fit)
  "atk-label":  { x: 49.83, y: 91.28, w: 10.00, h: 2.44 },  // "ATK/"
  atk:          { x: 59.15, y: 91.28, w: 10.00, h: 2.44 },
  "def-label":  { x: 72.54, y: 91.28, w: 9.32,  h: 2.44 },  // "DEF/"
  def:          { x: 81.36, y: 91.28, w: 10.00, h: 2.44 },
  password:     { x: 5.93,  y: 95.35, w: 42.37, h: 1.51 },  // "46986414 #46986414"
  copyright:    { x: 51.69, y: 95.35, w: 42.37, h: 1.51 },  // pie derecha
};
```

- Nombres de caja estables (kebab-case): `nombre`, `atributo`, `nivel`, `arte`, `numeroserie`,
  `tipo`, `texto`, `atk-label`, `atk`, `def-label`, `def`, `password`, `copyright`.

## Testing Strategy

- Proyecto visual; la verificación primaria es **manual en navegador** con el modo
  `?debug=1` (pinta bordes y nombres de cada caja sobre el marco).
- Las coordenadas **no se estiman a ojo**: provienen del renderer de referencia
  (daominah.github.io). El checklist de `docs/CALIBRACION.md` verifica que cada caja cae
  sobre su región (nombre, estrellas, arte, tipo, texto, ATK/DEF, pie).
- Sintaxis JS validada con `node --check` tras cada cambio.

## Boundaries

- **Always:** calibrar contra una carta base real provista; mantener coordenadas en % del marco;
  mantener las cajas desacopladas del contenido (layout ≠ content); validar JSON.
- **Ask first:** agregar dependencias/fuentes .ttf; soportar tipos nuevos de carta (Péndulo,
  Link, Rush Duel, Series antiguas) más allá del layout inicial; cambiar el tamaño base de referencia.
- **Never:** bloquear el proyecto a un único formato sin posibilidad de nuevos layouts; hardcodear
  posiciones de contenido dentro del renderer (todo debe vivir en el layout).

## Success Criteria

- [ ] `index.html` abre en navegador y muestra la carta base con cajas superpuestas en las
      posiciones calibradas (más un modo `debug` que pinta bordes de cada caja).
- [ ] El contenido de cada caja se reemplaza desde un solo punto (inputs laterales y/o `content.js`)
      sin modificar el layout.
- [ ] Se puede crear una segunda carta duplicando el bloque de contenido (mismo layout), cambiando
      arte/textos/nombre, y el resultado conserva las posiciones.
- [ ] `docs/CALIBRACION.md` explica cómo calibrar una carta base nueva paso a paso.

## Open Questions

- ¿Resolución objetivo de la carta (px) para exportar imágenes finales (captura/PNG)?
- Fuentes ya resueltas: .ttf locales incluidos (daominah / Master Duel).
- ¿Qué tipo de carta base crear después (Monstruo efecto, Mágica, Trampa, Péndulo)?