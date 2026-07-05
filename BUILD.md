# BUILD.md: ChaosLedger

## 1. Project Overview
**Pitch:** An AI-powered financial ledger for small businesses that ingests messy unstructured input — photos of paper receipts, WhatsApp-style text dumps, and voice notes — and instantly converts them into a structured ledger + live P&L dashboard. Zero data entry, zero new software habits for the shop owner.
**Target User:** A local cafe or retail shop owner who currently records daily sales in a WhatsApp group or on paper.
**Core "Wow" Moment:** The judge drops a photo of a messy handwritten receipt into the app, and the Recharts dashboard instantly ticks up with the new revenue without a single keystroke.
**Explicit Non-Goals:** NO user authentication. NO multi-tenancy. NO payment gateway integration. NO dark mode. NO complex settings pages. If it doesn't directly contribute to the 30-second demo, do not build it.

---

## 2. Architecture Diagram
```text
[ React Client (Vite) ]             [ Django Backend (DRF) ]
       |                                     |
       |--- POST /api/parse/ (text/img) ---> |
       |                                     |--- OpenAI API (GPT-4o / Vision)
       |                                     |
       |                                     |--- Parse JSON Response
       |                                     |--- Save to SQLite DB
       |                                     |
       |<--- 200 OK (Structured JSON) -------|
       |                                     |
       |--- GET /api/transactions/ --------->|
       |                                     |--- Query SQLite
       |<--- 200 OK (All Records) ----------|
       |                                     |
[ Recharts Dashboard Updates Instantly ]
```

---

## 3. Repo & Folder Structure
```text
chaos-ledger/
├── .gitignore
├── backend/
│   ├── .env                  # OPENAI_API_KEY, DJANGO_SECRET_KEY
│   ├── manage.py
│   ├── backend/              # Django project folder
│   │   ├── settings.py
│   │   ├── urls.py
│   │   └── wsgi.py
│   └── ledger/               # Django app
│       ├── models.py
│       ├── serializers.py
│       ├── views.py
│       ├── urls.py
│       └── management/
│           └── commands/
│               └── seed_data.py
└── frontend/
    ├── .env                  # VITE_API_BASE_URL=http://localhost:8000
    ├── package.json
    ├── vite.config.js
    ├── src/
    │   ├── main.jsx
    │   ├── App.jsx
    │   ├── components/
    │   │   ├── UploadPanel.jsx
    │   │   ├── Dashboard.jsx
    │   │   └── TransactionsTable.jsx
    │   └── index.css         # Tailwind directives
    └── index.html
```

**Root `.gitignore`:**
```text
# Python
__pycache__/
*.pyc
backend/.env
backend/db.sqlite3

# Node
node_modules/
frontend/dist
frontend/.env
```

---

## 4. Environment Setup

### Backend (Django)
```bash
# 1. Create folder and virtual environment
mkdir chaos-ledger && cd chaos-ledger
mkdir backend && cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# 2. Install dependencies
pip install django djangorestframework django-cors-headers python-dotenv openai

# 3. Initialize project and app
django-admin startproject backend .
python manage.py startapp ledger

# 4. Create backend/.env file
echo "OPENAI_API_KEY=sk-your-key-here" > .env
echo "DJANGO_SECRET_KEY=hackathon-insecure-key-12345" >> .env
```

### Frontend (React + Vite)
Open a new terminal tab:
```bash
# 1. Create Vite app
cd chaos-ledger
npm create vite@latest frontend -- --template react
cd frontend

# 2. Install dependencies
npm install
npm install tailwindcss @tailwindcss/vite recharts axios

# 3. Create frontend/.env file
echo "VITE_API_BASE_URL=http://localhost:8000" > .env
```

### Django CORS & Env Setup
In `backend/backend/settings.py`, add these to `INSTALLED_APPS`:
```python
'rest_framework',
'corsheaders',
'ledger',
```
Add `corsheaders.middleware.CorsMiddleware` to the **top** of `MIDDLEWARE`.
Add to bottom of `settings.py`:
```python
import os
from dotenv import load_dotenv
load_dotenv()

SECRET_KEY = os.environ.get('DJANGO_SECRET_KEY')
OPENAI_API_KEY = os.environ.get('OPENAI_API_KEY')

CORS_ALLOW_ALL_ORIGINS = True # Safe for local hackathon demo
```

