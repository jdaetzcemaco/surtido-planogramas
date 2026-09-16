# Contrato: Reemplazar Archivo de un Adjunto

**Método:** `PUT`
**Ruta:** `/api/v1/adjuntos/{id}`
**Actor:** Analista
**Caso de uso:** CU-09-03

---

## Descripción

Reemplaza el contenido de un adjunto existente por un archivo nuevo, **conservando el mismo id** — no se versiona el archivo en sí, solo queda el último que se subió.

Orden de operaciones: (1) sube el archivo nuevo a un blob nuevo, (2) actualiza la fila en BD para apuntar al blob nuevo, (3) recién entonces borra el blob viejo. Si el paso 2 fallara, el blob viejo sigue intacto y el archivo no se pierde.

Mismas reglas de validación que `POST /versiones/{id}/adjuntos` (ver ese contrato) — la única diferencia es el path (`{id}` es el id del adjunto, no de la versión).

---

## Parámetros de entrada

### Path Parameters

| Parámetro | Tipo | Requerido |
|-----------|------|-----------|
| `id` | `integer` | Sí — id del adjunto. |

### Body (JSON)

| Campo | Tipo | Requerido | Validación |
|-------|------|-----------|------------|
| `nombre_original` | `string` | Sí | 1–255 chars. |
| `tipo_mime` | `string` | Sí | Uno de: `image/jpeg`, `image/png`, `image/webp`, `application/pdf`. |
| `archivo_base64` | `string` | Sí | Contenido del archivo nuevo, codificado en base64. |

---

## Reglas de negocio

1. El adjunto debe existir — `404` si no.
2. La versión a la que pertenece el adjunto debe estar en `borrador`, `en_desarrollo` o `piloto` — `422` si no.
3. Mismas validaciones de `tipo_mime` y tamaño máximo (5MB) que al agregar.
4. `subido_por` se actualiza al usuario que hizo el reemplazo (hoy siempre `'sistema'`).
5. El blob viejo se borra **después** de confirmar la actualización de la fila — nunca antes.

---

## Request JSON

```json
{
  "nombre_original": "foto-rack-frontal-v2.jpg",
  "tipo_mime": "image/jpeg",
  "archivo_base64": "/9j/4AAQSkZJRgABAQAAAQABAAD..."
}
```

---

## Response — 200 OK

```json
{
  "id": 5,
  "versionId": 10,
  "nombreOriginal": "foto-rack-frontal-v2.jpg",
  "tipoMime": "image/jpeg",
  "tamanoBytes": 915204,
  "blobContainer": "adjuntos",
  "blobPath": "versiones/10/9c7b4e21-foto-rack-frontal-v2.jpg",
  "blobUrl": "https://{cuenta}.blob.core.windows.net/adjuntos/versiones/10/9c7b4e21-foto-rack-frontal-v2.jpg",
  "subidoPor": "sistema",
  "createdAt": "2026-09-16T14:32:00.000Z"
}
```

El `id` no cambia respecto al adjunto reemplazado; `blobPath`/`blobUrl` sí, porque apuntan al blob nuevo.

---

## Códigos de error

| Código | Condición |
|--------|-----------|
| `400 Bad Request` | `tipo_mime` no permitido, archivo excede el tamaño máximo, o campos ausentes/mal formados. |
| `401 Unauthorized` | JWT ausente. |
| `404 Not Found` | Adjunto no existe. |
| `422 Unprocessable Entity` | Versión no editable. |
| `503 Service Unavailable` | Azure Blob Storage no respondió a la subida o al borrado del blob viejo. |

---

## Anotaciones de arquitectura

> **[CLEAN CODE]**
> El orden subir-nuevo → actualizar-fila → borrar-viejo es intencional: prioriza no perder el archivo del usuario por sobre no dejar un blob huérfano temporal en Storage (que se puede limpiar después; un archivo perdido, no).
