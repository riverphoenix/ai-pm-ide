# PM IDE - AI-Powered Product Management Workspace

A Mac-first IDE specifically designed for Product Managers to manage context, generate PM frameworks with AI, and streamline product workflows.

## 🎯 Vision

PM IDE enables product managers to:
- **Manage persistent context** across projects (PRDs, memos, research, strategy docs)
- **Generate PM frameworks** using AI with context-driven prompts (not form-based)
- **Apply 45+ PM frameworks** across Strategy, Prioritization, Discovery, Development, Execution, Decision, and Communication
- **Upload context documents** (PDFs, URLs, Google Docs, plain text) with automatic content extraction
- **Save and organize outputs** in a searchable library with visual diagrams
- **Chat with AI** about product strategy, frameworks, and ideas

## 🛠 Tech Stack

- **Frontend**: React 19 + Vite + TypeScript + Tailwind CSS v4
- **Desktop**: Tauri 2.0 (Rust backend with WKWebView on Mac)
- **Python Sidecar**: FastAPI + OpenAI SDK + PyMuPDF + BeautifulSoup4
- **LLM**: GPT-5 (OpenAI Frontier Models: gpt-5, gpt-5-mini, gpt-5-nano)
- **Database**: SQLite with CASCADE delete patterns
- **Diagrams**: Mermaid for Customer Journey Maps and visual frameworks

## ✅ Current Status: MVP Complete

### Core Features Implemented

#### 1. **Project Management** ✅
- Create and manage unlimited projects
- Organize PM work in dedicated workspaces
- Delete projects with CASCADE cleanup of all related data

#### 2. **Context Documents** ✅
- **Auto-extraction from PDFs** using PyMuPDF
- **Auto-fetch from URLs** using BeautifulSoup (HTML parsing)
- **Google Docs import** via export API (public docs only)
- **Plain text documents** for custom content
- **Global context** - documents available to all prompts
- Size tracking and content display

#### 3. **Framework Generation (AI-Driven)** ✅
- **8 frameworks implemented** across 7 categories:
  - **Strategy**: Blue Ocean Strategy
  - **Prioritization**: RICE Prioritization, ICE Scoring
  - **Discovery**: Customer Journey Map
  - **Development**: PRD Template
  - **Execution**: Sprint Planning
  - **Decision**: DACI Decision Framework
  - **Communication**: Stakeholder Update
- **Context-driven generation**: Upload documents + user prompt → AI generates complete framework output
- **Visual generation**: Mermaid diagrams for Customer Journey Maps
- **Save/Export**: Save to library, download markdown, copy to clipboard

#### 4. **Outputs Library** ✅
- View all saved framework outputs
- Filter by category (Strategy, Prioritization, etc.)
- Search across output names and content
- Preview with rich markdown rendering + Mermaid diagrams
- Delete, copy, or download any output

#### 5. **Chat Interface** ✅
- GPT-5 chat integration with streaming responses
- Conversation history per project
- Token usage tracking and cost calculation
- Model selector (GPT-5 / GPT-5 Mini / GPT-5 Nano)
- Rich markdown rendering with code highlighting

#### 6. **Settings** ✅
- Secure API key storage in system keychain
- Dark/light theme toggle
- User profile context (name, role, company)

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Tauri Window (WKWebView)              │
│  ┌────────────────────────────────────────────────────┐ │
│  │         React Frontend (Vite + TypeScript)         │ │
│  │                                                    │ │
│  │  ├─ FrameworksHome (category browser)            │ │
│  │  ├─ FrameworkGenerator (AI generation)           │ │
│  │  ├─ ContextManager (document management)         │ │
│  │  ├─ OutputsLibrary (saved outputs)               │ │
│  │  ├─ ChatInterface (GPT-5 chat)                   │ │
│  │  └─ Settings (API keys, preferences)             │ │
│  └────────────────────────────────────────────────────┘ │
│                          ↕                              │
│  ┌────────────────────────────────────────────────────┐ │
│  │              Tauri Core (Rust)                     │ │
│  │                                                    │ │
│  │  ├─ IPC Commands (frontend ↔ backend)           │ │
│  │  ├─ SQLite Database                              │ │
│  │  ├─ File System Operations                       │ │
│  │  └─ Security (API key storage)                   │ │
│  └────────────────────────────────────────────────────┘ │
│                          ↕                              │
│  ┌────────────────────────────────────────────────────┐ │
│  │         Python Sidecar (FastAPI Server)            │ │
│  │                                                    │ │
│  │  ├─ OpenAI API Client (GPT-5)                    │ │
│  │  ├─ Framework Generation Engine                   │ │
│  │  ├─ Document Parsing (PDF, URL, Google Docs)     │ │
│  │  └─ Framework Definition Loader                   │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

