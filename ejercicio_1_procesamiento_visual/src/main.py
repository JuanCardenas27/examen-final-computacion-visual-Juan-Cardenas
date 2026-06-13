"""
Ejercicio 1 - Procesamiento visual e IA
=======================================

Pipeline de procesamiento de imagen con OpenCV que ejecuta, de forma
secuencial y reproducible, las operaciones exigidas por el examen:

    1. Cargar una entrada visual                (cv2.imread)
    2. Versión en escala de grises              (cv2.cvtColor BGR2GRAY)
    3. Segunda representación de color          (HSV y LAB)
    4. Suavizado                                (Gaussiano + Mediana)
    5. Detección de bordes                      (Sobel + Canny)
    6. Segmentación / detección                 (Otsu+GrabCut + Haar Cascade)
    7. Guardado de resultados comparativos      (resultados/*.png + montaje)
    8. Documentación de parámetros              (constantes + README.md)

Autor: Juan David Cárdenas Galvis
Universidad Nacional de Colombia - Computación Visual 2026-I

Uso:
    python src/main.py                  # usa data/entrada.png por defecto
    python src/main.py ruta/imagen.png  # procesa otra imagen
"""

from __future__ import annotations

import os
import sys

import cv2
import numpy as np

# ---------------------------------------------------------------------------
# Parámetros del pipeline (documentados y centralizados para trazabilidad)
# ---------------------------------------------------------------------------

# 4. Suavizado
GAUSS_KSIZE = (7, 7)      # núcleo impar; mayor => más difuminado
GAUSS_SIGMA = 1.5         # desviación estándar; 0 => derivada del tamaño
MEDIAN_KSIZE = 5          # tamaño de ventana de la mediana (impar)

# 5. Detección de bordes
CANNY_LOW = 50            # umbral inferior de histéresis
CANNY_HIGH = 150          # umbral superior de histéresis
SOBEL_KSIZE = 3           # tamaño del operador Sobel

# 6. Segmentación
MORPH_KSIZE = (5, 5)      # núcleo para operaciones morfológicas
GRABCUT_ITERS = 5         # iteraciones del refinamiento con GrabCut
FONDO_THRESH = 25         # distancia mínima al blanco (255-gris) para ser sujeto
AREA_MIN_FRAC = 0.005     # área mínima de un contorno (fracción de la imagen)

# Heurística de fondo uniforme (decide el método de segmentación)
FONDO_BLANCO_MIN = 215    # un píxel es "casi blanco" si sus 3 canales lo superan
FONDO_FRAC_MIN = 0.45     # fracción de borde casi-blanco para considerar fondo claro

# Segmentación por color con K-means (escenas complejas)
KMEANS_K = 6              # número de regiones de color
KMEANS_ATTEMPTS = 3

# 6b. Detección con modelo preentrenado (Haar Cascade frontal de rostros)
HAAR_SCALE_FACTOR = 1.1
HAAR_MIN_NEIGHBORS = 5
# Tamaño mínimo del rostro como fracción del lado menor de la imagen. Escala
# con la resolución y descarta detecciones diminutas (falsos positivos en
# texturas como el follaje), conservando rostros grandes y reales.
HAAR_MIN_SIZE_FRAC = 0.08


# ---------------------------------------------------------------------------
# Utilidades
# ---------------------------------------------------------------------------

def ruta_resultados(subdir: str = "") -> str:
    """Carpeta de resultados relativa a la raíz del ejercicio.

    La imagen principal (entrada.png) escribe directamente en `resultados/`
    (entregables mínimos del examen); cualquier otra imagen escribe en una
    subcarpeta `resultados/<nombre>/` para no sobrescribir.
    """
    base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    out = os.path.join(base, "resultados", subdir) if subdir \
        else os.path.join(base, "resultados")
    os.makedirs(out, exist_ok=True)
    return out


def guardar(nombre: str, imagen: np.ndarray, carpeta: str) -> None:
    destino = os.path.join(carpeta, nombre)
    cv2.imwrite(destino, imagen)
    print(f"  [guardado] {os.path.relpath(destino)}")


def a_bgr(imagen: np.ndarray) -> np.ndarray:
    """Asegura 3 canales BGR para poder apilar imágenes en el montaje."""
    if imagen.ndim == 2:
        return cv2.cvtColor(imagen, cv2.COLOR_GRAY2BGR)
    return imagen


