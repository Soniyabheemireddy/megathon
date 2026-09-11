# ReturnShield AI

Clean structure:

```
client/   → React frontend (Netlify or Vercel)
server/   → Express + MongoDB API (Vercel)
```

## Local run

1. Start MongoDB (local or Atlas URI in `server/.env`)
2. Backend:
```bash
cd server
cp .env.example .env
npm install
npm run dev
```
3. Frontend:
```bash
cd client
cp .env.example .env
npm install
npm run dev
```

- App: http://localhost:5173  
- API: http://localhost:4000  

### Auth
| Role | Signup | Credentials |
|------|--------|-------------|
| Customer | Yes | or `customer@demo.com` / `demo123` |
| Delivery | Yes | or `delivery@demo.com` / `demo123` |
| Admin | No | `admin@demo.com` / `admin123` |

---

## Deploy

### 1) MongoDB Atlas (required for cloud)
1. Create a free cluster at [mongodb.com/atlas](https://www.mongodb.com/atlas)
2. Database Access → create user  
3. Network Access → allow `0.0.0.0/0`  
4. Connect → copy URI, e.g. `mongodb+srv://USER:PASS@cluster.mongodb.net/returnshield`

### 2) Backend → **Vercel**
1. Push this repo to GitHub  
2. [vercel.com](https://vercel.com) → **Add New Project** → import repo  
3. Set **Root Directory** to `server`  
4. Environment variables:
   - `MONGODB_URI` = your Atlas URI  
   - `JWT_SECRET` = long random string  
5. Deploy → copy URL, e.g. `https://returnshield-api.vercel.app`

### 3) Frontend → **Vercel**
1. New Vercel project → same repo  
2. **Root Directory** = `client`  
3. Env:
   - `VITE_API_URL` = `https://returnshield-api.vercel.app` (no trailing slash)  
4. Deploy

### 4) Frontend → **Netlify**
1. [netlify.com](https://netlify.com) → Add new site → Import from Git  
2. Base directory: `client` (or use root `netlify.toml`)  
3. Build command: `npm run build`  
4. Publish directory: `dist`  
5. Env:
   - `VITE_API_URL` = your Vercel API URL  
6. Deploy  

SPA redirects are already in `client/netlify.toml` and root `netlify.toml`.

---

## Recommended setup

| Piece | Host |
|-------|------|
| Frontend | Netlify **or** Vercel |
| Backend API | Vercel (`server/`) |
| Database | MongoDB Atlas |
