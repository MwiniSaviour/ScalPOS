export type ReceiptPrintData = {
  shopName: string;
  address: string;
  phone: string;
  momo: string;
  refunded: boolean;
  orderId: string;
  orderDate: string;
  items: { name: string; qty: number; amount: string }[];
  subtotal: string;
  discount: string | null;
  tax: { label: string; amount: string } | null;
  total: string;
  payments: { label: string; amount: string }[];
  balance: string | null;
  footer: string;
};

const WIDTH = 32;
const ESC = 0x1b;
const GS = 0x1d;
const LF = 0x0a;

const REPLACEMENTS: Record<string, string> = {
  "\u20B5": "GHS ",
  "\u00D7": "x",
  "\u00B7": "-",
  "\u2013": "-",
  "\u2014": "-",
  "\u2018": "'",
  "\u2019": "'",
  "\u201C": '"',
  "\u201D": '"',
  "\u2212": "-",
  "\u2215": "/",
  "\u2022": "*",
};

export function receiptToEscposBytes(receipt: ReceiptPrintData): Uint8Array {
  const out: number[] = [];
  const push = (...b: number[]) => out.push(...b);
  const text = (s: string) => push(...ascii(s).split("").map((c) => c.charCodeAt(0)));
  const line = (s = "") => {
    text(s);
    push(LF);
  };
  const centered = (s: string) => text(ascii(s).slice(0, WIDTH));
  const gap = () => push(LF);

  push(ESC, 0x40);

  push(ESC, 0x21, 0x30);
  push(ESC, 0x61, 0x01);
  centered(receipt.shopName);
  push(LF);
  push(ESC, 0x21, 0x00);
  push(ESC, 0x61, 0x01);
  for (const head of [receipt.address, receipt.phone, receipt.momo]) {
    const t = ascii(head).trim();
    if (t) line(t);
  }
  if (receipt.refunded) {
    push(ESC, 0x21, 0x20);
    push(ESC, 0x45, 0x01);
    centered("REFUNDED");
    push(LF);
    push(ESC, 0x45, 0x00);
    push(ESC, 0x21, 0x00);
  }

  push(ESC, 0x61, 0x00);
  gap();

  for (const seg of wrap(`${receipt.orderId}  ${receipt.orderDate}`, WIDTH)) line(seg);
  gap();

  for (const item of receipt.items) {
    const left = `${item.name} x ${item.qty}`;
    const lines = wrap(left, WIDTH);
    lines.forEach((seg, idx) => {
      if (idx === lines.length - 1) {
        pushColumns(out, seg, item.amount);
      } else {
        line(seg);
      }
    });
  }
  gap();

  pushColumns(out, "Subtotal", receipt.subtotal);
  if (receipt.discount) pushColumns(out, "Discount", `-${receipt.discount}`);
  if (receipt.tax) pushColumns(out, receipt.tax.label, receipt.tax.amount);

  push(LF);
  push(ESC, 0x21, 0x30);
  pushColumns(out, "Total", receipt.total);
  push(LF);
  push(ESC, 0x21, 0x00);

  for (const p of receipt.payments) {
    pushColumns(out, p.label, p.amount);
  }
  if (receipt.balance) pushColumns(out, "Balance due", receipt.balance);
  if (receipt.payments.length === 0 && !receipt.balance) line("Fully paid");

  const foot = receipt.footer.trim();
  if (foot) {
    push(ESC, 0x61, 0x01);
    gap();
    for (const seg of wrap(foot, WIDTH)) {
      centered(seg);
      push(LF);
    }
    centered("Thank you for your purchase.");
    push(LF);
  }

  gap();
  gap();
  gap();
  push(GS, 0x56, 66, 0);

  return new Uint8Array(out);
}

function ascii(s: string): string {
  let result = "";
  for (const ch of s ?? "") {
    if (REPLACEMENTS[ch]) {
      result += REPLACEMENTS[ch];
    } else if (ch.charCodeAt(0) > 126) {
      result += transliterate(ch);
    } else {
      result += ch;
    }
  }
  return result;
}

function transliterate(ch: string): string {
  const code = ch.charCodeAt(0);
  const latin = ch.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
  if (latin && latin.charCodeAt(0) <= 126) return latin;
  if ((code >= 0x2460 && code <= 0x24ff) || (code >= 0x3000 && code <= 0x30ff)) return "";
  if (code >= 0x0900 && code <= 0x109f) return "";
  return "-";
}

function wrap(s: string, width: number): string[] {
  const clean = s.replace(/\s+/g, " ").trim();
  if (clean.length <= width) return [clean];
  const words = clean.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const w of words) {
    if (!w) continue;
    if (current && `${current} ${w}`.length > width) {
      lines.push(current);
      current = w.length > width ? "" : w;
    } else {
      current = current ? `${current} ${w}` : w;
    }
    while (current.length > width) {
      lines.push(current.slice(0, width));
      current = current.slice(width);
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [""];
}

function pushColumns(out: number[], left: string, right = "") {
  const l = left ?? "";
  const r = right ?? "";
  if (!r) {
    for (const seg of wrap(l, WIDTH)) {
      out.push(...ascii(seg).split("").map((c) => c.charCodeAt(0)), LF);
    }
    return;
  }
  const rightText = ascii(r).slice(0, WIDTH - 1);
  const room = WIDTH - rightText.length - 1;
  const leftLines = wrap(l, room);
  const last = leftLines.pop() ?? "";
  const spaces = WIDTH - last.length - rightText.length;
  if (spaces < 1) {
    if (last) out.push(...ascii(last).split("").map((c) => c.charCodeAt(0)), LF);
    out.push(...rightText.split("").map((c) => c.charCodeAt(0)), LF);
    return;
  }
  const buf = `${last}${" ".repeat(spaces)}${rightText}`;
  out.push(...buf.split("").map((c) => c.charCodeAt(0)), LF);
}
