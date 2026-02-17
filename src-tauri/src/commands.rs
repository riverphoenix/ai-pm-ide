use serde::{Deserialize, Serialize};
use uuid::Uuid;
use chrono::Utc;
use tauri::Manager;
use rusqlite::{Connection, params, OptionalExtension};
use aes_gcm::{
    aead::{Aead, KeyInit, OsRng},
    Aes256Gcm, Nonce,
};
use sha2::{Sha256, Digest};
use base64::{Engine as _, engine::general_purpose};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Project {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Conversation {
    pub id: String,
    pub project_id: String,
    pub title: Option<String>,
    pub model: String,
    pub total_tokens: i32,
    pub total_cost: f64,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Message {
    pub id: String,
    pub conversation_id: String,
    pub role: String,
    pub content: String,
    pub tokens: i32,
    pub created_at: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Settings {
    pub id: String,
    pub api_key_encrypted: Option<String>,
    pub username: Option<String>,
    pub name: Option<String>,
    pub surname: Option<String>,
    pub job_title: Option<String>,
    pub company: Option<String>,
    pub company_url: Option<String>,
    pub profile_pic: Option<String>,
    pub about_me: Option<String>,
    pub about_role: Option<String>,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SettingsUpdate {
    pub api_key: Option<String>,
    pub username: Option<String>,
    pub name: Option<String>,
    pub surname: Option<String>,
    pub job_title: Option<String>,
    pub company: Option<String>,
    pub company_url: Option<String>,
    pub profile_pic: Option<String>,
    pub about_me: Option<String>,
    pub about_role: Option<String>,
}

// Encryption helpers
fn get_encryption_key(app: &tauri::AppHandle) -> Result<[u8; 32], String> {
    // Derive a key from the app's unique identifier and machine ID
    let app_id = "com.dsotiriou.ai-pm-ide";
    let machine_id = machine_uid::get().unwrap_or_else(|_| "default-machine-id".to_string());

    let mut hasher = Sha256::new();
    hasher.update(app_id.as_bytes());
    hasher.update(machine_id.as_bytes());
    let hash = hasher.finalize();

    let mut key = [0u8; 32];
    key.copy_from_slice(&hash[..32]);
    Ok(key)
}

fn encrypt_string(plaintext: &str, key: &[u8; 32]) -> Result<String, String> {
    let cipher = Aes256Gcm::new(key.into());
    let nonce_bytes = [0u8; 12]; // For production, use OsRng to generate random nonce
    let nonce = Nonce::from_slice(&nonce_bytes);

    let ciphertext = cipher
        .encrypt(nonce, plaintext.as_bytes())
        .map_err(|e| format!("Encryption failed: {}", e))?;

    Ok(general_purpose::STANDARD.encode(ciphertext))
}

fn decrypt_string(encrypted: &str, key: &[u8; 32]) -> Result<String, String> {
    let cipher = Aes256Gcm::new(key.into());
    let nonce_bytes = [0u8; 12];
    let nonce = Nonce::from_slice(&nonce_bytes);

    let ciphertext = general_purpose::STANDARD
        .decode(encrypted)
        .map_err(|e| format!("Base64 decode failed: {}", e))?;

    let plaintext = cipher
        .decrypt(nonce, ciphertext.as_ref())
        .map_err(|e| format!("Decryption failed: {}", e))?;

    String::from_utf8(plaintext).map_err(|e| format!("UTF-8 conversion failed: {}", e))
}

// Database connection helper
fn get_db_connection(app: &tauri::AppHandle) -> Result<Connection, String> {
    let app_dir = app.path().app_data_dir()
        .map_err(|e| format!("Failed to get app directory: {}", e))?;

    std::fs::create_dir_all(&app_dir)
        .map_err(|e| format!("Failed to create app directory: {}", e))?;

    let db_path = app_dir.join("pm-ide.db");
    let conn = Connection::open(db_path)
        .map_err(|e| format!("Failed to open database: {}", e))?;

    // Enable foreign key constraints (required for CASCADE deletes)
    conn.execute("PRAGMA foreign_keys = ON", [])
        .map_err(|e| format!("Failed to enable foreign keys: {}", e))?;

    Ok(conn)
}

// Initialize database tables (called on startup)
pub fn init_db(app: &tauri::AppHandle) -> Result<(), String> {
    let conn = get_db_connection(app)?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS projects (
            id TEXT PRIMARY KEY NOT NULL,
            name TEXT NOT NULL,
            description TEXT,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
        )",
        [],
    ).map_err(|e| format!("Failed to create projects table: {}", e))?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS documents (
            id TEXT PRIMARY KEY NOT NULL,
            project_id TEXT NOT NULL,
            name TEXT NOT NULL,
            type TEXT NOT NULL,
            content TEXT,
            file_path TEXT,
            created_at INTEGER NOT NULL,
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
        )",
        [],
    ).map_err(|e| format!("Failed to create documents table: {}", e))?;

    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_documents_project_id ON documents(project_id)",
        [],
    ).map_err(|e| format!("Failed to create documents index: {}", e))?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS document_embeddings (
            id TEXT PRIMARY KEY NOT NULL,
            document_id TEXT NOT NULL,
            chunk_text TEXT NOT NULL,
            chunk_index INTEGER NOT NULL,
            embedding BLOB,
            FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
        )",
        [],
    ).map_err(|e| format!("Failed to create document_embeddings table: {}", e))?;

    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_embeddings_document_id ON document_embeddings(document_id)",
        [],
    ).map_err(|e| format!("Failed to create embeddings index: {}", e))?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS conversations (
            id TEXT PRIMARY KEY NOT NULL,
            project_id TEXT NOT NULL,
            title TEXT,
            model TEXT NOT NULL DEFAULT 'claude-sonnet-4',
            total_tokens INTEGER NOT NULL DEFAULT 0,
            total_cost REAL NOT NULL DEFAULT 0.0,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL,
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
        )",
        [],
    ).map_err(|e| format!("Failed to create conversations table: {}", e))?;

    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_conversations_project_id ON conversations(project_id)",
        [],
    ).map_err(|e| format!("Failed to create conversations index: {}", e))?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS messages (
            id TEXT PRIMARY KEY NOT NULL,
            conversation_id TEXT NOT NULL,
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            tokens INTEGER NOT NULL DEFAULT 0,
            created_at INTEGER NOT NULL,
            FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
        )",
        [],
    ).map_err(|e| format!("Failed to create messages table: {}", e))?;

    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id)",
        [],
    ).map_err(|e| format!("Failed to create messages index: {}", e))?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS settings (
            id TEXT PRIMARY KEY NOT NULL,
            api_key_encrypted TEXT,
            username TEXT,
            name TEXT,
            surname TEXT,
            job_title TEXT,
            company TEXT,
            company_url TEXT,
            profile_pic TEXT,
            about_me TEXT,
            about_role TEXT,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
        )",
        [],
    ).map_err(|e| format!("Failed to create settings table: {}", e))?;

    // Add username column if it doesn't exist (migration)
    let _ = conn.execute(
        "ALTER TABLE settings ADD COLUMN username TEXT",
        [],
    );  // Ignore error if column already exists

    // Create token usage tracking table
    conn.execute(
        "CREATE TABLE IF NOT EXISTS token_usage (
            id TEXT PRIMARY KEY NOT NULL,
            conversation_id TEXT NOT NULL,
            model TEXT NOT NULL,
            input_tokens INTEGER NOT NULL,
            output_tokens INTEGER NOT NULL,
            total_tokens INTEGER NOT NULL,
            cost REAL NOT NULL,
            created_at INTEGER NOT NULL,
            date TEXT NOT NULL,
            FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
        )",
        [],
    ).map_err(|e| format!("Failed to create token_usage table: {}", e))?;

    // Create index on date for efficient querying
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_token_usage_date ON token_usage(date)",
        [],
    ).map_err(|e| format!("Failed to create token_usage date index: {}", e))?;

    // Create context documents table
    conn.execute(
        "CREATE TABLE IF NOT EXISTS context_documents (
            id TEXT PRIMARY KEY NOT NULL,
            project_id TEXT NOT NULL,
            name TEXT NOT NULL,
            type TEXT NOT NULL,
            content TEXT NOT NULL,
            url TEXT,
            is_global INTEGER NOT NULL DEFAULT 0,
            size_bytes INTEGER NOT NULL DEFAULT 0,
            created_at INTEGER NOT NULL,
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
        )",
        [],
    ).map_err(|e| format!("Failed to create context_documents table: {}", e))?;

    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_context_documents_project_id ON context_documents(project_id)",
        [],
    ).map_err(|e| format!("Failed to create context_documents index: {}", e))?;

    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_context_documents_global ON context_documents(is_global)",
        [],
    ).map_err(|e| format!("Failed to create context_documents global index: {}", e))?;

    // Create framework outputs table
    conn.execute(
        "CREATE TABLE IF NOT EXISTS framework_outputs (
            id TEXT PRIMARY KEY NOT NULL,
            project_id TEXT NOT NULL,
            framework_id TEXT NOT NULL,
            category TEXT NOT NULL,
            name TEXT NOT NULL,
            user_prompt TEXT NOT NULL,
            context_doc_ids TEXT NOT NULL,
            generated_content TEXT NOT NULL,
            format TEXT NOT NULL DEFAULT 'markdown',
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL,
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
        )",
        [],
    ).map_err(|e| format!("Failed to create framework_outputs table: {}", e))?;

    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_framework_outputs_project_id ON framework_outputs(project_id)",
        [],
    ).map_err(|e| format!("Failed to create framework_outputs index: {}", e))?;

    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_framework_outputs_framework_id ON framework_outputs(framework_id)",
        [],
    ).map_err(|e| format!("Failed to create framework_outputs framework index: {}", e))?;

    // Create folders table
    conn.execute(
        "CREATE TABLE IF NOT EXISTS folders (
            id TEXT PRIMARY KEY NOT NULL,
            project_id TEXT NOT NULL,
            parent_id TEXT,
            name TEXT NOT NULL,
            color TEXT,
            sort_order INTEGER NOT NULL DEFAULT 0,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL,
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
            FOREIGN KEY (parent_id) REFERENCES folders(id) ON DELETE CASCADE
        )",
        [],
    ).map_err(|e| format!("Failed to create folders table: {}", e))?;

    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_folders_project ON folders(project_id)",
        [],
    ).map_err(|e| format!("Failed to create folders project index: {}", e))?;

    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_folders_parent ON folders(parent_id)",
        [],
    ).map_err(|e| format!("Failed to create folders parent index: {}", e))?;

    // Migrations: add folder_id, tags, is_favorite, sort_order to context_documents
    let _ = conn.execute("ALTER TABLE context_documents ADD COLUMN folder_id TEXT", []);
    let _ = conn.execute("ALTER TABLE context_documents ADD COLUMN tags TEXT DEFAULT '[]'", []);
    let _ = conn.execute("ALTER TABLE context_documents ADD COLUMN is_favorite INTEGER NOT NULL DEFAULT 0", []);
    let _ = conn.execute("ALTER TABLE context_documents ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0", []);

    // Migrations: add folder_id, tags, is_favorite, sort_order to framework_outputs
    let _ = conn.execute("ALTER TABLE framework_outputs ADD COLUMN folder_id TEXT", []);
    let _ = conn.execute("ALTER TABLE framework_outputs ADD COLUMN tags TEXT DEFAULT '[]'", []);
    let _ = conn.execute("ALTER TABLE framework_outputs ADD COLUMN is_favorite INTEGER NOT NULL DEFAULT 0", []);
    let _ = conn.execute("ALTER TABLE framework_outputs ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0", []);

    // Create command_history table
    conn.execute(
        "CREATE TABLE IF NOT EXISTS command_history (
            id TEXT PRIMARY KEY NOT NULL,
            project_id TEXT NOT NULL,
            command TEXT NOT NULL,
            output TEXT NOT NULL,
            exit_code INTEGER NOT NULL,
            created_at INTEGER NOT NULL,
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
        )",
        [],
    ).map_err(|e| format!("Failed to create command_history table: {}", e))?;

    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_command_history_project ON command_history(project_id)",
        [],
    ).map_err(|e| format!("Failed to create command_history index: {}", e))?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS framework_categories (
            id TEXT PRIMARY KEY NOT NULL,
            name TEXT NOT NULL,
            description TEXT NOT NULL,
            icon TEXT NOT NULL,
            is_builtin INTEGER NOT NULL DEFAULT 1,
            sort_order INTEGER NOT NULL DEFAULT 0,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
        )",
        [],
    ).map_err(|e| format!("Failed to create framework_categories table: {}", e))?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS framework_definitions (
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
        )",
        [],
    ).map_err(|e| format!("Failed to create framework_definitions table: {}", e))?;

    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_framework_defs_category ON framework_definitions(category)",
        [],
    ).map_err(|e| format!("Failed to create framework_definitions index: {}", e))?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS saved_prompts (
            id TEXT PRIMARY KEY NOT NULL,
            name TEXT NOT NULL,
            description TEXT NOT NULL DEFAULT '',
            category TEXT NOT NULL DEFAULT 'general',
            prompt_text TEXT NOT NULL,
            variables TEXT NOT NULL DEFAULT '[]',
            framework_id TEXT,
            is_builtin INTEGER NOT NULL DEFAULT 0,
            is_favorite INTEGER NOT NULL DEFAULT 0,
            usage_count INTEGER NOT NULL DEFAULT 0,
            sort_order INTEGER NOT NULL DEFAULT 0,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL,
            FOREIGN KEY (framework_id) REFERENCES framework_definitions(id) ON DELETE SET NULL
        )",
        [],
    ).map_err(|e| format!("Failed to create saved_prompts table: {}", e))?;

    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_saved_prompts_category ON saved_prompts(category)",
        [],
    ).map_err(|e| format!("Failed to create saved_prompts index: {}", e))?;

    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_saved_prompts_framework ON saved_prompts(framework_id)",
        [],
    ).map_err(|e| format!("Failed to create saved_prompts framework index: {}", e))?;

    seed_frameworks(&conn)?;
    seed_prompts(&conn)?;

    // Create default settings if none exist
    let count: i64 = conn.query_row("SELECT COUNT(*) FROM settings", [], |row| row.get(0))
        .map_err(|e| format!("Failed to count settings: {}", e))?;

    if count == 0 {
        let now = Utc::now().timestamp();
        conn.execute(
            "INSERT INTO settings (id, created_at, updated_at) VALUES (?1, ?2, ?3)",
            params!["default", &now, &now],
        ).map_err(|e| format!("Failed to create default settings: {}", e))?;
    }

    Ok(())
}

