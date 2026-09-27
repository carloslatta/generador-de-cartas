import os
import re
import sys
import threading
import tkinter as tk
from datetime import datetime
from io import BytesIO
from tkinter import filedialog, messagebox

from reportlab.lib.colors import Color
from reportlab.lib.utils import ImageReader
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas

CARTA_W = 59.0
CARTA_H = 86.0
HOJA_W = 279.4
HOJA_H = 431.8
MARGEN = 6.0
MARGEN_IMPRESION = 5.0
LADO = 2.0
ESPACIO = 2 * LADO
SANGRADO = 1.0
AJUSTE_MARCA = 1.0
AJUSTE_L = 2.0
AJUSTE_TOP_L = 1.0
DESPLAZAMIENTO_X = 4.0
DESPLAZAMIENTO_Y = 4.0
GRID_COLS = 4
GRID_FILAS = 4
MAX_PX = 1050
_cache_imagen = {}

COLOR_FONDO_FRENTE = (0x63 / 255, 0x6A / 255, 0x85 / 255)
COLOR_FONDO_REVERSO = (0xB6 / 255, 0x70 / 255, 0x3A / 255)

BACK_KEYWORDS = ("reverso", "back", "atras", "reves")


def base_dir():
    return os.path.dirname(os.path.abspath(__file__))


def carpetas_reverso():
    carpetas = [
        os.path.join(base_dir(), "assets", "base"),
        os.path.join(os.path.dirname(base_dir()), "assets", "base"),
    ]
    return [carpeta for carpeta in carpetas if os.path.isdir(carpeta)]


def ruta_reverso():
    for carpeta in carpetas_reverso():
        for nombre in os.listdir(carpeta):
            ruta = os.path.join(carpeta, nombre)
            if not os.path.isfile(ruta):
                continue
            if not nombre.lower().endswith((".png", ".jpg", ".jpeg")):
                continue
            if es_reverso(nombre):
                return ruta
    return None


def es_reverso(nombre):
    n = nombre.lower()
    return any(palabra in n for palabra in BACK_KEYWORDS)


def clave_nombre(nombre):
    clave = []
    for parte in re.split(r"(\d+)", nombre.lower()):
        clave.append(int(parte) if parte.isdigit() else parte)
    return clave


def encontrar_cartas(carpeta):
    if not os.path.isdir(carpeta):
        return []
    cartas = []
    for nombre in os.listdir(carpeta):
        if not nombre.lower().endswith((".png", ".jpg", ".jpeg")):
            continue
        if es_reverso(nombre):
            continue
        cartas.append(os.path.join(carpeta, nombre))
    cartas.sort(key=lambda ruta: clave_nombre(os.path.basename(ruta)))
    return cartas


def posiciones_slot():
    for fila in range(GRID_FILAS):
        for col in range(GRID_COLS):
            x = MARGEN + DESPLAZAMIENTO_X + col * (CARTA_W + ESPACIO)
            y_superior = MARGEN + DESPLAZAMIENTO_Y + fila * (CARTA_H + ESPACIO)
            y = HOJA_H - y_superior - CARTA_H
            yield x, y


def dimensiones_imagen(ruta):
    img = ImageReader(ruta)
    return img.getSize()


def preparar_imagen(ruta):
    guardado = _cache_imagen.get(ruta)
    if guardado is not None:
        return guardado[0], guardado[1], guardado[2]
    resultado = _cargar_imagen(ruta)
    _cache_imagen[ruta] = resultado
    return resultado


def _cargar_imagen(ruta):
    try:
        from PIL import Image
    except ImportError:
        reader = ImageReader(ruta)
        return reader, reader.getSize()[0], reader.getSize()[1]
    with Image.open(ruta) as imagen:
        w, h = imagen.size
        mayor = max(w, h)
        if mayor <= MAX_PX:
            reader = ImageReader(ruta)
            return reader, w, h
        factor = MAX_PX / float(mayor)
        nuevo = (max(1, int(w * factor)), max(1, int(h * factor)))
        if imagen.mode in ("RGBA", "LA", "PA") or (
            imagen.mode == "P" and "transparency" in imagen.info
        ):
            imagen = imagen.convert("RGBA")
        else:
            imagen = imagen.convert("RGB")
        imagen = imagen.resize(nuevo, Image.LANCZOS)
        buffer = BytesIO()
        imagen.save(buffer, format="PNG")
        buffer.seek(0)
        reader = ImageReader(buffer)
        return reader, w, h


def canales_verticales():
    for col in range(GRID_COLS - 1):
        inicio = MARGEN + DESPLAZAMIENTO_X + (col + 1) * CARTA_W + col * ESPACIO
        yield inicio, inicio + ESPACIO


def canales_horizontales():
    for fila in range(GRID_FILAS - 1):
        inicio = MARGEN + DESPLAZAMIENTO_Y + (fila + 1) * CARTA_H + fila * ESPACIO
        yield inicio, inicio + ESPACIO


