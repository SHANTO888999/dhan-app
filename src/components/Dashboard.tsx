import React, { useState } from 'react';
import { 
  ShoppingBag, 
  Truck, 
  Warehouse, 
  Calendar, 
  Coins, 
  TrendingUp, 
  TrendingDown, 
  Share2, 
  PlusCircle, 
  Printer, 
  FileText, 
  MessageSquare, 
  Send, 
  Smartphone, 
  CheckCircle, 
  AlertTriangle, 
  X, 
  Wheat 
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { useThemeLanguage } from '../context/ThemeLanguageContext';
import { ActiveTab, PurchaseMemo, Sale } from '../types';
import { formatCurrency, toBengaliNumber } from '../utils/weight';
import { printThermalReceipt } from '../utils/thermalPrinter';
import { printFullDocument } from '../utils/pdfExport';
import { sendGatewaySMS } from '../utils/sms';
import { ConfirmationModal } from './ConfirmationModal';

export interface DashboardProps {
  setActiveTab: (tab: ActiveTab) => void;
  onOpenQuickPurchase: () => void;
  onOpenQuickSale: () => void;
  onViewReceipt: (type: 'purchase' | 'sale', item: PurchaseMemo | Sale) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  setActiveTab,
  onOpenQuickPurchase,
  onOpenQuickSale,
  onViewReceipt,
}) => {
  const { 
    purchases, 
    sales, 
    sellers, 
    parties, 
    varieties, 
    cashLogs, 
    cashInHand,
    totalCurrentDue,
    addCashEntry,
    deleteCashEntry,
    settings 
  } = useData();

  const { t } = useThemeLanguage();

  // Floating Cash Modal State (+ ক্যাশ এন্ট্রি)
  const [isCashModalOpen, setIsCashModalOpen] = useState(false);
  const [cashAmount, setCashAmount] = useState<number | ''>('');
  const [cashType, setCashType] = useState<'IN' | 'OUT'>('IN');
  const [cashSource, setCashSource] = useState('হাটের প্রারম্ভিক ক্যাশ জমা (ব্যাংক উত্তোলন)');
  const [cashNote, setCashNote] = useState('');
  const [cashDate, setCashDate] = useState(new Date().toISOString().split('T')[0]);

  // Cash Book Ledger Modal
  const [isCashBookOpen, setIsCashBookOpen] = useState(false);

  // UNIFIED SUMMARY MODAL POPUP STATE (Triggered by "আজকের সামারি ও শেয়ার" button)
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
  const [smsRecipientPhone, setSmsRecipientPhone] = useState(settings.phone || '');
  const [serverSmsLoading, setServerSmsLoading] = useState(false);
  const [serverSmsMessage, setServerSmsMessage] = useState<string | null>(null);

  // Delete Cash Entry Confirm Modal
  const [deleteCashId, setDeleteCashId] = useState<string | null>(null);

  const todayStr = new Date().toISOString().split('T')[0];

  // Stock and Valuation
  const totalStockMon = varieties.reduce((acc, v) => acc + Math.max(0, v.currentStockMon || 0), 0);

  // Low stock varieties (below threshold)
  const lowStockVarieties = varieties.filter(v => v.currentStockMon <= (v.lowStockThreshold || settings.lowStockAlertMon || 50));

  // 1. Today's Purchases Calculation
  const todayPurchasesList = purchases.filter(p => p.date === todayStr);
  const todayPurchaseAmount = todayPurchasesList.reduce((acc, p) => acc + (p.totalBill || p.totalAmount || 0), 0);
  const todayPurchaseMon = todayPurchasesList.reduce((acc, p) => acc + (p.totalMon || p.quantityMon || 0), 0);

  // 2. Today's Sales Calculation
  const todaySalesList = sales.filter(s => s.date === todayStr);
  const todaySalesAmount = todaySalesList.reduce((acc, s) => acc + (s.totalAmount || 0), 0);
  const todaySaleMon = todaySalesList.reduce((acc, s) => acc + (s.totalMon || 0), 0);

  // 3. Today's Expenses / Outflows Calculation
  const todayCashOut = cashLogs
    .filter(c => c.type === 'OUT' && (c.date === todayStr || (c.createdAt && c.createdAt.startsWith(todayStr))))
    .reduce((acc, c) => acc + c.amount, 0);

  // 4. Today's Estimated Net Profit/Loss: (Today's Sales - Today's Paddy Purchases - Today's Expenses)
  const todayNetProfit = todaySalesAmount - todayPurchaseAmount - todayCashOut;

  // Recent 5 memos and sales
  const recentPurchases = purchases.slice(0, 5);
  const recentSales = sales.slice(0, 5);

  // Floating cash submission
  const handleAddCash = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = typeof cashAmount === 'number' ? cashAmount : 0;
    if (num <= 0) {
      alert(t('সঠিক ক্যাশের পরিমাণ লিখুন।', 'Please enter a valid amount.'));
      return;
    }
    await addCashEntry({
      type: cashType,
      amount: num,
      sourceOrRecipient: cashSource.trim() || (cashType === 'IN' ? 'ক্যাশ জমা' : 'খরচ'),
      date: cashDate,
      note: cashNote.trim(),
    });
    setIsCashModalOpen(false);
    setCashAmount('');
    setCashNote('');
  };

  // Structured Summary Text for WhatsApp / SMS
  const generateDailySummaryText = () => {
    const formattedDate = new Date().toLocaleDateString('bn-BD', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    return `*${settings.businessName}*
📅 *দৈনিক সমাপনী হিসাব (${formattedDate})*
━━━━━━━━━━━━━━━━━━
🌾 *আজকের মোট ধান কেনা:* ${toBengaliNumber(todayPurchaseMon.toFixed(1))} মন (৳${toBengaliNumber(todayPurchaseAmount)})
🚛 *আজকের চালানি বিক্রি:* ৳${toBengaliNumber(todaySalesAmount)} (${toBengaliNumber(todaySaleMon.toFixed(1))} মন)
💸 *আজকের মোট খরচ/পরিশোধ:* ৳${toBengaliNumber(todayCashOut)}
📈 *আজকের আনুমানিক লাভ/ক্ষতি:* ${todayNetProfit >= 0 ? '+' : ''}৳${toBengaliNumber(todayNetProfit)}
━━━━━━━━━━━━━━━━━━
💵 *হাতে অবশিষ্ট নগদ:* ৳${toBengaliNumber(cashInHand)}
🌾 *গুদামে মোট মজুদ ধান:* ${toBengaliNumber(totalStockMon.toFixed(1))} মন
🏦 *আড়তের সর্বমোট দেনা:* ৳${toBengaliNumber(totalCurrentDue)}
━━━━━━━━━━━━━━━━━━
${settings.invoiceFooterNote || 'ধন্যবাদ।'}`;
  };

  const summaryText = generateDailySummaryText();

  // WhatsApp Trigger
  const handleShareWhatsApp = () => {
    const url = `https://wa.me/?text=${encodeURIComponent(summaryText)}`;
    window.open(url, '_blank');
  };

  // Native Mobile SMS App Trigger
  const handleMobileSMS = () => {
    const cleanPhone = (smsRecipientPhone || '').replace(/[^0-9+]/g, '');
    const smsUrl = `sms:${cleanPhone}?body=${encodeURIComponent(summaryText)}`;
    window.location.href = smsUrl;
  };

  // Thermal Print (58mm) Trigger
  const handlePrintThermal = () => {
    const html = `
      <div class="text-center">
        <div class="title">${settings.businessName}</div>
        <div class="subtitle">${settings.address || 'ধানের আড়ত'} | মোবা: ${settings.phone}</div>
        <div class="double-divider"></div>
        <div class="font-bold" style="font-size: 13px;">দৈনিক সমাপনী হিসাব সামারি</div>
        <div style="font-size: 10px;">তারিখ: ${new Date().toLocaleDateString('bn-BD')}</div>
        <div class="divider"></div>
      </div>
      <div class="row">
        <span>আজকের মোট ধান কেনা:</span>
        <span class="font-bold">${toBengaliNumber(todayPurchaseMon.toFixed(1))} মণ</span>
      </div>
      <div class="row">
        <span>আজকের ধান ক্রয় বিল:</span>
        <span class="font-bold">৳ ${todayPurchaseAmount.toLocaleString('en-IN')}</span>
      </div>
      <div class="row">
        <span>আজকের চালানি বিক্রি:</span>
        <span class="font-bold">৳ ${todaySalesAmount.toLocaleString('en-IN')}</span>
      </div>
      <div class="row">
        <span>আজকের মোট খরচ/পরিশোধ:</span>
        <span class="font-bold">৳ ${todayCashOut.toLocaleString('en-IN')}</span>
      </div>
      <div class="divider"></div>
      <div class="row" style="font-size: 12px; font-weight: bold;">
        <span>আজকের আনুমানিক লাভ/ক্ষতি:</span>
        <span>${todayNetProfit >= 0 ? '+' : ''}৳ ${todayNetProfit.toLocaleString('en-IN')}</span>
      </div>
      <div class="row" style="font-size: 12px; font-weight: bold;">
        <span>হাতে অবশিষ্ট নগদ:</span>
        <span>৳ ${cashInHand.toLocaleString('en-IN')}</span>
      </div>
      <div class="row">
        <span>গুদামে মোট মজুদ ধান:</span>
        <span>${toBengaliNumber(totalStockMon.toFixed(1))} মণ</span>
      </div>
      <div class="row">
        <span>সর্বমোট দেনা/বকেয়া:</span>
        <span>৳ ${totalCurrentDue.toLocaleString('en-IN')}</span>
      </div>
      <div class="double-divider"></div>
      <div class="footer">${settings.invoiceFooterNote || 'ধন্যবাদ।'}</div>
    `;
    printThermalReceipt(html, 58);
  };

  // Full A4 Report PDF Print Trigger
  const handlePrintA4 = () => {
    const title = `দৈনিক হিসাব সমাপনী প্রতিবেদন - ${todayStr}`;
    const html = `
      <div class="header">
        <h1 class="business-name">${settings.businessName}</h1>
        <p class="subtext">প্রোপ্রাইটর: ${settings.proprietor} | মোবাইল: ${settings.phone}</p>
        <p class="subtext">${settings.address}</p>
        <div class="badge">দৈনিক হিসাব সমাপনী বিবরণী</div>
        <p style="margin-top: 6px; font-size: 12px; color: #64748b;">তারিখ: ${new Date().toLocaleDateString('bn-BD', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>

      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 20px;">
        <div class="summary-card">
          <h3 style="margin-top: 0; color: #0f172a; font-size: 14px; border-bottom: 1px solid #cbd5e1; padding-bottom: 5px;">আজকের ক্রয় ও বিক্রি কার্যক্রম</h3>
          <p><strong>মোট ধান কেনা:</strong> ${toBengaliNumber(todayPurchaseMon.toFixed(1))} মণ (${toBengaliNumber(todayPurchasesList.length)}টি মেমো)</p>
          <p><strong>ধান ক্রয় বিল:</strong> ৳ ${todayPurchaseAmount.toLocaleString('en-IN')}</p>
          <p><strong>চালানি বিক্রি:</strong> ৳ ${todaySalesAmount.toLocaleString('en-IN')} (${toBengaliNumber(todaySaleMon.toFixed(1))} মণ)</p>
          <p><strong>আজকের মোট খরচ/পরিশোধ:</strong> ৳ ${todayCashOut.toLocaleString('en-IN')}</p>
        </div>

        <div class="summary-card">
          <h3 style="margin-top: 0; color: #0f172a; font-size: 14px; border-bottom: 1px solid #cbd5e1; padding-bottom: 5px;">আজকের তহবিল ও আর্থিক স্থিতি</h3>
          <p><strong>আজকের আনুমানিক লাভ/ক্ষতি:</strong> <span style="font-weight: bold; color: ${todayNetProfit >= 0 ? '#15803d' : '#b91c1c'};">${todayNetProfit >= 0 ? '+' : ''}৳ ${todayNetProfit.toLocaleString('en-IN')}</span></p>
          <p><strong>হাতে অবশিষ্ট নগদ (ক্যাশ):</strong> <span style="font-size: 15px; font-weight: bold; color: #0f172a;">৳ ${cashInHand.toLocaleString('en-IN')}</span></p>
          <p><strong>গুদামে মোট মজুদ ধান:</strong> ${toBengaliNumber(totalStockMon.toFixed(1))} মণ</p>
          <p><strong>সর্বমোট বকেয়া দেনা:</strong> ৳ ${totalCurrentDue.toLocaleString('en-IN')}</p>
        </div>
      </div>

      <div class="footer" style="margin-top: 50px; display: flex; justify-content: space-between;">
        <div class="signature-box" style="border-top: 1px solid #000; width: 180px; text-align: center; padding-top: 5px;">হিসাবরক্ষকের স্বাক্ষর</div>
        <div class="signature-box" style="border-top: 1px solid #000; width: 180px; text-align: center; padding-top: 5px;">আড়তদারের স্বাক্ষর ও সিল</div>
      </div>
    `;
    printFullDocument(title, html);
  };

  // Server SMS Gateway Dispatch Trigger
  const handleSendServerSMS = async () => {
    if (!smsRecipientPhone.trim()) {
      alert(t('প্রাপকের মোবাইল নম্বর লিখুন।', 'Please enter recipient phone number.'));
      return;
    }
    setServerSmsLoading(true);
    setServerSmsMessage(null);
    try {
      const res = await sendGatewaySMS(smsRecipientPhone.trim(), summaryText, settings);
      if (res.success) {
        setServerSmsMessage('✓ সার্ভার SMS সফলভাবে পাঠানো হয়েছে!');
      } else {
        setServerSmsMessage(`ত্রুটি: ${res.error || 'SMS গেটওয়ে সমস্যা'}`);
      }
    } catch {
      setServerSmsMessage('SMS পাঠানো সম্ভব হয়নি');
    } finally {
      setServerSmsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* 1. DASHBOARD TOP BANNER & DIV CLEANUP (Extremely Compact, Minimal, High-Density) */}
      <div className="bg-gradient-to-r from-emerald-950 via-emerald-900 to-teal-950 rounded-2xl py-2.5 px-4 text-white shadow-md border border-emerald-800/80 flex items-center justify-between gap-3">
        <div className="flex items-center space-x-3 min-w-0">
          <div className="p-1.5 rounded-xl bg-amber-400/20 text-amber-300 shrink-0">
            <Wheat className="w-5 h-5 text-amber-400" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center space-x-2">
              <h2 className="text-base sm:text-lg font-black tracking-tight text-white leading-tight truncate">
                {settings.businessName || 'ধানের আড়ত ম্যানেজমেন্ট'}
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-emerald-800/80 text-emerald-300 text-[10px] font-bold border border-emerald-700/60 shrink-0">
                {new Date().toLocaleDateString('bn-BD', { weekday: 'short', day: 'numeric', month: 'short' })}
              </span>
            </div>
          </div>
        </div>

        {/* ONLY ONE Single Primary Action Button */}
        <button
          type="button"
          onClick={() => setIsSummaryModalOpen(true)}
          className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold py-1.5 px-3 rounded-lg text-xs transition active:scale-95 shadow-xs flex items-center space-x-1.5 cursor-pointer shrink-0"
        >
          <Share2 className="w-3.5 h-3.5" />
          <span>আজকের সামারি ও শেয়ার</span>
        </button>
      </div>

      {/* Low Stock Alert Banner (Only when needed) */}
      {lowStockVarieties.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/40 rounded-xl py-2 px-3 flex items-center justify-between text-amber-300 text-xs animate-in fade-in">
          <div className="flex items-center space-x-2 truncate">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="truncate">
              <b>{t('সতর্কতা: ', 'Alert: ')}</b>
              {lowStockVarieties.map(v => `${v.name} (${toBengaliNumber(v.currentStockMon.toFixed(1))} মন)`).join(', ')}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setActiveTab('stock')}
            className="px-2.5 py-1 rounded-lg bg-amber-400 hover:bg-amber-300 text-emerald-950 font-bold text-[11px] shrink-0 transition"
          >
            {t('স্টক দেখুন', 'View Stock')}
          </button>
        </div>
      )}

      {/* 2. 4-COLUMN SYMMETRIC MULTI-COLOR POS CARDS (High-Density Layout) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Card 1 (Emerald/Green): 💵 হাতে অবশিষ্ট নগদ (Cash in Hand) */}
        <div className="bg-emerald-950/80 border border-emerald-600/70 rounded-2xl py-2 px-3 text-white shadow-sm flex flex-col justify-between hover:border-emerald-400 transition min-h-[96px]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider flex items-center space-x-1">
              <Coins className="w-3.5 h-3.5 text-emerald-400" />
              <span>{t('💵 হাতে অবশিষ্ট নগদ', 'Cash in Hand')}</span>
            </span>
            <button
              type="button"
              onClick={() => setIsCashModalOpen(true)}
              className="text-[10px] font-black text-amber-300 hover:text-white bg-emerald-900/90 hover:bg-emerald-800 px-2 py-0.5 rounded-md border border-emerald-700/80 transition cursor-pointer flex items-center space-x-0.5"
            >
              <PlusCircle className="w-3 h-3 text-amber-300" />
              <span>+ ক্যাশ এন্ট্রি</span>
            </button>
          </div>

          <div className="my-1">
            <div className="text-xl sm:text-2xl font-black text-amber-300 tracking-tight leading-tight">
              {formatCurrency(cashInHand)}
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-emerald-400/90 pt-1 border-t border-emerald-900/60">
            <span>{t('রিয়েল-টাইম নগদ তহবিল', 'Real-time cash balance')}</span>
            <button
              type="button"
              onClick={() => setIsCashBookOpen(true)}
              className="text-emerald-300 hover:text-white font-bold hover:underline cursor-pointer"
            >
              ক্যাশ বুক ➔
            </button>
          </div>
        </div>

        {/* Card 2 (Blue): 🌾 আজকের মোট কেনা (Today's Purchase) */}
        <div className="bg-blue-950/80 border border-blue-600/70 rounded-2xl py-2 px-3 text-white shadow-sm flex flex-col justify-between hover:border-blue-400 transition min-h-[96px]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-blue-300 uppercase tracking-wider flex items-center space-x-1">
              <ShoppingBag className="w-3.5 h-3.5 text-blue-400" />
              <span>{t('🌾 আজকের মোট কেনা', "Today's Purchase")}</span>
            </span>
            <span className="px-1.5 py-0.5 rounded-md bg-blue-900/80 text-[10px] font-bold text-blue-200 border border-blue-800">
              {toBengaliNumber(todayPurchasesList.length)} মেমো
            </span>
          </div>

          <div className="my-1">
            <div className="text-xl sm:text-2xl font-black text-white tracking-tight leading-tight">
              {formatCurrency(todayPurchaseAmount)}
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-blue-300/90 pt-1 border-t border-blue-900/60">
            <span>
              {t('ওজন: ', 'Weight: ')}<b>{toBengaliNumber(todayPurchaseMon.toFixed(1))} {t('মণ', 'Mon')}</b>
            </span>
            <button
              type="button"
              onClick={onOpenQuickPurchase}
              className="text-amber-300 hover:text-white font-bold hover:underline cursor-pointer"
            >
              + নতুন কেনা
            </button>
          </div>
        </div>

        {/* Card 3 (Orange/Amber): 🚛 আজকের চালানি বিক্রি (Today's Sales) */}
        <div className="bg-amber-950/80 border border-amber-600/70 rounded-2xl py-2 px-3 text-white shadow-sm flex flex-col justify-between hover:border-amber-400 transition min-h-[96px]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider flex items-center space-x-1">
              <Truck className="w-3.5 h-3.5 text-amber-400" />
              <span>{t('🚛 আজকের চালানি বিক্রি', "Today's Sales")}</span>
            </span>
            <span className="px-1.5 py-0.5 rounded-md bg-amber-900/80 text-[10px] font-bold text-amber-200 border border-amber-800">
              {toBengaliNumber(todaySalesList.length)} চালান
            </span>
          </div>

          <div className="my-1">
            <div className="text-xl sm:text-2xl font-black text-amber-300 tracking-tight leading-tight">
              {formatCurrency(todaySalesAmount)}
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-amber-300/90 pt-1 border-t border-amber-900/60">
            <span>
              {t('ওজন: ', 'Weight: ')}<b>{toBengaliNumber(todaySaleMon.toFixed(1))} {t('মণ', 'Mon')}</b>
            </span>
            <button
              type="button"
              onClick={onOpenQuickSale}
              className="text-emerald-300 hover:text-white font-bold hover:underline cursor-pointer"
            >
              + নতুন চালান
            </button>
          </div>
        </div>

        {/* Card 4 (Purple/Indigo): 📈 আজকের আনুমানিক লাভ/ক্ষতি (Net Profit/Loss) */}
        <div className="bg-purple-950/80 border border-purple-600/70 rounded-2xl py-2 px-3 text-white shadow-sm flex flex-col justify-between hover:border-purple-400 transition min-h-[96px]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-purple-300 uppercase tracking-wider flex items-center space-x-1">
              {todayNetProfit >= 0 ? (
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
              )}
              <span>{t('📈 আজকের লাভ/ক্ষতি', 'Net Profit/Loss')}</span>
            </span>
            <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold border ${
              todayNetProfit >= 0
                ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                : 'bg-rose-950 text-rose-300 border-rose-800'
            }`}>
              {todayNetProfit >= 0 ? 'লাভ' : 'ঘাটতি'}
            </span>
          </div>

          <div className="my-1">
            <div className={`text-xl sm:text-2xl font-black tracking-tight leading-tight ${
              todayNetProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}>
              {todayNetProfit >= 0 ? '+' : ''}{formatCurrency(todayNetProfit)}
            </div>
          </div>

          <div className="flex items-center justify-between text-[10px] text-purple-300/80 pt-1 border-t border-purple-900/60 truncate">
            <span className="truncate">
              {t('(বিক্রি - কেনা - খরচ)', '(Sales - Buy - Exp)')}
            </span>
            <span className="font-bold text-white shrink-0">
              {todayNetProfit >= 0 ? 'নীট লাভ' : 'নীট ঘাটতি'}
            </span>
          </div>
        </div>
      </div>

      {/* 3. RECENT ACTIVITY LISTS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Purchases */}
        <div className="bg-emerald-950/70 rounded-2xl border border-emerald-800/80 shadow-md p-4 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-emerald-800/70">
            <div className="flex items-center space-x-2">
              <ShoppingBag className="w-4 h-4 text-emerald-400" />
              <h3 className="font-bold text-sm text-white">{t('সাম্প্রতিক ধান ক্রয় মেমো', 'Recent Purchases')}</h3>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab('purchase')}
              className="text-xs text-amber-300 font-bold hover:underline"
            >
              {t('সকল দেখুন ➔', 'View All ➔')}
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-emerald-900/40 text-emerald-300 font-bold border-b border-emerald-800">
                <tr>
                  <th className="py-2 px-2.5">মেমো নং</th>
                  <th className="py-2 px-2.5">বিক্রেতা</th>
                  <th className="py-2 px-2.5">ধানের জাত</th>
                  <th className="py-2 px-2.5 text-right">ওজন</th>
                  <th className="py-2 px-2.5 text-right">মোট বিল</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald-900/40">
                {recentPurchases.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-400">
                      {t('কোনো ক্রয়ের মেমো পাওয়া যায়নি।', 'No purchases found.')}
                    </td>
                  </tr>
                ) : (
                  recentPurchases.map(p => (
                    <tr 
                      key={p.id} 
                      onClick={() => onViewReceipt('purchase', p)}
                      className="hover:bg-emerald-900/30 transition cursor-pointer"
                    >
                      <td className="py-2 px-2.5 font-mono text-amber-300 font-bold">{p.invoiceNumber}</td>
                      <td className="py-2 px-2.5 font-semibold text-white">{p.sellerName}</td>
                      <td className="py-2 px-2.5 text-emerald-300">{p.paddyType || p.varietyName}</td>
                      <td className="py-2 px-2.5 text-right font-bold text-white">
                        {toBengaliNumber((p.totalMon || p.quantityMon || 0).toFixed(1))} মন
                      </td>
                      <td className="py-2 px-2.5 text-right font-black text-amber-300">
                        {formatCurrency(p.totalBill || p.totalAmount || 0)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Sales */}
        <div className="bg-emerald-950/70 rounded-2xl border border-emerald-800/80 shadow-md p-4 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-emerald-800/70">
            <div className="flex items-center space-x-2">
              <Truck className="w-4 h-4 text-amber-400" />
              <h3 className="font-bold text-sm text-white">{t('সাম্প্রতিক চালানি বিক্রি', 'Recent Sales')}</h3>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab('sales')}
              className="text-xs text-amber-300 font-bold hover:underline"
            >
              {t('সকল দেখুন ➔', 'View All ➔')}
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-emerald-900/40 text-emerald-300 font-bold border-b border-emerald-800">
                <tr>
                  <th className="py-2 px-2.5">চালান নং</th>
                  <th className="py-2 px-2.5">পার্টি</th>
                  <th className="py-2 px-2.5">ধানের জাত</th>
                  <th className="py-2 px-2.5 text-right">বস্তা ও মন</th>
                  <th className="py-2 px-2.5 text-right">মোট বিল</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald-900/40">
                {recentSales.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-400">
                      {t('কোনো বিক্রয় চালান পাওয়া যায়নি।', 'No sales challans found.')}
                    </td>
                  </tr>
                ) : (
                  recentSales.map(s => (
                    <tr 
                      key={s.id} 
                      onClick={() => onViewReceipt('sale', s)}
                      className="hover:bg-emerald-900/30 transition cursor-pointer"
                    >
                      <td className="py-2 px-2.5 font-mono text-white font-bold">{s.challanNumber}</td>
                      <td className="py-2 px-2.5 font-semibold text-emerald-200">{s.partyName}</td>
                      <td className="py-2 px-2.5 text-emerald-300">{s.varietyName}</td>
                      <td className="py-2 px-2.5 text-right font-bold text-white">
                        {toBengaliNumber(s.bagCount)} বস্তা ({toBengaliNumber(s.totalMon.toFixed(1))} মন)
                      </td>
                      <td className="py-2 px-2.5 text-right font-black text-amber-300">
                        {formatCurrency(s.totalAmount)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. UNIFIED SUMMARY MODAL POPUP (Replicating professional receipt popup) */}
      {/* ========================================================================= */}
      {isSummaryModalOpen && (
        <div 
          className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
          onClick={(e) => e.target === e.currentTarget && setIsSummaryModalOpen(false)}
        >
          <div 
            className="bg-slate-900 border border-emerald-800 rounded-3xl shadow-2xl max-w-xl w-full p-5 sm:p-6 text-slate-100 flex flex-col max-h-[92vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-emerald-800">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-amber-400 text-slate-950">
                  <Share2 className="w-5 h-5 text-slate-950" />
                </div>
                <div>
                  <h3 className="font-black text-base sm:text-lg text-white">
                    {t('আজকের দিনের সমাপনী সামারি ও শেয়ার', 'Daily Summary & Share')}
                  </h3>
                  <p className="text-xs text-emerald-300">
                    {settings.businessName} • {new Date().toLocaleDateString('bn-BD', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSummaryModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 text-xl font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* a) Summary Details Header: Today's Paddy Purchase, Sales, Expenses, and Net Balance */}
            <div className="my-4 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="bg-emerald-950/70 border border-emerald-800/80 p-2.5 rounded-xl">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">{t('ধান কেনা', 'Purchases')}</span>
                <span className="text-sm font-black text-white block mt-0.5">{formatCurrency(todayPurchaseAmount)}</span>
                <span className="text-[10px] text-emerald-300">{toBengaliNumber(todayPurchaseMon.toFixed(1))} মণ</span>
              </div>

              <div className="bg-emerald-950/70 border border-emerald-800/80 p-2.5 rounded-xl">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">{t('চালানি বিক্রি', 'Sales')}</span>
                <span className="text-sm font-black text-amber-300 block mt-0.5">{formatCurrency(todaySalesAmount)}</span>
                <span className="text-[10px] text-amber-300/80">{toBengaliNumber(todaySaleMon.toFixed(1))} মণ</span>
              </div>

              <div className="bg-emerald-950/70 border border-emerald-800/80 p-2.5 rounded-xl">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">{t('মোট খরচ/পরিশোধ', 'Expenses')}</span>
                <span className="text-sm font-black text-rose-300 block mt-0.5">{formatCurrency(todayCashOut)}</span>
                <span className="text-[10px] text-rose-300/80">নগদ তহবিল থেকে</span>
              </div>

              <div className="bg-emerald-950/70 border border-emerald-800/80 p-2.5 rounded-xl">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">{t('হাতে নগদ (নেট)', 'Net Balance')}</span>
                <span className="text-sm font-black text-emerald-400 block mt-0.5">{formatCurrency(cashInHand)}</span>
                <span className={`text-[10px] font-bold ${todayNetProfit >= 0 ? 'text-emerald-300' : 'text-rose-400'}`}>
                  লাভ: {todayNetProfit >= 0 ? '+' : ''}{toBengaliNumber(todayNetProfit)}
                </span>
              </div>
            </div>

            {/* Live SMS / Text Preview Card */}
            <div className="space-y-1.5 mb-4">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-1">
                <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
                <span>লাইভ সামারি প্রিভিউ (WhatsApp ও SMS টেক্সট)</span>
              </span>
              <div className="bg-slate-950 p-3 rounded-xl border border-emerald-900/80 text-xs font-mono text-emerald-200 whitespace-pre-wrap leading-relaxed max-h-36 overflow-y-auto">
                {summaryText}
              </div>
            </div>

            {/* Recipient Phone for SMS */}
            <div className="mb-4">
              <label className="block text-[11px] font-bold text-slate-300 mb-1">
                প্রাপকের মোবাইল নম্বর (SMS পাঠানোর জন্য)
              </label>
              <input
                type="tel"
                value={smsRecipientPhone}
                onChange={e => setSmsRecipientPhone(e.target.value)}
                placeholder="017xxxxxxxx"
                className="w-full p-2 text-xs rounded-xl border border-emerald-800 bg-slate-800 text-white font-mono focus:ring-2 focus:ring-amber-400 focus:outline-none"
              />
              {serverSmsMessage && (
                <p className={`text-xs mt-1 font-bold ${serverSmsMessage.startsWith('✓') ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {serverSmsMessage}
                </p>
              )}
            </div>

            {/* b) Action Buttons Grid: Thermal, A4, WhatsApp, Mobile SMS, Server SMS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-3 border-t border-slate-800">
              {/* Button 1: Thermal Print */}
              <button
                type="button"
                onClick={handlePrintThermal}
                className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center justify-center space-x-2 border border-slate-700 transition active:scale-95 cursor-pointer"
              >
                <Printer className="w-4 h-4 text-amber-400" />
                <span>🖨️ থার্মাল প্রিন্ট (58mm)</span>
              </button>

              {/* Button 2: A4 Memo / PDF */}
              <button
                type="button"
                onClick={handlePrintA4}
                className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center justify-center space-x-2 border border-slate-700 transition active:scale-95 cursor-pointer"
              >
                <FileText className="w-4 h-4 text-emerald-400" />
                <span>📄 A4 মেমো / PDF</span>
              </button>

              {/* Button 3: WhatsApp Memo */}
              <button
                type="button"
                onClick={handleShareWhatsApp}
                className="p-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs flex items-center justify-center space-x-2 transition active:scale-95 cursor-pointer"
              >
                <MessageSquare className="w-4 h-4 text-emerald-200" />
                <span>💬 WhatsApp মেমো পাঠান</span>
              </button>

              {/* Button 4: Mobile SMS App */}
              <button
                type="button"
                onClick={handleMobileSMS}
                className="p-2.5 rounded-xl bg-blue-700 hover:bg-blue-600 text-white font-bold text-xs flex items-center justify-center space-x-2 transition active:scale-95 cursor-pointer"
              >
                <Smartphone className="w-4 h-4 text-blue-200" />
                <span>📱 মোবাইল SMS অ্যাপে</span>
              </button>

              {/* Button 5: Server Gateway SMS (Span 2 columns on sm) */}
              <button
                type="button"
                disabled={serverSmsLoading}
                onClick={handleSendServerSMS}
                className="sm:col-span-2 p-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs flex items-center justify-center space-x-2 shadow transition active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                <Send className="w-4 h-4 text-slate-950" />
                <span>{serverSmsLoading ? 'পাঠানো হচ্ছে...' : '🚀 সার্ভার SMS পাঠান (Gateway)'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Cash Entry Modal (+ ক্যাশ এন্ট্রি) */}
      {isCashModalOpen && (
        <div 
          className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setIsCashModalOpen(false)}
        >
          <div 
            className="bg-slate-900 border border-emerald-800/80 rounded-3xl shadow-2xl max-w-md w-full p-6 text-slate-100 animate-in fade-in zoom-in-95 duration-150"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-emerald-800/80">
              <div className="flex items-center space-x-2">
                <Coins className="w-5 h-5 text-amber-400" />
                <h3 className="font-black text-base text-white">
                  {t('হাটের ক্যাশ এন্ট্রি (Cash Entry)', 'Cash Entry')}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCashModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddCash} className="space-y-4 pt-4 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-emerald-300 mb-1">
                  {t('লেনদেনের ধরন', 'Entry Type')}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCashType('IN')}
                    className={`py-2 px-3 rounded-xl font-bold border transition ${
                      cashType === 'IN'
                        ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                        : 'border-slate-700 bg-slate-800 text-slate-300'
                    }`}
                  >
                    + ক্যাশ জমা (IN)
                  </button>
                  <button
                    type="button"
                    onClick={() => setCashType('OUT')}
                    className={`py-2 px-3 rounded-xl font-bold border transition ${
                      cashType === 'OUT'
                        ? 'bg-rose-600 text-white border-rose-500 shadow-sm'
                        : 'border-slate-700 bg-slate-800 text-slate-300'
                    }`}
                  >
                    - ক্যাশ খরচ (OUT)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-emerald-300 mb-1">
                  {t('টাকার পরিমাণ (৳) *', 'Amount (৳) *')}
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  placeholder="যেমন: ৫০,০০০"
                  value={cashAmount}
                  onChange={e => setCashAmount(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full p-3 rounded-xl border border-emerald-700 bg-slate-800 text-white font-black text-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-emerald-300 mb-1">
                  {t('উৎস / বিবরণ *', 'Source / Recipient *')}
                </label>
                <input
                  type="text"
                  required
                  placeholder="যেমন: ব্যাংক থেকে উত্তোলন / হাটের প্রারম্ভিক ক্যাশ"
                  value={cashSource}
                  onChange={e => setCashSource(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-700 bg-slate-800 text-white font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-emerald-300 mb-1">
                    {t('তারিখ', 'Date')}
                  </label>
                  <input
                    type="date"
                    value={cashDate}
                    onChange={e => setCashDate(e.target.value)}
                    className="w-full p-2 rounded-xl border border-slate-700 bg-slate-800 text-white font-medium"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-emerald-300 mb-1">
                    {t('মন্তব্য / নোট', 'Note')}
                  </label>
                  <input
                    type="text"
                    placeholder="ঐচ্ছিক..."
                    value={cashNote}
                    onChange={e => setCashNote(e.target.value)}
                    className="w-full p-2 rounded-xl border border-slate-700 bg-slate-800 text-white font-medium"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsCashModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 font-bold"
                >
                  {t('বাতিল', 'Cancel')}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-emerald-950 font-black shadow transition active:scale-95 cursor-pointer"
                >
                  {t('✓ ক্যাশ সংরক্ষণ', 'Save Cash')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cash Book Modal */}
      {isCashBookOpen && (
        <div 
          className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setIsCashBookOpen(false)}
        >
          <div 
            className="bg-slate-900 border border-emerald-800/80 rounded-3xl shadow-2xl max-w-3xl w-full p-6 text-slate-100 flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-emerald-800/80">
              <div className="flex items-center space-x-2">
                <Coins className="w-6 h-6 text-amber-400" />
                <div>
                  <h3 className="font-black text-lg text-white">
                    {t('আড়তের ক্যাশ বুক লেজার (Cash Book)', 'Cash Book Ledger')}
                  </h3>
                  <p className="text-xs text-emerald-300">
                    {t('হাতে অবশিষ্ট নগদ: ', 'Current Cash in Hand: ')}<b className="text-amber-300">{formatCurrency(cashInHand)}</b>
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsCashBookOpen(false);
                    setIsCashModalOpen(true);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs"
                >
                  + ক্যাশ জমা/খরচ
                </button>
                <button
                  type="button"
                  onClick={() => setIsCashBookOpen(false)}
                  className="text-slate-400 hover:text-white p-1 text-lg font-bold"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto mt-4">
              <table className="w-full text-left text-xs">
                <thead className="bg-emerald-900/60 text-emerald-300 sticky top-0 uppercase font-bold border-b border-emerald-800">
                  <tr>
                    <th className="py-2.5 px-3">তারিখ</th>
                    <th className="py-2.5 px-3">ধরন</th>
                    <th className="py-2.5 px-3">বিবরণ / উৎস</th>
                    <th className="py-2.5 px-3 text-right">জমা (IN)</th>
                    <th className="py-2.5 px-3 text-right">খরচ (OUT)</th>
                    <th className="py-2.5 px-3 text-center">অ্যাকশন</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {cashLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        {t('কোনো ক্যাশ এন্ট্রি পাওয়া যায়নি।', 'No cash entries found.')}
                      </td>
                    </tr>
                  ) : (
                    cashLogs.map(log => (
                      <tr key={log.id} className="hover:bg-slate-800/60 transition">
                        <td className="py-2.5 px-3 font-mono">{log.date}</td>
                        <td className="py-2.5 px-3">
                          {log.type === 'IN' ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                              + জমা
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-950 text-rose-300 border border-rose-800">
                              - খরচ
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-white">
                          <div>{log.sourceOrRecipient}</div>
                          {log.note && <div className="text-[10px] text-slate-400 font-normal">{log.note}</div>}
                        </td>
                        <td className="py-2.5 px-3 text-right font-black text-emerald-400">
                          {log.type === 'IN' ? formatCurrency(log.amount) : '---'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-black text-rose-400">
                          {log.type === 'OUT' ? formatCurrency(log.amount) : '---'}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => setDeleteCashId(log.id)}
                            className="p-1 rounded text-rose-400 hover:bg-rose-950"
                            title="মুছে ফেলুন"
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setIsCashBookOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs"
              >
                {t('বন্ধ করুন', 'Close')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Cash Entry Confirmation Modal */}
      <ConfirmationModal
        isOpen={Boolean(deleteCashId)}
        title={t('ক্যাশ এন্ট্রি মুছে ফেলুন', 'Delete Cash Entry')}
        message={t('আপনি কি নিশ্চিতভাবে এই ক্যাশ ট্রানজেকশনটি মুছে ফেলতে চান?', 'Are you sure you want to delete this cash entry?')}
        onConfirm={async () => {
          if (deleteCashId) {
            await deleteCashEntry(deleteCashId);
            setDeleteCashId(null);
          }
        }}
        onCancel={() => setDeleteCashId(null)}
      />
    </div>
  );
};
