# Design Decisions Documentation

## 1. Framework Selection

### Frontend: Next.js 14 vs. Create React App
**Decision:** Next.js with App Router

**Rationale:**
- Server-side rendering for better SEO
- File-based routing simplifies navigation
- Automatic code splitting reduces bundle size
- Built-in image optimization
- Excellent TypeScript support
- Active ecosystem and long-term support

### Backend: Django vs. Flask / FastAPI
**Decision:** Django REST Framework

**Rationale:**
- Built-in admin interface for debugging and operations
- Robust ORM with multi-database support
- Comprehensive security features out of the box
- Mature ecosystem (django-filter, drf-yasg, simplejwt, storages)
- Built-in authentication system

---

## 2. Database Strategy

### Multiple Database Support
**Decision:** Support PostgreSQL, MySQL, MongoDB, ClickHouse as extraction sources

**Rationale:**
- Each database serves different enterprise use cases
- PostgreSQL: primary application database (ACID compliance)
- MySQL: legacy system compatibility
- MongoDB: document storage with flexible schemas
- ClickHouse: analytics and time-series data

### Connection Management
**Decision:** Store connection credentials encrypted at rest using Fernet encryption

**Rationale:**
- Security compliance requirements
- Credentials never exposed to non-owning users in API responses
- `password` field is write-only in all serializers

### Connector Registry Pattern
**Decision:** `ConnectorRegistry` with auto-registration via `AppConfig.ready()`

**Rationale:**
- Decouples connector implementations from the core application
- New database types can be added by registering a class without modifying views
- `ConnectionsConfig` in `INSTALLED_APPS` ensures registration runs exactly once on startup

---

## 3. State Management

### Zustand vs. Redux
**Decision:** Zustand for global state management

**Rationale:**
- Simpler API with significantly less boilerplate
- Better TypeScript support
- Smaller bundle size
- No need for Provider wrappers
- Built-in persistence middleware

### Context API for Authentication
**Decision:** React Context API for auth state (`AuthContext`)

**Rationale:**
- Auth state is simple and hierarchical
- Avoids unnecessary re-renders compared to Redux for this use case
- Simpler integration with Next.js App Router

---

## 4. Real-time Updates

### Polling vs. WebSockets
**Decision:** HTTP polling for extraction progress

**Rationale:**
- Simpler implementation with no infrastructure changes
- Works with any load balancer configuration
- Easier to debug
- Sufficient for current usage patterns (extraction jobs take seconds to minutes)

**Future:** WebSockets for real-time collaboration and sub-second progress updates.

---

## 5. Data Grid Implementation

### Custom Grid vs. Third-Party Library
**Decision:** Build a custom editable grid

**Rationale:**
- Full control over editing behavior and validation display
- Performance optimizations for large datasets (virtual scrolling)
- No licensing costs
- Tailored to the platform's specific data editing workflow
- Avoids large bundle size from feature-heavy third-party grids

### Virtual Scrolling
**Decision:** Implement virtual scrolling for large datasets

**Rationale:**
- Handles 10,000+ rows without DOM performance degradation
- Reduces active DOM nodes significantly
- Smoother scrolling and lower memory usage

---

## 6. File Storage

### Local vs. Cloud Storage
**Decision:** Local filesystem with `django-storages` S3 support

**Rationale:**
- Simpler development and demo environment setup
- `django-storages` allows switching to S3 with a configuration change
- Cost-effective for initial deployment
- File metadata (path, hash, size, expiry) tracked in the `FileExport` model regardless of backend

---

## 7. Authentication

### JWT vs. Session-Based
**Decision:** JWT with refresh tokens and blacklisting

**Rationale:**
- Stateless authentication scales across multiple web servers
- Works with mobile clients and the Next.js frontend without cookie concerns
- Short-lived access tokens (1 hour) reduce exposure window
- Refresh token rotation with blacklisting (`BLACKLIST_AFTER_ROTATION`) prevents token reuse after logout

**Token storage:** `localStorage` on the frontend, accessed via the Axios interceptor in `frontend/src/lib/api/client.ts`.

---

## 8. API Design

### REST vs. GraphQL
**Decision:** REST with Django REST Framework

**Rationale:**
- Simpler to implement, debug, and document
- Better HTTP caching support
- DRF provides excellent tooling (browsable API, drf-yasg, filtering, pagination)
- Team familiarity

### Versioning Strategy
**Decision:** URL-based versioning (`/api/v1/` — currently implicit as `/api/`)

**Rationale:**
- Clear and explicit in URLs
- Easy to run multiple versions simultaneously
- Compatible with reverse proxy routing

### Pagination
**Decision:** Custom pagination class (`core.pagination.CustomPagination`) with a default page size of 100

**Rationale:**
- All list endpoints paginated to prevent unbounded queries
- Consistent envelope format (`count`, `next`, `previous`, `results`) across all endpoints

---

## 9. Permission Model

### Decision: Custom DRF permission classes in `core/permissions.py`

**Classes:** `IsAuthenticated`, `IsAdmin`, `IsOwnerOrAdmin`, `IsOwner`, `CanAccessFile`, `IsAdminOrReadOnly`

**Rationale:**
- Fine-grained, reusable permission logic
- Object-level permissions with ownership traversal (supports nested ownership through `dataset.created_by` and `job.created_by`)
- Clear separation of concerns — permission logic is not mixed into views

---

## 10. Testing Strategy

### Test Pyramid
- Unit tests: 70% coverage target
- Integration tests: core workflows (extraction, storage, auth)
- E2E tests: critical user journeys

### Testing Tools
- Frontend: Jest + React Testing Library
- Backend: Django test framework
- E2E: Cypress
- Load testing: Locust

---

## 11. Deployment Strategy

### Containerization
**Decision:** Docker for all services, Docker Compose for local and staging orchestration

**Rationale:**
- Consistent environments from development to production
- All six service types (postgres, mysql, mongodb, clickhouse, redis, app) run in the same network
- Simplified dependency management and onboarding

### CI/CD Pipeline
- Automatic test runs on PRs
- Staging deployment on merge to main
- Production deployment on version tags

---

## 12. Error Handling

### Frontend
- Global error boundary for unexpected crashes
- Toast notifications (`react-hot-toast`) for user-facing errors
- Axios interceptor handles `401` with automatic token refresh
- Error logging to Sentry

### Backend
- Structured error responses (consistent JSON shape)
- Custom exception handler (`core.exceptions.custom_exception_handler`)
- Audit logging for errors via Django's logging framework
- Connection test results and history stored for all test attempts

---

## 13. Performance Targets

| Metric | Target |
|--------|--------|
| Page load | < 2 seconds |
| API response (p95) | < 500ms |
| Extraction throughput | 10,000 rows/sec |
| Data grid render | < 100ms |

---

## 14. Accessibility

- Target: WCAG 2.1 AA
- Keyboard navigation support
- Screen reader compatibility
- Sufficient color contrast
- Visible focus indicators

---

## 15. Mobile Support

- Mobile-first responsive design
- Responsive tables collapse to card layout on small screens
- Touch-friendly interactions
- Collapsible sidebar navigation

---

## 16. Internationalization

- English as primary language
- i18n library integration for future translations
- Date/time localization support
- Number formatting by locale