fn seed_frameworks(conn: &Connection) -> Result<(), String> {
    let cat_count: i64 = conn.query_row("SELECT COUNT(*) FROM framework_categories", [], |row| row.get(0))
        .map_err(|e| format!("Failed to count framework_categories: {}", e))?;

    if cat_count > 0 {
        return Ok(());
    }

    let now = Utc::now().timestamp();
    let categories_json = include_str!("../../src/frameworks/categories.json");
    let categories: Vec<serde_json::Value> = serde_json::from_str(categories_json)
        .map_err(|e| format!("Failed to parse seed categories: {}", e))?;

    for (i, cat) in categories.iter().enumerate() {
        conn.execute(
            "INSERT OR IGNORE INTO framework_categories (id, name, description, icon, is_builtin, sort_order, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, 1, ?5, ?6, ?7)",
            params![
                cat["id"].as_str().unwrap_or(""),
                cat["name"].as_str().unwrap_or(""),
                cat["description"].as_str().unwrap_or(""),
                cat["icon"].as_str().unwrap_or(""),
                i as i32,
                &now,
                &now,
            ],
        ).map_err(|e| format!("Failed to seed category: {}", e))?;
    }

    let framework_files: &[&str] = &[
        // Strategy (8)
        include_str!("../../src/frameworks/strategy/business-model-canvas.json"),
        include_str!("../../src/frameworks/strategy/swot.json"),
        include_str!("../../src/frameworks/strategy/porters-five-forces.json"),
        include_str!("../../src/frameworks/strategy/lean-canvas.json"),
        include_str!("../../src/frameworks/strategy/value-proposition-canvas.json"),
        include_str!("../../src/frameworks/strategy/blue-ocean-strategy.json"),
        include_str!("../../src/frameworks/strategy/ansoff-matrix.json"),
        include_str!("../../src/frameworks/strategy/strategic-planning.json"),
        // Prioritization (6)
        include_str!("../../src/frameworks/prioritization/rice.json"),
        include_str!("../../src/frameworks/prioritization/moscow.json"),
        include_str!("../../src/frameworks/prioritization/kano-model.json"),
        include_str!("../../src/frameworks/prioritization/ice-scoring.json"),
        include_str!("../../src/frameworks/prioritization/value-effort-matrix.json"),
        include_str!("../../src/frameworks/prioritization/weighted-scoring.json"),
        // Discovery (8)
        include_str!("../../src/frameworks/discovery/jtbd.json"),
        include_str!("../../src/frameworks/discovery/customer-journey-map.json"),
        include_str!("../../src/frameworks/discovery/user-personas.json"),
        include_str!("../../src/frameworks/discovery/empathy-map.json"),
        include_str!("../../src/frameworks/discovery/problem-statement.json"),
        include_str!("../../src/frameworks/discovery/competitive-analysis.json"),
        include_str!("../../src/frameworks/discovery/survey-design.json"),
        include_str!("../../src/frameworks/discovery/feature-audit.json"),
        // Development (5)
        include_str!("../../src/frameworks/development/sprint-planning.json"),
        include_str!("../../src/frameworks/development/technical-spec.json"),
        include_str!("../../src/frameworks/development/architecture-decision-record.json"),
        include_str!("../../src/frameworks/development/definition-of-done.json"),
        include_str!("../../src/frameworks/development/release-plan.json"),
        // Execution (6)
        include_str!("../../src/frameworks/execution/okrs.json"),
        include_str!("../../src/frameworks/execution/north-star-metric.json"),
        include_str!("../../src/frameworks/execution/kpi-dashboard.json"),
        include_str!("../../src/frameworks/execution/retrospective.json"),
        include_str!("../../src/frameworks/execution/roadmap-template.json"),
        include_str!("../../src/frameworks/execution/success-metrics.json"),
        // Decision Making (5)
        include_str!("../../src/frameworks/decision/decision-matrix.json"),
        include_str!("../../src/frameworks/decision/raci.json"),
        include_str!("../../src/frameworks/decision/pre-mortem.json"),
        include_str!("../../src/frameworks/decision/opportunity-assessment.json"),
        include_str!("../../src/frameworks/decision/trade-off-analysis.json"),
        // Communication (7)
        include_str!("../../src/frameworks/communication/prd.json"),
        include_str!("../../src/frameworks/communication/user-stories.json"),
        include_str!("../../src/frameworks/communication/stakeholder-update.json"),
        include_str!("../../src/frameworks/communication/launch-plan.json"),
        include_str!("../../src/frameworks/communication/feature-brief.json"),
        include_str!("../../src/frameworks/communication/product-vision.json"),
        include_str!("../../src/frameworks/communication/changelog.json"),
    ];

    for (i, fw_json) in framework_files.iter().enumerate() {
        let fw: serde_json::Value = serde_json::from_str(fw_json)
            .map_err(|e| format!("Failed to parse seed framework: {}", e))?;

        let guiding_questions = fw["guiding_questions"].to_string();
        let supports_visuals = fw["supports_visuals"].as_bool().unwrap_or(false);

        conn.execute(
            "INSERT OR IGNORE INTO framework_definitions (id, category, name, description, icon, example_output, system_prompt, guiding_questions, supports_visuals, visual_instructions, is_builtin, sort_order, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, 1, ?11, ?12, ?13)",
            params![
                fw["id"].as_str().unwrap_or(""),
                fw["category"].as_str().unwrap_or(""),
                fw["name"].as_str().unwrap_or(""),
                fw["description"].as_str().unwrap_or(""),
                fw["icon"].as_str().unwrap_or(""),
                fw["example_output"].as_str().unwrap_or(""),
                fw["system_prompt"].as_str().unwrap_or(""),
                &guiding_questions,
                supports_visuals,
                fw["visual_instructions"].as_str(),
                i as i32,
                &now,
                &now,
            ],
        ).map_err(|e| format!("Failed to seed framework: {}", e))?;
    }

    Ok(())
}

fn seed_prompts(conn: &Connection) -> Result<(), String> {
    let count: i64 = conn.query_row("SELECT COUNT(*) FROM saved_prompts", [], |row| row.get(0))
        .map_err(|e| format!("Failed to count saved_prompts: {}", e))?;

    if count > 0 {
        return Ok(());
    }

    let now = Utc::now().timestamp();
    let prompt_files: &[&str] = &[
        // PRD (5)
        include_str!("../../src/prompts/prd/prd-from-jtbd.json"),
        include_str!("../../src/prompts/prd/technical-prd.json"),
        include_str!("../../src/prompts/prd/one-pager.json"),
        include_str!("../../src/prompts/prd/feature-spec.json"),
        include_str!("../../src/prompts/prd/api-specification.json"),
        // Analysis (5)
        include_str!("../../src/prompts/analysis/competitive-analysis.json"),
        include_str!("../../src/prompts/analysis/feature-comparison.json"),
        include_str!("../../src/prompts/analysis/market-positioning.json"),
        include_str!("../../src/prompts/analysis/feedback-synthesis.json"),
        include_str!("../../src/prompts/analysis/churn-analysis.json"),
        // Stories (5)
        include_str!("../../src/prompts/stories/jtbd-to-stories.json"),
        include_str!("../../src/prompts/stories/epic-breakdown.json"),
        include_str!("../../src/prompts/stories/invest-criteria.json"),
        include_str!("../../src/prompts/stories/acceptance-criteria.json"),
        include_str!("../../src/prompts/stories/story-estimation.json"),
        // Communication (5)
        include_str!("../../src/prompts/communication/stakeholder-email.json"),
        include_str!("../../src/prompts/communication/executive-summary.json"),
        include_str!("../../src/prompts/communication/product-announcement.json"),
        include_str!("../../src/prompts/communication/release-notes.json"),
        include_str!("../../src/prompts/communication/team-update.json"),
        // Data (4)
        include_str!("../../src/prompts/data/metrics-analysis.json"),
        include_str!("../../src/prompts/data/ab-test-analysis.json"),
        include_str!("../../src/prompts/data/kpi-review.json"),
        include_str!("../../src/prompts/data/funnel-analysis.json"),
        // Prioritization (3)
        include_str!("../../src/prompts/prioritization/quarterly-priorities.json"),
        include_str!("../../src/prompts/prioritization/feature-scoring.json"),
        include_str!("../../src/prompts/prioritization/resource-allocation.json"),
        // Strategy (3)
        include_str!("../../src/prompts/strategy/okr-drafting.json"),
        include_str!("../../src/prompts/strategy/strategic-initiative.json"),
        include_str!("../../src/prompts/strategy/vision-alignment.json"),
    ];

    for (i, prompt_json) in prompt_files.iter().enumerate() {
        let p: serde_json::Value = serde_json::from_str(prompt_json)
            .map_err(|e| format!("Failed to parse seed prompt: {}", e))?;

        let variables = p["variables"].to_string();

        conn.execute(
            "INSERT OR IGNORE INTO saved_prompts (id, name, description, category, prompt_text, variables, framework_id, is_builtin, is_favorite, usage_count, sort_order, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 1, 0, 0, ?8, ?9, ?10)",
            params![
                p["id"].as_str().unwrap_or(""),
                p["name"].as_str().unwrap_or(""),
                p["description"].as_str().unwrap_or(""),
                p["category"].as_str().unwrap_or("general"),
                p["prompt_text"].as_str().unwrap_or(""),
                &variables,
                p["framework_id"].as_str(),
                i as i32,
                &now,
                &now,
            ],
        ).map_err(|e| format!("Failed to seed prompt: {}", e))?;
    }

    Ok(())
}

