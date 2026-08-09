import { Link, useLocation } from "react-router-dom";
import { Menu, X, LayoutDashboard, Users, ArrowUpFromLine, CreditCard, ShieldAlert } from "lucide-react";
import { useState } from "react";
import { useAccount } from "wagmi";
import { Wordmark } from "@/components/Logo";
import { WalletButton } from "@/components/WalletButton";
import { Button } from "@/components/ui/Button";
import { ThemeToggle } from "./ThemeToggle";
import { useVerify } from "@/hooks/useBackend";
import { cn } from "@/lib/utils";

const nav = [
  { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { path: "/cooperatives", label: "Cooperatives", icon: Users },
  { path: "/borrow", label: "Borrow", icon: ArrowUpFromLine },
  { path: "/ramp", label: "Fiat Ramp", icon: CreditCard },
];

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { pathname } = useLocation();
  const { address, isConnected } = useAccount();
  const verify = useVerify(address);

  const isUnverified = isConnected && !verify.isLoading && verify.data && !verify.data.valid;

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2" onClick={() => setMobileOpen(false)}>
          <Wordmark />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-6 md:flex">
          {nav.map(({ path, label, icon: Icon }) => (
            <Link
              key={path}
              to={path}
              className={cn(
                "flex items-center gap-2 text-sm font-medium transition-colors hover:text-foreground",
                pathname === path ? "text-foreground" : "text-muted-foreground"
              )}
            >
              <Icon className="size-4" />
              {label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {isUnverified && (
            <Button asChild size="sm" variant="outline" className="border-amber-500/40 text-amber-500 hover:bg-amber-500/10">
              <Link to="/onboard">
                <ShieldAlert className="size-3.5 animate-pulse text-amber-500" />
                Verify ID
              </Link>
            </Button>
          )}
          <ThemeToggle />
          <WalletButton compact />
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
            className="flex size-10 items-center justify-center rounded-md border border-border bg-card md:hidden"
          >
            {mobileOpen ? <X className="size-4" /> : <Menu className="size-4" />}
          </button>
        </div>
      </div>

      {/* Mobile nav */}
      {mobileOpen && (
        <nav className="border-t border-border bg-card px-4 py-3 md:hidden">
          <div className="flex flex-col gap-2">
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
