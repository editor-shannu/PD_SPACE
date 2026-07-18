# Document Upload Flow Components

This directory contains the React frontend components for the patient document upload flow.

## Components Overview

### 1. DocumentUpload.tsx
**Purpose:** File upload form with drag-and-drop, file preview, and progress indicator

**Features:**
- Drag-and-drop file upload
- File type and size validation
- Progress bar showing upload percentage
- File preview with metadata
- Error handling with user-facing messages

**Props:**
```typescript
interface DocumentUploadProps {
  patientId: string;              // Patient ID for linking documents
  onUploadSuccess: (fileId, fileName, mimeType, rawText) => void;  // Success callback
  onError: (error: string) => void;  // Error callback
  isLoading?: boolean;            // Disable UI during loading
}
```

**Supported File Types:** JPEG, PNG, GIF, PDF (max 20MB)

---

### 2. OCRPreview.tsx
**Purpose:** Displays raw OCR text extracted from the document

**Features:**
- Read-only textarea showing extracted text
- Confidence score indicator with color coding
- File information display
- Warning when no text extracted

**Props:**
```typescript
interface OCRPreviewProps {
  rawText: string;      // OCR extracted text
  confidence?: number;  // Confidence percentage (0-100)
  fileName?: string;    // Original file name
}
```

**Confidence Score Colors:**
- Green: 80%+ confidence
- Yellow: 60-79% confidence
- Orange: Below 60% confidence

---

### 3. ConfirmExtraction.tsx
**Purpose:** Editable confirmation screen for extracted structured data

**Features:**
- Inline editing of all extracted fields
- Document type dropdown (prescription, diagnostic report, discharge summary, other)
- Medication management (add, edit, remove)
- Date pickers for document date and follow-up date
- Rich field editing for diagnosis and notes
- Cancel and Confirm buttons

**Props:**
```typescript
interface ConfirmExtractionProps {
  extractedData: ExtractedData;          // Initial extracted data
  fileName?: string;                     // Original file name
  onConfirm: (data: ExtractedData) => void;  // Save callback
  onCancel: () => void;                  // Cancel callback
  isLoading?: boolean;                   // Disable UI during saving
}
```

**Editable Fields:**
- Document Type (required)
- Doctor Name
- Date
- Diagnosis
- Medications Array
  - Medication Name (required)
  - Dosage
  - Frequency
- Follow-up Date
- Notes

---

### 4. DocumentList.tsx
**Purpose:** Lists all documents for the patient with metadata

**Features:**
- Document listing with type badges
- Metadata display (upload date, doctor name, diagnosis)
- Confirmation status indicator
- View details button for each document
- Empty state when no documents
- Loading skeleton state

**Props:**
```typescript
interface DocumentListProps {
  documents: Document[];                    // Array of documents
  isLoading?: boolean;                      // Show loading state
  onViewDetails?: (document: Document) => void;  // View details callback
}
```

**Document Type Badge Colors:**
- Blue: Prescription
- Purple: Diagnostic Report
- Green: Discharge Summary
- Gray: Other

---

## Page Integration

### src/app/dashboard/patient/upload/page.tsx
**Purpose:** Multi-step orchestrator page for the complete upload flow

**Features:**
- Step tracking: Upload → OCR Preview → Confirm → Success
- Visual step indicator with progress
- Error handling and display
- Document list view
- State management using React hooks

**Workflow:**
1. **List View:** Display all patient documents with upload button
2. **Upload Step:** File selection and upload using DocumentUpload
3. **OCR Step:** Display raw extracted text using OCRPreview
4. **Confirmation Step:** Edit and confirm using ConfirmExtraction
5. **Success:** Show confirmation message then return to list
6. **API Call:** POST to `/api/documents/confirm` with structured data

**State Management:**
- `currentStep`: Tracks which step user is on
- `uploadState`: Stores file info, raw text, and extracted data
- `documents`: List of patient documents
- `error`: Error message display
- `isLoading`: Loading state for async operations

---

## Type Definitions

All components use types from `@/types/documents.ts`:

```typescript
interface ExtractedData {
  document_type: 'prescription' | 'diagnostic_report' | 'discharge_summary' | 'other';
  doctor_name?: string;
  date?: Date;
  diagnosis?: string;
  medications: Medication[];
  follow_up_date?: Date;
  notes?: string;
}

interface Medication {
  name: string;
  dosage?: string;
  frequency?: string;
}

interface Document {
  _id?: string;
  userId: string;
  fileName: string;
  fileUrl?: string;
  fileType: 'image' | 'pdf';
  rawText: string;
  extractedData: ExtractedData;
  isConfirmed: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}
```

---

## API Endpoints

The components interact with the following backend endpoints:

### POST /api/documents/upload
**Request:**
```
FormData:
- file: File (JPEG, PNG, GIF, PDF, max 20MB)
- patientId: string
```

**Response:**
```json
{
  "success": true,
  "fileId": "string",
  "fileName": "string",
  "fileSize": number,
  "mimeType": "string",
  "uploadedAt": "ISO string"
}
```

### POST /api/documents/confirm
**Request:**
```json
{
  "file_id": "string",
  "extracted_data": {
    "document_type": "prescription",
    "doctor_name": "string",
    "date": "ISO date string",
    "diagnosis": "string",
    "medications": [
      {
        "name": "string",
        "dosage": "string",
        "frequency": "string"
      }
    ],
    "follow_up_date": "ISO date string",
    "notes": "string"
  },
  "patientId": "string",
  "fileName": "string",
  "mimeType": "string"
}
```

**Response:**
```json
{
  "success": true,
  "document": { /* Document object */ },
  "documentId": "string"
}
```

---

## Styling

All components use Tailwind CSS for styling with a consistent design language:
- **Primary Color:** Blue (bg-blue-600, hover:bg-blue-700)
- **Success Color:** Green (bg-green-600)
- **Error Color:** Red (bg-red-50, text-red-800)
- **Backgrounds:** White (bg-white) with subtle shadows
- **Typography:** Gray-900 for headings, Gray-600 for body text

---

## Error Handling

Each component includes user-facing error messages:
- **File validation:** Size, type, and format errors
- **Upload failures:** Network and server errors
- **API errors:** Validation and processing errors
- **Empty states:** Helpful messages when no data available

---

## Accessibility Features

- Semantic HTML elements
- ARIA labels on buttons and forms
- Keyboard navigation support
- Color-coded status indicators with text fallbacks
- Clear focus states on interactive elements

---

## Browser Support

- Modern browsers with ES6 support
- React 18.2+
- Next.js 14.0+
- Tailwind CSS 3.0+

---

## Usage Example

```tsx
import { PatientUploadPage } from '@/app/dashboard/patient/upload/page';

export default function App() {
  return <PatientUploadPage />;
}
```

The page is a client component that manages the entire document upload workflow, from initial file selection through confirmation and saving.
