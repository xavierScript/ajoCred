import { useState } from "react";
import { FileCheck, Download, AlertCircle, Search, ExternalLink } from "lucide-react";
import { Page, PageHeader } from "@/components/layout/Page";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useTravelRule } from "@/hooks/useBackend";
import { humanizeError, shortenHash } from "@/lib/utils";
import type { TravelRuleResult } from "@/types";

export function CompliancePage() {
  const [txHashInput, setTxHashInput] = useState("");
  const [reportResult, setReportResult] = useState<TravelRuleResult | null>(null);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const travelRuleMutation = useTravelRule();

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!txHashInput || !txHashInput.startsWith("0x")) return;

    setHasError(false);
    setReportResult(null);

    try {
      const res = await travelRuleMutation.mutateAsync(txHashInput.trim());
      if (res && res.success && (res.reportUrl || res.data)) {
        setReportResult(res);
      } else {
        setHasError(true);
        setErrorMessage("Report unavailable for this transaction.");
      }
    } catch (err) {
      setHasError(true);
      setErrorMessage(humanizeError(err) || "Report unavailable for this transaction.");
    }
  };

  return (
    <Page>
      <PageHeader
        eyebrow="Audit & Regulatory"
        title="Travel Rule & Compliance Export"
        description="Generate official Travel Rule and transaction compliance reports for large repayments or withdrawals."
      />

      <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader className="flex-row items-center gap-2">
            <FileCheck className="size-5 text-primary" />
            <CardTitle>Generate Report by Transaction Hash</CardTitle>
          </CardHeader>
          <CardBody>
            <form onSubmit={handleGenerate} className="space-y-4">
              <Input
                label="Transaction Hash (TxHash)"
                hint="Enter the on-chain txHash of an outbound repayment or withdrawal."
                placeholder="0x..."
                value={txHashInput}
                onChange={(e) => setTxHashInput(e.target.value)}
                required
              />

              <Button
                type="submit"
                block
                loading={travelRuleMutation.isPending}
                disabled={!txHashInput.startsWith("0x")}
              >
                Generate Compliance Report
              </Button>
            </form>
          </CardBody>
        </Card>

        {/* Report Result Box */}
        <Card>
          <CardHeader className="flex-row items-center gap-2">
            <Download className="size-5 text-accent" />
            <CardTitle>Compliance Output</CardTitle>
          </CardHeader>
          <CardBody>
            {travelRuleMutation.isPending ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                Querying Cleanverse Travel Rule service...
              </div>
            ) : reportResult ? (
              <div className="space-y-4 rounded-lg border border-primary/30 bg-primary/5 p-4">
                <div className="flex items-center gap-2 text-primary font-medium text-sm">
                  <FileCheck className="size-4" />
                  <span>Compliance Report Ready</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Verified report generated for transaction <span className="font-mono">{shortenHash(reportResult.txHash)}</span>.
                </p>
                {reportResult.reportUrl && (
                  <Button asChild block size="sm">
                    <a href={reportResult.reportUrl} target="_blank" rel="noreferrer">
                      <Download className="size-4" />
                      Download PDF Report
                    </a>
                  </Button>
                )}
              </div>
            ) : hasError ? (
              <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/40 p-4 text-sm">
                <AlertCircle className="mt-0.5 size-5 shrink-0 text-warning" />
                <div>
                  <p className="font-medium text-foreground">Report unavailable for this transaction</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {errorMessage || "Travel Rule reports are available for qualified transaction types."}
                  </p>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-muted-foreground">
                Enter a transaction hash to retrieve its compliance report.
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </Page>
  );
}
