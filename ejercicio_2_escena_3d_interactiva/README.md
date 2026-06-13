# Ejercicio 2 — Escena 3D Interactiva: Fábrica Robótica

## Autor

- Juan David Cárdenas Galvis

## Fecha de entrega

`2026-06-12`

---

## Descripción breve

Este ejercicio construye una **escena 3D interactiva** con **React Three Fiber**
(la capa declarativa de Three.js sobre WebGL) bajo el tema de **robótica y
automatización**. La escena representa una **celda de fábrica** en la que un
**brazo robótico de 4 ejes** toma cajas de una **banda transportadora** y las
deposita en un pallet de salida, mientras un **robot móvil (AGV)** —conducido
por el usuario con el teclado— recorre la planta para recoger esas cajas. El
hilo conductor es: *¿cómo se modela una jerarquía mecánica articulada y cómo se
coordinan animación automática e interacción del usuario en una misma escena?*

Se eligió el tema robótico porque un brazo articulado es el ejemplo canónico de
**jerarquía de transformaciones anidadas** (cada articulación hereda la
transformación de su padre: `base → hombro → codo → muñeca → pinza`) y porque
toda la escena se construye con **primitivas geométricas**, sin modelos externos
pesados, lo que la hace ligera y 100 % reproducible con `npm install`. La escena
cumple los requisitos obligatorios del taller: **jerarquía de objetos**,
**transformaciones** (traslación, rotación y escala), **cámara interactiva**,
**materiales PBR**, **iluminación coherente**, **animaciones**, **interacción
entre elementos** (el brazo agarra la caja y el AGV la recoge) e **interacción
del usuario** por cuatro vías simultáneas: teclado, ratón, sliders y botones.

La animación por frame se resuelve con **refs mutables** dentro de `useFrame`
(no con estado de React) para evitar cientos de re-renders por segundo; un store
de **zustand** guarda únicamente la configuración de baja frecuencia (toggles,
sliders, vista de cámara, selección). El ciclo de trabajo del brazo está
implementado como una **máquina de estados** (pick-and-place).

---

## Implementaciones

### React Three Fiber

Aplicación **Vite + React 18** con `@react-three/fiber`, `@react-three/drei`
(helpers: `OrbitControls`, `ContactShadows`), `leva` (panel de sliders y
botones) y `zustand` (estado compartido). Ejecución:

```bash
cd ejercicio_2_escena_3d_interactiva
npm install
npm run dev        # http://localhost:5173
npm run build      # build de producción en dist/
```

---

#### Bloque 1 — Jerarquía del brazo robótico (`RoboticArm.jsx`)

El brazo demuestra la **jerarquía de objetos** y las **transformaciones
anidadas**. Cada articulación es un `<group>` posicionado al final del eslabón
anterior y rotado sobre su propio eje; al estar anidados, la rotación de un
padre arrastra a todos sus hijos:

```jsx
<group ref={baseRef}>                       {/* rota sobre Y  */}
  <group ref={shoulderRef} position={[0, 0.72, 0]}>   {/* rota sobre X */}
    <group ref={elbowRef} position={[0, 1.3, 0]}>     {/* rota sobre X */}
      <group ref={wristRef} position={[0, 1.1, 0]}>   {/* rota sobre X */}
        <group position={[0, 0.18, 0]}>               {/* pinza */}
          <mesh ref={fingerL} /> <mesh ref={fingerR} />
          <object3D ref={tipRef} position={[0, 0.28, 0]} />  {/* punta */}
```

El componente no decide la animación: cada frame **interpola (lerp)** sus
ángulos hacia un objetivo `target` que le entrega el director de la escena, lo
que produce un movimiento suave. Expone hacia afuera, vía ref, el `Object3D` de
la **punta de la pinza**, que el director usa para "pegar" la caja durante el
transporte.

#### Bloque 2 — Banda transportadora (`ConveyorBelt.jsx`)

Estructura estática (marcos, patas) más **rodillos que giran** y una serie de
**tablillas que se desplazan** a lo largo de la banda y se reciclan al llegar al
extremo, dando la sensación de movimiento. La velocidad la controla el usuario
desde el panel (`store.beltSpeed`):

```jsx
useFrame((_, dt) => {
  const v = useStore.getState().beltSpeed * 1.2;
  rollerA.current.rotation.z -= v * dt * 4;          // rotación de rodillos
  tablillasRef.current.forEach((m) => {
    m.position.x += v * dt;                           // traslación + reciclaje
    if (m.position.x > half) m.position.x -= BELT.length;
  });
});
```

#### Bloque 3 — Robot móvil AGV controlado por teclado (`MobileRobot.jsx`)

El AGV se conduce con **W/A/S/D o las flechas** (estado leído desde el hook
`useKeyboard`). Avanza en la dirección a la que mira y gira sobre su eje; las
ruedas rotan proporcionalmente al avance y un límite mantiene el robot dentro
del recinto. Expone su grupo por ref para que el director conozca su posición.

