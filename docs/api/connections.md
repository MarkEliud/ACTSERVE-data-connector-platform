# Connections API Documentation

## Base URL
`https://api.dataconnector.com/api/connections/`

All endpoints require authentication via `Authorization: Bearer <access_token>`.

---

## Access Control

| Role | Own connections | Public connections | Others' private connections |
|------|----------------|-------------------|----------------------------|
| Admin | Full CRUD | Full CRUD | Full CRUD |
| Regular User | Full CRUD | Read + Test | No access |

Connections have an `is_public` flag. Public connections created by others are visible to all authenticated users (read-only). Passwords are hidden from non-owners on retrieve.

---

## Endpoints

### List Connections
Retrieve connections visible to the authenticated user.

**Endpoint:** `GET /`

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| page | int | Page number (default: 1) |
| page_size | int | Items per page (default: 100) |
| search | string | Search by name, description, or host |
| database_type | string | Filter by database type |
| is_active | boolean | Filter by active status |
| is_public | boolean | Filter by public status |
| ordering | string | Sort field (e.g. `name`, `-created_at`) |

**Response (200 OK):**
```json
{
  "count": 25,
  "next": "http://api/connections/?page=2",
  "previous": null,
  "results": [
    {
      "id": 1,
      "name": "Production DB",
      "description": "Main production database",
      "database_type": "postgresql",
      "database_type_display": "PostgreSQL",
      "host": "localhost",
      "port": 5432,
      "database_name": "production",
      "user": "postgres",
      "is_active": true,
      "is_public": false,
      "options": {},
      "connection_timeout": 30,
      "max_connections": 10,
      "created_by": 1,
      "created_by_email": "admin@example.com",
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z",
      "can_edit": true,
      "can_delete": true,
      "can_toggle_public": true
    }
  ]
}
```

---

### Create Connection

**Endpoint:** `POST /`

**Permissions:** Any authenticated user

**Request Body:**
```json
{
  "name": "New Connection",
  "description": "Optional description",
  "database_type": "postgresql",
  "host": "localhost",
  "port": 5432,
  "database_name": "mydb",
  "user": "dbuser",
  "password": "securepassword",
  "connection_timeout": 30,
  "max_connections": 10,
  "is_public": false,
  "options": {
    "ssl": true,
    "ssl_mode": "require"
  }
}
```

**Response (201 Created):** Full connection object (without password).

**Notes:**
- `password` is write-only and encrypted at rest using Fernet encryption
- `created_by` is set automatically to the authenticated user
- `is_active` is read-only (managed by the system)

---

### Get Connection

**Endpoint:** `GET /{id}/`

**Response (200 OK):** Full connection object. Password field is omitted for non-owners.

---

### Update Connection

**Endpoint:** `PUT /{id}/` or `PATCH /{id}/`

**Permissions:** Owner or Admin only

**Request Body:** Any updatable fields (partial update supported with PATCH).

```json
{
  "name": "Updated Name",
  "is_public": true
}
```

**Response (200 OK):** Updated connection object.

---

### Delete Connection

**Endpoint:** `DELETE /{id}/`

**Permissions:** Owner or Admin only

**Response:** `204 No Content`

---

### Test Saved Connection

Test an existing saved connection.

**Endpoint:** `POST /{id}/test/`

**Permissions:** Owner or Admin only

**Response (200 OK) – Success:**
```json
{
  "status": "success",
  "message": "Connection test successful",
  "response_time_ms": 45
}
```

**Response (400 Bad Request) – Failure:**
```json
{
  "status": "failed",
  "message": "Connection test failed",
  "error": "Connection refused"
}
```

A `ConnectionHistory` record is created for every test attempt.

---

### Test Connection Without Saving

Test connection parameters before saving.

**Endpoint:** `POST /test/`

**Permissions:** Any authenticated user

**Request Body:**
```json
{
  "database_type": "postgresql",
  "host": "localhost",
  "port": 5432,
  "database_name": "testdb",
  "user": "testuser",
  "password": "testpass",
  "connection_timeout": 30
}
```

**Required fields:** `database_type`, `host`, `port`, `database_name`, `user`, `password`

**Response (200 OK):**
```json
{
  "success": true,
  "response_time_ms": 42
}
```

---

### Toggle Public/Private

Toggle the public visibility of a connection.

**Endpoint:** `PATCH /{id}/toggle_public/`

**Permissions:** Owner or Admin only

**Response (200 OK):**
```json
{
  "success": true,
  "is_public": true,
  "message": "Connection is now Public"
}
```

