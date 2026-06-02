const OPEN_DIRECTORY_PATHS_STORAGE_KEY = "openDirectoryPaths";

function loadStringArray(key: string) {
  try {
    const savedValue = JSON.parse(localStorage.getItem(key) ?? "[]");

    if (!Array.isArray(savedValue)) return [];

    return [
      ...new Set(savedValue.filter((value) => typeof value === "string")),
    ];
  } catch {
    return [];
  }
}

function saveStringArray(key: string, values: string[]) {
  try {
    localStorage.setItem(key, JSON.stringify([...new Set(values)]));
  } catch {
    return;
  }
}

export function loadOpenDirectoryPaths() {
  return loadStringArray(OPEN_DIRECTORY_PATHS_STORAGE_KEY);
}

export function saveOpenDirectoryPaths(paths: string[]) {
  saveStringArray(OPEN_DIRECTORY_PATHS_STORAGE_KEY, paths);
}
