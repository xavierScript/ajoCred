import { ShieldCheck, ShieldAlert, ShieldQuestion } from "lucide-react";
import { Badge } from "@/components/ui/Badge";

/**
 * At-a-glance compliance state driven by the off-chain validator check
 * (mirrors the pool's on-chain onlyCompliant gate). Loading and unknown states
 * are distinct so we never imply "not compliant" while the check is in flight.
 */
export function ComplianceBadge({
  valid,
  isLoading,
}: {
  valid?: boolean;
  isLoading?: boolean;
}) {
  if (isLoading) {
    return (
      <Badge tone="neutral">
        <ShieldQuestion className="size-3.5" />
        Checking verification…
      </Badge>
    );
  }

  if (valid) {
    return (
      <Badge tone="success" dot>
        <ShieldCheck className="size-3.5" />
        Identity verified
      </Badge>
    );
  }

  return (
    <Badge tone="warning" dot>
      <ShieldAlert className="size-3.5" />
      Verification pending
    </Badge>
  );
}
