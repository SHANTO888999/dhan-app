/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useRef } from 'react';
import { AuthProvider } from './context/AuthContext';
import { DataProvider, useData } from './context/DataContext';
import { ThemeLanguageProvider, useThemeLanguage } from './context/ThemeLanguageContext';
import { Navbar } from './components/Navbar';
import { PurchaseModule } from './components/PurchaseModule';
import { SalesModule } from './components/SalesModule';
import { StockModule } from './components/StockModule';
import { AccountsModule } from './components/AccountsModule';
import { VarietiesModule } from './components/VarietiesModule';
import { LoyaltyRewardsModule } from './components/LoyaltyRewardsModule';
import { SettingsModal } from './components/SettingsModal';
import { ReceiptModal } from './components/ReceiptModal';
import { ConfirmationModal } from './components/ConfirmationModal';
import { ActiveTab, PurchaseMemo, Purchase, Sale } from './types';
import { formatCurrency, toBengaliNumber } from './utils/weight';
import { printThermalReceipt } from './utils/thermalPrinter';
import { printFullDocument } from './utils/pdfExport';
import { sendGatewaySMS } from './utils/sms';
import { 
  LayoutDashboard, 
  ShoppingBag, 
  Truck, 
  Warehouse, 
  BookOpen, 
  Share2, 
  Coins, 
  PlusCircle, 
  TrendingUp, 
  TrendingDown, 
  Printer, 
  FileText, 
  MessageSquare, 
  Smartphone, 
  Send, 
  AlertTriangle, 
  Wheat,
  Calendar,
  ChevronLeft,
  ChevronRight,
  RotateCcw
} from 'lucide-react';

