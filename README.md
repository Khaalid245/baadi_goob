# Furan Web Platform

Furan is a web platform that connects Somali students with internships, jobs, and competitions.

## 👥 Team Assignments

- **UI & Frontend**: Ayub and Abadir
- **Backend**: Hanad AI with Yammak Mohammed Abdirahman
- **DevOps & Production**: Khalid

---

## 🛠 Tech Stack
- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, React Router, TanStack Query
- **Backend**: Node.js, Express, TypeScript, Prisma ORM, Zod, JWT Auth
- **Database**: MySQL 8
- **Infrastructure**: Docker, Docker Compose, Nginx

---

## 🚀 Getting Started (Foolproof Setup Guide)

**Please follow these steps exactly to avoid any setup or Docker issues.**

### Prerequisites
Make sure you have the following installed on your machine:
- **Docker Desktop** (Make sure it is actually open and running on your PC!)
- **Node.js** (v20+)
- **Git**

### Step 1: Environment Variables
Copy the example environment file to create your own local `.env` file at the root of the project:
```powershell
cp .env.example .env
```
*(The default values are already configured for local Docker development, so you don't need to change anything).*

### Step 2: Start the Database First
Before running the code or migrations, we must start the MySQL database and let it initialize:
```powershell
docker compose down
docker compose up -d mysql
```
**⚠️ Important**: Wait about 15-20 seconds for the database to fully initialize before moving to Step 3.

### Step 3: Database Migrations & Seeding
Next, we need to create the database tables and seed the initial admin user. Run these exact commands:
```powershell
cd backend
npm install
npm run prisma:generate
npm run prisma:migrate -- --name init
npm run prisma:seed
cd ..
```
*(This creates an admin account with Email: `admin@furan.local` and Password: `admin123`)*

### Step 4: Run the Entire Stack
Now, start the backend API and the frontend website:
```powershell
docker compose up -d
```

---

## 🌐 Accessing the App
Once everything is running, you can access the platform here:
- **Frontend Website**: [http://localhost:5174](http://localhost:5174)
- **Backend API Docs (Swagger)**: [http://localhost:3000/api/docs](http://localhost:3000/api/docs)
- **Backend Health Check**: [http://localhost:3000/api/v1/health](http://localhost:3000/api/v1/health)

---

## 🛑 Troubleshooting Docker

If you get errors like `"The system cannot find the file specified"` or port binding conflicts:
1. Make sure **Docker Desktop** is open and says "Engine Running" in the bottom left.
2. If Docker is frozen or acting up, right-click the Docker icon in your system tray, select **Quit Docker Desktop**, and reopen it.
3. If the terminal freezes, press `Ctrl+C` to cancel the command, restart Docker Desktop, and try again.
4. When in doubt, restart your PC. Docker on Windows can occasionally freeze if its internal networking crashes.