fn row_to_saved_prompt(row: &rusqlite::Row) -> rusqlite::Result<SavedPromptRow> {
    Ok(SavedPromptRow {
        id: row.get(0)?,
        name: row.get(1)?,
        description: row.get(2)?,
        category: row.get(3)?,
        prompt_text: row.get(4)?,
        variables: row.get(5)?,
        framework_id: row.get(6)?,
        is_builtin: row.get::<_, i32>(7)? != 0,
        is_favorite: row.get::<_, i32>(8)? != 0,
        usage_count: row.get(9)?,
        sort_order: row.get(10)?,
        created_at: row.get(11)?,
        updated_at: row.get(12)?,
    })
}

fn row_to_category(row: &rusqlite::Row) -> rusqlite::Result<FrameworkCategoryRow> {
    Ok(FrameworkCategoryRow {
        id: row.get(0)?,
        name: row.get(1)?,
        description: row.get(2)?,
        icon: row.get(3)?,
        is_builtin: row.get::<_, i32>(4)? != 0,
        sort_order: row.get(5)?,
        created_at: row.get(6)?,
        updated_at: row.get(7)?,
    })
}

fn row_to_framework_def(row: &rusqlite::Row) -> rusqlite::Result<FrameworkDefRow> {
    Ok(FrameworkDefRow {
        id: row.get(0)?,
        category: row.get(1)?,
        name: row.get(2)?,
        description: row.get(3)?,
        icon: row.get(4)?,
        example_output: row.get(5)?,
        system_prompt: row.get(6)?,
        guiding_questions: row.get(7)?,
        supports_visuals: row.get::<_, i32>(8)? != 0,
        visual_instructions: row.get(9)?,
        is_builtin: row.get::<_, i32>(10)? != 0,
        sort_order: row.get(11)?,
        created_at: row.get(12)?,
        updated_at: row.get(13)?,
    })
}

const FRAMEWORK_DEF_COLUMNS: &str = "id, category, name, description, icon, example_output, system_prompt, guiding_questions, supports_visuals, visual_instructions, is_builtin, sort_order, created_at, updated_at";

#[tauri::command]
pub async fn list_framework_categories(app: tauri::AppHandle) -> Result<Vec<FrameworkCategoryRow>, String> {
    let conn = get_db_connection(&app)?;
    let mut stmt = conn.prepare(
        "SELECT id, name, description, icon, is_builtin, sort_order, created_at, updated_at
         FROM framework_categories ORDER BY sort_order ASC"
    ).map_err(|e| format!("Failed to prepare statement: {}", e))?;

    let rows = stmt.query_map([], row_to_category)
        .map_err(|e| format!("Failed to query categories: {}", e))?;
    let result: Result<Vec<_>, _> = rows.collect();
    result.map_err(|e| format!("Failed to collect categories: {}", e))
}

#[tauri::command]
pub async fn get_framework_category(id: String, app: tauri::AppHandle) -> Result<Option<FrameworkCategoryRow>, String> {
    let conn = get_db_connection(&app)?;
    let mut stmt = conn.prepare(
        "SELECT id, name, description, icon, is_builtin, sort_order, created_at, updated_at
         FROM framework_categories WHERE id = ?1"
    ).map_err(|e| format!("Failed to prepare statement: {}", e))?;

    let cat = stmt.query_row(params![&id], row_to_category).optional()
        .map_err(|e| format!("Failed to get category: {}", e))?;
    Ok(cat)
}

#[tauri::command]
pub async fn create_framework_category(
    name: String,
    description: String,
    icon: String,
    app: tauri::AppHandle,
) -> Result<FrameworkCategoryRow, String> {
    let conn = get_db_connection(&app)?;
    let id = name.to_lowercase().replace(' ', "-");
    let now = Utc::now().timestamp();

    let max_order: i32 = conn.query_row(
        "SELECT COALESCE(MAX(sort_order), -1) FROM framework_categories", [], |row| row.get(0)
    ).map_err(|e| format!("Failed to get max sort_order: {}", e))?;

    conn.execute(
        "INSERT INTO framework_categories (id, name, description, icon, is_builtin, sort_order, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, 0, ?5, ?6, ?7)",
        params![&id, &name, &description, &icon, max_order + 1, &now, &now],
    ).map_err(|e| format!("Failed to create category: {}", e))?;

    Ok(FrameworkCategoryRow { id, name, description, icon, is_builtin: false, sort_order: max_order + 1, created_at: now, updated_at: now })
}

#[tauri::command]
pub async fn update_framework_category(
    id: String,
    name: String,
    description: String,
    icon: String,
    app: tauri::AppHandle,
) -> Result<FrameworkCategoryRow, String> {
    let conn = get_db_connection(&app)?;
    let now = Utc::now().timestamp();

    conn.execute(
        "UPDATE framework_categories SET name = ?1, description = ?2, icon = ?3, updated_at = ?4 WHERE id = ?5",
        params![&name, &description, &icon, &now, &id],
    ).map_err(|e| format!("Failed to update category: {}", e))?;

    get_framework_category(id, app).await?
        .ok_or_else(|| "Category not found after update".to_string())
}

#[tauri::command]
pub async fn delete_framework_category(id: String, app: tauri::AppHandle) -> Result<(), String> {
    let conn = get_db_connection(&app)?;

    let is_builtin: i32 = conn.query_row(
        "SELECT is_builtin FROM framework_categories WHERE id = ?1", params![&id], |row| row.get(0)
    ).map_err(|e| format!("Category not found: {}", e))?;

    if is_builtin != 0 {
        return Err("Cannot delete built-in category".to_string());
    }

    let fw_count: i64 = conn.query_row(
        "SELECT COUNT(*) FROM framework_definitions WHERE category = ?1", params![&id], |row| row.get(0)
    ).map_err(|e| format!("Failed to count frameworks: {}", e))?;

    if fw_count > 0 {
        return Err("Cannot delete category with frameworks. Delete or move frameworks first.".to_string());
    }

    conn.execute("DELETE FROM framework_categories WHERE id = ?1", params![&id])
        .map_err(|e| format!("Failed to delete category: {}", e))?;
    Ok(())
}

#[tauri::command]
pub async fn list_framework_defs(category: Option<String>, app: tauri::AppHandle) -> Result<Vec<FrameworkDefRow>, String> {
    let conn = get_db_connection(&app)?;

    if let Some(ref cat) = category {
        let q = format!("SELECT {} FROM framework_definitions WHERE category = ?1 ORDER BY sort_order ASC", FRAMEWORK_DEF_COLUMNS);
        let mut stmt = conn.prepare(&q).map_err(|e| format!("Failed to prepare: {}", e))?;
        let rows = stmt.query_map(params![cat], row_to_framework_def)
            .map_err(|e| format!("Failed to query: {}", e))?;
        let r: Result<Vec<_>, _> = rows.collect();
        r.map_err(|e| format!("Failed to collect: {}", e))
    } else {
        let q = format!("SELECT {} FROM framework_definitions ORDER BY sort_order ASC", FRAMEWORK_DEF_COLUMNS);
        let mut stmt = conn.prepare(&q).map_err(|e| format!("Failed to prepare: {}", e))?;
        let rows = stmt.query_map([], row_to_framework_def)
            .map_err(|e| format!("Failed to query: {}", e))?;
        let r: Result<Vec<_>, _> = rows.collect();
        r.map_err(|e| format!("Failed to collect: {}", e))
    }
}

#[tauri::command]
pub async fn get_framework_def(id: String, app: tauri::AppHandle) -> Result<Option<FrameworkDefRow>, String> {
    let conn = get_db_connection(&app)?;
    let q = format!("SELECT {} FROM framework_definitions WHERE id = ?1", FRAMEWORK_DEF_COLUMNS);
    let mut stmt = conn.prepare(&q).map_err(|e| format!("Failed to prepare: {}", e))?;

    let fw = stmt.query_row(params![&id], row_to_framework_def).optional()
        .map_err(|e| format!("Failed to get framework: {}", e))?;
    Ok(fw)
}

#[tauri::command]
pub async fn create_framework_def(
    category: String,
    name: String,
    description: String,
    icon: String,
    system_prompt: String,
    guiding_questions: String,
    example_output: String,
    supports_visuals: bool,
    visual_instructions: Option<String>,
    app: tauri::AppHandle,
) -> Result<FrameworkDefRow, String> {
    let conn = get_db_connection(&app)?;
    let id = name.to_lowercase().replace(' ', "-").replace('(', "").replace(')', "");
    let now = Utc::now().timestamp();

    let max_order: i32 = conn.query_row(
        "SELECT COALESCE(MAX(sort_order), -1) FROM framework_definitions WHERE category = ?1", params![&category], |row| row.get(0)
    ).map_err(|e| format!("Failed to get max sort_order: {}", e))?;

    conn.execute(
        &format!("INSERT INTO framework_definitions ({}) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, 0, ?11, ?12, ?13)", FRAMEWORK_DEF_COLUMNS),
        params![&id, &category, &name, &description, &icon, &example_output, &system_prompt, &guiding_questions, supports_visuals, &visual_instructions, max_order + 1, &now, &now],
    ).map_err(|e| format!("Failed to create framework: {}", e))?;

    Ok(FrameworkDefRow {
        id, category, name, description, icon, example_output, system_prompt, guiding_questions,
        supports_visuals, visual_instructions, is_builtin: false, sort_order: max_order + 1,
        created_at: now, updated_at: now,
    })
}

