# Contrato: Eliminar Adjunto

**Método:** `DELETE`
**Ruta:** `/api/v1/adjuntos/{id}`
**Actor:** Analista
**Caso de uso:** CU-09-04

---

## Descripción

Elimina un adjunto: borra la fila en BD y, después, el blob físico en Azure Blob Storage. A diferencia de góndolas/niveles, no tiene contenido hijo que dependa de él — no existe un flag `forzar`.

---

## Parámetros de entrada

### Path Parameters

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `id` | `integer` | Sí | ID del adjunto. |

---

## Reglas de negocio

1. El adjunto debe existir — `404` si no.
2. La versión a la que pertenece debe estar en `borrador`, `en_desarrollo` o `piloto` — `422` si no.
3. Se borra primero la fila en BD y recién después el blob en Azure. Si el borrado del blob fallara luego de borrar la fila, queda un blob huérfano en Storage (sin fila que lo referencie) — no bloquea la operación desde la perspectiva del usuario, pero es candidato a limpieza periódica si llegara a pasar.

---

## Response — 204 No Content

Sin body.

---

## Códigos de error

| Código | Condición |
|--------|-----------|
| `401 Unauthorized` | JWT ausente. |
| `404 Not Found` | Adjunto no existe. |
| `422 Unprocessable Entity` | Versión no editable. |
| `503 Service Unavailable` | Azure Blob Storage no respondió al borrado del blob. |

```json
// 422
{
  "error": {
    "code": "UNPROCESSABLE",
    "message": "La versión no está en modo editable",
    "details": { "estadoActual": "archivado" }
  }
}
```

---

## Anotaciones de arquitectura

> **[HEXAGONAL]**
> `EliminarAdjuntoUseCase` recibe `(adjuntoRepo, versionRepo, blobStorage, id)` — la eliminación del blob pasa por el puerto de Storage, nunca por SQL directo ni por el SDK importado en el dominio.
