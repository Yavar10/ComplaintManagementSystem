# SIH26264 — Production Cloud Deployment & Hosting Guide

This document provides complete, step-by-step instructions for hosting the **Integrated Institution Complaint Management and Intelligence System** online.

---

## 1. System Architecture for Online Hosting

To host this platform online, three discrete tiers must be deployed:

```mermaid
graph LR
    User[Citizen / Regulatory Officer] -->|HTTPS| Frontend[Frontend SPA\nVercel / Netlify]
    Frontend -->|REST APIs + JWT| Backend[Node.js / Express API\nRender / Railway / VPS]
    Backend -->|PostgreSQL Connection Pool| Database[(Managed PostgreSQL\nNeon / Supabase / AWS RDS)]
```

| Component | Technology | Recommended Cloud Hosts | Ports / Protocols |
| :--- | :--- | :--- | :--- |
| **Database** | PostgreSQL 16+ | **Neon**, **Supabase**, **Render Postgres**, **AWS RDS** | Port 5432 (SSL required) |
| **Backend API** | Node.js 22+, Express, TypeScript, Prisma | **Render**, **Railway**, **Fly.io**, **AWS App Runner** | Port 5000 / 443 |
| **Frontend** | React 19, Vite, Tailwind CSS | **Vercel**, **Netlify**, **Cloudflare Pages** | Port 443 (HTTPS) |

---

## 2. Option A: Free & Low-Cost Cloud Deployment (Recommended for Hackathons & Demos)

This option requires **zero server maintenance**, gives automated continuous deployment (CI/CD) from your GitHub repository, provides free automatic SSL certificates, and takes under 15 minutes to configure.

### Step 0: Initialize Git & Push to GitHub

Before deploying to Vercel and Render, push your codebase to a private or public GitHub repository:

```powershell
# Open terminal in project root (d:\Projects\inno)
cd d:\Projects\inno

# Initialize git repository
git init

# Add all files (ignoring node_modules, dist, and local db data)
git add .
git commit -m "Initial commit: SIH26264 Integrated Complaint Management System"

# Create a repo on github.com, link it, and push:
git branch -M main
git remote add origin https://github.com/<YOUR_GITHUB_USERNAME>/<YOUR_REPO_NAME>.git
git push -u origin main
```

---

### Step 1: Deploy the Cloud PostgreSQL Database (Neon or Supabase)

