# PM IDE - Roadmap

Phases 1-7 are complete. Below is the plan for remaining phases.

## Current State (Phase 7 Complete)

- 45 frameworks, 30 prompt templates, ~132 Rust IPC commands
- VSCode-style UI: ActivityBar, centered tabs, xterm.js terminal, file explorer with Monaco editor
- Conversational welcome page, global search, command palette
- Workflow builder with output chaining
- AI insights, git versioning, Jira/Notion export
- GPT-5 streaming chat with multi-model selector

---

## Phase 8: Polish & Power (4-6 weeks)

Goal: Turn PM IDE into a daily driver.

### 8.1 Output Refinement
- Inline markdown editor with live preview (toggle read-only/edit)
- Section detection (H1/H2/H3) with per-section regeneration
- Refinement chat: "make the competitive analysis more detailed" updates just that section
- Split view editing with synced scrolling
- All edits auto-committed via existing git integration

### 8.2 Multi-Model Support
- Provider abstraction: OpenAI, Anthropic, Google, Ollama all implement common `LLMClient` interface
- Multi-key settings with per-provider API key storage
- Two-level model selector: provider -> model
- Per-provider cost calculation
- Fallback suggestions when primary provider fails

| Provider | Models |
|----------|--------|
| OpenAI | gpt-5, gpt-5-mini, gpt-5-nano |
| Anthropic | claude-sonnet-4-5, claude-haiku-4-5 |
| Google | gemini-2.5-pro, gemini-2.5-flash |
| Ollama | llama3, mistral, codellama, custom |

### 8.3 Analytics Dashboard
- Token usage trends (daily/weekly/monthly)
- Cost breakdowns by provider, model, framework, project
- Searchable generation history log
- CSV export for expense tracking
- Optional cost threshold alerts

### 8.4 Onboarding & UX Polish
- First-run setup wizard (API key -> profile -> first project)
- Loading skeleton components for all data views
- Toast notification system (success/error/info)
- Shortcut cheat sheet overlay (`Cmd+/`)
- Improved empty states with actionable CTAs
- Responsive panel min/max constraints

**Estimated scope**: ~8 new components, ~15 new Rust commands, 1 new DB table, ~2 new Python endpoints

---

## Phase 9: Scale & Extend (6-8 weeks)

Goal: Multi-user, multi-tool, extensible platform.

### 9.1 Additional Integrations
- **Slack**: Share output summaries to channels via webhook; workflow completion notifications
- **Linear**: Create issues from outputs with project/team/label mapping
- **Confluence**: Export as wiki pages with markdown-to-storage format conversion
- **GitHub Issues**: Create issues with label/assignee mapping

### 9.2 Cloud Sync & Backup
- **Project archives**: Export/import entire projects as `.pmide` files (SQLite + git + docs)
- **Auto-backup**: Configurable schedule (hourly/daily/weekly) with retention policy
- **Cloud sync**: Optional S3-compatible storage with client-side AES-256-GCM encryption
- Conflict detection and resolution

### 9.3 Collaboration
- **Project sharing**: Shareable links with permission levels (view/comment/edit)
- **Comments**: Inline and general comments on outputs with resolve/unresolve
- **Activity feed**: Per-project timeline of all actions, filterable by type
- **Presence**: Show who's viewing a shared project

### 9.4 Plugin & Extension System
- **Plugin architecture**: Load framework/prompt packs from JSON/YAML bundles
- **Webhooks**: Configurable event notifications (output created, workflow completed)
- **REST API**: Local HTTP API for scripting, CI/CD, and automation
- **Custom themes**: JSON-based theme files; built-in: Codex Dark, Light, Solarized, Nord

**Estimated scope**: ~12 new components, ~57 new Rust commands, ~6 new DB tables, optional companion server

---

## Beyond Phase 9 (Ideas)

- Mobile companion app (read-only project viewer)
- AI agents that autonomously run multi-framework analysis
- Template marketplace with community sharing
- Real-time co-editing (CRDT-based)
- Voice input for chat and framework generation
- Embedding-based semantic search across all project content
