import { useState } from "react";
import { useAccount } from "wagmi";
import { CreditCard, ExternalLink, ArrowRight, CheckCircle2, Clock, AlertTriangle } from "lucide-react";
import { Page, PageHeader } from "@/components/layout/Page";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { SegmentedControl } from "@/components/pool/SegmentedControl";
import {
  useRampQuote,
  useRampWidget,
  useRampOrder,
  useRampPaymentMethods,
} from "@/hooks/useBackend";
import { humanizeError } from "@/lib/utils";

type Mode = "BUY" | "SELL";

export function FiatRampPage() {
  const { address } = useAccount();
  const [mode, setMode] = useState<Mode>("BUY");
  const [amountInput, setAmountInput] = useState("100");
  const [selectedMethod, setSelectedMethod] = useState("credit_debit_card");

  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [activeWidgetUrl, setActiveWidgetUrl] = useState<string | null>(null);
  const [rampError, setRampError] = useState<string | null>(null);

  const { data: paymentMethods, isLoading: methodsLoading } = useRampPaymentMethods("USD");
  const quoteMutation = useRampQuote();
  const widgetMutation = useRampWidget();
  const orderQuery = useRampOrder(activeOrderId ?? undefined);

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address || !amountInput) return;

    setRampError(null);
    const numAmount = Number(amountInput);

    try {
      const quote = await quoteMutation.mutateAsync({
        fiatCurrency: "USD",
        cryptoCurrency: "USDC",
        isBuyOrSell: mode,
        network: "base",
        paymentMethod: selectedMethod,
        fiatAmount: numAmount,
      });

      const widget = await widgetMutation.mutateAsync({
        quoteToken: quote.quoteToken,
        wallet: { address, chain: "base" },
      });

      setActiveOrderId(widget.orderId);
      setActiveWidgetUrl(widget.widgetUrl);

      // Open host widget in a new tab
      if (widget.widgetUrl) {
        window.open(widget.widgetUrl, "_blank");
      }
    } catch (err: any) {
      const rawMsg = err?.message ?? String(err);
      if (/RM_002/i.test(rawMsg)) {
        setRampError("Account frozen. Unfreeze your A-Pass before executing fiat ramp orders.");
      } else if (/RM_001/i.test(rawMsg)) {
        setRampError("A-Pass not registered. Complete identity verification first.");
      } else {
        setRampError(humanizeError(err));
      }
    }
  };

  const isPending = quoteMutation.isPending || widgetMutation.isPending;
  const order = orderQuery.data;

  return (
    <Page>
      <PageHeader
        eyebrow="Treasury Management"
        title="Fiat On-Ramp & Off-Ramp"
        description="Fund your cooperative pool with fiat card/bank transfers, or convert earned interest back to fiat."
      />

      <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader className="flex-row items-center gap-2">
            <CreditCard className="size-5 text-primary" />
            <CardTitle>Treasury Fiat Operations</CardTitle>
          </CardHeader>
          <CardBody className="space-y-6">
            <SegmentedControl<Mode>
              ariaLabel="Choose fiat operation"
              value={mode}
              onChange={(m) => {
                setMode(m);
                setActiveOrderId(null);
                setActiveWidgetUrl(null);
                setRampError(null);
              }}
              options={[
                { value: "BUY", label: "Add Funds (Fiat → USDC)" },
                { value: "SELL", label: "Withdraw Earnings (USDC → Fiat)" },
              ]}
            />

            <form onSubmit={handleCreateOrder} className="space-y-4">
              <Input
                label={mode === "BUY" ? "Fiat Amount (USD)" : "USDC Amount to Cash Out"}
                type="number"
                placeholder="100"
                value={amountInput}
                onChange={(e) => setAmountInput(e.target.value)}
                required
              />

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Payment Method</label>
                <select
                  className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-primary"
                  value={selectedMethod}
                  onChange={(e) => setSelectedMethod(e.target.value)}
                >
                  {methodsLoading ? (
                    <option value="credit_debit_card">Credit / Debit Card</option>
                  ) : paymentMethods && paymentMethods.length > 0 ? (
                    paymentMethods.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="credit_debit_card">Credit / Debit Card</option>
                      <option value="bank_transfer">Bank Transfer</option>
                    </>
                  )}
                </select>
              </div>

              {rampError && (
                <div className="flex items-start gap-2 rounded-md border border-destructive/20 bg-destructive/5 p-3 text-xs text-destructive">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                  <span>{rampError}</span>
                </div>
              )}

              <Button
                type="submit"
                block
                loading={isPending}
                disabled={!address || !amountInput}
              >
                {mode === "BUY" ? "Proceed to On-Ramp Widget" : "Proceed to Off-Ramp Widget"}
              </Button>
            </form>
          </CardBody>
        </Card>

        {/* Ramp Order Status Card */}
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="size-5 text-accent" />
              <CardTitle>Order Status Tracker</CardTitle>
            </div>
            {order && <Badge tone={order.status === "COMPLETED" ? "success" : "neutral"}>{order.status}</Badge>}
          </CardHeader>
          <CardBody className="space-y-4">
            {!activeOrderId ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                No active order. Fill out the form to launch a ramp widget.
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Order ID</span>
                    <span className="font-mono">{activeOrderId}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Status</span>
                    <span className="font-medium text-foreground">{order?.status ?? "INIT"}</span>
                  </div>
                </div>

                {activeWidgetUrl && (
                  <Button asChild block variant="outline" size="sm">
                    <a href={activeWidgetUrl} target="_blank" rel="noreferrer">
                      Open Hosted Ramp Widget
                      <ExternalLink className="size-4" />
                    </a>
                  </Button>
                )}
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </Page>
  );
}
