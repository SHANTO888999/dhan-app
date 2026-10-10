/**
 * Utility for Generating and Resolving Year-based Member/Seller ID Numbers
 * Format: ID-YY-XXX (e.g. ID-26-001 for 2026, ID-27-001 for 2027)
 */

export function generateYearlyMemberId(
  createdAtStr?: string, 
  existingSellers: Array<{ id: string; memberId?: string; createdAt?: string }> = []
): string {
  const date = createdAtStr ? new Date(createdAtStr) : new Date();
  const year = isNaN(date.getFullYear()) ? new Date().getFullYear() : date.getFullYear();
  const shortYear = year.toString().slice(-2); // e.g. "26"

  // Count sellers belonging to this year
  const sameYearSellers = existingSellers.filter(s => {
    const sDate = s.createdAt ? new Date(s.createdAt) : new Date();
    const sYear = isNaN(sDate.getFullYear()) ? year : sDate.getFullYear();
    return sYear === year;
  });

  const nextSeq = sameYearSellers.length + 1;
  return `ID-${shortYear}-${String(nextSeq).padStart(3, '0')}`;
}

export function getSellerMemberId(
  seller: { id: string; memberId?: string; sellerIdNumber?: string; createdAt?: string },
  allSellers: Array<{ id: string; memberId?: string; sellerIdNumber?: string; createdAt?: string }> = []
): string {
  if (seller.memberId) return seller.memberId;
  if (seller.sellerIdNumber) return seller.sellerIdNumber;

  const date = seller.createdAt ? new Date(seller.createdAt) : new Date();
  const year = isNaN(date.getFullYear()) ? new Date().getFullYear() : date.getFullYear();
  const shortYear = year.toString().slice(-2);

  const sameYearSellers = allSellers
    .filter(s => {
      const sDate = s.createdAt ? new Date(s.createdAt) : new Date();
      const sYear = isNaN(sDate.getFullYear()) ? year : sDate.getFullYear();
      return sYear === year;
    })
    .sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());

  const idx = sameYearSellers.findIndex(s => s.id === seller.id);
  const seq = idx >= 0 ? idx + 1 : 1;
  return `ID-${shortYear}-${String(seq).padStart(3, '0')}`;
}
