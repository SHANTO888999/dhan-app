import React, { useState } from 'react';
import { 
  PlusCircle, 
  Edit2, 
  Trash2, 
  Search, 
  Wheat,
  Warehouse,
  Coins
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { useThemeLanguage } from '../context/ThemeLanguageContext';
import { PaddyVariety } from '../types';
import { formatCurrency, toBengaliNumber } from '../utils/weight';
import { ConfirmationModal } from './ConfirmationModal';

export const VarietiesModule: React.FC = () => {
  const { varieties, addVariety, updateVariety, deleteVariety } = useData();
  const { t } = useThemeLanguage();

  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVariety, setEditingVariety] = useState<PaddyVariety | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PaddyVariety | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [purchaseRate, setPurchaseRate] = useState<number | ''>('');
  const [saleRate, setSaleRate] = useState<number | ''>('');
  const [initialStock, setInitialStock] = useState<number | ''>(0);
  const [description, setDescription] = useState('');

  const handleOpenAdd = () => {
    setEditingVariety(null);
    setName('');
    setCode('');
    setPurchaseRate('');
    setSaleRate('');
    setInitialStock(0);
    setDescription('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (v: PaddyVariety) => {
    setEditingVariety(v);
    setName(v.name);
    setCode(v.code || '');
    setPurchaseRate(v.defaultPurchaseRate || '');
    setSaleRate(v.defaultSaleRate || '');
    setInitialStock(v.currentStockMon || 0);
    setDescription(v.description || '');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert(t('ধানের জাতের নাম লিখুন', 'Please enter paddy variety name'));
      return;
    }

    try {
      if (editingVariety) {
        await updateVariety(editingVariety.id, {
          name: name.trim(),
          code: code.trim(),
          defaultPurchaseRate: typeof purchaseRate === 'number' ? purchaseRate : 0,
          defaultSaleRate: typeof saleRate === 'number' ? saleRate : 0,
          currentStockMon: typeof initialStock === 'number' ? initialStock : 0,
          description: description.trim(),
        });
      } else {
        await addVariety({
          name: name.trim(),
          code: code.trim() || name.substring(0, 4).toUpperCase(),
          defaultPurchaseRate: typeof purchaseRate === 'number' ? purchaseRate : 1200,
          defaultSaleRate: typeof saleRate === 'number' ? saleRate : 1260,
          currentStockMon: typeof initialStock === 'number' ? initialStock : 0,
          description: description.trim(),
        });
      }
      setIsModalOpen(false);
    } catch {
      alert(t('সংরক্ষণ করা যায়নি', 'Failed to save'));
    }
  };

  const filtered = varieties.filter(v =>
    v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (v.code && v.code.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-emerald-950/80 p-5 sm:p-6 rounded-3xl border border-emerald-800/80 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white flex items-center space-x-2.5">
            <Wheat className="w-7 h-7 text-amber-400" />
            <span>{t('ধানের জাত ও ক্যাটাগরি ব্যবস্থাপনা (Paddy Varieties)', 'Paddy Varieties Management')}</span>
          </h2>
          <p className="text-xs sm:text-sm text-emerald-300/80 mt-1">
            {t(
              'বিভিন্ন জাতের ধান যুক্ত করুন (যেমন: বিআর-২৮, মিনিকেট, কাটারিভোগ, তেজ) এবং ডিফল্ট ক্রয়-বিক্রয় দর নির্ধারণ করুন।',
              'Manage paddy varieties, default purchase and selling rates, and track inventory.'
            )}
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAdd}
          className="px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-emerald-950 font-black text-xs sm:text-sm shadow-md transition flex items-center space-x-1.5 active:scale-95 cursor-pointer self-start sm:self-auto shrink-0"
        >
          <PlusCircle className="w-4 h-4 text-emerald-950" />
          <span>{t('+ নতুন ধানের জাত যোগ করুন', '+ Add New Variety')}</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="bg-emerald-950/70 p-4 rounded-2xl border border-emerald-800/70 flex items-center justify-between shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-3 text-emerald-400" />
          <input
            type="text"
            placeholder={t('জাতের নাম বা কোড দিয়ে খুঁজুন...', 'Search variety name or code...')}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-xl border border-emerald-800 bg-slate-900 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </div>
        <div className="text-xs font-bold text-emerald-300 hidden sm:block">
          {t('মোট জাত: ', 'Total Varieties: ')}<span className="text-amber-300 font-black">{toBengaliNumber(varieties.length)}</span> টি
        </div>
      </div>

      {/* Grid Cards of Varieties */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(v => (
          <div
            key={v.id}
            className="bg-slate-900 rounded-3xl border border-emerald-800/80 p-5 shadow-lg hover:border-amber-400/60 transition space-y-4 text-slate-100"
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="px-2.5 py-0.5 rounded-lg text-[11px] font-black bg-amber-400/20 text-amber-300 border border-amber-400/40 uppercase">
                  {v.code || 'VAR'}
                </span>
                <h3 className="font-bold text-lg text-white mt-1.5">{v.name}</h3>
                <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">
                  {v.description || t('নিয়মিত ধানের জাত', 'Standard paddy variety')}
                </p>
              </div>

              <div className="flex items-center space-x-1.5">
                <button
                  type="button"
                  onClick={() => handleOpenEdit(v)}
                  title={t('এডিট করুন', 'Edit')}
                  className="p-1.5 rounded-lg text-slate-300 hover:text-amber-300 hover:bg-emerald-900/60 transition cursor-pointer"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteTarget(v)}
                  title={t('মুছে ফেলুন', 'Delete')}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 transition cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-emerald-900/80 text-xs">
              <div className="bg-emerald-950/60 p-2.5 rounded-2xl border border-emerald-900/60">
                <span className="text-slate-400 text-[11px] block">{t('ডিফল্ট ক্রয় দর:', 'Default Buy Rate:')}</span>
                <span className="font-bold text-sm text-amber-300">৳ {toBengaliNumber(v.defaultPurchaseRate || 0)} / মন</span>
              </div>
              <div className="bg-emerald-950/60 p-2.5 rounded-2xl border border-emerald-900/60">
                <span className="text-slate-400 text-[11px] block">{t('ডিফল্ট বিক্রয় দর:', 'Default Sale Rate:')}</span>
                <span className="font-bold text-sm text-emerald-400">৳ {toBengaliNumber(v.defaultSaleRate || 0)} / মন</span>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs pt-1 border-t border-emerald-900/50">
              <span className="text-slate-400 flex items-center space-x-1">
                <Warehouse className="w-3.5 h-3.5 text-emerald-400" />
                <span>{t('গুদামে বর্তমান মজুদ:', 'Current Stock:')}</span>
              </span>
              <span className="font-black text-sm text-white">
                {toBengaliNumber((v.currentStockMon || 0).toFixed(1))} মন
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* MODAL: Add/Edit Variety */}
      {isModalOpen && (
        <div 
          className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
          onClick={() => setIsModalOpen(false)}
        >
          <div 
            className="bg-slate-900 rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-emerald-800 text-slate-100"
            onClick={e => e.stopPropagation()}
          >
            <div className="bg-emerald-950 text-white px-5 py-4 flex items-center justify-between border-b border-emerald-800">
              <h3 className="font-bold text-base flex items-center space-x-2">
                <Wheat className="w-4 h-4 text-amber-400" />
                <span>{editingVariety ? t('জাত এডিট করুন', 'Edit Variety') : t('নতুন ধানের জাত যুক্ত করুন', 'Add New Variety')}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white font-bold p-1 leading-none cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-emerald-300 mb-1">
                  {t('ধানের জাতের নাম *', 'Variety Name *')}
                </label>
                <input
                  type="text"
                  required
                  placeholder="যেমন: মিনিকেট, বিআর-২৮ বা তেজ"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full p-2.5 text-sm rounded-xl border border-emerald-700 bg-slate-800 text-white focus:ring-2 focus:ring-amber-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-emerald-300 mb-1">
                  {t('কোড / শর্টনেম (ঐচ্ছিক)', 'Code / Short Name')}
                </label>
                <input
                  type="text"
                  placeholder="যেমন: BR-28, MNK, TEJ"
                  value={code}
                  onChange={e => setCode(e.target.value)}
                  className="w-full p-2.5 text-sm rounded-xl border border-emerald-700 bg-slate-800 text-white uppercase focus:ring-2 focus:ring-amber-400 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-emerald-300 mb-1">
                    {t('ডিফল্ট ক্রয় দর (টাকা/মন)', 'Default Buy Rate (৳)')}
                  </label>
                  <input
                    type="number"
                    placeholder="1200"
                    value={purchaseRate}
                    onChange={e => setPurchaseRate(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full p-2.5 text-sm rounded-xl border border-emerald-700 bg-slate-800 text-amber-300 font-bold focus:ring-2 focus:ring-amber-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-emerald-300 mb-1">
                    {t('ডিফল্ট বিক্রয় দর (টাকা/মন)', 'Default Sale Rate (৳)')}
                  </label>
                  <input
                    type="number"
                    placeholder="1260"
                    value={saleRate}
                    onChange={e => setSaleRate(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full p-2.5 text-sm rounded-xl border border-emerald-700 bg-slate-800 text-emerald-400 font-bold focus:ring-2 focus:ring-amber-400 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-emerald-300 mb-1">
                  {t('বর্তমান স্টক (মন)', 'Current Stock (Mon)')}
                </label>
                <input
                  type="number"
                  step="any"
                  placeholder="0"
                  value={initialStock}
                  onChange={e => setInitialStock(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full p-2.5 text-sm rounded-xl border border-emerald-700 bg-slate-800 text-white font-bold focus:ring-2 focus:ring-amber-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-emerald-300 mb-1">
                  {t('বিবরণ / নোট (ঐচ্ছিক)', 'Description / Note')}
                </label>
                <input
                  type="text"
                  placeholder="যেমন: চিকন ও পলিশ উপযোগী ধান"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full p-2.5 text-xs rounded-xl border border-emerald-700 bg-slate-800 text-white focus:ring-2 focus:ring-amber-400 focus:outline-none"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-emerald-800/80">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-emerald-800 text-slate-300 hover:text-white text-xs font-bold cursor-pointer"
                >
                  {t('বাতিল', 'Cancel')}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-emerald-950 font-black text-xs shadow-md transition active:scale-95 cursor-pointer"
                >
                  {editingVariety ? t('আপডেট করুন', 'Update') : t('যোগ করুন', 'Add')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={Boolean(deleteTarget)}
        title={t('ধানের জাত মুছে ফেলার নিশ্চিতকরণ', 'Delete Variety Confirmation')}
        message={t('আপনি কি নিশ্চিত যে এই জাতটি মুছে ফেলতে চান?', 'Are you sure you want to delete this paddy variety?')}
        itemDetails={deleteTarget ? `${deleteTarget.name} (${deleteTarget.code || 'VAR'}) • স্টক: ${toBengaliNumber(deleteTarget.currentStockMon)} মন` : ''}
        onConfirm={async () => {
          if (deleteTarget) {
            await deleteVariety(deleteTarget.id);
            setDeleteTarget(null);
          }
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};
