# Contrato: Descargar Adjunto

**Método:** `GET`
**Ruta:** `/api/v1/adjuntos/{id}/descargar`
**Actor:** Analista
**Caso de uso:** CU-09-05

---

## Descripción

Descarga el archivo de un adjunto. La respuesta es el **binario del archivo en streaming**, no JSON — el backend lo obtiene de Azure Blob Storage con sus propias credenciales (no las del usuario) y lo transmite directo a la response.

Este endpoint existe porque el contenedor de Azure es **privado**: `blobUrl` (expuesto en los otros contratos de este módulo) no tiene SAS y no es descargable directamente desde el navegador. Esta es la única forma soportada de obtener el contenido de un adjunto — nunca se debe construir/exponer una URL directa al blob desde el frontend.

Cuando exista el middleware de autenticación (JWT vía CAO, ver notas generales de diseño), este es el endpoint que quedará protegido — hoy, como el resto de la app, no tiene ningún gate.

---

## Parámetros de entrada

### Path Parameters

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `id` | `integer` | Sí | ID del adjunto. |

---

## Response — 200 OK

Headers:

| Header | Valor |
|--------|-------|
| `Content-Type` | El `tipoMime` guardado en la fila (ej. `image/jpeg`, `application/pdf`). |
| `Content-Disposition` | `inline; filename="{nombreOriginal}"` — permite previsualizar en el navegador en vez de forzar descarga. |

Body: binario del archivo, transmitido en streaming desde Azure Blob Storage.

---

## Códigos de error

| Código | Condición |
|--------|-----------|
| `401 Unauthorized` | JWT ausente. |
| `404 Not Found` | El adjunto no existe en BD, **o** la fila existe pero el blob ya no está en Azure Storage (inconsistencia — ej. borrado manual del blob fuera de la app). |
| `503 Service Unavailable` | Azure Blob Storage no respondió a la descarga. |

---

## Anotaciones de arquitectura

> **[HEXAGONAL]**
> `DescargarAdjuntoUseCase` retorna `{ adjunto, stream }` — el controller es quien decide los headers HTTP y hace `stream.pipe(res)`; el dominio no conoce Express ni `res`.

> **[SEGURIDAD]**
> Nunca cachear ni reenviar `blobUrl` como link clicable en el frontend — aunque el contenedor sea privado (así que un `blobUrl` filtrado no es explotable hoy), la única ruta de descarga soportada y auditable es este endpoint.
