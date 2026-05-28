import {
  ActionIcon,
  AppShell,
  Button,
  Group,
  RenderTreeNodePayload,
  ScrollArea,
  Text,
  Tree,
  TreeNodeData,
  useComputedColorScheme,
  useMantineColorScheme,
} from "@mantine/core";
import { FileIcon } from "@phosphor-icons/react/dist/csr/File";
import { FolderIcon } from "@phosphor-icons/react/dist/csr/Folder";
import { FolderOpenIcon } from "@phosphor-icons/react/dist/csr/FolderOpen";
import { MoonIcon } from "@phosphor-icons/react/dist/csr/Moon";
import { PlusIcon } from "@phosphor-icons/react/dist/csr/Plus";
import { SunIcon } from "@phosphor-icons/react/dist/csr/Sun";
import { XIcon } from "@phosphor-icons/react/dist/csr/X";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { useCallback, useEffect, useMemo, useState } from "react";

const OPEN_DIRECTORY_PATHS_STORAGE_KEY = "openDirectoryPaths";

type DirectoryNode = {
  name: string;
  path: string;
  kind: "directory" | "file";
  children: DirectoryNode[];
};

type DirectoryTreeNodeProps = RenderTreeNodePayload & {
  colors: {
    active: string;
    fileIcon: string;
    folderIcon: string;
    textSubtle: string;
  };
  openMarkdownPath: string | null;
  onCloseRootDirectory: (path: string) => void;
  onOpenMarkdownFile: (path: string) => void;
};

function loadOpenDirectoryPaths() {
  try {
    const savedPaths = JSON.parse(
      localStorage.getItem(OPEN_DIRECTORY_PATHS_STORAGE_KEY) ?? "[]",
    );

    if (!Array.isArray(savedPaths)) return [];

    return [...new Set(savedPaths.filter((path) => typeof path === "string"))];
  } catch {
    return [];
  }
}

function saveOpenDirectoryPaths(directoryTrees: DirectoryNode[]) {
  try {
    localStorage.setItem(
      OPEN_DIRECTORY_PATHS_STORAGE_KEY,
      JSON.stringify(directoryTrees.map((tree) => tree.path)),
    );
  } catch {
    return;
  }
}

function readDirectoryTree(path: string) {
  return invoke<DirectoryNode>("read_directory_tree", { path });
}

async function readDirectoryTrees(paths: string[]) {
  const results = await Promise.allSettled(paths.map(readDirectoryTree));
  const trees: DirectoryNode[] = [];
  const errors: string[] = [];

  results.forEach((result) => {
    if (result.status === "fulfilled") {
      trees.push(result.value);
    } else {
      errors.push(String(result.reason));
    }
  });

  return { trees, error: errors[0] ?? null };
}

function toTreeNode(node: DirectoryNode): TreeNodeData {
  return {
    label: node.name,
    value: node.path,
    nodeProps: { kind: node.kind },
    children:
      node.kind === "directory" ? node.children.map(toTreeNode) : undefined,
  };
}

function DirectoryTreeNode({
  node,
  expanded,
  elementProps,
  level,
  colors,
  openMarkdownPath,
  onCloseRootDirectory,
  onOpenMarkdownFile,
}: DirectoryTreeNodeProps) {
  const isDirectory = node.nodeProps?.kind === "directory";
  const isRoot = level === 1;
  const isMarkdownFile =
    !isDirectory && /\.(md|markdown)$/i.test(node.value);
  const isOpenMarkdownFile =
    isMarkdownFile && node.value === openMarkdownPath;

  function handleClick(event: React.MouseEvent) {
    elementProps.onClick(event);

    if (isMarkdownFile) {
      onOpenMarkdownFile(node.value);
    }
  }

  return (
    <Group
      gap={6}
      wrap="nowrap"
      title={node.value}
      {...elementProps}
      aria-current={isOpenMarkdownFile ? "page" : undefined}
      bg={isOpenMarkdownFile ? colors.active : undefined}
      onClick={handleClick}
    >
      {isDirectory && expanded ? (
        <FolderOpenIcon aria-hidden color={colors.folderIcon} size={17} />
      ) : isDirectory ? (
        <FolderIcon aria-hidden color={colors.folderIcon} size={17} />
      ) : (
        <FileIcon aria-hidden color={colors.fileIcon} size={16} />
      )}
      <Text
        component="span"
        fz="0.82rem"
        lh={1.3}
        miw={0}
        style={{ flex: 1 }}
        fw={isOpenMarkdownFile ? 700 : undefined}
        truncate
      >
        {node.label}
      </Text>
      {isRoot && (
        <ActionIcon
          aria-label="Close directory"
          c={colors.textSubtle}
          onClick={(event) => {
            event.stopPropagation();
            onCloseRootDirectory(node.value);
          }}
          onKeyDown={(event) => event.stopPropagation()}
          size={20}
          title="Close directory"
          type="button"
          variant="subtle"
        >
          <XIcon aria-hidden size={13} weight="bold" />
        </ActionIcon>
      )}
    </Group>
  );
}

type MenuProps = {
  openMarkdownPath: string | null;
  onOpenMarkdownFile: (path: string) => void;
};

