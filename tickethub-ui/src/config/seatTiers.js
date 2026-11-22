// Seat layout and tiers. The backend stores a seat only as a label such as "C7" and has a single
// price per showtime, so tiers are zones of the auditorium. Set a multiplier above 1 only once the
// backend can store and print per-seat prices; the ticket PDF and payment record use one price.
export const ROW_LABELS = 'ABCDEFGH'.split('');
export const COLS = 14;
export const AISLE_AFTER = 7; // gap between seat 7 and 8

export const TIERS = [
  { id: 'classic', name: 'Classic', rows: ['A', 'B', 'C'], multiplier: 1 },
  { id: 'executive', name: 'Executive', rows: ['D', 'E', 'F'], multiplier: 1 },
  { id: 'recliner', name: 'Recliner', rows: ['G', 'H'], multiplier: 1 },
];

export const TOTAL_SEATS = ROW_LABELS.length * COLS;

export const tierForRow = (row) => TIERS.find((t) => t.rows.includes(row)) || TIERS[0];
export const tierForSeat = (seatNo) => tierForRow(String(seatNo)[0]);
export const seatLabel = (row, colIndex) => `${row}${colIndex + 1}`;
export const parseSeat = (seatNo) => ({
  row: String(seatNo)[0],
  col: parseInt(String(seatNo).slice(1), 10) - 1,
});
