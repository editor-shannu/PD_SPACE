# 🏥 MediFlow — AI-Powered Healthcare Navigation & Verification Platform

MediFlow is a modern, full-stack healthcare platform designed to streamline patient onboarding, automate clinical triaging, provide secure admin-governed doctor verification pipelines, and deliver actionable analytics for hospital administrators and physicians.

---

## 🌟 Comprehensive Feature Overview

### 1. Patient Portal & EMR Management Pipeline
* **Compulsory EMR Onboarding & Access Gate (`PatientEmrGate`)**: Enforces completion of a mandatory Electronic Medical Record (EMR) form (Personal Details, Primary Phone, Blood Group, Emergency Contact, Pre-existing Conditions, Allergies, Current Medications, Address) for all new and existing registered patients upon opening the dashboard. Unlocks full dashboard access only upon saving.
* **Strict Field Validation**: Required field indicators ensure critical health metrics and emergency contacts are filled out accurately to assist attending doctors in clinical evaluations.
* **On-Demand Lifetime EMR Editing (`EmrFormModal`)**: Integrated "Edit EMR Form" button and Verified Patient EMR Profile card directly on the Patient Dashboard header allowing patients to update their medical history at any time.
* **Smart Medical Document Upload (`DocumentUpload`)**: Drag-and-drop ingestion accepting medical documents, handwritten prescriptions, and clinical reports (PDF, PNG, JPG).
* **Zero-Shot Validation**: Powered by a FastAPI microservice to detect and filter out non-medical documents before processing.
* **Hybrid OCR & AI Extraction**: Tesseract OCR extracts text, and the Google Gemini reasoning engine structures it into precise clinical schemas (diagnoses, medications, dosage, follow-up dates).
* **Intelligent AI Triage & Healthcare Guardrails**: Real-time triage analyzing symptoms alongside historical records, advising on recommended specialty and urgency levels. Outlines safety disclosures (*"This is AI-generated based on its knowledge. It may contain errors. Please verify with appropriate medical doctors before making any decisions."*).

### 2. Secure Admin-Governed Doctor Verification & Onboarding
* **Google OAuth & Standard Sign-In**: Medical professionals can sign up via Google OAuth or standard email/password credentials.
* **Compulsory Doctor Verification Form**: Unapproved doctor applicants are presented with a compulsory verification form requiring Medical License Number, Department/Specialization, Hospital/Clinic Affiliation, Contact Phone, Years of Experience, and Academic Degrees.
* **Patient Account Access Restriction**: Accounts registered as a **Patient** (who have completed EMR as a patient) are restricted from signing in or accessing the Doctor Portal, displaying a clear restriction warning card directing them to the Patient Dashboard.
* **Under Review Access Gate**: Application access remains restricted in `pending` status until verified by an Administrator.
* **Admin Verification Queue (`/dashboard/admin`)**: Administrators can review applicant credentials, inspect license numbers, and execute one-click **Approve & Grant Doctor Access** or **Reject Application**.
* **Mandatory 1-Week (7-Day) Cooling Period**: If an application is rejected, an automated 7-day cooling period is programmatically enforced by both the API (`/api/doctor/apply`) and UI. Displays a live days-remaining countdown card preventing premature re-applications.
* **Verified Doctor Directory (`/api/doctors`)**: Patient appointment booking displays only verified, admin-approved medical doctors.

