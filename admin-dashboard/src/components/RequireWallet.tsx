import type { ReactNode } from "react";
import { useAccount } from "wagmi";
import { Wallet } from "lucide-react";
import { WalletButton } from "@/components/WalletButton";
import { Card } from "@/components/ui/Card";

/**
 * Gate for pages that need a connected wallet. Rather than redirecting, we show
 * an inline connect prompt so the user keeps their place and context.
 */
export function RequireWallet({ children }: { children: ReactNode }) {
  const { isConnected } = useAccount();

  if (isConnected) return <>{children}</>;

  return (
    <div className="flex min-h-[50vh] items-center justify-center px-4">
      <Card className="flex max-w-md flex-col items-center gap-4 p-8 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Wallet className="size-6" />
        </div>
        <div>
          <h2 className="font-display text-xl font-semibold">Connect your wallet</h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Connect a wallet to view your position and interact with the AjoCred pool.
          </p>
        </div>
        <WalletButton />
      </Card>
    </div>
  );
}
