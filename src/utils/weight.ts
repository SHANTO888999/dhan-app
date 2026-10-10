// 1 Mon (মন) = 40 Kg (কেজি)
export const KG_PER_MON = 40;

const BENGALI_DIGITS: { [key: string]: string } = {
  '0': '০',
  '1': '১',
  '2': '২',
  '3': '৩',
  '4': '৪',
  '5': '৫',
  '6': '৬',
  '7': '৭',
  '8': '৮',
  '9': '৯',
  '.': '.',
  ',': ',',
  '-': '-',
};

export function toBengaliNumber(num: number | string | undefined | null): string {
  if (num === undefined || num === null || (typeof num === 'number' && isNaN(num))) return '0';
  return String(num);
}

/**
 * Calculates total Mon from Mon and Kg
 * Example: 5 Mon 4 Kg = 5 + (4 / 40) = 5.1 Mon
 */
export function calculateTotalMon(mon: number, kg: number): number {
  const safeMon = Math.max(0, Number(mon) || 0);
  const safeKg = Math.max(0, Number(kg) || 0);
  return Number((safeMon + safeKg / KG_PER_MON).toFixed(3));
}

/**
 * Calculates total Kg from Mon and Kg
 * Example: 5 Mon 4 Kg = (5 * 40) + 4 = 204 Kg
 */
export function calculateTotalKg(mon: number, kg: number): number {
  const safeMon = Math.max(0, Number(mon) || 0);
  const safeKg = Math.max(0, Number(kg) || 0);
  return Number((safeMon * KG_PER_MON + safeKg).toFixed(2));
}

/**
 * Breaks total Mon back into Mon and Kg
 * Example: 5.1 Mon => 5 Mon, 4 Kg
 */
export function decomposeTotalMon(totalMon: number): { mon: number; kg: number } {
  const safe = Math.max(0, Number(totalMon) || 0);
  const mon = Math.floor(safe);
  const remainderMon = safe - mon;
  const kg = Number((remainderMon * KG_PER_MON).toFixed(2));
  return { mon, kg };
}

/**
 * Calculates total purchase/sale amount
 * Total = Total Mon * Rate per Mon
 */
export function calculateAmount(totalMon: number, ratePerMon: number): number {
  const safeMon = Math.max(0, Number(totalMon) || 0);
  const safeRate = Math.max(0, Number(ratePerMon) || 0);
  return Math.round(safeMon * safeRate);
}

/**
 * Formats Mon and Kg display
 * e.g. "৫ মন ৪ কেজি (২০৪ কেজি)"
 */
export function formatWeight(mon: number, kg: number, useBengali = true): string {
  const safeMon = Math.floor(mon);
  const safeKg = Math.round(kg * 10) / 10;
  const totalMon = calculateTotalMon(safeMon, safeKg);
  
  if (useBengali) {
    if (safeKg === 0) {
      return `${toBengaliNumber(safeMon)} মন`;
    }
    return `${toBengaliNumber(safeMon)} মন ${toBengaliNumber(safeKg)} কেজি (${toBengaliNumber(totalMon)} মন)`;
  }
  
  if (safeKg === 0) {
    return `${safeMon} Mon`;
  }
  return `${safeMon} Mon ${safeKg} Kg (${totalMon} Mon)`;
}

/**
 * Formats Currency
 * e.g. "৳ ১,২০,০০০" or "৳ 120,000"
 */
export function formatCurrency(amount: number | undefined | null, useBengali = false): string {
  const safe = Math.round(Number(amount) || 0);
  const formatted = new Intl.NumberFormat('en-IN').format(safe);
  return `৳ ${formatted}`;
}
