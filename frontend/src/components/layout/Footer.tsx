import { Logo } from "@/components/Logo";
import { CHAIN } from "@/lib/contracts";

export function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="container mx-auto flex flex-col items-start justify-between gap-4 px-4 py-8 sm:px-6 md:flex-row md:items-center">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Logo className="size-5" />
          <span className="text-sm">
            AjoCred — your remittance history is your credit history.
          </span>
        </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span>Running on {CHAIN.name}</span>
          <span aria-hidden>·</span>
          <span>Testnet demo — no real funds</span>
        </div>
      </div>
    </footer>
  );
}
