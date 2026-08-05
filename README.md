# 🏥 MediFlow — AI-Powered Multi-Tenant Healthcare Ecosystem

MediFlow is a modern, enterprise-grade multi-tenant healthcare platform designed to streamline patient onboarding, automate clinical triaging via Gemini AI, support isolated hospital administration portals across dedicated subdomains, enforce bcrypt credential security, and deliver real-time analytics for health administrators and physicians.

---

## 🌐 Subdomain Routing & Isolation Architecture

MediFlow uses dynamic, domain-level routing enforced by Next.js middleware (`src/middleware.ts`) to isolate roles, ensure data privacy, and eliminate route collisions across dedicated subdomains:

| Subdomain Domain | Portal View | Description & Access Control |
| :--- | :--- | :--- |
| **`mediflow.shanmukhmedisetty.site`** | **Main Landing Page** | Public platform showcase detailing application capabilities, clinical facilities, subdomain portal links, and the Hospital Collaboration Onboarding form. |
| **`patient-mediflow.shanmukhmedisetty.site`** | **Patient Portal** | Isolated patient dashboard (`/dashboard/patient`) for medical document uploads, EMR management, symptom triage, and appointments. |
| **`doctor-mediflow.shanmukhmedisetty.site`** | **Doctor Portal** | Isolated physician portal (`/dashboard/doctor`) for patient consultations, referral handovers, checkup sign-offs, and appointment queues. |
| **`admin-mediflow.shanmukhmedisetty.site`** | **Main Admin Portal** | Enterprise system dashboard (`/dashboard/admin`) for platform analytics, hospital partnership approvals, and individual doctor verification queues. |
| **`medi-hospadmin.shanmukhmedisetty.site`** | **Hospital Admin Portal** | Dedicated hospital admin portal (`/hospadmin`) for collaborated hospitals to manage affiliated staff doctors and monitor hospital clinical data. |

---

## 🌟 Key Features & Recent Security Updates

### 🔐 1. Robust Password Security & Encryption (Bcrypt Hashing)
* **Bcrypt Password Hashing (`bcryptjs`)**: All user and hospital administrator credentials are stored using salted 10-round bcrypt hashes in `HospitalModel` and `UserModel`.
* **Seamless Legacy Auto-Upgrade**: Plain-text passwords are transparently hashed and updated in MongoDB upon successful login without disrupting existing sessions.
* **Password Rotation & Erasure (`/api/hospital/admin`)**: Changing passwords updates hashes securely and completely erases temporary raw credentials (`rawTempPassword`).
* **Console & Network Payload Sanitization**: API responses (`/api/admin/hospitals`, `/api/hospital/apply`) strictly exclude `passwordHash` and internal secrets, preventing credential leakage in browser inspection tools or DevTools console.
* **Show/Hide Password UI**: Interactive password visibility toggle integrated across credential login interfaces.

### 🏢 2. Multi-Tenant Hospital Collaboration & Administration
* **Hospital Partnership Onboarding (`/api/hospital/apply`)**: Hospitals submit collaboration requests directly from the landing page, detailing legal name, address, contact email, phone, bed capacity, specialties, and collaboration goals.
* **Main Admin Review & Approval (`/api/admin/hospitals`)**: Main Administrators review pending hospital applications, inspect bed capacity/specialties, and execute one-click **Approve** or **Reject** decisions.
* **Automated Credential & Hospital ID Generation**: Upon approval, the system programmatically generates a unique `Hospital ID` (e.g. `HOSP-8F92A`) and creates a secure `hospital_admin` user account with salted bcrypt hashes.
* **Dedicated Hospital Admin Dashboard (`/hospadmin`)**: Hospital administrators sign in via `medi-hospadmin.shanmukhmedisetty.site` using their generated Hospital ID / email to:
  * Review and approve/reject doctor verification requests submitted specifically for their hospital.
  * View active staff doctor rosters and hospital doctor counts.
  * Monitor patient consultation volume and hospital clinical statistics.
* **Hospital Credentials Rotation (`/api/hospital/password`)**: Enables hospital administrators to securely update their login credentials.

### 🩺 3. Dual-Queue Doctor Verification & Affiliation Routing
* **Practice Type Selection**: Doctors registering on the platform choose between two affiliation paths:
  1. **Individual Practice Doctor**: Request routes directly to the **Main Admin** (`admin-mediflow.shanmukhmedisetty.site`) approval queue.
  2. **Hospital Affiliated Doctor**: Doctor selects an approved partner hospital from the live hospital directory (`/api/hospitals/list`), routing their verification request directly to that specific **Hospital Admin** (`medi-hospadmin.shanmukhmedisetty.site`).
