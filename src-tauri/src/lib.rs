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
            create_template_instance,
            list_template_instances,
            get_template_instance,
            update_template_instance,
            delete_template_instance,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