## 💻 Development

### Prerequisites

- **Rust** 1.93+ (for Tauri backend)
- **Node.js** 18+ (for React frontend)
- **Python** 3.11+ (for AI integration sidecar)
- **Tauri CLI**: `cargo install tauri-cli`

### Getting Started

```bash
# Clone the repository
git clone <your-repo-url>
cd pm-ide

# Install Node dependencies
npm install

# Set up Python sidecar
cd python-sidecar
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
cd ..

# Run in development mode (starts both Tauri and Python sidecar)
npm run tauri dev

# Build for production (creates Mac .dmg)
npm run tauri build
```

### Project Structure

```
pm-ide/
├── src/                          # React frontend
│   ├── components/               # React components
│   │   ├── ChatInterface.tsx     # GPT-5 chat UI
│   │   ├── FrameworkGenerator.tsx # Framework generation UI
│   │   ├── MermaidRenderer.tsx   # Mermaid diagram renderer
│   │   └── MarkdownWithMermaid.tsx # Custom markdown renderer
│   ├── lib/                      # Utilities and helpers
│   │   ├── db.ts                 # Database client
│   │   ├── ipc.ts                # Tauri IPC wrappers
│   │   ├── types.ts              # TypeScript types
│   │   └── frameworks.ts         # Framework loader utility
│   ├── pages/                    # Page components
│   │   ├── ProjectView.tsx       # Main project workspace
│   │   ├── FrameworksHome.tsx    # Framework category browser
│   │   ├── ContextManager.tsx    # Document management
│   │   └── OutputsLibrary.tsx    # Saved outputs viewer
│   └── frameworks/               # Framework JSON definitions
│       ├── strategy/             # Strategy frameworks (Blue Ocean, etc.)
│       ├── prioritization/       # RICE, ICE, etc.
│       ├── discovery/            # Customer Journey Map, etc.
│       ├── development/          # PRD Template, etc.
│       ├── execution/            # Sprint Planning, etc.
│       ├── decision/             # DACI, etc.
│       └── communication/        # Stakeholder Update, etc.
├── src-tauri/                    # Tauri / Rust backend
│   └── src/
│       ├── main.rs               # Entry point
│       ├── commands.rs           # IPC commands (projects, docs, outputs)
│       └── db.rs                 # SQLite operations
├── python-sidecar/               # Python FastAPI server
│   ├── main.py                   # FastAPI app
│   ├── openai_client.py          # OpenAI API client
│   ├── framework_loader.py       # Framework definition loader
│   └── document_parser.py        # PDF/URL/Google Docs parsing
└── README.md
```

### Database Schema

#### Projects
```sql
CREATE TABLE projects (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);
```

#### Context Documents
```sql
CREATE TABLE context_documents (
    id TEXT PRIMARY KEY NOT NULL,
    project_id TEXT NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL,  -- 'pdf', 'url', 'google_doc', 'text'
    content TEXT NOT NULL,
    url TEXT,
    is_global INTEGER NOT NULL DEFAULT 0,  -- Global context flag
    size_bytes INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);
```

#### Framework Outputs
```sql
CREATE TABLE framework_outputs (
    id TEXT PRIMARY KEY NOT NULL,
    project_id TEXT NOT NULL,
    framework_id TEXT NOT NULL,
    category TEXT NOT NULL,
    name TEXT NOT NULL,
    user_prompt TEXT NOT NULL,
    context_doc_ids TEXT NOT NULL,  -- JSON array of document IDs
    generated_content TEXT NOT NULL,
    format TEXT NOT NULL DEFAULT 'markdown',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);
```

