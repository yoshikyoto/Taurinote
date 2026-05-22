import { Box } from "@mantine/core";
import { Crepe } from "@milkdown/crepe";
import "@milkdown/crepe/theme/common/style.css";
import "@milkdown/crepe/theme/frame.css";
import { invoke } from "@tauri-apps/api/core";
import {
  type KeyboardEvent,
  useEffect,
  useRef,
  useState,
} from "react";

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

type MilkdownMarkdownEditorProps = {
  ariaLabel: string;
  initialContent: string;
  isSaving: boolean;
  onChange: (content: string) => void;
  onSave: (content: string) => void;
};

function MilkdownMarkdownEditor({
  ariaLabel,
  initialContent,
  isSaving,
  onChange,
  onSave,
}: MilkdownMarkdownEditorProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const crepeRef = useRef<Crepe | null>(null);
  const onChangeRef = useRef(onChange);
  const onSaveRef = useRef(onSave);

  useEffect(() => {
    onChangeRef.current = onChange;
    onSaveRef.current = onSave;
  }, [onChange, onSave]);

  useEffect(() => {
    if (!rootRef.current) return;

    const crepe = new Crepe({
      root: rootRef.current,
      defaultValue: initialContent,
    });

    crepe.on((listener) => {
      listener
        .markdownUpdated((_ctx, markdown) => {
          onChangeRef.current(markdown);
        })
        .blur(() => {
          onSaveRef.current(crepe.getMarkdown());
        });
    });

    crepeRef.current = crepe;
    void crepe.create();

    return () => {
      crepeRef.current = null;
      void crepe.destroy();
    };
  }, []);

  useEffect(() => {
    crepeRef.current?.setReadonly(isSaving);
  }, [isSaving]);

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
      event.preventDefault();
      onSaveRef.current(crepeRef.current?.getMarkdown() ?? initialContent);
    }
  }

  return (
    <div
      aria-label={ariaLabel}
      className="markdown-editor__milkdown"
      onKeyDownCapture={handleKeyDown}
      ref={rootRef}
    />
  );
}

function MarkdownEditor({ path }: MarkdownEditorProps) {
  const [content, setContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [loadedPath, setLoadedPath] = useState<string | null>(null);
  const contentRef = useRef("");
  const savedContentRef = useRef("");
  const isSavingRef = useRef(false);

  useEffect(() => {
    if (!path) {
      setContent("");
      setLoadedPath(null);
      contentRef.current = "";
      savedContentRef.current = "";
      return;
    }

    let isCancelled = false;
    setLoadedPath(null);
    setIsLoading(true);

    void readMarkdownFile(path)
      .then((nextContent) => {
        if (isCancelled) return;

        setContent(nextContent);
        setLoadedPath(path);
        contentRef.current = nextContent;
        savedContentRef.current = nextContent;
      })
      .catch(() => {
        if (!isCancelled) {
          setContent("");
          setLoadedPath(path);
          contentRef.current = "";
          savedContentRef.current = "";
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

  function updateContent(nextContent: string) {
    contentRef.current = nextContent;
    setContent(nextContent);
  }

  async function saveFile(nextContent = contentRef.current) {
    if (
      !path ||
      isSavingRef.current ||
      nextContent === savedContentRef.current
    ) {
      return;
    }

    isSavingRef.current = true;
    setIsSaving(true);
    try {
      await writeMarkdownFile(path, nextContent);
      savedContentRef.current = nextContent;
    } catch {
      return;
    } finally {
      isSavingRef.current = false;
      setIsSaving(false);
    }
  }

  if (!path) {
    return <Box bg="#f4f3ee" component="section" h="100dvh" />;
  }

  return (
    <Box className="markdown-editor" component="section" h="100dvh">
      {!isLoading && loadedPath === path && (
        <MilkdownMarkdownEditor
          ariaLabel={`${fileName(path)} content`}
          initialContent={content}
          isSaving={isSaving}
          key={path}
          onChange={updateContent}
          onSave={(nextContent) => void saveFile(nextContent)}
        />
      )}
    </Box>
  );
}

export default MarkdownEditor;
