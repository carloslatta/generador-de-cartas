# Plan: Generador de cartas Yu-Gi-Oh (coordenadas + cajas CSS)

## Orden de implementación

La estrategia: primero el esqueleto renderizador (layout + contenido desacoplados), luego
la calibración contra la carta base real del usuario, y por último la automatización
(crear cartas nuevas solo reemplazando contenido). El usuario provee la carta base en el paso 2.

## Fases

### Paso 0 — Esqueleto (sin build)
- `index.html` + `css/card.css` + `js/renderer.js`, `js/layouts.js`, `js/content.js`.
- Renderer dibuja la carta base (imagen) y superpone cajas según layout JSON.
- Modo `debug` dibuja bordes de cajas para calibrar.
- Layout inicial de ejemplo: Monstruo efecto moderno (referencia Yugipedia Series 11/12),
  con coordenadas aproximadas (placeholder) listas para recalibrar.

### Paso 1 — Carta base del usuario
- El usuario coloca su imagen en `assets/base/` (y me indica el archivo).
- Se muestran las cajas en modo debug sobre esa imagen real.
- Ajustamos coordenadas caja por caja hasta que cada caja caiga exactamente sobre su marco.
- Se documenta el procedimiento en `docs/CALIBRACION.md`.

### Paso 2 — Automatización del contenido
- Panel lateral con inputs (nombre, tipo, texto, ATK/DEF, imagen de arte, etc.) que
  actualizan la carta en vivo.
- Estructura `content.js` por carta: duplicar/editar para crear cartas nuevas.
- (Opcional según conversación) botón de exportar imagen (canvas).

## Riesgos y mitigaciones

- **Coordenadas desalineadas:** mitigado con modo debug + medida en % (escala-independiente).
- **Tipografía no disponible:** se usan fallbacks libres hasta definir fuentes.
- **Bordes/cuadros intrincados del marco (esquinas redondeadas, canvas):** los bordes del marco
  ya vienen en la carta base; las cajas solo superponen contenido, no reinan el marco.

## Verificación

- Manual: abrir `index.html`, activar `?debug=1`, comparar cajas contra la imagen base.
- Cada paso termina con revisión humana antes de seguir.