```jsx
g.rotation.y += giro * GIRO * dt;
g.position.x += Math.sin(g.rotation.y) * mov * VEL * dt;
g.position.z += Math.cos(g.rotation.y) * mov * VEL * dt;
wheels.current.forEach((w) => (w.rotation.x += d * 6));
```

#### Bloque 4 — Director del ciclo pick-and-place (`Scene.jsx`)

El "director" implementa, dentro de `useFrame`, una **máquina de estados** que
recorre las fases del ciclo de trabajo:

```
feed → reach → grab → lift → swing → down → release → return → idle → respawn
```

En cada fase fija una *pose objetivo* del brazo (`POSE.HOME`, `POSE.PICK_DOWN`,
`POSE.DROP_OVER`…). Durante el transporte, la caja sigue la **posición mundial
de la punta de la pinza** (`getWorldPosition`), por lo que queda "agarrada" sin
necesidad de reparenting de la jerarquía:

```jsx
if (s.boxPhase === 'carried') {
  armApi.current.tip.current.getWorldPosition(tmp);
  box.position.set(tmp.x, tmp.y - HALF - 0.04, tmp.z);
}
```

La **interacción entre elementos** se cierra con el AGV: cuando el robot móvil se
acerca al pallet (radio de enganche), la caja salta a su plataforma y lo sigue;
si nadie la recoge, tras unos segundos se "entrega" automáticamente y la línea
reinicia con una nueva caja.

#### Bloque 5 — Cámara, iluminación y materiales

- **Cámara interactiva:** `OrbitControls` (arrastrar para orbitar, rueda para
  zoom) + **tres presets** (`orbita`, `superior`, `brazo`) aplicados por botón
  desde `CameraRig.jsx`, con transición suave por `lerp` y un contador `camPulse`
  que permite re-disparar la misma vista.
- **Materiales PBR:** `meshStandardMaterial` con `metalness`/`roughness` para
  metal, goma y hormigón, más materiales **emisivos** para las luces de estado.
- **Iluminación coherente:** luz ambiental + hemisférica + foco cenital con
  sombras + foco de trabajo cálido sobre el brazo + relleno frío lateral
  (`Lights.jsx`).

#### Bloque 6 — Interacción del usuario (`App.jsx`, panel `leva`)

El panel (esquina superior derecha) ofrece **sliders** (velocidad de la banda y
los cinco ángulos del brazo en modo manual) y **botones** (vistas de cámara).
Toggles para el ciclo automático y las luces. Además, **clic** sobre cualquier
objeto lo selecciona y lo resalta, mostrando su nombre en el HUD.

**Herramientas:** Node 24, Vite 5, React 18, three ~0.169,
@react-three/fiber 8, @react-three/drei 9, leva 0.9, zustand 4.

---

## Resultados visuales

> **Nota:** las evidencias visuales (capturas y GIF) las genera el estudiante
> ejecutando la escena con `npm run dev` y se colocan en `media/`. Abajo quedan
> embebidas con los nombres esperados; al añadir los archivos se mostrarán
> automáticamente.

### Vista general de la escena

![Captura general de la fábrica](media/captura_1.png)

Vista orbital de la celda completa: el brazo robótico en el centro sobre su
demarcación de seguridad, la banda transportadora trayendo una caja, el pallet
de salida y el robot móvil (AGV). Se aprecian los materiales metálicos, las
sombras proyectadas por los focos de techo y la iluminación cálida de trabajo.

### Detalle del brazo y la pinza

![Captura del brazo robótico](media/captura_2.png)

Vista cercana (preset "Detalle del brazo") que muestra la jerarquía articulada
—base giratoria, hombro, codo, muñeca y pinza— y la caja sujeta por la pinza
durante la fase de transporte del ciclo pick-and-place.

### Demostración del ciclo e interacción (GIF)

![Demo animada de la escena](media/demo.gif)

El GIF muestra el ciclo automático completo (la banda acerca la caja, el brazo
desciende, la agarra, gira hacia el pallet y la deposita), la navegación con la
cámara, la conducción del AGV con el teclado para recoger la caja del pallet, y
el control manual del brazo con los sliders del panel.

---

## Código relevante

### 1. Interpolación de articulaciones hacia el objetivo

```jsx
useFrame((_, dt) => {
  const t = target.current, k = Math.min(1, dt * LERP_SPEED);
  baseRef.current.rotation.y     = THREE.MathUtils.lerp(baseRef.current.rotation.y, t.base, k);
  shoulderRef.current.rotation.x = THREE.MathUtils.lerp(shoulderRef.current.rotation.x, t.shoulder, k);
  // ... codo, muñeca y apertura de la pinza
});
```

Interpolar hacia un objetivo (en lugar de fijar el ángulo) desacopla la *lógica*
del ciclo (qué pose se desea) de la *presentación* (cómo se llega a ella), y
produce un movimiento mecánico creíble sin scripting de fotogramas.

### 2. "Agarre" de la caja sin reparenting

```jsx
armApi.current.tip.current.getWorldPosition(tmp);   // posición mundial de la punta
box.position.set(tmp.x, tmp.y - HALF - 0.04, tmp.z);
```

