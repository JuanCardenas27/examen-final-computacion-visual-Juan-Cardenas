# Examen Final de Computación Visual 2026-I — Juan David Cárdenas Galvis

**Universidad Nacional de Colombia · Computación Visual**

Entrega práctica que integra procesamiento de imágenes / visión por computador
(Ejercicio 1) y una escena 3D interactiva (Ejercicio 2).

---

## Descripción general

| Ejercicio | Tema | Tecnología |
|-----------|------|------------|
| **1 — Procesamiento visual e IA** | Pipeline de OpenCV sobre una imagen (grises, HSV/LAB, suavizado, bordes, segmentación y detección) | Python + OpenCV + NumPy |
| **2 — Escena 3D interactiva** | Fábrica robótica (brazo articulado, banda, AGV, pick-and-place) | React Three Fiber (Three.js) |

---

## Estructura del repositorio

```text
examen-final-computacion-visual-Juan-Cardenas/
├── README.md                          # este archivo
├── CLAUDE.md                          # enunciado del examen
├── Ejercicio1.png                     # imagen de entrada del ejercicio 1
├── ejercicio_1_procesamiento_visual/
│   ├── src/main.py                    # pipeline de OpenCV
│   ├── data/                          # entrada.png e IMAGEN2.jpg
│   ├── resultados/                    # salidas imagen 1 (+ imagen2/ para la 2)
│   ├── requirements.txt
│   └── README.md
└── ejercicio_2_escena_3d_interactiva/
    ├── src/                           # app React Three Fiber
    ├── media/                         # evidencias (capturas / GIF)
    ├── package.json
    └── README.md
```

---

## Dependencias y ejecución

### Ejercicio 1 (Python)

```bash
python -m venv .venv
# Windows: .\.venv\Scripts\Activate.ps1   |  Linux/macOS: source .venv/bin/activate
pip install -r ejercicio_1_procesamiento_visual/requirements.txt
python ejercicio_1_procesamiento_visual/src/main.py
```

Genera las imágenes comparativas en `ejercicio_1_procesamiento_visual/resultados/`.
Detalles en su [README](ejercicio_1_procesamiento_visual/README.md).

### Ejercicio 2 (React Three Fiber)

```bash
cd ejercicio_2_escena_3d_interactiva
npm install
npm run dev        # http://localhost:5173
```

Detalles y controles en su [README](ejercicio_2_escena_3d_interactiva/README.md).

---

## Evidencias

- **Ejercicio 1:** se procesaron **dos imágenes**. `resultados/` (imagen 1,
  personaje sobre fondo blanco) y `resultados/imagen2/` (foto natural de Abbey
  Road). Cada carpeta incluye `comparativo.png` con todas las etapas.
- **Ejercicio 2:** capturas y GIF de la escena en ejecución en
  `ejercicio_2_escena_3d_interactiva/media/`.

---

## Análisis técnico (resumen)

- **Ejercicio 1:** se prioriza la *trazabilidad* — cada operación guarda su
  salida intermedia. La segmentación clásica (distancia al fondo + morfología +
  GrabCut) se eligió sobre Otsu invertido porque conserva el sujeto completo
  (incluido el rostro de tono claro). Se complementa con detección por modelo
  preentrenado (Haar Cascade).
- **Ejercicio 2:** la jerarquía anidada del brazo demuestra herencia de
  transformaciones; la animación se hace con refs mutables dentro de `useFrame`
  (sin re-renders) y la interacción cubre teclado, ratón, sliders y botones.

---

## Uso de IA

Se utilizó IA (Claude) como asistente de programación para estructurar el
código, redactar la documentación y depurar problemas concretos (recorte de la
cabeza en la segmentación, "agarre" de la caja en la escena 3D). Los prompts
específicos se detallan en el README de cada ejercicio. Todo el resultado fue
ejecutado y verificado manualmente por el estudiante.
