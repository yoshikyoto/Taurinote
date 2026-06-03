use serde::Serialize;
use std::{
    fs::{self, OpenOptions},
    path::Path,
};

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct DirectoryNode {
    name: String,
    path: String,
    kind: String,
    children: Vec<DirectoryNode>,
}

fn build_directory_node(path: &Path) -> Result<DirectoryNode, String> {
    let metadata = fs::metadata(path).map_err(|error| error.to_string())?;
    if !metadata.is_dir() {
        return Err("The selected path is not a directory.".to_string());
    }

    let mut children = fs::read_dir(path)
        .map_err(|error| error.to_string())?
        .filter_map(|entry| entry.ok())
        .filter_map(|entry| {
            let file_type = entry.file_type().ok()?;
            let entry_path = entry.path();

            if file_type.is_dir() {
                return build_directory_node(&entry_path).ok();
            }

            if file_type.is_file() {
                return Some(DirectoryNode {
                    name: node_name(&entry_path),
                    path: entry_path.to_string_lossy().into_owned(),
                    kind: "file".to_string(),
                    children: Vec::new(),
                });
            }

            None
        })
        .collect::<Vec<_>>();

    children.sort_by(|left, right| {
        left.kind
            .cmp(&right.kind)
            .then_with(|| left.name.to_lowercase().cmp(&right.name.to_lowercase()))
    });

    Ok(DirectoryNode {
        name: node_name(path),
        path: path.to_string_lossy().into_owned(),
        kind: "directory".to_string(),
        children,
    })
}

fn node_name(path: &Path) -> String {
    path.file_name()
        .and_then(|name| name.to_str())
        .map(str::to_owned)
        .unwrap_or_else(|| path.to_string_lossy().into_owned())
}

#[tauri::command]
fn read_directory_tree(path: String) -> Result<DirectoryNode, String> {
    build_directory_node(Path::new(&path))
}

#[tauri::command]
fn read_markdown_file(path: String) -> Result<String, String> {
    fs::read_to_string(path).map_err(|error| error.to_string())
}

#[tauri::command]
fn create_markdown_file(directory_path: String, file_name: String) -> Result<String, String> {
    let directory_path = Path::new(&directory_path);
    let metadata = fs::metadata(directory_path).map_err(|error| error.to_string())?;
    if !metadata.is_dir() {
        return Err("The selected path is not a directory.".to_string());
    }

    let trimmed_name = file_name.trim();
    if trimmed_name.is_empty()
        || trimmed_name == "."
        || trimmed_name == ".."
        || trimmed_name.contains('/')
        || trimmed_name.contains('\\')
    {
        return Err("Invalid file name.".to_string());
    }

    let stem = Path::new(trimmed_name)
        .file_stem()
        .and_then(|name| name.to_str())
        .ok_or_else(|| "Invalid file name.".to_string())?;
    let path = directory_path.join(format!("{stem}.md"));

    OpenOptions::new()
        .write(true)
        .create_new(true)
        .open(&path)
        .map_err(|error| error.to_string())?;

    Ok(path.to_string_lossy().into_owned())
}

#[tauri::command]
fn write_markdown_file(path: String, content: String) -> Result<(), String> {
    fs::write(path, content).map_err(|error| error.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            read_directory_tree,
            read_markdown_file,
            create_markdown_file,
            write_markdown_file
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