Reasignar la jerarquía de la caja a la pinza en R3F es frágil; leer cada frame
la posición mundial de un `Object3D` colocado en la punta y copiarla a la caja
logra el mismo efecto visual de forma robusta y reversible.

### 3. Presets de cámara re-disparables con transición suave

```jsx
useEffect(() => { destino.current = { pos: vec(preset.pos), target: vec(preset.target) }; },
          [cameraView, camPulse]);   // camPulse sube en cada clic
useFrame((_, dt) => {
  if (!destino.current) return;
  camera.position.lerp(destino.current.pos, dt * 4);
  controls.target.lerp(destino.current.target, dt * 4); controls.update();
});
```

Reaccionar a un **contador** (`camPulse`) y no solo al nombre de la vista
permite que volver a pulsar el mismo botón recoloque la cámara aunque el usuario
ya haya orbitado; el `lerp` evita el salto brusco y libera el control al llegar.

---

## Prompts utilizados

```

"Quita la dependencia de red del Environment HDR de drei para que la escena sea
reproducible offline; compensa con un esquema de luces propio."

"El botón 'Detalle del brazo' no hace nada si ya estás en esa vista; haz que
cada clic vuelva a recolocar la cámara con una transición suave."
```

---

## Aprendizajes y dificultades

### Aprendizajes

El aprendizaje central fue **modelar mecánica articulada como jerarquía de
grupos**: posicionar cada articulación al final del eslabón anterior y rotarla
sobre su eje hace que las transformaciones se compongan solas, exactamente como
en un robot real. Quedó claro también el patrón de **separar lógica de
presentación**: el director decide *qué* pose se desea y el brazo resuelve *cómo*
llegar mediante interpolación.

En cuanto a rendimiento, fue clave entender que **animar con estado de React es
un antipatrón**: cada cambio dispara un re-render. Usar refs mutables dentro de
`useFrame` y reservar el store para configuración de baja frecuencia mantiene la
escena fluida.

### Dificultades

La principal fue el **"agarre" de la caja**: reparentar en R3F era frágil, y se
resolvió leyendo la posición mundial de la punta de la pinza cada frame. La
segunda fue la **dependencia de red** del `Environment` de drei (descarga un HDR
de un CDN), que se eliminó para garantizar reproducibilidad offline. La tercera
fue que los **presets de cámara** no se re-disparaban al pulsar el mismo botón,
resuelto con un contador `camPulse` y transición por `lerp`.

### Mejoras futuras

Añadir **cinemática inversa (IK)** real para que el brazo alcance coordenadas
arbitrarias en lugar de poses pre-autorizadas; incorporar **detección de
colisiones** entre el AGV y los elementos de la planta; y permitir **varias
cajas simultáneas** en la línea con una cola de trabajo, acercando la simulación
a una fábrica real. También sería interesante una interacción por **voz** o
**WebSocket** para controlar el ciclo de forma remota.

---

## Verificación manual del estudiante

- Se ejecutó `npm install` y `npm run build` sin errores de compilación.
- Se validó en el navegador (`npm run dev`): movimiento articulado del brazo,
  banda y rodillos en marcha, conducción del AGV con el teclado, selección de
  objetos por clic, sliders del brazo en modo manual, botones de cámara con
  transición suave y encendido/apagado de luces.
- Las capturas y el GIF de evidencia se añaden en `media/`.

---

## Estructura del proyecto

```
ejercicio_2_escena_3d_interactiva/
├── index.html, vite.config.js, package.json
├── src/
│   ├── main.jsx                 # Punto de entrada React
│   ├── App.jsx                  # Canvas, panel leva, HUD
│   ├── styles.css               # Estilos del HUD y título
│   ├── store.js                 # Estado compartido (zustand)
│   ├── layout.js                # Constantes de posiciones (banda, pallet, caja)
│   ├── hooks/useKeyboard.js     # Estado del teclado para el AGV
│   └── components/
│       ├── Scene.jsx            # Director del ciclo, cámara, controles, caja
│       ├── RoboticArm.jsx       # Jerarquía del brazo + interpolación
│       ├── ConveyorBelt.jsx     # Banda, rodillos y tablillas animadas
│       ├── MobileRobot.jsx      # AGV controlado por teclado
│       ├── Factory.jsx          # Suelo, paredes, vigas, pallet, props
│       ├── Lights.jsx           # Iluminación de la escena
│       └── CameraRig.jsx        # Presets de cámara
├── media/                       # captura_1.png, captura_2.png, demo.gif
└── README.md
```

---

## Referencias

- React Three Fiber — documentación oficial:
  https://docs.pmnd.rs/react-three-fiber
- Three.js — documentación y fundamentos de WebGL:
  https://threejs.org/docs/
- drei — helpers para R3F (OrbitControls, ContactShadows):
  https://github.com/pmndrs/drei
- leva — panel de controles para React:
  https://github.com/pmndrs/leva
- zustand — gestión de estado minimalista:
  https://github.com/pmndrs/zustand
- Foley, J. et al. (1995). *Computer Graphics: Principles and Practice*.
  (Transformaciones jerárquicas y geometría 3D)
```
