import { useState } from "react";
import { ShieldAlert, ShieldCheck } from "lucide-react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useFreeze, useUnfreeze } from "@/hooks/useBackend";

interface DemoControlsProps {
  address: string;
}

export function DemoControls({ address }: DemoControlsProps) {
  const adminKey = import.meta.env.VITE_ADMIN_KEY;
  const [reason] = useState("Default simulation");

  const freezeMutation = useFreeze();
  const unfreezeMutation = useUnfreeze();

  // If no admin key is set in frontend .env, don't show admin demo controls
  if (!adminKey) return null;

  const handleFreeze = async () => {
    try {
      await freezeMutation.mutateAsync({ address, reason });
      alert(`Account ${address.slice(0, 8)}... successfully frozen on Cleanverse!`);
    } catch (e: any) {
      alert(`Freeze failed: ${e?.message ?? "Unknown error"}`);
    }
  };

  const handleUnfreeze = async () => {
    try {
      await unfreezeMutation.mutateAsync(address);
      alert(`Account ${address.slice(0, 8)}... successfully unfrozen on Cleanverse!`);
    } catch (e: any) {
      alert(`Unfreeze failed: ${e?.message ?? "Unknown error"}`);
    }
  };

  return (
    <Card className="mb-6 border-amber-500/30 bg-amber-500/5">
      <CardHeader>
        <CardTitle className="text-amber-500 text-sm font-medium">
          Admin Risk & Freeze Simulation (Feature #3)
        </CardTitle>
      </CardHeader>
      <CardBody className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-xs text-muted-foreground">
          Simulate an automated risk event or loan default by freezing/unfreezing the user's A-Pass status directly via Cleanverse `/update_status`.
        </p>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            className="text-destructive border-destructive/30 hover:bg-destructive/10"
            disabled={freezeMutation.isPending}
            onClick={handleFreeze}
          >
            <ShieldAlert className="size-3.5 mr-1" />
            {freezeMutation.isPending ? "Freezing..." : "Simulate Freeze"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-emerald-500 border-emerald-500/30 hover:bg-emerald-500/10"
            disabled={unfreezeMutation.isPending}
            onClick={handleUnfreeze}
          >
            <ShieldCheck className="size-3.5 mr-1" />
            {unfreezeMutation.isPending ? "Unfreezing..." : "Unfreeze Pass"}
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}
