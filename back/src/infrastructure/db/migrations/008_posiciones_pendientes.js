/**
 * 008_posiciones_pendientes.js
 * Permite posiciones sin SKU confirmado (detectadas por IA, pendientes de asignación).
 * - sku pasa a ser nullable (las posiciones PENDIENTE no tienen SKU todavía)
 * - nombre_detectado: nombre que el agente de visión detectó en la foto
 * - confidence: 0-100; 100 = confirmado por el usuario / creado manualmente
 * - datos_vision: JSON completo de la respuesta del agente (para mostrar alternativas)
 */
exports.up = async function (knex) {
  // sku tiene un FK hacia Producto — SQL Server no deja alterar una columna con un FK dependiente
  // sin quitarlo primero. Se usa NVARCHAR(50) (no VARCHAR) porque así está tipado Producto.sku —
  // un ALTER con un tipo distinto rompe la recreación del FK (error 1778: tipos no coinciden).
  await knex.raw('ALTER TABLE Posicion DROP CONSTRAINT posicion_sku_foreign');
  await knex.raw('ALTER TABLE Posicion ALTER COLUMN sku NVARCHAR(50) NULL');
  await knex.raw('ALTER TABLE Posicion ADD CONSTRAINT posicion_sku_foreign FOREIGN KEY (sku) REFERENCES Producto(sku)');
  await knex.raw('ALTER TABLE Posicion ADD nombre_detectado VARCHAR(500) NULL');
  await knex.raw('ALTER TABLE Posicion ADD confidence INT NOT NULL DEFAULT 100');
  await knex.raw('ALTER TABLE Posicion ADD datos_vision NVARCHAR(MAX) NULL');
};

exports.down = async function (knex) {
  await knex.raw('ALTER TABLE Posicion DROP COLUMN datos_vision');
  await knex.raw('ALTER TABLE Posicion DROP COLUMN confidence');
  await knex.raw('ALTER TABLE Posicion DROP COLUMN nombre_detectado');
  // Revertir a NOT NULL puede fallar si existen filas con sku=NULL — limpiar antes si es necesario
  await knex.raw("UPDATE Posicion SET sku = 'UNKNOWN' WHERE sku IS NULL");
  await knex.raw('ALTER TABLE Posicion DROP CONSTRAINT posicion_sku_foreign');
  await knex.raw('ALTER TABLE Posicion ALTER COLUMN sku NVARCHAR(50) NOT NULL');
  // WITH NOCHECK: 'UNKNOWN' (usado arriba para limpiar) puede no existir como sku real en
  // Producto — no tiene sentido validar contra datos que la propia migración acaba de inventar.
  await knex.raw('ALTER TABLE Posicion WITH NOCHECK ADD CONSTRAINT posicion_sku_foreign FOREIGN KEY (sku) REFERENCES Producto(sku)');
};
