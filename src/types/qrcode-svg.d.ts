// qrcode-svg ships no types; this is the small part we use.
declare module "qrcode-svg" {
  export default class QRCode {
    constructor(options: { content: string; padding?: number; width?: number; height?: number; color?: string; background?: string; ecl?: "L" | "M" | "Q" | "H"; join?: boolean });
    svg(): string;
  }
}