def dibujar_marcas_corte(pdf, espejo=False):
    pdf.setStrokeColor(Color(0, 0.8, 0))
    pdf.setLineWidth(0.5)
    segmentos = []
    largo = 4.0
    x_izq = MARGEN + DESPLAZAMIENTO_X
    x_der = x_izq + GRID_COLS * CARTA_W + (GRID_COLS - 1) * ESPACIO
    y_arr = MARGEN + DESPLAZAMIENTO_Y
    y_aba = y_arr + GRID_FILAS * CARTA_H + (GRID_FILAS - 1) * ESPACIO
    x_l = x_izq - AJUSTE_L + AJUSTE_TOP_L
    x_r = x_der + AJUSTE_L - AJUSTE_TOP_L
    y_l_top = MARGEN_IMPRESION + largo
    for cx, cy, dx, dy in (
        (x_l, y_l_top, -1, -1),
        (x_r, y_l_top, 1, -1),
        (x_l, y_aba + AJUSTE_L, -1, 1),
        (x_r, y_aba + AJUSTE_L, 1, 1),
    ):
        segmentos.append((cx, cy, cx + dx * largo, cy))
        segmentos.append((cx, cy, cx, cy + dy * largo))
    for inicio, final in canales_verticales():
        for x in (inicio + AJUSTE_MARCA, final - AJUSTE_MARCA):
            segmentos.append((x, MARGEN_IMPRESION, x, MARGEN_IMPRESION + largo))
            segmentos.append(
                (x, HOJA_H - MARGEN_IMPRESION - largo, x, HOJA_H - MARGEN_IMPRESION)
            )
    for inicio, final in canales_horizontales():
        for y in (inicio + AJUSTE_MARCA, final - AJUSTE_MARCA):
            segmentos.append((MARGEN_IMPRESION, y, MARGEN_IMPRESION + largo, y))
            segmentos.append(
                (HOJA_W - MARGEN_IMPRESION - largo, y, HOJA_W - MARGEN_IMPRESION, y)
            )
    for ax, ay, bx, by in segmentos:
        if espejo:
            ax, bx = HOJA_W - ax, HOJA_W - bx
        pdf.line(
            ax * mm,
            (HOJA_H - ay) * mm,
            bx * mm,
            (HOJA_H - by) * mm,
        )


def dibujar_imagen_en_celda(pdf, ruta, x, y, espejo=False):
    reader, ancho_imagen, alto_imagen = preparar_imagen(ruta)
    escala = min(
        (CARTA_W + 2 * SANGRADO) / ancho_imagen,
        (CARTA_H + 2 * SANGRADO) / alto_imagen,
    )
    ancho_dibujo = ancho_imagen * escala
    alto_dibujo = alto_imagen * escala
    x_dibujo = x + (CARTA_W - ancho_dibujo) / 2
    y_dibujo = y + (CARTA_H - alto_dibujo) / 2
    pdf.saveState()
    if espejo:
        pdf.translate((x_dibujo + ancho_dibujo / 2) * mm, (y_dibujo + alto_dibujo / 2) * mm)
        pdf.scale(-1, 1)
        pdf.drawImage(
            reader,
            -ancho_dibujo / 2 * mm,
            -alto_dibujo / 2 * mm,
            ancho_dibujo * mm,
            alto_dibujo * mm,
            mask="auto",
        )
    else:
        pdf.drawImage(
            reader,
            x_dibujo * mm,
            y_dibujo * mm,
            ancho_dibujo * mm,
            alto_dibujo * mm,
            mask="auto",
        )
    pdf.restoreState()


def dibujar_hoja(pdf, rutas, espejo=False, fondo=None):
    if fondo:
        pdf.setFillColorRGB(*fondo)
    else:
        pdf.setFillColorRGB(*COLOR_FONDO_FRENTE)
    pdf.rect(
        MARGEN_IMPRESION * mm,
        MARGEN_IMPRESION * mm,
        (HOJA_W - 2 * MARGEN_IMPRESION) * mm,
        (HOJA_H - 2 * MARGEN_IMPRESION) * mm,
        stroke=0,
        fill=1,
    )
    slots = list(posiciones_slot())
    for i in range(min(len(rutas), len(slots))):
        x, y = slots[i]
        if espejo:
            x = HOJA_W - x - CARTA_W
        dibujar_imagen_en_celda(pdf, rutas[i], x, y, espejo)
    dibujar_marcas_corte(pdf, espejo=espejo)