---

### Get Schemas

Get available schemas/databases for a connection.

**Endpoint:** `GET /{id}/schemas/`

**Permissions:** Owner or Admin only

**Response (200 OK):**
```json
{
  "schemas": [
    { "name": "public" },
    { "name": "analytics" }
  ],
  "count": 2
}
```

---

### Get Tables

Get tables within a specific schema.

**Endpoint:** `GET /{id}/tables/`

**Permissions:** Owner or Admin only

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| schema | string | Yes | Schema name |

**Response (200 OK):**
```json
{
  "tables": [
    {
      "table_name": "users",
      "table_type": "TABLE",
      "description": ""
    }
  ],
  "count": 1,
  "schema": "public"
}
```

---

### Get Columns

Get columns for a specific table.

**Endpoint:** `GET /{id}/columns/`

**Permissions:** Owner or Admin only

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| schema | string | Yes | Schema name |
| table | string | Yes | Table name |

**Response (200 OK):**
```json
{
  "columns": [
    {
      "name": "id",
      "type": "integer",
      "nullable": false,
      "default": null,
      "max_length": null
    },
    {
      "name": "email",
      "type": "character varying",
      "nullable": false,
      "default": null,
      "max_length": 255
    }
  ],
  "count": 2,
  "schema": "public",
  "table": "users",
  "primary_keys": ["id"]
}
```

---

### Preview Table Data

Preview rows from a table.

**Endpoint:** `GET /{id}/preview/`

**Permissions:** Owner or Admin only

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| schema | string | Yes | – | Schema name |
| table | string | Yes | – | Table name |
| limit | int | No | 10 | Number of rows to return |

**Response (200 OK):**
```json
{
  "data": [
    { "id": 1, "email": "user@example.com" }
  ],
  "count": 1,
  "schema": "public",
  "table": "users"
}
```

---

### Get Connection Info

Get detailed metadata for a connection (no password).

**Endpoint:** `GET /{id}/connection_info/`

**Permissions:** Owner or Admin only

**Response (200 OK):**
```json
{
  "id": 1,
  "name": "Production DB",
  "database_type": "postgresql",
  "database_type_display": "PostgreSQL",
  "host": "localhost",
  "port": 5432,
  "database_name": "production",
  "is_active": true,
  "is_public": false,
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z",
  "created_by": "admin@example.com"
}
```

---

### Get Supported Database Types

**Endpoint:** `GET /supported-types/`

**Permissions:** Any authenticated user

**Response (200 OK):**
```json
{
  "types": ["postgresql", "mysql", "mongodb", "clickhouse"],
  "count": 4
}
```

---

## Connection Test Results (Read-Only)

### List Test Results
**Endpoint:** `GET /test-results/`

**Filter Parameters:** `connection`, `is_successful`

**Response fields:** `id`, `connection`, `connection_name`, `is_successful`, `response_time_ms`, `error_message`, `details`, `tested_at`

---

## Connection History (Read-Only)

### List History
**Endpoint:** `GET /history/`

**Filter Parameters:** `connection`, `action`, `status`

**Ordering:** `-performed_at` (default)

**Response fields:** `id`, `connection`, `connection_name`, `action`, `status`, `details`, `error_message`, `performed_by`, `performed_by_email`, `performed_at`, `duration_ms`

---

## Supported Database Types

| Type | Default Port |
|------|-------------|
| `postgresql` | 5432 |
| `mysql` | 3306 |
| `mongodb` | 27017 |
| `clickhouse` | 8123 (HTTP), 9000 (native) |

---

## Database-Specific Options

### PostgreSQL
```json
{
  "ssl": true,
  "ssl_mode": "require",
  "client_encoding": "UTF8",
  "timezone": "UTC"
}
```

### MySQL
```json
{
  "charset": "utf8mb4",
  "ssl": true,
  "ssl_ca": "/path/to/ca.pem"
}
```

### MongoDB
```json
{
  "replica_set": "rs0",
  "auth_source": "admin",
  "ssl": true,
  "tls_insecure": false
}
```

### ClickHouse
```json
{
  "secure": true,
  "verify": true,
  "compress": true,
  "sync": false
}
```

---

## Error Codes

| Code | Description |
|------|-------------|
| 400 | Bad request – missing or invalid fields |
| 403 | Forbidden – not the owner or admin |
| 404 | Not found – connection doesn't exist |
| 500 | Internal server error – connector error during test/schema fetch |