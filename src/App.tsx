import { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";

const STORAGE_KEY = "taurinote:markdown";

const sampleMarkdown = `Markdown を書くと、右側にプレビューが表示されます。

## 今日のメモ

- Tauri + React で動く Markdown エディタ
- 入力内容はブラウザの localStorage に自動保存
- 見出し、リスト、引用、コード、リンク、強調に対応

> 小さく書いて、すぐ見返せる場所。

\`\`\`ts
const note = "ideas become clearer when written down";
console.log(note);
\`\`\`
`;

type FormatAction =
  | "heading"
  | "bold"
  | "italic"
  | "quote"
  | "list"
  | "code"
  | "link";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function renderInline(value: string) {
  let html = escapeHtml(value);

  html = html.replace(
    /`([^`]+)`/g,
    '<code class="inline-code">$1</code>',
  );
  html = html.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
    '<a href="$2" target="_blank" rel="noreferrer">$1</a>',
  );
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*([^*]+)\*/g, "<em>$1</em>");

  return html;
}

function renderMarkdown(markdown: string) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const html: string[] = [];
  let listOpen = false;
  let codeOpen = false;
  let codeLines: string[] = [];

  const closeList = () => {
    if (listOpen) {
      html.push("</ul>");
      listOpen = false;
    }
  };

  const closeCode = () => {
    if (codeOpen) {
      html.push(`<pre><code>${escapeHtml(codeLines.join("\n"))}</code></pre>`);
      codeLines = [];
      codeOpen = false;
    }
  };

  for (const line of lines) {
    if (line.trim().startsWith("```")) {
      if (codeOpen) {
        closeCode();
      } else {
        closeList();
        codeOpen = true;
        codeLines = [];
      }
      continue;
    }

    if (codeOpen) {
      codeLines.push(line);
      continue;
    }

    const trimmed = line.trim();

    if (!trimmed) {
      closeList();
      continue;
    }

    const heading = trimmed.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      closeList();
      const level = heading[1].length;
      html.push(`<h${level}>${renderInline(heading[2])}</h${level}>`);
      continue;
    }

    const bullet = trimmed.match(/^[-*]\s+(.+)$/);
    if (bullet) {
      if (!listOpen) {
        html.push("<ul>");
        listOpen = true;
      }
      html.push(`<li>${renderInline(bullet[1])}</li>`);
      continue;
    }

    if (trimmed.startsWith("> ")) {
      closeList();
      html.push(`<blockquote>${renderInline(trimmed.slice(2))}</blockquote>`);
      continue;
    }

    closeList();
    html.push(`<p>${renderInline(trimmed)}</p>`);
  }

  closeCode();
  closeList();

  return html.join("");
}

function App() {
  const [markdown, setMarkdown] = useState(() => {
    return localStorage.getItem(STORAGE_KEY) ?? sampleMarkdown;
  });
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const preview = useMemo(() => renderMarkdown(markdown), [markdown]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, markdown);
  }, [markdown]);

  function wrapSelection(prefix: string, suffix = prefix, fallback = "text") {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = markdown.slice(start, end) || fallback;
    const next =
      markdown.slice(0, start) + prefix + selected + suffix + markdown.slice(end);

    setMarkdown(next);
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + selected.length);
    });
  }

  function prefixCurrentLine(prefix: string) {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const cursor = textarea.selectionStart;
    const lineStart = markdown.lastIndexOf("\n", cursor - 1) + 1;
    const next = markdown.slice(0, lineStart) + prefix + markdown.slice(lineStart);

    setMarkdown(next);
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(cursor + prefix.length, cursor + prefix.length);
    });
  }

  function applyFormat(action: FormatAction) {
    if (action === "heading") prefixCurrentLine("## ");
    if (action === "bold") wrapSelection("**", "**", "bold");
    if (action === "italic") wrapSelection("*", "*", "italic");
    if (action === "quote") prefixCurrentLine("> ");
    if (action === "list") prefixCurrentLine("- ");
    if (action === "code") wrapSelection("\n```\n", "\n```\n", "code");
    if (action === "link") wrapSelection("[", "](https://example.com)", "link");
  }

  function resetSample() {
    setMarkdown(sampleMarkdown);
    textareaRef.current?.focus();
  }

  return (
    <main className="app-shell">
      <section className="toolbar" aria-label="formatting tools">
        <button type="button" onClick={() => applyFormat("heading")} title="Heading">
          H2
        </button>
        <button type="button" onClick={() => applyFormat("bold")} title="Bold">
          B
        </button>
        <button type="button" onClick={() => applyFormat("italic")} title="Italic">
          I
        </button>
        <button type="button" onClick={() => applyFormat("quote")} title="Quote">
          "
        </button>
        <button type="button" onClick={() => applyFormat("list")} title="List">
          -
        </button>
        <button type="button" onClick={() => applyFormat("code")} title="Code block">
          {"</>"}
        </button>
        <button type="button" onClick={() => applyFormat("link")} title="Link">
          link
        </button>
        <button type="button" className="ghost-button" onClick={resetSample}>
          Reset
        </button>
      </section>

      <section className="editor-layout">
        <label className="pane editor-pane">
          <span className="pane-title">Editor</span>
          <textarea
            ref={textareaRef}
            value={markdown}
            onChange={(event) => setMarkdown(event.currentTarget.value)}
            spellCheck="false"
            aria-label="Markdown editor"
          />
        </label>

        <article className="pane preview-pane">
          <span className="pane-title">Preview</span>
          <div
            className="markdown-preview"
            dangerouslySetInnerHTML={{ __html: preview }}
          />
        </article>
      </section>
    </main>
  );
}

export default App;
