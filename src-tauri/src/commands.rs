use serde::{Deserialize, Serialize};
use uuid::Uuid;
use chrono::Utc;
use tauri::Manager;
use rusqlite::{Connection, params, OptionalExtension};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Project {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub created_at: i64,
    pub updated_at: i64,
}

// Database connection helper
fn get_db_connection(app: &tauri::AppHandle) -> Result<Connection, String> {
    let app_dir = app.path().app_data_dir()
        .map_err(|e| format!("Failed to get app directory: {}", e))?;

    std::fs::create_dir_all(&app_dir)
        .map_err(|e| format!("Failed to create app directory: {}", e))?;

    let db_path = app_dir.join("pm-ide.db");
    Connection::open(db_path)
        .map_err(|e| format!("Failed to open database: {}", e))
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
