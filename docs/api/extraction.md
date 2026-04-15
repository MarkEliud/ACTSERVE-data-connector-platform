# Extraction API Documentation

## Base URL
`https://api.dataconnector.com/api/extraction/`

All endpoints require authentication via `Authorization: Bearer <access_token>`.

---

## Access Control

Regular users can only see and manage their own extraction jobs and related batches/results. Admins can see all jobs across all users.

---

## Extraction Jobs

### List Extraction Jobs

**Endpoint:** `GET /jobs/`

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| page | int | Page number |
| page_size | int | Items per page (default: 100) |
| status | string | Filter by status (`pending`, `running`, `completed`, `failed`, `cancelled`) |
| connection | int | Filter by connection ID |
| connection__database_type | string | Filter by database type |
| search | string | Search by name, description, or table name |
| ordering | string | Sort field (e.g. `-created_at`, `total_rows`) |

**Response (200 OK):**
```json
{
  "count": 50,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": 1,
      "name": "Customer Export",
      "description": "Extract customer data",
      "connection": 1,
      "connection_name": "Production DB",
      "status": "completed",
      "table_name": "customers",
      "schema_name": "public",
      "columns": ["id", "email", "name"],
      "query": null,
      "batch_size": 1000,
      "total_rows": 10000,
      "total_batches": 10,
      "failed_batches": 0,
      "progress_percentage": 100,
      "created_by": 1,
      "created_by_email": "user@example.com",
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:05:00Z",
      "completed_at": "2024-01-01T00:05:00Z"
    }
  ]
}
```

---

### Create Extraction Job

**Endpoint:** `POST /jobs/`

**Request Body:**
```json
{
  "name": "Customer Export",
  "description": "Optional description",
  "connection": 1,
  "table_name": "customers",
  "schema_name": "public",
  "columns": ["id", "email", "name"],
  "batch_size": 1000
}
```

**Alternative – Custom Query:**
```json
{
  "name": "Custom Query Export",
  "connection": 1,
  "query": "SELECT id, email FROM customers WHERE active = true",
  "batch_size": 500
}
```

**Validation:**
- Either `table_name` or `query` must be provided (not both required, but at least one)
- `batch_size` must be between 1 and 100,000 (enforced in serializer)

**Response (201 Created):** Full job object with `status: "pending"`.

**Notes:**
- `created_by` is automatically set to the authenticated user
- The job starts in `pending` status. Call the `start` action to begin extraction.

---

### Get Extraction Job

**Endpoint:** `GET /jobs/{id}/`

**Response (200 OK):** Full job object.

---

### Update Extraction Job

**Endpoint:** `PUT /jobs/{id}/` or `PATCH /jobs/{id}/`

Only allowed while the job is in `pending` status.

---

### Delete Extraction Job

**Endpoint:** `DELETE /jobs/{id}/`

**Response:** `204 No Content`

---

### Start Extraction

Transition job from `pending` to `running` and begin the extraction process.

**Endpoint:** `POST /jobs/{id}/start/`

**Permissions:** Owner or Admin

**Response (200 OK):**
```json
{
  "status": "started",
  "job_id": 1,
  "message": "Extraction started successfully"
}
```

**Error (400):** If job is not in `pending` status:
```json
{
  "error": "Cannot start job with status: running"
}
```

---

### Cancel Extraction

Cancel a running or pending extraction job.

**Endpoint:** `POST /jobs/{id}/cancel/`

**Permissions:** Owner or Admin

**Response (200 OK):**
```json
{
  "status": "cancelled",
  "job_id": 1
}
```

**Error (400):** If job is not in `pending` or `running` status.

---

### Get Extraction Progress

Poll for real-time extraction progress.

**Endpoint:** `GET /jobs/{id}/progress/`

**Response (200 OK):**
```json
{
  "job_id": 1,
  "status": "running",
  "progress_percentage": 65,
  "total_rows": 10000,
  "total_batches": 10,
  "failed_batches": 0,
  "completed_batches": 6
}
```

**Status values:** `pending`, `running`, `completed`, `failed`, `cancelled`

---

### Preview Extracted Data

Get a preview of the first completed batch (up to 100 rows).

**Endpoint:** `GET /jobs/{id}/preview/`

**Response (200 OK):**
```json
{
  "batch_id": 5,
  "row_count": 1000,
  "data": [
    { "id": 1, "email": "user@example.com", "name": "John" }
  ]
}
```

**Error (404):** If no completed batches exist yet.

---

## Extraction Batches (Read-Only)

Batches are created automatically during extraction and cannot be created or modified via the API.

### List Batches

**Endpoint:** `GET /batches/`

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| job | int | Filter by job ID |
| status | string | Filter by batch status |

**Response fields:** `id`, `job`, `batch_number`, `status`, `row_count`, `offset`, `error_message`, `data`, `started_at`, `completed_at`, `created_at`

---

## Extraction Results (Read-Only)

### List Results

**Endpoint:** `GET /results/`

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| job | int | Filter by job ID |
| batch | int | Filter by batch ID |
| is_modified | boolean | Filter modified rows only |

**Response fields:** `id`, `job`, `batch`, `row_number`, `data`, `is_modified`, `modified_data`, `validation_errors`, `created_at`

---

## Alternative Progress / Cancel Endpoints

These standalone endpoints provide the same functionality as the ViewSet actions above:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/start/` | POST | Start a job by `job_id` in the request body |
| `/progress/{job_id}/` | GET | Get progress for a specific job |
| `/cancel/{job_id}/` | POST | Cancel a specific job |

**Start body:**
```json
{
  "job_id": 1,
  "batch_size": 1000
}
```

---

## Job Status Reference

| Status | Description |
|--------|-------------|
| `pending` | Job created, not yet started |
| `running` | Extraction in progress |
| `completed` | All batches finished successfully |
| `failed` | Extraction encountered an unrecoverable error |
| `cancelled` | Job was cancelled by the user |

---

## Extraction Flow

1. **Create** a job with a connection, table/query, and batch size
2. **Start** the job via `POST /jobs/{id}/start/`
3. **Poll** `GET /jobs/{id}/progress/` until `status` is `completed` or `failed`
4. **Preview** data via `GET /jobs/{id}/preview/`
5. **Export** the data via the Storage API

Extraction runs asynchronously via Celery workers. Batch size defaults to 1,000 rows and can be configured up to 10,000 per batch (configurable via `BATCH_SIZE_MAX` setting).

---

## Error Codes

| Code | Description |
|------|-------------|
| 400 | Bad request – validation error or invalid state transition |
| 403 | Forbidden – not the job owner or admin |
| 404 | Not found – job or batch doesn't exist |
| 500 | Internal server error – database connector error |