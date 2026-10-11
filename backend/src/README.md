# Baadi Goob Backend — Architecture Navigation Guide

Welcome to the Baadi Goob backend architecture guide! This document maps out the backend codebase in the exact logical order of how HTTP requests are processed.

---

## 1. Request Processing Order

Use this list to navigate the codebase in the order a request travels through the system:

### 1. `routes/auth.routes.ts`
- **Responsibility:** Defines API endpoints and connects incoming HTTP URLs and methods to their respective controller functions.

### 2. `controllers/auth.controller.ts`
- **Responsibility:** Receives HTTP requests, triggers input validation, passes data to the service layer, and returns the appropriate HTTP status code and JSON response.

### 3. `services/auth.service.ts`
- **Responsibility:** Executes the core business logic, including checking for duplicate emails, hashing passwords with bcrypt, and creating users in the database.

### 4. `validations/auth.validation.ts`
- **Responsibility:** Defines Zod schemas that validate the format, length, and allowed values of incoming request data before any processing occurs.

### 5. `middleware/errorHandler.ts`
- **Responsibility:** Intercepts operational errors and unhandled exceptions globally to return consistent, secure JSON error responses without leaking server secrets.

### 6. `lib/prisma.ts`
- **Responsibility:** Provides the shared Prisma database client singleton with hot-reload caching to prevent multiple database connections during development.

### 7. `common/jwt.ts` and `common/roleCheck.ts`
- **`common/jwt.ts`:** Generates and verifies JSON Web Tokens with typed payload validation and secure expiration defaults.
- **`common/roleCheck.ts`:** Provides role-based access control helpers to protect endpoints based on user permissions.

---

## 2. Request Flow: User Registration Example

Here is how a `POST /api/v1/auth/register` request moves through the layers:

```
[Client Request]
       │
       ▼
1. routes/auth.routes.ts ─────────▶ Maps POST /register to the register controller
       │
       ▼
2. controllers/auth.controller.ts ──▶ Validates req.body using validations/auth.validation.ts
       │
       ├─ (If invalid) ───────────▶ Returns 400 Bad Request with { error: "..." }
       ▼
3. services/auth.service.ts ──────▶ Checks duplicate email & hashes password via bcryptjs
       │
       ▼
4. lib/prisma.ts ─────────────────▶ Saves user to MySQL via PrismaClient
       │
       ├─ (If duplicate / conflict)▶ Throws AppError(409) -> Caught by middleware/errorHandler.ts
       ▼
[Response to Client] ◀──────────── Returns 201 Created with safe user data (no passwords)
```

---

## 3. Root Application Files

- **`app.ts`:** Configures Express security middleware (Helmet, CORS), parses JSON bodies, and mounts route handlers.
- **`server.ts`:** Loads environment variables, starts the HTTP server on the configured port, and handles graceful shutdowns.
