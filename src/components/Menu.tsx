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
} from "@mantine/core";
import { FileIcon } from "@phosphor-icons/react/dist/csr/File";
import { FolderIcon } from "@phosphor-icons/react/dist/csr/Folder";
import { FolderOpenIcon } from "@phosphor-icons/react/dist/csr/FolderOpen";
import { PlusIcon } from "@phosphor-icons/react/dist/csr/Plus";
import { XIcon } from "@phosphor-icons/react/dist/csr/X";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { useMemo, useState } from "react";

type DirectoryNode = {
  name: string;
  path: string;
  kind: "directory" | "file";
  children: DirectoryNode[];
};

type DirectoryTreeNodeProps = RenderTreeNodePayload & {
  onCloseRootDirectory: () => void;
};

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
  onCloseRootDirectory,
}: DirectoryTreeNodeProps) {
  const isDirectory = node.nodeProps?.kind === "directory";
  const isRoot = level === 1;

  return (
    <Group gap={6} wrap="nowrap" title={node.value} {...elementProps}>
      {isDirectory && expanded ? (
        <FolderOpenIcon aria-hidden color="#55715f" size={17} />
      ) : isDirectory ? (
        <FolderIcon aria-hidden color="#55715f" size={17} />
      ) : (
        <FileIcon aria-hidden color="#6b736e" size={16} />
      )}
      <Text
        component="span"
        fz="0.82rem"
        lh={1.3}
        miw={0}
        style={{ flex: 1 }}
        truncate
      >
        {node.label}
      </Text>
      {isRoot && (
        <ActionIcon
          aria-label="Close directory"
          c="#5a635e"
          onClick={(event) => {
            event.stopPropagation();
            onCloseRootDirectory();
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

function Menu() {
  const [directoryTree, setDirectoryTree] = useState<DirectoryNode | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const treeData = useMemo(
    () => (directoryTree ? [toTreeNode(directoryTree)] : []),
    [directoryTree],
  );

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

  function closeRootDirectory() {
    setDirectoryTree(null);
    setError(null);
  }

  return (
    <AppShell.Navbar
      aria-label="Menu"
      bg="#fffdfa"
      style={{
        borderRight: "1px solid #d7d4c8",
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
            c="#25312c"
            data={treeData}
            levelOffset={18}
            renderNode={(payload) => (
              <DirectoryTreeNode
                {...payload}
                onCloseRootDirectory={closeRootDirectory}
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
            c="#a33c35"
            fz="0.78rem"
            m={8}
            size="xs"
            style={{ overflowWrap: "anywhere" }}
          >
            {error}
          </Text>
        )}
      </ScrollArea>
      <Button
        disabled={isLoading}
        fw={700}
        justify="flex-start"
        leftSection={<PlusIcon aria-hidden size={16} weight="bold" />}
        loading={isLoading}
        mih={42}
        onClick={addDirectory}
        px={14}
        py={0}
        radius={0}
        style={{ borderTop: "1px solid #d7d4c8" }}
        type="button"
        vars={() => ({
          root: {
            "--button-bg": "#fffdfa",
            "--button-bd": "0",
            "--button-color": "#18211d",
            "--button-hover": "#eaf5ee",
          },
        })}
        variant="subtle"
      >
        Add Directory
      </Button>
    </AppShell.Navbar>
  );
}

export default Menu;
