# Furan

A two-sided platform connecting Somali students with internships, jobs, and competitions.

## Prerequisites
- Node.js (v20+)
- Docker & Docker Compose

## Setup Instructions

1. **Environment Variables**:
   Copy the example environment file and fill in values if necessary (or keep defaults for local dev):
   ```bash
   cp .env.example .env
   ```

2. **Run Locally with Docker Compose**:
   ```bash
   docker compose up --build -d
   ```
   This will start:
   - MySQL on port 3306
   - Backend on port 3000
   - Frontend on port 5173

3. **Install Dependencies Locally (for IDE/Intellisense)**:
   ```bash
   cd backend && npm install
   cd ../frontend && npm install
   ```

4. **Database Migrations and Seed**:
   Run the following exact commands from the `/backend` folder:
   ```bash
   npx prisma generate
   npx prisma migrate dev --name init
   npm run prisma:seed
   ```
   *(Note: For the seed, it will use the `ADMIN_PASSWORD` from `.env` to create the admin user `admin@furan.local`. If you encounter a global Prisma agent skills bug, the `npx prisma` commands will use your local project's Prisma binary).*
   
   To deploy migrations in production (or inside Docker):
   ```bash
   npx prisma migrate deploy
   ```

5. **Run Tests**:
   - Backend: `cd backend && npm test`
   - Frontend: `cd frontend && npm test`

## Architecture
- **Frontend**: React, Vite, Tailwind, React Router, TanStack Query.
- **Backend**: Node.js, Express, TypeScript, Prisma, MySQL.
- **Docs**: API documentation is available at `/api/docs` (Swagger UI).
