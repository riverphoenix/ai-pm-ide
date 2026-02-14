# PM IDE: Comprehensive Implementation Plan
**Created**: 2026-02-14
**Total Timeline**: 22 weeks (~5.5 months)
**Phases**: 7 major phases from UI redesign to advanced features

---

## Executive Summary

This plan transforms the PM IDE from an MVP into a production-ready, Codex-inspired product management workspace with 45+ frameworks, advanced UX, file management, console integration, and marketplace capabilities.

### Current State
✅ **Solid MVP foundation**: Tauri 2 + React 19 + TypeScript + Tailwind v4
✅ **Working AI integration**: GPT-5 streaming with OpenAI SDK
✅ **8 frameworks** implemented (RICE, ICE, PRD, OKRs, DACI, etc.)
✅ **Context management**: PDF/URL parsing, document library
✅ **Outputs scrolling fixed** (just completed)

### Transformation Goals
- **45 modern PM frameworks** covering all PM workflows
- **Codex-inspired UI** with agent-native patterns
- **File system** with VSCode-like folder tree
- **Console & command palette** for power users
- **Prompts library** with 30+ reusable templates
- **Framework marketplace** for community sharing

---

## PHASE 1: UI Redesign (Codex-Inspired) - 4-5 weeks

### Design System Overhaul
**New Color Palette** (almost-black backgrounds):
```css
--codex-bg: #0a0a0f           /* Primary background */
--codex-surface: #141419       /* Cards, panels */
--codex-border: #2a2a35        /* Borders */
--codex-accent: #6366f1        /* Indigo accent */
--codex-text-primary: #f8f8f8  /* Primary text */
--codex-text-secondary: #a0a0b0 /* Secondary text */
```

**Key Changes**:
- Sidebar redesign with collapsible sections (Projects, Automations, Skills, Threads)
- Top action bar (Open, Commit, Terminal, IDE toggles)
- Refined card components with hover states and smooth animations
- Typography improvements (13px base, tighter spacing)
- Micro-interactions and smooth transitions (200-250ms)

**Based on Codex Research**:
- Agent-native interface for multi-tasking
- Git operations integrated into UI
- Terminal and IDE toggles easily accessible
- Minimal, modern iconography

**Success Metrics**:
- <300ms interaction latency
- 90+ Lighthouse accessibility score
- User feedback: "Modern and professional"

---

## PHASE 2: File System & Project Structure - 3-4 weeks

### Folder Tree Implementation
**VSCode-like file browser** with:
- Unlimited folder depth
- Drag & drop file organization
- Create/rename/delete/move operations
- Type-specific icons (framework outputs, context docs)
- Quick search and filtering

**Database Schema**:
```sql
CREATE TABLE folders (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    parent_id TEXT,  -- NULL for root
    name TEXT NOT NULL,
    created_at INTEGER NOT NULL
);

ALTER TABLE framework_outputs ADD COLUMN folder_id TEXT;
ALTER TABLE context_documents ADD COLUMN folder_id TEXT;
```

**Layout Options**:
- **Option A**: Sidebar addition ([Projects] [File Tree] [Main Content])
- **Option B**: Integrated in tabs (show tree in Outputs/Context)
- **Recommendation**: Option A for consistent access

**Success Metrics**:
- Support 1000+ files without lag
- Tree navigation 3x faster than flat list
- Drag & drop success rate >95%

---

## PHASE 3: Console Integration - 2-3 weeks

### Terminal Panel
**Bottom panel** with tabs:
- **Terminal**: Execute shell commands
- **Output**: Framework generation logs
- **Console**: JavaScript console for debugging
- **Problems**: Errors/warnings

**Simple Terminal** (MVP approach):
- Command history (up/down arrows)
- Auto-complete (Tab key)
- Copy output
- Command shortcuts (npm, git, python)

### Command Palette (Cmd/Ctrl+K)
**Universal quick actions**:
- Create new project/file
- Generate framework
- Open file (fuzzy search)
- Switch project
- All menu actions accessible

**Keyboard Shortcuts System**:
| Shortcut | Action |
|----------|--------|
| `Cmd+K` | Command palette |
| `Cmd+P` | Quick file open |
| `Cmd+B` | Toggle sidebar |
| `Cmd+J` | Toggle terminal |
| `Cmd+Shift+F` | Global search |

**Success Metrics**:
- Command palette opens <100ms
- 50% of power users adopt keyboard shortcuts
- Terminal executes correctly 99%+ of time

---

## PHASE 4: Framework Expansion - 4-6 weeks

### Add 37 New Frameworks (Total: 45)

**By Category**:

**Strategy** (6 total):
- ✅ Business Model Canvas, SWOT Analysis
- 🆕 Porter's Five Forces, Value Proposition Canvas, North Star Metric, Ansoff Matrix