### 3. Doctor Portal, Data Isolation & Referral System
* **Strict Patient Data Isolation**: The patient directory (`/api/doctor/patients`) is strictly filtered to only display patients who have booked an appointment with the logged-in doctor, have been formally referred to them by a colleague, or have associated document records.
* **Doctor-to-Doctor Patient Referrals (`ReferralModel` & `/api/doctor/refer`)**: Physicians can seamlessly transfer patient access and clinical handover notes to available verified doctor specialists within the portal.
* **Referral Management Dashboard (`🔄 Referrals Log`)**: Dedicated referral queue displaying incoming and outgoing cross-consultations with status tracking, sending doctor details, target doctor specialization, and clinical handover notes.
* **Multi-Touch Referral Actions**: "Refer 🔄" action buttons integrated directly into Patient Cards, Appointment Queue items, and the AI Pre-Consultation Summary header for one-click referral modal launches.
* **Real-Time Appointment Notifications**: Displays active notification banners when patients book appointments with the doctor, including referred patient bookings.
* **Pre-Consultation AI Summary**: Generates clinical history snapshots, medication timelines, and safety alerts for assigned patients powered by Gemini API.
* **Digital Checkup Completion & Signature**: Doctors can mark consultations as completed, record clinical notes, attach test result summaries, and sign with a verified digital doctor signature.
* **Restricted Consultation Audit Log (`📜 Consulted Logs`)**: Dedicated audit log in the Doctor Dashboard restricted exclusively to patients who have completed checkups with that doctor.
* **Real-Time Consultation Sync**: Completed consultation notes, test results, and doctor signatures instantly sync to the patient's dashboard.

### 4. Interactive Patient Care & Reminders
* **Interactive Medication & Appointment Reminders**: Patients can mark health reminders as completed, reset recurrence schedules, or update reminder status.
* **Context-Preserving Specialist Booking**: Triage recommendations are passed via secure URL parameters directly into the booking engine.

### 5. Admin Analytics & System Governance
* **Recharts Healthcare Analytics**: High-fidelity dark-navy dashboard tracking:
  * Missed follow-up rates (%)
  * Patient compliance scores (%)
  * Treatment timelines (average days to resolution)
  * Department appointment bottlenecks (interactive volume bar charts)
* **Real-Time System Registration Logs**: Separate, audit-ready registration logs for verified doctors and registered patients.
* **LLM Operations Review**: Aggregated analytics sent to Gemini to generate concise operational recommendations and clinical solutions.

---

## 📁 Repository & Folder Architecture

