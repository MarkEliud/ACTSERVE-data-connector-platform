# Authentication API Documentation

## Base URL
`https://api.dataconnector.com/api/`

---

## Endpoints

### Login
Authenticate user and obtain JWT tokens.

**Endpoint:** `POST /auth/login/`

**Permissions:** Public (no authentication required)

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

**Response (200 OK):**
```json
{
  "access": "eyJhbGciOiJIUzI1NiIs...",
  "refresh": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": 1,
    "username": "john_doe",
    "email": "user@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "is_admin": false,
    "is_active": true,
    "date_joined": "2024-01-01T00:00:00Z"
  }
}
```

**Error Responses:**
- `400 Bad Request` – Missing or invalid fields
- `401 Unauthorized` – Invalid credentials (wrong email/password)
- `401 Unauthorized` – User account is disabled

---

### Register
Create a new user account.

**Endpoint:** `POST /auth/register/`

**Permissions:** Public (no authentication required)

**Request Body:**
```json
{
  "username": "newuser",
  "email": "newuser@example.com",
  "password": "securepassword",
  "password2": "securepassword",
  "first_name": "New",
  "last_name": "User"
}
```

**Response (201 Created):**
```json
{
  "user": {
    "id": 2,
    "username": "newuser",
    "email": "newuser@example.com",
    "first_name": "New",
    "last_name": "User",
    "is_admin": false,
    "is_active": true,
    "date_joined": "2024-01-01T00:00:00Z"
  },
  "access": "eyJhbGciOiJIUzI1NiIs...",
  "refresh": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Notes:**
- `password` and `password2` must match
- Password is validated against Django's password validators (minimum 8 characters, not too common, not entirely numeric)

---

### Refresh Token
Obtain a new access token using a refresh token.

**Endpoint:** `POST /token/refresh/`  
*(Also available at `POST /auth/token/refresh/`)*

**Permissions:** Public

**Request Body:**
```json
{
  "refresh": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response (200 OK):**
```json
{
  "access": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Notes:**
- Access tokens expire after **1 hour**
- Refresh tokens expire after **7 days**
- `ROTATE_REFRESH_TOKENS` is enabled — each refresh call issues a new refresh token and blacklists the old one

---

### Verify Token
Verify that a token is valid.

**Endpoint:** `POST /token/verify/`

**Permissions:** Public

**Request Body:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response (200 OK):** Empty body on success.

**Error:** `401 Unauthorized` if token is invalid or expired.

---

### Get Current User
Retrieve the currently authenticated user's details.

**Endpoint:** `GET /auth/me/`

**Permissions:** Authenticated

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200 OK):**
```json
{
  "id": 1,
  "username": "john_doe",
  "email": "user@example.com",
  "first_name": "John",
  "last_name": "Doe",
  "is_admin": false,
  "is_active": true,
  "date_joined": "2024-01-01T00:00:00Z"
}
```

This endpoint also accepts `PATCH` / `PUT` to update user details (same auth requirement).

---

### Change Password
Change the authenticated user's password.

**Endpoint:** `POST /auth/change-password/`

**Permissions:** Authenticated

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "old_password": "currentpassword",
  "new_password": "newsecurepassword"
}
```

**Response (200 OK):**
```json
{
  "message": "Password updated successfully"
}
```

**Error Responses:**
- `400 Bad Request` – Old password is incorrect

---

### Logout
Blacklist the refresh token, invalidating the session.

**Endpoint:** `POST /auth/logout/`

**Permissions:** Authenticated

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "refresh": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response (200 OK):**
```json
{
  "message": "Successfully logged out"
}
```

---

## User Management (Admin Only)

The following endpoints are restricted to admin users.

### List Users
**Endpoint:** `GET /auth/users/`  
**Permissions:** Admin only

Returns a paginated list of all users.

### Create User
**Endpoint:** `POST /auth/users/`  
**Permissions:** Admin only

### Get / Update / Delete User
**Endpoint:** `GET|PUT|PATCH|DELETE /auth/users/{id}/`  
**Permissions:** Admin (write); Authenticated (own record, read only)

### Set User Role
**Endpoint:** `POST /auth/users/{id}/set_role/`  
**Permissions:** Admin only

**Request Body:**
```json
{
  "role": "admin"
}
```

Valid roles: `admin`, `user`

**Response (200 OK):**
```json
{
  "status": "role updated"
}
```

---

## Authentication Flow

1. **Login** – POST credentials to `/auth/login/`, receive `access` and `refresh` tokens
2. **API Calls** – Include access token in `Authorization: Bearer <token>` header
3. **Token Expiry** – Access tokens expire after 1 hour; refresh tokens after 7 days
4. **Refresh** – POST refresh token to `/token/refresh/` for a new access token
5. **Logout** – POST refresh token to `/auth/logout/` to blacklist the session

The frontend API client (`frontend/src/lib/api/client.ts`) handles token refresh automatically via an Axios response interceptor. On a `401` response, it attempts a refresh before retrying the original request. If the refresh fails, tokens are cleared and the user is redirected to `/login`.

---

## Token Configuration

| Setting | Value |
|---------|-------|
| Algorithm | HS256 |
| Access token lifetime | 1 hour |
| Refresh token lifetime | 7 days |
| Rotate refresh tokens | Yes |
| Blacklist after rotation | Yes |
| Auth header | `Authorization: Bearer <token>` |

---

## Error Codes

| Code | Description |
|------|-------------|
| 400 | Bad request – missing or invalid fields |
| 401 | Unauthorized – invalid or expired token / wrong credentials |
| 403 | Forbidden – insufficient permissions (e.g. non-admin accessing admin endpoint) |
| 404 | Not found – user doesn't exist |
| 429 | Too many requests – rate limit exceeded (1000/day for authenticated users) |
| 500 | Internal server error |