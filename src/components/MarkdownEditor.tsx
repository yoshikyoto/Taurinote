import { Box } from "@mantine/core";
import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";

type MarkdownEditorProps = {
  path: string | null;
};

function fileName(path: string) {
  const segments = path.split(/[\\/]/);

  return segments[segments.length - 1] || path;
}

function readMarkdownFile(path: string) {
  return invoke<string>("read_markdown_file", { path });
}

function writeMarkdownFile(path: string, content: string) {
  return invoke<void>("write_markdown_file", { path, content });
}

function MarkdownEditor({ path }: MarkdownEditorProps) {
  const [content, setContent] = useState("");
  const [savedContent, setSavedContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!path) {
      setContent("");
      setSavedContent("");
      return;
    }

    let isCancelled = false;
    setIsLoading(true);

    void readMarkdownFile(path)
      .then((nextContent) => {
        if (isCancelled) return;

        setContent(nextContent);
        setSavedContent(nextContent);
      })
      .catch(() => {
        if (!isCancelled) {
          setContent("");
          setSavedContent("");
        }
      })
      .finally(() => {
        if (!isCancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [path]);

  async function saveFile() {
    if (!path || isSaving || content === savedContent) return;

    setIsSaving(true);
    try {
      await writeMarkdownFile(path, content);
      setSavedContent(content);
    } catch {
      return;
    } finally {
      setIsSaving(false);
    }
  }

  if (!path) {
    return <Box bg="#f4f3ee" component="section" h="100dvh" />;
  }

  return (
    <Box component="section" display="flex" h="100dvh">
      <Box
        component="textarea"
        aria-label={`${fileName(path)} content`}
        bg="#f4f3ee"
        bd={0}
        c="#17201c"
        disabled={isLoading}
        flex={1}
        fz="0.92rem"
        miw={0}
        mih={0}
        onBlur={() => void saveFile()}
        onChange={(event) => setContent(event.currentTarget.value)}
        onKeyDown={(event) => {
          if ((event.metaKey || event.ctrlKey) && event.key === "s") {
            event.preventDefault();
            void saveFile();
          }
        }}
        p={24}
        style={{
          borderRadius: 0,
          fontFamily:
            'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
          lineHeight: 1.6,
          outline: "none",
          resize: "none",
        }}
        value={content}
        w="100%"
      />
    </Box>
  );
}

export default MarkdownEditor;
