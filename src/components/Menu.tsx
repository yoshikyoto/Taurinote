import {
  ActionIcon,
  AppShell,
  Button,
  Group,
  RenderTreeNodePayload,
  ScrollArea,
  Text,
  TextInput,
  Tree,
  TreeNodeData,
  useComputedColorScheme,
  useMantineColorScheme,
  useTree,
} from "@mantine/core";
import { FileIcon } from "@phosphor-icons/react/dist/csr/File";
import { FilePlusIcon } from "@phosphor-icons/react/dist/csr/FilePlus";
import { FolderIcon } from "@phosphor-icons/react/dist/csr/Folder";
import { FolderOpenIcon } from "@phosphor-icons/react/dist/csr/FolderOpen";
import { FolderPlusIcon } from "@phosphor-icons/react/dist/csr/FolderPlus";
import { MoonIcon } from "@phosphor-icons/react/dist/csr/Moon";
import { PlusIcon } from "@phosphor-icons/react/dist/csr/Plus";
import { SunIcon } from "@phosphor-icons/react/dist/csr/Sun";
import { XIcon } from "@phosphor-icons/react/dist/csr/X";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  loadExpandedDirectoryPaths,
  loadOpenDirectoryPaths,
  saveExpandedDirectoryPaths,
  saveOpenDirectoryPaths,
} from "../lib/repository/directoryStateRepository";

type DirectoryNode = {
  name: string;
  path: string;
  kind: "directory" | "file";
  children: DirectoryNode[];
};

// 作成中のツリー項目
type PendingTreeEntry = {
  directoryPath: string;
  kind: "directory" | "file";
  name: string;
};

type DirectoryTreeNodeProps = RenderTreeNodePayload & {
  colors: {
    active: string;
    fileIcon: string;
    folderIcon: string;
    textSubtle: string;
  };
  openMarkdownPath: string | null;
  pendingEntryKind: PendingTreeEntry["kind"] | null;
  pendingEntryName: string;
  onCancelPendingEntry: () => void;
  onCloseRootDirectory: (path: string) => void;
  onCommitPendingEntry: (
    name: string,
    options?: { cancelIfEmpty?: boolean },
  ) => void;
  onPendingEntryNameChange: (name: string) => void;
  onStartCreatingDirectory: (directoryPath: string) => void;
  onStartCreatingMarkdownFile: (directoryPath: string) => void;
  onOpenMarkdownFile: (path: string) => void;
};

const PENDING_TREE_ENTRY_NODE_PREFIX = "pending-tree-entry:";

function readDirectoryTree(path: string) {
  return invoke<DirectoryNode>("read_directory_tree", { path });
}

function createMarkdownFile(directoryPath: string, fileName: string) {
  return invoke<string>("create_markdown_file", { directoryPath, fileName });
}

