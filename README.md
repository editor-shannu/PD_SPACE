# 🏥 MediFlow — AI-Powered Multi-Tenant Healthcare Ecosystem

MediFlow is a modern, enterprise-grade multi-tenant healthcare platform designed to streamline patient onboarding, automate clinical triaging via Gemini AI, support isolated hospital administration portals across dedicated subdomains, and deliver real-time analytics for health administrators and physicians.

---

## 🌐 Subdomain Routing & Isolation Architecture

MediFlow uses dynamic, domain-level routing enforced by Next.js middleware (`middleware.ts`) to isolate roles, ensure data privacy, and eliminate route collisions across dedicated subdomains:

| Subdomain Domain | Portal View | Description & Access Control |
| :--- | :--- | :--- |
| **`mediflow.shanmukhmedisetty.site`** | **Main Landing Page** | Public platform showcase detailing application capabilities, clinical facilities, subdomain portal links, and the Hospital Collaboration Onboarding form. |
| **`patient-mediflow.shanmukhmedisetty.site`** | **Patient Portal** | Isolated patient dashboard (`/dashboard/patient`) for medical document uploads, EMR management, symptom triage, and appointments. |
| **`doctor-mediflow.shanmukhmedisetty.site`** | **Doctor Portal** | Isolated physician portal (`/dashboard/doctor`) for patient consultations, referral handovers, checkup sign-offs, and appointment queues. |
| **`admin-mediflow.shanmukhmedisetty.site`** | **Main Admin Portal** | Enterprise system dashboard (`/dashboard/admin`) for platform analytics, hospital partnership approvals, and individual doctor verification queues. |
| **`medi-hospadmin.shanmukhmedisetty.site`** | **Hospital Admin Portal** | Dedicated hospital admin portal (`/hospadmin`) for collaborated hospitals to manage affiliated staff doctors and monitor hospital clinical data. |

---

## 🌟 Comprehensive Feature Overview

### 1. Multi-Tenant Hospital Collaboration & Administration
* **Hospital Partnership Onboarding (`/api/hospital/apply`)**: Hospitals submit collaboration requests directly from the landing page or API, specifying legal name, address, contact email, phone, bed capacity, specialties, and collaboration goals.
* **Main Admin Review & Approval (`/api/admin/hospitals`)**: Main Administrators review pending hospital applications, inspect bed capacity/specialties, and execute one-click **Approve** or **Reject** decisions.
* **Automated Credential & Hospital ID Generation**: Upon approval, the system programmatically generates a unique `Hospital ID` (e.g. `HOSP-8F92A`) and creates a secure `hospital_admin` user account with temporary login credentials.
* **Dedicated Hospital Admin Dashboard (`/hospadmin`)**: Hospital administrators sign in via `medi-hospadmin.shanmukhmedisetty.site` using their generated Hospital ID / email. Provides an isolated workspace to:
  * Review and approve/reject doctor verification requests submitted specifically for their hospital.
  * View active staff doctor rosters and hospital doctor counts.
  * Monitor patient consultation volume and hospital clinical statistics.
* **Hospital Credentials Rotation (`/api/hospital/password`)**: Enables hospital administrators to securely update their login credentials and rotate temporary passwords.

### 2. Dual-Queue Doctor Verification & Affiliation Routing
* **Practice Type Selection**: Doctors registering on the platform choose between two affiliation paths:
  1. **Individual Practice Doctor**: Request routes directly to the **Main Admin** (`admin-mediflow.shanmukhmedisetty.site`) approval queue.
  2. **Hospital Affiliated Doctor**: Doctor selects an approved partner hospital from the live hospital directory (`/api/hospitals/list`), routing their verification request directly to that specific **Hospital Admin** (`medi-hospadmin.shanmukhmedisetty.site`).
