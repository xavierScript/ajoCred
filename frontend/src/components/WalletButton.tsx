import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Wallet, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

/**
 * Wallet control styled to the AjoCred system instead of RainbowKit's default
 * chrome. Handles: not connected, wrong network, and connected states. The
 * account/chain pickers still open RainbowKit's modals.
 */
export function WalletButton({ compact = false }: { compact?: boolean }) {
  return (
    <ConnectButton.Custom>
      {({
        account,
        chain,
        openAccountModal,
        openChainModal,
        openConnectModal,
        mounted,
      }) => {
        const ready = mounted;
        const connected = ready && account && chain;

        return (
          <div
            aria-hidden={!ready}
            className={cn("flex items-center gap-2", !ready && "pointer-events-none opacity-0")}
          >
            {(() => {
              if (!connected) {
                return (
                  <Button onClick={openConnectModal} size={compact ? "sm" : "md"}>
                    <Wallet className="size-4" />
                    Connect wallet
                  </Button>
                );
              }

              if (chain.unsupported) {
                return (
                  <Button variant="destructive" size={compact ? "sm" : "md"} onClick={openChainModal}>
                    Wrong network
                  </Button>
                );
              }

              return (
                <>
                  {!compact && (
                    <button
                      onClick={openChainModal}
                      className="hidden items-center gap-1.5 rounded-md border border-border bg-card px-3 py-2 text-sm font-medium hover:bg-muted sm:flex"
                    >
                      {chain.hasIcon && chain.iconUrl && (
                        <img
                          alt={chain.name ?? "Chain"}
                          src={chain.iconUrl}
                          className="size-4 rounded-full"
                        />
                      )}
                      {chain.name}
                    </button>
                  )}
                  <button
                    onClick={openAccountModal}
                    className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm font-medium hover:bg-muted"
                  >
                    <span className="size-2 rounded-full bg-success" aria-hidden />
                    <span className="font-mono">{account.displayName}</span>
                    <ChevronDown className="size-3.5 text-muted-foreground" />
                  </button>
                </>
              );
            })()}
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
}
