import React, { useState } from 'react';
import { 
  Settings as SettingsIcon, 
  Printer, 
  MessageSquare, 
  Building2, 
  Bluetooth, 
  Send, 
  CheckCircle2, 
  RotateCcw, 
  ShieldCheck, 
  Smartphone,
  Save,
  LogOut,
  LogIn,
  Tag,
  Plus,
  Trash2,
  X
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { useThemeLanguage } from '../context/ThemeLanguageContext';
import { printThermalReceipt, connectBluetoothPrinter } from '../utils/thermalPrinter';
import { sendGatewaySMS } from '../utils/sms';
import { toBengaliNumber } from '../utils/weight';

export const SettingsModal: React.FC = () => {
  const { settings, updateSettings, resetSampleData } = useData();
  const { currentUser, isDemoUser, signInWithGoogle, signOut } = useAuth();
  const { t } = useThemeLanguage();

  // Local Form State
  const [businessName, setBusinessName] = useState(settings.businessName);
  const [proprietor, setProprietor] = useState(settings.proprietor);
  const [phone, setPhone] = useState(settings.phone);
  const [address, setAddress] = useState(settings.address);
  const [invoiceFooterNote, setInvoiceFooterNote] = useState(settings.invoiceFooterNote);
  const [thermalPrinterWidth, setThermalPrinterWidth] = useState<58 | 80>(settings.thermalPrinterWidth || 58);
  const [smsGatewayApiKey, setSmsGatewayApiKey] = useState(settings.smsGatewayApiKey || '');
  const [smsGatewaySenderId, setSmsGatewaySenderId] = useState(settings.smsGatewaySenderId || '');
  const [smsAutoSendFarmer, setSmsAutoSendFarmer] = useState(settings.smsAutoSendFarmer);
  const [smsAutoSendBuyer, setSmsAutoSendBuyer] = useState(settings.smsAutoSendBuyer);
  const [showMemoBags, setShowMemoBags] = useState(!!settings.showMemoBags);
  const [showMemoLabor, setShowMemoLabor] = useState(!!settings.showMemoLabor);
  const [showMemoDeductions, setShowMemoDeductions] = useState(!!settings.showMemoDeductions);
  const [showMemoNotes, setShowMemoNotes] = useState(!!settings.showMemoNotes);

  // Custom Expense Category Management
  const [customExpenseCategories, setCustomExpenseCategories] = useState<string[]>(
    settings.customExpenseCategories && settings.customExpenseCategories.length > 0
      ? settings.customExpenseCategories
      : [
          'দোকান ভাড়া',
          'বিদ্যুৎ বিল',
          'লেবার ও কুলি খরচ',
          'গাড়ি / পরিবহন ভাড়া',
          'চা-নাস্তা ও আপ্যায়ন',
          'মসজিদ/মাদ্রাসা অনুদান',
        ]
  );
  const [newCategoryInput, setNewCategoryInput] = useState('');

  const handleAddCategory = () => {
    const trimmed = newCategoryInput.trim();
    if (!trimmed) return;
    if (customExpenseCategories.includes(trimmed)) {
      alert(t('এই ক্যাটাগরি ইতিমধ্যে যোগ করা রয়েছে।', 'This category already exists.'));
      return;
    }
    setCustomExpenseCategories([...customExpenseCategories, trimmed]);
    setNewCategoryInput('');
  };

  const handleRemoveCategory = (cat: string) => {
    setCustomExpenseCategories(customExpenseCategories.filter(c => c !== cat));
  };

  const [testPhone, setTestPhone] = useState('01712345678');
  const [testSmsStatus, setTestSmsStatus] = useState<string | null>(null);
  const [btStatus, setBtStatus] = useState<string | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateSettings({
      businessName,
      proprietor,
      phone,
      address,
      invoiceFooterNote,
      thermalPrinterWidth,
      smsGatewayApiKey,
      smsGatewaySenderId,
      smsAutoSendFarmer,
      smsAutoSendBuyer,
      customExpenseCategories,
      showMemoBags,
      showMemoLabor,
      showMemoDeductions,
      showMemoNotes,
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleTestPrint = () => {
    const demoHtml = `
      <div style="text-align: center;">
        <h3 style="margin: 0; font-size: 14px;">${businessName}</h3>
        <p style="margin: 2px 0; font-size: 10px;">প্রোঃ ${proprietor}</p>
        <p style="margin: 2px 0; font-size: 10px;">মোবাইল: ${phone}</p>
        <div style="border-top: 1px dashed #000; margin: 6px 0;"></div>
        <p style="font-size: 11px; font-weight: bold;">থার্মাল প্রিন্টার টেস্ট সফল</p>
        <p style="font-size: 10px;">কাগজ সাইজ: ${thermalPrinterWidth}mm</p>
        <p style="font-size: 10px;">১ মন = ৪০ কেজি কনভার্সন সিস্টেম</p>
        <div style="border-top: 1px dashed #000; margin: 6px 0;"></div>
        <p style="font-size: 9px;">${invoiceFooterNote}</p>
      </div>
    `;
    printThermalReceipt(demoHtml, thermalPrinterWidth);
  };

  const handlePairBluetooth = async () => {
    setBtStatus('Bluetooth ডিভাইস খোঁজা হচ্ছে...');
    try {
      await connectBluetoothPrinter();
      setBtStatus('সফলভাবে Bluetooth থার্মাল প্রিন্টার সংযুক্ত হয়েছে!');
    } catch (err) {
      setBtStatus(err instanceof Error ? err.message : 'সংযুক্ত করা সম্ভব হয়নি');
    }
  };

  const handleSendTestSMS = async () => {
    setTestSmsStatus('SMS পাঠানো হচ্ছে...');
    const dummySettings = {
      ...settings,
      smsGatewayApiKey,
      smsGatewaySenderId,
      businessName,
      phone,
    };
    const testMsg = `[টেস্ট মেসেজ] ${businessName} হতে স্বাগতম। ধানের ব্যবসা POS সিস্টেম সফলভাবে কাজ করছে। যোগাযোগ: ${phone}`;
    try {
      const res = await sendGatewaySMS(testPhone, testMsg, dummySettings);
      if (res.success) {
        setTestSmsStatus(`সফল হয়েছে! বার্তা পাঠানো সম্পন্ন (ID: ${res.messageId})`);
      } else {
        setTestSmsStatus(`ত্রুটি: ${res.error}`);
      }
    } catch (err) {
      setTestSmsStatus('গেটওয়েতে সমস্যা দেখা দিয়েছে');
    }
  };

  return (
    <div className="space-y-6 w-full max-w-[1400px] mx-auto">
      {/* Top Banner */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between transition-colors">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center space-x-2">
            <SettingsIcon className="w-6 h-6 text-emerald-800 dark:text-emerald-400" />
            <span>{t('সিস্টেম ও ব্যবসা সেটিংস (Configuration)', 'System & Business Settings')}</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {t(
              'আড়তের নাম, প্রোফাইল, কাস্টম খরচ ক্যাটাগরি, প্রিন্টার সাইজ এবং স্বয়ংক্রিয় SMS গেটওয়ে নিয়ন্ত্রণ করুন। (ভাষা ও থিম টগল ৩-লাইন মেনুতে সংরক্ষিত)',
              'Manage shop profile, custom expense categories, thermal printer, and SMS gateway. (Language & Theme toggles are located exclusively in the 3-line Drawer Menu).'
            )}
          </p>
        </div>

        {savedSuccess && (
          <span className="px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold text-xs flex items-center space-x-1">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>{t('সেভ হয়েছে!', 'Saved!')}</span>
          </span>
        )}
      </div>

      <form onSubmit={handleSaveSettings} className="space-y-6">
        {/* Business Profile Section */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4 transition-colors">
          <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center space-x-2 pb-2 border-b border-slate-100 dark:border-slate-800">
            <Building2 className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />
            <span>{t('আড়ত / ব্যবসার প্রোফাইল (মেমো ও চালানে প্রদর্শিত)', 'Shop & Business Profile')}</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {t('আড়ত / প্রতিষ্ঠানের নাম *', 'Business Name *')}
              </label>
              <input
                type="text"
                required
                value={businessName}
                onChange={e => setBusinessName(e.target.value)}
                className="w-full p-2.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {t('স্বত্বাধিকারী (প্রোপ্রাইটর)', 'Proprietor Name')}
              </label>
              <input
                type="text"
                value={proprietor}
                onChange={e => setProprietor(e.target.value)}
                className="w-full p-2.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {t('মোবাইল নম্বর (যোগাযোগ)', 'Phone Number')}
              </label>
              <input
                type="text"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="w-full p-2.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {t('ঠিকানা / মোকাম', 'Address / Market Location')}
              </label>
              <input
                type="text"
                value={address}
                onChange={e => setAddress(e.target.value)}
                className="w-full p-2.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="col-span-1 sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {t('মেমো ও রসিদের পাদটিকা (Footer Note)', 'Invoice Footer Note')}
              </label>
              <input
                type="text"
                value={invoiceFooterNote}
                onChange={e => setInvoiceFooterNote(e.target.value)}
                className="w-full p-2.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* Custom Expense Category Management Section (Requirement 1: Settings - Custom Expense Category Management) */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4 transition-colors">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center space-x-2">
              <Tag className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              <span>{t('কাস্টম খরচ ক্যাটাগরি ব্যবস্থাপনা (Expense Categories)', 'Custom Expense Categories')}</span>
            </h3>
            <span className="text-xs text-slate-400">
              {toBengaliNumber(customExpenseCategories.length)} টি ক্যাটাগরি
            </span>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t(
              'আড়তের দৈনন্দিন বিবিধ খরচ (যেমন: দোকান ভাড়া, বিদ্যুৎ, লেবার বিল) রেকর্ড করার সুবিধার্থে কাস্টম ক্যাটাগরি তৈরি ও নিয়ন্ত্রণ করুন।',
              'Create and manage custom categories for recurring expenses like rent, bills, and labor.'
            )}
          </p>

          {/* Add Category Input */}
          <div className="flex gap-2">
            <input
              type="text"
              placeholder={t('নতুন খরচের ক্যাটাগরি লিখুন (যেমন: কুলি খরচ, প্যাকিং খরচ)...', 'New expense category name...')}
              value={newCategoryInput}
              onChange={e => setNewCategoryInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddCategory();
                }
              }}
              className="flex-1 p-2.5 text-xs sm:text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
            <button
              type="button"
              onClick={handleAddCategory}
              className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-xs transition flex items-center space-x-1"
            >
              <Plus className="w-4 h-4" />
              <span>{t('যোগ করুন', 'Add')}</span>
            </button>
          </div>

          {/* Existing Categories Badges */}
          <div className="flex flex-wrap gap-2 pt-1">
            {customExpenseCategories.map(cat => (
              <span
                key={cat}
                className="inline-flex items-center space-x-1.5 py-1.5 px-3 rounded-xl bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 text-purple-900 dark:text-purple-200 text-xs font-semibold"
              >
                <span>{cat}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveCategory(cat)}
                  className="p-0.5 rounded-full hover:bg-purple-200 dark:hover:bg-purple-800 text-purple-600 dark:text-purple-300 transition"
                  title="মুছে ফেলুন"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* Purchase Memo Form Fields Configuration */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4 transition-colors">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center space-x-2">
              <span className="text-amber-500 font-black">🌾</span>
              <span>{t('ধান ক্রয়ের মেমো পেজ ফিল্ড সেটিংস (Memo Form Fields)', 'Purchase Memo Form Fields')}</span>
            </h3>
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
              {t('কাস্টম ফিল্ড অপশন', 'Custom Fields')}
            </span>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            {t(
              'ধান কেনার এন্ট্রি পেজে কোন কোন ঐচ্ছিক (Optional) ইনপুট ঘর দেখতে চান তা নির্বাচন করুন। টিক চিহ্ন দেওয়া ঘরগুলো মেমো পেজে দৃশ্যমান হবে।',
              'Select which optional fields to display on the paddy purchase memo entry page.'
            )}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {/* 1. Bags Count */}
            <label className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition">
              <div>
                <span className="font-bold text-sm text-slate-900 dark:text-white block">
                  {t('বস্তার সংখ্যা (Bags Count)', 'Bags Count')}
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  {t('ডিফল্টভাবে বন্ধ থাকে, প্রয়োজন হলে চালু করুন', 'Default is off')}
                </span>
              </div>
              <input
                type="checkbox"
                checked={showMemoBags}
                onChange={e => setShowMemoBags(e.target.checked)}
                className="w-5 h-5 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 dark:border-slate-600 cursor-pointer accent-emerald-600"
              />
            </label>

            {/* 2. Labor Cost */}
            <label className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition">
              <div>
                <span className="font-bold text-sm text-slate-900 dark:text-white block">
                  {t('লেবার খরচ / লেবার কর্তন', 'Labor Cost')}
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  {t('কুলি বা খালাসি খরচ লেখার ঘর', 'Field for laborer charges')}
                </span>
              </div>
              <input
                type="checkbox"
                checked={showMemoLabor}
                onChange={e => setShowMemoLabor(e.target.checked)}
                className="w-5 h-5 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 dark:border-slate-600 cursor-pointer accent-emerald-600"
              />
            </label>

            {/* 3. Deductions */}
            <label className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition">
              <div>
                <span className="font-bold text-sm text-slate-900 dark:text-white block">
                  {t('চালতা / অন্যান্য কর্তন', 'Chalta / Deductions')}
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  {t('ধানের আর্দ্রতা বা চালতা বাবদ টাকা বাদ', 'Deduction amount')}
                </span>
              </div>
              <input
                type="checkbox"
                checked={showMemoDeductions}
                onChange={e => setShowMemoDeductions(e.target.checked)}
                className="w-5 h-5 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 dark:border-slate-600 cursor-pointer accent-emerald-600"
              />
            </label>

            {/* 4. Notes */}
            <label className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition">
              <div>
                <span className="font-bold text-sm text-slate-900 dark:text-white block">
                  {t('নোটস ও মন্তব্য', 'Notes / Remarks')}
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  {t('মেমোতে বিশেষ মন্তব্য লেখার ঘর', 'Additional remarks')}
                </span>
              </div>
              <input
                type="checkbox"
                checked={showMemoNotes}
                onChange={e => setShowMemoNotes(e.target.checked)}
                className="w-5 h-5 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 dark:border-slate-600 cursor-pointer accent-emerald-600"
              />
            </label>
          </div>
        </div>

        {/* Thermal Printer Settings */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4 transition-colors">
          <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center space-x-2 pb-2 border-b border-slate-100 dark:border-slate-800">
            <Printer className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            <span>{t('থার্মাল প্রিন্টার কনফিগারেশন (Thermal Printer 58mm / 80mm)', 'Thermal Printer Setup')}</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {t('রোল পেপার প্রস্থ (Width)', 'Paper Roll Width')}
              </label>
              <div className="grid grid-cols-2 gap-3 mt-1">
                <button
                  type="button"
                  onClick={() => setThermalPrinterWidth(58)}
                  className={`py-3 px-4 rounded-xl border text-center font-bold text-xs transition ${
                    thermalPrinterWidth === 58
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-900 dark:text-emerald-200 ring-2 ring-emerald-500/20'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <span className="block text-base">58mm (২ ইঞ্চি)</span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-normal">মিনি ব্লুটুথ ও পোর্টেবল</span>
                </button>

                <button
                  type="button"
                  onClick={() => setThermalPrinterWidth(80)}
                  className={`py-3 px-4 rounded-xl border text-center font-bold text-xs transition ${
                    thermalPrinterWidth === 80
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-900 dark:text-emerald-200 ring-2 ring-emerald-500/20'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <span className="block text-base">80mm (৩ ইঞ্চি)</span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-normal">স্ট্যান্ডার্ড ডেস্কটপ পিওএস</span>
                </button>
              </div>
            </div>

            <div className="flex flex-col justify-end space-y-2">
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={handleTestPrint}
                  className="flex-1 py-2.5 px-3 rounded-lg bg-emerald-100 dark:bg-emerald-900/60 text-emerald-900 dark:text-emerald-200 hover:bg-emerald-200 font-bold text-xs transition flex items-center justify-center space-x-1.5"
                >
                  <Printer className="w-4 h-4" />
                  <span>{t('টেস্ট প্রিন্ট বের করুন', 'Test Print')}</span>
                </button>

                <button
                  type="button"
                  onClick={handlePairBluetooth}
                  className="flex-1 py-2.5 px-3 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-900 dark:text-blue-300 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 font-bold text-xs transition flex items-center justify-center space-x-1.5"
                >
                  <Bluetooth className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span>Bluetooth পেয়ার</span>
                </button>
              </div>

              {btStatus && (
                <p className="text-[11px] text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 p-2 rounded border border-slate-200 dark:border-slate-700">
                  {btStatus}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Automated SMS Settings */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4 transition-colors">
          <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center space-x-2 pb-2 border-b border-slate-100 dark:border-slate-800">
            <MessageSquare className="w-5 h-5 text-sky-600 dark:text-sky-400" />
            <span>{t('স্বয়ংক্রিয় SMS নোটিফিকেশন সিস্টেম (SMS Gateway)', 'Automated SMS Gateway')}</span>
          </h3>

          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <label className="flex items-center space-x-2 text-xs text-slate-800 dark:text-slate-200 font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={smsAutoSendFarmer}
                  onChange={e => setSmsAutoSendFarmer(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded"
                />
                <span>{t('ধান কেনা সম্পন্ন হলে বিক্রেতাকে স্বয়ংক্রিয় SMS পাঠানো হবে', 'Send automatic SMS to seller upon purchase')}</span>
              </label>

              <label className="flex items-center space-x-2 text-xs text-slate-800 dark:text-slate-200 font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={smsAutoSendBuyer}
                  onChange={e => setSmsAutoSendBuyer(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded"
                />
                <span>{t('ধানের ট্রাক ছাড়ার পর ক্রেতাকে স্বয়ংক্রিয় SMS পাঠানো হবে', 'Send automatic SMS to buyer on shipment')}</span>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  SMS Gateway API Token / Key
                </label>
                <input
                  type="password"
                  placeholder="Greenweb, BulkSMS BD বা Twilio API Token"
                  value={smsGatewayApiKey}
                  onChange={e => setSmsGatewayApiKey(e.target.value)}
                  className="w-full p-2.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                />
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                  * ফাঁকা রাখলেও যেকোনো সময় WhatsApp ও মোবাইলের সাধারণ SMS অ্যাপ দিয়ে সম্পূর্ণ ফ্রি পাঠানো যাবে।
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Sender ID / মাস্কিং নাম
                </label>
                <input
                  type="text"
                  placeholder="যেমন: DHANARAT"
                  value={smsGatewaySenderId}
                  onChange={e => setSmsGatewaySenderId(e.target.value)}
                  className="w-full p-2.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                />
              </div>
            </div>

            {/* Test Send Simulation */}
            <div className="bg-slate-50 dark:bg-slate-800/80 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 mt-3 space-y-2">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                {t('SMS গেটওয়ে টেস্ট প্রেরণ:', 'SMS Gateway Test Dispatch:')}
              </span>
              <div className="flex gap-2">
                <input
                  type="tel"
                  placeholder="01712345678"
                  value={testPhone}
                  onChange={e => setTestPhone(e.target.value)}
                  className="w-44 p-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
                <button
                  type="button"
                  onClick={handleSendTestSMS}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-bold transition flex items-center space-x-1"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{t('টেস্ট পাঠান', 'Test Send')}</span>
                </button>
              </div>
              {testSmsStatus && (
                <p className="text-xs text-emerald-800 dark:text-emerald-400 font-medium">{testSmsStatus}</p>
              )}
            </div>
          </div>
        </div>

        {/* (iii) Cloud Sync, Google Account & Log-out */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4 transition-colors">
          <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center space-x-2 pb-2 border-b border-slate-100 dark:border-slate-800">
            <ShieldCheck className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />
            <span>{t('ক্লাউড ব্যাকআপ ও ফায়ারবেস ডেটাবেজ স্ট্যাটাস', 'Cloud Backup & Account')}</span>
          </h3>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
            <div>
              <p className="font-bold text-slate-800 dark:text-slate-200">
                {t('বর্তমান অবস্থা: ', 'Current Status: ')} 
                {isDemoUser ? t('ডেমো অফলাইন মোড (লোকাল স্টোরেজ)', 'Demo Mode (Local Storage)') : t('ফায়ারবেস ক্লাউড ডেটাবেজে লাইভ সিঙ্ক', 'Firebase Cloud Live Sync')}
              </p>
              <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                {isDemoUser
                  ? t('গুগল অ্যাকাউন্ট দিয়ে সাইন ইন করলে একাধিক মোবাইল বা কম্পিউটার থেকে একই সাথে ডাটা সিঙ্ক থাকবে।', 'Sign in with Google to sync live across devices.')
                  : `${t('লগইন ব্যবহারকারী: ', 'Logged in as: ')} ${currentUser?.displayName || currentUser?.email}`}
              </p>
            </div>

            <div className="flex items-center space-x-2">
              {isDemoUser ? (
                <button
                  type="button"
                  onClick={signInWithGoogle}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl transition flex items-center space-x-1.5"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>{t('গুগল দিয়ে সাইন ইন', 'Sign in with Google')}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={signOut}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl transition flex items-center space-x-1.5"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>{t('লগ-আউট (Logout)', 'Logout')}</span>
                </button>
              )}

              <button
                type="button"
                onClick={resetSampleData}
                className="px-3.5 py-2 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800 font-bold rounded-xl transition flex items-center space-x-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{t('ডেমো রিসেট', 'Reset Demo')}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            className="px-6 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-emerald-950 font-black text-sm shadow-md transition flex items-center space-x-2 active:scale-95"
          >
            <Save className="w-4 h-4" />
            <span>{t('সকল সেটিংস সংরক্ষণ করুন', 'Save All Settings')}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