---

## 5. Database Schema

**`backend/ledger/models.py`:**
```python
from django.db import models

class Transaction(models.Model):
    PAYMENT_METHODS = [('cash', 'Cash'), ('upi', 'UPI'), ('card', 'Card'), ('unknown', 'Unknown')]
    SOURCE_TYPES = [('text', 'Text'), ('image', 'Image'), ('voice', 'Voice'), ('seed', 'Seed')]

    item = models.CharField(max_length=200)
    quantity = models.IntegerField(default=1)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    payment_method = models.CharField(max_length=10, choices=PAYMENT_METHODS, default='unknown')
    category = models.CharField(max_length=100, blank=True, default="General")
    source_type = models.CharField(max_length=10, choices=SOURCE_TYPES, default='text')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.item} x{self.quantity} - {self.price}"
```

**Run Migrations:**
```bash
cd backend
python manage.py makemigrations ledger
python manage.py migrate
```

---

## 6. Backend Implementation

**`backend/ledger/serializers.py`:**
```python
from rest_framework import serializers
from .models import Transaction

class TransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Transaction
        fields = ['id', 'item', 'quantity', 'price', 'payment_method', 'category', 'source_type', 'created_at']
```

**`backend/ledger/views.py`:**
```python
import json
import base64
from rest_framework.response import Response
from rest_framework.decorators import api_view
from rest_framework import status
from django.conf import settings
from openai import OpenAI
from .models import Transaction
from .serializers import TransactionSerializer

client = OpenAI(api_key=settings.OPENAI_API_KEY)

SYSTEM_PROMPT = """
You are a data extraction bot for small Indian businesses. Extract ledger transactions from the provided input.
Return ONLY valid JSON matching this exact schema. No markdown fences, no commentary, no extra text.
Schema:
{
  "transactions": [{"item": "string", "qty": number, "price": number, "category": "string"}],
  "total": number,
  "payment_method": "cash" | "upi" | "card" | "unknown"
}
If the input is garbled or empty, return: {"transactions": [], "total": 0, "payment_method": "unknown"}
"""

@api_view(['POST'])
def parse_input(request):
    text_input = request.data.get('text', '').strip()
    image_file = request.FILES.get('image')
    source_type = 'text'

    if not text_input and not image_file:
        return Response({"error": "No text or image provided"}, status=status.HTTP_400_BAD_REQUEST)

    messages = [{"role": "system", "content": SYSTEM_PROMPT}]

    if image_file:
        source_type = 'image'
        image_data = base64.b64encode(image_file.read()).decode('utf-8')
        messages.append({
            "role": "user",
            "content": [
                {"type": "text", "text": "Extract the items, quantities, prices, and payment method from this receipt image."},
                {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{image_data}"}}
            ]
        })
    else:
        messages.append({"role": "user", "content": text_input})

    try:
        # Use gpt-4o for vision, gpt-4o-mini for text
        model = "gpt-4o" if source_type == 'image' else "gpt-4o-mini"
        response = client.chat.completions.create(
            model=model,
            messages=messages,
            temperature=0.0,
            max_tokens=1000
        )
        
        raw_content = response.choices[0].message.content.strip()
        # Fallback if AI wraps in ```json ... ```
        if raw_content.startswith("```"):
            raw_content = raw_content.split("\n", 1)[1].rsplit("```", 1)[0].strip()
            
        parsed_data = json.loads(raw_content)
        
    except json.JSONDecodeError:
        return Response({"error": "AI returned malformed data. Try again."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    except Exception as e:
        # Catches OpenAI API timeouts, rate limits, auth errors
        return Response({"error": f"AI Processing failed: {str(e)}"}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

    # Save to DB
    created_transactions = []
    for t in parsed_data.get('transactions', []):
        if not t.get('item'): continue
        txn = Transaction.objects.create(
            item=t['item'],
            quantity=t.get('qty', 1),
            price=t.get('price', 0),
            payment_method=parsed_data.get('payment_method', 'unknown'),
            category=t.get('category', 'General'),
            source_type=source_type
        )
        created_transactions.append(txn)

    return Response(TransactionSerializer(created_transactions, many=True).data, status=status.HTTP_201_CREATED)

@api_view(['GET'])
def get_transactions(request):
    transactions = Transaction.objects.all().order_by('-created_at')
    return Response(TransactionSerializer(transactions, many=True).data)
```

**`backend/ledger/urls.py`:**
```python
from django.urls import path
from . import views

urlpatterns = [
    path('api/parse/', views.parse_input, name='parse_input'),
    path('api/transactions/', views.get_transactions, name='get_transactions'),
]
```

**`backend/backend/urls.py`:**
```python
from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', include('ledger.urls')),
]
```

---

## 7. Frontend Implementation

**`frontend/vite.config.js`:**
```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
})
```

**`frontend/src/index.css`:**
```css
@import "tailwindcss";
```

**`frontend/src/main.jsx`:**
```jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

