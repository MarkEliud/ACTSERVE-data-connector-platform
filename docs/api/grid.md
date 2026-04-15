# Grid API Documentation

## Base URL
`https://api.dataconnector.com/api/grid/`

All endpoints require authentication via `Authorization: Bearer <access_token>`.

---

## Overview

The Grid API provides access to `DataSet` and `DataRow` objects. DataSets and DataRows are created automatically during the extraction process and cannot be created manually via the API. The Grid API is primarily used to read, edit, validate, and export extracted data.

---

## Access Control

| Role | Own datasets | Others' datasets |
|------|-------------|-----------------|
| Admin | Full access | Full access |
| Regular User | Full access | No access |

---

## DataSets

### List DataSets

**Endpoint:** `GET /datasets/`

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| page | int | Page number |
| page_size | int | Items per page (default: 100) |
| extraction_job | int | Filter by extraction job ID |
| created_by | int | Filter by creator (admin only) |
| search | string | Search by name or extraction job name |
| ordering | string | Sort field (e.g. `-created_at`, `name`) |

**Response (200 OK):**
```json
{
  "count": 5,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": 1,
      "name": "Customer Export",
      "extraction_job": 1,
      "created_by": 1,
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:05:00Z"
    }
  ]
}
```

---

### Get DataSet

**Endpoint:** `GET /datasets/{id}/`

**Response (200 OK):** Full dataset object.

---

### Get Dataset Rows

Get paginated rows for a dataset.

**Endpoint:** `GET /datasets/{id}/rows/`

**Response (200 OK):**
```json
{
  "count": 10000,
  "next": "http://api/grid/datasets/1/rows/?page=2",
  "previous": null,
  "results": [
    {
      "id": 1,
      "dataset": 1,
      "row_number": 1,
      "batch_number": 1,
      "original_data": { "id": 1, "email": "user@example.com" },
      "current_data": { "id": 1, "email": "updated@example.com" },
      "is_modified": true,
      "is_valid": true,
      "validation_errors": {},
      "updated_at": "2024-01-01T00:01:00Z"
    }
  ]
}
```

---

### Get Modified Rows

Returns only rows that have been edited.

**Endpoint:** `GET /datasets/{id}/modified_rows/`

**Response:** Same format as `/rows/`, filtered to `is_modified = true`.

---

### Get Invalid Rows

Returns only rows that failed validation.

**Endpoint:** `GET /datasets/{id}/invalid_rows/`

**Response:** Same format as `/rows/`, filtered to `is_valid = false`.

---

### Get Dataset Statistics

**Endpoint:** `GET /datasets/{dataset_id}/statistics/`

**Response (200 OK):**
```json
{
  "dataset_id": 1,
  "dataset_name": "Customer Export",
  "statistics": {
    "total_rows": 10000,
    "modified_rows": 42,
    "valid_rows": 9998,
    "invalid_rows": 2
  }
}
```

---

## DataRows

Rows cannot be created or deleted manually. Use `PUT`/`PATCH` to edit and `POST /{id}/revert/` to undo changes.

### List Rows

**Endpoint:** `GET /rows/`

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| dataset | int | Filter by dataset ID |
| is_modified | boolean | Filter modified rows |
| is_valid | boolean | Filter by validation status |
| batch_number | int | Filter by batch number |
| ordering | string | Sort field (e.g. `row_number`, `-updated_at`) |

---

### Get Row

**Endpoint:** `GET /rows/{id}/`

**Response (200 OK):** Full row object including `original_data`, `current_data`, `is_modified`, `is_valid`, and `validation_errors`.

---

### Update Row

Edit the `current_data` of a row. The original data is preserved.

**Endpoint:** `PUT /rows/{id}/` or `PATCH /rows/{id}/`

**Request Body:**
```json
{
  "current_data": {
    "id": 1,
    "email": "newemail@example.com",
    "name": "Jane Doe"
  }
}
```

**Response (200 OK) – Valid:**
```json
{
  "success": true,
  "message": "Row updated successfully",
  "row": { ... }
}
```

**Response (400 Bad Request) – Validation failed:**
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": {
    "email": "Invalid email format"
  },
  "row": { ... }
}
```

**Notes:**
- Validation compares the new data against the `original_data` schema
- Even failed validation saves the data (with `is_valid = false` and populated `validation_errors`)
- `is_modified` is set to `true` on any update

---

### Revert Row

Restore a row to its original extracted data, clearing all modifications and validation errors.

**Endpoint:** `POST /rows/{id}/revert/`

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Row reverted to original data",
  "row": { ... }
}
```

---

### Get Row History

Get change history for a row.

**Endpoint:** `GET /rows/{id}/history/`

**Response (200 OK):**
```json
{
  "row_id": 1,
  "changes": [],
  "is_modified": true
}
```

---

## Bulk Update

Update multiple rows in a single request.

**Endpoint:** `POST /datasets/{dataset_id}/bulk-update/`

**Request Body:**
```json
{
  "rows": [
    {
      "id": 1,
      "current_data": { "email": "updated1@example.com" }
    },
    {
      "id": 2,
      "current_data": { "email": "updated2@example.com" }
    }
  ]
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "dataset_id": 1,
  "summary": {
    "total": 2,
    "successful": 1,
    "failed": 1
  },
  "errors": [
    {
      "id": 2,
      "row_number": 2,
      "errors": { "email": "Invalid email format" }
    }
  ]
}
```

**Notes:**
- All rows are processed in a single database transaction
- Failed validation does not stop other rows from being updated
- Each row must belong to the specified `dataset_id`

---

## Export Dataset

Export dataset rows to a file for download.

**Endpoint:** `GET /datasets/{dataset_id}/export/`

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| format | string | `csv` | Export format: `csv` or `json` |
| modified_only | boolean | `false` | Export only modified rows |

**Response:** File download (`text/csv` or `application/json`)

**CSV Format:** Includes `row_number`, `is_modified`, `is_valid` columns followed by data columns.

**JSON Format:**
```json
[
  {
    "row_number": 1,
    "original_data": { ... },
    "current_data": { ... },
    "is_modified": true,
    "is_valid": true
  }
]
```

---

## Revert Row (Standalone)

**Endpoint:** `POST /rows/{row_id}/revert/`

Equivalent to `POST /rows/{id}/revert/` on the ViewSet.

---

## Error Codes

| Code | Description |
|------|-------------|
| 400 | Bad request – validation error |
| 403 | Forbidden – not the dataset owner or admin |
| 404 | Not found – dataset or row doesn't exist |
| 405 | Method not allowed – attempted to create or delete a row |