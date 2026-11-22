import { describe, expect, it } from 'vitest';
import { bookingCode, formatCurrency } from './format';

describe('ticket display formatting', () => {
  it('keeps numeric booking codes padded and makes UUID checkout codes readable', () => {
    expect(bookingCode(123)).toBe('TH-000123');
    expect(bookingCode('8d18c56a-1234-5678-90ab-1234567890ab')).toBe('TH-8D18C56A');
  });

  it('formats the showtime currency instead of assuming INR', () => {
    expect(formatCurrency(1234, 'INR')).toContain('₹');
    expect(formatCurrency(1234, 'UGX')).toContain('UGX');
  });
});