def etiquetar(imagen: np.ndarray, texto: str) -> np.ndarray:
    """Dibuja un título legible sobre una copia de la imagen."""
    img = a_bgr(imagen).copy()
    cv2.rectangle(img, (0, 0), (img.shape[1], 34), (0, 0, 0), -1)
    cv2.putText(img, texto, (10, 24), cv2.FONT_HERSHEY_SIMPLEX,
                0.7, (255, 255, 255), 2, cv2.LINE_AA)
    return img


# ---------------------------------------------------------------------------
# 1. Cargar una entrada visual
# ---------------------------------------------------------------------------

def cargar_entrada(ruta: str) -> np.ndarray:
    """Carga la imagen con OpenCV. Si trae canal alfa (PNG), lo combina
    sobre un fondo blanco para trabajar siempre en BGR de 3 canales."""
    imagen = cv2.imread(ruta, cv2.IMREAD_UNCHANGED)
    if imagen is None:
        raise FileNotFoundError(f"No se pudo cargar la imagen: {ruta}")

    if imagen.ndim == 3 and imagen.shape[2] == 4:
        bgr = imagen[:, :, :3].astype(np.float32)
        alfa = imagen[:, :, 3:4].astype(np.float32) / 255.0
        fondo = np.full_like(bgr, 255.0)
        imagen = (bgr * alfa + fondo * (1.0 - alfa)).astype(np.uint8)
    elif imagen.ndim == 2:
        imagen = cv2.cvtColor(imagen, cv2.COLOR_GRAY2BGR)

    print(f"  Dimensiones: {imagen.shape[1]}x{imagen.shape[0]} px, "
          f"{imagen.shape[2]} canales")
    return imagen


# ---------------------------------------------------------------------------
# 2 y 3. Conversiones de espacio de color
# ---------------------------------------------------------------------------

def a_grises(bgr: np.ndarray) -> np.ndarray:
    return cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)


def a_hsv(bgr: np.ndarray) -> np.ndarray:
    return cv2.cvtColor(bgr, cv2.COLOR_BGR2HSV)


def a_lab(bgr: np.ndarray) -> np.ndarray:
    return cv2.cvtColor(bgr, cv2.COLOR_BGR2LAB)


# ---------------------------------------------------------------------------
# 4. Suavizado
# ---------------------------------------------------------------------------

def suavizar_gaussiano(bgr: np.ndarray) -> np.ndarray:
    return cv2.GaussianBlur(bgr, GAUSS_KSIZE, GAUSS_SIGMA)


def suavizar_mediana(bgr: np.ndarray) -> np.ndarray:
    return cv2.medianBlur(bgr, MEDIAN_KSIZE)


# ---------------------------------------------------------------------------
# 5. Detección de bordes
# ---------------------------------------------------------------------------

def bordes_canny(gris_suavizado: np.ndarray) -> np.ndarray:
    return cv2.Canny(gris_suavizado, CANNY_LOW, CANNY_HIGH)


def bordes_sobel(gris_suavizado: np.ndarray) -> np.ndarray:
    gx = cv2.Sobel(gris_suavizado, cv2.CV_64F, 1, 0, ksize=SOBEL_KSIZE)
    gy = cv2.Sobel(gris_suavizado, cv2.CV_64F, 0, 1, ksize=SOBEL_KSIZE)
    magnitud = cv2.magnitude(gx, gy)
    return cv2.normalize(magnitud, None, 0, 255, cv2.NORM_MINMAX).astype(np.uint8)


# ---------------------------------------------------------------------------
# 6. Segmentación (técnica clásica) y detección (modelo preentrenado)
# ---------------------------------------------------------------------------

