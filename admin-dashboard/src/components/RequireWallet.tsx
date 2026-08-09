import type { ReactNode } from "react";
import { useAccount } from "wagmi";
import { User } from "lucide-react";
import { WalletButton } from "@/components/WalletButton";
import { Card } from "@/components/ui/Card";

export function RequireWallet({ children }: { children: ReactNode }) {
  const { isConnected } = useAccount();

  if (isConnected) return <>{children}</>;

  return (
    <div className="flex min-h-[50vh] items-center justify-center px-4">
      <Card className="flex max-w-md flex-col items-center gap-4 p-8 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <User className="size-6" />
        </div>
        <div>
          <h2 className="font-display text-xl font-semibold">Sign in to your account</h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Sign in with your email or account to view your credit limit, cooperative position, and account history.
          </p>
        </div>
        <WalletButton />
      </Card>
    </div>
  );
}