* **Compulsory Doctor Verification Form**: Unapproved applicants submit Medical License Number, Specialization/Department, Hospital Affiliation, Contact Phone, Years of Experience, and Academic Qualifications.
* **Patient Account Restriction**: Patient accounts are prevented from logging into the Doctor Portal.
* **Mandatory 1-Week (7-Day) Cooling Period**: If rejected, an automated 7-day waiting period is enforced by API (`/api/doctor/apply`) and UI, displaying a live countdown before re-applying.

### 📋 4. Patient Portal & EMR Management Pipeline
* **Compulsory EMR Onboarding & Access Gate (`PatientEmrGate`)**: Mandatory EMR form (Personal Details, Blood Group, Emergency Contact, Pre-existing Conditions, Allergies, Current Medications, Address) for all new registered patients.
* **On-Demand Lifetime EMR Editing (`EmrFormModal`)**: Patients can view or update their medical profile anytime directly on their dashboard.
* **Smart Medical Document Upload (`DocumentUpload`)**: Drag-and-drop ingestion for prescriptions, lab results, and diagnostic reports (PDF, PNG, JPG).
* **Zero-Shot Validation**: Powered by a FastAPI microservice to detect and filter out non-medical documents before processing.
* **Hybrid OCR & AI Extraction**: Tesseract OCR extracts text, and the Google Gemini reasoning engine structures it into precise clinical schemas (diagnoses, medications, dosage, follow-up dates).
* **Multilingual AI Explanation (`/api/documents/explain`)**: Translates and simplifies complex medical jargon into user-friendly explanations in English, Hindi, Telugu, Tamil, Kannada, Bengali, and Spanish.
* **Intelligent AI Triage & Guardrails**: Real-time symptom analysis advising on recommended specialty and urgency levels with safety disclaimers.

### 👨‍⚕️ 5. Doctor Portal, Data Isolation & Referral System
* **Strict Patient Data Isolation**: Doctor directories (`/api/doctor/patients`) strictly display patients who have booked appointments with the logged-in doctor or have been formally referred to them.
* **Doctor-to-Doctor Patient Referrals (`ReferralModel` & `/api/doctor/refer`)**: Physicians can transfer patient access and clinical handover notes to verified specialists within the portal.
* **Real-Time Patient Sync**: Checkup notes, test summaries, and doctor signatures instantly update the patient's dashboard.

### 📊 6. Admin Analytics & System Governance
* **Recharts Healthcare Analytics**: Dashboard tracking missed follow-up rates, compliance scores, treatment timelines, and department bottleneck bar charts.
* **Partner Hospital Registry**: Overview of all collaborated hospitals, active doctor counts, and hospital admin accounts.
* **Real-Time Registration Logs**: Comprehensive audit logs for verified doctors and registered patients.

### ⚡ 7. High-Scale Surge Architecture (Redis Fast Caching & Kafka Event Streaming)
* **Redis In-Memory Fast Caching (`src/lib/redis.ts`)**:
  * Integrates `ioredis` high-performance caching layer with TTL expiration and automatic in-memory fallback for high-concurrency patient surge handling.
  * Caches appointment queues (15s TTL) and hospital facility queries (1h TTL) to ensure sub-2ms data retrieval under high crowd traffic.
  * Track real-time cache hit ratios, active memory keys, and average retrieval latency.
* **Kafka Asynchronous Crowd Event Stream (`src/lib/kafka.ts`)**:
  * Integrates `kafkajs` event bus pipeline to decouple asynchronous crowd surges from main database write paths.
  * Role-based topic partitioning:
    * `patient-crowd-events`: Ingests appointment booking surges and emergency symptom triaging.
    * `doctor-queue-events`: Tracks physician checkup sign-offs and patient handover notes.
    * `hospital-crowd-events`: Monitors hospital bed availability lookups and staff approvals.
    * `system-admin-events`: Logs multi-tenant governance actions and hospital collaboration approvals.
  * Simulated high-throughput stream engine gracefully handles scenarios when external Kafka brokers are offline.
* **Centralized Telemetry Monitor (`KafkaRedisMonitor.tsx`)**:
  * Interactive, real-time widget embedded across all 4 primary portals (Patient, Doctor, Hospital Admin, Main Admin).
  * Features live Kafka event stream feeds, sub-2ms Redis latency tracking, one-click crowd surge simulation, and cache purge controls.

---

## 📁 Project Directory & Folder Architecture

