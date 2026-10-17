# Baadi Goob (Furan) — Developer Setup and Environment Guide

**Target Platform**: Windows 10 / Windows 11 (PowerShell 7 or Windows PowerShell 5.1)  
**Document Status**: Official Local Development & Operations Guide  
**Companion Documents**:
- [Technical Handover Document](TECHNICAL_HANDOVER.md)
- [OpenAPI Specification](openapi.yaml)

---

## Table of Contents
1. [Prerequisites](#1-prerequisites)
2. [Clone and Enter the Repository](#2-clone-and-enter-the-repository)
3. [Environment Configuration](#3-environment-configuration)
4. [Start the Database and Container Services](#4-start-the-database-and-container-services)
5. [Prisma and Database Migrations](#5-prisma-and-database-migrations)
6. [Run Backend Locally](#6-run-backend-locally)
7. [Frontend Setup and Run](#7-frontend-setup-and-run)
8. [Tests and Code Quality](#8-tests-and-code-quality)
9. [Common Problems and Diagnostics](#9-common-problems-and-diagnostics)
10. [Shutdown and Daily Workflow](#10-shutdown-and-daily-workflow)
11. [Troubleshooting and Security Safety Rules](#11-troubleshooting-and-security-safety-rules)

---

## 1. Prerequisites

Before setting up the project, ensure the following core tools are installed on your Windows machine:

| Tool | Verified Version | Purpose | Download Link / Installation |
| :--- | :--- | :--- | :--- |
| **Node.js** | `>=20.0.0` (LTS recommended) | JavaScript runtime for backend and frontend tooling | [nodejs.org](https://nodejs.org/) |
| **npm** | `>=10.0.0` (bundled with Node) | Package manager for dependency management | Bundled with Node.js |
| **Docker Desktop** | Latest (WSL 2 backend) | Runs containerized MySQL 8.0 database and services | [docker.com](https://www.docker.com/products/docker-desktop/) |
| **Git for Windows** | `>=2.40.0` | Source control management and Git CLI | [git-scm.com](https://git-scm.com/) |
| **PowerShell** | PowerShell 7 or Windows PowerShell 5.1+ | Primary shell used for all setup commands | Pre-installed on Windows 10/11 |

### Checking Installed Versions
Open a PowerShell terminal and verify each tool:

```powershell
node --version
npm --version
git --version
docker --version
docker compose version
```

> **Important (Docker Desktop)**: Ensure **Docker Desktop is actively running** before executing database commands. In Docker Desktop settings, confirm that the WSL 2 engine is enabled and the status indicator in the bottom-left shows "Engine running".

---

## 2. Clone and Enter the Repository

### 2.1 Clone the Repository
Clone the official repository to your preferred local workspace directory using PowerShell:

```powershell
git clone https://github.com/Khaalid245/baadi_goob.git
cd baadi_goob
```

### 2.2 Understanding Directory Scopes
The repository is organized into distinct functional workspaces. Always ensure your current working directory matches the task at hand:

- **Repository Root (`baadi_goob/`)**:
  - Used for Docker Compose orchestration commands (`docker compose up`, `docker compose ps`, `docker compose down`).
  - Used for top-level Git commands (`git status`, `git pull`, `git branch`).
  - Contains [`docker-compose.yml`](../docker-compose.yml), [`.env.example`](../.env.example), and high-level documentation.
- **Backend Directory (`baadi_goob/backend/`)**:
  - Used for all Express API development, Prisma schema migrations, seeding, testing, and linting.
  - Contains [`backend/package.json`](../backend/package.json), [`backend/prisma/schema.prisma`](../backend/prisma/schema.prisma), and backend TypeScript code.
- **Frontend Directory (`baadi_goob/frontend/`)**:
  - Used for Vite development server, React client tooling, linting, and building.
  - Contains [`frontend/package.json`](../frontend/package.json) and client React code.

---

## 3. Environment Configuration

### 3.1 How `.env.example` Works
The repository provides a template file, [`.env.example`](../.env.example), documenting all required configuration variables. **Never commit actual `.env` files to Git**. Both `.env` and `backend/.env` are automatically ignored by root [`.gitignore`](../.gitignore).

### 3.2 Dual Environment File Setup
To ensure smooth operation whether running services via Docker Compose or executing native Node/Prisma scripts directly on Windows:
1. **Root `.env`**: Read automatically by Docker Compose from the project root (`baadi_goob/.env`).
2. **Backend `.env`**: Read automatically by Prisma CLI, database migration scripts, and `dotenv.config()` when executing inside the `backend/` directory (`baadi_goob/backend/.env`).

Create both files from the root template:

```powershell
# From the repository root (baadi_goob/):
Copy-Item .env.example .env
Copy-Item .env.example backend\.env
```

### 3.3 Required Environment Variables Reference

| Variable Name | Required By | Description and Local Value Guidance |
| :--- | :--- | :--- |
| `DATABASE_URL` | Backend / Prisma | Full MySQL connection string.<br>• **Local Windows Host**: `mysql://root:rootpassword@localhost:3306/furan`<br>• **Inside Docker Network**: `mysql://root:rootpassword@mysql:3306/furan` |
| `MYSQL_ROOT_PASSWORD` | Docker Compose | Root password assigned to the MySQL container on initialization (e.g. `rootpassword`). |
| `MYSQL_DATABASE` | Docker Compose | Name of the default database created by MySQL on startup (default: `furan`). |
| `PORT` | Backend | HTTP port listener for the Express server (default: `3000`). |
| `FRONTEND_URL` | Backend (CORS) | URL of the frontend client application (default: `http://localhost:5173`). |
| `JWT_SECRET` | Backend | High-entropy secret key used to sign HMAC SHA-256 JSON Web Tokens. Must be non-empty and minimum 32 characters. |
| `ADMIN_PASSWORD` | Backend (Seeder) | Password used by `prisma/seed.ts` to provision the initial `admin@furan.local` account. |
| `VITE_API_URL` | Frontend | Base URL prefix for backend REST requests (default: `http://localhost:3000/api/v1`). |

### 3.4 Generating a Safe Cryptographic `JWT_SECRET`
Never use weak, guessable passwords like `supersecret` in production or staging. You can generate a cryptographically strong 32-byte hexadecimal secret key using Node.js directly from PowerShell:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the generated output and update `JWT_SECRET` in both `.env` and `backend/.env`:

```ini
JWT_SECRET=4f8b9e6a1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f
```

---

## 4. Start the Database and Container Services

The system uses [`docker-compose.yml`](../docker-compose.yml) to run MySQL 8.0 with persistent storage and optional containerized backend and frontend services.

### 4.1 Recommended Development Mode: Database in Docker, Code on Host
For the fastest TypeScript hot-reloading (`tsx`) and seamless debugging, run **only the MySQL database in Docker**, and run the backend and frontend directly in Windows PowerShell.

Start only the MySQL container in the background:

```powershell
# Run from repository root:
docker compose up -d mysql
```

### 4.2 Inspect Container Health
Wait 10–15 seconds for MySQL to complete its initial schema generation and health check:

```powershell
# Verify container is running and healthy:
docker compose ps
```

Expected output:
```text
NAME          IMAGE     COMMAND                  SERVICE   CREATED          STATUS                    PORTS
furan-mysql   mysql:8   "docker-entrypoint.s…"   mysql     10 seconds ago   Up 10 seconds (healthy)   0.0.0.0:3306->3306/tcp
```

View live database logs if troubleshooting startup:

```powershell
docker compose logs -f mysql
```
*(Press `Ctrl+C` to exit log viewing).*

### 4.3 Database Hostname Resolution: Docker vs. Windows
A common source of confusion is the database host:
- **From Windows PowerShell (Local Dev / Prisma CLI / Host Apps)**:
  MySQL is mapped to port 3306 on your machine. Connect via **`localhost:3306`** (or `127.0.0.1:3306`):
  `DATABASE_URL="mysql://root:rootpassword@localhost:3306/furan"`
- **From Inside Another Docker Container (e.g. `furan-backend`)**:
  Containers communicate across an internal Docker bridge network where services resolve by their service name. Connect via **`mysql:3306`**:
  `DATABASE_URL="mysql://root:rootpassword@mysql:3306/furan"`

### 4.4 Persistent Database Volume Safety
Database records are stored in the named Docker volume `mysql_data` (mapped to `/var/lib/mysql`).
- **To safely stop containers without losing data**:
  ```powershell
  docker compose down
  ```
- **DESTRUCTIVE WARNING**: Never run `docker compose down -v` unless you deliberately intend to **destroy the database volume and permanently erase all user, opportunity, and application data**.

---

## 5. Prisma and Database Migrations

Prisma ORM manages the MySQL schema defined in [`backend/prisma/schema.prisma`](../backend/prisma/schema.prisma).

### 5.1 Navigate to Backend Directory
All database migration and client generation commands must be executed from `backend/`:

```powershell
cd backend
```

### 5.2 Generate Prisma Client
Generate the type-safe Prisma Client JavaScript/TypeScript bindings into `node_modules/@prisma/client`:

```powershell
npm run prisma:generate
```

### 5.3 Apply Existing Migrations (`prisma:deploy`)
To apply all chronological schema migrations to your MySQL database without interactive prompts:

```powershell
npm run prisma:deploy
```

This applies the three existing migrations from [`backend/prisma/migrations/`](../backend/prisma/migrations):
1. `20261011023329_init`: Base tables (User, Profiles, Opportunity, Application, Registration, Notification).
2. `20261016193014_add_password_reset_token`: PasswordResetToken table and relations.
3. `20261016204956_add_deleted_user_status`: Soft-deletion timestamp and `DELETED` enum state (FR-020).

> **Note on `prisma:migrate`**: Use `npm run prisma:migrate` (`prisma migrate dev`) only when actively authoring **new schema changes** in `schema.prisma`. For initializing or deploying an existing clone, always use `npm run prisma:deploy`.

### 5.4 Seed Initial Administrative User
The database seeder ([`backend/prisma/seed.ts`](../backend/prisma/seed.ts)) provisions the initial super-administrator account:

```powershell
npm run prisma:seed
```

- **Behavior**: Reads `ADMIN_PASSWORD` from the environment, hashes the password with bcrypt (10 rounds), and idempotently upserts the account.
- **Default Credentials Provisioned**:
  - **Email**: `admin@furan.local`
  - **Name**: `Super Admin`
  - **Role**: `ADMIN`
  - **Password**: The value defined in `ADMIN_PASSWORD` in your `.env` file (e.g. `admin123`).

> **Safety Warning**: Never execute `npx prisma migrate reset` on a database with records you need to keep. This drops all tables and rebuilds the schema from scratch.

---

## 6. Run Backend Locally

### 6.1 Install Backend Dependencies
If not already installed, run:

```powershell
# From baadi_goob/backend:
npm install
```

### 6.2 Start the Development Server
Run the backend with automatic TypeScript reload using `tsx`:

```powershell
npm run dev
```

The server listens on `http://localhost:3000`. You will see startup logs confirming the HTTP listener is active.

### 6.3 Verify Server Health
Open a second PowerShell terminal window and verify the health check endpoint:

```powershell
Invoke-RestMethod http://localhost:3000/api/v1/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2026-10-17T09:25:00.000Z"
}
```

### 6.4 Interactive API Documentation (Swagger UI)
Open your web browser and navigate to:
- **Swagger Documentation**: [http://localhost:3000/api/docs](http://localhost:3000/api/docs)

---

## 7. Frontend Setup and Run

### 7.1 Frontend Architecture & Status
The frontend client in [`frontend/`](../frontend) is built with **React 19**, **Vite**, **TypeScript**, **Tailwind CSS v4**, and **React Router 7**.

> **Implementation Note**: The frontend is currently in an early development stage. Routes and layouts are established in [`frontend/src/App.tsx`](../frontend/src/App.tsx), but several views currently render scaffold placeholder components (e.g., `<div>Landing Page</div>`, `<div>Student Dashboard</div>`). Full feature implementations and API integrations are actively progressing.

### 7.2 Run Frontend Locally on Windows
Open a new PowerShell terminal and navigate to the `frontend/` directory:

```powershell
cd baadi_goob\frontend
npm install
npm run dev
```

Vite starts the development server on [http://localhost:5173](http://localhost:5173).

### 7.3 Verified Frontend Quality Scripts
- **Typecheck**: `npm run typecheck` (runs `tsc -b`)
- **Lint**: `npm run lint` (runs `oxlint`)
- **Unit Tests**: `npm run test` (runs `vitest run`)
- **Production Build**: `npm run build` (compiles production bundle to `frontend/dist/`)

---

## 8. Tests and Code Quality

The backend includes a comprehensive automated quality suite comprising 13 integration test suites and 408 verified passing tests.

### 8.1 Backend Verification Commands
Execute these commands from `baadi_goob/backend`:

```powershell
# 1. Run full test suite sequentially (all 13 suites / 408 tests):
npm test

# 2. TypeScript static typechecking:
npm run typecheck

# 3. Static code analysis and linting:
npm run lint

# 4. Production build verification:
npm run build
```

From the repository root:
```powershell
# 5. Git diff and whitespace check:
git diff --check
```

### 8.2 Why Tests MUST Run Sequentially (`--runInBand`)
The backend test command is explicitly configured as `"test": "jest --runInBand"` in `package.json`.

**Critical Technical Rationale**:
- Tests execute real database queries via Supertest against the MySQL instance specified by `DATABASE_URL`.
- Integration tests share tables (`User`, `Opportunity`, `Application`, `CompetitionRegistration`).
- Running Jest in parallel across multiple worker threads causes database connection collisions, race conditions, and foreign-key deadlocks in `tests/opportunity.test.ts`.
- **Always preserve `--runInBand`** when executing Jest.

### 8.3 Test Database Safety Warning & Isolation Guard
When tests run, they create randomized test accounts (e.g. `student_<timestamp>_<random>@test.local`) and clean them up during teardown.
- **Automated tests are strictly restricted to the dedicated `furan_test` database**. The backend test suite enforces an early fail-fast safety guard ([`tests/testDbGuard.ts`](../backend/tests/testDbGuard.ts)) executed via Jest's `setupFiles` ([`tests/setupEnv.ts`](../backend/tests/setupEnv.ts)).
- **The development database `furan` must never be used for test execution**. If `DATABASE_URL` is missing, malformed, or targets `furan` or any database other than `furan_test`, the guard halts execution immediately before any test or database connection can run.
- **Never point `DATABASE_URL` to a production, staging, or development database when running `npm test`**.
- **Test Database Configuration**: Local test runs load `backend/.env.test` (copied from `backend/.env.test.example`). Run `npm --prefix backend run test:db:deploy` to apply migrations to `furan_test` before executing `npm test`.

---

## 9. Common Problems and Diagnostics

### 9.1 Database Connection Refused / Cannot Reach MySQL
- **Symptom**: `Can't reach database server at localhost:3306` or `ECONNREFUSED 127.0.0.1:3306`.
- **Diagnosis**:
  ```powershell
  docker compose ps
  docker compose logs mysql
  ```
- **Remedy**:
  1. Confirm Docker Desktop is running and healthy.
  2. If the container just started, wait 15 seconds for MySQL to complete initialization.
  3. Verify `DATABASE_URL` in `backend/.env` uses `localhost:3306` (not `mysql:3306`).

### 9.2 Port 3306, 3000, or 5173 Already in Use
- **Symptom**: `bind: address already in use` or `Error: listen EADDRINUSE: address already in use :::3000`.
- **Diagnosis (PowerShell)**:
  ```powershell
  Get-NetTCPConnection -LocalPort 3306,3000,5173 -ErrorAction SilentlyContinue | Format-Table LocalAddress,LocalPort,OwningProcess,State
  ```
- **Remedy**:
  - If port 3306 is occupied by an existing native Windows MySQL installation (or XAMPP/WAMP), stop the conflicting Windows service via `services.msc` or terminate the process:
    ```powershell
    Stop-Process -Id <OwningProcessId> -Force
    ```

### 9.3 Missing or Empty Environment Variables
- **Symptom**: `Error: JWT_SECRET is not configured or is empty` or `Error: ADMIN_PASSWORD must be set in the environment`.
- **Remedy**:
  - Ensure `.env` exists in `backend/` as well as root.
  - Verify that `JWT_SECRET` is at least 32 characters long.
  - Check that values do not contain unescaped trailing characters or empty strings.

### 9.4 Prisma Client Type Errors After Pulling Changes
- **Symptom**: TypeScript compiler (`npm run typecheck`) reports that properties or models do not exist on `prisma`.
- **Remedy**:
  ```powershell
  cd backend
  npm run prisma:generate
  ```

### 9.5 Docker Desktop Freezes or WSL 2 Networking Drops
- **Symptom**: Docker CLI hangs indefinitely or errors with `The system cannot find the file specified`.
- **Remedy**:
  1. Right-click the Docker whale icon in the Windows taskbar system tray.
  2. Select **Restart Docker Desktop**.
  3. If Docker remains unresponsive, run `wsl --shutdown` in PowerShell, then reopen Docker Desktop.

---

## 10. Shutdown and Daily Workflow

### 10.1 Safe End-of-Day Shutdown
To end your development session safely without losing any database records:

```powershell
# 1. Stop local dev servers (press Ctrl+C in backend and frontend terminals)

# 2. Stop Docker containers while preserving the mysql_data volume:
docker compose down
```

### 10.2 Next-Day Startup Workflow
To resume development the next day:

```powershell
# 1. Ensure Docker Desktop is open and running

# 2. Start MySQL database:
docker compose up -d mysql

# 3. Check Git branch and sync with remote:
git status
git branch --show-current
git pull origin main

# 4. Apply any new migrations pulled from main:
cd backend
npm run prisma:deploy

# 5. Start development servers:
npm run dev
```

---

## 11. Troubleshooting and Security Safety Rules

To keep the codebase maintainable and secure, adhere strictly to these operational guidelines:

1. **Zero Secret Commits**:
   - Never commit `.env`, `.env.local`, credentials, passwords, or production keys.
   - Before committing, always run `git status` to ensure untracked sensitive files are not staged.
2. **Avoid `git add .`**:
   - Do not stage files indiscriminately with `git add .`.
   - Stage specific, intentional file changes (e.g. `git add backend/src/controllers/opportunity.controller.ts`).
3. **Never Hardcode Secrets**:
   - The backend enforces `getJwtSecret()`, which throws immediately if `JWT_SECRET` is unset. Never add fallback secrets to source code.
4. **Separate Development from Production**:
   - Development uses `tsx` hot-reloading with live schema iteration.
   - Production deployments use Docker multi-stage builds ([`backend/Dockerfile`](../backend/Dockerfile)), compiled JavaScript (`dist/server.js`), non-root container users, and strict reverse proxy routing.
5. **Acknowledge Implemented vs. Planned Infrastructure**:
   - **Outbound Email**: Email delivery (SMTP/SES) is not currently connected; notifications and reset tokens are written to MySQL only.
   - **12-Month Retention Purge**: Account deletion anonymizes records immediately, but the automated 12-month expiration purge worker is a planned enhancement.
   - **Backups & Uptime Monitoring**: Production automated database dumps and external ping monitors are planned post-MVP infrastructure enhancements.
