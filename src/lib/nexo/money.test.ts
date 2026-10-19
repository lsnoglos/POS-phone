import assert from "node:assert/strict";
import test from "node:test";
import { calcCart, cashChange, chunkCents, labelGrid } from "./money.ts";

test("calcula impuesto y descuento sin perder centavos", () => {
  const cart = calcCart({
    taxRateBps: 1500,
    orderDiscountCents: 100,
    lines: [
      { qty: 2, unitPriceCents: 1000, discountCents: 0, taxExempt: false, costCents: 400 },
      { qty: 1, unitPriceCents: 500, discountCents: 50, taxExempt: true, costCents: 200 },
    ],
  });
  assert.equal(cart.subtotalCents, 2500);
  assert.equal(cart.discountCents, 150);
  assert.equal(cart.lines.reduce((s, l) => s + l.lineTotalCents, 0), cart.totalCents);
  assert.equal(cart.lines.reduce((s, l) => s + l.taxCents, 0), cart.taxCents);
  assert.equal(cart.costCents, 1000);
  assert.ok(cart.totalCents > 0);
});

test("el cambio exige cubrir el efectivo aplicado", () => {
  assert.equal(cashChange(1500, 2000), 500);
  assert.throws(() => cashChange(1500, 1000), /no cubre/);
});

test("las devoluciones parciales suman el total original", () => {
  const parts = [chunkCents(100, 3, 0, 1), chunkCents(100, 3, 1, 1), chunkCents(100, 3, 2, 1)];
  assert.equal(parts.reduce((s, n) => s + n, 0), 100);
});

test("las etiquetas caben en carta sin salirse", () => {
  const grid = labelGrid({ cols: 3, rows: 8, marginMm: 10, gapX: 2, gapY: 2 });
  assert.equal(grid.cells.length, 24);
  for (let i = 0; i < grid.cells.length; i += 1) {
    const a = grid.cells[i];
    assert.ok(a.x >= 10 && a.y >= 10);
    assert.ok(a.x + a.w <= 215.9 + 0.01);
    assert.ok(a.y + a.h <= 279.4 + 0.01);
    for (let j = i + 1; j < grid.cells.length; j += 1) {
      const b = grid.cells[j];
      const overlap = a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
      assert.equal(overlap, false);
    }
  }
});
