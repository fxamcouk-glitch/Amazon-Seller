// jsbarcode ships no types for its internal encoders; this is the small part we use.
declare module "jsbarcode/bin/barcodes/CODE128/CODE128_AUTO.js" {
  export default class CODE128AUTO {
    constructor(data: string, options: Record<string, unknown>);
    valid(): boolean;
    encode(): { text: string; data: string };
  }
}