**`frontend/src/App.jsx`:**
```jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import UploadPanel from './components/UploadPanel';
import Dashboard from './components/Dashboard';
import TransactionsTable from './components/TransactionsTable';

const API_BASE = import.meta.env.VITE_API_BASE_URL;

export default function App() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchTransactions = async () => {
    const res = await axios.get(`${API_BASE}/api/transactions/`);
    setTransactions(res.data);
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const handleParseSuccess = () => {
    fetchTransactions(); // Re-fetch to trigger UI update
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 p-6 font-sans">
      <header className="mb-8 border-b pb-4">
        <h1 className="text-3xl font-bold text-blue-600">ChaosLedger</h1>
        <p className="text-gray-500">Zero-entry financial tracking for SMEs</p>
      </header>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Input */}
        <div className="lg:col-span-1">
          <UploadPanel onSuccess={handleParseSuccess} setLoading={setLoading} />
        </div>

        {/* Right Column: Data */}
        <div className="lg:col-span-2 space-y-8">
          <Dashboard transactions={transactions} />
          <TransactionsTable transactions={transactions} />
        </div>
      </div>
    </div>
  );
}
```

**`frontend/src/components/UploadPanel.jsx`:**
```jsx
import React, { useState } from 'react';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL;

export default function UploadPanel({ onSuccess, setLoading }) {
  const [text, setText] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!text.trim()) return;

    setLoading(true);
    try {
      await axios.post(`${API_BASE}/api/parse/`, { text });
      setText('');
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to parse");
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setLoading(true);
    setError('');
    const formData = new FormData();
    formData.append('image', file);

    try {
      await axios.post(`${API_BASE}/api/parse/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      e.target.value = ''; // reset input
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to parse image");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow border">
      <h2 className="text-xl font-semibold mb-4">Log Sale</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Paste WhatsApp message / Notes</label>
          <textarea 
            className="w-full p-3 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            rows="4"
            placeholder="bhai 3 coffee 150 rs cash diya, 2 sandwich 200 upi"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </div>
        <button 
          type="submit" 
          className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400"
          disabled={loading}
        >
          {loading ? 'Processing...' : 'Parse Text'}
        </button>
      </form>

      <div className="mt-6 pt-6 border-t">
        <label className="block text-sm font-medium text-gray-700 mb-2">Or Upload Receipt Photo</label>
        <input 
          type="file" 
          accept="image/*" 
          onChange={handleImageUpload} 
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        />
      </div>

      {error && <p className="mt-4 text-sm text-red-600 font-medium">{error}</p>}
    </div>
  );
}
```

**`frontend/src/components/Dashboard.jsx`:**
```jsx
import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function Dashboard({ transactions }) {
  const chartData = useMemo(() => {
    const grouped = transactions.reduce((acc, t) => {
      const date = new Date(t.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      if (!acc[date]) acc[date] = { date, revenue: 0 };
      acc[date].revenue += parseFloat(t.price) * t.quantity;
      return acc;
    }, {});
    return Object.values(grouped).reverse();
  }, [transactions]);

  const totalRevenue = chartData.reduce((sum, day) => sum + day.revenue, 0);

  return (
    <div className="bg-white p-6 rounded-lg shadow border">
      <div className="flex justify-between items-end mb-6">
        <h2 className="text-xl font-semibold">Revenue Overview</h2>
        <p className="text-2xl font-bold text-green-600">₹{totalRevenue.toFixed(2)}</p>
      </div>
      
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip formatter={(value) => [`₹${value.toFixed(2)}`, "Revenue"]} />
            <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
```

**`frontend/src/components/TransactionsTable.jsx`:**
```jsx
import React from 'react';

export default function TransactionsTable({ transactions }) {
  return (
    <div className="bg-white p-6 rounded-lg shadow border">
      <h2 className="text-xl font-semibold mb-4">Recent Transactions</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b font-medium text-gray-700">
            <tr>
              <th className="py-3 px-4">Item</th>
              <th className="py-3 px-4">Qty</th>
              <th className="py-3 px-4">Price</th>
              <th className="py-3 px-4">Method</th>
              <th className="py-3 px-4">Source</th>
            </tr>
          </thead>
          <tbody>
            {transactions.slice(0, 10).map((t) => (
              <tr key={t.id} className="border-b hover:bg-gray-50">
                <td className="py-3 px-4 capitalize">{t.item}</td>
                <td className="py-3 px-4">{t.quantity}</td>
                <td className="py-3 px-4 font-medium">₹{t.price}</td>
                <td className="py-3 px-4">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    t.payment_method === 'upi' ? 'bg-blue-100 text-blue-700' : 
                    t.payment_method === 'cash' ? 'bg-green-100 text-green-700' : 'bg-gray-100'
                  }`}>
                    {t.payment_method}
                  </span>
                </td>
                <td className="py-3 px-4 text-gray-500">{t.source_type}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

---

## 8. Stretch Feature (Image vs Voice)

**PRIMARY: Image Input (Already built into the code above)**
*   *How it works:* File uploaded in React -> `FormData` -> Django reads `request.FILES['image']` -> Base64 encodes -> Sends to `gpt-4o` with vision capabilities -> Parses to same JSON schema.
*   *Why this wins:* Visual proof is undeniable for judges.

**SECONDARY (CUT IF BEHIND SCHEDULE): Voice Input**
*   *If you have time:* 
    1. Add `<input type="file" accept="audio/*">` to `UploadPanel.jsx`.
    2. In `views.py`, read the file, send to `client.audio.transcriptions.create(model="whisper-1", file=audio_file)`.
    3. Take the returned `.text` string and pass it directly into the `messages` list exactly like the text input. Do NOT duplicate the GPT logic.

---

## 9. Demo Data Seeding Script

Creates a `seed_data` command to populate the DB so the graph isn't empty when you open the app.

Create `backend/ledger/management/__init__.py` (empty file).
Create `backend/ledger/management/commands/__init__.py` (empty file).
Create `backend/ledger/management/commands/seed_data.py`:

```python
from django.core.management.base import BaseCommand
from ledger.models import Transaction
from datetime import datetime, timedelta
import random

class Command(BaseCommand):
    help = 'Seeds the database with realistic demo data'

    def handle(self, *args, **kwargs):
        Transaction.objects.filter(source_type='seed').delete()
        
        items = [
            ("Masala Chai", 20, "Food"), ("Espresso", 150, "Food"), ("Sandwich", 100, "Food"),
            ("Cake Slice", 80, "Food"), ("Pen", 15, "Stationery"), ("Notebook", 50, "Stationery")
        ]
        methods = ['cash', 'upi', 'card']

        for i in range(3):
            date = datetime.now() - timedelta(days=i)
            for _ in range(random.randint(5, 12)):
                item, price, cat = random.choice(items)
                qty = random.randint(1, 4)
                Transaction.objects.create(
                    item=item,
                    quantity=qty,
                    price=price * qty,
                    payment_method=random.choice(methods),
                    category=cat,
                    source_type='seed',
                    created_at=date.replace(hour=random.randint(9, 20), minute=random.randint(0, 59))
                )
        self.stdout.write(self.style.SUCCESS('Successfully seeded demo data!'))
```

**Run it:** `python manage.py seed_data`

---

## 10. Testing Checklist (30 mins before presenting)
- [ ] Does the frontend load at `localhost:5173` without white-screen errors?
- [ ] Is the dashboard pre-populated with 3 days of seed data?
- [ ] **The Core Test:** Paste `"bhai 2 coffee 100 rs upi"` -> Click Parse -> Does the table update AND does the graph bar increase instantly?
- [ ] **The Image Test:** Upload a receipt photo -> Does it return 200 OK and add to the ledger?
- [ ] **Empty Input Test:** Hit parse with empty box -> Does it show a clean error message, NOT a Python stack trace?
- [ ] **Garbled Input Test:** Paste `"asdfghjkl"` -> Does it fail gracefully without crashing the server?
- [ ] If venue Wi-Fi drops, does the local server still run? (Yes, only OpenAI API call will fail).

---

## 11. Deployment Steps

**Plan A: Local Run (HIGHLY RECOMMENDED FOR HACKATHONS)**
1. Terminal 1: `cd backend && source venv/bin/activate && python manage.py runserver`
2. Terminal 2: `cd frontend && npm run dev`
3. Present from `http://localhost:5173`. This avoids all CORS and deployment headaches.

**Plan B: Render + Vercel (If forced/for extra points)**
1. **Vercel (Frontend):**
   - Connect GitHub repo.
   - Root Directory: `frontend`
   - Build Command: `npm run build`
   - Environment Variable: `VITE_API_BASE_URL=https://your-render-url.onrender.com`
2. **Render (Backend):**
   - New Web Service -> Connect Repo.
   - Build Command: `pip install -r requirements.txt` (You must run `pip freeze > requirements.txt` first).
   - Start Command: `gunicorn backend.wsgi:application` (Run `pip install gunicorn` locally first).
   - Environment Variables: Add `OPENAI_API_KEY`, `DJANGO_SECRET_KEY`, set `CORS_ALLOWED_ORIGINS` to your Vercel URL.

---

## 12. Demo Script

**Word-for-word opening line:** 
*"I'm going to show you how a local cafe owner does their month-end bookkeeping in 30 seconds."*

**Sequence of actions:**
1. *(Point to the populated dashboard)* "Right now, you're looking at 3 days of sales data. Notice we already know our revenue mix between cash and UPI."
2. *(Open WhatsApp on your phone, show a fake chat with a shopkeeper: 'bhai 4 samosa 80 rs cash, 2 chai 40 rs upi')* "This is how businesses actually operate in the real world. On WhatsApp."
3. *(Copy the text, paste into the app, hit Parse)* 
4. **WHAT TO SAY DURING THE 2-3 SECONDS OF LOADING:** "Behind the scenes, we aren't doing any regex or rigid templates. We're sending this to GPT-4o-mini, forcing it to isolate items, quantities, and payment methods, and mapping it directly into our database."
5. *(Graph ticks up, table updates)* "Done. Zero data entry. And if they don't even want to type it out..."
6. *(Upload the crumpled receipt photo)* "...they just snap a photo of their physical receipt. We use GPT-4o Vision, extract the exact same structured data, and the ledger updates."
7. *(Stop talking. Let the judge look at the screen).*

---

## 13. Judging Criteria Alignment Table

| Criterion | What to Emphasize Verbally | Feature in Build |
| :--- | :--- | :--- |
| **Innovation** | "We don't force SMEs to change their habits; we ingest their existing chaos." | Unstructured text/image parsing instead of standard CRUD forms. |
| **Business Impact** | "This gives a 0-tech shop owner enterprise-grade P&L visibility instantly." | The Recharts dashboard generated purely from messy inputs. |
| **Technical Depth** | "Reliable AI output requires strict schema enforcement and error handling." | The System Prompt, JSON stripping logic, and `try/except` blocks in `views.py`. |
| **Wow Factor** | *(Show, don't tell — do the receipt photo upload)* | The instant graph update after an image upload. |
| **UI/UX** | "Clean enough to use on a cheap Android tablet at a cash counter." | Tailwind dashboard, clear payment method badges, no clutter. |

---

## If You're Behind Schedule, Cut In This Order

1. **CUT IMMEDIATELY:** Voice input logic. Don't even think about it.
2. **CUT AT HOUR 10:** Image parsing. If text-to-JSON and the dashboard work flawlessly, you have a winning MVP. Hide the image upload button with CSS (`hidden`) if you have to.
3. **CUT AT HOUR 12:** Recharts formatting. Replace with plain text "Total Revenue: ₹X" if the chart library is fighting you.
4. **CUT AT HOUR 14:** Demo data seeding. Just manually type 3 things into the text box before the judges arrive.
5. **NEVER CUT:** The core `POST /api/parse/` text endpoint and the database save. Without that, you have no product.
