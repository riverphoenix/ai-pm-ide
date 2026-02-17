# PM IDE - AI-Powered Product Management Workspace

A Mac-first IDE specifically designed for Product Managers to manage context, generate PM frameworks with AI, and streamline product workflows.

## 🎯 Vision

PM IDE enables product managers to:
- **Manage persistent context** across projects (PRDs, memos, research, strategy docs)
- **Generate PM frameworks** using AI with context-driven prompts (not form-based)
- **Apply 45+ PM frameworks** across Strategy, Prioritization, Discovery, Development, Execution, Decision, and Communication
- **Use 30+ prompt templates** with `{variable}` substitution for repeatable PM workflows
- **Upload context documents** (PDFs, URLs, Google Docs, plain text) with automatic content extraction
- **Import/export frameworks and prompts** as .md files with YAML front matter for sharing and backup
- **Chain multi-step workflows** that pipe output from one framework to the next
- **Get AI-powered insights** with proactive suggestions based on project activity
- **Track version history** with automatic git-based versioning for every output
- **Export to Jira and Notion** directly from the outputs library
- **Save and organize outputs** in a searchable library with visual diagrams
- **Chat with AI** about product strategy, frameworks, and ideas

## 🛠 Tech Stack

- **Frontend**: React 19 + Vite + TypeScript + Tailwind CSS v4
- **Desktop**: Tauri 2.0 (Rust backend with WKWebView on Mac)
- **Python Sidecar**: FastAPI + OpenAI SDK + PyMuPDF + BeautifulSoup4
- **LLM**: GPT-5 (OpenAI Frontier Models: gpt-5, gpt-5-mini, gpt-5-nano)
- **Database**: SQLite with CASCADE delete patterns
- **Version Control**: git2 (libgit2) for per-project output versioning
- **Integrations**: Jira REST API v3, Notion API v2022-06-28
- **Encryption**: AES-256-GCM for API keys and integration tokens
- **Diagrams**: Mermaid for Customer Journey Maps and visual frameworks

## ✅ Current Status: Phase 7 Complete (Advanced Features)

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
- **45 frameworks** across 7 categories (Strategy, Prioritization, Discovery, Development, Execution, Decision, Communication)
- **Context-driven generation**: Upload documents + user prompt → AI generates complete framework output
- **Visual generation**: Mermaid diagrams for Customer Journey Maps
- **Save/Export**: Save to library, download markdown, copy to clipboard

#### 3b. **Framework Management (Phase 4)** ✅
- **SQLite-backed frameworks**: All definitions stored in database with full CRUD
- **Prompt editing**: Monaco editor for customizing system prompts and guiding questions
- **Framework Manager**: Browse, create, edit, duplicate, and delete frameworks
- **Category Manager**: Create custom categories, edit existing ones
- **Reset to Default**: Restore built-in frameworks from seed data
- **Search**: Full-text search across framework names and descriptions

#### 3c. **Prompts Library (Phase 5)** ✅
- **30 pre-loaded prompt templates** across 7 categories (PRD, Analysis, Stories, Communication, Data, Prioritization, Strategy)
- **Variable system**: Dynamic `{variable}` placeholders with text, textarea, and select input types
- **Auto-detection**: Variables extracted automatically from prompt text as you type
- **Prompt Picker**: Select saved prompts in FrameworkGenerator, fill variables, preview resolved text
- **CRUD management**: Create, edit, duplicate, delete custom prompts (built-in prompts protected)
- **Usage tracking**: Track how often each prompt is used, sort by most-used
- **Favorites**: Star prompts for quick access
- **Search & filter**: Full-text search + category filtering

#### 3d. **Framework Marketplace (Phase 6)** ✅
- **Export frameworks/prompts** as .md files with YAML front matter metadata
- **Import from .md files** with preview, conflict detection, and resolution (overwrite/copy/skip)
- **Batch export**: Select multiple items, export to a directory
- **Multi-file import**: Select multiple .md files, review all with per-file conflict actions
- **Category auto-creation**: Unknown categories in imported files are auto-created
- **Validation**: Type checking, required fields, export version validation
- **Round-trip safe**: Export → re-import preserves all data including variables

