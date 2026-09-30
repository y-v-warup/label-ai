declare module "jsqr" {
  export default function jsQR(
    data: Uint8ClampedArray,
    width: number,
    height: number,
  ): { data: string } | null;
}

declare module "qrcode" {
  const QRCode: {
    toDataURL(text: string, opts?: Record<string, unknown>): Promise<string>;
    toBuffer(text: string, opts?: Record<string, unknown>): Promise<Buffer>;
  };
  export default QRCode;
}