#[tauri::command]
pub async fn update_framework_def(
    id: String,
    category: Option<String>,
    name: Option<String>,
    description: Option<String>,
    icon: Option<String>,
    system_prompt: Option<String>,
    guiding_questions: Option<String>,
    example_output: Option<String>,
    supports_visuals: Option<bool>,
    visual_instructions: Option<String>,
    app: tauri::AppHandle,
) -> Result<FrameworkDefRow, String> {
    let conn = get_db_connection(&app)?;
    let now = Utc::now().timestamp();

    conn.execute(
        "UPDATE framework_definitions SET
            category = COALESCE(?1, category),
            name = COALESCE(?2, name),
            description = COALESCE(?3, description),
            icon = COALESCE(?4, icon),
            system_prompt = COALESCE(?5, system_prompt),
            guiding_questions = COALESCE(?6, guiding_questions),
            example_output = COALESCE(?7, example_output),
            supports_visuals = COALESCE(?8, supports_visuals),
            visual_instructions = COALESCE(?9, visual_instructions),
            updated_at = ?10
         WHERE id = ?11",
        params![
            &category, &name, &description, &icon, &system_prompt,
            &guiding_questions, &example_output,
            supports_visuals.map(|v| if v { 1 } else { 0 }),
            &visual_instructions, &now, &id
        ],
    ).map_err(|e| format!("Failed to update framework: {}", e))?;

    get_framework_def(id, app).await?
        .ok_or_else(|| "Framework not found after update".to_string())
}

#[tauri::command]
pub async fn delete_framework_def(id: String, app: tauri::AppHandle) -> Result<(), String> {
    let conn = get_db_connection(&app)?;

    let is_builtin: i32 = conn.query_row(
        "SELECT is_builtin FROM framework_definitions WHERE id = ?1", params![&id], |row| row.get(0)
    ).map_err(|e| format!("Framework not found: {}", e))?;

    if is_builtin != 0 {
        return Err("Cannot delete built-in framework".to_string());
    }

    conn.execute("DELETE FROM framework_definitions WHERE id = ?1", params![&id])
        .map_err(|e| format!("Failed to delete framework: {}", e))?;
    Ok(())
}

#[tauri::command]
pub async fn reset_framework_def(id: String, app: tauri::AppHandle) -> Result<FrameworkDefRow, String> {
    let conn = get_db_connection(&app)?;

    let is_builtin: i32 = conn.query_row(
        "SELECT is_builtin FROM framework_definitions WHERE id = ?1", params![&id], |row| row.get(0)
    ).map_err(|e| format!("Framework not found: {}", e))?;

    if is_builtin == 0 {
        return Err("Can only reset built-in frameworks".to_string());
    }

    let framework_files: &[&str] = &[
        // Strategy (8)
        include_str!("../../src/frameworks/strategy/business-model-canvas.json"),
        include_str!("../../src/frameworks/strategy/swot.json"),
        include_str!("../../src/frameworks/strategy/porters-five-forces.json"),
        include_str!("../../src/frameworks/strategy/lean-canvas.json"),
        include_str!("../../src/frameworks/strategy/value-proposition-canvas.json"),
        include_str!("../../src/frameworks/strategy/blue-ocean-strategy.json"),
        include_str!("../../src/frameworks/strategy/ansoff-matrix.json"),
        include_str!("../../src/frameworks/strategy/strategic-planning.json"),
        // Prioritization (6)
        include_str!("../../src/frameworks/prioritization/rice.json"),
        include_str!("../../src/frameworks/prioritization/moscow.json"),
        include_str!("../../src/frameworks/prioritization/kano-model.json"),
        include_str!("../../src/frameworks/prioritization/ice-scoring.json"),
        include_str!("../../src/frameworks/prioritization/value-effort-matrix.json"),
        include_str!("../../src/frameworks/prioritization/weighted-scoring.json"),
        // Discovery (8)
        include_str!("../../src/frameworks/discovery/jtbd.json"),
        include_str!("../../src/frameworks/discovery/customer-journey-map.json"),
        include_str!("../../src/frameworks/discovery/user-personas.json"),
        include_str!("../../src/frameworks/discovery/empathy-map.json"),
        include_str!("../../src/frameworks/discovery/problem-statement.json"),
        include_str!("../../src/frameworks/discovery/competitive-analysis.json"),
        include_str!("../../src/frameworks/discovery/survey-design.json"),
        include_str!("../../src/frameworks/discovery/feature-audit.json"),
        // Development (5)
        include_str!("../../src/frameworks/development/sprint-planning.json"),
        include_str!("../../src/frameworks/development/technical-spec.json"),
        include_str!("../../src/frameworks/development/architecture-decision-record.json"),
        include_str!("../../src/frameworks/development/definition-of-done.json"),
        include_str!("../../src/frameworks/development/release-plan.json"),
        // Execution (6)
        include_str!("../../src/frameworks/execution/okrs.json"),
        include_str!("../../src/frameworks/execution/north-star-metric.json"),
        include_str!("../../src/frameworks/execution/kpi-dashboard.json"),
        include_str!("../../src/frameworks/execution/retrospective.json"),
        include_str!("../../src/frameworks/execution/roadmap-template.json"),
        include_str!("../../src/frameworks/execution/success-metrics.json"),
        // Decision Making (5)
        include_str!("../../src/frameworks/decision/decision-matrix.json"),
        include_str!("../../src/frameworks/decision/raci.json"),
        include_str!("../../src/frameworks/decision/pre-mortem.json"),
        include_str!("../../src/frameworks/decision/opportunity-assessment.json"),
        include_str!("../../src/frameworks/decision/trade-off-analysis.json"),
        // Communication (7)
        include_str!("../../src/frameworks/communication/prd.json"),
        include_str!("../../src/frameworks/communication/user-stories.json"),
        include_str!("../../src/frameworks/communication/stakeholder-update.json"),
        include_str!("../../src/frameworks/communication/launch-plan.json"),
        include_str!("../../src/frameworks/communication/feature-brief.json"),
        include_str!("../../src/frameworks/communication/product-vision.json"),
        include_str!("../../src/frameworks/communication/changelog.json"),
    ];

    let now = Utc::now().timestamp();
    for fw_json in framework_files {
        let fw: serde_json::Value = serde_json::from_str(fw_json)
            .map_err(|e| format!("Failed to parse framework: {}", e))?;
        if fw["id"].as_str() == Some(id.as_str()) {
            conn.execute(
                "UPDATE framework_definitions SET system_prompt = ?1, guiding_questions = ?2, example_output = ?3, visual_instructions = ?4, updated_at = ?5 WHERE id = ?6",
                params![
                    fw["system_prompt"].as_str().unwrap_or(""),
                    fw["guiding_questions"].to_string(),
                    fw["example_output"].as_str().unwrap_or(""),
                    fw["visual_instructions"].as_str(),
                    &now,
                    &id,
                ],
            ).map_err(|e| format!("Failed to reset framework: {}", e))?;

            return get_framework_def(id, app).await?
                .ok_or_else(|| "Framework not found after reset".to_string());
        }
    }

    Err(format!("No seed data found for framework '{}'", id))
}

#[tauri::command]
pub async fn search_framework_defs(query: String, app: tauri::AppHandle) -> Result<Vec<FrameworkDefRow>, String> {
    let conn = get_db_connection(&app)?;
    let search = format!("%{}%", query);
    let q = format!("SELECT {} FROM framework_definitions WHERE name LIKE ?1 OR description LIKE ?1 ORDER BY sort_order ASC", FRAMEWORK_DEF_COLUMNS);
    let mut stmt = conn.prepare(&q).map_err(|e| format!("Failed to prepare: {}", e))?;

    let rows = stmt.query_map(params![&search], row_to_framework_def)
        .map_err(|e| format!("Failed to search: {}", e))?;
    let result: Result<Vec<_>, _> = rows.collect();
    result.map_err(|e| format!("Failed to collect: {}", e))
}

#[tauri::command]
pub async fn duplicate_framework_def(id: String, new_name: String, app: tauri::AppHandle) -> Result<FrameworkDefRow, String> {
    let original = get_framework_def(id.clone(), app.clone()).await?
        .ok_or_else(|| format!("Framework '{}' not found", id))?;

    let conn = get_db_connection(&app)?;
    let new_id = new_name.to_lowercase().replace(' ', "-").replace('(', "").replace(')', "");
    let now = Utc::now().timestamp();

    conn.execute(
        &format!("INSERT INTO framework_definitions ({}) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, 0, ?11, ?12, ?13)", FRAMEWORK_DEF_COLUMNS),
        params![
            &new_id, &original.category, &new_name, &original.description, &original.icon,
            &original.example_output, &original.system_prompt, &original.guiding_questions,
            original.supports_visuals, &original.visual_instructions, original.sort_order + 1, &now, &now
        ],
    ).map_err(|e| format!("Failed to duplicate framework: {}", e))?;

    get_framework_def(new_id, app).await?
        .ok_or_else(|| "Framework not found after duplicate".to_string())
}

#[tauri::command]
pub async fn create_project(
    name: String,
    description: Option<String>,
    app: tauri::AppHandle,
) -> Result<Project, String> {
    let conn = get_db_connection(&app)?;
    let id = Uuid::new_v4().to_string();
    let now = Utc::now().timestamp();

    let project = Project {
        id: id.clone(),
        name: name.clone(),
        description: description.clone(),
        created_at: now,
        updated_at: now,
    };

    conn.execute(
        "INSERT INTO projects (id, name, description, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5)",
        params![&id, &name, &description.unwrap_or_default(), &now, &now],
    ).map_err(|e| format!("Failed to create project: {}", e))?;

    Ok(project)
}

#[tauri::command]
pub async fn list_projects(app: tauri::AppHandle) -> Result<Vec<Project>, String> {
    let conn = get_db_connection(&app)?;

    let mut stmt = conn.prepare("SELECT id, name, description, created_at, updated_at FROM projects ORDER BY updated_at DESC")
        .map_err(|e| format!("Failed to prepare statement: {}", e))?;

    let projects = stmt.query_map([], |row| {
        Ok(Project {
            id: row.get(0)?,
            name: row.get(1)?,
            description: {
                let desc: String = row.get(2)?;
                if desc.is_empty() { None } else { Some(desc) }
            },
            created_at: row.get(3)?,
            updated_at: row.get(4)?,
        })
    }).map_err(|e| format!("Failed to query projects: {}", e))?;

    let result: Result<Vec<Project>, _> = projects.collect();
    result.map_err(|e| format!("Failed to collect projects: {}", e))
}

#[tauri::command]
pub async fn get_project(id: String, app: tauri::AppHandle) -> Result<Option<Project>, String> {
    let conn = get_db_connection(&app)?;

    let mut stmt = conn.prepare("SELECT id, name, description, created_at, updated_at FROM projects WHERE id = ?1")
        .map_err(|e| format!("Failed to prepare statement: {}", e))?;

    let project = stmt.query_row(params![&id], |row| {
        Ok(Project {
            id: row.get(0)?,
            name: row.get(1)?,
            description: {
                let desc: String = row.get(2)?;
                if desc.is_empty() { None } else { Some(desc) }
            },
            created_at: row.get(3)?,
            updated_at: row.get(4)?,
        })
    }).optional()
        .map_err(|e| format!("Failed to get project: {}", e))?;

    Ok(project)
}

#[tauri::command]
pub async fn update_project(
    id: String,
    name: String,
    description: Option<String>,
    app: tauri::AppHandle,
) -> Result<Project, String> {
    let conn = get_db_connection(&app)?;
    let now = Utc::now().timestamp();

    conn.execute(
        "UPDATE projects SET name = ?1, description = ?2, updated_at = ?3 WHERE id = ?4",
        params![&name, &description.unwrap_or_default(), &now, &id],
    ).map_err(|e| format!("Failed to update project: {}", e))?;

    // Fetch the updated project
    get_project(id, app).await?
        .ok_or_else(|| "Project not found after update".to_string())
}