```
PD_SPACE/
├── public/                                 → Static Web & PWA Assets
│   ├── icons/                              → PWA application icons & badges
│   ├── heal_link_hero.png                  → Platform visual banner
│   ├── mediflow_hero.png                  → Hero branding graphic
│   ├── manifest.json                       → Progressive Web App manifest
│   ├── sample_prescription.pdf             → Sample medical document
│   └── sw.js                               → Service Worker for offline capability
├── src/                                    → Application Source Code
│   ├── app/                                → Next.js 14 App Router
│   │   ├── api/                            → Serverless API Routes
│   │   │   ├── admin/                      → Main Admin endpoints
│   │   │   │   ├── hospitals/route.ts      → Hospital application approval & credential generation
│   │   │   │   ├── stats/route.ts          → Analytics calculation endpoint
│   │   │   │   └── users/route.ts          → Doctor approval/rejection & user logs
│   │   │   ├── alerts/route.ts             → Clinical safety alerts endpoint
│   │   │   ├── appointments/route.ts       → Appointment booking & checkup completion (Redis + Kafka)
│   │   │   ├── auth/                       → NextAuth Authentication
│   │   │   │   └── [...nextauth]/route.ts  → NextAuth route handler
│   │   │   ├── doctor/                     → Doctor Portal endpoints
│   │   │   │   ├── apply/route.ts          → Verification application & 7-day cooling gate
│   │   │   │   ├── patients/route.ts       → Data-isolated patient directory
│   │   │   │   ├── refer/route.ts          → Doctor-to-doctor patient referral system
│   │   │   │   ├── role/route.ts           → User role verification
│   │   │   │   └── summary/route.ts        → Gemini AI patient summary generator
│   │   │   ├── doctors/route.ts            → Directory of verified doctors
│   │   │   ├── documents/                  → Medical Document Processing
│   │   │   │   ├── confirm/route.ts        → Ingestion confirmation endpoint
│   │   │   │   ├── download/route.ts       → GridFS document downloader
│   │   │   │   ├── explain/route.ts        → Multilingual AI document simplifier
│   │   │   │   ├── upload/route.ts         → File upload & GridFS storage
│   │   │   │   └── route.ts                → Document listing endpoint
│   │   │   ├── extract/route.ts            → AI document parsing endpoint
│   │   │   ├── facilities/                 → Nearby hospital locator API
│   │   │   │   └── info/route.ts           → Redis-cached hospital lookup & Kafka stream
│   │   │   ├── health/route.ts             → System healthcheck ping
│   │   │   ├── hospadmin/                  → Hospital Admin endpoints
│   │   │   │   ├── doctors/route.ts        → Staff doctor approval queue
│   │   │   │   └── stats/route.ts          → Hospital clinical analytics
│   │   │   ├── hospital/                   → Hospital Partnership endpoints
│   │   │   │   ├── apply/route.ts          → Public hospital collaboration application
│   │   │   │   └── password/route.ts       → Hospital Admin credential update endpoint
│   │   │   ├── hospitals/                  → Directory endpoints
│   │   │   │   └── list/route.ts           → Approved partner hospitals directory
│   │   │   ├── kafka/                      → Kafka Telemetry APIs
│   │   │   │   └── events/route.ts         → Kafka event stream reader & producer simulation
│   │   │   ├── ocr/route.ts                → Tesseract OCR text extraction endpoint
│   │   │   ├── patient/                    → Patient Portal endpoints
│   │   │   │   └── profile/route.ts        → Compulsory EMR profile fetch & update
│   │   │   ├── recommend/route.ts          → AI symptom triage & specialty advisor
│   │   │   ├── redis/                      → Redis Cache Telemetry APIs
│   │   │   │   └── stats/route.ts          → Redis hit ratio, key inspection & purge endpoint
│   │   │   └── test-db-connection/route.ts → Database connection diagnostic endpoint
│   │   ├── auth/                           → Authentication Views
│   │   │   ├── login/page.tsx              → Credentials & Google login page
│   │   │   └── register/page.tsx           → User registration page
│   │   ├── dashboard/                      → Role Dashboards
│   │   │   ├── admin/page.tsx              → Main Admin portal (with Kafka & Redis telemetry)
│   │   │   ├── doctor/page.tsx             → Doctor portal (with Kafka & Redis telemetry)
│   │   │   └── patient/                    → Patient portal
│   │   │       ├── upload/page.tsx         → Medical document upload flow
│   │   │       └── page.tsx                → Patient dashboard (with Kafka & Redis telemetry)
│   │   ├── hospadmin/                      → Hospital Admin Portal
│   │   │   └── page.tsx                    → Dedicated Hospital Admin dashboard (with Kafka & Redis telemetry)
│   │   ├── globals.css                     → Design system & styling
│   │   ├── layout.tsx                      → Root layout & NextAuth SessionProvider wrapper
│   │   └── page.tsx                        → Public Landing Page (`mediflow.shanmukhmedisetty.site`)
│   ├── components/                         → Reusable UI Components
│   │   ├── ConfirmExtraction.tsx           → Extraction verification modal
│   │   ├── DocumentDetailModal.tsx         → Medical document viewer & AI explanation
│   │   ├── DocumentList.tsx                → Uploaded medical records list
│   │   ├── DocumentUpload.tsx              → Drag-and-drop file uploader
│   │   ├── EmrFormModal.tsx                → Compulsory Patient EMR profile modal
│   │   ├── FacilityMap.tsx                 → Interactive hospital locator map
│   │   ├── KafkaRedisMonitor.tsx          → Real-time Kafka event stream & Redis cache telemetry widget
│   │   ├── OCRPreview.tsx                  → Raw OCR text preview widget
│   │   ├── PatientEmrGate.tsx              → EMR completion enforcement gate
│   │   └── Providers.tsx                   → NextAuth SessionProvider wrapper
│   ├── lib/                                → Core Utilities & Services
│   │   ├── alertEngine.ts                  → Drug conflict & missed follow-up alerts
│   │   ├── auth.ts                         → NextAuth options & bcrypt password authentication
│   │   ├── cron.ts                         → Automated clinical alert scheduler
│   │   ├── db.ts                           → MongoDB connection utility
│   │   ├── firebase.ts                     → Firebase helper
│   │   ├── kafka.ts                        → High-scale Kafka event bus producer & stream engine
│   │   ├── redis.ts                        → Ultra-fast Redis caching service with fallback
│   │   └── validation.ts                   → Input sanitization & schemas
│   ├── middleware.ts                       → Dynamic Subdomain Routing & Isolation Matrix
│   ├── models/                             → Mongoose Database Schemas
│   │   ├── alert.ts                        → Clinical alert schema
│   │   ├── appointment.ts                  → Patient booking & checkup sign-off schema
│   │   ├── document.ts                     → Medical document metadata schema
│   │   ├── hospital.ts                     → Hospital collaboration schema
│   │   ├── referral.ts                     → Doctor-to-doctor referral schema
│   │   └── user.ts                         → User, EMR & Doctor profile schema
│   ├── types/                              → TypeScript Type Definitions
│   │   ├── documents.ts                    → User, EMR, Doctor, Hospital & Document types
│   │   └── index.ts                        → Shared type exports
│   └── utils/                              → Helper Functions
│       └── ocr.ts                          → Tesseract OCR helper utilities
├── .gitignore                              → Git ignore rules
├── next.config.js                          → Next.js configuration
├── package.json                            → Dependencies & script definitions
├── README.md                               → Project documentation
├── REPORT.md                               → Detailed project technical report
├── SECURITY.md                             → Security policies & password guidelines
├── secrets.env                             → Environment secrets configuration
```

