import { useState } from "react";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { AuthButton } from "@coinbase/cdp-react/components/AuthButton";
import { useSignOut } from "@coinbase/cdp-hooks";
import { CDP_CONNECTOR_ID } from "@coinbase/cdp-wagmi";
import { ChevronDown, LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

const cdpConfigured = Boolean(import.meta.env.VITE_CDP_PROJECT_ID);

function shortenAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

function Backdrop({ onClose }: { onClose: () => void }) {
  return <div className="fixed inset-0 z-40" aria-hidden onClick={onClose} />;
}

function CdpSignOut({ onDone }: { onDone: () => void }) {
  const { signOut } = useSignOut();
  const { disconnect } = useDisconnect();

  return (
    <Button
      variant="outline"
      size="sm"
      className="w-full justify-start"
      onClick={async () => {
        try {
          await signOut();
        } finally {
          disconnect();
          onDone();
        }
      }}
    >
      <LogOut className="size-4" />
      Sign out
    </Button>
  );
}

function ConnectedMenu({
  address,
  isCdp,
}: {
  address: string;
  isCdp: boolean;
}) {
  const [open, setOpen] = useState(false);
  const { disconnect } = useDisconnect();

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm font-medium hover:bg-muted"
      >
        <span className="size-2 rounded-full bg-success" aria-hidden />
        <span className="font-mono">{shortenAddress(address)}</span>
        <ChevronDown className="size-3.5 text-muted-foreground" />
      </button>

      {open && (
        <>
          <Backdrop onClose={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-2 w-60 rounded-lg border border-border bg-card p-3 shadow-lg">
            <p className="mb-1 text-xs font-medium text-muted-foreground">
              Connected account
            </p>
            <p className="mb-3 break-all font-mono text-xs">{address}</p>
            {isCdp ? (
              <CdpSignOut onDone={() => setOpen(false)} />
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start"
                onClick={() => {
                  disconnect();
                  setOpen(false);
                }}
              >
                <LogOut className="size-4" />
                Sign out
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function ConnectMenu({ compact }: { compact: boolean }) {
  const [open, setOpen] = useState(false);
  const { connect, connectors } = useConnect();

  const externalConnectors = connectors.filter(
    (c) => c.id !== CDP_CONNECTOR_ID,
  );

  return (
    <div className="relative">
      <Button onClick={() => setOpen((o) => !o)} size={compact ? "sm" : "md"}>
        <User className="size-4" />
        Sign in
      </Button>

      {open && (
        <>
          <Backdrop onClose={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-2 w-64 rounded-lg border border-border bg-card p-3 shadow-lg">
            {cdpConfigured && (
              <div className="mb-3">
                <p className="mb-2 text-xs font-medium text-muted-foreground">
                  Sign in with email
                </p>
                <AuthButton />
                <div className="mt-3 flex items-center gap-2">
                  <span className="h-px flex-1 bg-border" />
                  <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    or
                  </span>
                  <span className="h-px flex-1 bg-border" />
                </div>
              </div>
            )}

            <p className="mb-2 text-xs font-medium text-muted-foreground">
              External account options
            </p>
            <div className="space-y-1.5">
              {externalConnectors.map((c) => (
                <button
                  key={c.uid}
                  onClick={() => {
                    connect({ connector: c });
                    setOpen(false);
                  }}
                  className="flex w-full items-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-muted"
                >
                  {c.icon && (
                    <img src={c.icon} alt="" className="size-4 rounded" />
                  )}
                  {c.name}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export function WalletButton({ compact = false }: { compact?: boolean }) {
  const { address, isConnected, connector } = useAccount();

  return (
    <div className={cn("flex items-center gap-2")}>
      {isConnected && address ? (
        <ConnectedMenu
          address={address}
          isCdp={connector?.id === CDP_CONNECTOR_ID}
        />
      ) : (
        <ConnectMenu compact={compact} />
      )}
    </div>
  );
}