```
PD_SPACE/
├── src/
│   ├── app/                                → Next.js App Router Structure
│   │   ├── api/                            → Serverless API Routes
│   │   │   ├── admin/
│   │   │   │   ├── stats/route.ts          → Analytics calculation endpoint
│   │   │   │   └── users/route.ts          → Doctor application approval/rejection & user log endpoint
│   │   │   ├── alerts/route.ts             → Clinical safety alerts endpoint
│   │   │   ├── appointments/route.ts       → Patient booking & doctor checkup completion endpoint
│   │   │   ├── auth/[...nextauth]/route.ts → NextAuth authentication handler
│   │   │   ├── doctor/
│   │   │   │   ├── apply/route.ts          → Doctor verification form & 1-week cooling period API
│   │   │   │   ├── patients/route.ts       → Isolated assigned/referred patient list API
│   │   │   │   ├── refer/route.ts          → Doctor-to-doctor patient referral creation & retrieval API
│   │   │   │   ├── role/route.ts           → User role query API
│   │   │   │   └── summary/route.ts        → Gemini AI patient summary generator API
│   │   │   ├── doctors/route.ts            → Filtered list of verified, approved doctors API
│   │   │   ├── documents/                  → File upload, GridFS & retrieval endpoints
│   │   │   ├── extract/route.ts            → AI document parsing endpoint
│   │   │   ├── facilities/route.ts         → Nearby hospital & clinic location locator
│   │   │   ├── health/route.ts             → Healthcheck ping endpoint
│   │   │   ├── ocr/route.ts                → Tesseract OCR text extraction endpoint
│   │   │   ├── patient/
│   │   │   │   └── profile/route.ts        → Compulsory patient EMR profile save & fetch API
│   │   │   └── recommend/route.ts          → AI symptom triage & specialty checker endpoint
│   │   ├── auth/                           → Sign-in & Sign-up views
│   │   │   ├── login/page.tsx              → Credentials & Google login page
│   │   │   └── register/page.tsx           → User registration page
│   │   ├── dashboard/                      → App Role Dashboards
│   │   │   ├── admin/page.tsx              → Admin analytics, doctor verification queue & user registration logs
│   │   │   ├── doctor/page.tsx             → Doctor Portal (Verification Form, Data Isolation, Referrals Log & Co-pilot)
│   │   │   └── patient/page.tsx            → Patient Portal (EMR Gate, Uploads, Triage, Appointments & Reminders)
│   │   ├── globals.css                     → Design system & custom CSS variables
│   │   ├── layout.tsx                      → Root application layout & NextAuth Provider wrapper
│   │   └── page.tsx                        → Landing page
│   ├── components/                         → Reusable UI Components
│   │   ├── ConfirmExtraction.tsx           → Extraction verification modal
│   │   ├── DocumentDetailModal.tsx         → Medical document viewer
│   │   ├── DocumentList.tsx                → Uploaded medical records list
│   │   ├── DocumentUpload.tsx              → Drag-and-drop document upload widget
│   │   ├── EmrFormModal.tsx                → Compulsory Patient EMR registration modal
│   │   ├── FacilityMap.tsx                 → Interactive clinic/hospital map component
│   │   ├── OCRPreview.tsx                  → Raw OCR text preview widget
│   │   ├── PatientEmrGate.tsx              → EMR completion enforcement gate
│   │   └── Providers.tsx                   → NextAuth SessionProvider wrapper
│   ├── lib/                                → Application Services & Core Libraries
│   │   ├── alertEngine.ts                  → Drug conflict & missed follow-up logic
│   │   ├── auth.ts                         → NextAuth options & credential providers
│   │   ├── cron.ts                         → Automated clinical alert scheduler
│   │   ├── db.ts                           → MongoDB Mongoose connection utility
│   │   ├── firebase.ts                     → Firebase OAuth helper
│   │   └── validation.ts                   → Input sanitization & schemas
│   ├── middleware.ts                       → Route authentication & session guards
│   ├── models/                             → Mongoose Database Schemas
│   │   ├── alert.ts                        → Clinical alert model
│   │   ├── appointment.ts                  → Patient booking & doctor consultation sign-off schema
│   │   ├── document.ts                     → Medical document metadata schema
│   │   ├── referral.ts                     → Doctor-to-doctor patient referral schema
│   │   └── user.ts                         → User model with EMR profile & Doctor application profile
│   ├── types/                              → TypeScript Type Definitions
│   │   ├── documents.ts                    → User, EMR Profile, Doctor Profile & Document interfaces
│   │   └── index.ts                        → Shared type exports
│   └── utils/                              → Utility Helper Functions
│       └── ocr.ts                          → Tesseract OCR helper utilities
├── secrets.env                             → Environment secrets configuration
└── package.json                            → Dependencies & script definitions
```

---

## 🔌 Tech Stack

* **Frontend Framework**: Next.js 14 (App Router) + React 18 + TypeScript + Tailwind CSS / Vanilla CSS
* **Backend Architecture**: Next.js Serverless API Routes + FastAPI Microservice (Zero-Shot Medical Classification)
* **Database & Storage**: MongoDB + Mongoose Schemas + GridFS (for PDF/image file storage)
* **AI & Reasoning**: Google Gemini API (`gemini-1.5-flash` / Gemini 3.5 series)
* **OCR Engine**: Tesseract.js (Multi-format image & document OCR processing)
* **Analytics & Visualizations**: Recharts (Custom themed dark-navy healthcare analytics)
* **Authentication**: NextAuth.js (Google OAuth, Credentials Auth & Developer Bypass Routes)

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

### 4. Developer Access Credentials
For rapid walkthroughs and role testing in development mode:
* **Patient Dev Bypass**: Logs in as `test-patient@mediflow.care`.
* **Admin Access Credentials**: Logs in as primary admin (`heallink.care@gmail.com`) or test admin credentials (`mediflow@test.com` / `mediflow@2026`).

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
