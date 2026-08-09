import type { ReactNode } from "react";
import { AlertTriangle, Inbox } from "lucide-react";
import { Button } from "./Button";

/** Consistent inline error with an optional retry — used across data panels. */
export function ErrorState({
  title,
  message,
  onRetry,
  retry,
}: {
  title?: string;
  message: string;
  onRetry?: () => void;
  retry?: () => void;
}) {
  const handleRetry = onRetry ?? retry;
  return (
    <div className="flex flex-col items-center gap-3 px-4 py-10 text-center">
      <AlertTriangle className="size-6 text-destructive" aria-hidden />
      {title && <p className="font-medium text-destructive">{title}</p>}
      <p className="max-w-sm text-sm text-muted-foreground">{message}</p>
      {handleRetry && (
        <Button variant="outline" size="sm" onClick={handleRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

/** Neutral empty state with an icon, message, and optional action. */
export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-4 py-10 text-center">
      <div className="text-muted-foreground" aria-hidden>
        {icon ?? <Inbox className="size-6" />}
      </div>
      <div className="space-y-1">
        <p className="font-medium">{title}</p>
        {description && (
          <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}
