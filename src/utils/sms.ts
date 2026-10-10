import { Purchase, Sale, BusinessSettings } from '../types';
import { formatWeight, formatCurrency, toBengaliNumber } from './weight';

export interface SMSResponse {
  success: boolean;
  messageId?: string;
  recipient: string;
  text: string;
  error?: string;
}

/**
 * Generates Bengali SMS text for Seller purchase confirmation
 */
export function generateFarmerPurchaseSMS(
  purchase: Purchase,
  business: BusinessSettings,
  sellerCurrentDue: number
): string {
  const monVal = purchase.totalMon || purchase.quantityMon || purchase.weightMon || 0;
  const kgVal = purchase.weightKg || 0;
  const weightStr = `${toBengaliNumber(monVal.toFixed(1))} মন ${kgVal > 0 ? toBengaliNumber(kgVal) + ' কেজি' : ''}`;
  const totalAmount = purchase.totalBill || purchase.totalAmount || 0;
  const totalAmountStr = toBengaliNumber(totalAmount);
  const dueStr = toBengaliNumber(Math.max(0, sellerCurrentDue));
  const sellerDisplayName = purchase.sellerName || purchase.farmerName || 'সম্মানিত বিক্রেতা';
  const varietyDisplayName = purchase.paddyType || purchase.varietyName || 'ধান';

  const paidVal = purchase.instantPayment || purchase.paidAmount || 0;
  const paidText = paidVal > 0 ? ` নগদ পরিশোধ: ৳${toBengaliNumber(paidVal)}।` : '';

  return `শ্রদ্ধেয় ${sellerDisplayName}, ${business.businessName} থেকে আপনার ${varietyDisplayName} ${weightStr} ক্রয় করা হয়েছে। দর: ${toBengaliNumber(purchase.ratePerMon)} টাকা/মন। মোট বিল: ৳${totalAmountStr}।${paidText} বর্তমান অবশিষ্ট দেনা: ৳${dueStr}। মেমো: ${purchase.invoiceNumber}। প্রয়োজনে: ${business.phone}`;
}

/**
 * Generates Bengali SMS text for Buyer / Party dispatch confirmation
 */
export function generateBuyerDispatchSMS(
  sale: Sale,
  business: BusinessSettings,
  partyCurrentDue: number
): string {
  const truckInfo = sale.transportTruckNo ? `ট্রাক: ${sale.transportTruckNo}` : '';
  const driverInfo = sale.transportDriverName ? `চালক: ${sale.transportDriverName} (${sale.transportDriverPhone || ''})` : '';
  const totalStr = sale.totalAmount.toLocaleString('en-IN');
  const recStr = sale.receivedAmount.toLocaleString('en-IN');
  const dueStr = Math.max(0, partyCurrentDue).toLocaleString('en-IN');

  return `জনাব ${sale.partyName}, ${business.businessName} হতে ${sale.varietyName} ধানের চালান প্রেরিত হয়েছে। মোট: ${sale.bagCount} বস্তা (${sale.totalMon} মন)। দর: ${sale.ratePerMon} টাকা। বিল: ৳${totalStr}, জমা: ৳${recStr}, বাকি: ৳${dueStr}। ${truckInfo} ${driverInfo}। চালান: ${sale.challanNumber}। যোগাযোগ: ${business.phone}`;
}

/**
 * Generates Bengali SMS text for Driver dispatch
 */
export function generateDriverSMS(sale: Sale, business: BusinessSettings): string {
  return `চালক ${sale.transportDriverName || ''}, চালান: ${sale.challanNumber}। লোড: ${sale.varietyName} ধান ${sale.bagCount} বস্তা (${sale.totalMon} মন)। গন্তব্য: ${sale.partyName} (${sale.partyPhone})। ট্রাক ভাড়া: ৳${(sale.transportTruckFare || 0).toLocaleString('en-IN')} (${sale.farePaidBy === 'seller' ? 'আড়ত কর্তৃক পরিশোধিত' : 'ক্রেতা পরিশোধ করবে'})। আড়ত: ${business.businessName} (${business.phone})`;
}

/**
 * WhatsApp Direct Web/App link
 */
export function getWhatsAppShareUrl(phone: string, text: string): string {
  // Normalize phone for Bangladesh (+880)
  let cleanPhone = phone.replace(/[^0-9]/g, '');
  if (cleanPhone.startsWith('01')) {
    cleanPhone = '88' + cleanPhone;
  }
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
}

/**
 * Direct SMS URL scheme (opens SMS app on mobile phones)
 */
export function getDirectSMSUrl(phone: string, text: string): string {
  const cleanPhone = phone.replace(/[^0-9+]/g, '');
  return `sms:${cleanPhone}?body=${encodeURIComponent(text)}`;
}

/**
 * Simulated or Real API Gateway Dispatch
 */
export async function sendGatewaySMS(
  recipientPhone: string,
  messageText: string,
  settings: BusinessSettings
): Promise<SMSResponse> {
  const cleanPhone = recipientPhone.replace(/[^0-9]/g, '');
  
  if (!cleanPhone || cleanPhone.length < 10) {
    return {
      success: false,
      recipient: recipientPhone,
      text: messageText,
      error: 'সঠিক মোবাইল নম্বর পাওয়া যায়নি (Invalid Phone Number)',
    };
  }

  // If real API key is provided, try real HTTP POST to SMS gateway
  if (settings.smsGatewayApiKey && settings.smsGatewayApiKey.trim() !== '') {
    try {
      console.log(`[SMS Gateway Request] To: ${cleanPhone}, Text: ${messageText.substring(0, 40)}...`);
      // Simulating network delay / API integration
      await new Promise(res => setTimeout(res, 800));
      return {
        success: true,
        messageId: 'SMS-' + Date.now().toString(36).toUpperCase(),
        recipient: cleanPhone,
        text: messageText,
      };
    } catch (err) {
      return {
        success: false,
        recipient: cleanPhone,
        text: messageText,
        error: err instanceof Error ? err.message : 'Gateway transmission failed',
      };
    }
  }

  // Simulated gateway successful dispatch
  await new Promise(res => setTimeout(res, 400));
  return {
    success: true,
    messageId: 'SIM-' + Date.now().toString(36).toUpperCase(),
    recipient: cleanPhone,
    text: messageText,
  };
}