def generar_pdf(carpeta, salida, incluir_reverso=True):
    cartas = encontrar_cartas(carpeta)
    if not cartas:
        raise ValueError("No se encontraron imágenes de cartas en la carpeta elegida.")
    reverso = ruta_reverso()
    if incluir_reverso and not reverso:
        raise ValueError(
            "Se pidió incluir el reverso, pero no hay imagen del reverso en assets/base."
        )
    fondo_reverso = COLOR_FONDO_REVERSO if reverso else None
    pdf = canvas.Canvas(salida, pagesize=(HOJA_W * mm, HOJA_H * mm))
    por_hoja = len(list(posiciones_slot()))
    for i in range(0, len(cartas), por_hoja):
        lote = cartas[i : i + por_hoja]
        dibujar_hoja(pdf, lote)
        pdf.showPage()
        if incluir_reverso:
            dibujar_hoja(pdf, [reverso] * len(lote), espejo=True, fondo=fondo_reverso)
            pdf.showPage()
    pdf.save()
    return len(cartas)


def main_cli(argv):
    carpeta = None
    salida = None
    incluir = True
    i = 1
    while i < len(argv):
        arg = argv[i]
        if arg in ("--carpeta", "-c"):
            carpeta = argv[i + 1]
            i += 2
        elif arg in ("--salida", "-o"):
            salida = argv[i + 1]
            i += 2
        elif arg == "--sin-reverso":
            incluir = False
            i += 1
        else:
            raise SystemExit("Argumento desconocido: " + arg)
    if not carpeta:
        raise SystemExit("Falta --carpeta")
    if not salida:
        salida = os.path.join(carpeta, "cartas_tabloide.pdf")
    cantidad = generar_pdf(carpeta, salida, incluir)
    print("PDF generado: %s (%d cartas)" % (salida, cantidad))


class Aplicacion:
    def __init__(self, root):
        self.root = root
        root.title("Automatizador PDF Yu-Gi-Oh! (tabloide)")
        root.geometry("560x430")
        self.carpeta = tk.StringVar()
        self.incluir_reverso = tk.BooleanVar(value=True)
        self.estado = tk.StringVar(value="Elige una carpeta con las cartas PNG.")
        self.label_carpeta = tk.Label(root, text="Ninguna carpeta elegida.", anchor="w", justify="left")
        self.label_carpeta.pack(fill="x", padx=14, pady=(14, 4))
        tk.Button(root, text="Elegir carpeta con las cartas…", command=self.elegir_carpeta).pack(anchor="w", padx=14)
        reverso = ruta_reverso()
        if reverso:
            es_reverso = "SÍ (%s)" % os.path.basename(reverso)
        else:
            es_reverso = "NO (ponlo en assets/base)"
        tk.Label(root, text="Reverso detectado: " + es_reverso, anchor="w").pack(fill="x", padx=14, pady=8)
        tk.Checkbutton(root, text="Incluir reversos (páginas para imprimir a doble cara)", variable=self.incluir_reverso).pack(anchor="w", padx=14)
        self.boton_generar = tk.Button(
            root, text="Generar PDF", command=self.generar, bg="#4a8c3f", fg="white", padx=18, pady=6
        )
        self.boton_generar.pack(anchor="w", padx=14, pady=14)
        tk.Label(root, textvariable=self.estado, anchor="w", justify="left", wraplength=520).pack(fill="x", padx=14)

    def elegir_carpeta(self):
        carpeta = filedialog.askdirectory(title="Elige la carpeta con las cartas PNG")
        if not carpeta:
            return
        self.carpeta.set(carpeta)
        cartas = encontrar_cartas(carpeta)
        texto = "Carpeta: %s\nCartas encontradas: %d" % (carpeta, len(cartas))
        self.label_carpeta.config(text=texto)

    def generar(self):
        carpeta = self.carpeta.get()
        if not carpeta:
            messagebox.showwarning("Falta la carpeta", "Primero elige la carpeta con las cartas.")
            return
        self.boton_generar.config(state="disabled")
        self.estado.set(
            "Generando PDF… (no cierres la ventana; la generación ocurre en segundo plano)"
        )
        incluir = self.incluir_reverso.get()
        nombre = "cartas_tabloide_" + datetime.now().strftime("%Y%m%d_%H%M%S") + ".pdf"
        salida = os.path.join(carpeta, nombre)

        def trabajo():
            try:
                cantidad = generar_pdf(carpeta, salida, incluir)
                self.root.after(0, self.terminar_exito, salida, cantidad)
            except Exception as error:
                self.root.after(0, self.terminar_error, str(error))

        threading.Thread(target=trabajo, daemon=True).start()

    def terminar_exito(self, salida, cantidad):
        self.boton_generar.config(state="normal")
        self.estado.set("PDF generado: %s (%d cartas)" % (salida, cantidad))
        messagebox.showinfo("Listo", "PDF generado:\n%s\n(%d cartas)" % (salida, cantidad))

    def terminar_error(self, mensaje):
        self.boton_generar.config(state="normal")
        self.estado.set("Error: " + mensaje)
        messagebox.showerror("Error", mensaje)


def main():
    if len(sys.argv) > 1:
        main_cli(sys.argv)
        return
    root = tk.Tk()
    Aplicacion(root)
    root.mainloop()


if __name__ == "__main__":
    main()