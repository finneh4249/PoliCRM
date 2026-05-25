import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";

export function Layout() {
  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--canvas)" }}>
      <Sidebar />
      <main style={{ flex: 1, minWidth: 0, overflowY: "auto" }}>
        <Outlet />
      </main>
    </div>
  );
}
