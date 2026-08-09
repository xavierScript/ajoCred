import { Link, useLocation } from "react-router-dom";
import {
  Menu,
  X,
  LayoutDashboard,
  Building2,
  Coins,
  ShieldAlert,
  FileCheck,
  CreditCard,
  ShieldCheck,
} from "lucide-react";
import { useState } from "react";
import { Wordmark } from "@/components/Logo";
import { WalletButton } from "@/components/WalletButton";
import { ThemeToggle } from "./ThemeToggle";
import { useAdminCoop } from "@/hooks/useAdminCoop";
import { useCooperative } from "@/hooks/useBackend";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

const nav = [
  { path: "/", label: "Overview", icon: LayoutDashboard },
  { path: "/cooperatives", label: "Manage Coops", icon: Building2 },
  { path: "/fund", label: "Fund Pool", icon: Coins },
  { path: "/members", label: "Members & Risk", icon: ShieldAlert },
  { path: "/compliance", label: "Compliance", icon: FileCheck },
  { path: "/whitelist", label: "Whitelist", icon: ShieldCheck },
  { path: "/ramp", label: "Fiat Ramp", icon: CreditCard },
];

export function AdminHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { pathname } = useLocation();
  const { selectedCoopId } = useAdminCoop();
  const { data: coop } = useCooperative(selectedCoopId ?? undefined);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-4">
          <Link to="/" className="flex items-center gap-2" onClick={() => setMobileOpen(false)}>
            <Wordmark />
            <Badge tone="accent" className="hidden sm:inline-flex text-[10px]">
              Cooperative Portal
            </Badge>
          </Link>

          {selectedCoopId && coop && (
            <Link
              to="/cooperatives"
              className="hidden items-center gap-1.5 rounded-full border border-border bg-muted/50 px-3 py-1 text-xs font-medium text-foreground hover:bg-muted lg:flex"
            >
              <Building2 className="size-3.5 text-primary" />
              <span>Coop #{coop.id}</span>
            </Link>
          )}
        </div>

        {/* Desktop navigation */}
        <nav className="hidden items-center gap-4 xl:flex">
          {nav.map(({ path, label, icon: Icon }) => (
            <Link
              key={path}
              to={path}
              className={cn(
                "flex items-center gap-1.5 text-sm font-medium transition-colors hover:text-foreground",
                pathname === path ? "text-foreground font-semibold" : "text-muted-foreground"
              )}
            >
              <Icon className="size-4" />
              {label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <WalletButton compact />
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
            className="flex size-10 items-center justify-center rounded-md border border-border bg-card xl:hidden"
          >
            {mobileOpen ? <X className="size-4" /> : <Menu className="size-4" />}
          </button>
        </div>
      </div>

      {/* Mobile nav */}
      {mobileOpen && (
        <nav className="border-t border-border bg-card px-4 py-3 xl:hidden">
          <div className="flex flex-col gap-2">
            {selectedCoopId && coop && (
              <div className="mb-2 flex items-center justify-between rounded-md bg-muted/60 p-2.5 text-xs">
                <span className="font-medium text-muted-foreground">Active Cooperative</span>
                <Badge tone="primary">Coop #{coop.id}</Badge>
              </div>
            )}
            {nav.map(({ path, label, icon: Icon }) => (
              <Link
                key={path}
                to={path}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  pathname === path
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="size-4" />
                {label}
              </Link>
            ))}
          </div>
        </nav>
      )}
    </header>
  );
}
