import { AppShell, useComputedColorScheme } from "@mantine/core";
import { useState } from "react";
import "./App.css";
import MarkdownEditor from "./components/MarkdownEditor";
import Menu from "./components/Menu";

function App() {
  const colorScheme = useComputedColorScheme("light");
  const [openMarkdownPath, setOpenMarkdownPath] = useState<string | null>(null);

  return (
    <AppShell navbar={{ width: 260, breakpoint: "xs" }} padding={0}>
      <Menu
        openMarkdownPath={openMarkdownPath}
        onOpenMarkdownFile={setOpenMarkdownPath}
      />
      <AppShell.Main
        aria-label="Workspace"
        bg={colorScheme === "dark" ? "#141816" : "#f4f3ee"}
        style={{ minWidth: 0 }}
      >
        <MarkdownEditor path={openMarkdownPath} />
      </AppShell.Main>
    </AppShell>
  );
}

export default App;
