/**
 * agents/index.js
 * Barril de agentes disponibles en el proyecto — punto único desde el que el resto del código
 * importa un agente. Agregar aquí cada agente nuevo a medida que se construya.
 */

module.exports = {
  agenteExtractor: require('./agenteExtractor'),
  extractorImagenNumerada: require('./extractorImagenNumerada'),
  extractorFacings: require('./extractorFacings'),
};
