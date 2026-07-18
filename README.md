# 🏥 Patient Document Upload System

A full-stack healthcare application for uploading, extracting, and managing patient medical documents using OCR and AI.

## ✨ Features

- 📤 **Drag-and-drop upload** (PDF, JPG, PNG)
- 🔍 **OCR extraction** (Tesseract.js)
- 🤖 **AI-powered parsing** (Google Gemini API)
- ✏️ **Editable confirmation form**
- 💾 **Secure MongoDB storage** with GridFS
- 🔐 **NextAuth authentication**
- 📱 **Responsive design** (Tailwind CSS)

## 🚀 Quick Start

### 1. Install
```bash
npm install
```

### 2. Setup Environment
Create `.env.local` in project root with:
```env
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster-url>/patient_docs
GEMINI_API_KEY=your_gemini_api_key
NEXTAUTH_SECRET=generate_with_openssl_rand_-base64_32
NEXTAUTH_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:3000/api
```

### 3. Run
```bash
npm run dev
```

Open: **http://localhost:3000**

## 📖 Usage

1. **Login**: http://localhost:3000/auth/login (any email/password)
2. **Dashboard**: http://localhost:3000/dashboard/patient
3. **Upload**: Click "Upload Document"
4. **Process**: 
   - Upload file → OCR extract → AI parsing → Confirm → Save
5. **View**: All documents appear in dashboard

## 📁 Project Structure

```
src/
├── app/              → Pages & Layouts
├── api/              → API Routes
├── components/       → React Components
├── lib/              → Utilities & Config
├── models/           → Mongoose Schemas
├── types/            → TypeScript Types
└── utils/            → Helper Functions
```

## 🔌 Tech Stack

- **Frontend**: Next.js 14 + React 18 + TypeScript + Tailwind CSS
- **Backend**: Node.js + Next.js API Routes
- **Database**: MongoDB + Mongoose + GridFS
- **OCR**: Tesseract.js
- **LLM**: Google Gemini API
- **Auth**: NextAuth.js

## 📊 Data Flow

```
Upload File
    ↓
OCR Extraction (Tesseract.js)
    ↓
AI Parsing (Gemini API)
    ↓
Editable Confirmation
    ↓
Save to MongoDB
```

## 🔐 Security

- ✅ Environment variables for all secrets
- ✅ `.env.local` in `.gitignore`
- ✅ NextAuth session management
- ✅ Protected routes (require auth)
- ✅ Zod validation on all inputs

## 📋 API Endpoints

- `POST /api/documents/upload` → Upload file
- `POST /api/ocr` → Extract text
- `POST /api/extract` → Parse with Gemini
- `POST /api/documents/confirm` → Save to DB
- `GET /api/documents` → Get patient docs

See `REPORT.md` for complete API documentation.

## 🛠️ Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `MONGODB_URI` | ✅ | MongoDB connection string |
| `GEMINI_API_KEY` | ✅ | Google Gemini API key |
| `NEXTAUTH_SECRET` | ✅ | Session secret |
| `NEXTAUTH_URL` | ✅ | Auth callback URL |
| `NEXT_PUBLIC_API_URL` | ✅ | API base URL |

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| "MONGODB_URI not set" | Create `.env.local` in project root |
| "Cannot connect to MongoDB" | Verify connection string, IP whitelist in MongoDB Atlas |
| "NextAuth error" | Ensure NEXTAUTH_SECRET and NEXTAUTH_URL are set |
| "Port 3000 in use" | `PORT=3001 npm run dev` |

## 📖 Documentation

- **`REPORT.md`** - Complete technical documentation
- **API Endpoints** - See REPORT.md § API Endpoints
- **Database Schema** - See REPORT.md § Database Schema
- **Deployment** - See REPORT.md § Deployment Guide

## 🚀 Deployment

See `REPORT.md` § Deployment Guide for:
- Vercel deployment
- Docker containerization
- Production environment setup

## 📝 Development

```bash
# Type checking
npm run type-check

# Linting
npm run lint

# Build for production
npm run build

# Start production server
npm start
```

## ✅ Production Checklist

- [ ] All secrets in `.env.local`
- [ ] MongoDB production cluster
- [ ] Gemini API configured
- [ ] NextAuth properly secured
- [ ] File size limits enforced
- [ ] Error logging enabled
- [ ] HTTPS/SSL configured
- [ ] User authentication improved

## 📞 Help

1. Check error message in browser console
2. Verify `.env.local` is set correctly
3. Check MongoDB Atlas & Google Cloud Console
4. Review `REPORT.md` for detailed troubleshooting

---

**Status**: ✅ Ready for Development  
**Version**: 1.0.0