* **Compulsory Doctor Verification Form**: Unapproved applicants submit Medical License Number, Specialization/Department, Hospital Affiliation, Contact Phone, Years of Experience, and Academic Qualifications.
* **Patient Account Restriction**: Patient accounts are prevented from logging into the Doctor Portal.
* **Mandatory 1-Week (7-Day) Cooling Period**: If rejected, an automated 7-day waiting period is enforced by API (`/api/doctor/apply`) and UI, displaying a live countdown before re-applying.

### 3. Patient Portal & EMR Management Pipeline
* **Compulsory EMR Onboarding & Access Gate (`PatientEmrGate`)**: Mandatory EMR form (Personal Details, Blood Group, Emergency Contact, Pre-existing Conditions, Allergies, Current Medications, Address) for all new registered patients.
* **On-Demand Lifetime EMR Editing (`EmrFormModal`)**: Patients can view or update their medical profile anytime directly on their dashboard.
* **Smart Medical Document Upload (`DocumentUpload`)**: Drag-and-drop ingestion for prescriptions, lab results, and diagnostic reports (PDF, PNG, JPG).
* **Zero-Shot Validation**: Powered by a FastAPI microservice to detect and filter out non-medical documents before processing.
* **Hybrid OCR & AI Extraction**: Tesseract OCR extracts text, and the Google Gemini reasoning engine structures it into precise clinical schemas (diagnoses, medications, dosage, follow-up dates).
* **Intelligent AI Triage & Guardrails**: Real-time symptom analysis advising on recommended specialty and urgency levels with safety disclaimers.

### 4. Doctor Portal, Data Isolation & Referral System
* **Strict Patient Data Isolation**: Doctor directories (`/api/doctor/patients`) strictly display patients who have booked appointments with the logged-in doctor or have been formally referred to them.
* **Doctor-to-Doctor Patient Referrals (`ReferralModel` & `/api/doctor/refer`)**: Physicians can transfer patient access and clinical handover notes to verified specialists within the portal.
* **Digital Checkup Completion & Signature**: Doctors record clinical notes, attach test result summaries, and sign checkups with a verified digital signature.
* **Real-Time Patient Sync**: Checkup notes, test summaries, and doctor signatures instantly update the patient's dashboard.

### 5. Admin Analytics & System Governance
* **Recharts Healthcare Analytics**: Dashboard tracking missed follow-up rates, compliance scores, treatment timelines, and department bottleneck bar charts.
* **Partner Hospital Registry**: Overview of all collaborated hospitals, active doctor counts, and hospital admin accounts.
* **Real-Time Registration Logs**: Comprehensive audit logs for verified doctors and registered patients.

---

## 📁 Repository & Architecture Structure

