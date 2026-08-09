import { useState } from "react";
import { useAccount } from "wagmi";
import { ArrowRight, ExternalLink } from "lucide-react";
import { Page, PageHeader } from "@/components/layout/Page";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import {
  useRampPaymentMethods,
  useRampQuote,
  useRampWidget,
  useRampOrder,
} from "@/hooks/useBackend";
import type { RampQuote } from "@/types";
import { formatAmount, humanizeError } from "@/lib/utils";

export function RampPage() {
  const { address } = useAccount();
  const [buyOrSell, setBuyOrSell] = useState<"BUY" | "SELL">("BUY");
  const [amount, setAmount] = useState(50);
  const [quote, setQuote] = useState<RampQuote | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [widgetUrl, setWidgetUrl] = useState<string | null>(null);

  const paymentMethods = useRampPaymentMethods();
  const rampQuote = useRampQuote();
  const rampWidget = useRampWidget();
  const rampOrder = useRampOrder(orderId ?? undefined);

  const pofm = paymentMethods.data?.length ? paymentMethods.data[0].id : "credit_debit_card";

  const handleGetQuote = async () => {
    if (!address) return;
    setQuote(null);
    setOrderId(null);
    setWidgetUrl(null);
    try {
      const params = {
        fiatCurrency: "USD",
        cryptoCurrency: "USDC",
        isBuyOrSell: buyOrSell,
        network: "base",
        paymentMethod: pofm,
        ...(buyOrSell === "BUY" ? { fiatAmount: amount } : { cryptoAmount: amount }),
      };
      const result = await rampQuote.mutateAsync(params);
      setQuote(result);
    } catch {
      /* handled */
    }
  };

  const handleCreateWidget = async () => {
    if (!quote || !address) return;
    try {
      const result = await rampWidget.mutateAsync({
        quoteToken: quote.quoteToken,
        wallet: { address, chain: "base" },
      });
      setOrderId(result.orderId);
      setWidgetUrl(result.widgetUrl);
      window.open(result.widgetUrl, "_blank", "noopener,noreferrer");
    } catch {
      /* handled */
    }
  };

  return (
    <Page>
      <PageHeader
        eyebrow="Fiat Ramp"
        title="Buy & Sell USDC"
        description="On-ramp or off-ramp directly via Cleanverse. Requires a verified, non-frozen A-Pass."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Get a Ramp Quote</CardTitle>
          </CardHeader>
          <CardBody className="space-y-5">
            <div className="flex rounded-md border border-border p-1 bg-muted/50">
              <button
                type="button"
                onClick={() => {
                  setBuyOrSell("BUY");
                  setQuote(null);
                }}
                className={`flex-1 rounded-sm py-1.5 text-sm font-medium transition-colors ${
                  buyOrSell === "BUY"
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Buy USDC (On-ramp)
              </button>
              <button
                type="button"
                onClick={() => {
                  setBuyOrSell("SELL");
                  setQuote(null);
                }}
                className={`flex-1 rounded-sm py-1.5 text-sm font-medium transition-colors ${
                  buyOrSell === "SELL"
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Sell USDC (Off-ramp)
              </button>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {buyOrSell === "BUY" ? "Fiat Amount (USD)" : "USDC Amount"}
              </label>
              <Input
                type="number"
                value={amount}
                onChange={(e) => {
                  setAmount(Number(e.target.value));
                  setQuote(null);
                }}
                min={10}
              />
            </div>

            <Button
              variant="accent"
              className="w-full"
              disabled={rampQuote.isPending || !amount || amount <= 0}
              onClick={handleGetQuote}
            >
              {rampQuote.isPending ? "Getting quote..." : "Get Live Quote"}
            </Button>

            {rampQuote.isError && (
              <p className="text-xs text-destructive">
                {humanizeError(rampQuote.error)}
              </p>
            )}

            {quote && (
              <div className="space-y-3 rounded-md border border-border bg-muted/30 p-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Quoted payout</span>
                  <span className="font-mono font-medium">
                    {buyOrSell === "BUY"
                      ? `${formatAmount(quote.cryptoAmount)} USDC`
                      : `$${formatAmount(quote.fiatAmount)} USD`}
                  </span>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Total fee</span>
                  <span className="font-mono">${formatAmount(quote.totalFee)}</span>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Rate</span>
                  <span className="font-mono">1 USDC = ${quote.conversionPrice}</span>
                </div>
                <Button
                  variant="primary"
                  className="w-full"
                  disabled={rampWidget.isPending}
                  onClick={handleCreateWidget}
                >
                  {rampWidget.isPending ? "Launching Widget..." : "Proceed to Checkout"}
                  <ArrowRight className="size-4" />
                </Button>
              </div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Order Status Tracker</CardTitle>
          </CardHeader>
          <CardBody className="space-y-4">
            {!orderId ? (
              <p className="text-sm text-muted-foreground">
                No active order. Request a quote and click "Proceed to Checkout" to launch the ramp widget and track status.
              </p>
            ) : (
              <div className="space-y-4">
                <div className="rounded-md border border-border bg-muted/20 p-3 text-xs">
                  <span className="text-muted-foreground">Cleanverse Order ID: </span>
                  <span className="font-mono font-medium">{orderId}</span>
                </div>

                {widgetUrl && (
                  <a
                    href={widgetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    Re-open Widget Window
                    <ExternalLink className="size-3" />
                  </a>
                )}

                {rampOrder.isLoading ? (
                  <p className="text-xs text-muted-foreground animate-pulse">
                    Polling order status...
                  </p>
                ) : rampOrder.isError ? (
                  <p className="text-xs text-destructive">
                    {humanizeError(rampOrder.error)}
                  </p>
                ) : rampOrder.data ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs uppercase tracking-wide text-muted-foreground">
                        Current Status
                      </span>
                      <Badge
                        tone={
                          rampOrder.data.status === "COMPLETED"
                            ? "success"
                            : rampOrder.data.status === "INIT" ||
                              rampOrder.data.status === "AWAITING_PAYMENT_FROM_USER"
                            ? "neutral"
                            : "warning"
                        }
                      >
                        {displayStatus(rampOrder.data.status)}
                      </Badge>
                    </div>

                    <div className="space-y-1.5 text-xs text-muted-foreground">
                      <p>
                        Type: <span className="font-medium text-foreground">{rampOrder.data.buyOrSell}</span>
                      </p>
                      <p>
                        Amount:{" "}
                        <span className="font-medium text-foreground">
                          ${rampOrder.data.fiatAmount} USD / {rampOrder.data.cryptoAmount} USDC
                        </span>
                      </p>
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </Page>
  );
}

function displayStatus(status: string) {
  switch (status) {
    case "INIT":
      return "Initialized";
    case "AWAITING_PAYMENT_FROM_USER":
      return "Awaiting Payment";
    case "PAYMENT_DONE_MARKED_BY_USER":
      return "Payment Marked";
    case "PROCESSING":
      return "Processing";
    case "PENDING_DELIVERY_FROM_TRANSAK":
      return "Delivering";
    case "COMPLETED":
      return "Completed";
    default:
      return status;
  }
}