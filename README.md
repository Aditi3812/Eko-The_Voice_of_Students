# EKO — AI-Powered Collaborative Dual-Pane Study Workspace

**EKO** is an intelligent, dual-pane interactive study workspace that combines real-time collaborative note-taking with document viewing and Retrieval-Augmented Generation (RAG) AI agents. Built with Next.js, FastAPI, ChromaDB, and Google Gemini Embeddings, EKO allows students and researchers to read, annotate, synthesize, and query course materials seamlessly in one place.

---

## 🌟 Key Features

* **Dual-Pane Interactive Workspace:** 
  * Left Pane: Dynamic PDF reference viewer with document switching per classroom unit.
  * Right Pane: Rich text workspace editor powered by TipTap with real-time auto-saving and WebSocket collaboration.
* **Automated Vector Ingestion Pipeline:** 
  * On-demand PDF parsing, chunking (`RecursiveCharacterTextSplitter`), and embedding generation using `models/gemini-embedding-001`.
  * Deduplicated vector caching per document and unit in ChromaDB.
* **Eko Study Buddy (RAG Agent):** 
  * Context-aware vector search assistant using filtered metadata queries (`unit_id` and `document_id`) to answer questions directly from uploaded materials.
  * Fallback vector search mechanism across unit-wide knowledge bases.
* **AI Note Synthesizer Agent:** 
  * One-click transformation of raw, messy study notes into polished, structured study guides.
* **Export & Synchronization:** 
  * Instant PDF export of polished notes via `html2pdf.js`.
  * Real-time WebSocket synchronization across devices with SQLite/PostgreSQL persistence.

---

## 🏗️ System Architecture
![EKO Workspace System Architecture]()![alt text](image.png)
---

## 🛠️ Tech Stack

### **Frontend**
* **Framework:** Next.js 14+ (App Router, TypeScript)
* **Styling:** Tailwind CSS, Lucide Icons
* **Rich Text Editor:** TipTap Editor (`@tiptap/react`, `@tiptap/starter-kit`)
* **Utilities:** `html2pdf.js` for PDF generation

### **Backend**
* **Framework:** FastAPI (Python 3.10+)
* **Database / ORM:** SQLAlchemy (PostgreSQL / SQLite)
* **Real-Time Sync:** WebSockets (`websockets`)
* **PDF Processing:** `pypdf`, `io.BytesIO`

### **AI & RAG Engine**
* **Vector Store:** ChromaDB (`chromadb`)
* **Embeddings:** Google Generative AI Embeddings (`models/gemini-embedding-001`)
* **Text Chunking:** LangChain (`RecursiveCharacterTextSplitter`)

---

## 📁 Project Directory Structure

```text
eko-workspace/
├── backend/
│   ├── app/
│   │   ├── main.py                    # FastAPI Entrypoint & Middleware
│   │   ├── database.py                # Database Connection & Sessions
│   │   ├── vector_store.py            # ChromaDB Client & Embedding Config
│   │   └── routers/
│   │       ├── course.py              # Ingestion & Auto-Ingestion Routes
│   │       ├── study_buddy.py         # RAG Query Agent Router
│   │       ├── synthesizer.py         # AI Note Polishing Router
│   │       ├── notes.py               # Note Storage & WebSocket Handlers
│   │       └── classrooms.py          # Unit & Document Stream Routes
│   ├── chroma_db/                     # Persistent ChromaDB Local Directory
│   ├── requirements.txt               # Backend Python Dependencies
│   └── ingest.py                      # Standalone Ingestion Utility
│
└── frontend/
    ├── app/
    │   ├── workspace/
    │   │   └── page.tsx               # Main Dual-Pane Workspace Interface
    │   ├── layout.tsx
    │   └── globals.css
    ├── package.json                   # Frontend Dependencies
    └── next.config.js
```

Ingestion & RAG Data Flow

```text
[ User Selects PDF in Dropdown ]
                │
                ▼
  POST /api/v1/course/ensure-ingested
                │
        ┌───────┴───────┐
        │ Existing in   │
        │ ChromaDB?     │
        └───────┬───────┘
       YES │         │ NO
           │         ▼
           │  1. Parse PDF pages using PyPDF
           │  2. Chunk text (size: 800, overlap: 100)
           │  3. Attach Metadata (unit_id, document_id, page, source)
           │  4. Embed via 'models/gemini-embedding-001'
           │  5. Persist to ChromaDB collection
           │
           ▼
[ Ready for Study Buddy Queries ]
                │
                ▼
  POST /api/v1/agent/study-buddy/query
                │
  Search ChromaDB Collection using metadata filter:
  {"document_id": doc_id} ──(Fallback)──> Search Entire Unit
                │
                ▼
  Context Retrieved ──> LLM Response Generated
```

🚀 Setup & Installation
Prerequisites
Python 3.10 or higher

Node.js 18.x or higher

Google Gemini API Key

1. Backend Setup
Bash
# Clone the repository
git clone [https://github.com/your-username/eko-workspace.git](https://github.com/your-username/eko-workspace.git)
cd eko-workspace/backend

# Create and activate a virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create environment file
cp .env.example .env
Configure your .env file:

Code snippet
GEMINI_API_KEY=your_google_gemini_api_key_here
DATABASE_URL=sqlite:///./eko.db
PORT=8000
Start the FastAPI server:

Bash
uvicorn app.main:app --reload --port 8000
2. Frontend Setup
Bash
cd ../frontend

# Install Node modules
npm install

# Create environment file
cp .env.example .env.local
Configure .env.local:

Code snippet
NEXT_PUBLIC_API_URL=http://localhost:8000
Start the Next.js development server:

Bash
npm run dev
Open http://localhost:3000/workspace in your browser.

📡 Key API Endpoints
Method,Endpoint,Description
POST,/api/v1/course/ensure-ingested,Checks if a PDF is vectorized; parses and embeds it if missing.
POST,/api/v1/agent/study-buddy/query,RAG query endpoint that retrieves chunks and generates answers.
POST,/api/v1/agent/synthesizer/compile,Synthesizes raw workspace notes into structured study guides.
GET,/api/v1/classrooms/documents/{doc_id}/download,Streams PDF reference materials for the workspace viewer.
WS,/api/v1/notes/ws/{room_id},Real-time WebSocket endpoint for collaborative note editing.

🧪 Troubleshooting
Model Mismatch / Vector Errors (404 NOT_FOUND): Ensure vector_store.py explicitly uses models/gemini-embedding-001.

Zero Results from RAG Query: Verify that document_id is included in ChromaDB metadata during chunk ingestion.

Scanned PDFs: If extract_text() returns empty strings, ensure your PDFs contain embedded digital text or run OCR pre-processing.

📄 License
Built by Me hehe.
