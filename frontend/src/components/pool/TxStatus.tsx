import { CircleCheck, CircleAlert, ExternalLink } from "lucide-react";
import { Spinner } from "@/components/ui/Spinner";
import { explorer } from "@/lib/contracts";
import { shortenHash, humanizeError } from "@/lib/utils";

interface TxStatusProps {
  isSubmitting: boolean;
  isConfirming: boolean;
  isSuccess: boolean;
  error?: unknown;
  hash?: `0x${string}`;
  /** Verb shown on success, e.g. "Deposited", "Borrowed". */
  successLabel: string;
}

/**
 * Inline transaction progress: waiting-for-wallet → confirming-on-chain →
 * success (with a BaseScan link) or a humanized error. Renders nothing until a
 * transaction is in flight, so it can sit permanently under any action form.
 */
export function TxStatus({
  isSubmitting,
  isConfirming,
  isSuccess,
  error,
  hash,
  successLabel,
}: TxStatusProps) {
  if (error) {
    return (
      <Row tone="error">
        <CircleAlert className="size-4 shrink-0 text-destructive" />
        <span className="text-destructive">{humanizeError(error)}</span>
      </Row>
    );
  }

  if (isSubmitting) {
    return (
      <Row>
        <Spinner className="size-4 text-muted-foreground" />
        <span>Waiting for confirmation in your wallet…</span>
      </Row>
    );
  }

  if (isConfirming) {
    return (
      <Row>
        <Spinner className="size-4 text-muted-foreground" />
        <span>Confirming on Base…</span>
        {hash && <ExplorerLink hash={hash} />}
      </Row>
    );
  }

  if (isSuccess) {
    return (
      <Row tone="success">
        <CircleCheck className="size-4 shrink-0 text-success" />
        <span className="text-success">{successLabel} successfully.</span>
        {hash && <ExplorerLink hash={hash} />}
      </Row>
    );
  }

  return null;
}

function Row({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone?: "success" | "error";
}) {
  const border =
    tone === "success"
      ? "border-success/20 bg-success/5"
      : tone === "error"
        ? "border-destructive/20 bg-destructive/5"
        : "border-border bg-muted/40";
  return (
    <div
      className={`flex flex-wrap items-center gap-2 rounded-md border px-3 py-2.5 text-sm ${border}`}
      role="status"
      aria-live="polite"
    >
      {children}
    </div>
  );
}

function ExplorerLink({ hash }: { hash: string }) {
  return (
    <a
      href={explorer.tx(hash)}
      target="_blank"
      rel="noopener noreferrer"
      className="ml-auto inline-flex items-center gap-1 font-mono text-xs text-primary hover:underline"
    >
      {shortenHash(hash)}
      <ExternalLink className="size-3" />
    </a>
  );
}
