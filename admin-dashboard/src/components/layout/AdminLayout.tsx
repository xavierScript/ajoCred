import { Outlet } from "react-router-dom";
import { AdminHeader } from "./AdminHeader";

export function AdminLayout() {
  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <AdminHeader />
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        AjoCred Cooperative Admin Portal · Powered by Cleanverse on Base Sepolia
      </footer>
    </div>
  );
}
