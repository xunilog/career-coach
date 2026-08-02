use tauri::Manager;
use tauri_plugin_sql::{Migration, MigrationKind};

#[tauri::command]
fn export_pdf() -> Result<Vec<u8>, String> {
    // PDF export is handled via window.print() in the frontend.
    // This command is a placeholder for future server-side PDF generation.
    Err("PDF export is handled by the frontend via window.print()".into())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let migrations = vec![
        Migration {
            version: 1,
            description: "Initial schema — all 12 tables",
            sql: include_str!("../migrations/001_initial.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "Add country column to searches",
            sql: include_str!("../migrations/002_add_country.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 3,
            description: "Add dedup_key column to jobs for stable content-based identity",
            sql: include_str!("../migrations/003_add_dedup_key.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 4,
            description: "Add provider_keys table for LLM API key storage",
            sql: include_str!("../migrations/004_add_provider_keys.sql"),
            kind: MigrationKind::Up,
        },
    ];

    tauri::Builder::default()
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:career-coach.db", migrations)
                .build(),
        )
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_global_shortcut::Builder::default().build())
        .invoke_handler(tauri::generate_handler![export_pdf])
        .setup(|app| {
            // Hide the menu bar (equivalent to Menu.setApplicationMenu(null))
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.set_menu(tauri::menu::Menu::new(app.handle())?);
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