def segmentar_sujeto(bgr: np.ndarray, gris: np.ndarray):
    """Segmenta el sujeto del fondo claro.

    Estrategia clásica en dos fases:
      a) Umbral por "distancia al fondo blanco" + morfología -> máscara inicial.
         Se usa la diferencia respecto al blanco (255 - gris) en lugar de Otsu
         invertido, porque la piel clara del rostro se confunde con el fondo y
         Otsu la dejaría fuera; la distancia al blanco conserva el sujeto
         completo (cara, pelo y chaqueta).
      b) GrabCut inicializado con esa máscara -> refinamiento de bordes.
    Devuelve (mascara, sujeto_sobre_negro, contorno_dibujado).
    """
    # a) Distancia al fondo blanco: el fondo ~255 => valores bajos; el sujeto
    #    (incluida la piel) se separa del blanco => valores altos. Se usa un
    #    umbral fijo (no Otsu) para que la piel del rostro, de tono medio,
    #    también supere el umbral y no quede recortada.
    dist_blanco = cv2.subtract(255, gris)
    _, base = cv2.threshold(dist_blanco, FONDO_THRESH, 255, cv2.THRESH_BINARY)
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, MORPH_KSIZE)
    # Cierre amplio para unir cabeza, cuello y torso en una sola región
    base = cv2.morphologyEx(base, cv2.MORPH_CLOSE, kernel, iterations=6)
    base = cv2.morphologyEx(base, cv2.MORPH_OPEN, kernel, iterations=1)

    # Rellenamos TODOS los contornos relevantes (no solo el mayor) para no
    # descartar la cabeza si quedara como componente separada. drawContours
    # con RETR_EXTERNAL + FILLED también tapa los huecos interiores.
    contornos, _ = cv2.findContours(base, cv2.RETR_EXTERNAL,
                                    cv2.CHAIN_APPROX_SIMPLE)
    area_min = AREA_MIN_FRAC * gris.shape[0] * gris.shape[1]
    mascara_base = np.zeros_like(gris)
    relevantes = [c for c in contornos if cv2.contourArea(c) >= area_min]
    cv2.drawContours(mascara_base, relevantes, -1, 255, cv2.FILLED)

    # b) Refinamiento con GrabCut usando la máscara base como semilla
    gc_mask = np.where(mascara_base > 0,
                       cv2.GC_PR_FGD, cv2.GC_PR_BGD).astype(np.uint8)
    # Erosionamos para marcar foreground seguro y dilatamos para background seguro
    seguro_fg = cv2.erode(mascara_base, kernel, iterations=3)
    seguro_bg = cv2.dilate(mascara_base, kernel, iterations=3)
    gc_mask[seguro_fg > 0] = cv2.GC_FGD
    gc_mask[seguro_bg == 0] = cv2.GC_BGD

    bgd_model = np.zeros((1, 65), np.float64)
    fgd_model = np.zeros((1, 65), np.float64)
    try:
        cv2.grabCut(bgr, gc_mask, None, bgd_model, fgd_model,
                    GRABCUT_ITERS, cv2.GC_INIT_WITH_MASK)
        mascara = np.where((gc_mask == cv2.GC_FGD) |
                           (gc_mask == cv2.GC_PR_FGD), 255, 0).astype(np.uint8)
    except cv2.error:
        # Si GrabCut falla (p. ej. máscara trivial) usamos la máscara base
        mascara = mascara_base

    mascara = cv2.morphologyEx(mascara, cv2.MORPH_CLOSE, kernel, iterations=2)

    sujeto = cv2.bitwise_and(bgr, bgr, mask=mascara)

    contorno_vis = bgr.copy()
    contornos, _ = cv2.findContours(mascara, cv2.RETR_EXTERNAL,
                                    cv2.CHAIN_APPROX_SIMPLE)
    cv2.drawContours(contorno_vis, contornos, -1, (0, 255, 0), 3)

    return mascara, sujeto, contorno_vis


