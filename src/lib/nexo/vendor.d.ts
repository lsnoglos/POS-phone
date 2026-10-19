declare module "qrcode" {
  export function toDataURL(
    text: string,
    opts?: { margin?: number; width?: number; errorCorrectionLevel?: string },
  ): Promise<string>;
}

declare module "jsbarcode" {
  export default function JsBarcode(
    element: HTMLCanvasElement,
    data: string,
    options?: Record<string, unknown>,
  ): void;
}