#[tauri::command]
pub async fn delete_project(id: String, app: tauri::AppHandle) -> Result<(), String> {
    let conn = get_db_connection(&app)?;

    conn.execute(
        "DELETE FROM projects WHERE id = ?1",
        params![&id],
    ).map_err(|e| format!("Failed to delete project: {}", e))?;

    Ok(())
}

// Conversation commands

#[tauri::command]
pub async fn create_conversation(
    project_id: String,
    title: Option<String>,
    model: String,
    app: tauri::AppHandle,
) -> Result<Conversation, String> {
    let conn = get_db_connection(&app)?;
    let id = Uuid::new_v4().to_string();
    let now = Utc::now().timestamp();

    let conversation = Conversation {
        id: id.clone(),
        project_id: project_id.clone(),
        title: title.clone(),
        model: model.clone(),
        total_tokens: 0,
        total_cost: 0.0,
        created_at: now,
        updated_at: now,
    };

    conn.execute(
        "INSERT INTO conversations (id, project_id, title, model, total_tokens, total_cost, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        params![&id, &project_id, &title.unwrap_or_default(), &model, &0, &0.0, &now, &now],
    ).map_err(|e| format!("Failed to create conversation: {}", e))?;

    Ok(conversation)
}

#[tauri::command]
pub async fn list_conversations(
    project_id: String,
    app: tauri::AppHandle,
) -> Result<Vec<Conversation>, String> {
    let conn = get_db_connection(&app)?;

    let mut stmt = conn.prepare(
        "SELECT id, project_id, title, model, total_tokens, total_cost, created_at, updated_at
         FROM conversations
         WHERE project_id = ?1
         ORDER BY updated_at DESC"
    ).map_err(|e| format!("Failed to prepare statement: {}", e))?;

    let conversations = stmt.query_map(params![&project_id], |row| {
        Ok(Conversation {
            id: row.get(0)?,
            project_id: row.get(1)?,
            title: {
                let title: String = row.get(2)?;
                if title.is_empty() { None } else { Some(title) }
            },
            model: row.get(3)?,
            total_tokens: row.get(4)?,
            total_cost: row.get(5)?,
            created_at: row.get(6)?,
            updated_at: row.get(7)?,
        })
    }).map_err(|e| format!("Failed to query conversations: {}", e))?;

    let result: Result<Vec<Conversation>, _> = conversations.collect();
    result.map_err(|e| format!("Failed to collect conversations: {}", e))
}

#[tauri::command]
pub async fn get_conversation(
    id: String,
    app: tauri::AppHandle,
) -> Result<Option<Conversation>, String> {
    let conn = get_db_connection(&app)?;

    let mut stmt = conn.prepare(
        "SELECT id, project_id, title, model, total_tokens, total_cost, created_at, updated_at
         FROM conversations
         WHERE id = ?1"
    ).map_err(|e| format!("Failed to prepare statement: {}", e))?;

    let conversation = stmt.query_row(params![&id], |row| {
        Ok(Conversation {
            id: row.get(0)?,
            project_id: row.get(1)?,
            title: {
                let title: String = row.get(2)?;
                if title.is_empty() { None } else { Some(title) }
            },
            model: row.get(3)?,
            total_tokens: row.get(4)?,
            total_cost: row.get(5)?,
            created_at: row.get(6)?,
            updated_at: row.get(7)?,
        })
    }).optional()
        .map_err(|e| format!("Failed to get conversation: {}", e))?;

    Ok(conversation)
}

#[tauri::command]
pub async fn add_message(
    conversation_id: String,
    role: String,
    content: String,
    tokens: i32,
    app: tauri::AppHandle,
) -> Result<Message, String> {
    let conn = get_db_connection(&app)?;
    let id = Uuid::new_v4().to_string();
    let now = Utc::now().timestamp();

    let message = Message {
        id: id.clone(),
        conversation_id: conversation_id.clone(),
        role: role.clone(),
        content: content.clone(),
        tokens,
        created_at: now,
    };

    conn.execute(
        "INSERT INTO messages (id, conversation_id, role, content, tokens, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![&id, &conversation_id, &role, &content, &tokens, &now],
    ).map_err(|e| format!("Failed to add message: {}", e))?;

    Ok(message)
}

#[tauri::command]
pub async fn get_messages(
    conversation_id: String,
    app: tauri::AppHandle,
) -> Result<Vec<Message>, String> {
    let conn = get_db_connection(&app)?;

    let mut stmt = conn.prepare(
        "SELECT id, conversation_id, role, content, tokens, created_at
         FROM messages
         WHERE conversation_id = ?1
         ORDER BY created_at ASC"
    ).map_err(|e| format!("Failed to prepare statement: {}", e))?;

    let messages = stmt.query_map(params![&conversation_id], |row| {
        Ok(Message {
            id: row.get(0)?,
            conversation_id: row.get(1)?,
            role: row.get(2)?,
            content: row.get(3)?,
            tokens: row.get(4)?,
            created_at: row.get(5)?,
        })
    }).map_err(|e| format!("Failed to query messages: {}", e))?;

    let result: Result<Vec<Message>, _> = messages.collect();
    result.map_err(|e| format!("Failed to collect messages: {}", e))
}

#[tauri::command]
pub async fn update_conversation_stats(
    id: String,
    tokens: i32,
    cost: f64,
    app: tauri::AppHandle,
) -> Result<(), String> {
    let conn = get_db_connection(&app)?;
    let now = Utc::now().timestamp();

    conn.execute(
        "UPDATE conversations
         SET total_tokens = total_tokens + ?1,
             total_cost = total_cost + ?2,
             updated_at = ?3
         WHERE id = ?4",
        params![&tokens, &cost, &now, &id],
    ).map_err(|e| format!("Failed to update conversation stats: {}", e))?;

    Ok(())
}

#[tauri::command]
pub async fn delete_conversation(
    id: String,
    app: tauri::AppHandle,
) -> Result<(), String> {
    let conn = get_db_connection(&app)?;

    conn.execute(
        "DELETE FROM conversations WHERE id = ?1",
        params![&id],
    ).map_err(|e| format!("Failed to delete conversation: {}", e))?;

    Ok(())
}

// Token usage tracking commands

