// Minimal ambient declaration for `qrcode` (no @types package published).
// We only use the data-URL renderer for the "Receive money" QR code.
declare module "qrcode" {
  interface QRCodeToDataURLOptions {
    margin?: number;
    width?: number;
    color?: { dark?: string; light?: string };
    errorCorrectionLevel?: "L" | "M" | "Q" | "H";
  }
  export function toDataURL(
    text: string,
    options?: QRCodeToDataURLOptions,
  ): Promise<string>;
  const _default: { toDataURL: typeof toDataURL };
  export default _default;
}
