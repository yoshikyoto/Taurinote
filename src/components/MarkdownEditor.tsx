import { Box, useComputedColorScheme } from "@mantine/core";
import { Crepe } from "@milkdown/crepe";
import "@milkdown/crepe/theme/common/style.css";
import { invoke } from "@tauri-apps/api/core";
import { openUrl } from "@tauri-apps/plugin-opener";
import {
  type KeyboardEvent,
  type MouseEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import classes from "./MarkdownEditor.module.css";

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

function isOpenableUrl(href: string) {
  try {
    const url = new URL(href);

    return ["http:", "https:", "mailto:"].includes(url.protocol);
  } catch {
    return false;
  }
}

type MilkdownMarkdownEditorProps = {
  ariaLabel: string;
  initialContent: string;
  isSaving: boolean;
  onChange: (content: string) => void;
  onSave: (content: string) => void;
};

const lightMilkdownThemeVariables = {
  "--crepe-color-background": "#f4f3ee",
  "--crepe-color-on-background": "#17201c",
  "--crepe-color-surface": "#fbfaf7",
  "--crepe-color-surface-low": "#e7e5dc",
  "--crepe-color-on-surface": "#17201c",
  "--crepe-color-on-surface-variant": "#55605b",
  "--crepe-color-outline": "#9ba19b",
  "--crepe-color-primary": "#245b6c",
  "--crepe-color-secondary": "#d1e1e1",
  "--crepe-color-on-secondary": "#152325",
  "--crepe-color-inverse": "#f0f0f0",
  "--crepe-color-on-inverse": "#1a1a1a",
  "--crepe-color-inline-code": "#ba1a1a",
  "--crepe-color-error": "#ba1a1a",
  "--crepe-color-hover": "#e1e9e5",
  "--crepe-color-selected": "#cadbd6",
  "--crepe-color-inline-area": "#d9ddd8",
  "--crepe-font-title": "inherit",
  "--crepe-font-default": "inherit",
  "--crepe-font-code":
    'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
  "--crepe-shadow-1":
    "0px 1px 3px 1px rgba(0, 0, 0, 0.15), 0px 1px 2px 0px rgba(0, 0, 0, 0.3)",
  "--crepe-shadow-2":
    "0px 2px 6px 2px rgba(0, 0, 0, 0.15), 0px 1px 2px 0px rgba(0, 0, 0, 0.3)",
};

const darkMilkdownThemeVariables = {
  ...lightMilkdownThemeVariables,
  "--crepe-color-background": "#141816",
  "--crepe-color-on-background": "#e2ebe5",
  "--crepe-color-surface": "#1d2421",
  "--crepe-color-surface-low": "#202a26",
  "--crepe-color-on-surface": "#e2ebe5",
  "--crepe-color-on-surface-variant": "#b2bdb7",
  "--crepe-color-outline": "#68736d",
  "--crepe-color-primary": "#8bc5d6",
  "--crepe-color-secondary": "#29474d",
  "--crepe-color-on-secondary": "#e4f0ee",
  "--crepe-color-inverse": "#e2ebe5",
  "--crepe-color-on-inverse": "#18201c",
  "--crepe-color-inline-code": "#ffb0ab",
  "--crepe-color-error": "#ffb0ab",
  "--crepe-color-hover": "#26332e",
  "--crepe-color-selected": "#355047",
  "--crepe-color-inline-area": "#27302d",
};

function MilkdownMarkdownEditor({
  ariaLabel,
  initialContent,
  isSaving,
  onChange,
  onSave,
}: MilkdownMarkdownEditorProps) {
  const colorScheme = useComputedColorScheme("light");
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
      featureConfigs: {
        // `/` を押したときに、checkbox とかの List 表記が一番上に来てほしいが
        // デフォルトだと textGroup が一番上に来てしまっていて、並べ替えなどもできない
        // textGroup のサジェストは不要なので消す
        [Crepe.Feature.BlockEdit]: {
          textGroup: null,
        },
        [Crepe.Feature.Placeholder]: {
          text: "Press `/` to open menu",
        },
      },
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

  function handleLinkClick(event: MouseEvent<HTMLDivElement>) {
    if (!(event.target instanceof Element)) return;

    const link = event.target.closest("a[href]");
    const href = link?.getAttribute("href")?.trim();

    if (!href || !isOpenableUrl(href)) return;

    event.preventDefault();
    void openUrl(href);
  }

  return (
    <Box
      aria-label={ariaLabel}
      className={classes.milkdownEditor}
      flex={1}
      mih="100%"
      miw={0}
      onClickCapture={handleLinkClick}
      onKeyDownCapture={handleKeyDown}
      ref={rootRef}
      style={
        colorScheme === "dark"
          ? darkMilkdownThemeVariables
          : lightMilkdownThemeVariables
      }
    />
  );
}

function MarkdownEditor({ path }: MarkdownEditorProps) {
  const colorScheme = useComputedColorScheme("light");
  const editorBackground = colorScheme === "dark" ? "#141816" : "#f4f3ee";
  const editorText = colorScheme === "dark" ? "#e2ebe5" : "#17201c";
  const [content, setContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [loadedPath, setLoadedPath] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const contentRef = useRef("");
  const savedContentRef = useRef("");
  const isSavingRef = useRef(false);

  useEffect(() => {
    function handleFocus() {
      setReloadKey((currentKey) => currentKey + 1);
    }

    window.addEventListener("focus", handleFocus);

    return () => {
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

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
  }, [path, reloadKey]);

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
    return <Box bg={editorBackground} component="section" h="100dvh" />;
  }

  return (
    <Box
      bg={editorBackground}
      c={editorText}
      component="section"
      display="flex"
      h="100dvh"
      mih={0}
      miw={0}
      style={{ overflow: "auto" }}
    >
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