#[derive(Debug, Serialize, Deserialize)]
pub struct TokenUsage {
    pub id: String,
    pub conversation_id: String,
    pub model: String,
    pub input_tokens: i32,
    pub output_tokens: i32,
    pub total_tokens: i32,
    pub cost: f64,
    pub created_at: i64,
    pub date: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TokenUsageAggregate {
    pub date: String,
    pub total_tokens: i32,
    pub input_tokens: i32,
    pub output_tokens: i32,
    pub cost: f64,
    pub conversation_count: i32,
}

#[tauri::command]
pub async fn record_token_usage(
    conversation_id: String,
    model: String,
    input_tokens: i32,
    output_tokens: i32,
    cost: f64,
    app: tauri::AppHandle,
) -> Result<String, String> {
    let conn = get_db_connection(&app)?;
    let id = Uuid::new_v4().to_string();
    let now = Utc::now();
    let timestamp = now.timestamp();
    let date = now.format("%Y-%m-%d").to_string();
    let total_tokens = input_tokens + output_tokens;

    conn.execute(
        "INSERT INTO token_usage (id, conversation_id, model, input_tokens, output_tokens, total_tokens, cost, created_at, date)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
        params![&id, &conversation_id, &model, &input_tokens, &output_tokens, &total_tokens, &cost, &timestamp, &date],
    ).map_err(|e| format!("Failed to record token usage: {}", e))?;

    Ok(id)
}

#[tauri::command]
pub async fn get_token_usage_by_date_range(
    start_date: String,
    end_date: String,
    view_type: String, // "daily" or "monthly"
    app: tauri::AppHandle,
) -> Result<Vec<TokenUsageAggregate>, String> {
    let conn = get_db_connection(&app)?;

    let date_format = if view_type == "monthly" {
        "%Y-%m"
    } else {
        "%Y-%m-%d"
    };

    let query = format!(
        "SELECT
            strftime('{}', date) as period,
            SUM(total_tokens) as total_tokens,
            SUM(input_tokens) as input_tokens,
            SUM(output_tokens) as output_tokens,
            SUM(cost) as cost,
            COUNT(DISTINCT conversation_id) as conversation_count
         FROM token_usage
         WHERE date >= ?1 AND date <= ?2
         GROUP BY period
         ORDER BY period ASC",
        date_format
    );

    let mut stmt = conn.prepare(&query)
        .map_err(|e| format!("Failed to prepare query: {}", e))?;

    let aggregates = stmt.query_map(params![&start_date, &end_date], |row| {
        Ok(TokenUsageAggregate {
            date: row.get(0)?,
            total_tokens: row.get(1)?,
            input_tokens: row.get(2)?,
            output_tokens: row.get(3)?,
            cost: row.get(4)?,
            conversation_count: row.get(5)?,
        })
    }).map_err(|e| format!("Failed to query token usage: {}", e))?;

    let result: Result<Vec<TokenUsageAggregate>, _> = aggregates.collect();
    result.map_err(|e| format!("Failed to collect token usage: {}", e))
}

#[tauri::command]
pub async fn get_all_token_usage(
    app: tauri::AppHandle,
) -> Result<Vec<TokenUsage>, String> {
    let conn = get_db_connection(&app)?;

    let mut stmt = conn.prepare(
        "SELECT id, conversation_id, model, input_tokens, output_tokens, total_tokens, cost, created_at, date
         FROM token_usage
         ORDER BY created_at DESC"
    ).map_err(|e| format!("Failed to prepare query: {}", e))?;

    let usage_records = stmt.query_map([], |row| {
        Ok(TokenUsage {
            id: row.get(0)?,
            conversation_id: row.get(1)?,
            model: row.get(2)?,
            input_tokens: row.get(3)?,
            output_tokens: row.get(4)?,
            total_tokens: row.get(5)?,
            cost: row.get(6)?,
            created_at: row.get(7)?,
            date: row.get(8)?,
        })
    }).map_err(|e| format!("Failed to query token usage: {}", e))?;

    let result: Result<Vec<TokenUsage>, _> = usage_records.collect();
    result.map_err(|e| format!("Failed to collect token usage: {}", e))
}

// Settings commands

#[tauri::command]
pub async fn get_settings(app: tauri::AppHandle) -> Result<Settings, String> {
    let conn = get_db_connection(&app)?;

    let mut stmt = conn.prepare(
        "SELECT id, api_key_encrypted, username, name, surname, job_title, company, company_url,
                profile_pic, about_me, about_role, created_at, updated_at
         FROM settings WHERE id = ?1"
    ).map_err(|e| format!("Failed to prepare statement: {}", e))?;

    let settings = stmt.query_row(params!["default"], |row| {
        Ok(Settings {
            id: row.get(0)?,
            api_key_encrypted: row.get(1)?,
            username: row.get(2)?,
            name: row.get(3)?,
            surname: row.get(4)?,
            job_title: row.get(5)?,
            company: row.get(6)?,
            company_url: row.get(7)?,
            profile_pic: row.get(8)?,
            about_me: row.get(9)?,
            about_role: row.get(10)?,
            created_at: row.get(11)?,
            updated_at: row.get(12)?,
        })
    }).map_err(|e| format!("Failed to get settings: {}", e))?;

    Ok(settings)
}

#[tauri::command]
pub async fn update_settings(
    settings: SettingsUpdate,
    app: tauri::AppHandle,
) -> Result<Settings, String> {
    let conn = get_db_connection(&app)?;
    let now = Utc::now().timestamp();

    // Encrypt API key if provided
    let api_key_encrypted = if let Some(ref api_key) = settings.api_key {
        if api_key.is_empty() {
            None
        } else {
            let key = get_encryption_key(&app)?;
            Some(encrypt_string(api_key, &key)?)
        }
    } else {
        None
    };

    conn.execute(
        "UPDATE settings
         SET api_key_encrypted = COALESCE(?1, api_key_encrypted),
             username = COALESCE(?2, username),
             name = COALESCE(?3, name),
             surname = COALESCE(?4, surname),
             job_title = COALESCE(?5, job_title),
             company = COALESCE(?6, company),
             company_url = COALESCE(?7, company_url),
             profile_pic = COALESCE(?8, profile_pic),
             about_me = COALESCE(?9, about_me),
             about_role = COALESCE(?10, about_role),
             updated_at = ?11
         WHERE id = ?12",
        params![
            &api_key_encrypted,
            &settings.username,
            &settings.name,
            &settings.surname,
            &settings.job_title,
            &settings.company,
            &settings.company_url,
            &settings.profile_pic,
            &settings.about_me,
            &settings.about_role,
            &now,
            "default"
        ],
    ).map_err(|e| format!("Failed to update settings: {}", e))?;

    get_settings(app).await
}

#[tauri::command]
pub async fn get_decrypted_api_key(app: tauri::AppHandle) -> Result<Option<String>, String> {
    let settings = get_settings(app.clone()).await?;

    if let Some(encrypted) = settings.api_key_encrypted {
        let key = get_encryption_key(&app)?;
        Ok(Some(decrypt_string(&encrypted, &key)?))
    } else {
        Ok(None)
    }
}

#[tauri::command]
pub async fn delete_api_key(app: tauri::AppHandle) -> Result<(), String> {
    let conn = get_db_connection(&app)?;
    let now = Utc::now().timestamp();

    conn.execute(
        "UPDATE settings SET api_key_encrypted = NULL, updated_at = ?1 WHERE id = ?2",
        params![&now, "default"],
    ).map_err(|e| format!("Failed to delete API key: {}", e))?;

    Ok(())
}

// Folder commands

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Folder {
    pub id: String,
    pub project_id: String,
    pub parent_id: Option<String>,
    pub name: String,
    pub color: Option<String>,
    pub sort_order: i32,
    pub created_at: i64,
    pub updated_at: i64,
}

#[tauri::command]
pub async fn create_folder(
    project_id: String,
    name: String,
    parent_id: Option<String>,
    color: Option<String>,
    app: tauri::AppHandle,
) -> Result<Folder, String> {
    let conn = get_db_connection(&app)?;
    let id = Uuid::new_v4().to_string();
    let now = Utc::now().timestamp();

    let folder = Folder {
        id: id.clone(),
        project_id: project_id.clone(),
        parent_id: parent_id.clone(),
        name: name.clone(),
        color: color.clone(),
        sort_order: 0,
        created_at: now,
        updated_at: now,
    };

    conn.execute(
        "INSERT INTO folders (id, project_id, parent_id, name, color, sort_order, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        params![&id, &project_id, &parent_id, &name, &color, &0, &now, &now],
    ).map_err(|e| format!("Failed to create folder: {}", e))?;

    Ok(folder)
}

#[tauri::command]
pub async fn list_folders(
    project_id: String,
    app: tauri::AppHandle,
) -> Result<Vec<Folder>, String> {
    let conn = get_db_connection(&app)?;

    let mut stmt = conn.prepare(
        "SELECT id, project_id, parent_id, name, color, sort_order, created_at, updated_at
         FROM folders
         WHERE project_id = ?1
         ORDER BY sort_order ASC, name ASC"
    ).map_err(|e| format!("Failed to prepare statement: {}", e))?;

    let folders = stmt.query_map(params![&project_id], |row| {
        Ok(Folder {
            id: row.get(0)?,
            project_id: row.get(1)?,
            parent_id: row.get(2)?,
            name: row.get(3)?,
            color: row.get(4)?,
            sort_order: row.get(5)?,
            created_at: row.get(6)?,
            updated_at: row.get(7)?,
        })
    }).map_err(|e| format!("Failed to query folders: {}", e))?;

    let result: Result<Vec<Folder>, _> = folders.collect();
    result.map_err(|e| format!("Failed to collect folders: {}", e))
}

#[tauri::command]
pub async fn get_folder(
    id: String,
    app: tauri::AppHandle,
) -> Result<Option<Folder>, String> {
    let conn = get_db_connection(&app)?;

    let mut stmt = conn.prepare(
        "SELECT id, project_id, parent_id, name, color, sort_order, created_at, updated_at
         FROM folders WHERE id = ?1"
    ).map_err(|e| format!("Failed to prepare statement: {}", e))?;

    let folder = stmt.query_row(params![&id], |row| {
        Ok(Folder {
            id: row.get(0)?,
            project_id: row.get(1)?,
            parent_id: row.get(2)?,
            name: row.get(3)?,
            color: row.get(4)?,
            sort_order: row.get(5)?,
            created_at: row.get(6)?,
            updated_at: row.get(7)?,
        })
    }).optional()
        .map_err(|e| format!("Failed to get folder: {}", e))?;

    Ok(folder)
}

#[tauri::command]
pub async fn update_folder(
    id: String,
    name: Option<String>,
    parent_id: Option<String>,
    color: Option<String>,
    sort_order: Option<i32>,
    app: tauri::AppHandle,
) -> Result<Folder, String> {
    let conn = get_db_connection(&app)?;
    let now = Utc::now().timestamp();

    conn.execute(
        "UPDATE folders
         SET name = COALESCE(?1, name),
             parent_id = CASE WHEN ?2 = '__null__' THEN NULL WHEN ?2 IS NOT NULL THEN ?2 ELSE parent_id END,
             color = COALESCE(?3, color),
             sort_order = COALESCE(?4, sort_order),
             updated_at = ?5
         WHERE id = ?6",
        params![&name, &parent_id, &color, &sort_order, &now, &id],
    ).map_err(|e| format!("Failed to update folder: {}", e))?;

    get_folder(id, app).await?
        .ok_or_else(|| "Folder not found after update".to_string())
}

#[tauri::command]
pub async fn delete_folder(
    id: String,
    app: tauri::AppHandle,
) -> Result<(), String> {
    let conn = get_db_connection(&app)?;

    // Set folder_id to NULL on items in this folder before deleting
    conn.execute(
        "UPDATE context_documents SET folder_id = NULL WHERE folder_id = ?1",
        params![&id],
    ).map_err(|e| format!("Failed to unlink context documents: {}", e))?;

    conn.execute(
        "UPDATE framework_outputs SET folder_id = NULL WHERE folder_id = ?1",
        params![&id],
    ).map_err(|e| format!("Failed to unlink framework outputs: {}", e))?;

    conn.execute(
        "DELETE FROM folders WHERE id = ?1",
        params![&id],
    ).map_err(|e| format!("Failed to delete folder: {}", e))?;

    Ok(())
}

#[tauri::command]
pub async fn move_item_to_folder(
    item_id: String,
    item_type: String,
    folder_id: Option<String>,
    app: tauri::AppHandle,
) -> Result<(), String> {
    let conn = get_db_connection(&app)?;

    match item_type.as_str() {
        "context_doc" => {
            conn.execute(
                "UPDATE context_documents SET folder_id = ?1 WHERE id = ?2",
                params![&folder_id, &item_id],
            ).map_err(|e| format!("Failed to move context document: {}", e))?;
        },
        "framework_output" => {
            conn.execute(
                "UPDATE framework_outputs SET folder_id = ?1 WHERE id = ?2",
                params![&folder_id, &item_id],
            ).map_err(|e| format!("Failed to move framework output: {}", e))?;
        },
        _ => return Err(format!("Unknown item type: {}", item_type)),
    }

    Ok(())
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SearchResult {
    pub id: String,
    pub name: String,
    pub item_type: String,
    pub folder_id: Option<String>,
    pub category: Option<String>,
    pub doc_type: Option<String>,
    pub is_favorite: bool,
    pub created_at: i64,
}

#[tauri::command]
pub async fn search_project_items(
    project_id: String,
    query: String,
    app: tauri::AppHandle,
) -> Result<Vec<SearchResult>, String> {
    let conn = get_db_connection(&app)?;
    let search = format!("%{}%", query);

    let mut stmt = conn.prepare(
        "SELECT id, name, 'context_doc' as item_type, folder_id, NULL as category, type as doc_type, is_favorite, created_at
         FROM context_documents WHERE project_id = ?1 AND (name LIKE ?2 OR tags LIKE ?2)
         UNION ALL
         SELECT id, name, 'framework_output' as item_type, folder_id, category, NULL as doc_type, is_favorite, created_at
         FROM framework_outputs WHERE project_id = ?1 AND (name LIKE ?2 OR tags LIKE ?2)
         ORDER BY name ASC"
    ).map_err(|e| format!("Failed to prepare search: {}", e))?;

    let results = stmt.query_map(params![&project_id, &search], |row| {
        Ok(SearchResult {
            id: row.get(0)?,
            name: row.get(1)?,
            item_type: row.get(2)?,
            folder_id: row.get(3)?,
            category: row.get(4)?,
            doc_type: row.get(5)?,
            is_favorite: row.get::<_, i32>(6)? != 0,
            created_at: row.get(7)?,
        })
    }).map_err(|e| format!("Failed to search: {}", e))?;

    let result: Result<Vec<SearchResult>, _> = results.collect();
    result.map_err(|e| format!("Failed to collect search results: {}", e))
}

#[tauri::command]
pub async fn toggle_item_favorite(
    item_id: String,
    item_type: String,
    is_favorite: bool,
    app: tauri::AppHandle,
) -> Result<(), String> {
    let conn = get_db_connection(&app)?;
    let fav_val = if is_favorite { 1 } else { 0 };

    let table = match item_type.as_str() {
        "context_doc" => "context_documents",
        "framework_output" => "framework_outputs",
        _ => return Err(format!("Invalid item type: {}", item_type)),
    };

    conn.execute(
        &format!("UPDATE {} SET is_favorite = ?1 WHERE id = ?2", table),
        params![&fav_val, &item_id],
    ).map_err(|e| format!("Failed to toggle favorite: {}", e))?;

    Ok(())
}

#[tauri::command]
pub async fn set_folder_color(
    id: String,
    color: Option<String>,
    app: tauri::AppHandle,
) -> Result<(), String> {
    let conn = get_db_connection(&app)?;
    let now = Utc::now().timestamp();

    conn.execute(
        "UPDATE folders SET color = ?1, updated_at = ?2 WHERE id = ?3",
        params![&color, &now, &id],
    ).map_err(|e| format!("Failed to set folder color: {}", e))?;

    Ok(())
}

// Context Document commands

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ContextDocument {
    pub id: String,
    pub project_id: String,
    pub name: String,
    #[serde(rename = "type")]
    pub doc_type: String,
    pub content: String,
    pub url: Option<String>,
    pub is_global: bool,
    pub size_bytes: i64,
    pub created_at: i64,
    pub folder_id: Option<String>,
    pub tags: String,
    pub is_favorite: bool,
    pub sort_order: i32,
}

#[tauri::command]
pub async fn create_context_document(
    project_id: String,
    name: String,
    doc_type: String,
    content: String,
    url: Option<String>,
    is_global: bool,
    app: tauri::AppHandle,
) -> Result<ContextDocument, String> {
    let conn = get_db_connection(&app)?;
    let id = Uuid::new_v4().to_string();
    let now = Utc::now().timestamp();
    let size_bytes = content.len() as i64;

    let document = ContextDocument {
        id: id.clone(),
        project_id: project_id.clone(),
        name: name.clone(),
        doc_type: doc_type.clone(),
        content: content.clone(),
        url: url.clone(),
        is_global,
        size_bytes,
        created_at: now,
        folder_id: None,
        tags: "[]".to_string(),
        is_favorite: false,
        sort_order: 0,
    };

    conn.execute(
        "INSERT INTO context_documents (id, project_id, name, type, content, url, is_global, size_bytes, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
        params![&id, &project_id, &name, &doc_type, &content, &url, &is_global, &size_bytes, &now],
    ).map_err(|e| format!("Failed to create context document: {}", e))?;

    Ok(document)
}

#[tauri::command]
pub async fn list_context_documents(
    project_id: String,
    app: tauri::AppHandle,
) -> Result<Vec<ContextDocument>, String> {
    let conn = get_db_connection(&app)?;

    let mut stmt = conn.prepare(
        "SELECT id, project_id, name, type, content, url, is_global, size_bytes, created_at, folder_id, tags, is_favorite, sort_order
         FROM context_documents
         WHERE project_id = ?1
         ORDER BY sort_order ASC, created_at DESC"
    ).map_err(|e| format!("Failed to prepare statement: {}", e))?;

    let documents = stmt.query_map(params![&project_id], |row| {
        Ok(ContextDocument {
            id: row.get(0)?,
            project_id: row.get(1)?,
            name: row.get(2)?,
            doc_type: row.get(3)?,
            content: row.get(4)?,
            url: row.get(5)?,
            is_global: row.get::<_, i32>(6)? != 0,
            size_bytes: row.get(7)?,
            created_at: row.get(8)?,
            folder_id: row.get(9)?,
            tags: row.get::<_, Option<String>>(10)?.unwrap_or_else(|| "[]".to_string()),
            is_favorite: row.get::<_, Option<i32>>(11)?.unwrap_or(0) != 0,
            sort_order: row.get::<_, Option<i32>>(12)?.unwrap_or(0),
        })
    }).map_err(|e| format!("Failed to query context documents: {}", e))?;

    let result: Result<Vec<ContextDocument>, _> = documents.collect();
    result.map_err(|e| format!("Failed to collect context documents: {}", e))
}

#[tauri::command]
pub async fn get_context_document(
    id: String,
    app: tauri::AppHandle,
) -> Result<Option<ContextDocument>, String> {
    let conn = get_db_connection(&app)?;

    let mut stmt = conn.prepare(
        "SELECT id, project_id, name, type, content, url, is_global, size_bytes, created_at, folder_id, tags, is_favorite, sort_order
         FROM context_documents
         WHERE id = ?1"
    ).map_err(|e| format!("Failed to prepare statement: {}", e))?;

    let document = stmt.query_row(params![&id], |row| {
        Ok(ContextDocument {
            id: row.get(0)?,
            project_id: row.get(1)?,
            name: row.get(2)?,
            doc_type: row.get(3)?,
            content: row.get(4)?,
            url: row.get(5)?,
            is_global: row.get::<_, i32>(6)? != 0,
            size_bytes: row.get(7)?,
            created_at: row.get(8)?,
            folder_id: row.get(9)?,
            tags: row.get::<_, Option<String>>(10)?.unwrap_or_else(|| "[]".to_string()),
            is_favorite: row.get::<_, Option<i32>>(11)?.unwrap_or(0) != 0,
            sort_order: row.get::<_, Option<i32>>(12)?.unwrap_or(0),
        })
    }).optional()
        .map_err(|e| format!("Failed to get context document: {}", e))?;

    Ok(document)
}

#[tauri::command]
pub async fn update_context_document(
    id: String,
    name: String,
    is_global: bool,
    app: tauri::AppHandle,
) -> Result<ContextDocument, String> {
    let conn = get_db_connection(&app)?;

    conn.execute(
        "UPDATE context_documents
         SET name = ?1, is_global = ?2
         WHERE id = ?3",
        params![&name, &is_global, &id],
    ).map_err(|e| format!("Failed to update context document: {}", e))?;

    // Fetch the updated document
    get_context_document(id, app).await?
        .ok_or_else(|| "Context document not found after update".to_string())
}

#[tauri::command]
pub async fn delete_context_document(
    id: String,
    app: tauri::AppHandle,
) -> Result<(), String> {
    let conn = get_db_connection(&app)?;

    conn.execute(
        "DELETE FROM context_documents WHERE id = ?1",
        params![&id],
    ).map_err(|e| format!("Failed to delete context document: {}", e))?;

    Ok(())
}

// Framework Output commands

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FrameworkOutput {
    pub id: String,
    pub project_id: String,
    pub framework_id: String,
    pub category: String,
    pub name: String,
    pub user_prompt: String,
    pub context_doc_ids: String,
    pub generated_content: String,
    pub format: String,
    pub created_at: i64,
    pub updated_at: i64,
    pub folder_id: Option<String>,
    pub tags: String,
    pub is_favorite: bool,
    pub sort_order: i32,
}

#[tauri::command]
pub async fn create_framework_output(
    project_id: String,
    framework_id: String,
    category: String,
    name: String,
    user_prompt: String,
    context_doc_ids: String,
    generated_content: String,
    format: String,
    app: tauri::AppHandle,
) -> Result<FrameworkOutput, String> {
    let conn = get_db_connection(&app)?;
    let id = Uuid::new_v4().to_string();
    let now = Utc::now().timestamp();

    let output = FrameworkOutput {
        id: id.clone(),
        project_id: project_id.clone(),
        framework_id: framework_id.clone(),
        category: category.clone(),
        name: name.clone(),
        user_prompt: user_prompt.clone(),
        context_doc_ids: context_doc_ids.clone(),
        generated_content: generated_content.clone(),
        format: format.clone(),
        created_at: now,
        updated_at: now,
        folder_id: None,
        tags: "[]".to_string(),
        is_favorite: false,
        sort_order: 0,
    };

    conn.execute(
        "INSERT INTO framework_outputs (id, project_id, framework_id, category, name, user_prompt, context_doc_ids, generated_content, format, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
        params![&id, &project_id, &framework_id, &category, &name, &user_prompt, &context_doc_ids, &generated_content, &format, &now, &now],
    ).map_err(|e| format!("Failed to create framework output: {}", e))?;

    Ok(output)
}

#[tauri::command]
pub async fn list_framework_outputs(
    project_id: String,
    app: tauri::AppHandle,
) -> Result<Vec<FrameworkOutput>, String> {
    let conn = get_db_connection(&app)?;

    let mut stmt = conn.prepare(
        "SELECT id, project_id, framework_id, category, name, user_prompt, context_doc_ids, generated_content, format, created_at, updated_at, folder_id, tags, is_favorite, sort_order
         FROM framework_outputs
         WHERE project_id = ?1
         ORDER BY sort_order ASC, updated_at DESC"
    ).map_err(|e| format!("Failed to prepare statement: {}", e))?;

    let outputs = stmt.query_map(params![&project_id], |row| {
        Ok(FrameworkOutput {
            id: row.get(0)?,
            project_id: row.get(1)?,
            framework_id: row.get(2)?,
            category: row.get(3)?,
            name: row.get(4)?,
            user_prompt: row.get(5)?,
            context_doc_ids: row.get(6)?,
            generated_content: row.get(7)?,
            format: row.get(8)?,
            created_at: row.get(9)?,
            updated_at: row.get(10)?,
            folder_id: row.get(11)?,
            tags: row.get::<_, Option<String>>(12)?.unwrap_or_else(|| "[]".to_string()),
            is_favorite: row.get::<_, Option<i32>>(13)?.unwrap_or(0) != 0,
            sort_order: row.get::<_, Option<i32>>(14)?.unwrap_or(0),
        })
    }).map_err(|e| format!("Failed to query framework outputs: {}", e))?;

    let result: Result<Vec<FrameworkOutput>, _> = outputs.collect();
    result.map_err(|e| format!("Failed to collect framework outputs: {}", e))
}

#[tauri::command]
pub async fn get_framework_output(
    id: String,
    app: tauri::AppHandle,
) -> Result<Option<FrameworkOutput>, String> {
    let conn = get_db_connection(&app)?;

    let mut stmt = conn.prepare(
        "SELECT id, project_id, framework_id, category, name, user_prompt, context_doc_ids, generated_content, format, created_at, updated_at, folder_id, tags, is_favorite, sort_order
         FROM framework_outputs
         WHERE id = ?1"
    ).map_err(|e| format!("Failed to prepare statement: {}", e))?;

    let output = stmt.query_row(params![&id], |row| {
        Ok(FrameworkOutput {
            id: row.get(0)?,
            project_id: row.get(1)?,
            framework_id: row.get(2)?,
            category: row.get(3)?,
            name: row.get(4)?,
            user_prompt: row.get(5)?,
            context_doc_ids: row.get(6)?,
            generated_content: row.get(7)?,
            format: row.get(8)?,
            created_at: row.get(9)?,
            updated_at: row.get(10)?,
            folder_id: row.get(11)?,
            tags: row.get::<_, Option<String>>(12)?.unwrap_or_else(|| "[]".to_string()),
            is_favorite: row.get::<_, Option<i32>>(13)?.unwrap_or(0) != 0,
            sort_order: row.get::<_, Option<i32>>(14)?.unwrap_or(0),
        })
    }).optional()
        .map_err(|e| format!("Failed to get framework output: {}", e))?;

    Ok(output)
}

#[tauri::command]
pub async fn update_framework_output(
    id: String,
    name: String,
    generated_content: String,
    app: tauri::AppHandle,
) -> Result<FrameworkOutput, String> {
    let conn = get_db_connection(&app)?;
    let now = Utc::now().timestamp();

    conn.execute(
        "UPDATE framework_outputs
         SET name = ?1, generated_content = ?2, updated_at = ?3
         WHERE id = ?4",
        params![&name, &generated_content, &now, &id],
    ).map_err(|e| format!("Failed to update framework output: {}", e))?;

    // Fetch the updated output
    get_framework_output(id, app).await?
        .ok_or_else(|| "Framework output not found after update".to_string())
}

#[tauri::command]
pub async fn delete_framework_output(
    id: String,
    app: tauri::AppHandle,
) -> Result<(), String> {
    let conn = get_db_connection(&app)?;

    conn.execute(
        "DELETE FROM framework_outputs WHERE id = ?1",
        params![&id],
    ).map_err(|e| format!("Failed to delete framework output: {}", e))?;

    Ok(())
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CommandHistoryEntry {
    pub id: String,
    pub project_id: String,
    pub command: String,
    pub output: String,
    pub exit_code: i32,
    pub created_at: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CommandResult {
    pub output: String,
    pub exit_code: i32,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FrameworkCategoryRow {
    pub id: String,
    pub name: String,
    pub description: String,
    pub icon: String,
    pub is_builtin: bool,
    pub sort_order: i32,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FrameworkDefRow {
    pub id: String,
    pub category: String,
    pub name: String,
    pub description: String,
    pub icon: String,
    pub example_output: String,
    pub system_prompt: String,
    pub guiding_questions: String,
    pub supports_visuals: bool,
    pub visual_instructions: Option<String>,
    pub is_builtin: bool,
    pub sort_order: i32,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SavedPromptRow {
    pub id: String,
    pub name: String,
    pub description: String,
    pub category: String,
    pub prompt_text: String,
    pub variables: String,
    pub framework_id: Option<String>,
    pub is_builtin: bool,
    pub is_favorite: bool,
    pub usage_count: i32,
    pub sort_order: i32,
    pub created_at: i64,
    pub updated_at: i64,
}

#[tauri::command]
pub async fn execute_shell_command(
    project_id: String,
    command: String,
    app: tauri::AppHandle,
) -> Result<CommandResult, String> {
    use std::process::Command as StdCommand;

    let output = StdCommand::new("sh")
        .arg("-c")
        .arg(&command)
        .output()
        .map_err(|e| format!("Failed to execute command: {}", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    let stderr = String::from_utf8_lossy(&output.stderr);
    let combined = if stderr.is_empty() {
        stdout.to_string()
    } else if stdout.is_empty() {
        stderr.to_string()
    } else {
        format!("{}\n{}", stdout, stderr)
    };
    let exit_code = output.status.code().unwrap_or(-1);

    let conn = get_db_connection(&app)?;
    let id = Uuid::new_v4().to_string();
    let now = Utc::now().timestamp();

    conn.execute(
        "INSERT INTO command_history (id, project_id, command, output, exit_code, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![&id, &project_id, &command, &combined, &exit_code, &now],
    ).map_err(|e| format!("Failed to save command history: {}", e))?;

    Ok(CommandResult {
        output: combined,
        exit_code,
    })
}

#[tauri::command]
pub async fn get_command_history(
    project_id: String,
    limit: Option<i32>,
    app: tauri::AppHandle,
) -> Result<Vec<CommandHistoryEntry>, String> {
    let conn = get_db_connection(&app)?;
    let limit = limit.unwrap_or(50);

    let mut stmt = conn.prepare(
        "SELECT id, project_id, command, output, exit_code, created_at
         FROM command_history
         WHERE project_id = ?1
         ORDER BY created_at DESC
         LIMIT ?2"
    ).map_err(|e| format!("Failed to prepare query: {}", e))?;

    let entries = stmt.query_map(params![&project_id, &limit], |row| {
        Ok(CommandHistoryEntry {
            id: row.get(0)?,
            project_id: row.get(1)?,
            command: row.get(2)?,
            output: row.get(3)?,
            exit_code: row.get(4)?,
            created_at: row.get(5)?,
        })
    }).map_err(|e| format!("Failed to query command history: {}", e))?;

    let mut results = Vec::new();
    for entry in entries {
        results.push(entry.map_err(|e| format!("Failed to read command history entry: {}", e))?);
    }

    results.reverse();
    Ok(results)
}

// === Saved Prompts CRUD ===

const SAVED_PROMPT_COLUMNS: &str = "id, name, description, category, prompt_text, variables, framework_id, is_builtin, is_favorite, usage_count, sort_order, created_at, updated_at";

#[tauri::command]
pub async fn list_saved_prompts(
    category: Option<String>,
    framework_id: Option<String>,
    app: tauri::AppHandle,
) -> Result<Vec<SavedPromptRow>, String> {
    let conn = get_db_connection(&app)?;

    let (sql, param_values): (String, Vec<Box<dyn rusqlite::types::ToSql>>) = match (&category, &framework_id) {
        (Some(cat), Some(fid)) => (
            format!("SELECT {} FROM saved_prompts WHERE category = ?1 AND framework_id = ?2 ORDER BY sort_order, name", SAVED_PROMPT_COLUMNS),
            vec![Box::new(cat.clone()) as Box<dyn rusqlite::types::ToSql>, Box::new(fid.clone())],
        ),
        (Some(cat), None) => (
            format!("SELECT {} FROM saved_prompts WHERE category = ?1 ORDER BY sort_order, name", SAVED_PROMPT_COLUMNS),
            vec![Box::new(cat.clone()) as Box<dyn rusqlite::types::ToSql>],
        ),
        (None, Some(fid)) => (
            format!("SELECT {} FROM saved_prompts WHERE framework_id = ?1 ORDER BY sort_order, name", SAVED_PROMPT_COLUMNS),
            vec![Box::new(fid.clone()) as Box<dyn rusqlite::types::ToSql>],
        ),
        (None, None) => (
            format!("SELECT {} FROM saved_prompts ORDER BY sort_order, name", SAVED_PROMPT_COLUMNS),
            vec![],
        ),
    };

    let params_ref: Vec<&dyn rusqlite::types::ToSql> = param_values.iter().map(|p| p.as_ref()).collect();
    let mut stmt = conn.prepare(&sql).map_err(|e| format!("Failed to prepare query: {}", e))?;
    let rows = stmt.query_map(params_ref.as_slice(), row_to_saved_prompt)
        .map_err(|e| format!("Failed to list saved prompts: {}", e))?;

    let mut results = Vec::new();
    for row in rows {
        results.push(row.map_err(|e| format!("Failed to read saved prompt: {}", e))?);
    }
    Ok(results)
}

#[tauri::command]
pub async fn get_saved_prompt(id: String, app: tauri::AppHandle) -> Result<Option<SavedPromptRow>, String> {
    let conn = get_db_connection(&app)?;
    let result = conn.query_row(
        &format!("SELECT {} FROM saved_prompts WHERE id = ?1", SAVED_PROMPT_COLUMNS),
        params![&id],
        row_to_saved_prompt,
    ).optional().map_err(|e| format!("Failed to get saved prompt: {}", e))?;
    Ok(result)
}

#[tauri::command]
pub async fn create_saved_prompt(
    name: String,
    description: String,
    category: String,
    prompt_text: String,
    variables: String,
    framework_id: Option<String>,
    app: tauri::AppHandle,
) -> Result<SavedPromptRow, String> {
    let conn = get_db_connection(&app)?;
    let id = Uuid::new_v4().to_string();
    let now = Utc::now().timestamp();

    let max_sort: i32 = conn.query_row(
        "SELECT COALESCE(MAX(sort_order), -1) FROM saved_prompts WHERE category = ?1",
        params![&category],
        |row| row.get(0),
    ).unwrap_or(-1);

    conn.execute(
        "INSERT INTO saved_prompts (id, name, description, category, prompt_text, variables, framework_id, is_builtin, is_favorite, usage_count, sort_order, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 0, 0, 0, ?8, ?9, ?10)",
        params![&id, &name, &description, &category, &prompt_text, &variables, &framework_id, max_sort + 1, &now, &now],
    ).map_err(|e| format!("Failed to create saved prompt: {}", e))?;

    get_saved_prompt(id, app).await?.ok_or_else(|| "Failed to retrieve created prompt".to_string())
}

#[tauri::command]
pub async fn update_saved_prompt(
    id: String,
    name: Option<String>,
    description: Option<String>,
    category: Option<String>,
    prompt_text: Option<String>,
    variables: Option<String>,
    framework_id: Option<Option<String>>,
    is_favorite: Option<bool>,
    app: tauri::AppHandle,
) -> Result<SavedPromptRow, String> {
    let conn = get_db_connection(&app)?;
    let now = Utc::now().timestamp();

    conn.execute(
        "UPDATE saved_prompts SET
            name = COALESCE(?1, name),
            description = COALESCE(?2, description),
            category = COALESCE(?3, category),
            prompt_text = COALESCE(?4, prompt_text),
            variables = COALESCE(?5, variables),
            updated_at = ?6
         WHERE id = ?7",
        params![&name, &description, &category, &prompt_text, &variables, &now, &id],
    ).map_err(|e| format!("Failed to update saved prompt: {}", e))?;

    if let Some(fid) = framework_id {
        conn.execute(
            "UPDATE saved_prompts SET framework_id = ?1 WHERE id = ?2",
            params![&fid, &id],
        ).map_err(|e| format!("Failed to update prompt framework_id: {}", e))?;
    }

    if let Some(fav) = is_favorite {
        conn.execute(
            "UPDATE saved_prompts SET is_favorite = ?1 WHERE id = ?2",
            params![fav as i32, &id],
        ).map_err(|e| format!("Failed to update prompt favorite: {}", e))?;
    }

    get_saved_prompt(id, app).await?.ok_or_else(|| "Prompt not found after update".to_string())
}

#[tauri::command]
pub async fn delete_saved_prompt(id: String, app: tauri::AppHandle) -> Result<(), String> {
    let conn = get_db_connection(&app)?;

    let is_builtin: i32 = conn.query_row(
        "SELECT is_builtin FROM saved_prompts WHERE id = ?1", params![&id], |row| row.get(0)
    ).map_err(|e| format!("Prompt not found: {}", e))?;

    if is_builtin != 0 {
        return Err("Cannot delete built-in prompts".to_string());
    }

    conn.execute("DELETE FROM saved_prompts WHERE id = ?1", params![&id])
        .map_err(|e| format!("Failed to delete saved prompt: {}", e))?;
    Ok(())
}

#[tauri::command]
pub async fn search_saved_prompts(query: String, app: tauri::AppHandle) -> Result<Vec<SavedPromptRow>, String> {
    let conn = get_db_connection(&app)?;
    let search = format!("%{}%", query);

    let mut stmt = conn.prepare(
        &format!("SELECT {} FROM saved_prompts WHERE name LIKE ?1 OR description LIKE ?1 OR prompt_text LIKE ?1 ORDER BY usage_count DESC, name", SAVED_PROMPT_COLUMNS)
    ).map_err(|e| format!("Failed to prepare search: {}", e))?;

    let rows = stmt.query_map(params![&search], row_to_saved_prompt)
        .map_err(|e| format!("Failed to search saved prompts: {}", e))?;

    let mut results = Vec::new();
    for row in rows {
        results.push(row.map_err(|e| format!("Failed to read prompt: {}", e))?);
    }
    Ok(results)
}

#[tauri::command]
pub async fn duplicate_saved_prompt(id: String, new_name: String, app: tauri::AppHandle) -> Result<SavedPromptRow, String> {
    let original = get_saved_prompt(id, app.clone()).await?
        .ok_or_else(|| "Prompt not found".to_string())?;

    create_saved_prompt(
        new_name,
        original.description,
        original.category,
        original.prompt_text,
        original.variables,
        original.framework_id,
        app,
    ).await
}

#[tauri::command]
pub async fn increment_prompt_usage(id: String, app: tauri::AppHandle) -> Result<(), String> {
    let conn = get_db_connection(&app)?;
    let now = Utc::now().timestamp();

    conn.execute(
        "UPDATE saved_prompts SET usage_count = usage_count + 1, updated_at = ?1 WHERE id = ?2",
        params![&now, &id],
    ).map_err(|e| format!("Failed to increment prompt usage: {}", e))?;
    Ok(())
}
