// Modules
mod commands;

use commands::*;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            // Initialize database on startup
            init_db(&app.handle())?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            create_project,
            list_projects,
            get_project,
            update_project,
            delete_project,
            create_conversation,
            list_conversations,
            get_conversation,
            add_message,
            get_messages,
            update_conversation_stats,
            delete_conversation,
            record_token_usage,
            get_token_usage_by_date_range,
            get_all_token_usage,
            get_settings,
            update_settings,
            get_decrypted_api_key,
            delete_api_key,
            create_context_document,
            list_context_documents,
            get_context_document,
            update_context_document,
            delete_context_document,
            create_framework_output,
            list_framework_outputs,
            get_framework_output,
            update_framework_output,
            delete_framework_output,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
