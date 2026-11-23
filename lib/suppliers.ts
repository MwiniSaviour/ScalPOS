import type { PurchaseOrder, PurchaseOrderLine, Product, StockMove } from "./types.ts";

export function poTotal(lines: PurchaseOrderLine[]): number {
  return Math.round(lines.reduce((sum, l) => sum + l.qty * l.unitCost, 0) * 100) / 100;
}

export function applyReceipt(
  po: PurchaseOrder,
  products: Product[],
  moves: StockMove[],
  now: number,
  makeId: (prefix: string) => string,
): { order: PurchaseOrder; products: Product[]; moves: StockMove[] } {
  if (po.status === "received") return { order: po, products, moves };
  const nextMoves = [...moves];
  const nextProducts = products.map((p) => {
    const line = po.lines.find((l) => l.productId === p.id);
    return line ? { ...p, stock: p.stock + line.qty, updatedAt: now } : p;
  });
  for (const line of po.lines) {
    if (!products.some((p) => p.id === line.productId)) continue;
    nextMoves.push({
      id: makeId("mv_"),
      productId: line.productId,
      qty: line.qty,
      reason: "purchase",
      ref: po.id,
      t: now,
    });
  }
  return {
    order: { ...po, status: "received", receivedAt: now, updatedAt: now },
    products: nextProducts,
    moves: nextMoves,
  };
}
