import { AppShell, Button, ScrollArea, Text } from "@mantine/core";
import { FileIcon } from "@phosphor-icons/react/dist/csr/File";
import { FolderIcon } from "@phosphor-icons/react/dist/csr/Folder";
import { PlusIcon } from "@phosphor-icons/react/dist/csr/Plus";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { useState } from "react";
import "./App.css";

type DirectoryNode = {
  name: string;
  path: string;
  kind: "directory" | "file";
  children: DirectoryNode[];
};

function DirectoryTree({ node }: { node: DirectoryNode }) {
  if (node.kind === "file") {
    return (
      <li className="tree-item tree-file">
        <FileIcon className="tree-icon file-icon" aria-hidden size={16} />
        <span className="tree-name">{node.name}</span>
      </li>
    );
  }

  return (
    <li className="tree-item tree-directory">
      <details open>
        <summary title={node.path}>
          <FolderIcon className="tree-icon folder-icon" aria-hidden size={17} />
          <span className="tree-name">{node.name}</span>
        </summary>
        {node.children.length > 0 && (
          <ul className="tree-list">
            {node.children.map((child) => (
              <DirectoryTree key={child.path} node={child} />
            ))}
          </ul>
        )}
      </details>
    </li>
  );
}

function App() {
  const [directoryTree, setDirectoryTree] = useState<DirectoryNode | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function addDirectory() {
    const selectedPath = await open({
      directory: true,
      multiple: false,
      title: "Add Directory",
    });
    if (typeof selectedPath !== "string") return;

    setIsLoading(true);
    setError(null);
    try {
      const nextTree = await invoke<DirectoryNode>("read_directory_tree", {
        path: selectedPath,
      });
      setDirectoryTree(nextTree);
    } catch (readError) {
      setError(String(readError));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <AppShell
      className="app-shell"
      navbar={{ width: 260, breakpoint: "xs" }}
      padding={0}
    >
      <AppShell.Navbar className="sidebar" aria-label="Menu">
        <ScrollArea className="sidebar-content">
          {directoryTree && (
            <ul className="tree-list tree-root">
              <DirectoryTree node={directoryTree} />
            </ul>
          )}
          {error && (
            <Text className="directory-error" c="red" size="xs">
              {error}
            </Text>
          )}
        </ScrollArea>
        <Button
          className="add-directory-button"
          disabled={isLoading}
          justify="flex-start"
          leftSection={<PlusIcon aria-hidden size={16} weight="bold" />}
          loading={isLoading}
          onClick={addDirectory}
          radius={0}
          type="button"
          variant="subtle"
        >
          Add Directory
        </Button>
      </AppShell.Navbar>
      <AppShell.Main className="workspace" aria-label="Workspace" />
    </AppShell>
  );
}

export default App;
