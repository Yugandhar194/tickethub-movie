import { CONVENIENCE_FEE_PCT, GST_PCT } from '../config/env';
import { tierForSeat } from '../config/seatTiers';

const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

export const seatPrice = (basePrice, seatNo) => round2(Number(basePrice) * tierForSeat(seatNo).multiplier);

export function computeTotals({ seats = [], basePrice = 0, fnb = 0 }) {
  const tickets = round2(seats.reduce((sum, s) => sum + seatPrice(basePrice, s), 0));
  const food = round2(fnb);
  const subtotal = tickets + food;
  const fee = round2((subtotal * CONVENIENCE_FEE_PCT) / 100);
  const tax = round2(((subtotal + fee) * GST_PCT) / 100);
  return { tickets, food, fee, tax, total: round2(subtotal + fee + tax) };
}
