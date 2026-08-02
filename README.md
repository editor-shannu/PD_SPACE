# 🏥 MediFlow — AI-Powered Healthcare Navigation & Verification Platform

MediFlow is a modern, full-stack healthcare platform designed to streamline patient onboarding, automate clinical triaging, provide secure admin-governed doctor verification pipelines, and deliver actionable analytics for hospital administrators and physicians.

---

## 🌟 Key Features

### 1. Patient Portal & EMR Management Pipeline
* **Compulsory EMR Onboarding & Access Gate**: Enforces completion of a mandatory Electronic Medical Record (EMR) form (Personal Details, Primary Phone, Blood Group, Emergency Contact, Pre-existing Conditions, Allergies, Current Medications, Address) for all new and existing registered patients upon opening the dashboard. Unlocks full dashboard access only upon saving.
* **Strict Field Validation**: Ensures vital health metrics and emergency contacts are filled out accurately to assist attending doctors in clinical evaluations.
* **On-Demand Lifetime EMR Editing**: Integrated "Edit EMR Form" button and Verified Patient EMR Profile card directly on the Patient Dashboard header allowing patients to update their medical history at any time.
* **Smart Medical Document Upload**: Drag-and-drop ingestion accepting medical documents, handwritten prescriptions, and clinical reports (PDF, PNG, JPG).
* **Zero-Shot Validation**: Powered by a FastAPI microservice to detect and filter out non-medical documents before processing.
* **Hybrid OCR & AI Extraction**: Tesseract OCR extracts text, and the Google Gemini reasoning engine structures it into precise clinical schemas (diagnoses, medications, dosage, follow-up dates).
* **Intelligent AI Triage & Healthcare Guardrails**: Real-time triage analyzing symptoms alongside historical records, advising on recommended specialty and urgency levels. Outlines safety disclosures (*"This is AI-generated based on its knowledge. It may contain errors. Please verify with appropriate medical doctors before making any decisions."*).

### 2. Secure Admin-Governed Doctor Verification & Onboarding
* **Google OAuth & Standard Registration**: Medical professionals can sign up via Google OAuth or standard credentials.
* **Compulsory Doctor Verification Form**: Unapproved doctor applicants are presented with a compulsory verification form requiring Medical License Number, Department/Specialization, Hospital/Clinic Affiliation, Contact Phone, Years of Experience, and Academic Degrees.
* **Under Review Access Gate**: Application access remains restricted in `pending` status until verified by an Administrator.
* **Admin Verification Queue (`/dashboard/admin`)**: Administrators can review applicant credentials, inspect license numbers, and execute one-click **Approve** or **Reject** actions.
* **Mandatory 1-Week (7-Day) Cooling Period**: If an application is rejected, an automated 7-day cooling period is programmatically enforced by both the API (`/api/doctor/apply`) and UI. Displays a live days-remaining countdown card preventing premature re-applications.
* **Verified Doctor Directory**: Patient appointment booking displays only verified, admin-approved medical doctors.

### 3. Doctor Portal & Clinical Co-Pilot
* **Real-Time Appointment Notifications**: Displays active notification banners when patients book appointments with the doctor.
* **Pre-Consultation AI Summary**: Generates clinical history snapshots, medication timelines, and safety alerts for assigned patients.
* **Digital Checkup Completion & Signature**: Doctors can mark consultations as completed, record clinical notes, attach test result summaries, and sign with a verified digital doctor signature.
* **Real-Time Consultation Sync**: Completed consultation notes and doctor signatures instantly sync to the patient's dashboard.

### 4. Interactive Patient Care & Reminders
* **Interactive Medication & Appointment Reminders**: Patients can mark health reminders as completed, reset recurrence schedules, or update reminder status.
* **Context-Preserving Specialist Booking**: Triage recommendations are passed via secure URL parameters directly into the booking engine.

### 5. Admin Analytics & System Governance
* **Recharts Healthcare Analytics**: High-fidelity dark-navy dashboard tracking:
  * Missed follow-up rates (%)
  * Patient compliance scores (%)
  * Treatment timelines (average days to resolution)
  * Department appointment bottlenecks (interactive volume bar charts)
* **Real-Time System Logs**: Separate, audit-ready registration logs for verified doctors and registered patients.
* **LLM Operations Review**: Aggregated analytics sent to Gemini to generate concise operational recommendations and clinical solutions.

---

## 🔌 Tech Stack

* **Frontend**: Next.js 14 (App Router) + React 18 + TypeScript + Tailwind CSS / Vanilla CSS
* **Backend**: Next.js Serverless API Routes + FastAPI (Zero-Shot Medical Classification)
* **Database**: MongoDB + Mongoose + GridFS for file storage
* **AI & LLM**: Google Gemini API (`gemini-1.5-flash` / Gemini 3.5 series)
* **Analytics**: Recharts (Custom themed dark-mode charts)
* **Auth**: NextAuth.js (Firebase Google Sign-In, Credentials Auth & Developer Bypasses)

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

### 4. Developer Bypasses & Credentials
For testing in development mode:
* **Patient Dev Bypass**: Logs in as `test-patient@mediflow.care`.
* **Admin Access**: Logs in as primary admin (`heallink.care@gmail.com`) or test admin credentials (`mediflow@test.com` / `mediflow@2026`).

---

## 📁 Directory Structure

```
src/
├── app/                  → Next.js pages, layouts, and API endpoints
│   ├── api/
│   │   ├── admin/users   → Admin doctor approval/rejection API
│   │   ├── admin/stats   → Admin analytics calculation API
│   │   ├── doctor/apply  → Doctor verification form & 1-week cooling period API
│   │   ├── patient/      → Compulsory EMR profile save & fetch API
│   │   ├── recommend     → Symptom triage & specialty checker
│   │   └── documents/    → Upload & GridFS management
│   └── dashboard/        → Admin, Doctor, and Patient views
├── components/           → Shared UI widgets, EmrFormModal & PatientEmrGate
├── lib/                  → Auth options, DB connectors, alert engines
├── models/               → Mongoose schemas (User with Doctor Profile & EMR Profile, Document, Appointment)
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