#### 4. **Outputs Library** ✅
- View all saved framework outputs
- Filter by category (Strategy, Prioritization, etc.)
- Search across output names and content
- Preview with rich markdown rendering + Mermaid diagrams

#### 5. **Chat Interface** ✅
- GPT-5 chat integration with streaming responses
- Conversation history per project
- Token usage tracking and cost calculation
- Model selector (GPT-5 / GPT-5 Mini / GPT-5 Nano)

#### 6. **Documents Explorer (Phase 2)** ✅
- **Folder tree**: Hierarchical file management with unlimited depth
- **Drag & drop**: Move files between folders with @dnd-kit
- **Search**: Fuzzy search across all documents and outputs
- **Favorites**: Star items for quick access
- **Folder colors**: 6 preset color labels for organization
- **Inline rename**: Double-click to rename files and folders
- **Breadcrumb navigation**: Path display above preview panel

#### 7. **Console Integration (Phase 3)** ✅
- **Command Palette (Cmd+K)**: Fuzzy-search all commands, keyboard navigation, shortcut hints
- **Global Keyboard Shortcuts**: Cmd+1-5 (tabs), Cmd+` (terminal), Cmd+B (sidebar)
- **Terminal Panel**: Execute shell commands, command history, exit code display
- **Resizable Bottom Panel**: Drag-to-resize with Terminal/Output tabs
- **Sidebar Toggle**: Show/hide sidebar with keyboard or button

#### 8. **Workflow Builder (Phase 7)** ✅
- **Multi-step workflows**: Chain multiple frameworks sequentially with output piping
- **Output chaining**: `{prev_output}` placeholder passes each step's output to the next
- **3 built-in templates**: Complete Product Brief (4 steps), Feature Validation (3 steps), Strategic Review (3 steps)
- **Workflow Editor**: Add/remove steps, configure framework, prompt, model, and context docs per step
- **Workflow Runner**: Real-time execution with step progress indicators and streaming output
- **Run history**: Track all workflow executions with per-step status and output

#### 9. **AI Insights (Phase 7)** ✅
- **Proactive suggestions**: AI analyzes project activity and recommends next steps
- **3 insight types**: Suggestions, patterns, and next-step recommendations
- **Priority levels**: High/medium/low priority for each insight
- **Dismissible**: Mark insights as dismissed to keep the panel focused
- **Framework linking**: Next-step insights link directly to suggested frameworks

#### 10. **Git-Based Version History (Phase 7)** ✅
- **Auto-commit**: Every output save/update automatically commits to a per-project git repo
- **Version history panel**: Browse all commits for any output
- **Diff viewer**: Line-by-line diff with color-coded additions/deletions
- **Rollback**: Restore any output to a previous version with one click

#### 11. **Jira & Notion Integration (Phase 7)** ✅
- **Jira export**: Create Jira issues from framework outputs with project/issue-type selection
- **Notion export**: Create Notion pages from framework outputs under any parent page
- **Settings-based config**: API tokens encrypted with AES-256-GCM
- **Connection testing**: Validate credentials before use
- **Conditional UI**: Export buttons only shown when integration is configured

#### 12. **Settings** ✅
- Secure API key storage with AES-256-GCM encryption
- User profile context (name, role, company)
- Jira integration (URL, email, API token, project key)
- Notion integration (API token, parent page ID)

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Tauri Window (WKWebView)              │
│  ┌────────────────────────────────────────────────────┐ │
│  │         React Frontend (Vite + TypeScript)         │ │
│  │                                                    │ │
│  │  ├─ FrameworksHome (category browser)            │ │
│  │  ├─ FrameworkGenerator (AI generation)           │ │
│  │  ├─ FrameworkManager (CRUD + editing)            │ │
│  │  ├─ FrameworkCustomizer (prompt editor)          │ │
│  │  ├─ CategoryManager (category CRUD)              │ │
│  │  ├─ PromptsLibrary (browse/manage prompts)      │ │
│  │  ├─ PromptEditorModal (create/edit prompts)     │ │
│  │  ├─ PromptPickerModal (use prompts in gen)      │ │
│  │  ├─ ImportPreviewDialog (single import preview) │ │
│  │  ├─ BatchExportDialog (multi-item export)       │ │
│  │  ├─ BatchImportDialog (multi-file import)       │ │
│  │  ├─ WorkflowsPage (workflow list + editor)      │ │
│  │  ├─ WorkflowRunner (streaming execution)        │ │
│  │  ├─ InsightsPanel (AI project insights)         │ │
│  │  ├─ VersionHistory (git commit browser)         │ │
│  │  ├─ DiffViewer (line-level diff display)        │ │
│  │  ├─ ExportToJiraDialog (Jira issue export)      │ │
│  │  ├─ ExportToNotionDialog (Notion page export)   │ │
│  │  ├─ ContextManager (document management)         │ │
│  │  ├─ OutputsLibrary (saved outputs + export)      │ │
│  │  ├─ DocumentsExplorer (folder tree + preview)    │ │
│  │  ├─ ChatInterface (GPT-5 chat)                   │ │
│  │  ├─ CommandPalette (Cmd+K quick actions)         │ │
│  │  ├─ BottomPanel (terminal + output)              │ │
│  │  └─ Settings (API keys, integrations)            │ │
│  └────────────────────────────────────────────────────┘ │
│                          ↕                              │
│  ┌────────────────────────────────────────────────────┐ │
│  │              Tauri Core (Rust)                     │ │
│  │                                                    │ │
│  │  ├─ IPC Commands (~105 commands)                 │ │
│  │  ├─ SQLite Database (12 tables)                  │ │
│  │  ├─ Git Version Control (per-project repos)      │ │
│  │  ├─ HTTP Client (Jira, Notion APIs)              │ │
│  │  ├─ AES-256-GCM Encryption                       │ │
│  │  └─ Shell Command Execution                       │ │
│  └────────────────────────────────────────────────────┘ │
│                          ↕                              │
│  ┌────────────────────────────────────────────────────┐ │
│  │         Python Sidecar (FastAPI Server)            │ │
│  │                                                    │ │
│  │  ├─ OpenAI API Client (GPT-5)                    │ │
│  │  ├─ Framework Generation Engine                   │ │
│  │  ├─ AI Insights Engine                            │ │
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
│   │   ├── FrameworkManager.tsx  # Framework CRUD management
│   │   ├── FrameworkCustomizer.tsx # Prompt editor slide-over
│   │   ├── CategoryManager.tsx   # Category CRUD modal
│   │   ├── PromptEditor.tsx      # Monaco editor wrapper
│   │   ├── PromptEditorModal.tsx # Create/edit saved prompts
│   │   ├── PromptPickerModal.tsx # Select prompt + fill variables
│   │   ├── ImportPreviewDialog.tsx # Single file import preview
│   │   ├── BatchExportDialog.tsx # Multi-item export selector
│   │   ├── BatchImportDialog.tsx # Multi-file import review
│   │   ├── FolderTree.tsx        # Drag-and-drop folder tree
│   │   ├── TreeItem.tsx          # Individual tree node
│   │   ├── CommandPalette.tsx    # Cmd+K command palette
│   │   ├── BottomPanel.tsx       # Terminal/output panel
│   │   ├── TerminalView.tsx      # Shell command terminal
│   │   ├── TopActionBar.tsx      # IDE action buttons
│   │   ├── ResizableDivider.tsx  # Drag-to-resize panels
│   │   ├── WorkflowEditor.tsx    # Workflow step builder
│   │   ├── WorkflowRunner.tsx    # Streaming workflow executor
│   │   ├── InsightsPanel.tsx     # AI project insights panel
│   │   ├── VersionHistory.tsx    # Git commit history viewer
│   │   ├── DiffViewer.tsx        # Line-level diff display
│   │   ├── ExportToJiraDialog.tsx # Jira issue creation dialog
│   │   ├── ExportToNotionDialog.tsx # Notion page creation dialog
│   │   ├── MermaidRenderer.tsx   # Mermaid diagram renderer
│   │   └── MarkdownWithMermaid.tsx # Custom markdown renderer
│   ├── hooks/                    # Custom React hooks
│   │   └── useKeyboardShortcuts.ts # Global keyboard shortcuts
│   ├── lib/                      # Utilities and helpers
│   │   ├── ipc.ts                # Tauri IPC wrappers
│   │   ├── types.ts              # TypeScript types
│   │   ├── shortcuts.ts          # Keyboard shortcut registry
│   │   ├── commandRegistry.ts    # Command palette definitions
│   │   └── frameworks.ts         # Framework loader utility
│   ├── pages/                    # Page components
│   │   ├── ProjectView.tsx       # Main project workspace
│   │   ├── DocumentsExplorer.tsx # Folder tree + preview panel
│   │   ├── FrameworksHome.tsx    # Framework category browser
│   │   ├── PromptsLibrary.tsx   # Prompt templates browser
│   │   ├── ContextManager.tsx    # Document management
│   │   ├── OutputsLibrary.tsx    # Saved outputs + export
│   │   └── WorkflowsPage.tsx    # Workflow list + management
│   ├── frameworks/               # Framework JSON definitions (seed data)
│   │   ├── categories.json       # 7 category definitions
│   │   ├── strategy/             # 8 frameworks
│   │   ├── prioritization/       # 6 frameworks
│   │   ├── discovery/            # 8 frameworks
│   │   ├── development/          # 5 frameworks
│   │   ├── execution/            # 6 frameworks
│   │   ├── decision/             # 5 frameworks
│   │   └── communication/        # 7 frameworks
│   └── prompts/                  # Prompt template seed data (30 prompts)
│       ├── prd/                  # 5 prompts
│       ├── analysis/             # 5 prompts
│       ├── stories/              # 5 prompts
│       ├── communication/        # 5 prompts
│       ├── data/                 # 4 prompts
│       ├── prioritization/       # 3 prompts
│       └── strategy/             # 3 prompts
├── src-tauri/                    # Tauri / Rust backend
│   └── src/
│       ├── main.rs               # Entry point
│       ├── lib.rs                # Command registration (~105 commands)
│       └── commands.rs           # All IPC commands + SQLite schema
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

#### Folders (Phase 2)
```sql
CREATE TABLE folders (
    id TEXT PRIMARY KEY NOT NULL,
    project_id TEXT NOT NULL,
    parent_id TEXT,           -- NULL for root
    name TEXT NOT NULL,
    color TEXT,               -- red, orange, yellow, green, blue, purple
    sort_order INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_id) REFERENCES folders(id) ON DELETE CASCADE
);
```

#### Context Documents (with folder support)
```sql
CREATE TABLE context_documents (
    id TEXT PRIMARY KEY NOT NULL,
    project_id TEXT NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL,       -- 'pdf', 'url', 'google_doc', 'text'
    content TEXT NOT NULL,
    folder_id TEXT,           -- NULL = root level
    is_favorite INTEGER NOT NULL DEFAULT 0,
    tags TEXT DEFAULT '[]',
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);
```

#### Command History (Phase 3)
```sql
CREATE TABLE command_history (
    id TEXT PRIMARY KEY NOT NULL,
    project_id TEXT NOT NULL,
    command TEXT NOT NULL,
    output TEXT NOT NULL,
    exit_code INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);
