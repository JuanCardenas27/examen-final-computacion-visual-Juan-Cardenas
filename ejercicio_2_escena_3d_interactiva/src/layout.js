// Constantes de disposición de la escena (compartidas por la lógica y los
// componentes visuales para que todo encaje en el mismo sistema de coordenadas).
// Eje Y hacia arriba; el brazo está en el origen.

export const BELT = {
  z: 1.9, // la banda corre paralela al eje X, a este Z
  topY: 0.62, // altura de la superficie de la banda
  startX: -3.2, // donde aparece cada caja
  pickX: 0, // punto de recogida (frente al brazo)
  length: 7,
};

export const PALLET = {
  x: 2.2, // mesa de salida, al costado derecho del brazo
  z: 0,
  topY: 0.55,
};

export const BOX_SIZE = 0.42;

// Estación de carga del AGV: cuando el robot móvil se acerca al pallet recoge
// la caja. Radio de enganche:
export const AGV_PICKUP_RADIUS = 1.1;
