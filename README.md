# Snaply — Automated Receipt Ledger

Snaply is a modern, light-theme ledger application that transforms paper receipt photos into categorized transaction records. Powered by Google Gemini's vision model, Snaply automates entry logs, tracks category expenses, and updates dashboard metrics in real time.

---

## 🛠️ Tech Stack

<p align="center">
  <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React" />
  <img src="https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="TailwindCSS" />
  <br />
  <img src="https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white" alt="Python" />
  <img src="https://img.shields.io/badge/Django-092E20?style=for-the-badge&logo=django&logoColor=white" alt="Django" />
  <img src="https://img.shields.io/badge/SQLite-07405E?style=for-the-badge&logo=sqlite&logoColor=white" alt="SQLite" />
  <br />
  <img src="https://img.shields.io/badge/Google%20Gemini-121011?style=for-the-badge&logo=google-gemini&logoColor=FBBC05" alt="Gemini Vision" />
  <img src="https://img.shields.io/badge/Render-46E3B7?style=for-the-badge&logo=render&logoColor=white" alt="Render Hosting" />
</p>

---

## ✨ Features

- **Gemini-Powered OCR Vision:** Upload any receipt photo. The AI automatically parses items, quantity, prices, payment status, and categorization.
- **Interactive Data Visualizations:** Clean area charts showing daily transaction volumes and circular donut charts highlighting weekly category splits.
- **Audit Health Grade:** Keep track of compliance and bookkeeping performance with visual grading metrics (Audit Health Score & Grade cards).
- **Multi-Tenant Credentials:** Secure login, account registration, and Admin panel metrics scoped to specific account permissions.
- **Clean Light Theme Layout:** A modern, visual dashboard experience modeled after enterprise-grade SaaS aesthetics.
- **CSV Data Exporter:** One-click utility download of transaction ledgers in CSV formatting.

---

## 🚀 Quick Start Guide

### 1. Clone the repository
```bash
git clone https://github.com/Shiv-x0/Snaply.git
cd Snaply
```

### 2. Set up Backend API (Django)
Ensure you have Python 3.10+ installed.

```bash
# Navigate to backend
cd backend

# Create virtual environment & activate it
python -m venv venv
# On Windows:
.\venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

# Install requirements
pip install -r requirements.txt

# Run migrations & seed demo transactions
python manage.py migrate
python manage.py seed_data

# Start the Django server
python manage.py runserver
```
The API server will launch at `http://localhost:8000`.

*Demo Credentials:*
* **Standard Account:** User: `alex`, Password: `password123`
* **Admin Account:** User: `admin`, Password: `password123`

---

### 3. Set up Frontend Dashboard (React + Vite)
Ensure you have Node.js 18+ installed.

```bash
# Navigate to frontend
cd ../frontend

# Install dependencies
npm install

# Start local server
npm run dev
```
Open **`http://localhost:5173`** in your web browser to log in and start scanning!

---

## ☁️ Production Deployment on Render

Snaply includes a pre-configured `render.yaml` blueprint. To deploy:

1. Push this repository to your GitHub account.
2. Log in to your **Render Dashboard** and select **Blueprints**.
3. Link this repository. Render will spin up:
   - **Backend Web Service:** Builds and runs migrations via `build.sh` on Render.
   - **Frontend Static Site:** Compiles Vite resources and deploys to static storage.
