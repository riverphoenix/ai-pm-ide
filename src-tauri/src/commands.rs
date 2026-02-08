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

    // Create template instances table
    conn.execute(
        "CREATE TABLE IF NOT EXISTS template_instances (
            id TEXT PRIMARY KEY NOT NULL,
            project_id TEXT NOT NULL,
            template_id TEXT NOT NULL,
            name TEXT NOT NULL,
            field_values TEXT NOT NULL,
            output_markdown TEXT,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL,
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
        )",
        [],
    ).map_err(|e| format!("Failed to create template_instances table: {}", e))?;

    // Create index on project_id for efficient querying
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_template_instances_project_id ON template_instances(project_id)",
        [],
    ).map_err(|e| format!("Failed to create template_instances index: {}", e))?;

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

// Template Instance commands

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TemplateInstance {
    pub id: String,
    pub project_id: String,
    pub template_id: String,
    pub name: String,
    pub field_values: String,  // JSON string
    pub output_markdown: Option<String>,
    pub created_at: i64,
    pub updated_at: i64,
}

#[tauri::command]
pub async fn create_template_instance(
    project_id: String,
    template_id: String,
    name: String,
    field_values: String,
    app: tauri::AppHandle,
) -> Result<TemplateInstance, String> {
    let conn = get_db_connection(&app)?;
    let id = Uuid::new_v4().to_string();
    let now = Utc::now().timestamp();

    let instance = TemplateInstance {
        id: id.clone(),
        project_id: project_id.clone(),
        template_id: template_id.clone(),
        name: name.clone(),
        field_values: field_values.clone(),
        output_markdown: None,
        created_at: now,
        updated_at: now,
    };

    conn.execute(
        "INSERT INTO template_instances (id, project_id, template_id, name, field_values, output_markdown, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        params![&id, &project_id, &template_id, &name, &field_values, &None::<String>, &now, &now],
    ).map_err(|e| format!("Failed to create template instance: {}", e))?;

    Ok(instance)
}

#[tauri::command]
pub async fn list_template_instances(
    project_id: String,
    app: tauri::AppHandle,
) -> Result<Vec<TemplateInstance>, String> {
    let conn = get_db_connection(&app)?;

    let mut stmt = conn.prepare(
        "SELECT id, project_id, template_id, name, field_values, output_markdown, created_at, updated_at
         FROM template_instances
         WHERE project_id = ?1
         ORDER BY updated_at DESC"
    ).map_err(|e| format!("Failed to prepare statement: {}", e))?;

    let instances = stmt.query_map(params![&project_id], |row| {
        Ok(TemplateInstance {
            id: row.get(0)?,
            project_id: row.get(1)?,
            template_id: row.get(2)?,
            name: row.get(3)?,
            field_values: row.get(4)?,
            output_markdown: row.get(5)?,
            created_at: row.get(6)?,
            updated_at: row.get(7)?,
        })
    }).map_err(|e| format!("Failed to query template instances: {}", e))?;

    let result: Result<Vec<TemplateInstance>, _> = instances.collect();
    result.map_err(|e| format!("Failed to collect template instances: {}", e))
}

#[tauri::command]
pub async fn get_template_instance(
    id: String,
    app: tauri::AppHandle,
) -> Result<Option<TemplateInstance>, String> {
    let conn = get_db_connection(&app)?;

    let mut stmt = conn.prepare(
        "SELECT id, project_id, template_id, name, field_values, output_markdown, created_at, updated_at
         FROM template_instances
         WHERE id = ?1"
    ).map_err(|e| format!("Failed to prepare statement: {}", e))?;

    let instance = stmt.query_row(params![&id], |row| {
        Ok(TemplateInstance {
            id: row.get(0)?,
            project_id: row.get(1)?,
            template_id: row.get(2)?,
            name: row.get(3)?,
            field_values: row.get(4)?,
            output_markdown: row.get(5)?,
            created_at: row.get(6)?,
            updated_at: row.get(7)?,
        })
    }).optional()
        .map_err(|e| format!("Failed to get template instance: {}", e))?;

    Ok(instance)
}

#[tauri::command]
pub async fn update_template_instance(
    id: String,
    name: String,
    field_values: String,
    output_markdown: Option<String>,
    app: tauri::AppHandle,
) -> Result<TemplateInstance, String> {
    let conn = get_db_connection(&app)?;
    let now = Utc::now().timestamp();

    conn.execute(
        "UPDATE template_instances
         SET name = ?1, field_values = ?2, output_markdown = ?3, updated_at = ?4
         WHERE id = ?5",
        params![&name, &field_values, &output_markdown, &now, &id],
    ).map_err(|e| format!("Failed to update template instance: {}", e))?;

    // Fetch the updated instance
    get_template_instance(id, app).await?
        .ok_or_else(|| "Template instance not found after update".to_string())
}

#[tauri::command]
pub async fn delete_template_instance(
    id: String,
    app: tauri::AppHandle,
) -> Result<(), String> {
    let conn = get_db_connection(&app)?;

    conn.execute(
        "DELETE FROM template_instances WHERE id = ?1",
        params![&id],
    ).map_err(|e| format!("Failed to delete template instance: {}", e))?;

    Ok(())
}
