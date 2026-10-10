import React, { useState, useMemo } from 'react';
import { 
  ArrowLeft, 
  User, 
  Phone, 
  MapPin, 
  Printer, 
  Calendar, 
  FileText, 
  ShoppingBag, 
  Truck, 
  CreditCard,
  Building2,
  CheckCircle,
  Coins,
  History,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { useThemeLanguage } from '../context/ThemeLanguageContext';
import { formatCurrency, toBengaliNumber } from '../utils/weight';
import { PurchaseMemo, Sale, PaymentRecord, Seller, Buyer } from '../types';

interface MemberDetailsPageProps {
  memberType: 'seller' | 'buyer' | 'farmer' | 'party';
  memberId: string;
  onBack: () => void;
  onViewReceipt?: (type: 'purchase' | 'sale', item: PurchaseMemo | Sale | unknown) => void;
  onStartTransaction?: (id: string) => void;
}

export const MemberDetailsPage: React.FC<MemberDetailsPageProps> = ({
  memberType,
  memberId,
  onBack,
  onViewReceipt,
}) => {
  const { 
    sellers, 
    parties, 
    purchases, 
    sales, 
    payments, 
    cashInHand,
    getSellerStats, 
    recordSellerPayment,
    settings 
  } = useData();

  const { t } = useThemeLanguage();

  const isSeller = memberType === 'seller' || memberType === 'farmer';

  // Find member
  const member = isSeller 
    ? sellers.find(s => s.id === memberId)
    : parties.find(p => p.id === memberId);

  // Payment Modal State (Single Payment Route)
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [payAmount, setPayAmount] = useState<number | ''>('');
  const [payMethod, setPayMethod] = useState<'Cash' | 'Bank' | 'Bkash'>('Cash');
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);
  const [payNote, setPayNote] = useState('');
  const [submittingPay, setSubmittingPay] = useState(false);

  // Seller Stats & Ledger History Timeline
  const sellerStats = useMemo(() => {
    if (!isSeller) return null;
    return getSellerStats(memberId);
  }, [isSeller, memberId, purchases, payments]);

  // Seller Memos
  const sellerMemos = useMemo(() => {
    if (!isSeller || !member) return [];
    return purchases
      .filter(p => p.sellerId === memberId || (member.phone && p.sellerPhone === member.phone))
      .sort((a, b) => new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime());
  }, [isSeller, memberId, member, purchases]);

  // Seller Payments Disbursed from Khotiyan
  const sellerPayments = useMemo(() => {
    if (!isSeller) return [];
    return payments
      .filter(pay => pay.sellerId === memberId || (pay as unknown as { entityId?: string }).entityId === memberId)
      .sort((a, b) => new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime());
  }, [isSeller, memberId, payments]);

  // Combined Chronological Ledger History Timeline with Running Balance (Requirement 4.B)
  interface TimelineEntry {
    id: string;
    date: string;
    type: 'MEMO' | 'PAYMENT';
    refNumber: string;
    description: string;
    debit: number; // Purchase Memo Bill
    credit: number; // Disbursed Payment
    runningBalance: number;
    rawItem: PurchaseMemo | PaymentRecord;
  }

  const ledgerTimeline = useMemo(() => {
    if (!isSeller) return [];

    // Combine all events sorted from earliest to latest to compute running balance accurately
    const events: {
      id: string;
      date: string;
      type: 'MEMO' | 'PAYMENT';
      refNumber: string;
      description: string;
      debit: number;
      credit: number;
      rawItem: PurchaseMemo | PaymentRecord;
      timestamp: number;
    }[] = [];

    sellerMemos.forEach(m => {
      events.push({
        id: m.id,
        date: m.date,
        type: 'MEMO',
        refNumber: m.invoiceNumber || 'MEMO',
        description: `${m.paddyType || m.varietyName} (${toBengaliNumber((m.totalMon || m.quantityMon || 0).toFixed(1))} মন @ ৳${m.ratePerMon})`,
        debit: m.totalBill || m.totalAmount || 0,
        credit: 0,
        rawItem: m,
        timestamp: new Date(m.createdAt || m.date).getTime(),
      });
    });

    sellerPayments.forEach(p => {
      events.push({
        id: p.id,
        date: p.date,
        type: 'PAYMENT',
        refNumber: p.receiptNumber || 'VOUCHER',
        description: `${p.paymentMethod === 'Cash' ? 'নগদ পরিশোধ' : 'ব্যাংক পরিশোধ'}${p.note ? ' - ' + p.note : ''}`,
        debit: 0,
        credit: p.amount,
        rawItem: p,
        timestamp: new Date(p.createdAt || p.date).getTime(),
      });
    });

    // Sort chronologically (oldest first to compute running balance correctly)
    events.sort((a, b) => a.timestamp - b.timestamp);

    let currentBalance = 0;
    const timelineWithBalance: TimelineEntry[] = events.map(ev => {
      currentBalance = currentBalance + ev.debit - ev.credit;
      return {
        ...ev,
        runningBalance: Math.max(0, currentBalance),
      };
    });

    // Return reversed (newest first) for user viewing
    return timelineWithBalance.reverse();
  }, [isSeller, sellerMemos, sellerPayments]);

  // Buyer Sales
  const buyerSales = useMemo(() => {
    if (isSeller || !member) return [];
    return sales
      .filter(s => s.partyId === memberId || (member.phone && s.partyPhone === member.phone))
      .sort((a, b) => new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime());
  }, [isSeller, memberId, member, sales]);

  if (!member) {
    return (
      <div className="bg-emerald-950/90 border border-emerald-800 p-8 rounded-3xl text-center space-y-4 text-white">
        <p className="text-slate-400">{t('কোনো তথ্য পাওয়া যায়নি।', 'Record not found.')}</p>
        <button
          type="button"
          onClick={onBack}
          className="px-4 py-2 bg-emerald-700 text-white rounded-xl text-xs font-bold"
        >
          {t('← ফিরে যান', '← Go Back')}
        </button>
      </div>
    );
  }

  // Open Payment modal prefilled
  const handleOpenPay = () => {
    if (!sellerStats || sellerStats.currentDue <= 0) {
      alert(t('এই বিক্রেতার কোনো বকেয়া অবশিষ্ট নেই।', 'No due balance available.'));
      return;
    }
    setPayAmount(sellerStats.currentDue);
    setPayMethod('Cash');
    setPayDate(new Date().toISOString().split('T')[0]);
    setPayNote('খতিয়ানের বকেয়া বিল পরিশোধ');
    setIsPayModalOpen(true);
  };

  const handleConfirmPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = typeof payAmount === 'number' ? payAmount : 0;
    if (num <= 0) {
      alert(t('সঠিক পরিশোধের পরিমাণ লিখুন।', 'Please enter a valid amount.'));
      return;
    }
    if (sellerStats && num > sellerStats.currentDue) {
      alert(t('পরিশোধের পরিমাণ বিক্রেতার বকেয়ার চেয়ে বেশি হতে পারবে না।', 'Amount exceeds due balance.'));
      return;
    }

    setSubmittingPay(true);
    try {
      await recordSellerPayment({
        sellerId: memberId,
        amount: num,
        date: payDate,
        paymentMethod: payMethod,
        note: payNote.trim(),
      });
      setIsPayModalOpen(false);
      setPayAmount('');
      setPayNote('');
    } catch (err) {
      console.error(err);
      alert(t('পরিশোধ সম্পন্ন করা সম্ভব হয়নি', 'Payment failed'));
    } finally {
      setSubmittingPay(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Navigation & Profile Card */}
      <div className="bg-emerald-950/90 border border-emerald-800/80 rounded-3xl p-5 sm:p-6 shadow-xl text-white space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-emerald-800/80">
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={onBack}
              className="p-2 rounded-xl bg-emerald-900/80 hover:bg-emerald-800 text-amber-300 border border-emerald-700/80 transition cursor-pointer"
              title={t('খতিয়ান তালিকায় ফিরে যান', 'Back to Khotiyan')}
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-xl sm:text-2xl font-black text-white">{member.name}</h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-400 text-emerald-950">
                  {isSeller ? t('ধান বিক্রেতা (Seller)', 'Seller') : t('চালানি ক্রেতা (Buyer)', 'Buyer')}
                </span>
                {isSeller && sellerStats && (
                  sellerStats.currentDue <= 0 ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-700">
                      পরিশোধিত (Paid)
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-950 text-rose-300 border border-rose-800">
                      বকেয়া বাকি
                    </span>
                  )
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs text-emerald-300/80 mt-1">
                <span className="flex items-center space-x-1">
                  <Phone className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{member.phone || 'ফোন নেই'}</span>
                </span>
                {(member as Seller).village && (
                  <span className="flex items-center space-x-1">
                    <MapPin className="w-3.5 h-3.5 text-amber-400" />
                    <span>গ্রাম: {(member as Seller).village}</span>
                  </span>
                )}
                {member.address && member.address !== (member as Seller).village && (
                  <span className="text-slate-400">• {member.address}</span>
                )}
              </div>
            </div>
          </div>

          {/* Single Payment Route Button on Top Profile */}
          {isSeller && sellerStats && (
            <div className="flex items-center space-x-2">
              {sellerStats.currentDue <= 0 ? (
                <div className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 font-bold text-xs">
                  ✓ সর্বমোট বকেয়া পরিশোধিত
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleOpenPay}
                  className="px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-emerald-950 font-black text-xs sm:text-sm shadow-md transition flex items-center space-x-1.5 active:scale-95 cursor-pointer"
                >
                  <CreditCard className="w-4 h-4 text-emerald-950" />
                  <span>{t('+ টাকা পরিশোধ করুন (Pay)', '+ Disburse Payment')}</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Central Ledger Summary Cards */}
        {isSeller && sellerStats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
            <div className="bg-emerald-900/40 border border-emerald-800/80 p-4 rounded-2xl">
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">
                {t('মোট সরবরাহ ধান', 'Total Mon')}
              </span>
              <div className="text-2xl font-black text-white mt-1">
                {toBengaliNumber(sellerStats.totalMon.toFixed(1))} <span className="text-xs font-semibold">মন</span>
              </div>
              <span className="text-[10px] text-emerald-400/80 mt-0.5 block">
                {toBengaliNumber(sellerStats.memoCount)} টি ক্রয় মেমো
              </span>
            </div>

            <div className="bg-emerald-900/40 border border-emerald-800/80 p-4 rounded-2xl">
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">
                {t('মোট ক্রয় বিল (Debit)', 'Total Purchase Bill')}
              </span>
              <div className="text-2xl font-black text-amber-300 mt-1">
                {formatCurrency(sellerStats.totalBill)}
              </div>
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                মোট পাওনা বৃদ্ধি
              </span>
            </div>

            <div className="bg-emerald-900/40 border border-emerald-800/80 p-4 rounded-2xl">
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">
                {t('মোট পরিশোধ (Credit)', 'Total Disbursed')}
              </span>
              <div className="text-2xl font-black text-emerald-300 mt-1">
                {formatCurrency(sellerStats.totalPaid)}
              </div>
              <span className="text-[10px] text-emerald-400/80 mt-0.5 block">
                {toBengaliNumber(sellerStats.paymentCount)} বার কিস্তি/নগদ পরিশোধ
              </span>
            </div>

            <div className={`p-4 rounded-2xl border ${sellerStats.currentDue > 0 ? 'bg-rose-950/60 border-rose-800' : 'bg-emerald-900/40 border-emerald-800/80'}`}>
              <span className="text-[10px] font-bold text-rose-300 uppercase tracking-wider block">
                {t('বর্তমান মোট বকেয়া (Due)', 'Current Balance Due')}
              </span>
              <div className={`text-2xl font-black mt-1 ${sellerStats.currentDue > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                {formatCurrency(sellerStats.currentDue)}
              </div>
              <span className="text-[10px] text-slate-300 mt-0.5 block">
                {sellerStats.currentDue > 0 ? 'পরিশোধযোগ্য বাকি' : 'সম্পূর্ণ পরিশোধিত'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 2. LEDGER HISTORY TIMELINE (Requirement 4.B: Debit, Credit & Running Balance) */}
      {/* ========================================================================= */}
      {isSeller && (
        <div className="bg-emerald-950/90 border border-emerald-800/80 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4 text-white">
          <div className="flex items-center justify-between pb-3 border-b border-emerald-800/80">
            <div className="flex items-center space-x-2">
              <History className="w-5 h-5 text-amber-400" />
              <div>
                <h3 className="font-extrabold text-base text-white">
                  {t('লেজার হিসাব টাইমলাইন (Running Balance Timeline)', 'Ledger Timeline')}
                </h3>
                <p className="text-xs text-emerald-300/80">
                  {t('পাকা মেমো বিল (ডেবিট), পরিশোধিত টাকা (ক্রেডিট) এবং প্রতিটি লেনদেন পরবর্তী চলমান বকেয়া।', 'Detailed audit trail with running balances.')}
                </p>
              </div>
            </div>

            <span className="text-xs font-bold text-emerald-400 bg-slate-900 px-3 py-1 rounded-xl border border-emerald-800">
              {toBengaliNumber(ledgerTimeline.length)} টি এন্ট্রি
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-emerald-900/60 text-emerald-300 font-bold uppercase border-b border-emerald-800">
                <tr>
                  <th className="py-3 px-3">তারিখ</th>
                  <th className="py-3 px-3">ভাউচার / মেমো নং</th>
                  <th className="py-3 px-3">বিবরণ / ধানের জাত</th>
                  <th className="py-3 px-3 text-right text-amber-300">{t('বিল (ডেবিট ৳)', 'Debit (Bill)')}</th>
                  <th className="py-3 px-3 text-right text-emerald-400">{t('পরিশোধ (ক্রেডিট ৳)', 'Credit (Paid)')}</th>
                  <th className="py-3 px-3 text-right text-rose-300 font-black">{t('চলমান বকেয়া (৳)', 'Running Due')}</th>
                  <th className="py-3 px-3 text-center">রসিদ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald-900/40">
                {ledgerTimeline.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      {t('কোনো লেনদেন রেকর্ড পাওয়া যায়নি।', 'No transactions found.')}
                    </td>
                  </tr>
                ) : (
                  ledgerTimeline.map(entry => {
                    const isMemo = entry.type === 'MEMO';

                    return (
                      <tr key={entry.id} className="hover:bg-emerald-900/40 transition">
                        <td className="py-3 px-3 font-mono text-slate-300">{entry.date}</td>

                        <td className="py-3 px-3">
                          <span className={`font-mono font-bold ${isMemo ? 'text-amber-300' : 'text-emerald-400'}`}>
                            {entry.refNumber}
                          </span>
                        </td>

                        <td className="py-3 px-3">
                          <div className="font-semibold text-white">{entry.description}</div>
                        </td>

                        <td className="py-3 px-3 text-right font-black text-amber-300">
                          {entry.debit > 0 ? formatCurrency(entry.debit) : '---'}
                        </td>

                        <td className="py-3 px-3 text-right font-black text-emerald-400">
                          {entry.credit > 0 ? formatCurrency(entry.credit) : '---'}
                        </td>

                        <td className="py-3 px-3 text-right font-black text-rose-400 text-base">
                          {formatCurrency(entry.runningBalance)}
                        </td>

                        <td className="py-3 px-3 text-center">
                          {isMemo && onViewReceipt && (
                            <button
                              type="button"
                              onClick={() => onViewReceipt('purchase', entry.rawItem as PurchaseMemo)}
                              className="p-1 rounded-lg bg-emerald-900 hover:bg-emerald-800 text-emerald-200 transition"
                              title="মেমো প্রিন্ট"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                          )}
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
      {/* 3. BUYER SALES TIMELINE (If viewing buyer) */}
      {/* ========================================================================= */}
      {!isSeller && (
        <div className="bg-emerald-950/90 border border-emerald-800/80 rounded-3xl p-5 shadow-xl space-y-4 text-white">
          <div className="flex items-center justify-between pb-3 border-b border-emerald-800/80">
            <h3 className="font-extrabold text-base text-white">
              {t('ক্রেতার চালানি চালান বিবরণী', 'Buyer Sales Challans')}
            </h3>
            <span className="text-xs text-emerald-300">
              {toBengaliNumber(buyerSales.length)} টি চালান
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-emerald-900/60 text-emerald-300 font-bold uppercase border-b border-emerald-800">
                <tr>
                  <th className="py-2.5 px-3">তারিখ</th>
                  <th className="py-2.5 px-3">চালান নং</th>
                  <th className="py-2.5 px-3">ধানের জাত</th>
                  <th className="py-2.5 px-3 text-right">বস্তা ও মন</th>
                  <th className="py-2.5 px-3 text-right">মোট বিল</th>
                  <th className="py-2.5 px-3 text-right">আদায়</th>
                  <th className="py-2.5 px-3 text-right">বাকি</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald-900/40">
                {buyerSales.map(s => (
                  <tr key={s.id} className="hover:bg-emerald-900/40 transition">
                    <td className="py-2.5 px-3 font-mono">{s.date}</td>
                    <td className="py-2.5 px-3 font-mono font-bold text-amber-300">{s.challanNumber}</td>
                    <td className="py-2.5 px-3 text-emerald-300">{s.varietyName}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-white">
                      {toBengaliNumber(s.bagCount)} বস্তা ({toBengaliNumber(s.totalMon)} মন)
                    </td>
                    <td className="py-2.5 px-3 text-right font-black text-white">{formatCurrency(s.totalAmount)}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-emerald-400">{formatCurrency(s.receivedAmount)}</td>
                    <td className="py-2.5 px-3 text-right font-black text-blue-400">{formatCurrency(s.dueAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: SINGLE PAYMENT ROUTE (খতিয়ান থেকে বকেয়া পরিশোধ) */}
      {/* ========================================================================= */}
      {isPayModalOpen && sellerStats && (
        <div 
          className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setIsPayModalOpen(false)}
        >
          <div 
            className="bg-slate-900 border border-emerald-800/80 rounded-3xl shadow-2xl max-w-md w-full p-6 text-slate-100 animate-in fade-in zoom-in-95 duration-150"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-emerald-800/80">
              <div className="flex items-center space-x-2">
                <CreditCard className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="font-extrabold text-base text-white">
                    {t('বিক্রেতার পাওনা পরিশোধ (Disburse Payment)', 'Disburse Payment')}
                  </h3>
                  <p className="text-xs text-emerald-300">
                    {member.name} (বকেয়া: {formatCurrency(sellerStats.currentDue)})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPayModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmPayment} className="space-y-4 pt-4 text-xs">
              <div className="bg-emerald-950/70 p-3.5 rounded-2xl border border-emerald-800 flex justify-between items-center">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">বর্তমান বকেয়া:</span>
                  <span className="text-lg font-black text-rose-400">{formatCurrency(sellerStats.currentDue)}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">হাতে নগদ অবশিষ্ট:</span>
                  <span className="text-sm font-black text-amber-300">{formatCurrency(cashInHand)}</span>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-bold text-emerald-300">
                    {t('পরিশোধের পরিমাণ (টাকা) *', 'Disbursement Amount (৳) *')}
                  </label>
                  <button
                    type="button"
                    onClick={() => setPayAmount(sellerStats.currentDue)}
                    className="text-[10px] font-bold text-amber-400 hover:underline"
                  >
                    সম্পূর্ণ বকেয়া (৳{sellerStats.currentDue})
                  </button>
                </div>
                <input
                  type="number"
                  min="1"
                  max={sellerStats.currentDue}
                  required
                  placeholder="যেমন: ১০,০০০"
                  value={payAmount}
                  onChange={e => setPayAmount(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full p-3 rounded-xl border border-emerald-700 bg-slate-800 text-white font-black text-lg focus:ring-2 focus:ring-amber-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-emerald-300 mb-1">
                  {t('পরিশোধের মাধ্যম *', 'Payment Method *')}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPayMethod('Cash')}
                    className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                      payMethod === 'Cash'
                        ? 'bg-amber-400 text-emerald-950 border-amber-300 font-black shadow-xs'
                        : 'border-slate-700 bg-slate-800 text-slate-300'
                    }`}
                  >
                    নগদ (Cash)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPayMethod('Bank')}
                    className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                      payMethod === 'Bank'
                        ? 'bg-amber-400 text-emerald-950 border-amber-300 font-black shadow-xs'
                        : 'border-slate-700 bg-slate-800 text-slate-300'
                    }`}
                  >
                    ব্যাংক (Bank)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPayMethod('Bkash')}
                    className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                      payMethod === 'Bkash'
                        ? 'bg-amber-400 text-emerald-950 border-amber-300 font-black shadow-xs'
                        : 'border-slate-700 bg-slate-800 text-slate-300'
                    }`}
                  >
                    বিকাশ (Bkash)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-emerald-300 mb-1">
                  {t('পরিশোধের তারিখ', 'Payment Date')}
                </label>
                <input
                  type="date"
                  value={payDate}
                  onChange={e => setPayDate(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-700 bg-slate-800 text-white font-medium"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-emerald-300 mb-1">
                  {t('মন্তব্য / নোট (ঐচ্ছিক)', 'Note / Remarks (Optional)')}
                </label>
                <input
                  type="text"
                  placeholder="যেমন: হাটের ২য় কিস্তি পরিশোধ"
                  value={payNote}
                  onChange={e => setPayNote(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-700 bg-slate-800 text-white font-medium"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsPayModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 font-bold"
                >
                  {t('বাতিল', 'Cancel')}
                </button>
                <button
                  type="submit"
                  disabled={submittingPay}
                  className="px-5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-emerald-950 font-black shadow transition active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {submittingPay ? t('পরিশোধ হচ্ছে...', 'Processing...') : t('✓ পরিশোধ নিশ্চিত করুন', 'Confirm Disburse')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
