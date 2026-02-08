# PM IDE - AI-Powered Product Management Workspace

A Mac-first IDE specifically designed for Product Managers to manage context, automate workflows, and apply PM frameworks with AI assistance.

## 🎯 Vision

PM IDE enables product managers to:
- Manage persistent context across projects (PRDs, memos, research, strategy docs)
- Chat with AI about their product knowledge base
- Apply PM frameworks (RICE, DACI, JTBD, PRD templates) with AI assistance
- Build and automate workflows with AI agents (future)
- Prototype features rapidly without engineering resources (future)

## 🛠 Tech Stack

- **Frontend**: React 18 + Vite + TypeScript + Tailwind CSS
- **Desktop**: Tauri 2.0 (Rust backend)
- **Python Sidecar**: FastAPI + OpenAI SDK + PyMuPDF + Chroma
- **LLM**: GPT-5 (OpenAI Frontier Models)
- **Database**: SQLite + Vector Search

## 🚀 Current Status: Sprint 2 Complete

### Sprint 1: Project & Chat Foundation ✅ Complete
- ✅ SQLite database schema (projects, conversations, messages, token_usage)
- ✅ Project CRUD operations
- ✅ Collapsible sidebar with project management
- ✅ Settings page with secure API key storage

### Sprint 2: GPT-5 Integration ✅ Complete
- ✅ OpenAI API client with GPT-5 Frontier models (gpt-5, gpt-5-mini, gpt-5-nano)
- ✅ Streaming chat interface with real-time token display
- ✅ Conversation history with delete functionality
- ✅ Token usage tracking and cost calculation
- ✅ Rich markdown rendering with code highlighting
- ✅ User profile context integration
- ✅ Model selector (GPT-5 / GPT-5 Mini / GPT-5 Nano)

### Sprint 3: Framework Templates 🔨 Next Up
- [ ] Framework library UI (RICE, PRD, User Stories)
- [ ] Template editor with AI-assisted field filling
- [ ] Export to Markdown/PDF
- [ ] Template sharing and customization

### Sprint 4: Document Management & Polish 📋 Upcoming
- [ ] Document import (Markdown, PDF)
- [ ] Monaco editor integration
- [ ] Semantic search across documents
- [ ] Polish and user testing

## 💻 Development

### Prerequisites
- Rust 1.93+
- Node.js 18+
- Python 3.11+
- Tauri CLI

### Getting Started

```bash
# Install dependencies
npm install

# Set up Python sidecar
cd python-sidecar
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# Run in development mode
npm run tauri dev

# Build for production
npm run tauri build
```

### Project Structure

```
pm-ide/
├── src/                    # React frontend
│   ├── components/         # React components
│   ├── lib/               # Utilities and helpers
│   ├── pages/             # Page components
│   └── templates/         # Framework templates (RICE, PRD, etc.)
├── src-tauri/             # Tauri / Rust backend
│   └── src/
│       ├── main.rs        # Entry point
│       ├── commands.rs    # IPC commands
│       └── db.rs          # Database operations
├── python-sidecar/        # Python FastAPI server
│   ├── main.py           # FastAPI app
│   ├── openai_client.py  # OpenAI API client
│   └── pdf_parser.py     # PDF processing
└── README.md
```

## 📝 License

MIT License

## 🤝 Contributing

Contributions welcome! This is an open-source project aimed at empowering Product Managers with AI-powered tools.

---

**Note**: This is an early-stage project (Sprint 2 of 4-sprint MVP). Expect rapid changes and iterations.

Built with ❤️ for Product Managers by Product Managers.

## 🎯 What's Working Now

- ✨ Create unlimited projects to organize your PM work
- 💬 Chat with GPT-5 about product strategy, frameworks, and ideas
- 📝 Conversation history saved automatically per project
- 💰 Token usage and cost tracking
- 🎨 Beautiful rich text formatting with code highlighting
- 🔐 Secure API key storage in system keychain
