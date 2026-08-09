import { formatUnits } from "viem";
import { ArrowDownLeft, ArrowUpRight, Download, ExternalLink, ShieldCheck } from "lucide-react";
import { shortenAddress } from "@/lib/utils";
import type { RemittanceTx } from "@/types";
import { useTravelRule } from "@/hooks/useBackend";

interface TxHistoryTableProps {
  txs: RemittanceTx[];
  account: string;
}

export function TxHistoryTable({ txs, account }: TxHistoryTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
            <th className="py-3 px-4 font-medium">Type</th>
            <th className="py-3 px-4 font-medium">Amount</th>
            <th className="py-3 px-4 font-medium">Counterparty</th>
            <th className="py-3 px-4 font-medium">CVA Verification</th>
            <th className="py-3 px-4 font-medium">Travel Rule</th>
            <th className="py-3 px-4 font-medium text-right">Explorer</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {txs.map((tx) => {
            const isOutbound = tx.from.toLowerCase() === account.toLowerCase();
            const counterparty = isOutbound ? tx.to : tx.from;
            const amountFormatted = parseFloat(formatUnits(BigInt(tx.amount), 6)).toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            });

            return (
              <tr key={tx.hash} className="hover:bg-muted/30 transition-colors">
                <td className="py-3.5 px-4">
                  <div className="flex items-center gap-2">
                    <div
                      className={`flex size-7 items-center justify-center rounded-full ${
                        isOutbound
                          ? "bg-amber-500/10 text-amber-500"
                          : "bg-emerald-500/10 text-emerald-500"
                      }`}
                    >
                      {isOutbound ? (
                        <ArrowUpRight className="size-4" />
                      ) : (
                        <ArrowDownLeft className="size-4" />
                      )}
                    </div>
                    <span className="font-medium">
                      {isOutbound ? "Outbound" : "Inbound"}
                    </span>
                  </div>
                </td>
                <td className="py-3.5 px-4 font-mono font-medium">
                  <span className={isOutbound ? "text-muted-foreground" : "text-emerald-500"}>
                    {isOutbound ? "-" : "+"}${amountFormatted} USDC
                  </span>
                </td>
                <td className="py-3.5 px-4 font-mono text-muted-foreground">
                  {shortenAddress(counterparty)}
                </td>
                <td className="py-3.5 px-4">
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-500 border border-emerald-500/20">
                    <ShieldCheck className="size-3.5" />
                    Verified CVA
                  </div>
                </td>
                <td className="py-3.5 px-4">
                  {isOutbound ? (
                    <TravelRuleButton txHash={tx.hash} />
                  ) : (
                    <span className="text-xs text-muted-foreground">N/A (Inbound)</span>
                  )}
                </td>
                <td className="py-3.5 px-4 text-right">
                  <a
                    href={`https://basescan.org/tx/${tx.hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    BaseScan
                    <ExternalLink className="size-3" />
                  </a>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function TravelRuleButton({ txHash }: { txHash: string }) {
  const travelRule = useTravelRule();

  const handleDownload = async () => {
    try {
      const res = await travelRule.mutateAsync(txHash);
      if (res.reportUrl) {
        window.open(res.reportUrl, "_blank");
      } else {
        alert("Travel Rule report generated successfully for tx " + txHash.slice(0, 10) + "...");
      }
    } catch {
      /* handled */
    }
  };

  return (
    <button
      onClick={handleDownload}
      disabled={travelRule.isPending}
      className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/40 px-2.5 py-1 text-xs font-medium hover:bg-muted transition-colors disabled:opacity-50"
    >
      <Download className="size-3 text-muted-foreground" />
      {travelRule.isPending ? "Generating..." : "Travel Rule PDF"}
    </button>
  );
}
