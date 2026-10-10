import { Purchase, Sale, BusinessSettings } from '../types';
import { formatCurrency, toBengaliNumber } from './weight';

/**
 * Opens a dedicated popup print window formatted for 58mm or 80mm thermal receipt roll
 */
export function printThermalReceipt(contentHtml: string, widthMm: 58 | 80 = 58) {
  const printWindow = window.open('', '_blank', 'width=450,height=700');
  if (!printWindow) {
    alert('প্রিন্ট পপ-আপ ব্লক করা হয়েছে। দয়া করে ব্রাউজারে পপ-আপ অনুমোদন দিন।');
    return;
  }

  const paperWidth = widthMm === 80 ? '72mm' : '52mm';

  const fullHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Thermal Receipt</title>
        <style>
          @page {
            size: ${widthMm}mm auto;
            margin: 0mm;
          }
          * {
            box-sizing: border-box;
            font-family: 'Hind Siliguri', 'Courier New', monospace;
          }
          body {
            width: ${paperWidth};
            margin: 0 auto;
            padding: 4mm 2mm;
            font-size: 11px;
            color: #000;
            background: #fff;
            line-height: 1.35;
          }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .font-bold { font-weight: bold; }
          .title { font-size: 14px; font-weight: bold; margin-bottom: 2px; }
          .subtitle { font-size: 10px; margin-bottom: 4px; }
          .divider { border-top: 1px dashed #000; margin: 5px 0; }
          .double-divider { border-top: 2px solid #000; margin: 6px 0; }
          .row { display: flex; justify-content: space-between; margin-bottom: 2px; }
          .table-header { font-weight: bold; border-bottom: 1px dashed #000; padding-bottom: 2px; }
          .footer { font-size: 9px; text-align: center; margin-top: 10px; }
          @media print {
            body { width: 100%; }
          }
        </style>
      </head>
      <body>
        ${contentHtml}
        <script>
          window.onload = function() {
            window.print();
            setTimeout(function() {
              window.close();
            }, 800);
          };
        </script>
      </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(fullHtml);
  printWindow.document.close();
}

/**
 * Builds HTML for Seller Purchase Memo (ধান ক্রয়ের পাকা মেমো)
 */
export function buildPurchaseMemoHtml(
  purchase: Purchase,
  business: BusinessSettings,
  sellerPreviousBalance: number = 0
): string {
  const billAmount = purchase.totalBill || purchase.totalAmount || 0;
  const currentTotalDue = sellerPreviousBalance + billAmount;
  const monCount = purchase.totalMon || purchase.quantityMon || purchase.weightMon || 0;
  const kgCount = purchase.weightKg || 0;
  const weightText = `${monCount} মন ${kgCount > 0 ? kgCount + ' কেজি' : ''}`;
  const sellerNameText = purchase.sellerName || purchase.farmerName || 'বিক্রেতা';
  const sellerPhoneText = purchase.sellerPhone || purchase.farmerPhone || '---';
  const varietyText = purchase.paddyType || purchase.varietyName || 'ধান';

    const paidAmount = purchase.instantPayment || purchase.paidAmount || 0;
    const memoDue = Math.max(0, billAmount - paidAmount);

    return `
    <div class="text-center">
      <div class="title">${business.businessName}</div>
      <div class="subtitle">প্রোঃ ${business.proprietor}</div>
      <div class="subtitle">${business.address}</div>
      <div class="subtitle">মোবাইল: ${business.phone}</div>
      <div class="double-divider"></div>
      <div class="font-bold">*** ধান ক্রয়ের মেমো (PURCHASE MEMO) ***</div>
      <div class="divider"></div>
    </div>

    <div class="row">
      <span>মেমো নং: <b>${purchase.invoiceNumber}</b></span>
      <span>তারিখ: ${purchase.date}${purchase.time ? ` (${purchase.time})` : ''}</span>
    </div>
    <div class="row">
      <span>বিক্রেতা: <b>${sellerNameText}</b></span>
    </div>
    <div class="row">
      <span>মোবাইল: ${sellerPhoneText}</span>
    </div>

    <div class="divider"></div>

    <div class="row table-header">
      <span style="flex: 2;">বিবরণ</span>
      <span style="flex: 1.5; text-align: right;">পরিমাণ</span>
      <span style="flex: 1.5; text-align: right;">মোট (৳)</span>
    </div>

    <div class="row" style="margin-top: 4px;">
      <span style="flex: 2;"><b>${varietyText}</b></span>
      <span style="flex: 1.5; text-align: right;">${weightText}</span>
      <span style="flex: 1.5; text-align: right;">${billAmount.toLocaleString('en-IN')}</span>
    </div>
    <div class="row">
      <span style="font-size: 9px; color: #333;">দর: ৳${purchase.ratePerMon}/মন | মোট মন: ${monCount}</span>
    </div>

    <div class="divider"></div>

    <div class="row font-bold">
      <span>মোট বিল:</span>
      <span>৳ ${billAmount.toLocaleString('en-IN')}</span>
    </div>
    <div class="row font-bold">
      <span>নগদ পরিশোধ:</span>
      <span>৳ ${paidAmount.toLocaleString('en-IN')}</span>
    </div>
    <div class="row font-bold">
      <span>অবশিষ্ট দেনা:</span>
      <span>৳ ${memoDue.toLocaleString('en-IN')}</span>
    </div>

    ${
      sellerPreviousBalance !== 0
        ? `
      <div class="divider"></div>
      <div class="row">
        <span>পূর্বের বকেয়া:</span>
        <span>৳ ${sellerPreviousBalance.toLocaleString('en-IN')}</span>
      </div>
      <div class="row font-bold" style="font-size: 12px;">
        <span>সর্বমোট বকেয়া দেনা:</span>
        <span>৳ ${(sellerPreviousBalance + memoDue).toLocaleString('en-IN')}</span>
      </div>
    `
        : ''
    }

    <div class="double-divider"></div>
    <div class="row" style="margin-top: 25px;">
      <span style="border-top: 1px dotted #000; padding-top: 2px;">বিক্রেতার স্বাক্ষর</span>
      <span style="border-top: 1px dotted #000; padding-top: 2px;">আড়তদারের স্বাক্ষর</span>
    </div>

    <div class="footer">
      ${business.invoiceFooterNote || 'সততাই ব্যবসার মূলধন। ধন্যবাদ।'}<br>
      Digital System by Paddy Trading POS
    </div>
  `;
}

/**
 * Builds HTML for Buyer / Truck Challan Memo (ধান বিক্রয় ও ট্রাক চালান)
 */
export function buildSaleChallanHtml(
  sale: Sale,
  business: BusinessSettings,
  partyPreviousBalance: number = 0
): string {
  const currentTotalDue = partyPreviousBalance + sale.dueAmount;

  return `
    <div class="text-center">
      <div class="title">${business.businessName}</div>
      <div class="subtitle">প্রোঃ ${business.proprietor}</div>
      <div class="subtitle">${business.address}</div>
      <div class="subtitle">মোবাইল: ${business.phone}</div>
      <div class="double-divider"></div>
      <div class="font-bold">*** ধান বিক্রয় ও চালানি মেমো (CHALLAN) ***</div>
      <div class="divider"></div>
    </div>

    <div class="row">
      <span>চালান নং: <b>${sale.challanNumber}</b></span>
      <span>তারিখ: ${sale.date}</span>
    </div>
    <div class="row">
      <span>ক্রেতা/পার্টি: <b>${sale.partyName}</b></span>
    </div>
    <div class="row">
      <span>মোবাইল: ${sale.partyPhone || '---'}</span>
    </div>

    <div class="divider"></div>
    <div class="font-bold" style="font-size: 10px;">ট্রাক ও পরিবহন তথ্য:</div>
    <div class="row">
      <span>ট্রাক নং: ${sale.transportTruckNo || 'স্বহস্তে/ভ্যান'}</span>
      <span>চালক: ${sale.transportDriverName || '---'}</span>
    </div>
    <div class="row">
      <span>চালকের ফোন: ${sale.transportDriverPhone || '---'}</span>
      <span>ভাড়া: ৳${sale.transportTruckFare || 0} (${sale.farePaidBy === 'seller' ? 'আড়ত' : 'ক্রেতা'})</span>
    </div>

    <div class="divider"></div>

    <div class="row table-header">
      <span style="flex: 2;">বিবরণ</span>
      <span style="flex: 1.5; text-align: right;">বস্তা / মন</span>
      <span style="flex: 1.5; text-align: right;">মোট (৳)</span>
    </div>

    <div class="row" style="margin-top: 4px;">
      <span style="flex: 2;"><b>${sale.varietyName}</b></span>
      <span style="flex: 1.5; text-align: right;">${sale.bagCount} বস্তা ${sale.perBagWeight ? `(@${sale.perBagWeight}${sale.perBagUnit === 'kg' ? 'kg' : 'মন'}) ` : ''}(${sale.totalMon} মন)</span>
      <span style="flex: 1.5; text-align: right;">${sale.totalAmount.toLocaleString('en-IN')}</span>
    </div>
    <div class="row">
      <span style="font-size: 9px; color: #333;">দর: ৳${sale.ratePerMon}/মন</span>
    </div>

    <div class="divider"></div>

    <div class="row font-bold">
      <span>মোট বিক্রয় বিল:</span>
      <span>৳ ${sale.totalAmount.toLocaleString('en-IN')}</span>
    </div>
    <div class="row">
      <span>নগদ আদায়:</span>
      <span>৳ ${sale.receivedAmount.toLocaleString('en-IN')}</span>
    </div>
    <div class="row font-bold">
      <span>এই চালানে বাকি:</span>
      <span>৳ ${sale.dueAmount.toLocaleString('en-IN')}</span>
    </div>

    ${
      partyPreviousBalance !== 0
        ? `
      <div class="divider"></div>
      <div class="row">
        <span>পূর্বের বাকি/পাওনা:</span>
        <span>৳ ${partyPreviousBalance.toLocaleString('en-IN')}</span>
      </div>
      <div class="row font-bold" style="font-size: 12px;">
        <span>সর্বমোট পার্টির দেনা:</span>
        <span>৳ ${currentTotalDue.toLocaleString('en-IN')}</span>
      </div>
    `
        : ''
    }

    <div class="double-divider"></div>
    <div class="row" style="margin-top: 25px;">
      <span style="border-top: 1px dotted #000; padding-top: 2px;">ড্রাইভারের স্বাক্ষর</span>
      <span style="border-top: 1px dotted #000; padding-top: 2px;">কর্তৃপক্ষের স্বাক্ষর</span>
    </div>

    <div class="footer">
      মাল বুঝিয়া পাইলাম ও পাঠাইলাম।<br>
      ${business.invoiceFooterNote || 'সততাই ব্যবসার মূলধন। ধন্যবাদ।'}<br>
      Digital System by Paddy Trading POS
    </div>
  `;
}

/**
 * Web Bluetooth Thermal Printer Connector (Direct POS-58 / ESC-POS connection)
 */
export async function connectBluetoothPrinter(): Promise<boolean> {
  if (!('bluetooth' in navigator)) {
    throw new Error('আপনার ব্রাউজার Web Bluetooth সমর্থন করে না। দয়া করে Chrome বা Edge ব্যবহার করুন।');
  }

  try {
    const nav = navigator as unknown as { bluetooth: { requestDevice: (opt: unknown) => Promise<unknown> } };
    const device = await nav.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb', '49535343-fe7d-4ae5-8fa9-9fafd205e455'],
    });
    console.log('Bluetooth Thermal Printer Paired:', device);
    return true;
  } catch (err) {
    console.warn('Bluetooth pairing cancelled or failed:', err);
    throw err;
  }
}
