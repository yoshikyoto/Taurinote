import { AppShell } from "@mantine/core";
import "./App.css";
import Menu from "./components/Menu";

function App() {
  return (
    <AppShell navbar={{ width: 260, breakpoint: "xs" }} padding={0}>
      <Menu />
      <AppShell.Main
        aria-label="Workspace"
        bg="#f4f3ee"
        style={{ minWidth: 0 }}
      />
    </AppShell>
  );
}

export default App;