/* ========================================================================= */
/* 1. DASHBOARD COMPONENT (STEP-2 PART A: TOP NAV SYNC, WELCOME ROW CLEANUP & 4 POS CARDS) */
/* ========================================================================= */
export interface DashboardProps {
  setActiveTab: (tab: ActiveTab) => void;
  onOpenQuickPurchase: () => void;
  onOpenQuickSale: () => void;
  onViewReceipt: (type: 'purchase' | 'sale', item: PurchaseMemo | Sale) => void;
  isSummaryModalOpenExternal?: boolean;
  onCloseSummaryModalExternal?: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  setActiveTab,
  onOpenQuickPurchase,
  onOpenQuickSale,
  onViewReceipt,
  isSummaryModalOpenExternal = false,
  onCloseSummaryModalExternal,
}) => {
  const { 
    purchases, 
    sales, 
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

  // Floating Cash Modal State (➕ ক্যাশ যোগ)
  const [isCashModalOpen, setIsCashModalOpen] = useState(false);
  const [cashAmount, setCashAmount] = useState<number | ''>('');
  const [cashType, setCashType] = useState<'IN' | 'OUT'>('IN');
  const [cashSource, setCashSource] = useState('হাটের প্রারম্ভিক ক্যাশ জমা');
  const [cashNote, setCashNote] = useState('');
  const [cashDate, setCashDate] = useState(new Date().toISOString().split('T')[0]);

  // Cash Book Modal
  const [isCashBookOpen, setIsCashBookOpen] = useState(false);

  // UNIFIED SUMMARY MODAL POPUP STATE (Triggered by [📊 সামারি] button or Navbar)
  const [internalSummaryModalOpen, setInternalSummaryModalOpen] = useState(false);
  const isSummaryModalOpen = isSummaryModalOpenExternal || internalSummaryModalOpen;
  
  const setIsSummaryModalOpen = (open: boolean) => {
    setInternalSummaryModalOpen(open);
    if (!open && onCloseSummaryModalExternal) {
      onCloseSummaryModalExternal();
    }
  };

  const [smsRecipientPhone, setSmsRecipientPhone] = useState(settings.phone || '');
  const [serverSmsLoading, setServerSmsLoading] = useState(false);
  const [serverSmsMessage, setServerSmsMessage] = useState<string | null>(null);

  // Delete Cash Entry Confirm Modal
  const [deleteCashId, setDeleteCashId] = useState<string | null>(null);

  // Local YYYY-MM-DD formatting and parsing without UTC timezone offset errors
  const formatLocalYMD = (d: Date): string => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const parseLocalYMD = (ymdStr: string): Date => {
    const parts = (ymdStr || '').split('-').map(Number);
    if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
      return new Date(parts[0], parts[1] - 1, parts[2]);
    }
    return new Date();
  };

  // Today's Real Running Date (Local YYYY-MM-DD: e.g. "2026-10-04")
  const todayStr = useMemo(() => formatLocalYMD(new Date()), []);

  // Dashboard Active Date (Allows viewing past dates; defaults to todayStr)
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const isToday = selectedDate === todayStr;

  // Two Years back limit: Date range allowed is from (Today - 2 Years) to Today
  const minDateStr = useMemo(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 2);
    return formatLocalYMD(d);
  }, []);

  const currentRealYear = new Date().getFullYear();
  const currentRealMonth = new Date().getMonth();
  const minAllowedYear = currentRealYear - 2;

  // Custom Interactive Calendar Modal State
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [calendarViewDate, setCalendarViewDate] = useState<{ year: number; month: number }>(() => {
    const [y, m] = (todayStr || '').split('-').map(Number);
    return { year: y || currentRealYear, month: (m ? m - 1 : currentRealMonth) };
  });

  const BANGLA_MONTHS = [
    'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
    'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
  ];

  const BANGLA_DAYS_SHORT = ['রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহঃ', 'শুক্র', 'শনি'];

  // Open calendar modal and sync viewing month/year with active selected date
  const handleOpenCalendar = () => {
    const [y, m] = (selectedDate || todayStr).split('-').map(Number);
    setCalendarViewDate({ year: y || currentRealYear, month: m ? m - 1 : currentRealMonth });
    setIsDatePickerOpen(true);
  };

  const canGoNextMonth = calendarViewDate.year < currentRealYear || 
    (calendarViewDate.year === currentRealYear && calendarViewDate.month < currentRealMonth);

  const canGoPrevMonth = calendarViewDate.year > minAllowedYear || 
    (calendarViewDate.year === minAllowedYear && calendarViewDate.month > currentRealMonth);

  const handlePrevMonth = () => {
    if (!canGoPrevMonth) return;
    setCalendarViewDate(prev => {
      let m = prev.month - 1;
      let y = prev.year;
      if (m < 0) {
        m = 11;
        y -= 1;
      }
      return { year: y, month: m };
    });
  };

  const handleNextMonth = () => {
    if (!canGoNextMonth) return;
    setCalendarViewDate(prev => {
      let m = prev.month + 1;
      let y = prev.year;
      if (m > 11) {
        m = 0;
        y += 1;
      }
      return { year: y, month: m };
    });
  };

  const handleSelectDateFromCalendar = (dateStr: string) => {
    if (dateStr > todayStr || dateStr < minDateStr) return;
    setSelectedDate(dateStr);
    setIsDatePickerOpen(false);
  };

  // Calendar days grid generation for viewing month
  const calendarDays = useMemo(() => {
    const { year, month } = calendarViewDate;
    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Sun
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const days: { dateStr: string; dayNumber: number; isCurrentMonth: boolean; isDisabled: boolean; isToday: boolean; isSelected: boolean }[] = [];

    // Prev month padding
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      const prevDate = new Date(year, month - 1, dayNum);
      const dateStr = formatLocalYMD(prevDate);
      days.push({
        dateStr,
        dayNumber: dayNum,
        isCurrentMonth: false,
        isDisabled: true,
        isToday: dateStr === todayStr,
        isSelected: dateStr === selectedDate
      });
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      const isDisabled = dateStr > todayStr || dateStr < minDateStr;
      days.push({
        dateStr,
        dayNumber: i,
        isCurrentMonth: true,
        isDisabled,
        isToday: dateStr === todayStr,
        isSelected: dateStr === selectedDate
      });
    }

    // Next month padding to fill full grid
    const remaining = 7 - (days.length % 7);
    if (remaining < 7) {
      for (let i = 1; i <= remaining; i++) {
        const nextDate = new Date(year, month + 1, i);
        const dateStr = formatLocalYMD(nextDate);
        days.push({
          dateStr,
          dayNumber: i,
          isCurrentMonth: false,
          isDisabled: true,
          isToday: dateStr === todayStr,
          isSelected: dateStr === selectedDate
        });
      }
    }

    return days;
  }, [calendarViewDate, selectedDate, todayStr, minDateStr]);

  // Live or Selected Bengali Date: e.g. "রবিবার, ৪ অক্টোবর, ২০২৬"
  const formattedDateBangla = useMemo(() => {
    const d = parseLocalYMD(selectedDate);
    return isNaN(d.getTime())
      ? selectedDate
      : d.toLocaleDateString('bn-BD', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
  }, [selectedDate]);

  // Date Navigation Handlers (Previous date enabled, future dates strictly prohibited)
  const handlePrevDay = () => {
    const d = parseLocalYMD(selectedDate);
    d.setDate(d.getDate() - 1);
    const prevDateStr = formatLocalYMD(d);
    if (prevDateStr >= minDateStr) {
      setSelectedDate(prevDateStr);
    }
  };

  const handleNextDay = () => {
    if (selectedDate >= todayStr) return; // Cannot go to future date
    const d = parseLocalYMD(selectedDate);
    d.setDate(d.getDate() + 1);
    const nextDateStr = formatLocalYMD(d);
    if (nextDateStr <= todayStr) {
      setSelectedDate(nextDateStr);
    }
  };

  const handleResetToToday = () => {
    setSelectedDate(todayStr);
  };

  // Auto-reset to running date when clicking action buttons
  const handleOpenSummary = () => {
    setSelectedDate(todayStr);
    setIsSummaryModalOpen(true);
  };

  const handleOpenCash = () => {
    setSelectedDate(todayStr);
    setIsCashModalOpen(true);
  };

  // Stock and Valuation
  const totalStockMon = varieties.reduce((acc, v) => acc + Math.max(0, v.currentStockMon || 0), 0);
  const totalEstimatedBags = Math.round(totalStockMon / 1.25); // 1.25 Mon = 50kg bag

  // Low stock varieties (below threshold)
  const lowStockVarieties = varieties.filter(v => v.currentStockMon <= (v.lowStockThreshold || settings.lowStockAlertMon || 50));

  // 1. Selected Date's Purchases Calculation
  const todayPurchasesList = purchases.filter(p => p.date === selectedDate);
  const todayPurchaseAmount = todayPurchasesList.reduce((acc, p) => acc + (p.totalBill || p.totalAmount || 0), 0);
  const todayPurchaseMon = todayPurchasesList.reduce((acc, p) => acc + (p.totalMon || p.quantityMon || 0), 0);

  // 2. Selected Date's Sales Calculation
  const todaySalesList = sales.filter(s => s.date === selectedDate);
  const todaySalesAmount = todaySalesList.reduce((acc, s) => acc + (s.totalAmount || 0), 0);
  const todaySaleMon = todaySalesList.reduce((acc, s) => acc + (s.totalMon || 0), 0);
  const todaySaleBags = todaySalesList.reduce((acc, s) => acc + (s.bagCount || 0), 0);

  // 3. Selected Date's Expenses / Outflows Calculation
  const todayCashOut = cashLogs
    .filter(c => c.type === 'OUT' && (c.date === selectedDate || (c.createdAt && c.createdAt.startsWith(selectedDate))))
    .reduce((acc, c) => acc + c.amount, 0);

  // 4. Selected Date's Estimated Net Profit/Loss: (Sales - Purchases - Expenses)
  const todayNetProfit = todaySalesAmount - todayPurchaseAmount - todayCashOut;

  // 5. Total Customer / Party Due Calculation
  const { totalPartyDue, partiesWithDueCount } = useMemo(() => {
    let dueSum = 0;
    let count = 0;
    parties.forEach(p => {
      const partySales = sales.filter(s => s.partyId === p.id || (p.phone && s.partyPhone === p.phone));
      const totalSalesAmount = partySales.reduce((sSum, s) => sSum + (s.totalAmount || 0), 0);
      const totalReceivedAmount = partySales.reduce((sSum, s) => sSum + (s.receivedAmount || 0), 0);
      const balance = (p.openingBalance || 0) + (totalSalesAmount - totalReceivedAmount);
      if (balance > 0) {
        dueSum += balance;
        count += 1;
      }
    });
    return { 
      totalPartyDue: dueSum > 0 ? dueSum : totalCurrentDue, 
      partiesWithDueCount: count 
    };
  }, [parties, sales, totalCurrentDue]);

  // Recent 5 memos and sales
  const recentPurchases = purchases.slice(0, 5);
  const recentSales = sales.slice(0, 5);

  // Dismiss modal helper
  const closeSummaryModal = () => {
    setIsSummaryModalOpen(false);
    setServerSmsMessage(null);
  };

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
    return `*${settings.businessName || 'মেসার্স সোনার বাংলা ধান আড়ত'}*
📅 *দৈনিক সমাপনী হিসাব (${formattedDateBangla})*
━━━━━━━━━━━━━━━━━━
📈 *আজকের আনুমানিক লাভ/ক্ষতি:* ${todayNetProfit >= 0 ? '+' : ''}৳${toBengaliNumber(todayNetProfit)}
🌾 *গুদামে মোট মজুদ ধান:* ${toBengaliNumber(totalStockMon.toFixed(1))} মন (${toBengaliNumber(totalEstimatedBags)} বস্তা)
🚛 *আজকের চালানি বিক্রি:* ৳${toBengaliNumber(todaySalesAmount)} (${toBengaliNumber(todaySaleBags)} বস্তা, ${toBengaliNumber(todaySaleMon.toFixed(1))} মন)
🌾 *আজকের মোট ধান কেনা:* ৳${toBengaliNumber(todayPurchaseAmount)} (${toBengaliNumber(todayPurchaseMon.toFixed(1))} মন)
💸 *আজকের খরচ/পরিশোধ:* ৳${toBengaliNumber(todayCashOut)}
━━━━━━━━━━━━━━━━━━
💰 *মোট বকেয়া পাওনা:* ৳${toBengaliNumber(totalPartyDue)}
💵 *হাতে অবশিষ্ট নগদ:* ৳${toBengaliNumber(cashInHand)}
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
        <div class="title">${settings.businessName || 'মেসার্স সোনার বাংলা ধান আড়ত'}</div>
        <div class="subtitle">${settings.address || 'ধানের আড়ত'} | মোবা: ${settings.phone}</div>
        <div class="double-divider"></div>
        <div class="font-bold" style="font-size: 13px;">দৈনিক সমাপনী হিসাব সামারি</div>
        <div style="font-size: 10px;">তারিখ: ${new Date().toLocaleDateString('bn-BD')}</div>
        <div class="divider"></div>
      </div>
      <div class="row">
        <span>আজকের আনুমানিক লাভ/ক্ষতি:</span>
        <span class="font-bold">${todayNetProfit >= 0 ? '+' : ''}৳ ${todayNetProfit.toLocaleString('en-IN')}</span>
      </div>
      <div class="row">
        <span>গুদামে মোট মজুদ ধান:</span>
        <span class="font-bold">${toBengaliNumber(totalStockMon.toFixed(1))} মণ (${toBengaliNumber(totalEstimatedBags)} বস্তা)</span>
      </div>
      <div class="row">
        <span>আজকের চালানি বিক্রি:</span>
        <span class="font-bold">৳ ${todaySalesAmount.toLocaleString('en-IN')} (${toBengaliNumber(todaySaleBags)} বস্তা)</span>
      </div>
      <div class="row">
        <span>আজকের ধান কেনা বিল:</span>
        <span class="font-bold">৳ ${todayPurchaseAmount.toLocaleString('en-IN')}</span>
      </div>
      <div class="row">
        <span>আজকের খরচ/পরিশোধ:</span>
        <span class="font-bold">৳ ${todayCashOut.toLocaleString('en-IN')}</span>
      </div>
      <div class="divider"></div>
      <div class="row" style="font-size: 12px; font-weight: bold;">
        <span>মোট বকেয়া পাওনা:</span>
        <span>৳ ${totalPartyDue.toLocaleString('en-IN')}</span>
      </div>
      <div class="row" style="font-size: 12px; font-weight: bold;">
        <span>হাতে অবশিষ্ট নগদ:</span>
        <span>৳ ${cashInHand.toLocaleString('en-IN')}</span>
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
        <h1 class="business-name">${settings.businessName || 'মেসার্স সোনার বাংলা ধান আড়ত'}</h1>
        <p class="subtext">প্রোপ্রাইটর: ${settings.proprietor} | মোবাইল: ${settings.phone}</p>
        <p class="subtext">${settings.address}</p>
        <div class="badge">দৈনিক হিসাব সমাপনী বিবরণী</div>
        <p style="margin-top: 6px; font-size: 12px; color: #64748b;">তারিখ: ${new Date().toLocaleDateString('bn-BD', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>

      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 20px;">
        <div class="summary-card">
          <h3 style="margin-top: 0; color: #0f172a; font-size: 14px; border-bottom: 1px solid #cbd5e1; padding-bottom: 5px;">আজকের ক্রয় ও বিক্রি কার্যক্রম</h3>
          <p><strong>আজকের আনুমানিক লাভ/ক্ষতি:</strong> <span style="font-weight: bold; color: ${todayNetProfit >= 0 ? '#15803d' : '#b91c1c'};">${todayNetProfit >= 0 ? '+' : ''}৳ ${todayNetProfit.toLocaleString('en-IN')}</span></p>
          <p><strong>চালানি বিক্রি বিল:</strong> ৳ ${todaySalesAmount.toLocaleString('en-IN')} (${toBengaliNumber(todaySaleBags)} বস্তা, ${toBengaliNumber(todaySaleMon.toFixed(1))} মণ)</p>
          <p><strong>মোট ধান কেনা:</strong> ${toBengaliNumber(todayPurchaseMon.toFixed(1))} মণ (৳ ${todayPurchaseAmount.toLocaleString('en-IN')})</p>
          <p><strong>আজকের মোট খরচ/পরিশোধ:</strong> ৳ ${todayCashOut.toLocaleString('en-IN')}</p>
        </div>

        <div class="summary-card">
          <h3 style="margin-top: 0; color: #0f172a; font-size: 14px; border-bottom: 1px solid #cbd5e1; padding-bottom: 5px;">গুদাম স্টক ও আর্থিক স্থিতি</h3>
          <p><strong>গুদামে মোট মজুদ ধান:</strong> <span style="font-size: 15px; font-weight: bold; color: #0f172a;">${toBengaliNumber(totalStockMon.toFixed(1))} মণ (${toBengaliNumber(totalEstimatedBags)} বস্তা)</span></p>
          <p><strong>মোট বকেয়া পাওনা টাকা:</strong> <span style="color: #b91c1c; font-weight: bold;">৳ ${totalPartyDue.toLocaleString('en-IN')}</span></p>
          <p><strong>হাতে অবশিষ্ট নগদ (ক্যাশ):</strong> ৳ ${cashInHand.toLocaleString('en-IN')}</p>
          <p><strong>আড়তের মোট দেনা:</strong> ৳ ${totalCurrentDue.toLocaleString('en-IN')}</p>
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
      {/* ========================================================================= */}
      {/* 2. DISTINCT WELCOME BANNER & DATE NAVIGATOR ROW */}
      {/* ========================================================================= */}
      <div className="group bg-white dark:bg-slate-900 border-2 border-slate-200/90 dark:border-slate-800 rounded-3xl p-4 sm:p-5 shadow-sm shadow-slate-200/50 dark:shadow-black/40 flex flex-col lg:flex-row lg:items-center justify-between gap-4 transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-300/40 dark:hover:shadow-black/60 hover:border-amber-400/70 dark:hover:border-slate-700">
        {/* Left Side: Welcome Greeting & Shop Brand */}
        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-400 via-amber-300 to-emerald-400 flex items-center justify-center text-slate-950 font-black shadow-md shrink-0 group-hover:scale-105 group-hover:rotate-3 transition-transform duration-300">
            <Wheat className="w-6 h-6 text-slate-950" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[11px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300/60 dark:border-amber-800">
                স্বাগতম • Welcome
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <h2 className="text-base sm:text-lg lg:text-xl font-black text-slate-900 dark:text-white tracking-tight mt-1">
              {settings.businessName || 'মেসার্স সোনার বাংলা ধান আড়ত'}
            </h2>
          </div>
        </div>

        {/* Center: Interactive Date Controller (Previous dates enabled, future dates strictly prohibited) */}
        <div
          className={`relative flex items-center justify-center gap-1.5 sm:gap-2 py-2.5 px-3 sm:py-3 sm:px-5 rounded-2xl transition-all duration-300 select-none shrink-0 ${
            isToday
              ? 'bg-white dark:bg-slate-900 border-2 border-emerald-500 dark:border-emerald-400 shadow-xl shadow-emerald-500/25 ring-4 ring-emerald-400/30 dark:ring-emerald-500/25'
              : 'bg-slate-950 dark:bg-black border-2 border-slate-700 dark:border-slate-800 text-white shadow-xl ring-0'
          }`}
        >
          {/* ◀ Previous Day Button */}
          <button
            type="button"
            onClick={handlePrevDay}
            className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center border transition-all active:scale-95 cursor-pointer shadow-2xs shrink-0 ${
              isToday
                ? 'bg-slate-100 dark:bg-slate-800 hover:bg-emerald-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-600'
                : 'bg-slate-900 hover:bg-slate-800 text-slate-200 border-slate-700 hover:border-amber-400'
            }`}
            title="পূর্বের দিন দেখুন (Previous Day)"
          >
            <ChevronLeft className="w-5 h-5 transition-transform hover:-translate-x-0.5" />
          </button>

          {/* Clickable Date Pill (Clicking directly opens custom interactive calendar modal) */}
          <button
            type="button"
            onClick={handleOpenCalendar}
            className={`relative flex items-center justify-center min-w-[190px] sm:min-w-[225px] h-10 sm:h-11 px-3 sm:px-4 rounded-xl border-2 transition-all cursor-pointer shadow-xs shrink-0 active:scale-95 group/date hover:shadow-md ${
              isToday
                ? 'bg-emerald-50/90 dark:bg-emerald-950/50 border-emerald-400 dark:border-emerald-500 hover:bg-emerald-100 dark:hover:bg-emerald-950/80 hover:border-emerald-500'
                : 'bg-slate-900 dark:bg-slate-950 border-slate-600 dark:border-slate-700 hover:border-amber-400 hover:bg-slate-800'
            }`}
            title="ক্লিক করে ক্যালেন্ডার খুলুন ও তারিখ নির্বাচন করুন (গত ২ বছর পর্যন্ত যেকোনো তারিখ)"
          >
            <span className={`p-1.5 rounded-lg mr-2 transition-colors ${
              isToday 
                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 group-hover/date:bg-emerald-500 group-hover/date:text-white' 
                : 'bg-amber-500/20 text-amber-400 group-hover/date:bg-amber-400 group-hover/date:text-slate-950'
            }`}>
              <Calendar className="w-4 h-4" />
            </span>
            <div className="flex flex-col items-start text-left">
              <span className={`font-black text-xs sm:text-sm tracking-tight whitespace-nowrap ${
                isToday ? 'text-slate-900 dark:text-emerald-300' : 'text-white'
              }`}>
                {formattedDateBangla}
              </span>
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 flex items-center space-x-0.5">
                <span>ক্যালেন্ডার বাছুন</span>
                <span className="text-[8px]">▼</span>
              </span>
            </div>
          </button>

          {/* ▶ Next Day Button (Enabled when on past date, disabled when on today) */}
          <button
            type="button"
            disabled={isToday}
            onClick={handleNextDay}
            className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center border transition-all shrink-0 ${
              isToday
                ? 'bg-slate-100 dark:bg-slate-800/50 text-slate-300 dark:text-slate-600 border-slate-200 dark:border-slate-700/60 cursor-not-allowed opacity-30'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500 hover:border-emerald-400 cursor-pointer active:scale-95 shadow-md'
            }`}
            title={isToday ? 'ভবিষ্যতের তারিখ দেখা সম্ভব নয়' : 'পরের দিন দেখুন (Next Day)'}
          >
            <ChevronRight className="w-5 h-5 transition-transform hover:translate-x-0.5" />
          </button>

          {/* Dedicated [ 🔄 আজ / Today ] Button */}
          {isToday ? (
            <div
              className="flex items-center space-x-1 px-2.5 py-1.5 sm:py-2 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 text-[11px] font-black shrink-0 shadow-2xs"
              title="বর্তমানে আজকের রানিং তারিখের হিসাব দেখা হচ্ছে"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>আজ</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleResetToToday}
              className="flex items-center space-x-1 px-3 py-1.5 sm:py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs shadow-md transition-all active:scale-95 cursor-pointer shrink-0 animate-pulse border border-amber-300"
              title="ক্লিক করে সরাসরি আজকের রানিং তারিখে ফিরে যান"
            >
              <span>🔄 আজ</span>
            </button>
          )}
        </div>

        {/* Right Side: The Two Primary Action Buttons (Clicking auto-resets date to today) */}
        <div className="flex items-center space-x-2 shrink-0 self-end lg:self-center">
          {/* Action 1: [📊 সামারি] */}
          <button
            type="button"
            onClick={handleOpenSummary}
            className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black py-2.5 px-4 rounded-xl text-xs sm:text-sm transition active:scale-95 shadow-md shadow-amber-500/20 hover:shadow-lg hover:shadow-amber-500/30 flex items-center space-x-1.5 cursor-pointer border border-amber-400"
          >
            <Share2 className="w-4 h-4 text-slate-950" />
            <span>📊 সামারি</span>
          </button>

          {/* Action 2: [➕ ক্যাশ যোগ] */}
          <button
            type="button"
            onClick={handleOpenCash}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-black py-2.5 px-4 rounded-xl text-xs sm:text-sm transition active:scale-95 shadow-md shadow-emerald-600/20 hover:shadow-lg hover:shadow-emerald-600/30 flex items-center space-x-1.5 cursor-pointer border border-emerald-500"
          >
            <PlusCircle className="w-4 h-4 text-white" />
            <span>➕ ক্যাশ যোগ</span>
          </button>
        </div>
      </div>

      {/* Historical Date Notice Banner (Shows when viewing past dates) */}
      {!isToday && (
        <div className="bg-amber-500/10 border-2 border-amber-500/40 rounded-2xl py-2 px-4 flex items-center justify-between text-amber-800 dark:text-amber-300 text-xs animate-in fade-in">
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <b>পূর্বের তারিখের রেকর্ড:</b> আপনি <b>{formattedDateBangla}</b>-এর ড্যাশবোর্ড ও লেনদেনের হিসাব দেখছেন।
            </span>
          </div>
          <button
            type="button"
            onClick={handleResetToToday}
            className="px-3 py-1 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs shrink-0 transition shadow-xs active:scale-95 cursor-pointer"
          >
            🔄 আজকের রানিং তারিখে ফিরুন
          </button>
        </div>
      )}

      {/* Low Stock Alert Banner (Only when needed) */}
      {lowStockVarieties.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/40 rounded-xl py-2 px-3.5 flex items-center justify-between text-amber-700 dark:text-amber-300 text-xs animate-in fade-in">
          <div className="flex items-center space-x-2 truncate">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
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

      {/* ========================================================================= */}
      {/* 3. REORDERED & UPDATED 4-COLUMN POS METRIC CARDS (Professional Thick Cards with Deep Shadows & Hover Animations) */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1 (First Priority - Indigo/Purple): 📈 আজকের আনুমানিক লাভ/ক্ষতি */}
        <div className="group relative overflow-hidden bg-gradient-to-br from-indigo-50/90 via-white to-purple-50/60 dark:from-slate-900 dark:via-indigo-950/30 dark:to-slate-900 border-2 border-indigo-200 dark:border-indigo-800/80 rounded-3xl p-5 sm:p-5.5 text-slate-900 dark:text-white shadow-xl shadow-indigo-100/70 dark:shadow-2xl dark:shadow-black/60 flex flex-col justify-between transition-all duration-300 ease-out hover:-translate-y-2 hover:scale-[1.02] hover:shadow-2xl hover:shadow-indigo-500/25 hover:border-indigo-400 dark:hover:border-indigo-400 cursor-default min-h-[148px]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-indigo-700 dark:text-indigo-300 uppercase tracking-wider flex items-center space-x-1.5">
              <span className="p-1.5 rounded-xl bg-indigo-100 dark:bg-indigo-950/80 border border-indigo-200 dark:border-indigo-800 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
                {todayNetProfit >= 0 ? (
                  <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                )}
              </span>
              <span>{t('📈 আজকের লাভ/ক্ষতি', 'Net Profit/Loss')}</span>
            </span>
            <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black tracking-wide border shadow-2xs ${
              todayNetProfit >= 0
                ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                : 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-800'
            }`}>
              {todayNetProfit >= 0 ? '✓ লাভ' : '✕ ঘাটতি'}
            </span>
          </div>

          <div className="my-2.5">
            <div className={`text-2xl sm:text-3xl font-black tracking-tight leading-none ${
              todayNetProfit >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'
            }`}>
              {todayNetProfit >= 0 ? '+' : ''}{formatCurrency(todayNetProfit)}
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-600 dark:text-indigo-300/80 pt-2 border-t border-indigo-200/80 dark:border-indigo-900/60 truncate font-medium">
            <span className="truncate">
              {t('(বিক্রি - কেনা - খরচ)', '(Sales - Buy - Exp)')}
            </span>
            <span className="font-bold text-indigo-700 dark:text-white shrink-0">
              {todayNetProfit >= 0 ? 'নীট লাভ' : 'নীট ক্ষতি'}
            </span>
          </div>
        </div>

        {/* Card 2 (Emerald/Green): 🌾 গুদামে মোট মজুদ ধান (Stock in Mon & Bags) */}
        <div className="group relative overflow-hidden bg-gradient-to-br from-emerald-50/90 via-white to-teal-50/60 dark:from-slate-900 dark:via-emerald-950/30 dark:to-slate-900 border-2 border-emerald-200 dark:border-emerald-800/80 rounded-3xl p-5 sm:p-5.5 text-slate-900 dark:text-white shadow-xl shadow-emerald-100/70 dark:shadow-2xl dark:shadow-black/60 flex flex-col justify-between transition-all duration-300 ease-out hover:-translate-y-2 hover:scale-[1.02] hover:shadow-2xl hover:shadow-emerald-500/25 hover:border-emerald-400 dark:hover:border-emerald-400 cursor-default min-h-[148px]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-emerald-800 dark:text-emerald-300 uppercase tracking-wider flex items-center space-x-1.5">
              <span className="p-1.5 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
                <Wheat className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </span>
              <span>{t('🌾 গুদামে মোট মজুদ ধান', 'Warehouse Stock')}</span>
            </span>
            <button
              type="button"
              onClick={() => setActiveTab('stock')}
              className="text-[11px] font-black text-emerald-700 dark:text-amber-300 hover:underline cursor-pointer flex items-center space-x-0.5"
            >
              <span>স্টক দেখুন</span>
              <span>➔</span>
            </button>
          </div>

          <div className="my-2.5 flex items-baseline space-x-2 flex-wrap">
            <div className="text-2xl sm:text-3xl font-black text-emerald-800 dark:text-emerald-300 tracking-tight leading-none">
              {toBengaliNumber(totalStockMon.toFixed(1))} মণ
            </div>
            <div className="text-sm font-bold text-slate-600 dark:text-slate-300">
              ({toBengaliNumber(totalEstimatedBags)} বস্তা)
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-600 dark:text-emerald-300/80 pt-2 border-t border-emerald-200/80 dark:border-emerald-900/60 font-medium">
            <span>
              {toBengaliNumber(varieties.length)} টি জাতের ধান
            </span>
            <span className="font-bold text-emerald-700 dark:text-emerald-300">
              মজুদ স্বাভাবিক
            </span>
          </div>
        </div>

        {/* Card 3 (Blue Accent): 🚛 আজকের চালানি বিক্রি (Sales Amount + Bosta Count Highlighted) */}
        <div className="group relative overflow-hidden bg-gradient-to-br from-blue-50/90 via-white to-sky-50/60 dark:from-slate-900 dark:via-blue-950/30 dark:to-slate-900 border-2 border-blue-200 dark:border-blue-800/70 rounded-3xl p-5 sm:p-5.5 text-slate-900 dark:text-white shadow-xl shadow-blue-100/70 dark:shadow-2xl dark:shadow-black/60 flex flex-col justify-between transition-all duration-300 ease-out hover:-translate-y-2 hover:scale-[1.02] hover:shadow-2xl hover:shadow-blue-500/25 hover:border-blue-400 dark:hover:border-blue-400 cursor-default min-h-[148px]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-blue-800 dark:text-blue-300 uppercase tracking-wider flex items-center space-x-1.5">
              <span className="p-1.5 rounded-xl bg-blue-100 dark:bg-blue-950/80 border border-blue-200 dark:border-blue-800 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
                <Truck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </span>
              <span>{t('🚛 আজকের চালানি বিক্রি', "Today's Sales")}</span>
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-blue-100 dark:bg-blue-900/80 text-[10px] font-black text-blue-800 dark:text-blue-200 border border-blue-300 dark:border-blue-800 shadow-2xs">
              {toBengaliNumber(todaySalesList.length)} চালান
            </span>
          </div>

          <div className="my-2.5 flex items-baseline justify-between gap-1 flex-wrap">
            <div className="text-2xl sm:text-3xl font-black text-blue-900 dark:text-blue-300 tracking-tight leading-none">
              {formatCurrency(todaySalesAmount)}
            </div>
            <div className="text-sm sm:text-base font-black text-amber-700 dark:text-amber-400 shrink-0">
              {toBengaliNumber(todaySaleBags)} বস্তা
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-600 dark:text-blue-300/80 pt-2 border-t border-blue-200/80 dark:border-blue-900/60 font-medium">
            <span>
              {t('ওজন: ', 'Weight: ')}<b>{toBengaliNumber(todaySaleMon.toFixed(1))} {t('মণ', 'Mon')}</b>
            </span>
            <button
              type="button"
              onClick={onOpenQuickSale}
              className="text-blue-700 dark:text-emerald-300 hover:underline font-bold cursor-pointer"
            >
              + নতুন চালান
            </button>
          </div>
        </div>

        {/* Card 4 (Amber/Orange): 💰 মোট বকেয়া পাওনা টাকা (Customer Receivables) */}
        <div className="group relative overflow-hidden bg-gradient-to-br from-amber-50/90 via-white to-orange-50/60 dark:from-slate-900 dark:via-amber-950/30 dark:to-slate-900 border-2 border-amber-200 dark:border-amber-800/70 rounded-3xl p-5 sm:p-5.5 text-slate-900 dark:text-white shadow-xl shadow-amber-100/70 dark:shadow-2xl dark:shadow-black/60 flex flex-col justify-between transition-all duration-300 ease-out hover:-translate-y-2 hover:scale-[1.02] hover:shadow-2xl hover:shadow-amber-500/25 hover:border-amber-400 dark:hover:border-amber-400 cursor-default min-h-[148px]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-amber-800 dark:text-amber-300 uppercase tracking-wider flex items-center space-x-1.5">
              <span className="p-1.5 rounded-xl bg-amber-100 dark:bg-amber-950/80 border border-amber-200 dark:border-amber-800 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
                <Coins className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              </span>
              <span>{t('💰 মোট বকেয়া পাওনা টাকা', 'Total Customer Due')}</span>
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-amber-100 dark:bg-amber-900/80 text-[10px] font-black text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-800 shadow-2xs">
              {toBengaliNumber(partiesWithDueCount)} পার্টি
            </span>
          </div>

          <div className="my-2.5">
            <div className="text-2xl sm:text-3xl font-black text-rose-700 dark:text-rose-400 tracking-tight leading-none">
              {formatCurrency(totalPartyDue)}
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-600 dark:text-amber-300/80 pt-2 border-t border-amber-200/80 dark:border-amber-900/60 font-medium">
            <span>
              {t('ক্রেতা ও মিল পার্টির নিকট', 'Pending from parties')}
            </span>
            <button
              type="button"
              onClick={() => setActiveTab('accounts')}
              className="text-amber-800 dark:text-amber-300 hover:underline font-bold cursor-pointer"
            >
              খতিয়ান দেখুন ➔
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. RECENT ACTIVITY LISTS (Light & Dark Mode Clean Tables) */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Purchases Box */}
        <div className="group relative bg-white dark:bg-slate-900 rounded-3xl border-2 border-slate-200/90 dark:border-slate-800 shadow-md shadow-slate-200/40 dark:shadow-black/50 hover:shadow-2xl hover:shadow-emerald-500/10 dark:hover:shadow-black/70 hover:border-emerald-300 dark:hover:border-slate-700 hover:-translate-y-1 transition-all duration-300 p-5 space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3.5 border-b-2 border-slate-100 dark:border-slate-800">
              <div className="flex items-center space-x-2.5">
                <span className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
                  <ShoppingBag className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </span>
                <div>
                  <h3 className="font-black text-base sm:text-lg text-slate-900 dark:text-white tracking-tight">
                    {t('সাম্প্রতিক ধান ক্রয় মেমো', 'Recent Purchases')}
                  </h3>
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                    আজকের ও সাম্প্রতিক ক্রয়ের হিসাব
                  </span>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <span className="px-2.5 py-1 rounded-full text-xs font-black bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300/70 dark:border-emerald-800 shadow-2xs">
                  {toBengaliNumber(recentPurchases.length)} মেমো
                </span>
                <button
                  type="button"
                  onClick={() => setActiveTab('purchase')}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-amber-100 dark:hover:bg-slate-700 text-xs font-black text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 hover:border-amber-400 transition-all active:scale-95 shadow-2xs cursor-pointer"
                >
                  {t('সকল দেখুন ➔', 'View All ➔')}
                </button>
              </div>
            </div>

            <div className="overflow-x-auto mt-3 rounded-2xl border-2 border-slate-200/80 dark:border-slate-800 shadow-xs">
              <table className="w-full text-left">
                <thead className="bg-slate-100/90 dark:bg-slate-800 text-slate-900 dark:text-slate-200 font-black text-xs sm:text-[13px] border-b-2 border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="py-3 px-3.5">মেমো নং</th>
                    <th className="py-3 px-3.5">বিক্রেতা</th>
                    <th className="py-3 px-3.5">ধানের জাত</th>
                    <th className="py-3 px-3.5 text-right">ওজন</th>
                    <th className="py-3 px-3.5 text-right">মোট বিল</th>
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-slate-100 dark:divide-slate-800/80 bg-white dark:bg-slate-900">
                  {recentPurchases.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-10 text-center text-slate-500 dark:text-slate-400 font-bold text-sm">
                        <ShoppingBag className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                        {t('কোনো ক্রয়ের মেমো পাওয়া যায়নি।', 'No purchases found.')}
                      </td>
                    </tr>
                  ) : (
                    recentPurchases.map(p => (
                      <tr 
                        key={p.id} 
                        onClick={() => onViewReceipt('purchase', p)}
                        className="hover:bg-amber-50/70 dark:hover:bg-slate-800/80 transition-colors cursor-pointer group/row"
                        title="রশিদ দেখতে ক্লিক করুন"
                      >
                        <td className="py-3 px-3.5 whitespace-nowrap">
                          <span className="px-2.5 py-1 rounded-lg bg-amber-100/80 dark:bg-amber-950/80 border border-amber-300/80 dark:border-amber-800 font-mono text-xs sm:text-sm font-black text-amber-900 dark:text-amber-300 shadow-2xs group-hover/row:border-amber-400">
                            {p.invoiceNumber}
                          </span>
                        </td>
                        <td className="py-3 px-3.5 font-black text-sm text-slate-900 dark:text-white whitespace-nowrap">
                          {p.sellerName}
                        </td>
                        <td className="py-3 px-3.5 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 font-bold text-xs sm:text-[13px] border border-emerald-300/70 dark:border-emerald-800">
                            {p.paddyType || p.varietyName}
                          </span>
                        </td>
                        <td className="py-3 px-3.5 text-right font-black text-sm text-slate-900 dark:text-slate-100 whitespace-nowrap">
                          {toBengaliNumber((p.totalMon || p.quantityMon || 0).toFixed(1))} মণ
                        </td>
                        <td className="py-3 px-3.5 text-right font-black text-sm sm:text-base text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
                          {formatCurrency(p.totalBill || p.totalAmount || 0)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Recent Sales Box */}
        <div className="group relative bg-white dark:bg-slate-900 rounded-3xl border-2 border-slate-200/90 dark:border-slate-800 shadow-md shadow-slate-200/40 dark:shadow-black/50 hover:shadow-2xl hover:shadow-blue-500/10 dark:hover:shadow-black/70 hover:border-blue-300 dark:hover:border-slate-700 hover:-translate-y-1 transition-all duration-300 p-5 space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3.5 border-b-2 border-slate-100 dark:border-slate-800">
              <div className="flex items-center space-x-2.5">
                <span className="p-2 rounded-xl bg-blue-100 dark:bg-blue-950/80 border border-blue-200 dark:border-blue-800 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
                  <Truck className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </span>
                <div>
                  <h3 className="font-black text-base sm:text-lg text-slate-900 dark:text-white tracking-tight">
                    {t('সাম্প্রতিক চালানি বিক্রি', 'Recent Sales')}
                  </h3>
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                    আজকের ও সাম্প্রতিক চালানের হিসাব
                  </span>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <span className="px-2.5 py-1 rounded-full text-xs font-black bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border border-blue-300/70 dark:border-blue-800 shadow-2xs">
                  {toBengaliNumber(recentSales.length)} চালান
                </span>
                <button
                  type="button"
                  onClick={() => setActiveTab('sales')}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-amber-100 dark:hover:bg-slate-700 text-xs font-black text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 hover:border-amber-400 transition-all active:scale-95 shadow-2xs cursor-pointer"
                >
                  {t('সকল দেখুন ➔', 'View All ➔')}
                </button>
              </div>
            </div>

            <div className="overflow-x-auto mt-3 rounded-2xl border-2 border-slate-200/80 dark:border-slate-800 shadow-xs">
              <table className="w-full text-left">
                <thead className="bg-slate-100/90 dark:bg-slate-800 text-slate-900 dark:text-slate-200 font-black text-xs sm:text-[13px] border-b-2 border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="py-3 px-3.5">চালান নং</th>
                    <th className="py-3 px-3.5">পার্টি</th>
                    <th className="py-3 px-3.5">ধানের জাত</th>
                    <th className="py-3 px-3.5 text-right">বস্তা ও মণ</th>
                    <th className="py-3 px-3.5 text-right">মোট বিল</th>
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-slate-100 dark:divide-slate-800/80 bg-white dark:bg-slate-900">
                  {recentSales.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-10 text-center text-slate-500 dark:text-slate-400 font-bold text-sm">
                        <Truck className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                        {t('কোনো বিক্রয় চালান পাওয়া যায়নি।', 'No sales challans found.')}
                      </td>
                    </tr>
                  ) : (
                    recentSales.map(s => (
                      <tr 
                        key={s.id} 
                        onClick={() => onViewReceipt('sale', s)}
                        className="hover:bg-blue-50/60 dark:hover:bg-slate-800/80 transition-colors cursor-pointer group/row"
                        title="চালান রশিদ দেখতে ক্লিক করুন"
                      >
                        <td className="py-3 px-3.5 whitespace-nowrap">
                          <span className="px-2.5 py-1 rounded-lg bg-blue-100/80 dark:bg-blue-950/80 border border-blue-300/80 dark:border-blue-800 font-mono text-xs sm:text-sm font-black text-blue-900 dark:text-blue-300 shadow-2xs group-hover/row:border-blue-400">
                            {s.challanNumber}
                          </span>
                        </td>
                        <td className="py-3 px-3.5 font-black text-sm text-slate-900 dark:text-white whitespace-nowrap">
                          {s.partyName}
                        </td>
                        <td className="py-3 px-3.5 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/70 text-indigo-800 dark:text-indigo-300 font-bold text-xs sm:text-[13px] border border-indigo-300/70 dark:border-indigo-800">
                            {s.varietyName}
                          </span>
                        </td>
                        <td className="py-3 px-3.5 text-right font-black text-sm text-slate-900 dark:text-slate-100 whitespace-nowrap">
                          {toBengaliNumber(s.bagCount)} বস্তা ({toBengaliNumber(s.totalMon.toFixed(1))} মণ)
                        </td>
                        <td className="py-3 px-3.5 text-right font-black text-sm sm:text-base text-blue-700 dark:text-blue-400 whitespace-nowrap">
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
      </div>

      {/* ========================================================================= */}
      {/* 5. UNIFIED SUMMARY MODAL POPUP (Replicating professional receipt popup) */}
      {/* ========================================================================= */}
      {isSummaryModalOpen && (
        <div 
          className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
          onClick={(e) => e.target === e.currentTarget && closeSummaryModal()}
        >
          <div 
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-emerald-800 rounded-3xl shadow-2xl max-w-xl w-full p-5 sm:p-6 text-slate-900 dark:text-slate-100 flex flex-col max-h-[92vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-emerald-800">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-amber-400 text-slate-950">
                  <Share2 className="w-5 h-5 text-slate-950" />
                </div>
                <div>
                  <h3 className="font-black text-base sm:text-lg text-slate-900 dark:text-white">
                    {t('আজকের দিনের সমাপনী সামারি ও শেয়ার', 'Daily Summary & Share')}
                  </h3>
                  <p className="text-xs text-emerald-700 dark:text-emerald-300">
                    {settings.businessName || 'মেসার্স সোনার বাংলা ধান আড়ত'} • {formattedDateBangla}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeSummaryModal}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 text-xl font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* a) Summary Details Header: Today's Paddy Purchase, Sales, Expenses, and Net Balance */}
            <div className="my-4 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="bg-slate-50 dark:bg-emerald-950/70 border border-slate-200 dark:border-emerald-800/80 p-2.5 rounded-xl">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold block">{t('ধান কেনা', 'Purchases')}</span>
                <span className="text-sm font-black text-slate-900 dark:text-white block mt-0.5">{formatCurrency(todayPurchaseAmount)}</span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-300">{toBengaliNumber(todayPurchaseMon.toFixed(1))} মণ</span>
              </div>

              <div className="bg-slate-50 dark:bg-emerald-950/70 border border-slate-200 dark:border-emerald-800/80 p-2.5 rounded-xl">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold block">{t('চালানি বিক্রি', 'Sales')}</span>
                <span className="text-sm font-black text-amber-600 dark:text-amber-300 block mt-0.5">{formatCurrency(todaySalesAmount)}</span>
                <span className="text-[10px] text-amber-700 dark:text-amber-300/80">{toBengaliNumber(todaySaleBags)} বস্তা</span>
              </div>

              <div className="bg-slate-50 dark:bg-emerald-950/70 border border-slate-200 dark:border-emerald-800/80 p-2.5 rounded-xl">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold block">{t('মোট খরচ/পরিশোধ', 'Expenses')}</span>
                <span className="text-sm font-black text-rose-600 dark:text-rose-300 block mt-0.5">{formatCurrency(todayCashOut)}</span>
                <span className="text-[10px] text-rose-600 dark:text-rose-300/80">নগদ তহবিল থেকে</span>
              </div>

              <div className="bg-slate-50 dark:bg-emerald-950/70 border border-slate-200 dark:border-emerald-800/80 p-2.5 rounded-xl">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold block">{t('আনুমানিক লাভ', 'Net Profit')}</span>
                <span className={`text-sm font-black block mt-0.5 ${todayNetProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                  {todayNetProfit >= 0 ? '+' : ''}{formatCurrency(todayNetProfit)}
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">নীট হিসাব</span>
              </div>
            </div>

            {/* Live SMS / Text Preview Card */}
            <div className="space-y-1.5 mb-4">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center space-x-1">
                <MessageSquare className="w-3.5 h-3.5 text-amber-500" />
                <span>লাইভ সামারি প্রিভিউ (WhatsApp ও SMS টেক্সট)</span>
              </span>
              <div className="bg-slate-900 text-emerald-300 dark:bg-slate-950 dark:text-emerald-200 p-3 rounded-xl border border-slate-700 dark:border-emerald-900/80 text-xs font-mono whitespace-pre-wrap leading-relaxed max-h-36 overflow-y-auto">
                {summaryText}
              </div>
            </div>

            {/* Recipient Phone for SMS */}
            <div className="mb-4">
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                প্রাপকের মোবাইল নম্বর (SMS পাঠানোর জন্য)
              </label>
              <input
                type="tel"
                value={smsRecipientPhone}
                onChange={e => setSmsRecipientPhone(e.target.value)}
                placeholder="017xxxxxxxx"
                className="w-full p-2 text-xs rounded-xl border border-slate-300 dark:border-emerald-800 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-amber-400 focus:outline-none"
              />
              {serverSmsMessage && (
                <p className={`text-xs mt-1 font-bold ${serverSmsMessage.startsWith('✓') ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                  {serverSmsMessage}
                </p>
              )}
            </div>

            {/* b) Action Buttons Grid: Thermal, A4, WhatsApp, Mobile SMS, Server SMS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              {/* Button 1: Thermal Print */}
              <button
                type="button"
                onClick={handlePrintThermal}
                className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-bold text-xs flex items-center justify-center space-x-2 border border-slate-300 dark:border-slate-700 transition active:scale-95 cursor-pointer"
              >
                <Printer className="w-4 h-4 text-amber-500" />
                <span>🖨️ থার্মাল প্রিন্ট (58mm)</span>
              </button>

              {/* Button 2: A4 Memo / PDF */}
              <button
                type="button"
                onClick={handlePrintA4}
                className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-bold text-xs flex items-center justify-center space-x-2 border border-slate-300 dark:border-slate-700 transition active:scale-95 cursor-pointer"
              >
                <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>📄 A4 মেমো / PDF</span>
              </button>

              {/* Button 3: WhatsApp Memo */}
              <button
                type="button"
                onClick={handleShareWhatsApp}
                className="p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center space-x-2 transition active:scale-95 cursor-pointer shadow-xs"
              >
                <MessageSquare className="w-4 h-4 text-white" />
                <span>💬 WhatsApp মেমো পাঠান</span>
              </button>

              {/* Button 4: Mobile SMS App */}
              <button
                type="button"
                onClick={handleMobileSMS}
                className="p-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center space-x-2 transition active:scale-95 cursor-pointer shadow-xs"
              >
                <Smartphone className="w-4 h-4 text-white" />
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

      {/* Floating Cash Entry Modal (➕ ক্যাশ যোগ) */}
      {isCashModalOpen && (
        <div 
          className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setIsCashModalOpen(false)}
        >
          <div 
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-emerald-800/80 rounded-3xl shadow-2xl max-w-md w-full p-6 text-slate-900 dark:text-slate-100 animate-in fade-in zoom-in-95 duration-150"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-emerald-800/80">
              <div className="flex items-center space-x-2">
                <Coins className="w-5 h-5 text-amber-500" />
                <h3 className="font-black text-base text-slate-900 dark:text-white">
                  {t('হাটের ক্যাশ এন্ট্রি (Cash Entry)', 'Cash Entry')}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCashModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddCash} className="space-y-4 pt-4 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-emerald-300 mb-1">
                  {t('লেনদেনের ধরন', 'Entry Type')}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCashType('IN')}
                    className={`py-2 px-3 rounded-xl font-bold border transition cursor-pointer ${
                      cashType === 'IN'
                        ? 'bg-emerald-600 text-white border-emerald-500 shadow-xs'
                        : 'border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    + ক্যাশ জমা (IN)
                  </button>
                  <button
                    type="button"
                    onClick={() => setCashType('OUT')}
                    className={`py-2 px-3 rounded-xl font-bold border transition cursor-pointer ${
                      cashType === 'OUT'
                        ? 'bg-rose-600 text-white border-rose-500 shadow-xs'
                        : 'border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    - ক্যাশ খরচ (OUT)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-emerald-300 mb-1">
                  {t('টাকার পরিমাণ (৳) *', 'Amount (৳) *')}
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  placeholder="যেমন: ৫০,০০০"
                  value={cashAmount}
                  onChange={e => setCashAmount(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full p-3 rounded-xl border border-slate-300 dark:border-emerald-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-black text-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-emerald-300 mb-1">
                  {t('উৎস / বিবরণ *', 'Source / Recipient *')}
                </label>
                <input
                  type="text"
                  required
                  placeholder="যেমন: ব্যাংক থেকে উত্তোলন / হাটের প্রারম্ভিক ক্যাশ"
                  value={cashSource}
                  onChange={e => setCashSource(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-emerald-300 mb-1">
                    {t('তারিখ', 'Date')}
                  </label>
                  <input
                    type="date"
                    value={cashDate}
                    onChange={e => setCashDate(e.target.value)}
                    className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-emerald-300 mb-1">
                    {t('মন্তব্য / নোট', 'Note')}
                  </label>
                  <input
                    type="text"
                    placeholder="ঐচ্ছিক..."
                    value={cashNote}
                    onChange={e => setCashNote(e.target.value)}
                    className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsCashModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold cursor-pointer"
                >
                  {t('বাতিল', 'Cancel')}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-emerald-950 font-black shadow-xs transition active:scale-95 cursor-pointer"
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
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-emerald-800/80 rounded-3xl shadow-2xl max-w-3xl w-full p-6 text-slate-900 dark:text-slate-100 flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-emerald-800/80">
              <div className="flex items-center space-x-2">
                <Coins className="w-6 h-6 text-amber-500" />
                <div>
                  <h3 className="font-black text-lg text-slate-900 dark:text-white">
                    {t('আড়তের ক্যাশ বুক লেজার (Cash Book)', 'Cash Book Ledger')}
                  </h3>
                  <p className="text-xs text-emerald-700 dark:text-emerald-300">
                    {t('হাতে অবশিষ্ট নগদ: ', 'Current Cash in Hand: ')}<b className="text-amber-600 dark:text-amber-300">{formatCurrency(cashInHand)}</b>
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
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs cursor-pointer shadow-xs"
                >
                  + ক্যাশ জমা/খরচ
                </button>
                <button
                  type="button"
                  onClick={() => setIsCashBookOpen(false)}
                  className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 text-lg font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto mt-4">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 dark:bg-emerald-900/60 text-slate-700 dark:text-emerald-300 sticky top-0 uppercase font-bold border-b border-slate-200 dark:border-emerald-800">
                  <tr>
                    <th className="py-2.5 px-3">তারিখ</th>
                    <th className="py-2.5 px-3">ধরন</th>
                    <th className="py-2.5 px-3">বিবরণ / উৎস</th>
                    <th className="py-2.5 px-3 text-right">জমা (IN)</th>
                    <th className="py-2.5 px-3 text-right">খরচ (OUT)</th>
                    <th className="py-2.5 px-3 text-center">অ্যাকশন</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {cashLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        {t('কোনো ক্যাশ এন্ট্রি পাওয়া যায়নি।', 'No cash entries found.')}
                      </td>
                    </tr>
                  ) : (
                    cashLogs.map(log => (
                      <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition">
                        <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-slate-300">{log.date}</td>
                        <td className="py-2.5 px-3">
                          {log.type === 'IN' ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                              + জমা
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
                              - খরচ
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">
                          <div>{log.sourceOrRecipient}</div>
                          {log.note && <div className="text-[10px] text-slate-400 font-normal">{log.note}</div>}
                        </td>
                        <td className="py-2.5 px-3 text-right font-black text-emerald-600 dark:text-emerald-400">
                          {log.type === 'IN' ? formatCurrency(log.amount) : '---'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-black text-rose-600 dark:text-rose-400">
                          {log.type === 'OUT' ? formatCurrency(log.amount) : '---'}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => setDeleteCashId(log.id)}
                            className="p-1 rounded text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-950 cursor-pointer"
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

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setIsCashBookOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-bold text-xs cursor-pointer"
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

      {/* 6. CUSTOM INTERACTIVE CALENDAR MODAL (Full 2-Year range, 100% bug-free in iframe, beautiful Bangla/English UI) */}
      {isDatePickerOpen && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150"
          onClick={() => setIsDatePickerOpen(false)}
        >
          <div
            className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-sm sm:max-w-md w-full p-5 sm:p-6 text-slate-900 dark:text-slate-100 flex flex-col space-y-4 animate-in zoom-in-95 duration-150"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-amber-400 text-slate-950 font-black">
                  <Calendar className="w-5 h-5 text-slate-950" />
                </div>
                <div>
                  <h3 className="font-black text-base sm:text-lg text-slate-900 dark:text-white">
                    {t('তারিখ নির্বাচন ক্যালেন্ডার', 'Select Date Calendar')}
                  </h3>
                  <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                    গত ২ বছরের যে কোনো দিন দেখুন (ভবিষ্যতের তারিখ নিষিদ্ধ)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsDatePickerOpen(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 text-lg font-bold cursor-pointer rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                ✕
              </button>
            </div>

            {/* Quick Presets: [ 🟢 আজ ], [ 🟡 গতকাল ], [ 🔵 ৭ দিন আগে ] */}
            <div className="flex items-center space-x-2 pt-1">
              <button
                type="button"
                onClick={() => handleSelectDateFromCalendar(todayStr)}
                className="flex-1 py-1.5 px-2 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 hover:bg-emerald-200 text-emerald-900 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 text-xs font-black transition active:scale-95 cursor-pointer text-center"
              >
                🟢 আজ (Today)
              </button>
              <button
                type="button"
                onClick={() => {
                  const y = new Date();
                  y.setDate(y.getDate() - 1);
                  handleSelectDateFromCalendar(formatLocalYMD(y));
                }}
                className="flex-1 py-1.5 px-2 rounded-xl bg-amber-100 dark:bg-amber-950/80 hover:bg-amber-200 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-800 text-xs font-black transition active:scale-95 cursor-pointer text-center"
              >
                🟡 গতকাল
              </button>
              <button
                type="button"
                onClick={() => {
                  const s = new Date();
                  s.setDate(s.getDate() - 7);
                  handleSelectDateFromCalendar(formatLocalYMD(s));
                }}
                className="flex-1 py-1.5 px-2 rounded-xl bg-blue-100 dark:bg-blue-950/80 hover:bg-blue-200 text-blue-900 dark:text-blue-300 border border-blue-300 dark:border-blue-800 text-xs font-black transition active:scale-95 cursor-pointer text-center"
              >
                🔵 ৭ দিন আগে
              </button>
            </div>

            {/* Month & Year Controller Bar */}
            <div className="flex items-center justify-between bg-slate-100 dark:bg-slate-800/80 p-2 rounded-2xl border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                disabled={!canGoPrevMonth}
                onClick={handlePrevMonth}
                className={`p-2 rounded-xl transition ${
                  canGoPrevMonth
                    ? 'hover:bg-white dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 cursor-pointer shadow-2xs'
                    : 'opacity-25 cursor-not-allowed text-slate-400'
                }`}
                title="পূর্বের মাস"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <div className="flex items-center space-x-2">
                {/* Month Dropdown */}
                <select
                  value={calendarViewDate.month}
                  onChange={e => {
                    const m = Number(e.target.value);
                    setCalendarViewDate(prev => ({ ...prev, month: m }));
                  }}
                  className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-black text-xs sm:text-sm py-1.5 px-2.5 rounded-xl border border-slate-300 dark:border-slate-700 cursor-pointer shadow-2xs focus:ring-2 focus:ring-amber-400 focus:outline-none"
                >
                  {BANGLA_MONTHS.map((name, idx) => {
                    const isFutureMonth = calendarViewDate.year === currentRealYear && idx > currentRealMonth;
                    const isOlderMonth = calendarViewDate.year === minAllowedYear && idx < currentRealMonth;
                    return (
                      <option key={idx} value={idx} disabled={isFutureMonth || isOlderMonth}>
                        {name}
                      </option>
                    );
                  })}
                </select>

                {/* Year Dropdown (Strictly 2 years past up to current year) */}
                <select
                  value={calendarViewDate.year}
                  onChange={e => {
                    const y = Number(e.target.value);
                    setCalendarViewDate(prev => {
                      let m = prev.month;
                      if (y === currentRealYear && m > currentRealMonth) m = currentRealMonth;
                      if (y === minAllowedYear && m < currentRealMonth) m = currentRealMonth;
                      return { year: y, month: m };
                    });
                  }}
                  className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-black text-xs sm:text-sm py-1.5 px-2.5 rounded-xl border border-slate-300 dark:border-slate-700 cursor-pointer shadow-2xs focus:ring-2 focus:ring-amber-400 focus:outline-none"
                >
                  {Array.from({ length: 3 }, (_, idx) => minAllowedYear + idx).map(year => (
                    <option key={year} value={year}>
                      {toBengaliNumber(year)} ({year})
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                disabled={!canGoNextMonth}
                onClick={handleNextMonth}
                className={`p-2 rounded-xl transition ${
                  canGoNextMonth
                    ? 'hover:bg-white dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 cursor-pointer shadow-2xs'
                    : 'opacity-25 cursor-not-allowed text-slate-400'
                }`}
                title="পরের মাস"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {/* Days of Week Header */}
            <div className="grid grid-cols-7 gap-1 text-center font-black text-xs text-slate-500 dark:text-slate-400 py-1 border-b border-slate-100 dark:border-slate-800">
              {BANGLA_DAYS_SHORT.map((day, idx) => (
                <div key={idx} className={idx === 5 ? 'text-rose-500' : ''}>
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Days 7-Column Grid */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((cell, idx) => {
                if (!cell.isCurrentMonth) {
                  return (
                    <div
                      key={idx}
                      className="p-2 text-center text-xs text-slate-300 dark:text-slate-700 select-none font-medium"
                    >
                      {toBengaliNumber(cell.dayNumber)}
                    </div>
                  );
                }

                if (cell.isDisabled) {
                  return (
                    <div
                      key={idx}
                      className="p-2 text-center text-xs font-semibold text-slate-300 dark:text-slate-700 select-none cursor-not-allowed bg-slate-50/50 dark:bg-slate-800/30 rounded-xl"
                      title="এই তারিখ নির্বাচন করা সম্ভব নয়"
                    >
                      {toBengaliNumber(cell.dayNumber)}
                    </div>
                  );
                }

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectDateFromCalendar(cell.dateStr)}
                    className={`p-2 text-center text-xs sm:text-sm rounded-xl font-black transition-all active:scale-90 cursor-pointer flex flex-col items-center justify-center relative ${
                      cell.isSelected
                        ? 'bg-emerald-600 text-white shadow-md scale-105 ring-2 ring-emerald-400'
                        : cell.isToday
                        ? 'bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-300 border-2 border-amber-400 hover:bg-amber-200'
                        : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-900 dark:text-slate-100'
                    }`}
                  >
                    <span>{toBengaliNumber(cell.dayNumber)}</span>
                    {cell.isToday && (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-0.5" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Modal Footer */}
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
              <div className="text-slate-600 dark:text-slate-400 font-semibold truncate">
                বর্তমানে সক্রিয়: <b className="text-emerald-600 dark:text-emerald-400">{formattedDateBangla}</b>
              </div>
              <button
                type="button"
                onClick={() => setIsDatePickerOpen(false)}
                className="px-3.5 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold transition cursor-pointer"
              >
                বন্ধ করুন
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ========================================================================= */
/* 2. MAIN APPLICATION ROUTER & CONTAINER (FULL-WIDTH PC-FRIENDLY & DYNAMIC THEME) */
/* ========================================================================= */
function MainApp() {
  const [activeTab, setActiveTab] = useState<ActiveTab>(() => {
    try {
      const saved = localStorage.getItem('paddy_pos_active_tab');
      if (saved && ['purchase', 'accounts', 'rewards', 'sales', 'stock', 'dashboard', 'varieties', 'settings'].includes(saved)) {
        return saved as ActiveTab;
      }
    } catch {}
    return 'dashboard';
  });

  const handleSetActiveTab = (tab: ActiveTab) => {
    setActiveTab(tab);
    try {
      localStorage.setItem('paddy_pos_active_tab', tab);
    } catch {}
  };

  const [quickPurchaseOpen, setQuickPurchaseOpen] = useState(false);
  const [quickSaleOpen, setQuickSaleOpen] = useState(false);
  const [isDailySummaryExternalOpen, setIsDailySummaryExternalOpen] = useState(false);
  const { t } = useThemeLanguage();

  const [receiptState, setReceiptState] = useState<{
    isOpen: boolean;
    type: 'purchase' | 'sale';
    item: Purchase | Sale | null;
  }>({
    isOpen: false,
    type: 'purchase',
    item: null,
  });

  const handleViewReceipt = (type: 'purchase' | 'sale', item: unknown) => {
    setReceiptState({
      isOpen: true,
      type,
      item: item as PurchaseMemo | Sale,
    });
  };

  const handleCloseReceipt = () => {
    setReceiptState(prev => ({ ...prev, isOpen: false }));
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans pb-16 md:pb-6 transition-colors duration-200">
      {/* Top Header & Navigation with 3-Line Hamburger Menu & Global Theme Switcher */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={handleSetActiveTab}
        onOpenQuickPurchase={() => {
          handleSetActiveTab('purchase');
          setQuickPurchaseOpen(true);
        }}
        onOpenQuickSale={() => {
          handleSetActiveTab('sales');
          setQuickSaleOpen(true);
        }}
        onOpenDailySummary={() => {
          handleSetActiveTab('dashboard');
          setIsDailySummaryExternalOpen(true);
        }}
      />

      {/* Main Content Area - FULL-WIDTH PC Screen Friendly Container (No max-w-7xl restriction) */}
      <main className="flex-1 w-full px-4 lg:px-6 py-5 sm:py-6 overflow-y-auto">
        {activeTab === 'dashboard' && (
          <Dashboard
            setActiveTab={handleSetActiveTab}
            onOpenQuickPurchase={() => {
              handleSetActiveTab('purchase');
              setQuickPurchaseOpen(true);
            }}
            onOpenQuickSale={() => {
              handleSetActiveTab('sales');
              setQuickSaleOpen(true);
            }}
            onViewReceipt={handleViewReceipt}
            isSummaryModalOpenExternal={isDailySummaryExternalOpen}
            onCloseSummaryModalExternal={() => setIsDailySummaryExternalOpen(false)}
          />
        )}

        {activeTab === 'purchase' && (
          <PurchaseModule
            onViewReceipt={handleViewReceipt}
            openNewModalInitially={quickPurchaseOpen}
            onSwitchToSale={() => {
              setActiveTab('sales');
              setQuickSaleOpen(true);
            }}
          />
        )}

        {activeTab === 'sales' && (
          <SalesModule
            onViewReceipt={handleViewReceipt}
            openNewModalInitially={quickSaleOpen}
            onSwitchToPurchase={() => {
              setActiveTab('purchase');
              setQuickPurchaseOpen(true);
            }}
          />
        )}

        {activeTab === 'accounts' && <AccountsModule onViewReceipt={handleViewReceipt} />}
        
        {activeTab === 'rewards' && <LoyaltyRewardsModule />}

        {activeTab === 'stock' && <StockModule />}

        {activeTab === 'varieties' && <VarietiesModule />}

        {activeTab === 'settings' && <SettingsModal />}
      </main>

      {/* Universal Receipt & Invoice Modal */}
      <ReceiptModal
        isOpen={receiptState.isOpen}
        onClose={handleCloseReceipt}
        type={receiptState.type}
        item={receiptState.item}
      />

      {/* Mobile Bottom Fixed Nav Bar (5 Core Tabs) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shadow-lg px-2 py-1 flex justify-around transition-colors">
        <button
          type="button"
          onClick={() => handleSetActiveTab('dashboard')}
          className={`flex flex-col items-center py-1 px-2 rounded-lg text-[10px] font-bold ${
            activeTab === 'dashboard' ? 'text-emerald-800 dark:text-amber-300 font-black' : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <LayoutDashboard className="w-5 h-5 mb-0.5" />
          <span>{t('ড্যাশবোর্ড', 'Dashboard')}</span>
        </button>

        <button
          type="button"
          onClick={() => handleSetActiveTab('purchase')}
          className={`flex flex-col items-center py-1 px-2 rounded-lg text-[10px] font-bold ${
            activeTab === 'purchase' ? 'text-emerald-800 dark:text-amber-300 font-black' : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <ShoppingBag className="w-5 h-5 mb-0.5" />
          <span>{t('ধান কেনা', 'Purchase')}</span>
        </button>

        <button
          type="button"
          onClick={() => handleSetActiveTab('sales')}
          className={`flex flex-col items-center py-1 px-2 rounded-lg text-[10px] font-bold ${
            activeTab === 'sales' ? 'text-emerald-800 dark:text-amber-300 font-black' : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <Truck className="w-5 h-5 mb-0.5" />
          <span>{t('বিক্রি চালান', 'Sales')}</span>
        </button>

        <button
          type="button"
          onClick={() => handleSetActiveTab('stock')}
          className={`flex flex-col items-center py-1 px-2 rounded-lg text-[10px] font-bold ${
            activeTab === 'stock' ? 'text-emerald-800 dark:text-amber-300 font-black' : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <Warehouse className="w-5 h-5 mb-0.5" />
          <span>{t('স্টক', 'Stock')}</span>
        </button>

        <button
          type="button"
          onClick={() => handleSetActiveTab('accounts')}
          className={`flex flex-col items-center py-1 px-2 rounded-lg text-[10px] font-bold ${
            activeTab === 'accounts' ? 'text-emerald-800 dark:text-amber-300 font-black' : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <BookOpen className="w-5 h-5 mb-0.5" />
          <span>{t('খতিয়ান', 'Ledger')}</span>
        </button>
      </nav>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <ThemeLanguageProvider>
          <MainApp />
        </ThemeLanguageProvider>
      </DataProvider>
    </AuthProvider>
  );
}
