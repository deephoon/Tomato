// Open the Tomato main app (the full dashboard) in the user's default browser.
// In the hybrid model the Tauri app is only the floating widget; the "main page"
// lives in Chrome/Safari, so the widget hands off to the browser here.
#[tauri::command]
fn open_main_page(url: Option<String>) {
  let target = url.unwrap_or_else(|| "http://localhost:5173/".to_string());
  #[cfg(target_os = "macos")]
  let _ = std::process::Command::new("open").arg(&target).spawn();
  #[cfg(target_os = "windows")]
  let _ = std::process::Command::new("cmd").args(["/C", "start", "", &target]).spawn();
  #[cfg(all(unix, not(target_os = "macos")))]
  let _ = std::process::Command::new("xdg-open").arg(&target).spawn();
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![open_main_page])
    // NOTE: tauri-plugin-window-state was removed — its default StateFlags
    // persisted the window `decorations` flag, which kept restoring the old
    // frameless (decorations:false) main window and made it unmovable even
    // after the config was changed to a normal decorated window.
    .setup(|app| {
      #[cfg(target_os = "macos")]
      {
        // Removed apply_vibrancy to allow custom non-rectangular CSS shapes
      }

      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
