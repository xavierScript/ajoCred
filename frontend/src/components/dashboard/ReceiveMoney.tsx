import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { QrCode } from "lucide-react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { CopyButton } from "@/components/ui/CopyButton";
import { Skeleton } from "@/components/ui/Skeleton";

/**
 * "Receive money" card: turns the member's account address into a scannable QR
 * so a sender can pay them directly. The address is still shown in full with a
 * copy button for anyone who'd rather paste it.
 */
export function ReceiveMoney({ address }: { address: string }) {
  const [qr, setQr] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    QRCode.toDataURL(address, { margin: 1, width: 200 })
      .then((url) => {
        if (active) setQr(url);
      })
      .catch(() => {
        if (active) setQr(null);
      });
    return () => {
      active = false;
    };
  }, [address]);

  return (
    <Card>
      <CardHeader className="flex-row items-center gap-2">
        <QrCode className="size-4 text-muted-foreground" />
        <CardTitle>Receive money</CardTitle>
      </CardHeader>
      <CardBody className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
        <div className="flex size-[200px] shrink-0 items-center justify-center rounded-lg border border-border bg-white p-2">
          {qr ? (
            <img src={qr} alt="QR code for your account address" className="size-full" />
          ) : (
            <Skeleton className="size-full" />
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-2 text-center sm:text-left">
          <p className="text-sm text-muted-foreground">
            Share this code or your address to receive money from family and friends.
          </p>
          <div className="flex items-center justify-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-2 sm:justify-start">
            <span className="min-w-0 break-all font-mono text-xs">{address}</span>
            <CopyButton value={address} />
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