```
PD_SPACE/
├── src/
│   ├── app/                                → Next.js App Router Structure
│   │   ├── api/                            → Serverless API Routes
│   │   │   ├── admin/
│   │   │   │   ├── hospitals/route.ts      → Main Admin hospital application review & approval API
│   │   │   │   ├── stats/route.ts          → Analytics calculation endpoint
│   │   │   │   └── users/route.ts          → Doctor application approval/rejection & user log endpoint
│   │   │   ├── alerts/route.ts             → Clinical safety alerts endpoint
│   │   │   ├── appointments/route.ts       → Patient booking & checkup completion endpoint
│   │   │   ├── auth/[...nextauth]/route.ts → NextAuth authentication handler
│   │   │   ├── doctor/
│   │   │   │   ├── apply/route.ts          → Dual-queue doctor verification & cooling period API
│   │   │   │   ├── patients/route.ts       → Isolated assigned/referred patient list API
│   │   │   │   ├── refer/route.ts          → Doctor-to-doctor patient referral creation & retrieval API
│   │   │   │   ├── role/route.ts           → User role query API
│   │   │   │   └── summary/route.ts        → Gemini AI patient summary generator API
│   │   │   ├── doctors/route.ts            → Filtered list of verified, approved doctors API
│   │   │   ├── documents/                  → File upload, GridFS & retrieval endpoints
│   │   │   ├── extract/route.ts            → AI document parsing endpoint
│   │   │   ├── facilities/route.ts         → Nearby hospital & clinic location locator
│   │   │   ├── health/route.ts             → Healthcheck ping endpoint
│   │   │   ├── hospadmin/
│   │   │   │   ├── doctors/route.ts        → Hospital Admin doctor approval/rejection API
│   │   │   │   └── stats/route.ts          → Hospital-specific staff & consultation stats API
│   │   │   ├── hospital/
│   │   │   │   ├── apply/route.ts          → Public hospital partnership application submission API
│   │   │   │   └── password/route.ts       → Hospital Admin password update API
│   │   │   ├── hospitals/
│   │   │   │   └── list/route.ts           → Approved partner hospitals directory API
│   │   │   ├── ocr/route.ts                → Tesseract OCR text extraction endpoint
│   │   │   ├── patient/
│   │   │   │   └── profile/route.ts        → Compulsory patient EMR profile save & fetch API
│   │   │   └── recommend/route.ts          → AI symptom triage & specialty checker endpoint
│   │   ├── auth/                           → Sign-in & Sign-up views
│   │   │   ├── login/page.tsx              → Credentials & Google login page
│   │   │   └── register/page.tsx           → User registration page
│   │   ├── dashboard/                      → Role Dashboards
│   │   │   ├── admin/page.tsx              → Main Admin analytics, hospital collaboration management & doctor queue
│   │   │   ├── doctor/page.tsx             → Doctor Portal (Verification Form, Hospital Selection & Data Isolation)
│   │   │   └── patient/page.tsx            → Patient Portal (EMR Gate, Uploads, Triage & Reminders)
│   │   ├── hospadmin/
│   │   │   └── page.tsx                    → Hospital Admin Portal (Staff Approvals & Hospital Analytics)
│   │   ├── globals.css                     → Design system & custom CSS variables
│   │   ├── layout.tsx                      → Root application layout & NextAuth Provider wrapper
│   │   └── page.tsx                        → Main Landing Page (`mediflow.shanmukhmedisetty.site`)
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
│   │   ├── auth.ts                         → NextAuth options & credential providers (Hospital Admin support)
│   │   ├── cron.ts                         → Automated clinical alert scheduler
│   │   ├── db.ts                           → MongoDB Mongoose connection utility
│   │   ├── firebase.ts                     → Firebase OAuth helper
│   │   └── validation.ts                   → Input sanitization & schemas
│   ├── middleware.ts                       → Dynamic Subdomain Routing & Isolation Matrix
│   ├── models/                             → Mongoose Database Schemas
│   │   ├── alert.ts                        → Clinical alert model
│   │   ├── appointment.ts                  → Patient booking & doctor sign-off schema
│   │   ├── document.ts                     → Medical document metadata schema
│   │   ├── hospital.ts                     → Hospital collaboration model
│   │   ├── referral.ts                     → Doctor-to-doctor patient referral schema
│   │   └── user.ts                         → User model with EMR profile, Doctor profile & Hospital Admin credentials
│   ├── types/                              → TypeScript Type Definitions
│   │   ├── documents.ts                    → User, EMR Profile, Doctor Profile, Hospital & Document interfaces
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
* **Analytics & Visualizations**: Recharts (Healthcare analytics visuals)
* **Authentication**: NextAuth.js (Google OAuth, Credentials Auth, Hospital Admin Credentials)
* **Domain Routing**: Custom Next.js Subdomain Isolation Middleware

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
NEXTAUTH_URL=https://mediflow.shanmukhmedisetty.site
NEXT_PUBLIC_FASTAPI_URL=your_fastapi_microservice_url
```

### 3. Run Development Server
```bash
npm run dev
```

---

## 📝 CLI & Quality Assurance

```bash
# Type checking
npm run type-check

# Build check
npm run build
```