**Prioritization** (8 total):
- ✅ RICE, ICE
- 🆕 MoSCoW, Kano Model, WSJF, Value vs Effort, Cost of Delay, Opportunity Scoring

**Discovery & Research** (8 total):
- ✅ Customer Journey Map
- 🆕 Jobs to be Done, Empathy Mapping, User Story Mapping, Personas, Opportunity Solution Tree, Lean Canvas, Problem Interview

**Product Development** (4 total):
- ✅ PRD Template
- 🆕 User Stories, Acceptance Criteria, Technical Specification

**Execution & Measurement** (10 total):
- ✅ OKRs, Sprint Planning
- 🆕 4Ls Retrospective, Start/Stop/Continue, Pirate Metrics (AARRR), PMF Survey, NPS, HEART, Metrics Dashboard, Launch Plan

**Decision Making** (4 total):
- ✅ DACI
- 🆕 RACI Matrix, RAPID Framework, Decision Matrix

**Communication** (5 total):
- ✅ Stakeholder Update
- 🆕 Feature Brief, Go-to-Market Plan, Product Roadmap, Executive Summary

### Framework Categories CRUD
**Users can**:
- Add custom categories
- Edit existing categories (name, icon, description)
- Delete categories (if no frameworks)
- Reorder categories

### Editable Framework Prompts
**Edit all framework fields**:
- Basic info (name, icon, description, category)
- System prompt (with Monaco editor)
- Guiding questions (add/remove/edit)
- Visual instructions
- Example output

**Database Migration**:
- Move from JSON files to SQLite database
- Version control for framework changes
- User customization support

### Framework Template Pattern
**Following Agent Skills Specification** (product-on-purpose/pm-skills):
```
FRAMEWORK.json  - Core definition
TEMPLATE.md    - Markdown template with placeholders
EXAMPLE.md     - Real-world example output
```

**Success Metrics**:
- All 45 frameworks implemented and tested
- Users can edit any framework without errors
- Average 10+ frameworks used per project

---

## PHASE 5: Prompts Library - 2-3 weeks

### Saved Prompts Feature
**30+ pre-loaded PM prompts**:
- **PRD Generation** (5): Generate PRD from JTBD, technical PRD, one-pager, etc.
- **Competitive Analysis** (4): Analyze competitors, feature comparison, positioning
- **User Stories** (5): From JTBD, epic breakdown, INVEST criteria
- **Stakeholder Communication** (5): Updates, executive summaries, announcements
- **Data Analysis** (4): Metrics analysis, trend identification, feedback synthesis
- **Prioritization** (3): Framework-based, quarterly planning, scoring models
- **Risk Assessment** (2): Launch risks, dependency analysis
- **Go-to-Market** (2): GTM strategy, launch plans

### Prompt Variables System
**Dynamic prompts with placeholders**:
```
"Generate a PRD for {feature_name} targeting {user_persona}"
Variables:
- feature_name: text (required)
- user_persona: select from [Beginner, Advanced, Enterprise]
```

**Prompt Editor Features**:
- Variable insertion (type `{variable_name}`)
- Variable panel for configuration
- Preview with sample values
- Test on framework immediately
- Validation for undefined variables

### Integration with Framework Generator
**Workflow**:
1. Open framework generator
2. Click "Use saved prompt"
3. Select prompt from library
4. Fill variable form
5. Prompt auto-populated
6. Generate framework

**Success Metrics**:
- Users create avg 5 custom prompts per project
- Saved prompts used in 60%+ of generations
- 30+ pre-loaded prompts available

---

## PHASE 6: Framework Marketplace - 3-4 weeks

### .md Import/Export Format
**Standardized markdown format**:
```markdown
---
id: kano-model
name: Kano Model
category: prioritization
description: Classify features by customer satisfaction
icon: 📊
tags: [prioritization, satisfaction]
author: Dimitris Sotiriou
version: 1.0
---

# System Prompt
[Detailed AI instructions]

# Guiding Questions
- What features are you analyzing?
- Do you have customer feedback?

# Example Output
[Markdown example]
```

### Import Mechanism
**Parse and validate .md files**:
1. User selects .md file
2. Parser validates format
3. Preview dialog shows framework
4. User confirms → Added to database

**Validation Rules**:
- ✓ Unique ID
- ✓ Valid category
- ✓ System prompt >50 chars
- ⚠ Warn if visual instructions missing

### Export Options
- Single framework → `{id}.md`
- Category → `frameworks-{category}-{date}.zip`
- Custom selection → Multiple frameworks
- All frameworks → `all-frameworks-{date}.zip`

### Framework Versioning
**Track updates**:
- Version field in database
- Import updated framework → Show diff → Confirm
- Archive old versions
- Rollback capability

**Success Metrics**:
- Import/export works for 100% of valid .md files
- Users successfully share frameworks
- 10+ community frameworks in first month

---

## PHASE 7: Advanced Features - 6-8 weeks

