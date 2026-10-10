import React, { useState, useMemo, useRef } from 'react';
import { 
  BookOpen, 
  Users, 
  Building2, 
  Search, 
  Printer, 
  PlusCircle, 
  Calendar, 
  Phone, 
  MapPin, 
  Eye, 
  CheckCircle, 
  Clock, 
  ArrowUpDown, 
  Filter,
  MoreVertical,
  Trash2,
  CreditCard,
  Coins
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { useThemeLanguage } from '../context/ThemeLanguageContext';
import { Seller, Buyer, PurchaseMemo } from '../types';
import { formatCurrency, toBengaliNumber } from '../utils/weight';
import { MemberDetailsPage } from './MemberDetailsPage';
import { ConfirmationModal } from './ConfirmationModal';

interface AccountsModuleProps {
  onViewReceipt?: (type: 'purchase' | 'sale', item: PurchaseMemo | unknown) => void;
}

export const AccountsModule: React.FC<AccountsModuleProps> = ({ onViewReceipt }) => {
  const { 
    sellers, 
    parties, 
    purchases, 
    sales, 
    payments, 
    cashLogs,
    cashInHand,
    totalCurrentDue,
    totalPaidAmount,
    todayCashDisbursed,
    getSellerStats,
    recordSellerPayment,
    addCashEntry,
    deleteSeller,
    deleteParty,
    settings 
  } = useData();

  const { t } = useThemeLanguage();

  const [activeSubTab, setActiveSubTab] = useState<'sellers' | 'buyers' | 'cashbook' | 'payments'>('sellers');
  const [searchTerm, setSearchTerm] = useState('');
  const [detailedMember, setDetailedMember] = useState<{ type: 'seller' | 'buyer'; id: string } | null>(null);

  // Scroll Position Memory for Khotiyan list navigation
  const scrollPositionRef = useRef<number>(0);

  const handleOpenDetailedMember = (type: 'seller' | 'buyer', id: string) => {
    const scrollContainer = document.querySelector('main');
    scrollPositionRef.current = (scrollContainer && scrollContainer.scrollTop > 0)
      ? scrollContainer.scrollTop
      : (window.scrollY || document.documentElement.scrollTop || 0);
    setDetailedMember({ type, id });
  };

  const handleBackFromDetails = () => {
    const savedPos = scrollPositionRef.current;
    setDetailedMember(null);
    requestAnimationFrame(() => {
      const scrollContainer = document.querySelector('main');
      if (scrollContainer && savedPos > 0) {
        scrollContainer.scrollTop = savedPos;
      }
      window.scrollTo(0, savedPos);
      document.documentElement.scrollTop = savedPos;
    });
  };

  // Khotiyan Filters (Requirement 4.C)
  const [sortOption, setSortOption] = useState<'highest_due' | 'oldest_due' | 'name'>('highest_due');
  const [timeFilter, setTimeFilter] = useState<'all' | 'this_month' | 'last_month'>('all');

  // Single Payment Route Policy Modal State (Requirement 4.B)
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentSellerId, setPaymentSellerId] = useState('');
  const [paymentAmount, setPaymentAmount] = useState<number | ''>('');
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Bank' | 'Bkash'>('Cash');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentNote, setPaymentNote] = useState('');
  const [submittingPayment, setSubmittingPayment] = useState(false);

  // Cash Book Entry Modal State
  const [isCashModalOpen, setIsCashModalOpen] = useState(false);
  const [cashType, setCashType] = useState<'IN' | 'OUT'>('IN');
  const [cashAmount, setCashAmount] = useState<number | ''>('');
  const [cashSource, setCashSource] = useState('');
  const [cashDate, setCashDate] = useState(new Date().toISOString().split('T')[0]);
  const [cashNote, setCashNote] = useState('');

  // 3-Dot Menus & Delete Confirmation
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [deleteSellerTarget, setDeleteSellerTarget] = useState<Seller | null>(null);
  const [deleteBuyerTarget, setDeleteBuyerTarget] = useState<Buyer | null>(null);

  // Open Payment modal pre-filled for a specific seller with editable custom amount
  const handleOpenPayment = (sellerId: string) => {
    const stats = getSellerStats(sellerId);
    if (stats.currentDue <= 0) {
      alert(t('এই বিক্রেতার কোনো বকেয়া নেই।', 'This seller has zero outstanding balance.'));
      return;
    }
    setPaymentSellerId(sellerId);
    setPaymentAmount(''); // Freely editable custom partial payment by default
    setPaymentMethod('Cash');
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setPaymentNote('খতিয়ানের বকেয়া বিল পরিশোধ');
    setIsPaymentModalOpen(true);
  };

  // Submit Payment Disbursed to Seller (Strictly from Khotiyan)
  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = typeof paymentAmount === 'number' ? paymentAmount : 0;
    if (numAmount <= 0) {
      alert(t('সঠিক টাকার অঙ্ক লিখুন', 'Please enter a valid amount'));
      return;
    }

    const stats = getSellerStats(paymentSellerId);
    if (numAmount > stats.currentDue) {
      alert(t('পরিশোধের পরিমাণ বিক্রেতার মোট বকেয়ার চেয়ে বেশি হতে পারবে না।', 'Payment cannot exceed seller current due.'));
      return;
    }

    setSubmittingPayment(true);
    try {
      await recordSellerPayment({
        sellerId: paymentSellerId,
        amount: numAmount,
        date: paymentDate,
        paymentMethod,
        note: paymentNote.trim(),
      });
      setIsPaymentModalOpen(false);
      setPaymentAmount('');
      setPaymentNote('');
    } catch (err) {
      console.error(err);
      alert(t('পরিশোধ সম্পন্ন করা সম্ভব হয়নি', 'Payment failed'));
    } finally {
      setSubmittingPayment(false);
    }
  };

  const handleSubmitCash = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = typeof cashAmount === 'number' ? cashAmount : 0;
    if (num <= 0) {
      alert(t('সঠিক টাকার পরিমাণ লিখুন।', 'Please enter a valid amount.'));
      return;
    }
    if (!cashSource.trim()) {
      alert(t('টাকার উৎস বা খরচের বিবরণ লিখুন।', 'Please enter source or recipient description.'));
      return;
    }
    await addCashEntry({
      type: cashType,
      amount: num,
      sourceOrRecipient: cashSource.trim(),
      date: cashDate,
      note: cashNote.trim(),
    });
    setIsCashModalOpen(false);
    setCashAmount('');
    setCashSource('');
    setCashNote('');
  };

  // Filtered & Sorted Sellers based on Central Ledger Engine
  const processedSellers = useMemo(() => {
    const now = new Date();
    const thisMonth = now.toISOString().slice(0, 7); // YYYY-MM
    const lastMonthDate = new Date();
    lastMonthDate.setMonth(now.getMonth() - 1);
    const lastMonth = lastMonthDate.toISOString().slice(0, 7);

    return sellers
      .map(seller => {
        const stats = getSellerStats(seller.id);
        return {
          ...seller,
          stats,
        };
      })
      .filter(item => {
        // Universal search: Name, Phone, or Village (গ্রাম)
        if (searchTerm.trim()) {
          const q = searchTerm.toLowerCase();
          const match = 
            item.name.toLowerCase().includes(q) ||
            item.phone.includes(q) ||
            (item.village && item.village.toLowerCase().includes(q)) ||
            (item.address && item.address.toLowerCase().includes(q));
          if (!match) return false;
        }

        // Time Filters
        if (timeFilter === 'this_month') {
          return item.stats.lastDate && item.stats.lastDate.startsWith(thisMonth);
        }
        if (timeFilter === 'last_month') {
          return item.stats.lastDate && item.stats.lastDate.startsWith(lastMonth);
        }
        return true;
      })
      .sort((a, b) => {
        if (sortOption === 'highest_due') {
          return b.stats.currentDue - a.stats.currentDue;
        }
        if (sortOption === 'oldest_due') {
          const dateA = a.stats.lastDate ? new Date(a.stats.lastDate).getTime() : 0;
          const dateB = b.stats.lastDate ? new Date(b.stats.lastDate).getTime() : 0;
          return dateA - dateB;
        }
        return a.name.localeCompare(b.name, 'bn');
      });
  }, [sellers, purchases, payments, searchTerm, timeFilter, sortOption]);

  // If detailed member is selected, show their full ledger history timeline
  if (detailedMember) {
    return (
      <MemberDetailsPage
        memberType={detailedMember.type}
        memberId={detailedMember.id}
        onBack={() => setDetailedMember(null)}
        onViewReceipt={onViewReceipt}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-emerald-950/90 border border-emerald-800/80 p-5 rounded-3xl shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-white flex items-center space-x-2.5">
            <BookOpen className="w-6 h-6 text-amber-400" />
            <span>{t('খতিয়ান ও হিসাব-নিকাশ (Khotiyan & Accounts)', 'Khotiyan & Central Ledger')}</span>
          </h2>
          <p className="text-xs text-emerald-300/80 mt-1 max-w-2xl">
            {t(
              'সেন্ট্রাল লেজার ইঞ্জিন: বর্তমান বকেয়া = মোট কেনা বিল - খতিয়ানের পরিশোধ। নগদ টাকা পরিশোধের অপশন শুধুমাত্র এই পেজে কার্যকর।',
              'Single Source of Truth: Current Due = Total Bills - Total Khotiyan Payments. Payments disburse solely from here.'
            )}
          </p>
        </div>

        {/* Subtabs Selector */}
        <div className="flex bg-slate-900 border border-emerald-800/80 p-1 rounded-2xl text-xs sm:text-sm font-bold">
          <button
            type="button"
            onClick={() => setActiveSubTab('sellers')}
            className={`px-4 py-2 rounded-xl transition cursor-pointer ${
              activeSubTab === 'sellers'
                ? 'bg-amber-400 text-emerald-950 font-black shadow-md'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            {t('বিক্রেতার খতিয়ান', 'Seller Khotiyan')} ({toBengaliNumber(sellers.length)})
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('buyers')}
            className={`px-4 py-2 rounded-xl transition cursor-pointer ${
              activeSubTab === 'buyers'
                ? 'bg-amber-400 text-emerald-950 font-black shadow-md'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            {t('ক্রেতার খতিয়ান', 'Buyer Khotiyan')} ({toBengaliNumber(parties.length)})
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('cashbook')}
            className={`px-4 py-2 rounded-xl transition cursor-pointer ${
              activeSubTab === 'cashbook'
                ? 'bg-amber-400 text-emerald-950 font-black shadow-md'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            {t('ক্যাশ বুক লেজার', 'Cash Book')}
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('payments')}
            className={`px-4 py-2 rounded-xl transition cursor-pointer ${
              activeSubTab === 'payments'
                ? 'bg-amber-400 text-emerald-950 font-black shadow-md'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            {t('পরিশোধ হিস্ট্রি', 'Payment Log')} ({toBengaliNumber(payments.length)})
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SUBTAB 1: SELLERS KHOTIYAN (Single Payment Route: + পরিশোধ lives here!) */}
      {/* ========================================================================= */}
      {activeSubTab === 'sellers' && (
        <div className="space-y-4">
          
          {/* Universal Search & Khotiyan Filters (Name, Phone, Village / গ্রাম) */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-emerald-950/80 p-4 rounded-3xl border border-emerald-800/70 shadow-sm">
            
            {/* Universal Search Input */}
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 absolute left-3 top-3 text-emerald-400" />
              <input
                type="text"
                placeholder={t('বিক্রেতার নাম, মোবাইল বা গ্রাম (Village) খুঁজুন...', 'Search seller name, phone, or village...')}
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-xl border border-emerald-800 bg-slate-900 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>

            {/* Khotiyan Sort Toggles & Time Filters */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {/* Sort Toggles */}
              <div className="flex items-center space-x-1 bg-slate-900 border border-emerald-800 rounded-xl p-1">
                <span className="text-[11px] font-bold text-emerald-400 px-1 flex items-center space-x-1">
                  <ArrowUpDown className="w-3 h-3" />
                  <span>সর্ট:</span>
                </span>
                <button
                  type="button"
                  onClick={() => setSortOption('highest_due')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                    sortOption === 'highest_due' ? 'bg-amber-400 text-emerald-950 font-black shadow-xs' : 'text-slate-300 hover:text-white'
                  }`}
                >
                  সবচেয়ে বেশি বকেয়া
                </button>
                <button
                  type="button"
                  onClick={() => setSortOption('oldest_due')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                    sortOption === 'oldest_due' ? 'bg-amber-400 text-emerald-950 font-black shadow-xs' : 'text-slate-300 hover:text-white'
                  }`}
                >
                  সবচেয়ে পুরোনো বকেয়া
                </button>
              </div>

              {/* Time Filters */}
              <div className="flex items-center space-x-1 bg-slate-900 border border-emerald-800 rounded-xl p-1">
                <button
                  type="button"
                  onClick={() => setTimeFilter('all')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                    timeFilter === 'all' ? 'bg-emerald-700 text-white shadow-xs' : 'text-slate-300 hover:text-white'
                  }`}
                >
                  সব সময়
                </button>
                <button
                  type="button"
                  onClick={() => setTimeFilter('this_month')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                    timeFilter === 'this_month' ? 'bg-emerald-700 text-white shadow-xs' : 'text-slate-300 hover:text-white'
                  }`}
                >
                  এই মাস
                </button>
                <button
                  type="button"
                  onClick={() => setTimeFilter('last_month')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                    timeFilter === 'last_month' ? 'bg-emerald-700 text-white shadow-xs' : 'text-slate-300 hover:text-white'
                  }`}
                >
                  গত মাস
                </button>
              </div>
            </div>
          </div>

          {/* Central Ledger Summary Card */}
          <div className="bg-emerald-900/40 border border-emerald-800/80 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-200 gap-2">
            <div className="flex items-center space-x-2">
              <Coins className="w-4 h-4 text-amber-400" />
              <span>
                {t('আড়তের মোট দেনা / বিক্রেতাদের বকেয়া: ', 'Total Due to Sellers: ')}
                <b className="text-rose-400 text-sm font-black">{formatCurrency(totalCurrentDue)}</b>
              </span>
            </div>
            <div className="text-emerald-300">
              {t('হাতে অবশিষ্ট নগদ তহবিল: ', 'Cash in Hand: ')}
              <b className="text-amber-300 font-bold">{formatCurrency(cashInHand)}</b>
            </div>
          </div>

          {/* Sellers Khotiyan Table */}
          <div className="bg-emerald-950/90 rounded-3xl border border-emerald-800/80 shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-emerald-900/60 text-emerald-300 border-b border-emerald-800 font-bold uppercase">
                  <tr>
                    <th className="py-3.5 px-4">{t('বিক্রেতার নাম ও মোবাইল', 'Seller & Mobile')}</th>
                    <th className="py-3.5 px-4">{t('গ্রাম (Village)', 'Village')}</th>
                    <th className="py-3.5 px-4 text-right">{t('মোট সরবরাহ ধান', 'Total Mon')}</th>
                    <th className="py-3.5 px-4 text-right">{t('মোট ক্রয় বিল', 'Total Bill')}</th>
                    <th className="py-3.5 px-4 text-right">{t('পরিশোধিত টাকা', 'Total Paid')}</th>
                    <th className="py-3.5 px-4 text-right">{t('বর্তমান বকেয়া (টাকা)', 'Current Due')}</th>
                    <th className="py-3.5 px-4 text-center">{t('পরিশোধ ও অ্যাকশন', 'Payment & Action')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-emerald-900/50">
                  {processedSellers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        {t('কোনো বিক্রেতার খতিয়ান পাওয়া যায়নি।', 'No seller khotiyan records found.')}
                      </td>
                    </tr>
                  ) : (
                    processedSellers.map(s => {
                      const isPaid = s.stats.currentDue <= 0;

                      return (
                        <tr
                          key={s.id}
                          onDoubleClick={() => handleOpenDetailedMember('seller', s.id)}
                          title={t('ডাবল ক্লিক করে এই বিক্রেতার বিস্তারিত খতিয়ান ও চালান টাইমলাইন দেখুন', 'Double-click to view ledger timeline')}
                          className={`transition cursor-pointer select-none ${
                            isPaid
                              ? 'opacity-65 bg-slate-900/40 text-slate-400 hover:opacity-90'
                              : 'hover:bg-emerald-900/40 text-slate-100'
                          }`}
                        >
                          <td className="py-3.5 px-4">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenDetailedMember('seller', s.id);
                              }}
                              className="text-left group flex flex-col items-start cursor-pointer"
                              title={t('ক্লিক করে বিস্তারিত খতিয়ান দেখুন', 'Click to view ledger')}
                            >
                              <span className="font-bold text-white group-hover:text-amber-300 group-hover:underline text-sm flex items-center space-x-1.5">
                                <span>{s.name}</span>
                                {isPaid ? (
                                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 font-bold border border-emerald-800">
                                    পরিশোধিত
                                  </span>
                                ) : (
                                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-950 text-rose-300 font-bold border border-rose-800">
                                    বকেয়া বাকি
                                  </span>
                                )}
                              </span>
                              <span className="text-xs text-emerald-400 flex items-center space-x-1 mt-0.5">
                                <Phone className="w-3 h-3 text-emerald-400" />
                                <span>{s.phone || '---'}</span>
                              </span>
                            </button>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="font-bold text-white flex items-center space-x-1">
                              <MapPin className="w-3 h-3 text-amber-400" />
                              <span>{s.village || 'শেরপুর'}</span>
                            </div>
                            {s.address && s.address !== s.village && (
                              <div className="text-[10px] text-slate-400 truncate max-w-xs">{s.address}</div>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-right font-black text-white">
                            {toBengaliNumber(s.stats.totalMon.toFixed(1))} মন
                          </td>

                          <td className="py-3.5 px-4 text-right font-semibold text-slate-200">
                            {formatCurrency(s.stats.totalBill)}
                          </td>

                          <td className="py-3.5 px-4 text-right text-emerald-400 font-semibold">
                            {formatCurrency(s.stats.totalPaid)}
                          </td>

                          <td className="py-3.5 px-4 text-right font-black">
                            <span className={isPaid ? 'text-emerald-400 font-medium' : 'text-rose-400 text-base'}>
                              {formatCurrency(s.stats.currentDue)}
                            </span>
                          </td>

                          {/* Single Payment Route: + পরিশোধ Button & 3-Dot Actions */}
                          <td className="py-3.5 px-4 text-center" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-center space-x-1.5">
                              {/* + পরিশোধ বাটন (বকেয়া ০ হলে 'বকেয়া নেই' ব্যাজ) */}
                              {isPaid ? (
                                <span className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-400 font-bold text-xs border border-slate-700 select-none">
                                  বকেয়া নেই
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleOpenPayment(s.id)}
                                  className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-md transition flex items-center space-x-1 active:scale-95 cursor-pointer"
                                  title={t('খতিয়ান থেকে বকেয়া টাকা পরিশোধ করুন', 'Disburse payment')}
                                >
                                  <CreditCard className="w-3.5 h-3.5" />
                                  <span>{t('+ পরিশোধ', '+ Pay')}</span>
                                </button>
                              )}

                              {/* 3-Dot Menu */}
                              <div className="relative inline-block text-left">
                                <button
                                  type="button"
                                  onClick={() => setOpenMenuId(openMenuId === s.id ? null : s.id)}
                                  className="p-1.5 rounded-lg hover:bg-emerald-800 text-slate-300 hover:text-white transition cursor-pointer"
                                  title="মেনু (⋮)"
                                >
                                  <MoreVertical className="w-4 h-4" />
                                </button>

                                {openMenuId === s.id && (
                                  <>
                                    <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setOpenMenuId(null)} />
                                    <div className="absolute right-0 mt-1 w-48 bg-slate-900 rounded-2xl shadow-2xl border border-emerald-800 z-50 py-1 animate-in fade-in duration-100 text-slate-100 text-left">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          handleOpenDetailedMember('seller', s.id);
                                          setOpenMenuId(null);
                                        }}
                                        className="w-full px-3.5 py-2 text-left text-xs font-semibold hover:bg-emerald-900/60 flex items-center space-x-2 text-slate-200 cursor-pointer"
                                      >
                                        <Eye className="w-3.5 h-3.5 text-emerald-400" />
                                        <span>{t('বিস্তারিত লেজার টাইমলাইন', 'View Ledger')}</span>
                                      </button>

                                    {!isPaid && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          handleOpenPayment(s.id);
                                          setOpenMenuId(null);
                                        }}
                                        className="w-full px-3.5 py-2 text-left text-xs font-semibold hover:bg-emerald-900/60 flex items-center space-x-2 text-amber-300 cursor-pointer"
                                      >
                                        <CreditCard className="w-3.5 h-3.5" />
                                        <span>{t('+ ক্যাশ পরিশোধ', '+ Disburse Cash')}</span>
                                      </button>
                                    )}

                                    <div className="border-t border-slate-800 my-1" />

                                    <button
                                      type="button"
                                      onClick={() => {
                                        setDeleteSellerTarget(s);
                                        setOpenMenuId(null);
                                      }}
                                      className="w-full px-3.5 py-2 text-left text-xs font-semibold hover:bg-rose-950 text-rose-400 flex items-center space-x-2 cursor-pointer"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                      <span>{t('বিক্রেতা মুছে ফেলুন', 'Delete Seller')}</span>
                                    </button>
                                  </div>
                                </>
                              )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBTAB 2: BUYERS KHOTIYAN (মিলের পাওনা ও আদায়) */}
      {/* ========================================================================= */}
      {activeSubTab === 'buyers' && (
        <div className="space-y-4">
          <div className="bg-emerald-950/90 rounded-3xl border border-emerald-800/80 shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-emerald-900/60 text-emerald-300 border-b border-emerald-800 font-bold uppercase">
                  <tr>
                    <th className="py-3.5 px-4">{t('ক্রেতা / মিলের নাম ও ফোন', 'Buyer & Phone')}</th>
                    <th className="py-3.5 px-4">{t('ঠিকানা', 'Address')}</th>
                    <th className="py-3.5 px-4 text-right">{t('মোট চালানি ধান', 'Total Mon')}</th>
                    <th className="py-3.5 px-4 text-right">{t('মোট বিক্রয় বিল', 'Total Sales')}</th>
                    <th className="py-3.5 px-4 text-right">{t('আদায়কৃত টাকা', 'Received')}</th>
                    <th className="py-3.5 px-4 text-right">{t('বর্তমান পাওনা (বাকি)', 'Current Due')}</th>
                    <th className="py-3.5 px-4 text-center">{t('অ্যাকশন', 'Action')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-emerald-900/50">
                  {parties.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        {t('কোনো ক্রেতার খতিয়ান পাওয়া যায়নি।', 'No buyer records found.')}
                      </td>
                    </tr>
                  ) : (
                    parties.map(p => {
                      const buyerSales = sales.filter(s => s.partyId === p.id);
                      const totalSoldMon = buyerSales.reduce((sum, s) => sum + (s.totalMon || 0), 0);
                      const totalBill = buyerSales.reduce((sum, s) => sum + (s.totalAmount || 0), 0);
                      const totalReceived = buyerSales.reduce((sum, s) => sum + (s.receivedAmount || 0), 0);
                      const currentDue = Math.max(0, totalBill - totalReceived);
                      const isPaid = currentDue <= 0;

                      return (
                        <tr
                          key={p.id}
                          onDoubleClick={() => handleOpenDetailedMember('buyer', p.id)}
                          className={`hover:bg-emerald-900/40 transition cursor-pointer select-none text-slate-100 ${
                            isPaid ? 'opacity-70' : ''
                          }`}
                        >
                          <td className="py-3.5 px-4">
                            <button
                              type="button"
                              onClick={() => handleOpenDetailedMember('buyer', p.id)}
                              className="text-left font-bold text-white hover:text-amber-300 hover:underline block"
                            >
                              {p.name}
                            </button>
                            <span className="text-xs text-emerald-400">{p.phone}</span>
                          </td>

                          <td className="py-3.5 px-4 text-slate-300">{p.address}</td>

                          <td className="py-3.5 px-4 text-right font-black text-white">
                            {toBengaliNumber(totalSoldMon.toFixed(1))} মন
                          </td>

                          <td className="py-3.5 px-4 text-right font-semibold text-slate-200">
                            {formatCurrency(totalBill)}
                          </td>

                          <td className="py-3.5 px-4 text-right text-emerald-400 font-semibold">
                            {formatCurrency(totalReceived)}
                          </td>

                          <td className="py-3.5 px-4 text-right font-black">
                            <span className={isPaid ? 'text-emerald-400' : 'text-blue-400 text-base'}>
                              {formatCurrency(currentDue)}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-center">
                            <button
                              type="button"
                              onClick={() => handleOpenDetailedMember('buyer', p.id)}
                              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-300 font-bold text-xs"
                            >
                              চালান দেখুন
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBTAB 3: CASH BOOK VIEW */}
      {/* ========================================================================= */}
      {activeSubTab === 'cashbook' && (
        <div className="bg-emerald-950/90 rounded-3xl border border-emerald-800/80 p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-emerald-800/80">
            <div>
              <h3 className="font-extrabold text-base text-white">
                {t('আড়তের ক্যাশ বুক ও নগদ তহবিল লেজার', 'Cash Book & Vault Ledger')}
              </h3>
              <p className="text-xs text-emerald-300">
                {t('হাতে অবশিষ্ট নগদ: ', 'Cash in Hand: ')}<b className="text-amber-300 font-black text-sm">{formatCurrency(cashInHand)}</b>
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsCashModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-emerald-950 font-black text-xs shadow transition flex items-center space-x-1.5 active:scale-95 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4 text-emerald-950" />
              <span>{t('+ ক্যাশ এন্ট্রি (জমা/খরচ)', '+ Add Cash Entry')}</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-emerald-900/60 text-emerald-300 uppercase font-bold border-b border-emerald-800">
                <tr>
                  <th className="py-2.5 px-3">তারিখ</th>
                  <th className="py-2.5 px-3">ধরন</th>
                  <th className="py-2.5 px-3">উৎস / বিবরণ</th>
                  <th className="py-2.5 px-3 text-right">জমা (IN)</th>
                  <th className="py-2.5 px-3 text-right">খরচ / পরিশোধ (OUT)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald-900/50">
                {cashLogs.map(c => (
                  <tr key={c.id} className="hover:bg-emerald-900/30 transition text-slate-100">
                    <td className="py-2.5 px-3 font-mono">{c.date}</td>
                    <td className="py-2.5 px-3">
                      {c.type === 'IN' ? (
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
                      <div>{c.sourceOrRecipient}</div>
                      {c.note && <div className="text-[10px] text-slate-400 font-normal">{c.note}</div>}
                    </td>
                    <td className="py-2.5 px-3 text-right font-black text-emerald-400">
                      {c.type === 'IN' ? formatCurrency(c.amount) : '---'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-black text-rose-400">
                      {c.type === 'OUT' ? formatCurrency(c.amount) : '---'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBTAB 4: PAYMENT HISTORY LOG (খতিয়ানের সকল পরিশোধের বিবরণ) */}
      {/* ========================================================================= */}
      {activeSubTab === 'payments' && (
        <div className="bg-emerald-950/90 rounded-3xl border border-emerald-800/80 p-5 shadow-lg space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-emerald-800/80">
            <div>
              <h3 className="font-extrabold text-base text-white">
                {t('সকল বিক্রেতার পরিশোধ হিস্ট্রি ও ভাউচার লগ', 'Seller Payment & Voucher History Log')}
              </h3>
              <p className="text-xs text-emerald-300">
                {t('খতিয়ান থেকে বিতরণকৃত মোট টাকা: ', 'Total Disbursed: ')}
                <b className="text-amber-300 font-black text-sm">{formatCurrency(totalPaidAmount)}</b>
                {' • '}
                {t('আজকের পরিশোধ: ', "Today's Paid: ")}
                <b className="text-emerald-400 font-bold">{formatCurrency(todayCashDisbursed)}</b>
              </p>
            </div>
            <span className="text-xs font-bold text-slate-300 bg-emerald-900/60 px-3 py-1.5 rounded-xl border border-emerald-800">
              {toBengaliNumber(payments.length)} {t('টি পরিশোধ ভাউচার', 'vouchers recorded')}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-emerald-900/60 text-emerald-300 uppercase font-bold border-b border-emerald-800">
                <tr>
                  <th className="py-3 px-3">তারিখ</th>
                  <th className="py-3 px-3">ভাউচার নং</th>
                  <th className="py-3 px-3">প্রাপক বিক্রেতা</th>
                  <th className="py-3 px-3">মাধ্যম</th>
                  <th className="py-3 px-3">মন্তব্য / বিবরণ</th>
                  <th className="py-3 px-3 text-right">পরিশোধিত টাকা</th>
                  <th className="py-3 px-3 text-center">খতিয়ান</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald-900/50">
                {payments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      এখনও কোনো পরিশোধ রেকর্ড নেই।
                    </td>
                  </tr>
                ) : (
                  payments.map(p => {
                    const seller = sellers.find(s => s.id === p.sellerId);
                    return (
                      <tr key={p.id} className="hover:bg-emerald-900/30 transition text-slate-100">
                        <td className="py-3 px-3 font-mono text-xs">{p.date}</td>
                        <td className="py-3 px-3 font-mono font-bold text-amber-300">
                          {p.receiptNumber || 'VOUCHER'}
                        </td>
                        <td className="py-3 px-3">
                          <button
                            type="button"
                            onClick={() => setDetailedMember({ type: 'seller', id: p.sellerId })}
                            className="font-bold text-white hover:text-amber-300 hover:underline text-left block"
                          >
                            {p.sellerName || seller?.name || 'বিক্রেতা'}
                          </button>
                          {seller?.village && (
                            <span className="text-[11px] text-emerald-400 block">
                              গ্রাম: {seller.village}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded-lg text-xs font-bold bg-slate-800 text-slate-200 border border-slate-700">
                            {p.paymentMethod === 'Cash' ? 'নগদ (Cash)' : p.paymentMethod === 'Bank' ? 'ব্যাংক' : 'বিকাশ'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-300 text-xs">
                          {p.note || 'খতিয়ান থেকে পরিশোধ'}
                        </td>
                        <td className="py-3 px-3 text-right font-black text-emerald-400 text-sm">
                          {formatCurrency(p.amount)}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => setDetailedMember({ type: 'seller', id: p.sellerId })}
                            className="px-2.5 py-1 rounded-lg bg-emerald-900 hover:bg-emerald-800 text-amber-300 font-bold text-xs cursor-pointer"
                          >
                            লেজার ➔
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: SINGLE PAYMENT ROUTE (খতিয়ান থেকে বকেয়া পরিশোধ) */}
      {/* ========================================================================= */}
      {isPaymentModalOpen && (
        <div 
          className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setIsPaymentModalOpen(false)}
        >
          <div 
            className="bg-slate-900 border border-emerald-800/80 rounded-3xl shadow-2xl max-w-md w-full p-6 text-slate-100 animate-in fade-in zoom-in-95 duration-150"
            onClick={e => e.stopPropagation()}
          >
            {(() => {
              const targetSeller = sellers.find(s => s.id === paymentSellerId);
              const stats = targetSeller ? getSellerStats(targetSeller.id) : null;

              return (
                <>
                  <div className="flex items-center justify-between pb-3 border-b border-emerald-800/80">
                    <div className="flex items-center space-x-2">
                      <CreditCard className="w-5 h-5 text-amber-400" />
                      <div>
                        <h3 className="font-extrabold text-base text-white">
                          {t('বিক্রেতার পাওনা পরিশোধ (Payment Disburse)', 'Disburse Payment')}
                        </h3>
                        <p className="text-xs text-emerald-300">
                          {targetSeller?.name} • গ্রাম: {targetSeller?.village}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsPaymentModalOpen(false)}
                      className="text-slate-400 hover:text-white p-1 text-lg font-bold"
                    >
                      ✕
                    </button>
                  </div>

                  <form onSubmit={handleSubmitPayment} className="space-y-4 pt-4 text-xs">
                    {/* Due Notice Card */}
                    <div className="bg-emerald-950/70 p-3.5 rounded-2xl border border-emerald-800 flex justify-between items-center">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">বিক্রেতার বর্তমান বকেয়া:</span>
                        <span className="text-lg font-black text-rose-400">{formatCurrency(stats?.currentDue || 0)}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">হাতে নগদ অবশিষ্ট:</span>
                        <span className="text-sm font-black text-amber-300">{formatCurrency(cashInHand)}</span>
                      </div>
                    </div>

                    {/* Amount */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[11px] font-bold text-emerald-300">
                          {t('পরিশোধের পরিমাণ (টাকা) *', 'Disbursement Amount (৳) *')}
                        </label>
                        <button
                          type="button"
                          onClick={() => setPaymentAmount(stats?.currentDue || 0)}
                          className="text-[10px] font-bold text-amber-400 hover:underline"
                        >
                          সম্পূর্ণ বকেয়া (৳{stats?.currentDue})
                        </button>
                      </div>
                      <input
                        type="number"
                        min="1"
                        max={stats?.currentDue}
                        required
                        placeholder="যেমন: ১০,০০০"
                        value={paymentAmount}
                        onChange={e => setPaymentAmount(e.target.value === '' ? '' : Number(e.target.value))}
                        className="w-full p-3 rounded-xl border border-emerald-700 bg-slate-800 text-white font-black text-lg focus:ring-2 focus:ring-amber-400 focus:outline-none"
                      />
                    </div>

                    {/* Payment Method (Nogod / Bank) */}
                    <div>
                      <label className="block text-[11px] font-bold text-emerald-300 mb-1">
                        {t('পরিশোধের মাধ্যম *', 'Payment Method *')}
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => setPaymentMethod('Cash')}
                          className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                            paymentMethod === 'Cash'
                              ? 'bg-amber-400 text-emerald-950 border-amber-300 font-black shadow-xs'
                              : 'border-slate-700 bg-slate-800 text-slate-300'
                          }`}
                        >
                          নগদ (Cash)
                        </button>
                        <button
                          type="button"
                          onClick={() => setPaymentMethod('Bank')}
                          className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                            paymentMethod === 'Bank'
                              ? 'bg-amber-400 text-emerald-950 border-amber-300 font-black shadow-xs'
                              : 'border-slate-700 bg-slate-800 text-slate-300'
                          }`}
                        >
                          ব্যাংক (Bank)
                        </button>
                        <button
                          type="button"
                          onClick={() => setPaymentMethod('Bkash')}
                          className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                            paymentMethod === 'Bkash'
                              ? 'bg-amber-400 text-emerald-950 border-amber-300 font-black shadow-xs'
                              : 'border-slate-700 bg-slate-800 text-slate-300'
                          }`}
                        >
                          বিকাশ (Bkash)
                        </button>
                      </div>
                      {paymentMethod === 'Cash' && (
                        <p className="text-[10px] text-emerald-400 mt-1">
                          ✓ নগদ পরিশোধ স্বয়ংক্রিয়ভাবে আপনার ক্যাশ-ইন-হ্যান্ড থেকে কেটে নেওয়া হবে।
                        </p>
                      )}
                    </div>

                    {/* Date */}
                    <div>
                      <label className="block text-[11px] font-bold text-emerald-300 mb-1">
                        {t('পরিশোধের তারিখ', 'Payment Date')}
                      </label>
                      <input
                        type="date"
                        value={paymentDate}
                        onChange={e => setPaymentDate(e.target.value)}
                        className="w-full p-2.5 rounded-xl border border-slate-700 bg-slate-800 text-white font-medium"
                      />
                    </div>

                    {/* Note */}
                    <div>
                      <label className="block text-[11px] font-bold text-emerald-300 mb-1">
                        {t('মন্তব্য / নোট (ঐচ্ছিক)', 'Note / Remarks (Optional)')}
                      </label>
                      <input
                        type="text"
                        placeholder="যেমন: হাটের ২য় কিস্তি পরিশোধ"
                        value={paymentNote}
                        onChange={e => setPaymentNote(e.target.value)}
                        className="w-full p-2.5 rounded-xl border border-slate-700 bg-slate-800 text-white font-medium"
                      />
                    </div>

                    <div className="pt-3 border-t border-slate-800 flex justify-end space-x-2">
                      <button
                        type="button"
                        onClick={() => setIsPaymentModalOpen(false)}
                        className="px-4 py-2 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 font-bold"
                      >
                        {t('বাতিল', 'Cancel')}
                      </button>
                      <button
                        type="submit"
                        disabled={submittingPayment}
                        className="px-5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-emerald-950 font-black shadow transition active:scale-95 disabled:opacity-50 cursor-pointer"
                      >
                        {submittingPayment ? t('পরিশোধ হচ্ছে...', 'Processing...') : t('✓ পরিশোধ নিশ্চিত করুন', 'Confirm Disburse')}
                      </button>
                    </div>
                  </form>
                </>
              );
            })()}
          </div>
        </div>
      )}
      {/* ========================================================================= */}
      {/* MODAL: CASH BOOK ENTRY (ক্যাশ জমা / খরচ এন্ট্রি) */}
      {/* ========================================================================= */}
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
                <h3 className="font-extrabold text-base text-white">
                  {t('নতুন ক্যাশ খাতা এন্ট্রি (Cash Book Entry)', 'New Cash Book Entry')}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCashModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitCash} className="space-y-4 pt-4 text-xs">
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
                    + ক্যাশ জমা (Cash IN)
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
                    - ক্যাশ খরচ (Cash OUT)
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
                  className="w-full p-3 rounded-xl border border-emerald-700 bg-slate-800 text-white font-black text-lg focus:ring-2 focus:ring-amber-400 focus:outline-none"
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
                  className="w-full p-2.5 rounded-xl border border-slate-700 bg-slate-800 text-white font-medium focus:ring-2 focus:ring-amber-400 focus:outline-none"
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
                  {t('✓ ক্যাশ এন্ট্রি সংরক্ষণ', 'Save Cash Entry')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modals */}
      <ConfirmationModal
        isOpen={Boolean(deleteSellerTarget)}
        title={t('বিক্রেতা মুছে ফেলা নিশ্চিত করুন', 'Confirm Delete Seller')}
        message={t('আপনি কি নিশ্চিতভাবে এই বিক্রেতাকে তালিকা থেকে মুছে ফেলতে চান?', 'Are you sure you want to delete this seller?')}
        itemDetails={deleteSellerTarget ? `বিক্রেতা: ${deleteSellerTarget.name} (${deleteSellerTarget.phone}) • গ্রাম: ${deleteSellerTarget.village}` : ''}
        onConfirm={async () => {
          if (deleteSellerTarget) {
            await deleteSeller(deleteSellerTarget.id);
            setDeleteSellerTarget(null);
          }
        }}
        onCancel={() => setDeleteSellerTarget(null)}
      />

      <ConfirmationModal
        isOpen={Boolean(deleteBuyerTarget)}
        title={t('ক্রেতা মুছে ফেলা নিশ্চিত করুন', 'Confirm Delete Buyer')}
        message={t('আপনি কি নিশ্চিতভাবে এই ক্রেতাকে তালিকা থেকে মুছে ফেলতে চান?', 'Are you sure you want to delete this buyer?')}
        itemDetails={deleteBuyerTarget ? `ক্রেতা: ${deleteBuyerTarget.name} (${deleteBuyerTarget.phone})` : ''}
        onConfirm={async () => {
          if (deleteBuyerTarget) {
            await deleteParty(deleteBuyerTarget.id);
            setDeleteBuyerTarget(null);
          }
        }}
        onCancel={() => setDeleteBuyerTarget(null)}
      />
    </div>
  );
};
