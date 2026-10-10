import React, { useState } from 'react';
import { 
  X, 
  Printer, 
  Share2, 
  MessageSquare, 
  FileText, 
  Send, 
  CheckCircle, 
  ExternalLink,
  Smartphone
} from 'lucide-react';
import { Purchase, Sale } from '../types';
import { useData } from '../context/DataContext';
import { 
  printThermalReceipt, 
  buildPurchaseMemoHtml, 
  buildSaleChallanHtml 
} from '../utils/thermalPrinter';
import { printFullDocument } from '../utils/pdfExport';
import { 
  generateFarmerPurchaseSMS, 
  generateBuyerDispatchSMS, 
  getWhatsAppShareUrl, 
  getDirectSMSUrl, 
  sendGatewaySMS 
} from '../utils/sms';
import { formatCurrency } from '../utils/weight';
import { playPrintSound } from '../utils/sound';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'purchase' | 'sale';
  item: Purchase | Sale | null;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  isOpen,
  onClose,
  type,
  item,
}) => {
  const { settings, sellers, parties, getSellerStats } = useData();
  const [smsSending, setSmsSending] = useState(false);
  const [smsResult, setSmsResult] = useState<string | null>(null);

  if (!isOpen || !item) return null;

  const isPurchase = type === 'purchase';
  const purchase = isPurchase ? (item as Purchase) : null;
  const sale = !isPurchase ? (item as Sale) : null;

  // Find previous balance & entity info
  let previousBalance = 0;
  let targetPhone = '';
  let entityName = '';

  if (purchase) {
    const sId = purchase.sellerId || purchase.farmerId || '';
    const s = sellers.find(seller => seller.id === sId);
    const stats = sId ? getSellerStats(sId) : null;
    const bill = purchase.totalBill || purchase.totalAmount || 0;
    previousBalance = stats ? Math.max(0, stats.currentDue - bill) : 0;
    targetPhone = purchase.sellerPhone || purchase.farmerPhone || s?.phone || '';
    entityName = purchase.sellerName || purchase.farmerName || s?.name || '';
  } else if (sale) {
    const p = parties.find(party => party.id === sale.partyId);
    previousBalance = Math.max(0, (sale.dueAmount || 0));
    targetPhone = sale.partyPhone || p?.phone || '';
    entityName = sale.partyName || p?.name || '';
  }

  // Pre-generate SMS text
  const totalDueForSms = purchase 
    ? previousBalance + (purchase.totalBill || purchase.totalAmount || 0)
    : (sale?.dueAmount || 0);

  const smsText = purchase
    ? generateFarmerPurchaseSMS(purchase, settings, totalDueForSms)
    : sale
    ? generateBuyerDispatchSMS(sale, settings, totalDueForSms)
    : '';

  const whatsAppUrl = getWhatsAppShareUrl(targetPhone, smsText);
  const directSMSUrl = getDirectSMSUrl(targetPhone, smsText);

  // Trigger Thermal Printer
  const handlePrintThermal = () => {
    playPrintSound();
    if (purchase) {
      const html = buildPurchaseMemoHtml(purchase, settings, previousBalance);
      printThermalReceipt(html, settings.thermalPrinterWidth || 58);
    } else if (sale) {
      const html = buildSaleChallanHtml(sale, settings, previousBalance);
      printThermalReceipt(html, settings.thermalPrinterWidth || 58);
    }
  };

  // Trigger A4 Document Print
  const handlePrintA4 = () => {
    playPrintSound();
    if (purchase) {
      const title = `ক্রয় মেমো - ${purchase.invoiceNumber}`;
      const content = `
        <div class="header">
          <h1 class="business-name">${settings.businessName}</h1>
          <p class="subtext">প্রোপ্রাইটর: ${settings.proprietor} | মোবাইল: ${settings.phone}</p>
          <p class="subtext">${settings.address}</p>
          <div class="badge">ধান ক্রয়ের পাকা মেমো</div>
        </div>

        <div style="display: flex; justify-content: space-between; margin-bottom: 15px;">
          <div>
            <p><strong>মেমো নং:</strong> ${purchase.invoiceNumber}</p>
            <p><strong>বিক্রেতার নাম:</strong> ${purchase.sellerName || purchase.farmerName}</p>
            <p><strong>মোবাইল:</strong> ${purchase.sellerPhone || purchase.farmerPhone || '---'}</p>
          </div>
          <div style="text-align: right;">
            <p><strong>তারিখ:</strong> ${purchase.date}${purchase.time ? ` (${purchase.time})` : ''}</p>
            <p><strong>পেমেন্ট মেথড:</strong> ${purchase.paymentMethod || 'খতিয়ান লেজার'}</p>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>ক্রমিক</th>
              <th>ধানের বিবরণ ও জাত</th>
              <th>ওজন (মন ও কেজি)</th>
              <th>মোট মন</th>
              <th class="text-right">দর (টাকা/মন)</th>
              <th class="text-right">মোট টাকা</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>১</td>
              <td class="font-bold">${purchase.paddyType || purchase.varietyName}</td>
              <td>${purchase.weightMon || purchase.totalMon} মন ${purchase.weightKg && purchase.weightKg > 0 ? purchase.weightKg + ' কেজি' : ''}</td>
              <td>${purchase.totalMon} মন</td>
              <td class="text-right">৳ ${purchase.ratePerMon.toLocaleString('en-IN')}</td>
              <td class="text-right font-bold">৳ ${(purchase.totalBill || purchase.totalAmount || 0).toLocaleString('en-IN')}</td>
            </tr>
          </tbody>
        </table>

        <div style="display: flex; justify-content: flex-end; margin-top: 15px;">
          <div class="summary-card" style="width: 320px;">
            ${(purchase.deductions && purchase.deductions > 0) ? `
              <div style="display: flex; justify-content: space-between; margin-bottom: 4px; color: #dc2626; font-size: 11px;">
                <span>কর্তন:</span>
                <span>- ৳ ${purchase.deductions.toLocaleString('en-IN')}</span>
              </div>
            ` : ''}
            ${(purchase.laborCost && purchase.laborCost > 0) ? `
              <div style="display: flex; justify-content: space-between; margin-bottom: 4px; color: #d97706; font-size: 11px;">
                <span>লেবার খরচ:</span>
                <span>- ৳ ${purchase.laborCost.toLocaleString('en-IN')}</span>
              </div>
            ` : ''}
            <div style="display: flex; justify-content: space-between; margin-bottom: 6px; font-weight: bold; font-size: 13px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">
              <span>সর্বমোট বিল:</span>
              <span class="font-bold">৳ ${(purchase.totalBill || purchase.totalAmount || 0).toLocaleString('en-IN')}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 5px; color: #059669; font-weight: bold; font-size: 12px;">
              <span>নগদ পরিশোধ:</span>
              <span>৳ ${(purchase.instantPayment || purchase.paidAmount || 0).toLocaleString('en-IN')}</span>
            </div>
            <div style="display: flex; justify-content: space-between; border-top: 1px dashed #cbd5e1; padding-top: 5px; font-weight: bold; font-size: 13px; color: ${(purchase.dueAmount ?? Math.max(0, (purchase.totalBill || purchase.totalAmount || 0) - (purchase.instantPayment || purchase.paidAmount || 0))) > 0 ? '#dc2626' : '#059669'};">
              <span>অবশিষ্ট দেনা / বকেয়া:</span>
              <span>৳ ${(purchase.dueAmount ?? Math.max(0, (purchase.totalBill || purchase.totalAmount || 0) - (purchase.instantPayment || purchase.paidAmount || 0))).toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>

        <div class="footer">
          <div class="signature-box">বিক্রেতার স্বাক্ষর</div>
          <div class="signature-box">আড়তদারের স্বাক্ষর ও সিল</div>
        </div>
      `;
      printFullDocument(title, content);
    } else if (sale) {
      const title = `বিক্রি চালান ও গেটপাস - ${sale.challanNumber}`;
      const content = `
        <div class="header">
          <h1 class="business-name">${settings.businessName}</h1>
          <p class="subtext">প্রোপ্রাইটর: ${settings.proprietor} | মোবাইল: ${settings.phone}</p>
          <p class="subtext">${settings.address}</p>
          <div class="badge">ধান বিক্রয় ও ট্রাক চালানি মেমো</div>
        </div>

        <div style="display: flex; justify-content: space-between; margin-bottom: 15px;">
          <div>
            <p><strong>চালান নং:</strong> ${sale.challanNumber}</p>
            <p><strong>ক্রেতা/পার্টি:</strong> ${sale.partyName}</p>
            <p><strong>মোবাইল:</strong> ${sale.partyPhone}</p>
          </div>
          <div style="text-align: right;">
            <p><strong>তারিখ:</strong> ${sale.date}</p>
            <p><strong>ট্রাক নম্বর:</strong> ${sale.transportTruckNo || 'স্বহস্তে/ভ্যান'}</p>
            <p><strong>চালক:</strong> ${sale.transportDriverName || '---'} (${sale.transportDriverPhone || ''})</p>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>ক্রমিক</th>
              <th>ধানের জাত</th>
              <th>বস্তার সংখ্যা</th>
              <th>মোট ওজন (মন)</th>
              <th class="text-right">দর (টাকা/মন)</th>
              <th class="text-right">মোট টাকা</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>১</td>
              <td class="font-bold">${sale.varietyName}</td>
              <td>${sale.bagCount} বস্তা ${sale.perBagWeight ? `<br><span style="font-size: 10px; color: #64748b;">(প্রতিটি ${sale.perBagWeight} ${sale.perBagUnit === 'kg' ? 'কেজি' : 'মন'})</span>` : ''}</td>
              <td>${sale.totalMon} মন</td>
              <td class="text-right">৳ ${sale.ratePerMon.toLocaleString('en-IN')}</td>
              <td class="text-right font-bold">৳ ${sale.totalAmount.toLocaleString('en-IN')}</td>
            </tr>
          </tbody>
        </table>

        <div style="display: flex; justify-content: space-between; margin-top: 15px;">
          <div class="summary-card" style="width: 300px;">
            <p class="font-bold" style="margin-bottom: 4px;">পরিবহন খরচ:</p>
            <p>ট্রাক ভাড়া: ৳ ${sale.transportTruckFare || 0}</p>
            <p>ভাড়া পরিশোধ: ${sale.farePaidBy === 'seller' ? 'আড়ত কর্তৃক পরিশোধিত' : 'ক্রেতা পরিশোধ করবে'}</p>
          </div>
          <div class="summary-card" style="width: 280px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
              <span>মোট বিক্রয় মূল্য:</span>
              <span class="font-bold">৳ ${sale.totalAmount.toLocaleString('en-IN')}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
              <span>নগদ আদায়:</span>
              <span style="color: #059669; font-weight: bold;">৳ ${sale.receivedAmount.toLocaleString('en-IN')}</span>
            </div>
            <div style="display: flex; justify-content: space-between; border-top: 1px dashed #cbd5e1; padding-top: 5px;">
              <span>অবশিষ্ট পাওনা:</span>
              <span style="color: #dc2626; font-weight: bold;">৳ ${sale.dueAmount.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>

        <div class="footer">
          <div class="signature-box">চালকের স্বাক্ষর</div>
          <div class="signature-box">আড়তদারের স্বাক্ষর ও সিল</div>
        </div>
      `;
      printFullDocument(title, content);
    }
  };

  // Handle Gateway SMS Dispatch
  const handleSendGatewaySMS = async () => {
    if (!targetPhone) return;
    setSmsSending(true);
    setSmsResult(null);
    try {
      const res = await sendGatewaySMS(targetPhone, smsText, settings);
      if (res.success) {
        setSmsResult(`সফলভাবে SMS পাঠানো হয়েছে! (ID: ${res.messageId})`);
      } else {
        setSmsResult(`ত্রুটি: ${res.error || 'পাঠানো যায়নি'}`);
      }
    } catch (err) {
      setSmsResult('SMS গেটওয়েতে সমস্যা দেখা দিয়েছে');
    } finally {
      setSmsSending(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-emerald-900 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Printer className="w-5 h-5 text-amber-300" />
            <h3 className="font-bold text-base sm:text-lg">
              {isPurchase ? `ক্রয় মেমো (${purchase?.invoiceNumber})` : `বিক্রি চালান (${sale?.challanNumber})`}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-emerald-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4">
          {/* Quick Details Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm space-y-2">
            <div className="flex justify-between items-center text-slate-600">
              <span>তারিখ ও সময়:</span>
              <span className="font-bold text-slate-800">
                {isPurchase ? `${purchase?.date}${purchase?.time ? ` (${purchase.time})` : ''}` : sale?.date}
              </span>
            </div>
            <div className="flex justify-between items-center text-slate-600">
              <span>{isPurchase ? 'ধান বিক্রেতা:' : 'ক্রেতা (পার্টি):'}</span>
              <span className="font-bold text-slate-900">{entityName}</span>
            </div>
            <div className="flex justify-between items-center text-slate-600">
              <span>মোবাইল নম্বর:</span>
              <span className="font-medium text-slate-800">{targetPhone || 'দেওয়া হয়নি'}</span>
            </div>
            <div className="flex justify-between items-center text-slate-600">
              <span>ধানের জাত ও পরিমাণ:</span>
              <span className="font-bold text-emerald-800">
                {isPurchase
                  ? `${purchase?.varietyName} (${purchase?.weightMon} মন ${purchase?.weightKg || 0} কেজি)`
                  : `${sale?.varietyName} (${sale?.bagCount} বস্তা, ${sale?.totalMon} মন)`}
              </span>
            </div>
            <div className="flex justify-between items-center text-slate-600 border-t border-slate-200 pt-2 font-semibold">
              <span>মোট টাকা:</span>
              <span className="text-base font-bold text-slate-900">
                {formatCurrency(isPurchase ? (purchase?.totalBill || purchase?.totalAmount || 0) : sale?.totalAmount)}
              </span>
            </div>
            <div className="flex justify-between items-center text-xs pt-0.5">
              <span className="text-emerald-700 font-bold">
                নগদ প্রদান/আদায়: {formatCurrency(isPurchase ? (purchase?.instantPayment ?? purchase?.paidAmount ?? 0) : sale?.receivedAmount)}
              </span>
              <span className={`font-bold ${(isPurchase ? (typeof purchase?.dueAmount === 'number' ? purchase.dueAmount : Math.max(0, (purchase?.totalBill || purchase?.totalAmount || 0) - (purchase?.instantPayment || purchase?.paidAmount || 0))) : (sale?.dueAmount || 0)) > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                বাকি: {formatCurrency(isPurchase ? (typeof purchase?.dueAmount === 'number' ? purchase.dueAmount : Math.max(0, (purchase?.totalBill || purchase?.totalAmount || 0) - (purchase?.instantPayment || purchase?.paidAmount || 0))) : (sale?.dueAmount || 0))}
              </span>
            </div>
          </div>

          {/* Action Buttons: Thermal & A4 Print */}
          <div className="grid grid-cols-2 gap-2.5">
            <button
              onClick={handlePrintThermal}
              className="flex items-center justify-center space-x-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow transition active:scale-95"
            >
              <Printer className="w-4 h-4 text-amber-200" />
              <span>থার্মাল প্রিন্ট ({settings.thermalPrinterWidth || 58}mm)</span>
            </button>
            <button
              onClick={handlePrintA4}
              className="flex items-center justify-center space-x-2 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-sm shadow transition active:scale-95"
            >
              <FileText className="w-4 h-4 text-sky-300" />
              <span>A4 মেমো / PDF</span>
            </button>
          </div>

          {/* Digital Share Section: WhatsApp & SMS */}
          <div className="border-t border-slate-200 pt-3 space-y-3">
            <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider">
              ডিজিটাল শেয়ার ও মেসেজ (Instant Share)
            </h4>

            <div className="grid grid-cols-2 gap-2.5">
              {/* WhatsApp direct link */}
              <a
                href={whatsAppUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center space-x-2 py-2.5 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-xs transition shadow-sm active:scale-95"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>WhatsApp মেমো পাঠান</span>
              </a>

              {/* Direct Phone SMS link */}
              <a
                href={directSMSUrl}
                className="flex items-center justify-center space-x-2 py-2.5 px-3 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs transition shadow-sm active:scale-95"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>মোবাইল SMS অ্যাপে</span>
              </a>
            </div>

            {/* Gateway Automated SMS Button */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-amber-950 flex items-center space-x-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-amber-700" />
                  <span>সার্ভার SMS গেটওয়ে টেস্ট</span>
                </span>
                <button
                  onClick={handleSendGatewaySMS}
                  disabled={smsSending || !targetPhone}
                  className="px-3 py-1 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-lg font-bold transition flex items-center space-x-1"
                >
                  <Send className="w-3 h-3" />
                  <span>{smsSending ? 'পাঠানো হচ্ছে...' : 'SMS পাঠান'}</span>
                </button>
              </div>

              {smsResult && (
                <p className="text-[11px] font-medium text-emerald-800 bg-emerald-100/70 p-1.5 rounded">
                  {smsResult}
                </p>
              )}

              <p className="text-[11px] text-amber-800/80 leading-relaxed">
                বার্তা প্রিভিউ: "{smsText.substring(0, 110)}..."
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-100 px-5 py-3 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg border border-slate-300 text-slate-700 font-semibold text-xs hover:bg-slate-200 transition"
          >
            বন্ধ করুন (Close)
          </button>
        </div>
      </div>
    </div>
  );
};
