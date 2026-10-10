import { Seller } from '../types';

/**
 * Generates an easy-to-remember professional Member ID for grain sellers / farmers:
 * Format: YYNN (e.g. 2601, 2602, 2603, 2604)
 * - YY: Last 2 digits of the registration year (e.g. 26 for 2026, 27 for 2027)
 * - NN: 2+ digit sequential member number (01, 02, ...)
 * Super easy for farmers & arat owners to remember, speak over phone, and write in ledgers!
 * Example: 2601 (Year 2026, Member #1). In 2027, becomes 2701.
 */
export function getSellerMemberId(
  seller: { id: string; memberId?: string; createdAt?: string },
  allSellers?: { id: string; memberId?: string; createdAt?: string }[]
): string {
  const createdDate = seller.createdAt ? new Date(seller.createdAt) : new Date();
  const year = isNaN(createdDate.getFullYear()) ? new Date().getFullYear() : createdDate.getFullYear();
  const shortYear = String(year).slice(-2);

  // If seller already has a memberId
  if (seller.memberId && seller.memberId.trim()) {
    const raw = seller.memberId.trim();
    // Normalize old styles like #26-01, SL-2026-001, 26-01 to clean 4-digit 2601
    const match = raw.match(/SL-(\d{4})-(\d+)/i) || 
                  raw.match(/#?(\d{2,4})[-_](\d+)/) || 
                  raw.match(/#?(\d{4,})/);
    if (match) {
      if (match[2]) {
        const y = match[1].slice(-2);
        const num = parseInt(match[2], 10);
        return `${y}${String(num).padStart(2, '0')}`;
      }
      return match[1].replace('#', '');
    }
    const cleanNum = raw.replace(/[^0-9]/g, '');
    if (cleanNum.length >= 2) {
      return cleanNum.length === 2 ? `${shortYear}${cleanNum}` : cleanNum;
    }
    return raw;
  }

  if (allSellers && allSellers.length > 0) {
    const sellersThisYear = allSellers
      .filter(s => {
        const d = s.createdAt ? new Date(s.createdAt) : new Date();
        const y = isNaN(d.getFullYear()) ? new Date().getFullYear() : d.getFullYear();
        return y === year;
      })
      .sort((a, b) => {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeA - timeB;
      });

    const index = sellersThisYear.findIndex(s => s.id === seller.id);
    const seq = index >= 0 ? index + 1 : 1;
    return `${shortYear}${String(seq).padStart(2, '0')}`;
  }

  return `${shortYear}01`;
}

/**
 * Helper to retrieve the year of registration for a seller
 */
export function getSellerYear(seller: { memberId?: string; createdAt?: string }): number {
  if (seller.memberId) {
    const raw = seller.memberId.trim();
    const fourDigitMatch = raw.match(/(\d{4})/);
    if (fourDigitMatch) {
      const val = parseInt(fourDigitMatch[1], 10);
      if (val >= 2000 && val <= 2099) return val;
      // If 4-digit like 2601, first 2 digits are year 26 => 2026
      const prefix = parseInt(raw.slice(0, 2), 10);
      if (prefix >= 20 && prefix <= 50) return 2000 + prefix;
    }
    const twoDigitMatch = raw.match(/#?(\d{2})[-_0-9]/);
    if (twoDigitMatch) {
      const prefix = parseInt(twoDigitMatch[1], 10);
      if (prefix >= 20 && prefix <= 50) return 2000 + prefix;
    }
  }
  const createdDate = seller.createdAt ? new Date(seller.createdAt) : new Date();
  return isNaN(createdDate.getFullYear()) ? new Date().getFullYear() : createdDate.getFullYear();
}
