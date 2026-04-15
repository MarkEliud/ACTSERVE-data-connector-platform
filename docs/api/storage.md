# Storage API Documentation

## Base URL
`https://api.dataconnector.com/api/storage/`

All endpoints require authentication via `Authorization: Bearer <access_token>`.

---

## Overview

The Storage API manages file exports generated from extraction jobs. Files can be exported in JSON or CSV format, made public or private, shared with specific users, and downloaded directly.

---

## Access Control

| Role | Own files | Public files | Shared files | Others' private files |
|------|-----------|-------------|-------------|----------------------|
| Admin | Full CRUD | Full CRUD | Full CRUD | Full CRUD |
| Regular User | Full CRUD | Read + Download | Read + Download | No access |

---

## Stored Records (Read-Only)

Stored records are the raw extracted data rows, separate from exported files.

### List Stored Records

**Endpoint:** `GET /records/`

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| job | int | Filter by extraction job ID |
| validation_status | string | Filter by `valid`, `invalid`, or `pending` |
| is_modified | boolean | Filter modified records |
| ordering | string | Sort field (e.g. `row_number`, `-created_at`) |

**Response (200 OK):**
```json
{
  "count": 1000,
  "results": [
    {
      "id": 1,
      "job": 1,
      "job_name": "Customer Export",
      "row_number": 1,
      "data": { "id": 1, "email": "user@example.com" },
      "original_data": { "id": 1, "email": "user@example.com" },
      "is_modified": false,
      "validation_status": "valid",
      "has_changes": false,
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

---

### Get Record Statistics

**Endpoint:** `GET /records/statistics/`

**Response (200 OK):**
```json
{
  "summary": {
    "total_records": 5000,
    "modified_records": 42,
    "valid_records": 4990,
    "invalid_records": 10
  },
  "by_job": [
    {
      "job_name": "Customer Export",
      "total": 1000,
      "valid": 995,
      "invalid": 5
    }
  ]
}
```

---

## File Exports

### List File Exports

**Endpoint:** `GET /exports/`

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| page | int | Page number |
| page_size | int | Items per page (default: 100) |
| job | int | Filter by extraction job ID |
| file_format | string | Filter by `json` or `csv` |
| status | string | Filter by export status |
| is_public | boolean | Filter by public status |
| search | string | Search by file name, job name, or creator email |
| ordering | string | Sort field (e.g. `-created_at`, `file_size`) |

**Response (200 OK):**
```json
{
  "count": 10,
  "results": [
    {
      "id": 1,
      "job": 1,
      "job_name": "Customer Export",
      "file_format": "json",
      "status": "completed",
      "file_name": "customer_export_20240101.json",
      "file_path": "/media/exports/customer_export_20240101.json",
      "file_size": 204800,
      "file_hash": "sha256:abc123...",
      "metadata": {},
      "created_by": 1,
      "created_by_email": "user@example.com",
      "is_public": false,
      "is_expired": false,
      "file_extension": "json",
      "download_url": "/api/storage/exports/1/download/",
      "can_access": true,
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z",
      "expires_at": null
    }
  ]
}
```

---

### Create File Export

Generate an export file from an extraction job.

**Endpoint:** `POST /exports/`

**Request Body:**
```json
{
  "job_id": 1,
  "file_format": "json",
  "include_modified_only": false,
  "expires_in_days": 30
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| job_id | int | Yes | Extraction job to export |
| file_format | string | No | `json` (default) or `csv` |
| include_modified_only | boolean | No | Export only modified rows (default: `false`) |
| expires_in_days | int | No | Days until file expires (1–365) |

**Response (201 Created):** Full file export object.

**Notes:**
- You must own the job (or be an admin)
- File generation is synchronous; the response includes the completed file details

---

### Delete File Export

**Endpoint:** `DELETE /exports/{id}/`

**Permissions:** Owner or Admin only

Deletes both the database record and the physical file from storage.

**Response (200 OK):**
```json
{
  "success": true,
  "message": "File customer_export.json deleted successfully"
}
```

---

### Toggle Public/Private

**Endpoint:** `POST /exports/{id}/toggle_public/`

**Permissions:** Owner or Admin only

**Response (200 OK):**
```json
{
  "success": true,
  "is_public": true
}
```

---

### Download File

Download the exported file.

**Endpoint:** `GET /exports/{id}/download/`

**Permissions:** Owner, Admin, users the file is shared with, or any user (if `is_public = true`)

**Response:** Binary file download with appropriate `Content-Type` header.

**Error Responses:**
- `403 Forbidden` – No access
- `404 Not Found` – File not found on disk
- `410 Gone` – File has expired

---

### Get File Metadata

**Endpoint:** `GET /exports/{id}/metadata/`

**Permissions:** Any user with file access (owner, admin, shared, or public)

**Response (200 OK):**
```json
{
  "file_id": 1,
  "file_name": "customer_export.json",
  "file_format": "json",
  "file_size": 204800,
  "file_hash": "sha256:abc123...",
  "metadata": {},
  "created_at": "2024-01-01T00:00:00Z",
  "created_by": "user@example.com",
  "is_public": false,
  "expires_at": "2024-02-01T00:00:00Z",
  "is_expired": false
}
```

---

## File Sharing

### Share File with a User

Grant another user access to a private file.

**Endpoint:** `POST /exports/{id}/share/`

**Permissions:** Owner or Admin only

**Request Body:**
```json
{
  "user_email": "colleague@example.com",
  "message": "Here's the customer export you requested."
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "File shared with colleague@example.com",
  "share_id": 5
}
```

**Error (400):** If already shared with that user, or sharing with self.

---

### List Shared Users

Get all users a file has been shared with.

**Endpoint:** `GET /exports/{id}/shares/`

**Permissions:** Owner or Admin only

**Response (200 OK):**
```json
{
  "shares": [
    {
      "email": "colleague@example.com",
      "shared_at": "2024-01-01T00:00:00Z",
      "share_id": 5
    }
  ],
  "count": 1
}
```

---

### Revoke File Access

Remove a user's shared access to a file.

**Endpoint:** `POST /exports/{id}/revoke/`

**Permissions:** Owner or Admin only

**Request Body:**
```json
{
  "user_email": "colleague@example.com"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Access revoked for colleague@example.com"
}
```

---

## Cleanup Expired Files (Admin Only)

Delete all expired export files from storage and the database.

**Endpoint:** `POST /exports/cleanup/`

**Permissions:** Admin only

**Response (200 OK):**
```json
{
  "success": true,
  "deleted_count": 12,
  "errors": []
}
```

---

## Supported Export Formats

| Format | Content-Type | Description |
|--------|-------------|-------------|
| `json` | `application/json` | Nested JSON array with full row metadata |
| `csv` | `text/csv` | Flat CSV with row metadata columns prepended |

---

## Error Codes

| Code | Description |
|------|-------------|
| 400 | Bad request – validation error or already shared |
| 403 | Forbidden – not the file owner or admin |
| 404 | Not found – file export or user doesn't exist |
| 410 | Gone – file has expired |
| 500 | Internal server error |