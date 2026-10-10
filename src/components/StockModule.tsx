import React, { useState } from 'react';
import { 
  Warehouse, 
  Search, 
  Download, 
  AlertTriangle, 
  CheckCircle, 
  Sliders, 
  FileSpreadsheet, 
  TrendingUp, 
  Scale, 
  Wheat,
  Edit,
  DollarSign
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { PaddyVariety } from '../types';
import { 
  formatCurrency, 
  toBengaliNumber, 
  decomposeTotalMon 
} from '../utils/weight';
import { exportToCSV } from '../utils/pdfExport';

export const StockModule: React.FC = () => {
  const { varieties, purchases, sales, updateVariety } = useData();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVarietyForAdjust, setSelectedVarietyForAdjust] = useState<PaddyVariety | null>(null);
  const [adjustedMon, setAdjustedMon] = useState<number | ''>('');
  const [adjustReason, setAdjustReason] = useState('নমুনা ছাঁটাই ও ধুলোবালি ঘাটতি');
  // Dynamic Mon per bag input (Requirement 3: কত মনে এক বস্তা হয় তার ইনপুট বক্স)
  const [monPerBag, setMonPerBag] = useState<number>(1.25); // Default 1.25 mon (50 kg)

  // Overall totals
  const totalStockMon = varieties.reduce((acc, v) => acc + Math.max(0, v.currentStockMon || 0), 0);
  const effectiveMonPerBag = monPerBag > 0 ? monPerBag : 1.25;
  const totalEstimatedBags = Math.round(totalStockMon / effectiveMonPerBag);

  const totalStockValuation = varieties.reduce(
    (acc, v) => acc + Math.max(0, v.currentStockMon || 0) * (v.defaultPurchaseRate || 1200),
    0
  );

  // Calculate purchases & sales by variety
  const getVarietyStats = (varietyId: string) => {
    const totalPurchased = purchases
      .filter(p => p.varietyId === varietyId)
      .reduce((acc, p) => acc + p.totalMon, 0);

    const totalSold = sales
      .filter(s => s.varietyId === varietyId)
      .reduce((acc, s) => acc + s.totalMon, 0);

    return { totalPurchased, totalSold };
  };

  // Handle Adjustment Save
  const handleSaveAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVarietyForAdjust || adjustedMon === '') return;
    try {
      await updateVariety(selectedVarietyForAdjust.id, {
        currentStockMon: Number(adjustedMon),
      });
      setSelectedVarietyForAdjust(null);
      setAdjustedMon('');
    } catch (err) {
      alert('সমন্বয় সম্পন্ন করা যায়নি');
    }
  };

  // Export to Excel / CSV
  const handleExportStockCSV = () => {
    const headers = [
      'ধানের জাত (Variety)',
      'কোড (Code)',
      'বর্তমান স্টক (মন)',
      'বর্তমান স্টক (কেজি)',
      `আনুমানিক বস্তা (${effectiveMonPerBag} মন/বস্তা)`,
      'মোট ক্রয় (মন)',
      'মোট বিক্রয় (মন)',
      'ক্রয় দর (টাকা/মন)',
      'আনুমানিক মোট মূল্য (টাকা)',
    ];

    const rows = varieties.map(v => {
      const stats = getVarietyStats(v.id);
      const totalKg = v.currentStockMon * 40;
      const bags = Math.round(v.currentStockMon / effectiveMonPerBag);
      const valuation = v.currentStockMon * (v.defaultPurchaseRate || 1200);

      return [
        v.name,
        v.code || '',
        v.currentStockMon,
        totalKg,
        bags,
        stats.totalPurchased.toFixed(1),
        stats.totalSold.toFixed(1),
        v.defaultPurchaseRate || 0,
        valuation,
      ];
    });

    exportToCSV(`Paddy_Stock_Report_${new Date().toISOString().split('T')[0]}`, [headers, ...rows]);
  };

  const filteredVarieties = varieties.filter(v =>
    v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (v.code && v.code.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Top Banner & Stats with Input Box for Mon per Bag */}
      <div className="bg-gradient-to-r from-emerald-950 via-emerald-900 to-teal-950 p-5 sm:p-6 rounded-3xl border border-emerald-800/80 shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-4 text-white">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center space-x-2">
            <Warehouse className="w-6 h-6 text-amber-400" />
            <span>গুদাম স্টক ও মজুদ ট্র্যাকিং (Live Inventory)</span>
          </h2>
          <p className="text-xs text-emerald-200/90 mt-1">
            মোট কেনা থেকে মোট বিক্রি বাদ দিয়ে স্বয়ংক্রিয় লাইভ স্টক হিসাব (১ মন = ৪০ কেজি)।
          </p>
        </div>

        {/* Input Box for Mon per Bag */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-emerald-900/60 border border-emerald-700/80 p-2.5 rounded-2xl flex items-center space-x-2.5 shadow-inner">
            <Scale className="w-4 h-4 text-amber-400 shrink-0" />
            <div>
              <label className="block text-[11px] font-bold text-emerald-200 leading-tight">
                ১ বস্তা = কত মন?
              </label>
              <div className="flex items-center space-x-1.5 mt-0.5">
                <input
                  type="number"
                  step="0.05"
                  min="0.1"
                  max="10"
                  value={monPerBag}
                  onChange={e => setMonPerBag(parseFloat(e.target.value) || 1)}
                  className="w-20 px-2.5 py-1 text-xs font-black rounded-lg border border-emerald-600 bg-emerald-950 text-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
                <span className="text-[11px] font-bold text-emerald-300">মন</span>
              </div>
            </div>
            {/* Quick Presets */}
            <div className="flex flex-col gap-1 pl-2 border-l border-emerald-800 text-[10px]">
              <button 
                type="button" 
                onClick={() => setMonPerBag(1.25)} 
                className={`px-2 py-0.5 rounded font-bold transition cursor-pointer ${monPerBag === 1.25 ? 'bg-amber-400 text-emerald-950' : 'bg-emerald-950 text-emerald-300 hover:text-white'}`}
              >
                ৫০ কেজি (১.২৫ মন)
              </button>
              <button 
                type="button" 
                onClick={() => setMonPerBag(1.0)} 
                className={`px-2 py-0.5 rounded font-bold transition cursor-pointer ${monPerBag === 1.0 ? 'bg-amber-400 text-emerald-950' : 'bg-emerald-950 text-emerald-300 hover:text-white'}`}
              >
                ৪০ কেজি (১.০০ মন)
              </button>
            </div>
          </div>

          <button
            onClick={handleExportStockCSV}
            className="px-4 py-2.5 rounded-2xl border border-emerald-700 bg-emerald-900/60 hover:bg-emerald-800 text-emerald-100 font-bold text-xs transition flex items-center space-x-1.5 shadow-md active:scale-95 cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-amber-400" />
            <span>Excel এক্সপোর্ট</span>
          </button>
        </div>
      </div>

      {/* 3 Summary Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-emerald-900/50 border border-emerald-700/60 rounded-3xl p-5 text-white shadow-lg relative overflow-hidden">
          <span className="text-xs font-bold text-emerald-300 uppercase tracking-wider block">
            গুদামে মোট মজুদ ধান
          </span>
          <div className="text-3xl font-black mt-2 text-amber-300">
            {toBengaliNumber(totalStockMon.toFixed(1))} <span className="text-base text-emerald-100 font-semibold">মন</span>
          </div>
          <div className="text-xs text-emerald-300/80 mt-1">
            সমান সমান: {toBengaliNumber(Math.round(totalStockMon * 40))} কেজি
          </div>
        </div>

        <div className="bg-emerald-900/50 border border-emerald-700/60 rounded-3xl p-5 text-white shadow-lg relative overflow-hidden">
          <span className="text-xs font-bold text-emerald-300 uppercase tracking-wider block">
            আনুমানিক বস্তার সংখ্যা
          </span>
          <div className="text-3xl font-black mt-2 text-white">
            {toBengaliNumber(totalEstimatedBags)} <span className="text-base text-emerald-300 font-semibold">বস্তা</span>
          </div>
          <div className="text-xs text-amber-300 font-semibold mt-1">
            ({toBengaliNumber(effectiveMonPerBag)} মন / বস্তা অনুযায়ী গণনাকৃত)
          </div>
        </div>

        <div className="bg-emerald-900/50 border border-emerald-700/60 rounded-3xl p-5 text-white shadow-lg relative overflow-hidden">
          <span className="text-xs font-bold text-emerald-300 uppercase tracking-wider block">
            মোট মজুদের আনুমানিক বাজার মূল্য
          </span>
          <div className="text-3xl font-black mt-2 text-emerald-400">
            {formatCurrency(totalStockValuation)}
          </div>
          <div className="text-xs text-emerald-300/80 mt-1">
            বর্তমান কেনা দরের ভিত্তিতে হিসাবকৃত
          </div>
        </div>
      </div>

      {/* Search Input */}
      <div className="bg-emerald-950/90 p-4 rounded-2xl border border-emerald-800/80 flex items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-3 text-emerald-400" />
          <input
            type="text"
            placeholder="ধানের জাত খুঁজুন..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-xl border border-emerald-700 bg-emerald-900/50 text-white placeholder-emerald-400/60 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Stock Table by Paddy Variety */}
      <div className="bg-emerald-950/90 rounded-3xl border border-emerald-800/80 shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-emerald-900/60 text-emerald-300 border-b border-emerald-800 font-bold uppercase">
              <tr>
                <th className="py-3.5 px-4">ধানের জাত ও বিবরণ</th>
                <th className="py-3.5 px-4">বর্তমান মজুদ (মন ও কেজি)</th>
                <th className="py-3.5 px-4">আনুমানিক বস্তা ({effectiveMonPerBag} মন/বস্তা)</th>
                <th className="py-3.5 px-4">মোট ক্রয় (মন)</th>
                <th className="py-3.5 px-4">মোট বিক্রি (মন)</th>
                <th className="py-3.5 px-4 text-right">বর্তমান দর</th>
                <th className="py-3.5 px-4 text-right">মজুদ মূল্য</th>
                <th className="py-3.5 px-4 text-center">সমন্বয়</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-emerald-900/50 text-slate-100">
              {filteredVarieties.map(v => {
                const stats = getVarietyStats(v.id);
                const dec = decomposeTotalMon(v.currentStockMon);
                const bags = Math.round(v.currentStockMon / effectiveMonPerBag);
                const valuation = v.currentStockMon * (v.defaultPurchaseRate || 1200);
                // Requirement 4.D: Show a visual notification badge when stock drops below 20 Maunds
                const isLow = v.currentStockMon < 20;

                return (
                  <tr key={v.id} className="hover:bg-emerald-900/40 transition">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center space-x-2.5">
                        <div className="w-8 h-8 rounded-xl bg-amber-400 text-emerald-950 flex items-center justify-center font-bold text-xs shadow-xs">
                          🌾
                        </div>
                        <div>
                          <div className="font-bold text-white text-sm flex items-center">
                            <span>{v.name}</span>
                            {isLow && (
                              <span className="ml-2 px-2 py-0.5 rounded-full bg-rose-950/90 text-rose-300 border border-rose-700 text-[10px] font-bold animate-pulse">
                                সতর্কবার্তা: ২০ মনের নিচে!
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-emerald-400">{v.description || 'নিয়মিত জাত'}</div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className={`font-black text-base ${isLow ? 'text-rose-400' : 'text-amber-300'}`}>
                        {toBengaliNumber(dec.mon)} মন {dec.kg > 0 ? `${toBengaliNumber(dec.kg)} কেজি` : ''}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        মোট {toBengaliNumber(v.currentStockMon.toFixed(1))} মন ({toBengaliNumber(Math.round(v.currentStockMon * 40))} কেজি)
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-bold text-slate-200">
                      {toBengaliNumber(bags)} বস্তা
                    </td>

                    <td className="py-3.5 px-4 text-emerald-400 font-semibold">
                      {toBengaliNumber(stats.totalPurchased.toFixed(1))} মন
                    </td>

                    <td className="py-3.5 px-4 text-slate-300 font-semibold">
                      {toBengaliNumber(stats.totalSold.toFixed(1))} মন
                    </td>

                    <td className="py-3.5 px-4 text-right font-medium text-slate-200">
                      ৳ {toBengaliNumber(v.defaultPurchaseRate || 0)}
                    </td>

                    <td className="py-3.5 px-4 text-right font-bold text-emerald-400">
                      {formatCurrency(valuation)}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => {
                          setSelectedVarietyForAdjust(v);
                          setAdjustedMon(v.currentStockMon);
                        }}
                        title="স্টক সংশোধন বা সমন্বয়"
                        className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-300 font-bold text-xs transition inline-flex items-center space-x-1 border border-emerald-800"
                      >
                        <Sliders className="w-3.5 h-3.5 text-amber-300" />
                        <span>সমন্বয়</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Stock Adjustment Modal */}
      {selectedVarietyForAdjust && (
        <div 
          className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
          onClick={() => setSelectedVarietyForAdjust(null)}
        >
          <div 
            className="bg-slate-900 rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-emerald-800 text-slate-100"
            onClick={e => e.stopPropagation()}
          >
            <div className="bg-emerald-950 text-white px-5 py-4 flex items-center justify-between border-b border-emerald-800">
              <h3 className="font-bold text-base flex items-center space-x-2">
                <Sliders className="w-4 h-4 text-amber-300" />
                <span>স্টক সমন্বয়: {selectedVarietyForAdjust.name}</span>
              </h3>
              <button
                onClick={() => setSelectedVarietyForAdjust(null)}
                className="text-slate-400 hover:text-white font-bold p-1 text-base cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveAdjustment} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-emerald-300 mb-1">
                  নতুন সঠিক স্টক (মন) *
                </label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={adjustedMon}
                  onChange={e => setAdjustedMon(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full p-2.5 text-sm rounded-xl border border-emerald-700 bg-emerald-950 text-amber-300 focus:ring-2 focus:ring-emerald-500 font-bold"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  বর্তমান রেকর্ড ছিল: {toBengaliNumber(selectedVarietyForAdjust.currentStockMon)} মন
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  সমন্বয়ের কারণ
                </label>
                <input
                  type="text"
                  value={adjustReason}
                  onChange={e => setAdjustReason(e.target.value)}
                  className="w-full p-2.5 text-xs rounded-xl border border-emerald-800 bg-slate-800 text-white placeholder-slate-500"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-emerald-900">
                <button
                  type="button"
                  onClick={() => setSelectedVarietyForAdjust(null)}
                  className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 font-bold text-xs"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-md transition active:scale-95 cursor-pointer"
                >
                  আপডেট করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
