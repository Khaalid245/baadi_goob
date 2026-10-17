# Baadi Goob (Furan) Backend — Technical Handover Document

**Version**: 1.0  
**Repository Branch**: `main`  
**Latest Merge Commit**: `ba88c8cbb17e42dbb9948b9a6ccfc08af6ed9f28`  
**Date**: October 2026  
**Document Status**: Official Backend Technical Handover  

---

## Table of Contents
1. [Project Purpose and Scope](#1-project-purpose-and-scope)
2. [System Architecture and Request Flow](#2-system-architecture-and-request-flow)
3. [Actual Technology Stack and Verified Versions](#3-actual-technology-stack-and-verified-versions)
4. [Repository Structure and Important Files](#4-repository-structure-and-important-files)
5. [Backend Architecture](#5-backend-architecture)
6. [Database Models, Enums, Constraints, and Migrations](#6-database-models-enums-constraints-and-migrations)
7. [Authentication, Authorization, and Account Lifecycles](#7-authentication-authorization-and-account-lifecycles)
8. [API Overview and OpenAPI Contract Review](#8-api-overview-and-openapi-contract-review)
9. [Core Business Workflows](#9-core-business-workflows)
10. [Testing, Quality Assurance, and CI Pipeline](#10-testing-quality-assurance-and-ci-pipeline)
11. [Local Development and Deployment Overview](#11-local-development-and-deployment-overview)
12. [Security and Privacy Controls](#12-security-and-privacy-controls)
13. [Known Limitations, Operational Risks, and Recommended Future Work](#13-known-limitations-operational-risks-and-recommended-future-work)
14. [Git Workflow and Maintenance Checklist](#14-git-workflow-and-maintenance-checklist)

---

## 1. Project Purpose and Scope

### 1.1 Purpose
**Furan** (internally referenced as **Baadi Goob**) is a two-sided talent and opportunity web platform designed to bridge the gap between Somali university students / young professionals and organizations offering entry-level employment. It provides students with a structured way to showcase verified skills and projects, while enabling businesses, startups, and public institutions to discover, assess, and recruit qualified talent through internships, jobs, and competitive skill challenges.

### 1.2 Implemented Scope (MVP)
The backend service currently implements all core functionality required by the **Furan MVP SRS v1.2**:
- **Identity & Access Management**: Multi-role registration (Student, Business, Admin), secure authentication, session management, rate-limited login, and password reset.
- **Student Profile Management**: Profiles capturing educational background, structured skill tags, and external project links.
- **Opportunity Management**: Creation, editing, closing, deletion, filtering, and MySQL fulltext keyword search across internships, jobs, and competitions.
- **Application Workflow**: Profile-backed application submission, duplicate prevention, and applicant status tracking (`NEW`, `SHORTLISTED`, `REJECTED`, `HIRED`).
- **Competition Registrations**: Registration flow for competition opportunities and registrant roster management.
- **Platform Moderation & Administration**: Business account verification workflows, full user account listing, and account suspension/reactivation.
- **Role-Based Dashboards**: Real-time aggregated summaries tailored to each authenticated role (FR-022).
- **Privacy & Data Retention**: Account self-deletion with personal data anonymization and 12-month retention of historical application and competition records (FR-020).

### 1.3 Excluded Scope (Post-MVP Roadmap)
As defined in Section 1.3 of the SRS, the following features are intentionally out of scope for the MVP:
- Mobile money or payment gateway integration (e.g., EVC Plus, Dahabshiil) for paid competitions or sponsored job postings.
- Automated AI-based skill matching or algorithmic candidate recommendations.
- Native mobile applications (iOS/Android); the MVP target is a responsive web application.
- Real-time in-app chat or direct messaging between students and businesses.

---

## 2. System Architecture and Request Flow

The system employs a multi-tier, decoupled architecture comprising a single-page application frontend, a Node.js/Express REST API backend, and a relational MySQL database managed via Prisma ORM.

```
                     ┌────────────────────────────────────────┐
                     │            Client Layer                │
                     │    React 18 / Vite / Tailwind SPA      │
                     └───────────────────┬────────────────────┘
                                         │ HTTP REST (JSON)
                                         ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              Express 5.x API Gateway                                │
│                                                                                     │
│  [Helmet Security Headers] ──▶ [CORS] ──▶ [express.json()] ──▶ [Pino HTTP Logger]    │
│                                                                        │            │
│  ┌─────────────────────────────────────────────────────────────────────┘            │
│  ▼                                                                                  │
│ [Route Matcher (/api/v1/*)]                                                         │
│        │                                                                            │
│        ▼                                                                            │
│ [IP Rate Limiter] (Login & Password-Reset endpoints)                                │
│        │                                                                            │
│        ▼                                                                            │
│ [auth.middleware.ts] (Verify Bearer JWT & Check UserStatus != SUSPENDED / DELETED)   │
│        │                                                                            │
│        ▼                                                                            │
│ [roleCheck.ts] (Verify Role: STUDENT | BUSINESS | ADMIN)                            │
│        │                                                                            │
│        ▼                                                                            │
│ [requireVerifiedBusiness.middleware.ts] (Enforce VerificationStatus == VERIFIED)    │
│        │                                                                            │
│        ▼                                                                            │
│ [Controller Layer] (Input extraction & Zod Schema Validation)                       │
│        │                                                                            │
│        ▼                                                                            │
│ [Service Layer] (Business logic, domain invariants, Prisma transactions)            │
│        │                                                                            │
│        ▼                                                                            │
│ [Prisma Client ORM] ──▶ MySQL 8.0 Database (Tables, Indexes, Foreign Keys)          │
│        │                                                                            │
│        ▼                                                                            │
│ [Centralized Error Handler] (Catches AppError, hides internal stack traces on 500)  │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

### Request Flow Lifecycle:
1. **Ingress & Security**: Requests enter via Express. `helmet` applies security headers; `cors` attaches cross-origin headers; `express.json()` parses payloads; `pino-http` attaches structured request logging.
2. **Rate Limiting**: Brute-force protection middleware intercepts sensitive routes (`/auth/login`, `/auth/password-reset`) before expensive operations.
3. **Authentication**: `auth.middleware.ts` extracts the Bearer token, verifies signature and claims via `jwt.ts`, checks existence in MySQL via Prisma, and rejects `SUSPENDED` (403) or `DELETED` (401) accounts immediately.
4. **Authorization (RBAC)**: `roleCheck.ts` evaluates the authenticated user's role against route permissions. For opportunity creation, `requireVerifiedBusiness` verifies business approval.
5. **Validation**: Controllers execute Zod schemas (`.strict()`) to reject malformed input, invalid types, or unexpected payload keys with HTTP 400.
6. **Execution & Persistence**: Services handle business rules and execute database operations within `prisma.$transaction` where multi-table atomicity is required.
7. **Error Interception**: Operational errors (`AppError`) pass through `next(error)` to `errorHandler.ts`, returning uniform `{ "error": "message" }` responses while suppressing server stack traces on internal 500 errors.

---

## 3. Actual Technology Stack and Verified Versions

All dependencies and tools were verified directly from [`backend/package.json`](../backend/package.json) and lockfiles:

| Domain | Technology / Package | Verified Version | Implementation Purpose |
| :--- | :--- | :--- | :--- |
| **Language** | TypeScript | `5.9.3` | Strongly-typed JavaScript compiling to CommonJS (ES2022 target). |
| **Runtime** | Node.js | `>=20.0.0` | Server runtime (Node 20 Alpine used in production Docker image). |
| **Framework** | Express | `5.2.1` | HTTP web application framework with native async handler error support. |
| **ORM** | Prisma | `5.22.0` | Schema management, type-safe queries, migrations, and database client. |
| **Database** | MySQL | `8.0` | Relational storage with UTF8MB4 encoding and fulltext search indexing. |
| **Authentication** | jsonwebtoken | `9.0.3` | HMAC SHA-256 JWT generation and validation. |
| **Cryptography** | bcryptjs | `3.0.3` | Salted password hashing (work factor 10). |
| **Validation** | Zod | `4.6.5` | Strict schema validation for request bodies, query params, and route UUIDs. |
| **Security Headers** | Helmet | `8.3.0` | Hardens HTTP response headers against common web vulnerabilities. |
| **CORS** | cors | `2.8.6` | Cross-Origin Resource Sharing handling. |
| **Rate Limiting** | express-rate-limit | `8.7.1` | In-memory IP-based rate limiting on sensitive authentication routes. |
| **Logging** | Pino & Pino-HTTP | `10.4.0` / `11.0.0` | Low-overhead structured JSON logging (silent during automated tests). |
| **Documentation** | Swagger UI Express / YAMLJS | `5.0.1` / `0.3.0` | Renders OpenAPI specification at `/api/docs`. |
| **Testing** | Jest, ts-jest, Supertest | `30.5.2` / `29.4.14` / `7.3.1` | Integration test runner and HTTP assertions. |
| **Linting** | ESLint & typescript-eslint | `10.12.0` / `8.71.1` | Static code analysis and code hygiene rules. |
| **Execution** | tsx | `4.23.15` | TypeScript hot-reloading dev runner and database seeding runner. |

### Technology Status: Code vs. Documentation
- **Django & PostgreSQL**: Replaced by Node.js/Express & MySQL in SRS v1.2; no Python or PostgreSQL code exists in the repository.
- **Token Lifespan & Refresh Tokens**: Login returns a single signed JWT access token with a fixed 15-minute default expiration (`15m`). No refresh tokens or token rotation mechanisms are implemented in the MVP.
- **External Email Delivery**: In-database notification records and password reset token hashes are created, but third-party outbound email transport (SMTP/SES) is not yet wired to a live provider.

---

## 4. Repository Structure and Important Files

```
baadi_goob/
├── .github/
│   └── workflows/
│       └── ci.yml                 # Automated CI workflow (lint, typecheck, test, build)
├── backend/
│   ├── Dockerfile                 # Alpine-based production container build
│   ├── package.json               # Backend dependency definitions and scripts
│   ├── tsconfig.json              # TypeScript compiler configuration (ES2022/CommonJS)
│   ├── eslint.config.mjs          # ESLint flat configuration
│   ├── jest.config.js             # Jest test runner configuration using ts-jest
│   ├── prisma/
│   │   ├── schema.prisma          # Database schema and generator definition
│   │   ├── seed.ts                # Database seeder creating initial administrator account
│   │   └── migrations/            # Chronological MySQL migrations and lockfile
│   ├── src/
│   │   ├── server.ts              # HTTP listener and process termination handlers
│   │   ├── app.ts                 # Express application configuration and middleware stack
│   │   ├── common/                # Shared utilities (jwt.ts)
│   │   ├── controllers/           # HTTP controllers for all domain entities
│   │   ├── lib/                   # Global PrismaClient singleton (prisma.ts)
│   │   ├── middleware/            # Auth, RBAC, business verification, rate limiting, errors
│   │   ├── routes/                # Express router mounts
│   │   ├── services/              # Business logic, database interactions, transactions
│   │   ├── types/                 # Express Request augmentation (express.ts)
│   │   └── validations/           # Zod input validation schemas
│   └── tests/                     # 13 Jest integration test suites
├── docs/
│   ├── openapi.yaml               # OpenAPI 3.0 API specification
│   ├── Furan_SRS_v1_2.docx        # Furan Software Requirements Specification (Word)
│   └── TECHNICAL_HANDOVER.md      # This document
├── frontend/                      # React 18 / Vite / Tailwind client application
├── docker-compose.yml             # Local & staging Docker Compose service composition
├── .env.example                   # Baseline environment variable template
└── README.md                      # Project introduction and quickstart guide
```

---

## 5. Backend Architecture

### 5.1 Routers (`src/routes/`)
Routes define URL paths, HTTP methods, and attach relevant middleware:
- [`auth.routes.ts`](../backend/src/routes/auth.routes.ts): Registration, login, current user lookup, password reset.
- [`student.routes.ts`](../backend/src/routes/student.routes.ts): Student profile retrieval/updates and personal application history.
- [`business.routes.ts`](../backend/src/routes/business.routes.ts): Business profile retrieval and company name updates.
- [`opportunity.routes.ts`](../backend/src/routes/opportunity.routes.ts): Opportunity CRUD, closing, applications submission/listing, and competition registration.
- [`application.routes.ts`](../backend/src/routes/application.routes.ts): Employer candidate status transitions (`PATCH /applications/:id/status`).
- [`admin.routes.ts`](../backend/src/routes/admin.routes.ts): Business verification listing/actions, platform user listing, and account suspension.
- [`dashboard.routes.ts`](../backend/src/routes/dashboard.routes.ts): Multi-role dashboard metrics aggregation (FR-022).
- [`user.routes.ts`](../backend/src/routes/user.routes.ts): Authenticated user account self-deletion (FR-020).

### 5.2 Controllers (`src/controllers/`)
Controllers remain thin; they unpack HTTP parameters, invoke Zod validation schemas, call domain services, and return status codes:
- Return HTTP 200/201 on success.
- Delegate application errors to `next(error)` for centralized formatting.
- Guard sensitive response fields (passwords, hashes, and internal tokens are never passed back).

### 5.3 Services (`src/services/`)
Services contain core business rules and handle all Prisma queries:
- **Atomicity**: Critical state updates (e.g., verifying a business and dispatching a notification, updating application status, or deleting an account) run inside `prisma.$transaction(async (tx) => { ... })`.
- **Authorization Enforcement**: Domain checks verify resource ownership before mutations (e.g., verifying `opportunity.posted_by === req.user.id`).

### 5.4 Validations (`src/validations/`)
All input schemas use **Zod** with `.strict()`:
- Strip and reject unknown attributes to prevent parameter tampering.
- Enforce UUID formatting on route parameters (`z.string().uuid()`).
- Handle case-insensitive enum parsing via `z.preprocess()`.

### 5.5 Middleware (`src/middleware/`)
- **`authenticate`**: Parses `Authorization: Bearer <token>`, validates token signature, queries the database for active user state, and attaches `{ id, email, role }` to `req.user`. Rejects missing, invalid, expired, suspended, or deleted users.
- **`roleCheck`**: Higher-order middleware taking an array of allowed `Role` enums. Returns HTTP 403 if `req.user.role` is unauthorized.
- **`requireVerifiedBusiness`**: Queries `BusinessProfile` and ensures `verification_status === VerificationStatus.VERIFIED` before permitting opportunity creation.
- **`rateLimiter`**: Configured via `express-rate-limit` to protect sensitive authentication endpoints:
  - **Login Rate Limiter** (`POST /api/v1/auth/login`): Enforces a production default of **10 requests per 15-minute window per IP**.
  - **Password Reset Rate Limiter** (`POST /api/v1/auth/password-reset`): Enforces a production default of **5 requests per 15-minute window per IP**.
  - **Test Environment Override**: When `NODE_ENV === "test"`, limiters default to **100 requests per 15-minute window** (overridable via `LOGIN_RATE_LIMIT_MAX` and `PASSWORD_RESET_RATE_LIMIT_MAX` environment variables) to prevent integration test flakiness.
  - **Limiter Factories**: Factory functions `createLoginRateLimiter` and `createPasswordResetRateLimiter` allow instantiating isolated limiter instances for custom configuration and testing.
- **`errorHandler` & `notFoundHandler`**: Centralized error capture preventing stack trace leaks on HTTP 500.

---

## 6. Database Models, Enums, Constraints, and Migrations

### 6.1 Entity-Relationship Overview
The schema defines eight relational models in [`backend/prisma/schema.prisma`](../backend/prisma/schema.prisma):

```
┌─────────────────────────┐
│          User           │
├─────────────────────────┤
│ id (UUID, PK)           │◀───┐
│ email (Unique)          │    │ (1:1)
│ password_hash           │    ├─────────── StudentProfile (education, skills, project_links)
│ role (Enum)             │    │ (1:1)
│ status (Enum)           │    ├─────────── BusinessProfile (company_name, verification_status)
│ created_at              │    │ (1:N)
│ deleted_at (Nullable)   │    ├─────────── Opportunity (posted_by)
└─────────────────────────┘    │ (1:N)
                               ├─────────── Application (student_id)
                               │ (1:N)
                               ├─────────── CompetitionRegistration (student_id)
                               │ (1:N)
                               ├─────────── Notification (user_id)
                               │ (1:N)
                               └─────────── PasswordResetToken (user_id)
```

### 6.2 Schema Enums and Allowed Values
The database schema in [`backend/prisma/schema.prisma`](../backend/prisma/schema.prisma) defines six enums with the following verified allowed values:

1. **`Role`**:
   - `STUDENT`: University students and young professionals seeking opportunities and building talent profiles.
   - `BUSINESS`: Employers and organizations posting opportunities and evaluating applicants.
   - `ADMIN`: Platform moderators with global user listing, moderation, and business verification rights.
2. **`UserStatus`**:
   - `ACTIVE`: Fully operational user account.
   - `SUSPENDED`: Account administratively suspended; rejected at login (HTTP 403) and middleware.
   - `DELETED`: Account soft-deleted and anonymized (FR-020); permanently deactivated.
3. **`VerificationStatus`**:
   - `PENDING`: Initial status for newly registered business profiles awaiting administrator review.
   - `VERIFIED`: Approved business profile permitted to publish opportunities.
   - `REJECTED`: Rejected business profile; blocked from publishing opportunities.
4. **`OpportunityType`**:
   - `INTERNSHIP`: Work-learning positions for students.
   - `JOB`: Full-time or part-time employment positions.
   - `COMPETITION`: Skill challenges and competitive hackathons.
5. **`OpportunityStatus`**:
   - `OPEN`: Actively accepting applications or competition registrations.
   - `CLOSED`: Application deadline elapsed or opportunity closed by employer/system.
6. **`ApplicationStatus`**:
   - `NEW`: Default initial status upon student application submission.
   - `SHORTLISTED`: Applicant selected by employer for further evaluation or interviews.
   - `REJECTED`: Applicant not selected by employer.
   - `HIRED`: Applicant successfully hired for the position.

### 6.3 Key Constraints & Referential Integrity
- **Unique Constraints**:
  - `User.email`
  - `StudentProfile.user_id`
  - `BusinessProfile.user_id`
  - `Application(student_id, opportunity_id)` (prevents multiple applications per opportunity)
  - `CompetitionRegistration(student_id, opportunity_id)` (prevents double registrations)
  - `PasswordResetToken.token_hash`
- **Cascade Behavior Trap & Safe Deletion**:
  Every related child table specifies `onDelete: Cascade`. A standard hard delete (`prisma.user.delete`) would automatically delete all historical applications and competition registrations. For **FR-020**, an anonymization and soft-delete strategy was engineered to update `User.status = DELETED`, clear personal identifiers, and keep historical applications intact.

### 6.4 Database Migrations
Migrations are stored in [`backend/prisma/migrations/`](../backend/prisma/migrations):
1. **`20261011023329_init`**: Initial schema generation (User, Profiles, Opportunities, Applications, Registrations, Notifications, indexes).
2. **`20261016193014_add_password_reset_token`**: Adds `PasswordResetToken` table, unique token hash index, and foreign key to `User`.
3. **`20261016204956_add_deleted_user_status`**: Non-destructive table alteration adding `deleted_at DATETIME(3) NULL` and expanding `UserStatus` enum to include `DELETED`.

---

## 7. Authentication, Authorization, and Account Lifecycles

### 7.1 Authentication Architecture
- **Protocol**: Stateless Bearer token authentication via JWT (`jsonwebtoken`).
- **Signature & Security**: Signed using HMAC SHA-256 with `JWT_SECRET`. The helper [`jwt.ts`](../backend/src/common/jwt.ts) enforces that `JWT_SECRET` is defined, non-empty, and has adequate entropy.
- **Expiration & Token Lifespan**:
  - **Verified Default**: Tokens default to **15 minutes** (`15m`) as implemented in `backend/src/common/jwt.ts:L81` (`options?.expiresIn ?? "15m"`).
  - **Runtime Login Behavior**: When a user logs in via `POST /api/v1/auth/login`, `backend/src/services/auth.service.ts` calls `generateToken({ id, email, role })` without passing options.
  - **Environment-Variable Handling**: There is **no runtime `JWT_EXPIRES_IN` environment-variable override**. The 15-minute expiration is fixed at runtime.
  - **Programmatic Override**: The `generateToken(payload, options?: GenerateTokenOptions)` function accepts an optional `options.expiresIn` parameter (used by automated test suites to construct expired tokens or custom lifespans), but the production authentication controller and service do not expose this override to environment configuration.
- **Verification Middleware**: On every authenticated request, `auth.middleware.ts` extracts the Bearer token, verifies signature and expiration, and queries MySQL for the user's current status. If the account was suspended or deleted after the token was issued, the token is rejected immediately (HTTP 403 for suspended users, HTTP 401 for deleted accounts).

### 7.2 Roles & RBAC Matrix
The system defines three roles in the `Role` enum:

| Feature / Action | Student | Business | Administrator |
| :--- | :---: | :---: | :---: |
| Register Account | Yes | Yes | Admin seed / API |
| View Public Opportunities & Keyword Search | Yes | Yes | Yes |
| Manage Own Profile | Yes | Yes | N/A |
| Post & Manage Opportunities | No | Yes (If Verified) | Moderation (Delete) |
| Apply to Jobs / Internships | Yes | No | No |
| Register for Competitions | Yes | No | No |
| Review Applicants for Posted Opportunities | No | Yes (Own Postings) | Platform-wide |
| Review Competition Registrations | No | Yes (Own Postings) | Yes |
| Verify or Reject Business Accounts | No | No | Yes |
| Suspend or Reactivate Users | No | No | Yes |
| View Role-Based Dashboard | Yes (Personal) | Yes (Company) | Yes (Platform-wide) |
| Delete Own Account (FR-020) | Yes | Yes | Yes |

### 7.3 Business Verification Lifecycle
1. Business registers; `verification_status` defaults to `PENDING`.
2. An attempt by a pending business to post an opportunity is blocked with HTTP 403 (`"Business verification is pending"`).
3. Administrator reviews pending businesses via `GET /api/v1/admin/businesses?status=PENDING`.
4. Administrator verifies or rejects via `PATCH /api/v1/admin/businesses/:id/verification`. Status updates atomically, and an in-database notification is generated.
5. If verified, the business can immediately post opportunities. If rejected, posting remains blocked.

### 7.4 Account Status Lifecycle
- **`ACTIVE`**: Full platform participation permitted.
- **`SUSPENDED`**: Administrator-controlled moderation status (`PATCH /api/v1/admin/users/:id/status`). Blocked from logging in (HTTP 403) and blocked at middleware from using existing tokens. Cannot initiate password resets. Admins cannot suspend themselves.
- **`DELETED`**: Initiated exclusively by the user via `DELETE /api/v1/users/me`. Credentials scrambled, email anonymized, active opportunities closed, and profile deleted. Accounts cannot authenticate again and cannot be reactivated by administrators.

---

## 8. API Overview and OpenAPI Contract Review

### 8.1 Complete Mounted API Inventory

All 28 API endpoints are mounted under the base prefix `/api/v1`:

```text
Public Endpoints (7):
  GET    /api/v1/health
  POST   /api/v1/auth/register
  POST   /api/v1/auth/login
  POST   /api/v1/auth/password-reset
  POST   /api/v1/auth/password-reset/confirm
  GET    /api/v1/opportunities
  GET    /api/v1/opportunities/:id

Authenticated (Any Role) (3):
  GET    /api/v1/auth/me
  GET    /api/v1/dashboard/summary
  DELETE /api/v1/users/me

Student Endpoints (Role: STUDENT) (5):
  GET    /api/v1/students/me/profile
  PUT    /api/v1/students/me/profile
  GET    /api/v1/students/me/applications
  POST   /api/v1/opportunities/:id/applications
  POST   /api/v1/opportunities/:id/registrations

Business Endpoints (Role: BUSINESS) (9):
  GET    /api/v1/businesses/me/profile
  PUT    /api/v1/businesses/me/profile
  POST   /api/v1/opportunities                     [Requires Verified Business]
  PUT    /api/v1/opportunities/:id                 [Owner Only]
  POST   /api/v1/opportunities/:id/close           [Owner Only]
  DELETE /api/v1/opportunities/:id                 [Owner or Admin]
  GET    /api/v1/opportunities/:id/applications    [Owner Only]
  GET    /api/v1/opportunities/:id/registrations   [Owner or Admin]
  PATCH  /api/v1/applications/:id/status           [Owner Only]

Administrator Endpoints (Role: ADMIN) (4):
  GET    /api/v1/admin/businesses
  PATCH  /api/v1/admin/businesses/:id/verification
  GET    /api/v1/admin/users
  PATCH  /api/v1/admin/users/:id/status
```

### 8.2 OpenAPI Specification Audit (`docs/openapi.yaml`)
A thorough audit of [`openapi.yaml`](openapi.yaml) against the actual Express routes revealed the following contract discrepancies:
1. **Registration Route Split**:
   - `docs/openapi.yaml` lists `POST /auth/register/student` and `POST /auth/register/business`.
   - The backend implements a unified `POST /api/v1/auth/register` taking `role` in the body. The split paths do not exist in the Express router.
2. **Missing `GET /auth/me` Documentation**:
   - `GET /api/v1/auth/me` is implemented and verified by test suites, but omitted from `docs/openapi.yaml`.
3. **Documented `POST /auth/logout` Endpoint**:
   - `docs/openapi.yaml` specifies a `POST /auth/logout` endpoint returning HTTP 200.
   - The backend does not implement `/auth/logout` because JWT authentication is client-managed.
4. **Base Path Specification**:
   - `docs/openapi.yaml` defines `servers: - url: /api/v1`. Developers viewing individual path strings should note that `/api/v1` is prepended by the server root.

---

## 9. Core Business Workflows

### 9.1 Registration & Profile Setup
- User registers via `POST /api/v1/auth/register` with `name`, `email`, `password`, and `role`.
- Password hashed with bcrypt; user record created with status `ACTIVE`.
- Students complete profile details via `PUT /api/v1/students/me/profile` (education, array of skills, project URLs). At least one skill is required to apply for opportunities.
- Businesses complete company details via `PUT /api/v1/businesses/me/profile` (`company_name`).

### 9.2 Opportunity Lifecycle & Keyword Search
- Verified businesses publish opportunities via `POST /api/v1/opportunities` (`type: INTERNSHIP | JOB | COMPETITION`). Deadline must be in the future.
- Public search via `GET /api/v1/opportunities?q=keyword&type=JOB&skill=React` utilizes MySQL fulltext indexing on `title` and `description` and B-tree indexes on `type`, `status`, and `deadline`.
- Businesses can close opportunities (`POST /opportunities/:id/close`), preventing new applicants while keeping records visible.

### 9.3 Applications & Competition Registrations
- **Application**: Student applies via `POST /api/v1/opportunities/:id/applications`. The system verifies the student has at least one skill, the opportunity is an `INTERNSHIP` or `JOB`, is `OPEN`, and deadline has not passed. Concurrency safety is enforced via `@@unique([student_id, opportunity_id])`.
- **Status Progression**: Employers review applicants via `GET /opportunities/:id/applications` and transition candidate status (`SHORTLISTED`, `REJECTED`, `HIRED`) via `PATCH /applications/:id/status`. An in-database notification is generated atomically for the student.
- **Competition Registration**: Student registers via `POST /api/v1/opportunities/:id/registrations`. Type must be `COMPETITION`. Compound uniqueness prevents double registration.

### 9.4 Password Reset Flow
- User submits email via `POST /api/v1/auth/password-reset` (rate-limited to 5 requests per 15-minute window per IP in production).
- Anti-enumeration: Generic response returned whether user exists or not.
- For active accounts, existing unexpired reset tokens are marked used, a 32-byte cryptographically secure token is generated, its SHA-256 hash is saved to `PasswordResetToken` with a 15-minute expiration, and generic confirmation is returned.
- User confirms via `POST /api/v1/auth/password-reset/confirm` with `token` and `newPassword`. The system matches the SHA-256 hash, verifies token has not expired and has not been used, updates `password_hash`, and marks the token used in a transaction.

### 9.5 Account Deletion & Data Retention (FR-020)
- User calls `DELETE /api/v1/users/me`. Identity is derived strictly from `req.user.id`.
- Handled atomically inside `prisma.$transaction`:
  1. `User.status` updated to `DELETED`; `deleted_at` set to current timestamp.
  2. `User.name` set to `"Deleted User"` (or `"Deleted Business"`).
  3. `User.email` set to `deleted_<userId>@deleted.local` (scrubs personal email and frees the original email address for future re-registration).
  4. `User.password_hash` replaced with an unmatchable bcrypt dummy hash.
  5. `StudentProfile` or `BusinessProfile` record is deleted (removing education, skills, and project links).
  6. For businesses, all active opportunities are set to `CLOSED`.
  7. Active notifications and password reset tokens are purged.
  8. **Retention**: `Application` and `CompetitionRegistration` records remain preserved in the database to satisfy the 12-month reporting requirement.

---

## 10. Testing, Quality Assurance, and CI Pipeline

### 10.1 Automated Test Suite
The backend is validated by **13 Jest integration test suites** using Supertest against a live MySQL test instance. Tests execute sequentially in-band (`jest --runInBand` / `npm test`):

> **Execution Precaution**: Running tests concurrently (without `--runInBand`) causes database collision and foreign-key deadlock issues in `tests/opportunity.test.ts`. All test executions must use `npm test` or pass `--runInBand`.

| Test Suite File | Coverage Scope | Verified Tests |
| :--- | :--- | :---: |
| [`tests/opportunity.test.ts`](../backend/tests/opportunity.test.ts) | Opportunity CRUD, status transitions, deadline checks, and MySQL fulltext search | 91 |
| [`tests/application.test.ts`](../backend/tests/application.test.ts) | Student application submission, skill prerequisite checks, status progression, notifications | 64 |
| [`tests/admin.test.ts`](../backend/tests/admin.test.ts) | Business verification/rejection, full user listing, account suspension and reactivation | 59 |
| [`tests/auth.test.ts`](../backend/tests/auth.test.ts) | Registration, login, password reset request/confirm, anti-enumeration, and credential checks | 48 |
| [`tests/registration.test.ts`](../backend/tests/registration.test.ts) | Competition registration flow, compound unique duplicate rejection, owner/admin views | 36 |
| [`tests/profile.test.ts`](../backend/tests/profile.test.ts) | Student & business profile CRUD, education, skill tags, project links, and authorization | 28 |
| [`tests/jwt.test.ts`](../backend/tests/jwt.test.ts) | Token signing, claims validation, secret verification, 15m expiration, and malformed payload defense | 21 |
| [`tests/auth.middleware.test.ts`](../backend/tests/auth.middleware.test.ts) | Bearer header parsing, token expiration, suspended/deleted account middleware interception | 17 |
| [`tests/user.test.ts`](../backend/tests/user.test.ts) | Account deletion (FR-020), personal data anonymization, and 12-month data retention | 13 |
| [`tests/dashboard.test.ts`](../backend/tests/dashboard.test.ts) | Student, Business, and Admin metrics aggregation and role-based data isolation (FR-022) | 12 |
| [`tests/app.test.ts`](../backend/tests/app.test.ts) | Express app setup, health check endpoint, CORS header behavior, and security headers | 7 |
| [`tests/rateLimiter.test.ts`](../backend/tests/rateLimiter.test.ts) | Rate limit factory options, threshold enforcement, 429 payload format, IP isolation | 6 |
| [`tests/errorHandler.test.ts`](../backend/tests/errorHandler.test.ts) | Operational vs internal error formatting, JSON parse syntax errors, 404 route handling | 6 |
| **Total** | | **408 Passed** |

### 10.2 Quality Assurance Commands
All verification commands execute cleanly with zero errors on the current `main` branch:
- **Full Test Run**: `npm test` (Runs all 13 suites in ~25s with `--runInBand`).
- **TypeScript Typecheck**: `npm run typecheck` (`tsc --noEmit`).
- **Linter Check**: `npm run lint` (`eslint src/**/*.ts`).
- **Build Verification**: `npm run build` (`tsc` compiling to CommonJS `dist/`).
- **Whitespace / Git Check**: `git diff --check`.
- **OpenAPI Schema Check**: `yamljs.load('docs/openapi.yaml')` (Valid YAML structure).

### 10.3 Continuous Integration Pipeline
The CI pipeline ([`.github/workflows/ci.yml`](../.github/workflows/ci.yml)) automatically triggers on pushes and pull requests targeting `main`. It initializes a MySQL 8.0 service container, applies migrations via `npm run prisma:deploy`, runs linting, typechecking, tests (`npm test -- --runInBand`), and validates compilation.

---

## 11. Local Development and Deployment Overview

### 11.1 Container Architecture (`docker-compose.yml`)
The root [`docker-compose.yml`](../docker-compose.yml) orchestrates three interconnected containers:
1. **`mysql`**: Official `mysql:8` image. Exposed on port `3306`. Persistent data mapped to named Docker volume `mysql_data`. Health checked via `mysqladmin ping`.
2. **`backend`**: Built from [`backend/Dockerfile`](../backend/Dockerfile) (`node:20-alpine`). Depends on `mysql` being healthy. Exposed on port `3000`.
3. **`frontend`**: Built from `frontend/Dockerfile`. Nginx static server exposed on port `5173`. Proxies `/api/v1` requests to backend container.

### 11.2 Key Environment Variables
Environment configurations are template-managed in [`.env.example`](../.env.example):
- `DATABASE_URL`: Connection string (`mysql://<user>:<password>@<host>:3306/<database>`).
  - *Local outside Docker*: `localhost:3306`
  - *Docker Compose*: `mysql:3306`
  - *CI Runner*: `127.0.0.1:3306`
- `PORT`: HTTP port listener (default: `3000`).
- `JWT_SECRET`: Mandatory cryptographic signing key (must be >= 32 characters in production).
- `ADMIN_PASSWORD`: Password for the default administrator seeded by `prisma/seed.ts`.
- `FRONTEND_URL`: URL of the client application (default: `http://localhost:5173`).

*(Note: A standalone, step-by-step Setup & Operations Guide covering zero-to-running local installation and deployment troubleshooting will be produced separately).*

---

## 12. Security and Privacy Controls

1. **Password Security**: Bcryptjs with work factor 10. Plaintext passwords are never stored, logged, or included in query return projections.
2. **Secret Validation**: `getJwtSecret()` fails immediately at startup if `JWT_SECRET` is unset or empty; fallback hardcoded secrets are forbidden.
3. **Defense Against Brute-Force**:
   - In-memory rate limiting throttles authentication endpoints by client IP.
   - `POST /api/v1/auth/login` is capped at 10 requests per 15 minutes per IP in production.
   - `POST /api/v1/auth/password-reset` is capped at 5 requests per 15 minutes per IP in production.
   - When running under `NODE_ENV === "test"`, limits automatically expand to 100 requests per 15 minutes to allow automated test execution without IP blocking.
4. **Anti-Enumeration Protection**:
   - `POST /auth/login` returns identical HTTP 401 errors for non-existent emails and incorrect passwords.
   - `POST /auth/password-reset` returns identical HTTP 200 generic messages whether an account exists, is suspended, or is deleted.
5. **Role-Based Authorization & Ownership**:
   - Middleware guarantees role isolation.
   - Services verify resource ownership (`opportunity.posted_by === req.user.id`) to prevent horizontal privilege escalation.
6. **Data Privacy by Design (SRS Section 7.4)**:
   - Student contact details and profile URLs remain private from employers until the student explicitly applies to an opportunity.
   - Account deletion completely anonymizes the user record and destroys profile tables while preserving necessary historical application records without PII.
7. **SQL Injection & Mass-Assignment Immunity**:
   - Prisma ORM utilizes parameterized queries exclusively, eliminating SQL injection vectors.
   - Zod `.strict()` schemas reject unexpected parameters, preventing mass-assignment vulnerabilities.
8. **Error Obfuscation**: Unhandled 500 exceptions return generic `"Internal Server Error"` messages to clients, preventing database structure or stack trace leakage.

---

## 13. Known Limitations, Operational Risks, and Recommended Future Work

### 13.1 High Priority
1. **OpenAPI Specification Drift**:
   - **Issue**: `docs/openapi.yaml` lists split routes (`/auth/register/student` and `/auth/register/business`) rather than the actual unified `POST /auth/register`, omits `GET /auth/me`, and contains a phantom `POST /auth/logout`.
   - **Recommendation**: Update `docs/openapi.yaml` to align with actual Express routes to avoid client SDK confusion.
2. **CORS Configuration Hardening**:
   - **Issue**: `app.ts` invokes `cors()` without arguments, defaulting to `Access-Control-Allow-Origin: *`.
   - **Recommendation**: Pass `{ origin: process.env.FRONTEND_URL, credentials: true }` in production.

### 13.2 Medium Priority
1. **Outbound Email Transport**:
   - **Issue**: Notifications and password-reset tokens are stored in MySQL, but no SMTP or transactional email provider (AWS SES, SendGrid, Resend) is connected. Reset links cannot reach external email inboxes.
   - **Recommendation**: Implement an email transport adapter (e.g., Nodemailer) triggered by `auth.service.ts` and `notification.service.ts`.
2. **Automated 12-Month Retention Purge Worker**:
   - **Issue**: FR-020 safely soft-deletes and anonymizes records for 12 months. However, no automated background cron or scheduled worker purges anonymized records older than 12 months.
   - **Recommendation**: Implement a recurring task (e.g., node-cron or an external worker) executing `DELETE FROM Application WHERE user.deleted_at < NOW() - INTERVAL 12 MONTH`.

### 13.3 Low Priority / Operational Enhancements
1. **Backup Automation (NFR-10)**: Configure daily automated MySQL dumps (`mysqldump`) with 30-day retention to cloud storage.
2. **External Uptime Monitoring (NFR-13)**: Connect an external monitor (e.g., UptimeRobot, Datadog) to `/api/v1/health` with automated alert hooks.
3. **Empty Backend Readme**: Populate [`backend/README.md`](../backend/README.md) with quick developer reference commands.

---

## 14. Git Workflow and Maintenance Checklist

### 14.1 Git Development Protocol
- **Protected Branch**: `main` represents deployable code. Direct commits to `main` are discouraged.
- **Feature Branches**: Branch naming convention follows `feature/<ticket-or-FR-id>-<description>` (e.g., `feature/FR-020-account-deletion`).
- **Commit Format**: Conventional Commits standard (e.g., `feat(users): ...`, `fix(auth): ...`, `chore(ci): ...`).
- **Pull Request Protocol**: Feature branches must pass all automated CI checks (`npm test`, `typecheck`, `lint`, `build`) before merging.

### 14.2 Maintainer Pre-Deployment Checklist
Before releasing new builds to staging or production, execute and verify:

- [ ] Ensure local working tree is clean (`git status`).
- [ ] Run full test suite: `npm test` (all 13 suites / 408 tests must pass).
- [ ] Run typecheck: `npm run typecheck` (0 TypeScript errors).
- [ ] Run linter: `npm run lint` (0 ESLint warnings/errors).
- [ ] Run build: `npm run build` (clean compilation).
- [ ] Verify database migrations are applied: `npx prisma migrate status`.
- [ ] Verify environment variables: `DATABASE_URL` and `JWT_SECRET` (>= 32 characters) must be set.
- [ ] Ensure `/api/v1/health` returns HTTP 200 upon deployment.