```

#### Framework Categories (Phase 4)
```sql
CREATE TABLE framework_categories (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    icon TEXT NOT NULL,
    is_builtin INTEGER NOT NULL DEFAULT 1,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);
```

#### Framework Definitions (Phase 4)
```sql
CREATE TABLE framework_definitions (
    id TEXT PRIMARY KEY NOT NULL,
    category TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    icon TEXT NOT NULL,
    example_output TEXT NOT NULL DEFAULT '',
    system_prompt TEXT NOT NULL DEFAULT '',
    guiding_questions TEXT NOT NULL DEFAULT '[]',
    supports_visuals INTEGER NOT NULL DEFAULT 0,
    visual_instructions TEXT,
    is_builtin INTEGER NOT NULL DEFAULT 0,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (category) REFERENCES framework_categories(id)
);
```

#### Saved Prompts (Phase 5)
```sql
CREATE TABLE saved_prompts (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    category TEXT NOT NULL DEFAULT 'general',
    prompt_text TEXT NOT NULL,
    variables TEXT NOT NULL DEFAULT '[]',   -- JSON array of variable definitions
    framework_id TEXT,
    is_builtin INTEGER NOT NULL DEFAULT 0,
    is_favorite INTEGER NOT NULL DEFAULT 0,
    usage_count INTEGER NOT NULL DEFAULT 0,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (framework_id) REFERENCES framework_definitions(id) ON DELETE SET NULL
);
```

#### Workflows (Phase 7)
```sql
CREATE TABLE workflows (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    steps TEXT NOT NULL DEFAULT '[]',      -- JSON array of WorkflowStepDef
    is_template INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE TABLE workflow_runs (
    id TEXT PRIMARY KEY,
    workflow_id TEXT NOT NULL,
    project_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',  -- pending, running, completed, failed, cancelled
    started_at INTEGER,
    completed_at INTEGER,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (workflow_id) REFERENCES workflows(id) ON DELETE CASCADE
);

CREATE TABLE workflow_run_steps (
    id TEXT PRIMARY KEY,
    run_id TEXT NOT NULL,
    step_index INTEGER NOT NULL,
    framework_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',  -- pending, running, completed, failed, skipped
    input_prompt TEXT,
    output_content TEXT,
    output_id TEXT,
    error TEXT,
    started_at INTEGER,
    completed_at INTEGER,
    FOREIGN KEY (run_id) REFERENCES workflow_runs(id) ON DELETE CASCADE
);
```

#### Project Insights (Phase 7)
```sql
CREATE TABLE project_insights (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    insight_type TEXT NOT NULL,  -- suggestion, pattern, next_step
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    priority TEXT NOT NULL DEFAULT 'medium',
    framework_id TEXT,
    is_dismissed INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
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

**Via UI (recommended):**
1. Go to Frameworks tab → click "Manage"
2. Click "New Framework" → fill in name, category, description, icon
3. Edit the system prompt using the built-in Monaco editor
4. Add guiding questions and example output

**Via seed data (built-in):**
1. Create a JSON file in `src/frameworks/{category}/`
2. Add an `include_str!` entry in `commands.rs` (both `seed_frameworks` and `reset_framework_def`)
3. The framework will be seeded on first launch via `INSERT OR IGNORE`

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

### AI Insights
- `POST /insights/generate` - Generate project insights from metadata (SSE streaming)

### Field Suggestions
- `POST /suggest-field` - AI suggestions for template fields

### Health
- `GET /` - Health check
- `GET /health` - Health status
- `GET /models` - Available OpenAI models

## 🎯 What's Working Now

✅ **Project Management** - Create unlimited projects
✅ **Context Documents** - Upload PDFs, fetch URLs, import Google Docs
✅ **AI Framework Generation** - 45 frameworks with context-driven prompts
✅ **Framework Management** - Create, edit, duplicate, delete frameworks with Monaco editor
✅ **Prompts Library** - 30 pre-loaded templates with {variable} substitution, CRUD, usage tracking
✅ **Framework Marketplace** - Import/export frameworks and prompts as .md files with YAML front matter
✅ **Workflow Builder** - Chain multi-step workflows with output piping, 3 built-in templates
✅ **AI Insights** - Proactive suggestions based on project activity analysis
✅ **Version History** - Git-based auto-commit, diff viewer, rollback for all outputs
✅ **Jira Integration** - Export outputs as Jira issues with project/type selection
✅ **Notion Integration** - Export outputs as Notion pages under any parent page
✅ **Visual Diagrams** - Mermaid rendering for Customer Journey Maps
✅ **Outputs Library** - Save, search, filter, view, and export outputs
✅ **Document Parsing** - Automatic content extraction (PDF, HTML)
✅ **Chat Interface** - GPT-5 chat with streaming, history, cost tracking
✅ **Documents Explorer** - Folder tree, drag-and-drop, search, favorites, colors
✅ **Command Palette** - Cmd+K with fuzzy search and keyboard navigation
✅ **Keyboard Shortcuts** - Cmd+1-7 tabs, Cmd+` terminal, Cmd+B sidebar
✅ **Terminal Panel** - Execute shell commands with history
✅ **Settings** - API keys, user profile, Jira & Notion integration config

## 🔮 Roadmap: 7-Phase Transformation Plan

**📋 Full Implementation Plan**: [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md)
**Timeline**: 22 weeks (~5.5 months)
**Status**: Phase 0 (MVP) ✅ | Phase 1 (UI) ✅ | Phase 2 (Files) ✅ | Phase 3 (Console) ✅ | Phase 4 (Frameworks) ✅ | Phase 5 (Prompts) ✅ | Phase 6 (Marketplace) ✅ | Phase 7 (Advanced) ✅

---

### **Phase 1: UI Redesign (4-5 weeks)** - Codex-Inspired ✅
**Status**: Complete

Transformed the interface into a modern, agent-native workspace inspired by OpenAI's Codex.

**Completed**:
- 🎨 **Codex Design System**: Dark theme with custom color tokens (codex-bg, codex-surface, codex-sidebar, codex-accent), refined typography
- 🔧 **Redesigned Sidebar**: Flat nav items with SVG icons, "Threads" section, Settings at bottom
- ⚡ **Top Action Bar**: Project name display, Open, Commit, Terminal, IDE toggles
- 📦 **Codex-Style Pages**: Settings (sidebar nav + form layout), Frameworks (card grid), Context, Outputs (split panel), Chat (centered "Let's build" empty state, model selector below input)
- 🔲 **ResizableDivider**: Drag-to-resize panels for sidebar and split views
- 🛠 **Scrolling Fix**: Inline styles on full parent chain with calc(100vh) for reliable overflow containment in Tailwind v4
- ✨ **Clean Components**: Modern inputs, buttons, cards with consistent hover states

---

### **Phase 2: File System & Project Structure (3-4 weeks)** - VSCode-Like 📁 ✅
**Status**: Complete

Added VSCode-style file management with folder tree and organization.

**Completed**:
- 🌲 **Folder Tree**: Hierarchical folders with expand/collapse, depth indicators
- 🎯 **Drag & Drop**: @dnd-kit integration with visual drop targets
- ⚙️ **File Operations**: Create folders, rename (inline), delete, move to folder
- 🔍 **Fuzzy Search**: Backend SQL LIKE search across documents and outputs
- 🏷️ **Metadata**: Favorites (star toggle), 6 folder color labels, breadcrumbs
- 📄 **Preview Panel**: Split view with content preview for selected items

---

### **Phase 3: Console Integration (2-3 weeks)** - Power User Features ⌨️ ✅
**Status**: Complete

Added IDE-style terminal, command palette, and keyboard shortcuts.

**Completed**:
- 💻 **Terminal Panel**: Resizable bottom panel with shell command execution
- 🎯 **Command Palette (Cmd+K)**: Fuzzy-search commands with keyboard navigation
- ⚡ **Keyboard Shortcuts**: 8 shortcuts (tabs, terminal, sidebar, palette)
- 📊 **Bottom Panel**: Terminal/Output tabs, drag-to-resize, close button

**Keyboard Shortcuts**:
| Shortcut | Action |
|----------|--------|
| `Cmd+K` | Command palette |
| `Cmd+1-7` | Switch tabs (Chat, Documents, Frameworks, Prompts, Context, Outputs, Workflows) |
| `Cmd+B` | Toggle sidebar |
| `` Cmd+` `` | Toggle terminal |

---

### **Phase 4: Framework Expansion + Editing (4-6 weeks)** - Complete PM Toolkit 🎯 ✅
**Status**: Complete

Expanded from 8 to 45 frameworks, migrated to SQLite, added full editing and management UI.

**Completed**:
- 📚 **45 Frameworks** across 7 categories, all stored in SQLite with full CRUD
- ✏️ **Monaco Prompt Editor**: Edit system prompts with syntax highlighting and Codex dark theme
- 🏷️ **Category Management**: Create, edit, and delete custom categories
- 🔧 **Framework Manager**: Browse, create, edit, duplicate, and delete frameworks
- 🔄 **Reset to Default**: Restore any built-in framework from seed data
- 🔍 **Full-text Search**: Search frameworks by name and description
- 📊 **13 New Rust Commands**: Complete CRUD for categories and framework definitions
- 🗃️ **Database Migration**: `INSERT OR IGNORE` seeding — existing installs get new frameworks without overwriting customizations

**Frameworks by Category (45 total)**:
- **Strategy** (8): Business Model Canvas, SWOT, Porter's Five Forces, Lean Canvas, Value Proposition Canvas, Blue Ocean Strategy, Ansoff Matrix, Strategic Planning
- **Prioritization** (6): RICE, MoSCoW, Kano Model, ICE Scoring, Value-Effort Matrix, Weighted Scoring
- **Discovery** (8): JTBD, Customer Journey Map, User Personas, Empathy Map, Problem Statement, Competitive Analysis, Survey Design, Feature Audit
- **Development** (5): Sprint Planning, Technical Spec, Architecture Decision Record, Definition of Done, Release Plan
- **Execution** (6): OKRs, North Star Metric, KPI Dashboard, Retrospective, Roadmap Template, Success Metrics
- **Decision** (5): Decision Matrix, RACI, Pre-Mortem, Opportunity Assessment, Trade-Off Analysis
- **Communication** (7): PRD, User Stories, Stakeholder Update, Launch Plan, Feature Brief, Product Vision, Changelog

---

### **Phase 5: Prompts Library (2-3 weeks)** - Reusable Templates 📝 ✅
**Status**: Complete

Added saved prompts with `{variable}` template system for repeatable PM workflows.

**Completed**:
- 📝 **30 Pre-loaded Prompt Templates** across 7 categories with rich, senior-PM-quality prompt text
- 🔤 **Variable System**: Dynamic `{variable_name}` placeholders with 3 input types (text, textarea, select)
- 🔧 **Prompt Editor**: Monaco editor with auto-variable detection, type config, required toggle, preview panel
- 📂 **PromptsLibrary Page**: Browse, search, filter by category, sort (most-used, recent, alpha, favorites)
- 🎯 **PromptPickerModal**: Select prompt in FrameworkGenerator, fill variables, preview resolved text
- 📊 **Usage Tracking**: Increment usage count on each use, sort by most-used
- ⭐ **Favorites & CRUD**: Star prompts, create/edit/duplicate/delete custom prompts (built-in protected)
- 🗃️ **8 New Rust Commands**: Full CRUD + search + duplicate + increment usage (64 total)

**Prompts by Category (30 total)**:
- **PRD** (5): PRD from JTBD, Technical PRD, One-Pager, Feature Spec, API Specification
- **Analysis** (5): Competitive Analysis, Feature Comparison, Market Positioning, Feedback Synthesis, Churn Analysis
- **Stories** (5): JTBD to Stories, Epic Breakdown, INVEST Criteria, Acceptance Criteria, Story Estimation
- **Communication** (5): Stakeholder Email, Executive Summary, Product Announcement, Release Notes, Team Update
- **Data** (4): Metrics Analysis, A/B Test Analysis, KPI Review, Funnel Analysis
- **Prioritization** (3): Quarterly Priorities, Feature Scoring, Resource Allocation
- **Strategy** (3): OKR Drafting, Strategic Initiative, Vision Alignment

---

### **Phase 6: Framework Marketplace (3-4 weeks)** - Import/Export 📦 ✅
**Status**: Complete

Added .md file import/export for frameworks and prompts, enabling portability and sharing.

**Completed**:
- 📥 **Single Export**: Export any framework or prompt as a .md file with YAML front matter + markdown body
- 📤 **Single Import**: Import .md file with preview, conflict detection (already exists, built-in conflict)
- 📦 **Batch Export**: Select multiple items via checkbox, export all to a directory
- 📂 **Multi-File Import**: Select multiple .md files, review all with per-file conflict actions (Import/Copy/Overwrite/Skip)
- ⚠️ **Conflict Resolution**: 3 actions for duplicate IDs — overwrite existing, import as copy (new ID), or skip
- 🏷️ **Category Auto-Creation**: Unknown categories in imported files are auto-created as custom categories
- ✅ **Validation**: Type field, export version, required fields, descriptive error messages
- 🔧 **10 New Rust Commands**: Export/import for both frameworks and prompts (74 total)
- 🎨 **3 New Dialog Components**: ImportPreviewDialog, BatchExportDialog, BatchImportDialog

**Export Format** (.md with YAML front matter):
```markdown
---
type: framework
id: swot
name: "SWOT Analysis"
category: strategy
description: "Analyze Strengths, Weaknesses, Opportunities, and Threats"
icon: "⚖️"
supports_visuals: false
exported_at: "2026-02-17T14:30:00Z"
export_version: 1
---

# System Prompt
[Full system prompt text]

# Guiding Questions
1. What product or business are you analyzing?
2. Who is your target customer?

# Example Output
[Full example output markdown]
```

---

### **Phase 7: Advanced Features (6-8 weeks)** - Workflows, Insights, Git, Integrations 🤖 ✅
**Status**: Complete

Added workflow builder, AI insights, git-based version history, and Jira/Notion integrations.

**Completed**:
- 🔗 **Workflow Builder**: Chain multiple frameworks into multi-step workflows with sequential execution
  - 3 built-in templates: Complete Product Brief (4 steps), Feature Validation (3 steps), Strategic Review (3 steps)
  - `{prev_output}` placeholder for output chaining between steps
  - Workflow Editor with per-step framework, prompt, model, and context doc configuration
  - Workflow Runner with real-time progress indicators and streaming output
  - 15 new Rust commands for workflow CRUD, run management, and step tracking
- 💡 **AI Insights**: Proactive project analysis and recommendations
  - Python endpoint analyzes project metadata (outputs, docs, conversations) via GPT-5-mini
  - 3 insight types: suggestions, patterns, and next-step recommendations with priority levels
  - Collapsible InsightsPanel in project view with dismiss and framework-linking actions
  - 4 new Rust commands for insight CRUD
- 📦 **Git Version History**: Automatic versioning for all framework outputs
  - Per-project git repos (libgit2) initialized lazily on first output save
  - Auto-commit on every `create_framework_output` and `update_framework_output`
  - VersionHistory panel with commit browser, DiffViewer with line-level color coding
  - Rollback to any previous version with one click
  - 6 new Rust commands for git operations
- 🔌 **Jira Integration**: Export framework outputs as Jira issues
  - REST API v3 with basic auth (email + API token)
  - Project picker, issue type selector (Story/Task/Bug), markdown-to-Jira format conversion
  - Connection testing and encrypted token storage
- 📓 **Notion Integration**: Export framework outputs as Notion pages
  - API v2022-06-28 with bearer token auth
  - Parent page selection, markdown-to-Notion blocks conversion
  - Connection testing and encrypted token storage
- ⚙️ **Settings Expansion**: Integrations tab with Jira URL/email/token/project + Notion token/parent page
- 🔐 **AES-256-GCM Encryption**: All integration tokens encrypted at rest using machine-derived keys
- 📊 **~31 new Rust commands** (total ~105), 4 new DB tables (total 12)

---

## 📊 Overall Success Metrics

**Current State** (Phase 7 Complete):
- ✅ 45 frameworks across 7 categories with full CRUD
- ✅ 30 prompt templates across 7 categories with {variable} substitution
- ✅ Import/export frameworks and prompts as .md files with YAML front matter
- ✅ Multi-step workflow builder with output chaining and 3 built-in templates
- ✅ AI-powered project insights with priority-based recommendations
- ✅ Git-based version history with auto-commit, diff viewer, and rollback
- ✅ Jira and Notion integration for output export
- ✅ Core features complete (projects, context, generation, outputs, chat)
- ✅ Mac desktop app with Tauri + Codex UI
- ✅ VSCode-like folder tree with drag-and-drop
- ✅ Command palette, keyboard shortcuts, terminal panel
- ✅ Framework editing with Monaco editor, category management
- ✅ ~105 Rust IPC commands, SQLite with 12 tables
- ✅ AES-256-GCM encryption for all API keys and tokens

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

**Status**: Phase 7 Complete | 45 Frameworks + 30 Prompts + Workflows + AI Insights + Git History + Jira/Notion | Mac Desktop App
**Version**: 0.8.0-phase7
**Last Updated**: February 2026
