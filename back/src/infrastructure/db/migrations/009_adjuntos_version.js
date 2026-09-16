/**
 * 009_adjuntos_version.js
 * Agrega la tabla Adjunto — archivos (imágenes/PDFs) que el usuario asocia a una
 * PlanogramaVersion. El binario vive en Azure Blob Storage (contenedor privado); esta tabla
 * solo guarda la referencia. onDelete('CASCADE') igual que HistorialSustitucion/Gondola — el
 * blob físico se borra aparte, vía el SDK de Storage, no lo cubre la FK.
 */

exports.up = async function (knex) {
  await knex.schema.createTable('Adjunto', (t) => {
    t.increments('id');
    t.integer('planograma_version_id').notNullable()
      .references('id').inTable('PlanogramaVersion').onDelete('CASCADE');
    t.string('nombre_original', 255).notNullable();
    t.string('tipo_mime', 100).notNullable();
    t.integer('tamano_bytes').notNullable();
    t.string('blob_container', 100).notNullable();
    t.string('blob_path', 500).notNullable();
    t.string('blob_url', 1000).notNullable();
    t.string('subido_por', 100).notNullable();
    t.datetime('created_at').notNullable().defaultTo(knex.fn.now());
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('Adjunto');
};
