// Modules
mod commands;

use commands::*;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
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
            create_folder,
            list_folders,
            get_folder,
            update_folder,
            delete_folder,
            move_item_to_folder,
            search_project_items,
            toggle_item_favorite,
            set_folder_color,
            execute_shell_command,
            get_command_history,
            list_framework_categories,
            get_framework_category,
            create_framework_category,
            update_framework_category,
            delete_framework_category,
            list_framework_defs,
            get_framework_def,
            create_framework_def,
            update_framework_def,
            delete_framework_def,
            reset_framework_def,
            search_framework_defs,
            duplicate_framework_def,
            list_saved_prompts,
            get_saved_prompt,
            create_saved_prompt,
            update_saved_prompt,
            delete_saved_prompt,
            search_saved_prompts,
            duplicate_saved_prompt,
            increment_prompt_usage,
            export_framework,
            export_frameworks_batch,
            export_all_frameworks,
            preview_import_framework,
            confirm_import_framework,
            export_prompt,
            export_prompts_batch,
            export_all_prompts,
            preview_import_prompt,
            confirm_import_prompt,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