## 🎨 Framework Definitions

Each framework is defined in JSON format with:

```json
{
  "id": "customer-journey-map",
  "name": "Customer Journey Map",
  "category": "discovery",
  "description": "Map the customer's end-to-end experience",
  "icon": "🗺️",
  "system_prompt": "You are a PM expert in customer journey mapping...",
  "example_output": "# Customer Journey Map\n\n## Overview...",
  "guiding_questions": [
    "Who is the target customer persona?",
    "What are the key stages in their journey?"
  ],
  "supports_visuals": true,
  "visual_instructions": "Include a Mermaid journey diagram..."
}
```

### Adding New Frameworks

1. Create a JSON file in the appropriate category folder (`src/frameworks/{category}/`)
2. Follow the schema above with all required fields
3. For visual frameworks, set `supports_visuals: true` and provide `visual_instructions`
4. The framework will be automatically loaded and available in the UI

## 🚀 API Endpoints

Python sidecar runs on `http://127.0.0.1:8000` and provides:

### Framework Generation
- `POST /generate-framework` - Generate framework output from context
- `POST /generate-framework/stream` - Streaming version (SSE)

### Document Parsing
- `POST /parse-url?url={url}` - Auto-fetch and extract content from URLs
- `POST /parse-pdf` - Extract text from PDF bytes

### Chat
- `POST /chat` - GPT-5 chat (non-streaming)
- `POST /chat/stream` - GPT-5 chat (streaming SSE)

### Field Suggestions
- `POST /suggest-field` - AI suggestions for template fields

### Health
- `GET /` - Health check
- `GET /health` - Health status
- `GET /models` - Available OpenAI models

## 🎯 What's Working Now

✅ **Project Management** - Create unlimited projects
✅ **Context Documents** - Upload PDFs, fetch URLs, import Google Docs
✅ **AI Framework Generation** - 8 frameworks with context-driven prompts
✅ **Visual Diagrams** - Mermaid rendering for Customer Journey Maps
✅ **Outputs Library** - Save, search, filter, and view all outputs
✅ **Global Context** - Documents available to all prompts
✅ **Document Parsing** - Automatic content extraction (PDF, HTML)
✅ **Chat Interface** - GPT-5 chat with streaming, history, cost tracking
✅ **Settings** - Secure API key storage, theme toggle

## 🔮 Upcoming Features

### Optional Enhancements (Not Started)
- [ ] **Google Docs API Export** - Direct export to Google Docs
- [ ] **37 more frameworks** - Complete library of 45 PM frameworks
- [ ] **Strategy Canvas visuals** - Visual generation beyond Mermaid
- [ ] **Business Model Canvas visuals** - Interactive canvas generation
- [ ] **Workflow automation** - Agentic workflows (P2 from original plan)
- [ ] **Multi-LLM support** - Claude, Gemini, local models (P1 from original plan)

## 📝 License

MIT License

## 🤝 Contributing

Contributions welcome! This is an open-source project aimed at empowering Product Managers with AI-powered tools.

To contribute:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 🙏 Acknowledgments

Built with ❤️ for Product Managers by Product Managers.

**Tech Stack Credits:**
- [Tauri](https://tauri.app/) - Rust-powered desktop framework
- [React](https://react.dev/) + [Vite](https://vitejs.dev/) - Modern frontend tooling
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework
- [OpenAI GPT-5](https://openai.com/) - Frontier language models
- [Mermaid](https://mermaid.js.org/) - Diagram generation
- [PyMuPDF](https://pymupdf.readthedocs.io/) - PDF text extraction
- [BeautifulSoup](https://www.crummy.com/software/BeautifulSoup/) - HTML parsing

---

**Status**: MVP Complete | 8/45 Frameworks | Mac Desktop App
**Version**: 0.1.0-mvp
**Last Updated**: February 2026
