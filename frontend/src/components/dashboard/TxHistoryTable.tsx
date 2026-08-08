import { ArrowDownLeft, ArrowUpRight, ExternalLink } from "lucide-react";
import type { CleanverseTx } from "@/types";
import { Badge } from "@/components/ui/Badge";
import { explorer } from "@/lib/contracts";
import {
  cn,
  formatAmount,
  formatDate,
  shortenAddress,
  shortenHash,
} from "@/lib/utils";

/**
 * Verified remittance history. Inbound transfers (to the user) are what build
 * the borrowing limit, so they're visually distinguished from any outbound rows.
 * Responsive: a table on sm+, stacked rows on mobile.
 */
export function TxHistoryTable({
  txs,
  account,
}: {
  txs: CleanverseTx[];
  account: string;
}) {
  const rows = txs.map((tx) => {
    const inbound = tx.to_address.toLowerCase() === account.toLowerCase();
    return { tx, inbound };
  });

  return (
    <>
      {/* Desktop / tablet table */}
      <div className="hidden sm:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="py-2.5 pr-4 font-medium">Direction</th>
              <th className="py-2.5 pr-4 font-medium">Counterparty</th>
              <th className="py-2.5 pr-4 font-medium">Date</th>
              <th className="py-2.5 pr-4 text-right font-medium">Amount</th>
              <th className="py-2.5 text-right font-medium">Tx</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map(({ tx, inbound }) => (
              <tr key={tx.tx_hash} className="align-middle">
                <td className="py-3 pr-4">
                  <DirectionPill inbound={inbound} />
                </td>
                <td className="py-3 pr-4">
                  <div className="font-medium">
                    {tx.from_org_name || shortenAddress(inbound ? tx.from_address : tx.to_address)}
                  </div>
                  <div className="font-mono text-xs text-muted-foreground">
                    {shortenAddress(inbound ? tx.from_address : tx.to_address)}
                  </div>
                </td>
                <td className="py-3 pr-4 text-muted-foreground">
                  {formatDate(tx.block_time)}
                </td>
                <td className="py-3 pr-4 text-right">
                  <span
                    className={cn(
                      "font-mono tabular-nums",
                      inbound ? "text-success" : "text-foreground",
                    )}
                  >
                    {inbound ? "+" : "−"}
                    {formatAmount(Number(tx.amount))}
                  </span>
                  <span className="ml-1 text-xs text-muted-foreground">{tx.symbol}</span>
                </td>
                <td className="py-3 text-right">
                  <ExplorerLink hash={tx.tx_hash} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile stacked list */}
      <ul className="divide-y divide-border sm:hidden">
        {rows.map(({ tx, inbound }) => (
          <li key={tx.tx_hash} className="flex items-center gap-3 py-3">
            <DirectionIcon inbound={inbound} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">
                {tx.from_org_name || shortenAddress(inbound ? tx.from_address : tx.to_address)}
              </p>
              <p className="text-xs text-muted-foreground">{formatDate(tx.block_time)}</p>
            </div>
            <div className="text-right">
              <p
                className={cn(
                  "font-mono text-sm tabular-nums",
                  inbound ? "text-success" : "text-foreground",
                )}
              >
                {inbound ? "+" : "−"}
                {formatAmount(Number(tx.amount))}
              </p>
              <ExplorerLink hash={tx.tx_hash} />
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}

function DirectionPill({ inbound }: { inbound: boolean }) {
  return inbound ? (
    <Badge tone="success">
      <ArrowDownLeft className="size-3" />
      In
    </Badge>
  ) : (
    <Badge tone="neutral">
      <ArrowUpRight className="size-3" />
      Out
    </Badge>
  );
}

function DirectionIcon({ inbound }: { inbound: boolean }) {
  return (
    <div
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-full",
        inbound ? "bg-success/10 text-success" : "bg-muted text-muted-foreground",
      )}
    >
      {inbound ? (
        <ArrowDownLeft className="size-4" />
      ) : (
        <ArrowUpRight className="size-4" />
      )}
    </div>
  );
}

function ExplorerLink({ hash }: { hash: string }) {
  return (
    <a
      href={explorer.tx(hash)}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 font-mono text-xs text-primary hover:underline"
    >
      {shortenHash(hash, 4)}
      <ExternalLink className="size-3" />
    </a>
  );
}
