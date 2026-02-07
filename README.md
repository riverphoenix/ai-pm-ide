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
- **Python Sidecar**: FastAPI + Anthropic SDK + PyMuPDF + Chroma
- **LLM**: Claude (Anthropic)
- **Database**: SQLite + Vector Search

## 🚀 Current Status: P0 MVP (In Development)

### Completed
- ✅ Development environment setup
- ✅ Tauri project initialization
- ✅ Python sidecar setup
- ✅ Project structure

### In Progress
- 🔨 Sprint 1: Project & Document Management (Week 3-4)
  - [ ] SQLite database schema
  - [ ] Project CRUD operations
  - [ ] Document import (Markdown, PDF)
  - [ ] Monaco editor integration
  - [ ] Semantic search

### Upcoming
- Sprint 2: Claude Integration (Week 5-6)
- Sprint 3: Framework Templates (Week 7-8)
- Sprint 4: Polish & Testing (Week 9-10)

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
│   ├── claude_client.py  # Claude API client
│   └── pdf_parser.py     # PDF processing
└── README.md
```

## 📝 License

MIT License

## 🤝 Contributing

Contributions welcome! This is an open-source project aimed at empowering Product Managers with AI-powered tools.

---

**Note**: This is an early-stage project (Week 1 of 10-week MVP). Expect rapid changes and iterations.

Built with ❤️ for Product Managers by Product Managers.
