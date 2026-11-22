import { describe, expect, it } from 'vitest';
import { computeTotals } from './pricing';

describe('ticket checkout totals', () => {
  it('includes selected seats and food in the payable amount', () => {
    const totals = computeTotals({ seats: ['A1', 'A2'], basePrice: 220, fnb: 300 });
    expect(totals.tickets).toBe(440);
    expect(totals.food).toBe(300);
    expect(totals.total).toBe(totals.tickets + totals.food + totals.fee + totals.tax);
  });
});