### Multi-Agent Orchestration
**Chain frameworks for complex workflows**:
- **Example**: Complete Product Brief
  1. Generate user research (JTBD)
  2. Create competitive analysis
  3. Generate PRD with contexts
  4. Create go-to-market plan

**Workflow Builder**:
- Drag-and-drop canvas
- Connect frameworks with arrows
- Define data flow between steps
- Run and monitor progress

### Context Memory Across Sessions
**AI remembers project context**:
- Vector embeddings for documents
- Semantic search for relevant context
- Conversation memory per project
- Auto-suggest relevant context

### AI-Powered Insights
**Proactive suggestions**:
- "You often use RICE after interviews"
- "This PRD might need user research"
- "Your OKRs could be more specific (SMART)"
- "Automate this with a workflow"

### Collaboration Features (Future Cloud)
- Share projects with team
- Real-time collaborative editing
- Comments and annotations
- Version history and rollback

### Integrations
**Connect external tools**:
- Jira (import issues, create stories)
- Notion (export outputs)
- Google Docs (two-way sync)
- Slack (notifications)
- GitHub (link repos, issues)
- Figma (embed designs)

### Git Integration
- Initialize repo per project
- Auto-commit on save
- View history and diff
- Rollback versions
- Push to remote

---

## Implementation Timeline (22 Weeks)

**Sprint 1-2**: Phase 1 - UI Redesign
**Sprint 3-5**: Phase 2 - File System
**Sprint 6-7**: Phase 3 - Console
**Sprint 8-13**: Phase 4 - Frameworks
**Sprint 14-15**: Phase 5 - Prompts
**Sprint 16-17**: Phase 6 - Marketplace
**Sprint 18-22**: Phase 7 - Advanced Features

---

## Risk Assessment

### Technical Risks
1. **Database Migration**: Full backup, rollback script, test on copy
2. **Performance**: Virtual scrolling, lazy loading, database indexes
3. **Mermaid Rendering**: Fallback to code block, timeouts, caching

### UX Risks
4. **Cognitive Load**: Phased rollout, feature flags, onboarding
5. **Breaking Changes**: Preserve shortcuts, migration guide, beta testing

### Business Risks
6. **Framework Quality**: Testing protocol, community feedback, ratings

---

## Success Metrics Summary

✅ **Phase 1**: All components use new design, <300ms latency, 90+ accessibility score
✅ **Phase 2**: 1000+ files without lag, 3x faster navigation
✅ **Phase 3**: 50% adopt keyboard shortcuts, 99%+ command success
✅ **Phase 4**: 45 frameworks, users edit without errors, 10+ per project
✅ **Phase 5**: 30+ prompts, 60% use saved prompts, avg 5 custom/project
✅ **Phase 6**: 100% valid imports, 10+ community frameworks/month
✅ **Phase 7**: 95% workflow success, 40% adopt insights, 99% integration uptime

---

## Critical Files for Implementation

1. **src/App.tsx** - Root component restructuring
2. **src/lib/frameworks.ts** - Migrate to database architecture
3. **src-tauri/src/commands.rs** - Add 20+ new IPC commands
4. **src/components/FrameworkGenerator.tsx** - Prompt selector integration
5. **tailwind.config.js** - Design system foundation

---

## Resources & References

### Design Inspiration
- **Codex**: Agent-native UI patterns ([OpenAI Codex](https://openai.com/index/introducing-the-codex-app/))
- **VSCode**: File tree, command palette, terminal
- **Linear**: Clean interactions, keyboard shortcuts
- **Notion**: Flexible structure, drag & drop

### PM Frameworks Research
- **Lenny's Newsletter**: [Product Management Templates](https://www.lennysnewsletter.com/p/my-favorite-templates-issue-37)
- **Product Management Frameworks**: [25 Frameworks Guide](https://www.saasfunnellab.com/essay/product-management-frameworks/)
- **Agent Skills Specification**: [product-on-purpose/pm-skills](https://github.com/product-on-purpose/pm-skills)

### Prompts Research
- **PM Prompts Repository**: [GitHub - deanpeters/product-manager-prompts](https://github.com/deanpeters/product-manager-prompts)
- **PM Toolkit**: [ChatGPT & Claude Prompts](https://pmtoolkit.ai/prompts)
- **Juma Platform**: [17 ChatGPT Prompts for PMs](https://juma.ai/blog/chatgpt-prompts-for-product-managers)

### Recommended Libraries
- **File Tree**: `react-folder-tree` or `@dnd-kit/core`
- **Command Palette**: `cmdk` (Paco Coursey)
- **Terminal**: `xterm.js` or custom
- **Monaco Editor**: Syntax highlighting
- **Icons**: Lucide React
- **Shortcuts**: `react-hotkeys-hook`

---

**This plan provides a clear roadmap to transform PM IDE from MVP to production-ready product. Each phase builds on the previous one with clear success criteria and user value propositions.**
