/**
 * extractorFacings.js
 * Agente Extractor de Facings: recibe una foto de mueble ya corregida en perspectiva (ver Lienzo,
 * front/src/utils/lienzoWarp.ts — la imagen llega plana, recta y de frente) y devuelve un recuadro
 * por cada facing visible: la cara frontal de una unidad física de producto en el mueble. Solo
 * localiza — no identifica SKU ni resuelve nada contra el catálogo; esa capa se agrega después.
 */

const SCHEMA_RESPUESTA = {
  name: 'respuesta_extractor_facings',
  schema: {
    type: 'object',
    properties: {
      facings: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            x: { type: 'number' },
            y: { type: 'number' },
            ancho: { type: 'number' },
            alto: { type: 'number' },
          },
          required: ['x', 'y', 'ancho', 'alto'],
          additionalProperties: false,
        },
      },
      advertencias: { type: 'array', items: { type: 'string' } },
    },
    required: ['facings', 'advertencias'],
    additionalProperties: false,
  },
};

const PROMPT_SISTEMA = `Eres el "Agente Extractor de Facings" de Cemaco. Recibes una foto de un
mueble/rack de tienda ya corregida en perspectiva (queda plana, recta y de frente), y tu única
tarea es ubicar un recuadro por cada "facing": la cara frontal visible de UNA unidad física de
producto expuesta en el mueble.

## Reglas del dominio

- Un facing es una sola unidad física, no un tipo de producto — si el mismo SKU aparece varias
  veces seguidas una al lado de la otra, cada unidad tiene SU PROPIO recuadro. Nunca agrupes varias
  unidades idénticas y adyacentes en un solo recuadro.
- El recuadro debe ajustarse a la cara frontal visible de esa unidad (incluyendo su empaque), sin
  invadir el facing vecino.
- No generes recuadros para: agujeros vacíos de pegboard, etiquetas de precio, ganchos sin
  producto, ni la estructura del mueble (rieles, canastillas, estantes).
- Si un producto está parcialmente tapado por otro pero su cara frontal sigue siendo distinguible
  como unidad propia, igual generale su recuadro.
- Cuando una fila tenga muchas unidades idénticas muy juntas y no puedas distinguir con total
  certeza el límite exacto entre cada una, hacé tu mejor estimación según el ancho típico de un
  facing en esa fila (no las cuentes de menos) y agregá una advertencia describiendo esa zona — no
  omitas la fila completa por la incertidumbre.
- Cada recuadro se expresa en porcentaje del ancho/alto de la imagen (0 a 100 en ambos ejes),
  donde (0,0) es la esquina superior izquierda de la imagen y (100,100) la esquina inferior
  derecha: \`x\`,\`y\` es la esquina superior izquierda del recuadro y \`ancho\`,\`alto\` su tamaño,
  en ese mismo porcentaje.

## Puntos de referencia

La imagen tiene 4 puntos circulares azules quemados sobre la foto, cerca de cada esquina, en estas
coordenadas exactas (mismo sistema de porcentaje de arriba): (4,4) arriba-izquierda, (96,4)
arriba-derecha, (4,96) abajo-izquierda, (96,96) abajo-derecha. No son parte del mueble ni un
producto — son SOLO una guía de calibración. Usalos como referencia de escala y posición antes de
estimar cada recuadro: por ejemplo, un facing ubicado a la mitad de camino entre el punto
arriba-izquierda y el punto arriba-derecha debe tener una \`x\` cercana a 50; uno pegado al punto
abajo-derecha debe tener \`x\`+\`ancho\` e \`y\`+\`alto\` cercanos a 96. Nunca generes un recuadro
para estos 4 puntos de referencia.`;

/**
 * @param {object} entrada
 * @param {string} entrada.imagenBase64 - imagen en base64 puro (sin el prefijo data:...;base64,)
 * @param {string} entrada.mimeType - ej. 'image/jpeg'
 * @param {{openaiClient: object}} dependencias
 */
async function procesarImagen({ imagenBase64, mimeType }, { openaiClient }) {
  const resultado = await openaiClient.completarConImagen({
    instrucciones: PROMPT_SISTEMA,
    imagenBase64,
    mimeType,
    jsonSchema: SCHEMA_RESPUESTA,
  });

  const facings = (resultado.facings ?? []).map((f) => ({
    x: f.x,
    y: f.y,
    ancho: f.ancho,
    alto: f.alto,
  }));

  return { facings, advertencias: resultado.advertencias ?? [] };
}

module.exports = { procesarImagen };