function createDirectory(directoryPath: string, directoryName: string) {
  return invoke<string>("create_directory", { directoryPath, directoryName });
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

function addPendingTreeEntryNode(
  nodes: TreeNodeData[],
  pendingEntry: PendingTreeEntry | null,
): TreeNodeData[] {
  if (!pendingEntry) return nodes;

  return nodes.map((node) => {
    if (node.value !== pendingEntry.directoryPath) {
      return {
        ...node,
        children: node.children
          ? addPendingTreeEntryNode(node.children, pendingEntry)
          : undefined,
      };
    }

    return {
      ...node,
      children: [
        {
          label: "",
          value: `${PENDING_TREE_ENTRY_NODE_PREFIX}${pendingEntry.kind}:${pendingEntry.directoryPath}`,
          nodeProps: {
            directoryPath: pendingEntry.directoryPath,
            kind: "pendingEntry",
            pendingKind: pendingEntry.kind,
          },
        },
        ...(node.children ?? []),
      ],
    };
  });
}

function collectDirectoryPaths(node: DirectoryNode): string[] {
  if (node.kind !== "directory") return [];

  return [
    node.path,
    ...node.children.flatMap((child) => collectDirectoryPaths(child)),
  ];
}

function toExpandedState(paths: string[]) {
  return Object.fromEntries(paths.map((path) => [path, true]));
}

function toExpandedDirectoryPaths(
  expandedState: Record<string, boolean>,
  directoryTrees: DirectoryNode[],
) {
  const directoryPaths = new Set(directoryTrees.flatMap(collectDirectoryPaths));

  return Object.entries(expandedState)
    .filter(([path, isExpanded]) => isExpanded && directoryPaths.has(path))
    .map(([path]) => path);
}

function isPathInDirectory(path: string, directoryPath: string) {
  const normalizedPath = path.replace(/\\/g, "/");
  const normalizedDirectoryPath = directoryPath.replace(/\\/g, "/");

  return (
    normalizedPath === normalizedDirectoryPath ||
    normalizedPath.startsWith(`${normalizedDirectoryPath}/`)
  );
}

function DirectoryTreeNode({
  node,
  expanded,
  elementProps,
  level,
  colors,
  openMarkdownPath,
  pendingEntryKind,
  pendingEntryName,
  onCancelPendingEntry,
  onCloseRootDirectory,
  onCommitPendingEntry,
  onPendingEntryNameChange,
  onStartCreatingDirectory,
  onStartCreatingMarkdownFile,
  onOpenMarkdownFile,
}: DirectoryTreeNodeProps) {
  const [isHovered, setIsHovered] = useState(false);
  const pendingEntryInputRef = useRef<HTMLInputElement>(null);
  const shouldSkipPendingEntryBlurRef = useRef(false);
  const isPendingEntry = node.nodeProps?.kind === "pendingEntry";
  const pendingKind = node.nodeProps?.pendingKind as
    | PendingTreeEntry["kind"]
    | undefined;
  const isDirectory = node.nodeProps?.kind === "directory";
  const isRoot = level === 1;
  const isMarkdownFile =
    !isDirectory && !isPendingEntry && /\.(md|markdown)$/i.test(node.value);
  const isOpenMarkdownFile =
    isMarkdownFile && node.value === openMarkdownPath;

  useEffect(() => {
    if (isPendingEntry) {
      pendingEntryInputRef.current?.focus();
    }
  }, [isPendingEntry]);

  function handleClick(event: React.MouseEvent) {
    elementProps.onClick(event);

    if (isMarkdownFile) {
      onOpenMarkdownFile(node.value);
    }
  }

  if (isPendingEntry) {
    const isPendingDirectory = pendingKind === "directory";

    return (
      <Group
        gap={6}
        wrap="nowrap"
        title={isPendingDirectory ? "New directory" : "New markdown file"}
        {...elementProps}
        onClick={(event) => event.stopPropagation()}
      >
        {isPendingDirectory ? (
          <FolderIcon aria-hidden color={colors.folderIcon} size={17} />
        ) : (
          <FileIcon aria-hidden color={colors.fileIcon} size={16} />
        )}
        <Group gap={2} miw={0} style={{ flex: 1 }} wrap="nowrap">
          <TextInput
            aria-label={
              isPendingDirectory
                ? "New directory name"
                : "New markdown file name"
            }
            autoComplete="off"
            ref={pendingEntryInputRef}
            size="xs"
            styles={{
              input: {
                color: "inherit",
                fontSize: "0.82rem",
                height: 20,
                lineHeight: "1.3",
                minHeight: 20,
                padding: 0,
              },
              root: { flex: 1, minWidth: 0 },
            }}
            value={pendingEntryName}
            variant="unstyled"
            onChange={(event) =>
              onPendingEntryNameChange(event.currentTarget.value)
            }
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => {
              event.stopPropagation();

              if (event.key === "Enter") {
                event.preventDefault();
                onCommitPendingEntry(event.currentTarget.value);
              }

              if (event.key === "Escape") {
                event.preventDefault();
                shouldSkipPendingEntryBlurRef.current = true;
                onCancelPendingEntry();
              }
            }}
            onBlur={(event) => {
              if (shouldSkipPendingEntryBlurRef.current) {
                shouldSkipPendingEntryBlurRef.current = false;
                return;
              }

              onCommitPendingEntry(event.currentTarget.value, {
                cancelIfEmpty: true,
              });
            }}
          />
          {pendingEntryKind === "file" && (
            <Text c={colors.textSubtle} component="span" fz="0.82rem" lh={1.3}>
              .md
            </Text>
          )}
        </Group>
      </Group>
    );
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
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
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
      {isDirectory && (
        <ActionIcon
          aria-label={`Add directory to ${node.label}`}
          c={colors.textSubtle}
          onClick={(event) => {
            event.stopPropagation();
            onStartCreatingDirectory(node.value);
          }}
          onKeyDown={(event) => event.stopPropagation()}
          size={20}
          style={{
            opacity: isHovered ? 1 : 0,
            pointerEvents: isHovered ? undefined : "none",
            transition: "opacity 120ms ease",
          }}
          title={`Add directory to ${node.label}`}
          type="button"
          variant="subtle"
        >
          <FolderPlusIcon aria-hidden size={14} weight="bold" />
        </ActionIcon>
      )}
      {isDirectory && (
        <ActionIcon
          aria-label={`Add markdown file to ${node.label}`}
          c={colors.textSubtle}
          onClick={(event) => {
            event.stopPropagation();
            onStartCreatingMarkdownFile(node.value);
          }}
          onKeyDown={(event) => event.stopPropagation()}
          size={20}
          style={{
            opacity: isHovered ? 1 : 0,
            pointerEvents: isHovered ? undefined : "none",
            transition: "opacity 120ms ease",
          }}
          title={`Add markdown file to ${node.label}`}
          type="button"
          variant="subtle"
        >
          <FilePlusIcon aria-hidden size={14} weight="bold" />
        </ActionIcon>
      )}
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
  onOpenMarkdownFile: (path: string | null) => void;
};

function Menu({ openMarkdownPath, onOpenMarkdownFile }: MenuProps) {
  const colorScheme = useComputedColorScheme("light");
  const { setColorScheme } = useMantineColorScheme();
  const [initialExpandedState] = useState(() =>
    toExpandedState(loadExpandedDirectoryPaths()),
  );
  const tree = useTree({ initialExpandedState });
  const [directoryTrees, setDirectoryTrees] = useState<DirectoryNode[]>([]);
  const [pendingEntry, setPendingEntry] = useState<PendingTreeEntry | null>(
    null,
  );
  const isCommittingPendingEntryRef = useRef(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const treeData = useMemo(
    () => addPendingTreeEntryNode(directoryTrees.map(toTreeNode), pendingEntry),
    [directoryTrees, pendingEntry],
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

  const refreshRootDirectoryForPath = useCallback(async (path: string) => {
    setIsLoading(true);
    try {
      const nextTree = await readDirectoryTree(path);
      setDirectoryTrees((currentTrees) =>
        currentTrees.map((tree) =>
          tree.path === nextTree.path ? nextTree : tree,
        ),
      );
      setError(null);
    } catch (readError) {
      setError(String(readError));
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
      saveOpenDirectoryPaths(directoryTrees.map((tree) => tree.path));
    }
  }, [directoryTrees, isInitialized]);

  useEffect(() => {
    if (isInitialized) {
      saveExpandedDirectoryPaths(
        toExpandedDirectoryPaths(tree.expandedState, directoryTrees),
      );
    }
  }, [directoryTrees, isInitialized, tree.expandedState]);

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

  function startCreatingDirectory(directoryPath: string) {
    setPendingEntry({ directoryPath, kind: "directory", name: "" });
    tree.expand(directoryPath);
    setError(null);
  }

  function startCreatingMarkdownFile(directoryPath: string) {
    setPendingEntry({ directoryPath, kind: "file", name: "" });
    tree.expand(directoryPath);
    setError(null);
  }

  async function commitPendingEntry(
    nextName: string,
    options: { cancelIfEmpty?: boolean } = {},
  ) {
    if (!pendingEntry || isCommittingPendingEntryRef.current) return;

    const name = nextName.trim();
    if (name.length === 0) {
      if (options.cancelIfEmpty) {
        setPendingEntry(null);
        setError(null);
        return;
      }

      setError(
        pendingEntry.kind === "directory"
          ? "ディレクトリ名を入力してください。"
          : "ファイル名を入力してください。",
      );
      return;
    }

    const targetDirectoryPath = pendingEntry.directoryPath;
    const pendingKind = pendingEntry.kind;
    isCommittingPendingEntryRef.current = true;
    setIsLoading(true);
    setError(null);
    try {
      const createdPath =
        pendingKind === "directory"
          ? await createDirectory(targetDirectoryPath, name)
          : await createMarkdownFile(targetDirectoryPath, name);
      const rootTree = directoryTrees.find((tree) =>
        isPathInDirectory(targetDirectoryPath, tree.path),
      );
      if (rootTree) {
        await refreshRootDirectoryForPath(rootTree.path);
      }
      tree.expand(targetDirectoryPath);
      if (pendingKind === "directory") {
        tree.expand(createdPath);
      } else {
        onOpenMarkdownFile(createdPath);
      }
      setPendingEntry(null);
    } catch (createError) {
      setError(String(createError));
    } finally {
      isCommittingPendingEntryRef.current = false;
      setIsLoading(false);
    }
  }

  function closeRootDirectory(path: string) {
    if (openMarkdownPath && isPathInDirectory(openMarkdownPath, path)) {
      onOpenMarkdownFile(null);
    }
    if (pendingEntry && isPathInDirectory(pendingEntry.directoryPath, path)) {
      setPendingEntry(null);
    }

    setDirectoryTrees((currentTrees) =>
      currentTrees.filter((tree) => tree.path !== path),
    );
    tree.setExpandedState((currentState) => {
      const closedTree = directoryTrees.find((tree) => tree.path === path);
      if (!closedTree) return currentState;

      const closedDirectoryPaths = new Set(collectDirectoryPaths(closedTree));

      return Object.fromEntries(
        Object.entries(currentState).filter(
          ([directoryPath]) => !closedDirectoryPaths.has(directoryPath),
        ),
      );
    });
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
                pendingEntryKind={pendingEntry?.kind ?? null}
                pendingEntryName={pendingEntry?.name ?? ""}
                onCancelPendingEntry={() => setPendingEntry(null)}
                onCloseRootDirectory={closeRootDirectory}
                onCommitPendingEntry={commitPendingEntry}
                onPendingEntryNameChange={(name) =>
                  setPendingEntry((currentEntry) =>
                    currentEntry ? { ...currentEntry, name } : currentEntry,
                  )
                }
                onStartCreatingDirectory={startCreatingDirectory}
                onStartCreatingMarkdownFile={startCreatingMarkdownFile}
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
            tree={tree}
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
