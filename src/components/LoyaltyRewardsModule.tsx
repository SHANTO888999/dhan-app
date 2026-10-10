import React, { useState, useMemo } from 'react';
import { 
  Trophy, 
  Send, 
  Search, 
  Phone, 
  Copy, 
  Check, 
  Sparkles,
  Gift
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { useThemeLanguage } from '../context/ThemeLanguageContext';
import { Seller } from '../types';
import { formatCurrency, toBengaliNumber } from '../utils/weight';

export const LoyaltyRewardsModule: React.FC = () => {
  const { sellers, purchases, settings } = useData();
  const { t } = useThemeLanguage();

  const [timeframe, setTimeframe] = useState<'all' | 'month' | 'season'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Winner Modal State
  const [selectedWinner, setSelectedWinner] = useState<{
    seller: Seller;
    rank: number;
    totalMon: number;
    totalAmount: number;
    prize: string;
  } | null>(null);

  const [copiedCode, setCopiedCode] = useState(false);

  // Suggested prizes based on ranking
  const getSuggestedPrize = (rank: number) => {
    switch (rank) {
      case 1:
        return 'একটি প্রিমিয়াম অটো গ্যাস স্টোভ (Gas Stove) ও নগদ ১,০০০ টাকার ভাউচার';
      case 2:
        return 'একটি প্রেসার কুকার (Pressure Cooker) ও সম্মাননা স্মারক';
      case 3:
        return 'একটি ডিনার সেট (Dinner Set) ও শুভেচ্ছা উপহার';
      default:
        return 'বিশেষ ক্যাশব্যাক ভাউচার ও সম্মাননা উপহার';
    }
  };

  // Filter purchases by timeframe
  const filteredPurchases = useMemo(() => {
    const now = new Date();
    return purchases.filter(p => {
      if (timeframe === 'all') return true;
      const pDate = new Date(p.date || p.createdAt);
      if (isNaN(pDate.getTime())) return true;

      if (timeframe === 'month') {
        return pDate.getFullYear() === now.getFullYear() && pDate.getMonth() === now.getMonth();
      }
      if (timeframe === 'season') {
        const fourMonthsAgo = new Date();
        fourMonthsAgo.setMonth(now.getMonth() - 4);
        return pDate >= fourMonthsAgo;
      }
      return true;
    });
  }, [purchases, timeframe]);

  // Aggregate and rank sellers
  const leaderboard = useMemo(() => {
    const sellerStatsMap: Record<string, {
      seller: Seller;
      totalMon: number;
      totalAmount: number;
      transactionCount: number;
    }> = {};

    filteredPurchases.forEach(p => {
      const key = p.sellerPhone || p.sellerId;
      if (!sellerStatsMap[key]) {
        const foundSeller = sellers.find(s => s.id === p.sellerId || s.phone === p.sellerPhone);
        sellerStatsMap[key] = {
          seller: foundSeller || {
            id: p.sellerId,
            name: p.sellerName || 'বিক্রেতা',
            phone: p.sellerPhone || '',
            village: p.sellerVillage || 'শেরপুর',
            userId: '',
            createdAt: p.createdAt,
            updatedAt: p.createdAt,
          },
          totalMon: 0,
          totalAmount: 0,
          transactionCount: 0,
        };
      }
      sellerStatsMap[key].totalMon += (p.totalMon || p.quantityMon || 0);
      sellerStatsMap[key].totalAmount += (p.totalBill || p.totalAmount || 0);
      sellerStatsMap[key].transactionCount += 1;
    });

    if (timeframe === 'all') {
      sellers.forEach(s => {
        const key = s.phone || s.id;
        if (!sellerStatsMap[key]) {
          sellerStatsMap[key] = {
            seller: s,
            totalMon: 0,
            totalAmount: 0,
            transactionCount: 0,
          };
        }
      });
    }

    return Object.values(sellerStatsMap)
      .sort((a, b) => b.totalMon - a.totalMon)
      .filter(item => {
        if (!searchTerm.trim()) return true;
        const q = searchTerm.toLowerCase();
        return (
          item.seller.name.toLowerCase().includes(q) ||
          item.seller.phone.includes(q) ||
          (item.seller.village && item.seller.village.toLowerCase().includes(q))
        );
      });
  }, [filteredPurchases, sellers, timeframe, searchTerm]);

  const handleOpenWinnerModal = (item: { seller: Seller; totalMon: number; totalAmount: number }, rank: number) => {
    setSelectedWinner({
      seller: item.seller,
      rank,
      totalMon: item.totalMon,
      totalAmount: item.totalAmount,
      prize: getSuggestedPrize(rank),
    });
  };

  const getWinnerMessage = (w: { seller: Seller; rank: number; prize: string }) => {
    return `অভিনন্দন ${w.seller.name}! আপনি ${settings.businessName}-এ সর্বোচ্চ ধান সরবরাহকারী হিসেবে ${toBengaliNumber(w.rank)}ম স্থান অধিকার করেছেন। আপনার জন্য পুরস্কার: ${w.prize}। আড়তে এসে উপহারটি গ্রহণ করার অনুরোধ করা হলো। ফোন: ${settings.phone}`;
  };

  const handleSendWhatsApp = (w: { seller: Seller; rank: number; prize: string }) => {
    const text = encodeURIComponent(getWinnerMessage(w));
    const phone = w.seller.phone ? (w.seller.phone.startsWith('0') ? '88' + w.seller.phone : w.seller.phone) : '';
    window.open(`https://wa.me/${phone}?text=${text}`, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-amber-600 via-amber-700 to-emerald-950 rounded-3xl p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-amber-200 text-xs font-bold uppercase tracking-wider mb-1">
            <Trophy className="w-4 h-4 text-amber-300" />
            <span>{t('বিক্রেতা প্রণোদনা ও র‍্যাংকিং', 'Seller Loyalty Leaderboard')}</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight">
            {t('বিক্রেতা অফার ও পুরস্কার (Seller Offers)', 'Seller Loyalty & Rewards')}
          </h2>
          <p className="text-amber-100/90 text-xs sm:text-sm mt-1 max-w-xl">
            {t(
              'আড়তে সর্বোচ্চ ধান সরবরাহকারী সেরা বিক্রেতাদের পুরস্কৃত করুন। সরাসরি SMS বা হোয়াটসঅ্যাপে শুভেচ্ছা ভাউচার পাঠান।',
              'Rank top sellers by supplied Mon and dispatch instant SMS reward vouchers.'
            )}
          </p>
        </div>

        {/* Timeframe Filter */}
        <div className="flex bg-slate-900/80 p-1 rounded-2xl border border-amber-400/40 text-xs font-bold">
          <button
            type="button"
            onClick={() => setTimeframe('all')}
            className={`px-3.5 py-1.5 rounded-xl transition cursor-pointer ${
              timeframe === 'all' ? 'bg-amber-400 text-emerald-950 font-black shadow-md' : 'text-slate-300 hover:text-white'
            }`}
          >
            {t('সর্বকালের সেরা', 'All Time')}
          </button>
          <button
            type="button"
            onClick={() => setTimeframe('month')}
            className={`px-3.5 py-1.5 rounded-xl transition cursor-pointer ${
              timeframe === 'month' ? 'bg-amber-400 text-emerald-950 font-black shadow-md' : 'text-slate-300 hover:text-white'
            }`}
          >
            {t('চলতি মাস', 'This Month')}
          </button>
          <button
            type="button"
            onClick={() => setTimeframe('season')}
            className={`px-3.5 py-1.5 rounded-xl transition cursor-pointer ${
              timeframe === 'season' ? 'bg-amber-400 text-emerald-950 font-black shadow-md' : 'text-slate-300 hover:text-white'
            }`}
          >
            {t('মৌসুম (৪ মাস)', 'Season')}
          </button>
        </div>
      </div>

      {/* Top 3 Podium Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 1st Place */}
        {leaderboard[0] && (
          <div className="bg-gradient-to-b from-amber-500/20 to-emerald-950/90 border-2 border-amber-400 rounded-3xl p-5 text-white shadow-xl relative overflow-hidden flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="px-3 py-1 rounded-full bg-amber-400 text-emerald-950 font-black text-xs shadow-md">
                🥇 ১ম স্থান (চ্যাম্পিয়ন)
              </span>
              <Sparkles className="w-5 h-5 text-amber-300" />
            </div>

            <div className="my-4">
              <h3 className="text-xl font-black text-white">{leaderboard[0].seller.name}</h3>
              <p className="text-xs text-amber-300">{leaderboard[0].seller.phone} • গ্রাম: {leaderboard[0].seller.village}</p>

              <div className="mt-3 p-3 bg-emerald-900/60 rounded-2xl border border-amber-400/40">
                <span className="text-[10px] text-slate-300 uppercase block font-bold">মোট সরবরাহ ধান:</span>
                <span className="text-2xl font-black text-amber-300">
                  {toBengaliNumber(leaderboard[0].totalMon.toFixed(1))} মন
                </span>
                <span className="text-[11px] text-emerald-300 block mt-0.5 font-bold">
                  ক্রয় মূল্য: {formatCurrency(leaderboard[0].totalAmount)}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleOpenWinnerModal(leaderboard[0], 1)}
              className="w-full py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-emerald-950 font-black text-xs shadow transition flex items-center justify-center space-x-1.5 active:scale-95 cursor-pointer"
            >
              <Gift className="w-4 h-4" />
              <span>{t('পুরস্কার ও SMS ভাউচার', 'Prize & SMS Voucher')}</span>
            </button>
          </div>
        )}

        {/* 2nd Place */}
        {leaderboard[1] && (
          <div className="bg-emerald-950/90 border border-slate-700 rounded-3xl p-5 text-white shadow-lg flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="px-3 py-1 rounded-full bg-slate-300 text-slate-900 font-black text-xs shadow-md">
                🥈 ২য় স্থান (রানার আপ)
              </span>
            </div>

            <div className="my-4">
              <h3 className="text-lg font-black text-white">{leaderboard[1].seller.name}</h3>
              <p className="text-xs text-slate-300">{leaderboard[1].seller.phone} • গ্রাম: {leaderboard[1].seller.village}</p>

              <div className="mt-3 p-3 bg-slate-900 rounded-2xl border border-slate-700">
                <span className="text-[10px] text-slate-400 uppercase block font-bold">মোট সরবরাহ ধান:</span>
                <span className="text-xl font-black text-white">
                  {toBengaliNumber(leaderboard[1].totalMon.toFixed(1))} মন
                </span>
                <span className="text-[11px] text-emerald-400 block mt-0.5">
                  ক্রয় মূল্য: {formatCurrency(leaderboard[1].totalAmount)}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleOpenWinnerModal(leaderboard[1], 2)}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs shadow transition flex items-center justify-center space-x-1.5 cursor-pointer"
            >
              <Gift className="w-4 h-4 text-amber-300" />
              <span>{t('পুরস্কার ও SMS ভাউচার', 'Prize & SMS Voucher')}</span>
            </button>
          </div>
        )}

        {/* 3rd Place */}
        {leaderboard[2] && (
          <div className="bg-emerald-950/90 border border-amber-800/80 rounded-3xl p-5 text-white shadow-lg flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="px-3 py-1 rounded-full bg-amber-700 text-white font-black text-xs shadow-md">
                🥉 ৩য় স্থান
              </span>
            </div>

            <div className="my-4">
              <h3 className="text-lg font-black text-white">{leaderboard[2].seller.name}</h3>
              <p className="text-xs text-amber-300">{leaderboard[2].seller.phone} • গ্রাম: {leaderboard[2].seller.village}</p>

              <div className="mt-3 p-3 bg-slate-900 rounded-2xl border border-emerald-900">
                <span className="text-[10px] text-slate-400 uppercase block font-bold">মোট সরবরাহ ধান:</span>
                <span className="text-xl font-black text-white">
                  {toBengaliNumber(leaderboard[2].totalMon.toFixed(1))} মন
                </span>
                <span className="text-[11px] text-emerald-400 block mt-0.5">
                  ক্রয় মূল্য: {formatCurrency(leaderboard[2].totalAmount)}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleOpenWinnerModal(leaderboard[2], 3)}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs shadow transition flex items-center justify-center space-x-1.5 cursor-pointer"
            >
              <Gift className="w-4 h-4 text-amber-300" />
              <span>{t('পুরস্কার ও SMS ভাউচার', 'Prize & SMS Voucher')}</span>
            </button>
          </div>
        )}
      </div>

      {/* Leaderboard Table */}
      <div className="bg-emerald-950/90 rounded-3xl border border-emerald-800/80 shadow-lg overflow-hidden">
        <div className="p-4 border-b border-emerald-800/80 flex flex-col sm:flex-row items-center justify-between gap-3">
          <h3 className="font-extrabold text-base text-white">
            {t('সম্পূর্ণ বিক্রেতা পারফরম্যান্স তালিকা', 'Full Seller Leaderboard')}
          </h3>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-3 text-emerald-400" />
            <input
              type="text"
              placeholder={t('নাম বা গ্রাম দিয়ে খুঁজুন...', 'Search by name or village...')}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-emerald-800 bg-slate-900 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-emerald-900/60 text-emerald-300 border-b border-emerald-800 font-bold uppercase">
              <tr>
                <th className="py-3 px-4 text-center">র‍্যাংক</th>
                <th className="py-3 px-4">বিক্রেতার নাম ও গ্রাম</th>
                <th className="py-3 px-4">মোবাইল</th>
                <th className="py-3 px-4 text-right">মোট সরবরাহ ধান</th>
                <th className="py-3 px-4 text-right">মোট ক্রয় মূল্য</th>
                <th className="py-3 px-4 text-center">পুরস্কার / SMS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-emerald-900/50">
              {leaderboard.map((item, index) => {
                const rank = index + 1;
                return (
                  <tr key={item.seller.id || item.seller.phone} className="hover:bg-emerald-900/40 transition text-slate-100">
                    <td className="py-3 px-4 text-center font-bold">
                      {rank === 1 && <span className="p-1 bg-amber-400 text-emerald-950 rounded-full text-xs font-black">🥇 1</span>}
                      {rank === 2 && <span className="p-1 bg-slate-300 text-slate-900 rounded-full text-xs font-black">🥈 2</span>}
                      {rank === 3 && <span className="p-1 bg-amber-700 text-white rounded-full text-xs font-black">🥉 3</span>}
                      {rank > 3 && <span className="text-slate-400">#{toBengaliNumber(rank)}</span>}
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-bold text-white">{item.seller.name}</div>
                      <div className="text-[11px] text-emerald-400">গ্রাম: {item.seller.village || 'শেরপুর'}</div>
                    </td>

                    <td className="py-3 px-4 text-slate-300">{item.seller.phone}</td>

                    <td className="py-3 px-4 text-right font-black text-amber-300 text-base">
                      {toBengaliNumber(item.totalMon.toFixed(1))} মন
                    </td>

                    <td className="py-3 px-4 text-right font-bold text-white">
                      {formatCurrency(item.totalAmount)}
                    </td>

                    <td className="py-3 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => handleOpenWinnerModal(item, rank)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1 mx-auto cursor-pointer ${
                          rank <= 3
                            ? 'bg-amber-400 hover:bg-amber-300 text-emerald-950 font-black shadow-xs'
                            : 'bg-emerald-900 hover:bg-emerald-800 text-emerald-200'
                        }`}
                      >
                        <Send className="w-3 h-3" />
                        <span>{t('SMS ভাউচার', 'SMS Voucher')}</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Winner Notification & SMS Voucher Modal */}
      {selectedWinner && (
        <div 
          className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setSelectedWinner(null)}
        >
          <div 
            className="bg-slate-900 border border-amber-400/80 rounded-3xl shadow-2xl max-w-lg w-full p-6 text-slate-100 flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-emerald-800">
              <div className="flex items-center space-x-2">
                <Trophy className="w-6 h-6 text-amber-400" />
                <div>
                  <h3 className="font-black text-base text-white">
                    {t('সেরা বিক্রেতা পুরস্কার ও ভাউচার', 'Winner Reward Voucher')}
                  </h3>
                  <p className="text-xs text-amber-300">
                    {selectedWinner.seller.name} ({selectedWinner.seller.phone})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedWinner(null)}
                className="text-slate-400 hover:text-white p-1 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="my-4 space-y-4 text-xs">
              <div className="p-4 bg-emerald-950/80 border border-emerald-800 rounded-2xl space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">র‍্যাংকিং অবস্থান:</span>
                  <span className="font-black text-amber-300 text-sm">
                    {toBengaliNumber(selectedWinner.rank)}ম স্থান
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">মোট সরবরাহ ধান:</span>
                  <span className="font-bold text-white">
                    {toBengaliNumber(selectedWinner.totalMon.toFixed(1))} মন
                  </span>
                </div>
                <div className="flex justify-between items-center border-t border-emerald-900 pt-2">
                  <span className="text-amber-300 font-bold">ঘোষিত পুরস্কার:</span>
                  <span className="font-bold text-white text-right max-w-xs">{selectedWinner.prize}</span>
                </div>
              </div>

              {/* Pre-formatted Message */}
              <div>
                <label className="block text-[11px] font-bold text-emerald-300 mb-1">
                  {t('প্রাক-ফরম্যাটকৃত SMS ও হোয়াটসঅ্যাপ বার্তা', 'Formatted Message Preview')}
                </label>
                <div className="p-3 bg-slate-800 rounded-xl border border-slate-700 text-white font-mono text-[11px] leading-relaxed">
                  {getWinnerMessage(selectedWinner)}
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(getWinnerMessage(selectedWinner));
                  setCopiedCode(true);
                  setTimeout(() => setCopiedCode(false), 2000);
                }}
                className="w-full sm:w-auto px-4 py-2 rounded-xl border border-slate-700 text-slate-300 hover:text-white font-bold text-xs flex items-center justify-center space-x-1"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCode ? t('কপি হয়েছে', 'Copied') : t('টেক্সট কপি করুন', 'Copy Text')}</span>
              </button>

              <button
                type="button"
                onClick={() => handleSendWhatsApp(selectedWinner)}
                className="w-full sm:w-auto px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-md transition flex items-center justify-center space-x-1.5 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{t('হোয়াটসঅ্যাপে পাঠান', 'Send via WhatsApp')}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
