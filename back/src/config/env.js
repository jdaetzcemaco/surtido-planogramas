/**
 * env.js — único punto de acceso a variables de entorno.
 * Todo el resto del código importa desde aquí; nunca lee process.env directamente.
 */

require('dotenv').config();

module.exports = {
  // Servidor
  PORT:     process.env.PORT     || 3000,
  NODE_ENV: process.env.NODE_ENV || 'development',

  // Base de datos — SQL Server
  db: {
    host:                 process.env.DB_HOST,
    port:                 Number(process.env.DB_PORT) || 1433,
    name:                 process.env.DB_NAME,
    user:                 process.env.DB_USER,
    password:             process.env.DB_PASSWORD,
    schema:               process.env.DB_SCHEMA               || 'dbo',
    encrypt:              process.env.DB_ENCRYPT               === 'true',
    trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true',
  },

  // CORS
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:5173',

  // Autenticación (Entra ID / Azure AD)
  jwt: {
    tenantId: process.env.JWT_TENANT_ID,
    audience: process.env.JWT_AUDIENCE,
  },

  // CAO — CemacoAllInOne (primer salto de autenticación hacia CATI)
  cao: {
    baseUrl:  process.env.CAO_BASE_URL,
    user:     process.env.CAO_USER,
    password: process.env.CAO_PASSWORD,
  },

  // CATI — catálogo y jerarquía (segundo salto)
  cati: {
    baseUrl: process.env.CATI_BASE_URL,
    apiKey:  process.env.CATI_API_KEY,
  },

  // OpenAI — usado por los agentes de back/src/agents/
  openai: {
    apiKey: process.env.OPENIA_TOKEN,
    model:  process.env.OPENAI_MODEL || 'gpt-4o-mini',
  },

  // Azure Blob Storage — adjuntos de PlanogramaVersion. Contenedor privado (la cuenta tiene
  // deshabilitado el acceso anónimo al blob); la descarga real siempre pasa por el backend
  // (GET /adjuntos/:id/descargar), nunca se expone una URL directa del blob.
  azureStorage: {
    connectionString: process.env.AZURE_STORAGE_CONNECTION_STRING,
    container:        process.env.AZURE_STORAGE_CONTAINER_ADJUNTOS || 'adjuntos',
  },
};