def fondo_uniforme(bgr: np.ndarray) -> bool:
    """Decide si la imagen es 'un objeto sobre fondo blanco' midiendo qué
    fracción de los píxeles del borde son casi blancos (los tres canales por
    encima del umbral). Se exige blanco —no solo brillo— para no confundir un
    cielo claro pero coloreado con un fondo de estudio blanco."""
    h, w = bgr.shape[:2]
    margen = max(2, min(h, w) // 25)
    borde = np.concatenate([
        bgr[:margen, :].reshape(-1, 3), bgr[-margen:, :].reshape(-1, 3),
        bgr[:, :margen].reshape(-1, 3), bgr[:, -margen:].reshape(-1, 3),
    ])
    casi_blanco = np.all(borde > FONDO_BLANCO_MIN, axis=1)
    return casi_blanco.mean() > FONDO_FRAC_MIN


def segmentar_kmeans(bgr: np.ndarray, k: int = KMEANS_K):
    """Segmentación por color con K-means (técnica clásica) para escenas
    complejas donde no hay un único sujeto sobre fondo uniforme.

    Agrupa los píxeles en `k` regiones de color en el espacio LAB
    (perceptualmente uniforme) y devuelve:
      - mapa de etiquetas en escala de grises (cada región un nivel),
      - imagen recoloreada con el color medio de cada región,
      - original con las fronteras entre regiones resaltadas.
    """
    lab = cv2.cvtColor(bgr, cv2.COLOR_BGR2LAB)
    muestras = lab.reshape(-1, 3).astype(np.float32)
    criterio = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 20, 1.0)
    _, etiquetas, centros = cv2.kmeans(
        muestras, k, None, criterio, KMEANS_ATTEMPTS, cv2.KMEANS_PP_CENTERS)

    etiquetas = etiquetas.flatten()
    centros = centros.astype(np.uint8)

    # Imagen recoloreada (cada píxel toma el color medio de su región)
    seg_lab = centros[etiquetas].reshape(lab.shape)
    seg = cv2.cvtColor(seg_lab, cv2.COLOR_LAB2BGR)

    # Mapa de etiquetas como imagen en grises
    mapa = etiquetas.reshape(bgr.shape[:2]).astype(np.uint8)
    mapa_vis = (mapa * (255 // max(1, k - 1))).astype(np.uint8)

    # Fronteras entre regiones (gradiente morfológico del mapa de etiquetas)
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
    fronteras = cv2.morphologyEx(mapa, cv2.MORPH_GRADIENT, kernel)
    contorno_vis = bgr.copy()
    contorno_vis[fronteras > 0] = (0, 255, 0)

    return mapa_vis, seg, contorno_vis


def segmentar(bgr: np.ndarray, gris: np.ndarray):
    """Despachador de segmentación. Elige la técnica clásica adecuada según el
    contenido: extracción del sujeto si el fondo es claro y uniforme, o
    segmentación por color (K-means) si es una escena compleja.
    Devuelve (mascara, segmentado, contorno, metodo)."""
    if fondo_uniforme(bgr):
        mascara, seg, contorno = segmentar_sujeto(bgr, gris)
        return mascara, seg, contorno, "sujeto (umbral + GrabCut)"
    mapa, seg, contorno = segmentar_kmeans(bgr)
    return mapa, seg, contorno, f"color K-means (k={KMEANS_K})"


def detectar_rostros(bgr: np.ndarray, gris: np.ndarray) -> np.ndarray:
    """Detección con modelo preentrenado: Haar Cascade frontal de OpenCV."""
    ruta_cascada = os.path.join(cv2.data.haarcascades,
                                "haarcascade_frontalface_default.xml")
    cascada = cv2.CascadeClassifier(ruta_cascada)
    lado = int(HAAR_MIN_SIZE_FRAC * min(gris.shape[:2]))
    rostros = cascada.detectMultiScale(
        gris, scaleFactor=HAAR_SCALE_FACTOR, minNeighbors=HAAR_MIN_NEIGHBORS,
        minSize=(lado, lado))

    vis = bgr.copy()
    for (x, y, w, h) in rostros:
        cv2.rectangle(vis, (x, y), (x + w, y + h), (0, 0, 255), 3)
        cv2.putText(vis, "rostro", (x, max(0, y - 8)),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2, cv2.LINE_AA)
    print(f"  Rostros detectados (Haar Cascade): {len(rostros)}")
    return vis


# ---------------------------------------------------------------------------
# 7. Montaje comparativo
# ---------------------------------------------------------------------------

def construir_montaje(paneles: list[tuple[str, np.ndarray]]) -> np.ndarray:
    """Apila los paneles etiquetados en una grilla 3x3 del mismo tamaño."""
    h, w = paneles[0][1].shape[:2]
    escala = 360 / w
    dim = (360, int(h * escala))

    celdas = []
    for titulo, img in paneles:
        celda = cv2.resize(a_bgr(img), dim, interpolation=cv2.INTER_AREA)
        celdas.append(etiquetar(celda, titulo))

    # Completar hasta múltiplo de 3
    while len(celdas) % 3 != 0:
        celdas.append(np.zeros_like(celdas[0]))

    filas = [np.hstack(celdas[i:i + 3]) for i in range(0, len(celdas), 3)]
    return np.vstack(filas)


# ---------------------------------------------------------------------------
# Pipeline principal
# ---------------------------------------------------------------------------

def main() -> None:
    base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    ruta_entrada = sys.argv[1] if len(sys.argv) > 1 else \
        os.path.join(base, "data", "entrada.png")

    # La imagen principal "entrada" va a resultados/; las demás a su subcarpeta.
    nombre = os.path.splitext(os.path.basename(ruta_entrada))[0].lower()
    subdir = "" if nombre == "entrada" else nombre
    out = ruta_resultados(subdir)
    print("=" * 60)
    print("EJERCICIO 1 - PIPELINE DE PROCESAMIENTO VISUAL")
    print(f"Entrada : {os.path.relpath(ruta_entrada)}")
    print(f"Salida  : {os.path.relpath(out)}")
    print("=" * 60)

    # 1. Carga
    print("\n[1] Cargando entrada visual...")
    original = cargar_entrada(ruta_entrada)
    guardar("original.png", original, out)

    # 2. Escala de grises
    print("\n[2] Conversión a escala de grises...")
    gris = a_grises(original)
    guardar("grises.png", gris, out)

    # 3. Segunda representación de color (HSV principal + LAB extra)
    print("\n[3] Conversión a HSV y LAB...")
    hsv = a_hsv(original)
    lab = a_lab(original)
    guardar("hsv_o_lab.png", hsv, out)     # entregable mínimo (HSV)
    guardar("lab.png", lab, out)           # representación adicional

    # 4. Suavizado
    print(f"\n[4] Suavizado (Gaussiano k={GAUSS_KSIZE} sigma={GAUSS_SIGMA}, "
          f"Mediana k={MEDIAN_KSIZE})...")
    gauss = suavizar_gaussiano(original)
    mediana = suavizar_mediana(original)
    guardar("suavizado.png", gauss, out)   # entregable mínimo (Gaussiano)
    guardar("suavizado_mediana.png", mediana, out)

    # 5. Detección de bordes (sobre la versión gris suavizada)
    print(f"\n[5] Detección de bordes (Canny {CANNY_LOW}/{CANNY_HIGH}, "
          f"Sobel k={SOBEL_KSIZE})...")
    gris_suave = cv2.GaussianBlur(gris, GAUSS_KSIZE, GAUSS_SIGMA)
    canny = bordes_canny(gris_suave)
    sobel = bordes_sobel(gris_suave)
    guardar("bordes.png", canny, out)      # entregable mínimo (Canny)
    guardar("bordes_sobel.png", sobel, out)

    # 6. Segmentación clásica (adaptativa) + detección con modelo preentrenado
    print("\n[6] Segmentación clásica y detección (Haar Cascade)...")
    mascara, seg, contorno, metodo = segmentar(original, gris)
    print(f"  Método de segmentación: {metodo}")
    rostros_vis = detectar_rostros(original, gris)
    guardar("deteccion_o_segmentacion.png", seg, out)  # entregable mínimo
    guardar("segmentacion_mascara.png", mascara, out)
    guardar("segmentacion_contorno.png", contorno, out)
    guardar("deteccion_rostros.png", rostros_vis, out)

    # 7. Montaje comparativo
    print("\n[7] Generando montaje comparativo...")
    montaje = construir_montaje([
        ("1. Original", original),
        ("2. Grises", gris),
        ("3. HSV", hsv),
        ("4. Suavizado", gauss),
        ("5. Bordes (Canny)", canny),
        ("5b. Bordes (Sobel)", sobel),
        ("6. Mascara/etiquetas", mascara),
        ("6. Segmentacion", seg),
        ("6. Contorno", contorno),
    ])
    guardar("comparativo.png", montaje, out)

    print("\n" + "=" * 60)
    print(f"Listo. {len(os.listdir(out))} archivos en resultados/")
    print("=" * 60)


if __name__ == "__main__":
    main()
