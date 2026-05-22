import { AppShell } from "@mantine/core";
import { useState } from "react";
import "./App.css";
import MarkdownEditor from "./components/MarkdownEditor";
import Menu from "./components/Menu";

function App() {
  const [openMarkdownPath, setOpenMarkdownPath] = useState<string | null>(null);

  return (
    <AppShell navbar={{ width: 260, breakpoint: "xs" }} padding={0}>
      <Menu onOpenMarkdownFile={setOpenMarkdownPath} />
      <AppShell.Main
        aria-label="Workspace"
        bg="#f4f3ee"
        style={{ minWidth: 0 }}
      >
        <MarkdownEditor path={openMarkdownPath} />
      </AppShell.Main>
    </AppShell>
  );
}

export default App;
