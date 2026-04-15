# System Architecture Documentation

## Overview

The Data Connector Platform is a full-stack application for enterprise data extraction and management. It provides a unified interface for connecting to multiple database types, extracting data in configurable batches, editing data in a grid interface, and exporting results to JSON or CSV.

---

## Technology Stack

### Frontend
- **Framework:** Next.js 14 (App Router)
- **UI Library:** React Bootstrap 5
- **State Management:** Zustand + React Context API
- **HTTP Client:** Axios with request/response interceptors
- **Data Grid:** Custom grid with inline editing
- **Charts:** Chart.js + React-ChartJS-2
- **Forms:** React Hook Form

### Backend
- **Framework:** Django 4.2 + Django REST Framework 3.14
- **Primary Database:** PostgreSQL 15
- **Source Databases (extraction targets):** PostgreSQL, MySQL 8, MongoDB 7, ClickHouse 23.8
- **Authentication:** JWT via `djangorestframework-simplejwt`
- **Task Queue:** Celery + Redis
- **Caching:** Redis (separate DB from Celery broker)
- **File Storage:** Local filesystem (`/media/exports/`) with S3-compatible backend support via `django-storages`
- **API Documentation:** drf-yasg (Swagger UI at `/api/docs/`, ReDoc at `/api/redoc/`)

### Infrastructure
- **Containerization:** Docker + Docker Compose
- **Services:** postgres, mysql, mongodb, clickhouse, redis, backend, celery, celery-beat, frontend
- **Reverse Proxy:** Nginx (production)
- **CI/CD:** GitHub Actions / GitLab CI
- **Monitoring:** Prometheus + Grafana
- **Logging:** ELK Stack + Django structured logging (rotating files)

---

## URL Structure

All API routes are versioned under `/api/`:

| Prefix | App | Description |
|--------|-----|-------------|
| `/api/auth/` | `accounts` | Authentication, user management |
| `/api/token/` | simplejwt | Token obtain, refresh, verify |
| `/api/connections/` | `connections` | Database connection management |
| `/api/extraction/` | `extraction` | Extraction job management |
| `/api/grid/` | `data_grid` | Dataset and row editing |
| `/api/storage/` | `storage` | File export management |
| `/api/dashboard/` | `dashboard` | Aggregated stats for the UI |
| `/api/docs/` | drf-yasg | Swagger UI |
| `/api/redoc/` | drf-yasg | ReDoc UI |

---

## Data Flow

### Authentication Flow
1. User POSTs credentials to `/api/auth/login/`
2. Django validates credentials and returns JWT `access` + `refresh` tokens
3. Frontend stores tokens in `localStorage`
4. Subsequent API requests include `Authorization: Bearer <access>` header
5. Axios interceptor automatically refreshes the access token on `401` responses
6. On logout, the refresh token is blacklisted server-side

### Extraction Flow
1. User selects a database connection and table (or provides a custom query)
2. Frontend POSTs to `/api/extraction/jobs/` to create a job (status: `pending`)
3. User POSTs to `/api/extraction/jobs/{id}/start/` to begin
4. Backend creates Celery task; extraction runs in batches (default 1,000 rows/batch)
5. Frontend polls `/api/extraction/jobs/{id}/progress/` for status updates
6. Extracted rows are stored in `DataSet` / `DataRow` models and `StoredRecord`
7. User edits data in the Grid UI (`/api/grid/`)
8. User exports via `/api/storage/exports/`

### Storage Flow
1. User POSTs to `/api/storage/exports/` with job ID and format
2. Backend generates the file (JSON or CSV), stores it in `/media/exports/`
3. File metadata (path, hash, size) is saved to `FileExport`
4. User downloads via `/api/storage/exports/{id}/download/`
5. Files can optionally be made public or shared with specific users
6. Files can have an expiry date; expired files are cleaned up via `/api/storage/exports/cleanup/`

---

## Permission Model

Three user roles are enforced through custom DRF permission classes in `core/permissions.py`:

