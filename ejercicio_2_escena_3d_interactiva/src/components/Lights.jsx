/**
 * Iluminación de la escena, coherente con el tema de nave industrial:
 *  - Luz ambiental tenue (relleno general).
 *  - Luz hemisférica para diferenciar techo/suelo.
 *  - Foco principal cenital con sombras (luminaria de techo).
 *  - Foco de trabajo cálido sobre la celda del brazo.
 * Cuando el usuario apaga las luces, solo queda un mínimo de ambiente.
 */
export default function Lights({ on }) {
  return (
    <>
      <ambientLight intensity={on ? 0.35 : 0.06} />
      <hemisphereLight
        intensity={on ? 0.4 : 0.05}
        color="#cfe0ff"
        groundColor="#20242c"
      />

      {/* Luminaria principal de techo, proyecta sombras */}
      <spotLight
        position={[4, 9, 4]}
        angle={0.6}
        penumbra={0.5}
        intensity={on ? 800 : 0}
        distance={40}
        color="#ffffff"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-bias={-0.0001}
      />

      {/* Foco de trabajo cálido sobre la celda del brazo */}
      <spotLight
        position={[0, 6, 2.5]}
        angle={0.5}
        penumbra={0.7}
        intensity={on ? 350 : 0}
        distance={25}
        color="#ffd9a0"
        castShadow
      />

      {/* Relleno frío lateral para dar volumen */}
      <pointLight
        position={[-6, 3, -4]}
        intensity={on ? 120 : 0}
        distance={30}
        color="#6f8cff"
      />
    </>
  );
}