function Menu({ openMarkdownPath, onOpenMarkdownFile }: MenuProps) {
  const colorScheme = useComputedColorScheme("light");
  const { setColorScheme } = useMantineColorScheme();
  const [directoryTrees, setDirectoryTrees] = useState<DirectoryNode[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const treeData = useMemo(
    () => directoryTrees.map(toTreeNode),
    [directoryTrees],
  );
  const isDarkMode = colorScheme === "dark";
  const menuColors = isDarkMode
    ? {
        active: "#355047",
        border: "#313936",
        error: "#ff9a91",
        fileIcon: "#9ca7a2",
        folderIcon: "#8fb6a1",
        hover: "#25302b",
        navbar: "#101412",
        text: "#dfe7e2",
        textSubtle: "#b9c4be",
      }
    : {
        active: "#d8e8e1",
        border: "#d7d4c8",
        error: "#a33c35",
        fileIcon: "#6b736e",
        folderIcon: "#55715f",
        hover: "#eaf5ee",
        navbar: "#fffdfa",
        text: "#25312c",
        textSubtle: "#5a635e",
      };

  const refreshDirectoryTrees = useCallback(async (paths: string[]) => {
    if (paths.length === 0) return;

    setIsLoading(true);
    try {
      const { trees, error: nextError } = await readDirectoryTrees(paths);
      setDirectoryTrees(trees);
      setError(nextError);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const savedPaths = loadOpenDirectoryPaths();
    if (savedPaths.length === 0) {
      setIsInitialized(true);
      return;
    }

    let isCancelled = false;
    setIsLoading(true);

    void readDirectoryTrees(savedPaths)
      .then(({ trees, error: restoreError }) => {
        if (isCancelled) return;

        setDirectoryTrees(trees);
        setError(restoreError);
        setIsInitialized(true);
        setIsLoading(false);
      })
      .catch((restoreError) => {
        if (isCancelled) return;

        setDirectoryTrees([]);
        setError(String(restoreError));
        setIsInitialized(true);
        setIsLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    if (isInitialized) {
      saveOpenDirectoryPaths(directoryTrees);
    }
  }, [directoryTrees, isInitialized]);

  useEffect(() => {
    if (!isInitialized || directoryTrees.length === 0) return;

    const paths = directoryTrees.map((tree) => tree.path);

    function handleFocus() {
      void refreshDirectoryTrees(paths);
    }

    window.addEventListener("focus", handleFocus);

    return () => {
      window.removeEventListener("focus", handleFocus);
    };
  }, [directoryTrees, isInitialized, refreshDirectoryTrees]);

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
      const nextTree = await readDirectoryTree(selectedPath);
      setDirectoryTrees((currentTrees) => {
        const existingTreeIndex = currentTrees.findIndex(
          (tree) => tree.path === nextTree.path,
        );

        if (existingTreeIndex === -1) {
          return [...currentTrees, nextTree];
        }

        return currentTrees.map((tree, index) =>
          index === existingTreeIndex ? nextTree : tree,
        );
      });
    } catch (readError) {
      setError(String(readError));
    } finally {
      setIsLoading(false);
    }
  }

  function closeRootDirectory(path: string) {
    setDirectoryTrees((currentTrees) =>
      currentTrees.filter((tree) => tree.path !== path),
    );
    setError(null);
  }

  return (
    <AppShell.Navbar
      aria-label="Menu"
      bg={menuColors.navbar}
      style={{
        borderRight: `1px solid ${menuColors.border}`,
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
      }}
    >
      <ScrollArea
        flex={1}
        mih={0}
        style={{ overflow: "auto" }}
        styles={{ viewport: { padding: "10px 8px 16px" } }}
      >
        {treeData.length > 0 && (
          <Tree
            c={menuColors.text}
            data={treeData}
            levelOffset={18}
            renderNode={(payload) => (
              <DirectoryTreeNode
                {...payload}
                colors={menuColors}
                openMarkdownPath={openMarkdownPath}
                onCloseRootDirectory={closeRootDirectory}
                onOpenMarkdownFile={onOpenMarkdownFile}
              />
            )}
            styles={{
              label: {
                borderRadius: 6,
                minHeight: 24,
                paddingBlock: 2,
                paddingInlineEnd: 5,
                paddingInlineStart: "calc(var(--label-offset) + 5px)",
              },
              root: { padding: 0 },
            }}
          />
        )}
        {error && (
          <Text
            c={menuColors.error}
            fz="0.78rem"
            m={8}
            size="xs"
            style={{ overflowWrap: "anywhere" }}
          >
            {error}
          </Text>
        )}
      </ScrollArea>
      <Group
        gap={0}
        style={{ borderTop: `1px solid ${menuColors.border}` }}
        wrap="nowrap"
      >
        <ActionIcon
          aria-label={`Switch to ${isDarkMode ? "light" : "dark"} mode`}
          c={menuColors.text}
          h={42}
          onClick={() => setColorScheme(isDarkMode ? "light" : "dark")}
          radius={0}
          title={`Switch to ${isDarkMode ? "light" : "dark"} mode`}
          type="button"
          variant="subtle"
          w={42}
        >
          {isDarkMode ? (
            <SunIcon aria-hidden size={18} weight="bold" />
          ) : (
            <MoonIcon aria-hidden size={18} weight="bold" />
          )}
        </ActionIcon>
        <Button
          disabled={isLoading}
          flex={1}
          fw={700}
          justify="flex-start"
          leftSection={<PlusIcon aria-hidden size={16} weight="bold" />}
          loading={isLoading}
          mih={42}
          onClick={addDirectory}
          px={14}
          py={0}
          radius={0}
          type="button"
          vars={() => ({
            root: {
              "--button-bg": menuColors.navbar,
              "--button-bd": "0",
              "--button-color": menuColors.text,
              "--button-hover": menuColors.hover,
            },
          })}
          variant="subtle"
        >
          Add Directory
        </Button>
      </Group>
    </AppShell.Navbar>
  );
}

export default Menu;
