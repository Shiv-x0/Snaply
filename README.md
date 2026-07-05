# Snaply — Automated Receipt Ledger

Snaply is a modern, enterprise-grade bookkeeping application that transforms paper receipt photos into structured transaction records. Powered by Gemini 2.5 Flash, Snaply automates receipt ingestion, extracts line-item totals, determines payment methods, classifies expenditures, and generates interactive dashboard visualizations in real-time.

Live Application: **[https://snaply-d43h.vercel.app/](https://snaply-d43h.vercel.app/)**

---

## Tech Stack

<p align="left">
  <img src="https://img.shields.io/badge/React-20232A?style=flat-square&logo=react&logoColor=61DAFB" alt="React" />
  <img src="https://img.shields.io/badge/Vite-646CFF?style=flat-square&logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white" alt="TailwindCSS" />
  <img src="https://img.shields.io/badge/Python-3776AB?style=flat-square&logo=python&logoColor=white" alt="Python" />
  <img src="https://img.shields.io/badge/Django-092E20?style=flat-square&logo=django&logoColor=white" alt="Django" />
  <img src="https://img.shields.io/badge/SQLite-07405E?style=flat-square&logo=sqlite&logoColor=white" alt="SQLite" />
  <img src="https://img.shields.io/badge/Google%20Gemini%20API-121011?style=flat-square&logo=google-gemini&logoColor=FBBC05" alt="Gemini API" />
  <img src="https://img.shields.io/badge/Render-46E3B7?style=flat-square&logo=render&logoColor=white" alt="Render" />
  <img src="https://img.shields.io/badge/Vercel-000000?style=flat-square&logo=vercel&logoColor=white" alt="Vercel" />
</p>

---

## Key Features

- **Zero-Authentication Access:** Streamlined visitor experience allowing immediate interaction. Every visitor accesses a shared sandbox ledger automatically.
- **Gemini Ingestion Engine:** Multimodal receipt ingestion utilizing the official `google-genai` SDK. Supports extracting unit prices, item quantities, payment channels, and transaction dates.
- **Saas-Style Aesthetics:** Modeled directly after Render's clean, professional visual layout—featuring dark indigo accent patterns, flat card elements, and clear data grids.
- **Activity Visualization:** Revenue trend area charts and category-breakdown donut graphs built using Recharts.
- **Audit Analytics:** Automatic calculations of average transaction values, monthly volume growth, and bookkeeping audit health scores.
- **CSV Exporter:** Download transaction history files instantly for spreadsheets.

---

## Getting Started Locally

### 1. Clone the Repository
```bash
git clone https://github.com/Shiv-x0/Snaply.git
cd Snaply
```

### 2. Configure Backend API (Django)
Ensure Python 3.10+ is installed.

```bash
# Navigate to backend directory
cd backend

# Create and activate virtual environment
python -m venv venv
# Windows:
.\venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run migrations
python manage.py migrate

# Seed baseline demo data
python manage.py seed_data
```

Create a `.env` file inside the `backend/` directory:
```env
GEMINI_API_KEY=your_google_ai_studio_api_key
DJANGO_SECRET_KEY=local_development_secret_key
DEBUG=True
```

Start the Django development server:
```bash
python manage.py runserver
```
The backend API will run at `http://localhost:8000`.

---

### 3. Configure Frontend (React + Vite)
Ensure Node.js 18+ is installed.

```bash
# Navigate to frontend directory
cd ../frontend

# Install node packages
npm install
```

Create a `.env` file inside the `frontend/` directory:
```env
VITE_API_BASE_URL=http://localhost:8000
```

Start the Vite development server:
```bash
npm run dev
```
Open your browser to `http://localhost:5173`.

---

## Production Deployment Architecture

This project is optimized for a split-deployment configuration:

### Backend (Render Web Service)
- **Root Directory:** `backend`
- **Build Command:** `./build.sh`
- **Start Command:** `gunicorn backend.wsgi:application`
- **Environment Variables:**
  - `GEMINI_API_KEY`: Google AI Studio API key
  - `DJANGO_SECRET_KEY`: Django application secret key
  - `PYTHON_VERSION`: `3.11.0`

### Frontend (Vercel Static Hosting)
- **Root Directory:** `frontend`
- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- **Environment Variables:**
  - `VITE_API_BASE_URL`: Live Render backend URL (e.g. `https://snaply-backend.onrender.com`)
