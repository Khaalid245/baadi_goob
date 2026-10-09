# Furan Web Platform (Madasha Furan)

Madasha Furan waa madal mareeg (web platform) oo isku xidha ardayda Soomaaliyeed iyo fursadaha tababar (internships), shaqooyin, iyo tartamo.

## 👥 Shaqo Qaybinta Kooxda (Team Assignments)

- **UI & Frontend**: Ayub iyo Abadir
- **Backend**: Hanad AI oo la shaqaynaya Yammak Mohammed Abdirahman
- **DevOps & Production**: Khalid

---

## 🛠 Tignoolajiyadda (Tech Stack)
- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, React Router, TanStack Query
- **Backend**: Node.js, Express, TypeScript, Prisma ORM, Zod, JWT Auth
- **Database (Kaydka Xogta)**: MySQL 8
- **Infrastructure**: Docker, Docker Compose, Nginx

---

## 🚀 Sida Loo Bilaabo (Tilmaamaha Setup-ka ee aan khaldamin)

**Fadlan raac talaabooyinkan sida ay yihiin si aad uga fogaato khaladaad ku yimaada setup-ka ama Docker-ka.**

### Shuruudaha (Prerequisites)
Hubi inaad kombuyuutarkaaga ku shubtay (install) barnaamijyadan:
- **Docker Desktop** (Hubi inuu furan yahay oo uu PC-gaaga ka shaqaynayo!)
- **Node.js** (v20 ama ka sareeya)
- **Git**

### Tilaabada 1aad: Faylka Deegaanka (Environment Variables)
Nuqul (copy) ka samee faylka tusaalaha ah si aad u samaysato fayl kuu gaar ah oo la yiraahdo `.env` oo ku dhex yaala xididka (root) mashruuca:
```powershell
cp .env.example .env
```
*(Qiyamka hore (default values) ayaa durbadiiba loogu habeeyay in loogu shaqeeyo Docker-ka, markaa uma baahnid inaad wax ka beddesho).*

### Tilaabada 2aad: Ugu Horeyn Daar Database-ka
Kahor intaanad koodhka (code) ama socdaalka xogta (migrations) bilaabin, waa inaan shidnaa MySQL database-ka oo aan u deynaa inuu is habeeyo:
```powershell
docker compose down
docker compose up -d mysql
```
**⚠️ Muhiim**: Sug ilaa 15-20 ilbidhiqsi si database-ku uu si buuxda isugu habeeyo kahor intaadan u gudbin Tilaabada 3aad.

### Tilaabada 3aad: Socdaalka Xogta & Seeding (Database Migrations & Seeding)
Xigta, waxaan u baahanahay inaan samayno miisaska (tables) xogta oo aan gelino isticmaalaha ugu horeeya ee maamulaha (admin). Geli amarradan sida ay yihiin:
```powershell
cd backend
npm install
npm run prisma:generate
npm run prisma:migrate -- --name init
npm run prisma:seed
cd ..
```
*(Tani waxay abuureysaa akoon admin ah oo leh Iimaylka: `admin@furan.local` iyo Baasaboorka (Password): `admin123`)*

### Tilaabada 4aad: Daar Dhammaan Nidaamka
Hadda, bilow adeega dambe (backend API) iyo bogga internet-ka (frontend website):
```powershell
docker compose up -d
```

---

## 🌐 Sida Loo Galo App-ka
Marka wax walba ay shaqeeyaan, waxaad ka geli kartaa madasha halkan:
- **Website-ka (Frontend)**: [http://localhost:5174](http://localhost:5174)
- **API Docs (Backend Swagger)**: [http://localhost:3000/api/docs](http://localhost:3000/api/docs)
- **Baaritaanka Caafimaadka Backend (Health Check)**: [http://localhost:3000/api/v1/health](http://localhost:3000/api/v1/health)

---

## 🛑 Xallinta Cilladaha Docker (Troubleshooting)

Haddii aad aragto qaladaad sida `"The system cannot find the file specified"` ama cillado xagga dekeda (port conflicts):
1. Hubi in **Docker Desktop** uu furan yahay oo uu leeyahay "Engine Running" dhanka bidix ee hoose.
2. Haddii Docker uu fariisto (freeze) ama uu si qaldan u shaqeeyo, midig-guji icon-ka Docker ee ku yaala dhinaca midig ee hoose (system tray), dooro **Quit Docker Desktop**, kadibna dib u fur.
3. Haddii uu fariisto terminal-kaagu, taabo `Ctrl+C` si aad u baabi'iso amarka, dib u bilow Docker Desktop, kadibna isku day markale.
4. Haddii aad shaki gasho, dib u dami oo daar (restart) kombuyuutarkaaga. Docker-ka Windows-ka mararka qaar wuu fariistaa haddii isku-xirkiisa hoose uu shaqada joojiyo.