---

## 🔌 Technology Stack

* **Frontend Framework**: Next.js 14 (App Router) + React 18 + TypeScript + Tailwind CSS / Custom CSS
* **Backend Architecture**: Next.js Serverless API Routes + FastAPI Microservice (Zero-Shot Medical Classification)
* **High-Scale Messaging & Cache**: Redis (`ioredis`) for sub-2ms caching + Apache Kafka (`kafkajs`) for crowd surge event streaming
* **Database & Storage**: MongoDB + Mongoose Schemas + GridFS (PDF & image storage)
* **Password Security**: Bcryptjs (10-round salted password hashing & verification)
* **AI & Reasoning**: Google Gemini API (`gemini-1.5-flash` / Gemini 3.5 series)
* **OCR Engine**: Tesseract.js (Client & server OCR text extraction)
* **Analytics & Visualizations**: Recharts (Healthcare analytics visuals)
* **Authentication**: NextAuth.js (Google OAuth, Bcrypt Credentials Auth, Hospital Admin Credentials)
* **Subdomain Isolation**: Custom Next.js Domain Middleware

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
# Optional High-Scale Infrastructure Connections (Defaults to robust in-memory simulation if omitted)
REDIS_URL=redis://localhost:6379
KAFKA_BROKERS=localhost:9092
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
```ind CSS / Custom CSS
* **Backend Architecture**: Next.js Serverless API Routes + FastAPI Microservice (Zero-Shot Medical Classification)
* **Database & Storage**: MongoDB + Mongoose Schemas + GridFS (PDF & image storage)
* **Password Security**: Bcryptjs (10-round salted password hashing & verification)
* **AI & Reasoning**: Google Gemini API (`gemini-1.5-flash` / Gemini 3.5 series)
* **OCR Engine**: Tesseract.js (Client & server OCR text extraction)
* **Analytics & Visualizations**: Recharts (Healthcare analytics visuals)
* **Authentication**: NextAuth.js (Google OAuth, Bcrypt Credentials Auth, Hospital Admin Credentials)
* **Subdomain Isolation**: Custom Next.js Domain Middleware

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
