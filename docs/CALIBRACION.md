# Calibración de cartas

El generador usa el **marco oficial limpio** de `assets/base/monster_normal.png`
(1180×1720) extraído del proyecto:

> **daominah.github.io** — https://github.com/daominah/daominah.github.io
> Licencia BSD 2-Clause (© Dao Thanh Tung, 2023). Fuentes copiadas de Master Duel.

Las posiciones de las cajas en `js/layouts.js` están tomadas de las coordenadas
reales del renderer de ese proyecto (`.cRender*` en `index.css`), convertidas a
porcentaje del marco 1180×1720. Por eso no hay "calibración a ojo" contra un
escáneo: las cajas ya caen exactas sobre el frame.

## Cómo verificar

1. Abre `index.html`.
2. Añade `?debug=1` a la URL: cada caja se pinta con borde celeste y su nombre.
3. Confirma que cada caja coincide con su región en el frame:
   - `nombre` → sobre la banda superior del nombre
   - `atributo` → icono de atributo (arriba derecha)
   - `nivel` → estrellas (derecha, bajo el atributo)
   - `arte` → ventana central del arte
   - `numeroserie` → código de set (arriba del texto, derecha)
   - `tipo` → línea `[ Spellcaster / Normal ]`
   - `texto` → caja de texto/efecto
   - `atk-label`/`atk`/`def-label`/`def` → tira ATK/DEF
   - `password`/`copyright` → pie de carta

## Nuevo tipo de carta

Para añadir un layout (ej. Mágica, Trampa, Pendulum):

1. Descarga el frame correspondiente a `assets/base/` (los PNG de `card_frame/`
   del repo de referencia).
2. Crea un layout nuevo en `js/layouts.js` con las coordenadas `%` de `index.css`.
3. Añade un `CARD` con `layout` correcto en `js/content.js` (o ajusta `CONFIG`).

## Opciones de URL

- `?debug=1` → muestra los bordes de las cajas.
- `?escala=0.30` → escala de render (ancho en px ≈ 1180 × escala).

## Artworks

- `assets/art/` contiene imágenes de arte centrales descargadas de **Yugipedia**
  (https://ms.yugipedia.com, licencia CC-BY-SA). El arte se coloca en `assets/art/` y se referencia
  en `content.js` (campo `arte`).
- Para descargar el arte correcto de una carta usa `scripts/get-artwork.ps1`:
  lee la página `https://yugipedia.com/wiki/Card_Artworks:<Nombre_de_la_carta>`
  (MediaWiki API) y elige la versión por sus **etiquetas**, en este orden:
  1. `Collector's cards` (el arte usado en el juego real),
  2. `NAS anime`,
  3. `1st OCG`,
  4. `2nd TCG`.
  Ejemplo de carrera correcta para el Mago Oscuro:
  `DarkMagician-TF05-JP-VG-artwork.png` está etiquetado
  *Collector's cards / NAS anime / 1st OCG / 2nd TCG*.
- No usar `images.ygoprodeck.com` para el arte: sirve la imagen de la **carta
  completa** (con marco, texto y stats), no el arte suelto.
- El arte debe ser **cuadrado** (el recuadro de arte es 890×890 en el marco); el renderer usa
  `object-fit: cover`, así que si no es cuadrado se recorta centrado.

> Nota: en PowerShell 5.1 no interpolar `$var?param` en cadenas (el parser se traga
> `$var?`); construir las URLs por concatenación.