import { useState } from "react";
import { ShieldCheck, Plus, XCircle, RotateCcw } from "lucide-react";
import { Page, PageHeader } from "@/components/layout/Page";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import {
  useWhitelistAddresses,
  useAddWhitelist,
  useRemoveWhitelist,
  useRestoreWhitelist,
} from "@/hooks/useBackend";
import { humanizeError, shortenAddress } from "@/lib/utils";

export function InstitutionalWhitelistPage() {
  const { toast } = useToast();
  const [addressInput, setAddressInput] = useState("");

  const whitelistQuery = useWhitelistAddresses();
  const addMutation = useAddWhitelist();
  const removeMutation = useRemoveWhitelist();
  const restoreMutation = useRestoreWhitelist();

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addressInput.startsWith("0x")) {
      toast({ tone: "error", title: "Invalid address", description: "Enter a valid 0x address." });
      return;
    }

    try {
      await addMutation.mutateAsync({ walletAddresses: [addressInput.trim()] });
      toast({
        tone: "success",
        title: "Address whitelisted",
        description: `Successfully added ${shortenAddress(addressInput)} to institutional deposit whitelist.`,
      });
      setAddressInput("");
      whitelistQuery.refetch();
    } catch (err) {
      toast({ tone: "error", title: "Failed to whitelist address", description: humanizeError(err) });
    }
  };

  const handleRemove = async (addr: string) => {
    try {
      await removeMutation.mutateAsync({ walletAddress: addr });
      toast({
        tone: "info",
        title: "Address deactivated",
        description: `Deactivated institutional deposit permissions for ${shortenAddress(addr)}.`,
      });
      whitelistQuery.refetch();
    } catch (err) {
      toast({ tone: "error", title: "Deactivation failed", description: humanizeError(err) });
    }
  };

  const handleRestore = async (addr: string) => {
    try {
      await restoreMutation.mutateAsync({ walletAddress: addr });
      toast({
        tone: "success",
        title: "Address reactivated",
        description: `Restored institutional deposit permissions for ${shortenAddress(addr)}.`,
      });
      whitelistQuery.refetch();
    } catch (err) {
      toast({ tone: "error", title: "Reactivation failed", description: humanizeError(err) });
    }
  };

  const entries = whitelistQuery.data?.entries ?? [];

  return (
    <Page>
      <PageHeader
        eyebrow="Institution Controls"
        title="Institutional Deposit Whitelist"
        description="Maintain whitelisted sender addresses for high-volume institutional deposits. Powered by Cleanverse Compliance."
      />

      <div className="grid gap-8 lg:grid-cols-[1fr_1.5fr]">
        {/* Add Address Form */}
        <Card>
          <CardHeader className="flex-row items-center gap-2">
            <ShieldCheck className="size-5 text-primary" />
            <CardTitle>Add Institutional Address</CardTitle>
          </CardHeader>
          <CardBody>
            <form onSubmit={handleAdd} className="space-y-4">
              <Input
                label="Sender Account Address (0x...)"
                hint="Authorized institutional source address for deposits."
                placeholder="0x..."
                value={addressInput}
                onChange={(e) => setAddressInput(e.target.value)}
                required
              />

              <Button
                type="submit"
                block
                loading={addMutation.isPending}
                disabled={!addressInput || !addressInput.startsWith("0x")}
              >
                <Plus className="size-4" />
                Add to Whitelist
              </Button>
            </form>
          </CardBody>
        </Card>

        {/* Registered Whitelist Addresses Table */}
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Whitelisted Institutional Sources</CardTitle>
            <Badge tone="neutral">{entries.length} Registered</Badge>
          </CardHeader>
          <CardBody>
            {whitelistQuery.isLoading ? (
              <Skeleton className="h-48 w-full" />
            ) : entries.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-8 text-center text-muted-foreground">
                <ShieldCheck className="mx-auto size-8 opacity-50" />
                <p className="mt-2 text-sm">No institutional deposit addresses whitelisted yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {entries.map((item) => (
                  <div
                    key={item.walletAddress}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border p-3.5 bg-muted/20"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-medium">{shortenAddress(item.walletAddress)}</span>
                        <Badge tone={item.isActive ? "success" : "warning"} dot>
                          {item.isActive ? "Active" : "Deactivated"}
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {item.symbol} • {item.chain} • Registered {new Date(item.createdAt).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {item.isActive ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRemove(item.walletAddress)}
                          loading={removeMutation.isPending}
                        >
                          <XCircle className="size-3.5" />
                          Deactivate
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="accent"
                          onClick={() => handleRestore(item.walletAddress)}
                          loading={restoreMutation.isPending}
                        >
                          <RotateCcw className="size-3.5" />
                          Restore
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </Page>
  );
}