#### Using Neon (Free Serverless PostgreSQL):
1. Sign up at [neon.tech](https://neon.tech/).
2. Click **"New Project"**, name it `inno-complaints`, and select your nearest region (e.g., `Asia Pacific (Singapore)` or `Asia South (Mumbai)`).
3. Under **Dashboard > Connection Details**, select **Prisma** or **Connection String**.
4. Copy the connection string. It will look like:
   ```text
   postgresql://inno_user:AbCdEf12345@ep-cool-flower-123456.ap-southeast-1.aws.neon.tech/inno_complaints?sslmode=require
   ```

*(Alternative: Use [supabase.com](https://supabase.com/) or [render.com PostgreSQL](https://dashboard.render.com/).)*

---

### Step 2: Deploy the Backend API (Render.com)

1. Sign up / Log in to [render.com](https://dashboard.render.com/).
2. Connect your GitHub account and select your repository.
3. Click **"New +"** > **"Web Service"**.
4. Configure the service settings:
   - **Name**: `inno-complaint-api`
   - **Root Directory**: `backend`
   - **Environment**: `Node`
   - **Build Command**:
     ```bash
     npm install && npx prisma generate && npx prisma db push --skip-generate && npm run build
     ```
   - **Start Command**:
     ```bash
     npm start
     ```
   - **Instance Type**: `Free` (or `Starter`)

5. Add **Environment Variables** under the **"Environment"** tab:
   | Key | Value | Description |
   | :--- | :--- | :--- |
   | `NODE_ENV` | `production` | Production mode |
   | `PORT` | `5000` | Internal server port |
   | `DATABASE_URL` | `postgresql://user:pass@ep-cool...neon.tech/inno_complaints?sslmode=require` | Connection string from Step 1 |
   | `JWT_SECRET` | *(Generate a 64-char random hex string)* | e.g. `9f8e7d6c5b4a3928170f...` |
   | `JWT_EXPIRES_IN` | `7d` | Token expiry |
   | `CLIENT_URL` | `https://your-frontend-app.vercel.app` | URL of your deployed frontend (updated in Step 3) |
   | `SLA_CHECK_INTERVAL_MINUTES` | `60` | Background SLA scan cycle |

6. Click **"Deploy Web Service"**.
7. Once deployment finishes, copy your live backend URL (e.g., `https://inno-complaint-api.onrender.com`).
8. Verify health status by visiting `https://inno-complaint-api.onrender.com/api/v1/health` in your browser. You should see:
   ```json
   {
     "status": "UP",
     "database": "CONNECTED",
     "uptime": 12.4
   }
   ```

#### Seed Initial Regulatory Data (One-Time Execution):
From your local terminal, point to the production database and run the seed script:
```powershell
# Set your production DATABASE_URL temporarily
$env:DATABASE_URL="postgresql://user:pass@ep-cool...neon.tech/inno_complaints?sslmode=require"

# Run seed from backend directory
cd d:\Projects\inno\backend
npx tsx prisma/seed.ts
```
*This populates the 6 AICTE departments, 6 technical institutions, 7 grievance categories, SLA policies, and evaluation user accounts into your production database.*

---

### Step 3: Deploy the Frontend (Vercel)

1. Sign up / Log in to [vercel.com](https://vercel.com/).
2. Click **"Add New..."** > **"Project"** and import your repository.
3. Configure project settings:
   - **Framework Preset**: `Vite`
   - **Root Directory**: Click edit and select `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Expand **"Environment Variables"** and add:
   | Key | Value |
   | :--- | :--- |
   | `VITE_API_URL` | `https://inno-complaint-api.onrender.com/api/v1` |

   *(Replace with your actual Render backend URL followed by `/api/v1`)*

5. Click **"Deploy"**.
6. Vercel will build and assign you a live HTTPS domain (e.g., `https://inno-complaints.vercel.app`).
7. **Important**: Go back to Render (Step 2), update `CLIENT_URL` to match your live Vercel domain (`https://inno-complaints.vercel.app`), and click **Save Changes** so CORS allows cookie and API communication.

---

## 3. Option B: Single-Command Self-Hosting with Docker

For self-hosting on a Linux VPS (AWS EC2, DigitalOcean Droplet, Linode, Hetzner, or private servers):

### 1. Prerequisites
- Docker Engine 24+ and Docker Compose v2+ installed.
- Port 80 and 443 open in your firewall.

### 2. Deployment Steps
1. Clone the repository onto the server:
   ```bash
   git clone https://github.com/your-org/inno.git
   cd inno
   ```
2. Create your production environment file `.env` in the root directory:
   ```env
   POSTGRES_USER=inno_admin
   POSTGRES_PASSWORD=SecurePassword_SIH2026!
   POSTGRES_DB=inno_complaints
   JWT_SECRET=b6540b79e19d57a912c98031e4281cfc9e2b10a27192938171092837192
   CLIENT_URL=http://your-server-ip:3000
   VITE_API_URL=http://your-server-ip:5000/api/v1
   ```
3. Build and launch all 3 containers:
   ```bash
   docker compose up -d --build
   ```
4. Push database schema and seed initial evaluation data:
   ```bash
   docker compose exec backend npx prisma db push --skip-generate
   docker compose exec backend npx tsx prisma/seed.ts
   ```
5. Access the application:
   - **Frontend**: `http://your-server-ip:3000`
   - **Backend API**: `http://your-server-ip:5000/api/v1/health`

---

## 4. Production Domain & SSL (Nginx Reverse Proxy)

If deploying with Docker on a custom domain (e.g. `complaints.aicte-india.org`):

### Nginx Configuration Template (`/etc/nginx/sites-available/inno`):
```nginx
server {
    listen 80;
    server_name complaints.aicte-india.org;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name complaints.aicte-india.org;

    ssl_certificate /etc/letsencrypt/live/complaints.aicte-india.org/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/complaints.aicte-india.org/privkey.pem;

    # Frontend Single Page App
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Backend API Routing
    location /api/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        client_max_body_size 15M;
    }
}
```

Enable free automated Let's Encrypt certificates:
```bash
sudo certbot --nginx -d complaints.aicte-india.org
```

---

## 5. Environment Variables Reference Sheet

### Backend Environment Variables (`backend/.env`)

| Variable | Type | Required | Default / Example | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| `PORT` | Number | Yes | `5000` | Port the Express API server listens on |
| `NODE_ENV` | String | Yes | `production` | Environment mode (`development` / `production`) |
| `DATABASE_URL` | String | Yes | `postgresql://...` | Connection string to PostgreSQL instance |
| `JWT_SECRET` | String | Yes | `(32+ random characters)` | Secret key used to sign and verify HMAC-SHA256 authentication tokens |
| `JWT_EXPIRES_IN` | String | No | `7d` | Session lifetime |
| `CLIENT_URL` | String | Yes | `https://your-frontend.vercel.app` | Whitelisted origin for CORS and credentials sharing |
| `SLA_CHECK_INTERVAL_MINUTES` | Number | No | `60` | Frequency in minutes for automated SLA deadline scanning |

### Frontend Environment Variables (`frontend/.env`)

| Variable | Type | Required | Default / Example | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| `VITE_API_URL` | String | Yes | `https://api.yourdomain.com/api/v1` | Base REST API endpoint used by client-side fetchers |

---

## 6. Pre-Flight Post-Deployment Checklist

Before public presentation or demonstration, verify each item:

- [ ] **Database Connectivity**: Open `GET /api/v1/health` in browser — ensure `"status": "UP"` and `"database": "CONNECTED"`.
- [ ] **Seed Data Present**: Log in with demo credentials `admin@aicte.gov.in` / `Password@123`.
- [ ] **CORS Configuration**: Verify browser console displays no `Cross-Origin Resource Sharing` errors when making API requests.
- [ ] **SPA Route Refresh**: In your browser, navigate to `/complaints/new` and press `Ctrl+F5` / `Cmd+Shift+R`. Ensure the page reloads cleanly without 404 (`vercel.json` / `_redirects` handles fallback).
- [ ] **Complaint Registration**: Submit a test grievance to confirm write permissions, automated concurrency reference generation (`CMP-YYYYMMDD-XXXXXX`), and duplicate detection engine execution.
- [ ] **File Attachments**: Upload a test PDF evidence document to ensure storage handles multipart payloads.
- [ ] **CSV Export**: Visit Analytics & Reports, click **"Export Complete Audit Registry (CSV)"**, and verify clean download.
