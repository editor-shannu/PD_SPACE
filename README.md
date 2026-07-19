# 🏥 MediFlow — AI-Powered Healthcare Navigation Platform

MediFlow is a modern, full-stack healthcare platform designed to streamline patient onboarding, automate clinical triaging, and provide actionable analytics for hospital administrators and physicians.

---

## 🌟 Key Features

### 1. Patient Portal & Document Pipeline
* **Smart Upload**: Drag-and-drop system accepting medical documents, handwritten prescriptions, and clinical reports (PDF, PNG, JPG).
* **Zero-Shot Validation**: Powered by a FastAPI microservice to detect and filter out non-medical documents before extraction.
* **Hybrid OCR & AI Extraction**: Tesseract OCR extracts text, and the Google Gemini reasoning engine structures it into precise clinical schemas (diagnoses, medications, dosage, follow-up dates).
* **AI Symptom Checker**: Real-time triage analyzing current symptoms alongside historical records, advising on recommended specialty (e.g., Infectious Diseases, Cardiology) and urgency level.

### 2. Specialist Booking & Prefill
* **Context-Preserving Redirection**: Triage recommendations are passed via secure URL parameters directly into the booking engine.
* **Auto-Prefill**: Automatically selects the recommended department and specialist (e.g., Infectious Diseases), populating patient notes with zero re-entry.

### 3. Doctor Portal & Clinical Co-Pilot
* **Patient Overview**: Clear listing of assigned patients and clinical records.
* **Clinical Alert Engine**: Automatically checks for medication conflicts, duplicate prescriptions, and missed follow-up appointments.
* **Gemini Case Summaries**: Instantly generates short clinical history snapshots for physicians.

### 4. Admin Dashboard (Module C)
* **Recharts Analytics**: High-fidelity dark-navy dashboard tracking:
  * Missed follow-up rates (%)
  * Patient compliance scores (%)
  * Treatment timelines (average days to resolution)
  * Department appointment bottlenecks (interactive volume bar charts)
* **LLM Operations Review**: Sends aggregated analytics to Gemini to generate concise operational recommendations and clinical solutions.

---

## 🔌 Tech Stack

* **Frontend**: Next.js 14 (App Router) + React 18 + TypeScript + Vanilla CSS / Tailwind CSS
* **Backend**: Next.js Serverless Routes + FastAPI (Zero-Shot Medical Classification)
* **Database**: MongoDB + Mongoose + GridFS for file storage
* **AI & LLM**: Google Gemini API (`gemini-1.5-flash` / Gemini 3.5 series)
* **Analytics**: Recharts (Custom themed dark-mode charts)
* **Auth**: NextAuth.js (Firebase Google Sign-In & Developer-only Local Bypasses)

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Secrets
Create a `secrets.env` (or `.env.local`) file in the project root:
```env
MONGODB_URI=your_mongodb_connection_string
GEMINI_API_KEY=your_gemini_api_key
NEXTAUTH_SECRET=your_nextauth_session_secret
NEXTAUTH_URL=http://localhost:3000
NEXT_PUBLIC_FASTAPI_URL=your_fastapi_microservice_url
```

### 3. Run Development Server
```bash
npm run dev
```
Open **http://localhost:3000** (or http://localhost:3001 if port 3000 is occupied).

### 4. Developer Bypasses
For testing in development mode, we have added dual passwordless login bypasses to simplify roles walkthroughs:
* **Patient Dev Bypass**: Logs in as `test-patient@mediflow.care`.
* **Admin Dev Bypass**: Logs in as the primary admin (`heallink.care@gmail.com`).

---

## 📁 Directory Structure

```
src/
├── app/                  → Next.js pages, layouts, and API endpoints
│   ├── api/
│   │   ├── admin/stats   → Admin analytics calculation API
│   │   ├── recommend     → Symptom triage & specialty checker
│   │   └── documents/    → Upload & GridFS management
│   └── dashboard/        → Admin, Doctor, and Patient views
├── components/           → Shared UI widgets and alerts
├── lib/                  → Auth options, DB connectors, alert engines
├── models/               → Mongoose schemas (User, Document, Appointment)
└── utils/                → Helper functions (OCR, local parsers)
```

---

## 📝 CLI & Quality Assurance

```bash
# Type checking
npm run type-check

# Lint checks
npm run lint

# Production compilation
npm run build
```