| Class | Description |
|-------|-------------|
| `IsAuthenticated` | Standard auth check with custom error message |
| `IsAdmin` | Restricts to `is_admin = True` users |
| `IsOwnerOrAdmin` | Object-level: owner (`created_by`) or admin |
| `IsOwner` | Object-level: owner only |
| `CanAccessFile` | File-level: owner, admin, or `is_public = True` |
| `IsAdminOrReadOnly` | Safe methods for all authenticated users; writes for admins only |

Ownership traversal is supported — `IsOwnerOrAdmin` checks `created_by`, `owner`, `user`, and nested `dataset.created_by` / `job.created_by` relationships.

---

## Database Connector Registry

Database connectors are registered via `ConnectorRegistry` in `apps/connections/connectors/registry.py`. The `ConnectionsConfig.ready()` hook ensures connectors are registered on app startup (configured via `'apps.connections.apps.ConnectionsConfig'` in `INSTALLED_APPS`).

Supported connectors: `postgresql`, `mysql`, `mongodb`, `clickhouse`.

Each connector implements: `test_connection()`, `get_schemas()`, `get_tables(schema)`, `get_table_schema(table, schema)`, `execute_query(query)`, `get_paginated_data(collection, offset, limit)`.

---

## Security

### Authentication & Authorization
- JWT access tokens with 1-hour expiration
- Refresh tokens with 7-day expiration, rotation enabled, and blacklisting after rotation
- Role-based access control (admin vs. regular user)
- Password hashing via Django's bcrypt-compatible validators

### Data Protection
- Database connection passwords encrypted at rest using Fernet encryption
- Passwords are write-only — never returned in API responses to non-owners
- HTTPS for all production communications
- CORS restricted to specific origins (`localhost:3000` in development)
- SQL injection prevention via Django ORM and query sanitization

### Audit & Logging
- All connection test attempts recorded in `ConnectionHistory`
- File access tracked in `FileExport` model
- Audit middleware (`core.middleware.audit_middleware.AuditMiddleware`) logs all requests
- Application logs rotate at 10 MB with 5 backups

---

## Performance

### Frontend
- Code splitting and lazy loading via Next.js App Router
- Virtual scrolling for large data grids (10,000+ rows)
- Debounced search inputs
- React Query for server-state caching

### Backend
- PostgreSQL connection pooling (`CONN_MAX_AGE: 60`)
- Batch processing for large datasets (configurable `BATCH_SIZE_DEFAULT`, `BATCH_SIZE_MAX`)
- Redis caching (`django-redis`) for frequently accessed data
- Pagination on all list endpoints (default page size: 100)
- DRF throttling: 100/day (anonymous), 1,000/day (authenticated), 100/hour (extraction)

---

## Scalability

- Horizontal scaling for web servers (stateless JWT auth)
- Celery workers for background extraction tasks (scalable independently)
- `celery-beat` with `DatabaseScheduler` for scheduled tasks
- Redis as both Celery broker (`redis://redis:6379/0`) and cache (`redis://redis:6379/1`)
- Read replicas for database queries (future)
- CDN for static files (future)

---

## Monitoring & Observability

- Application performance monitoring (Prometheus + Grafana)
- Error tracking with Sentry
- Health check endpoints per service (Docker healthchecks for postgres, redis, mysql, mongodb, clickhouse)
- Django structured logging to rotating files and console
- Custom business metrics via `DashboardStatsView`

---

## Disaster Recovery

- Automated PostgreSQL backups (daily)
- Point-in-time recovery via PostgreSQL WAL
- Docker named volumes for persistent data (postgres, mysql, mongodb, clickhouse, redis, storage)
- Multi-region replication (planned)

---

## Future Enhancements

1. Real-time extraction progress via WebSockets (replacing polling)
2. Machine learning for data validation
3. Data lineage tracking
4. Custom transformation pipelines
5. Scheduled extractions
6. Webhook notifications on job completion
7. Multi-region deployment