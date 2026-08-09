import { useState } from "react";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { AuthButton } from "@coinbase/cdp-react/components/AuthButton";
import { useSignOut } from "@coinbase/cdp-hooks";
import { CDP_CONNECTOR_ID } from "@coinbase/cdp-wagmi";
import { ChevronDown, LogOut, Wallet } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

/**
 * Wallet control for AjoCred. Offers two ways to connect, styled to the AjoCred
 * system:
 *   1. Email sign-in via the CDP embedded wallet (preferred, no seed phrase).
 *   2. Normal external wallets (MetaMask / injected, Coinbase, WalletConnect).
 *
 * Both resolve to a standard wagmi connection, so the rest of the app reads the
 * account through `useAccount` without caring how the user got here.
 */

const cdpConfigured = Boolean(import.meta.env.VITE_CDP_PROJECT_ID);

function shortenAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

/** Small full-screen click-catcher so the dropdown closes on an outside click. */
function Backdrop({ onClose }: { onClose: () => void }) {
  return <div className="fixed inset-0 z-40" aria-hidden onClick={onClose} />;
}

/**
 * Sign-out control for an embedded (CDP) wallet: ends the CDP session first,
 * then clears wagmi. Only rendered when the active connector is the CDP one, so
 * the cdp-hooks context is guaranteed to be present.
 */
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
              Connected wallet
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
                Disconnect
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

  // The CDP embedded wallet is reached through the email sign-in button below,
  // not through the external-wallet list.
  const externalConnectors = connectors.filter(
    (c) => c.id !== CDP_CONNECTOR_ID,
  );

  return (
    <div className="relative">
      <Button onClick={() => setOpen((o) => !o)} size={compact ? "sm" : "md"}>
        <Wallet className="size-4" />
        Connect wallet
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
                {/* CDP renders its own sign-in modal; on success the connector
                    emits `connect` and this menu is replaced by ConnectedMenu. */}
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
              Connect a wallet
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
