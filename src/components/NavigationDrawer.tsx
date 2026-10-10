import React from 'react';
import { 
  X, 
  Settings as SettingsIcon, 
  Sun, 
  Moon, 
  LogOut, 
  LogIn, 
  Globe, 
  User as UserIcon, 
  ShieldCheck, 
  Wheat, 
  LayoutDashboard, 
  ShoppingBag, 
  Truck, 
  Warehouse, 
  BookOpen, 
  Sprout,
  SlidersHorizontal 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useThemeLanguage } from '../context/ThemeLanguageContext';
import { useData } from '../context/DataContext';
import { ActiveTab } from '../types';

interface NavigationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSettings: () => void;
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
}

export const NavigationDrawer: React.FC<NavigationDrawerProps> = ({
  isOpen,
  onClose,
  onOpenSettings,
  activeTab,
  setActiveTab,
}) => {
  const { currentUser, isDemoUser, signInWithGoogle, signOut } = useAuth();
  const { theme, toggleTheme, language, setLanguage, t } = useThemeLanguage();
  const { settings, updateSettings } = useData();

  if (!isOpen) return null;

  const handleNavClick = (tab: ActiveTab) => {
    setActiveTab(tab);
    onClose();
  };

  const handleSettingsClick = () => {
    onOpenSettings();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div 
        onClick={onClose}
        className="fixed inset-0 bg-black/80 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
      />

      {/* Drawer Panel */}
      <div className="fixed inset-y-0 left-0 max-w-full flex pr-10">
        <div className="w-screen max-w-sm bg-emerald-950 text-slate-100 shadow-2xl border-r border-emerald-800/80 flex flex-col justify-between overflow-y-auto animate-in slide-in-from-left duration-300">
          
          {/* Header */}
          <div className="bg-emerald-900/90 text-white p-5 flex items-center justify-between border-b border-emerald-800/80">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-amber-400 text-emerald-950 flex items-center justify-center font-black">
                <Wheat className="w-6 h-6 text-emerald-900" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-white">
                  {settings.businessName || 'ধানের আড়ত ম্যানেজমেন্ট v2.0'}
                </h3>
                <p className="text-xs text-emerald-300/80">
                  {settings.proprietor ? `প্রোঃ ${settings.proprietor}` : 'সেন্ট্রাল লেজার ও ক্যাশ সিস্টেম'}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-emerald-300 hover:text-white hover:bg-emerald-800 transition"
              title={t('বন্ধ করুন', 'Close')}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Drawer Body Options */}
          <div className="p-5 space-y-5 flex-1 text-slate-200 text-sm">
            
            {/* User Profile / Cloud Status Card */}
            <div className="bg-emerald-900/40 border border-emerald-800/70 rounded-2xl p-3.5 space-y-2">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-full bg-emerald-800 text-amber-300 flex items-center justify-center font-bold">
                  {isDemoUser ? <UserIcon className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5 text-emerald-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-white truncate">
                    {isDemoUser ? t('অফলাইন ডেমো মোড', 'Offline Demo Mode') : (currentUser?.displayName || currentUser?.email)}
                  </p>
                  <p className="text-xs text-emerald-300/80 truncate">
                    {isDemoUser ? t('লোকাল সেন্ট্রাল লেজার', 'Local Central Ledger') : currentUser?.email}
                  </p>
                </div>
              </div>
            </div>

            {/* 1. Settings (Custom Expense Category Management & Configurations) */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider block">
                {t('১. সেটিংস ও কনফিগারেশন', '1. Settings & Configuration')}
              </span>

              <button
                type="button"
                onClick={handleSettingsClick}
                className="w-full flex items-center justify-between p-3 rounded-2xl bg-emerald-900/50 border border-emerald-700/60 hover:bg-emerald-800/70 transition text-left cursor-pointer active:scale-98"
              >
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-xl bg-amber-400 text-emerald-950 font-black">
                    <SettingsIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-bold text-white text-sm">
                      {t('সেটিংস (Settings)', 'Settings')}
                    </p>
                    <p className="text-xs text-emerald-300/80">
                      {t('কাস্টম খরচ ক্যাটাগরি, আড়ত প্রোফাইল ও প্রিন্টার', 'Custom Expense, Profile & Printer')}
                    </p>
                  </div>
                </div>
                <span className="text-xs font-bold text-amber-300">
                  {t('যান ➔', 'Go ➔')}
                </span>
              </button>

              {/* ধান কেনা মেমো ফিল্ড সেটিংস (কাস্টমাইজেবল ফিল্ড অপশন) */}
              <div className="mt-3 p-3.5 rounded-2xl bg-emerald-900/60 border border-emerald-700/70 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-amber-300 flex items-center space-x-1.5 uppercase tracking-wider">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400" />
                    <span>{t('ধানের মেমো ফিল্ড সেটিংস', 'Memo Form Fields')}</span>
                  </span>
                  <span className="text-[10px] text-emerald-300/80 font-bold">
                    {t('ফিল্ড বাছাই', 'Select Fields')}
                  </span>
                </div>
                <p className="text-[11px] text-emerald-200/90 leading-tight">
                  {t('ধান কেনার মেমোতে কোন কোন অপশনাল ঘর থাকবে তা টিক দিন:', 'Check which optional fields to include in the purchase memo page:')}
                </p>
                
                <div className="space-y-1.5 pt-1">
                  {/* ১. বস্তার সংখ্যা */}
                  <label className="flex items-center justify-between p-2 rounded-xl bg-emerald-950/70 hover:bg-emerald-800/60 border border-emerald-800/80 cursor-pointer transition">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold text-slate-100">
                        {t('বস্তার সংখ্যা', 'Bags Count')}
                      </span>
                      {!settings.showMemoBags && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-900 text-emerald-300 font-semibold">
                          লুকানো
                        </span>
                      )}
                    </div>
                    <input
                      type="checkbox"
                      checked={!!settings.showMemoBags}
                      onChange={(e) => updateSettings({ showMemoBags: e.target.checked })}
                      className="w-4 h-4 rounded text-amber-400 focus:ring-amber-400 bg-emerald-900 border-emerald-700 cursor-pointer accent-amber-400"
                    />
                  </label>

                  {/* ২. লেবার খরচ */}
                  <label className="flex items-center justify-between p-2 rounded-xl bg-emerald-950/70 hover:bg-emerald-800/60 border border-emerald-800/80 cursor-pointer transition">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold text-slate-100">
                        {t('লেবার খরচ / কুলি', 'Labor Expense')}
                      </span>
                      {!settings.showMemoLabor && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-900 text-emerald-300 font-semibold">
                          লুকানো
                        </span>
                      )}
                    </div>
                    <input
                      type="checkbox"
                      checked={!!settings.showMemoLabor}
                      onChange={(e) => updateSettings({ showMemoLabor: e.target.checked })}
                      className="w-4 h-4 rounded text-amber-400 focus:ring-amber-400 bg-emerald-900 border-emerald-700 cursor-pointer accent-amber-400"
                    />
                  </label>

                  {/* ৩. চালতা ও অন্যান্য কর্তন */}
                  <label className="flex items-center justify-between p-2 rounded-xl bg-emerald-950/70 hover:bg-emerald-800/60 border border-emerald-800/80 cursor-pointer transition">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold text-slate-100">
                        {t('চালতা / অন্যান্য কর্তন', 'Chalta / Deductions')}
                      </span>
                      {!settings.showMemoDeductions && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-900 text-emerald-300 font-semibold">
                          লুকানো
                        </span>
                      )}
                    </div>
                    <input
                      type="checkbox"
                      checked={!!settings.showMemoDeductions}
                      onChange={(e) => updateSettings({ showMemoDeductions: e.target.checked })}
                      className="w-4 h-4 rounded text-amber-400 focus:ring-amber-400 bg-emerald-900 border-emerald-700 cursor-pointer accent-amber-400"
                    />
                  </label>

                  {/* ৪. নোটস ও মন্তব্য */}
                  <label className="flex items-center justify-between p-2 rounded-xl bg-emerald-950/70 hover:bg-emerald-800/60 border border-emerald-800/80 cursor-pointer transition">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold text-slate-100">
                        {t('নোটস ও মন্তব্য', 'Notes / Remarks')}
                      </span>
                      {!settings.showMemoNotes && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-900 text-emerald-300 font-semibold">
                          লুকানো
                        </span>
                      )}
                    </div>
                    <input
                      type="checkbox"
                      checked={!!settings.showMemoNotes}
                      onChange={(e) => updateSettings({ showMemoNotes: e.target.checked })}
                      className="w-4 h-4 rounded text-amber-400 focus:ring-amber-400 bg-emerald-900 border-emerald-700 cursor-pointer accent-amber-400"
                    />
                  </label>
                </div>
              </div>
            </div>

            {/* 2. Language Selection (বাংলা / English) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-emerald-400 uppercase tracking-wider">
                <span className="flex items-center space-x-1">
                  <Globe className="w-3.5 h-3.5 text-amber-300" />
                  <span>{t('২. ভাষা নির্বাচন (Language)', '2. Language Toggle')}</span>
                </span>
                <span className="text-xs font-bold text-amber-300">
                  {language === 'bn' ? 'বাংলা' : 'English'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setLanguage('bn')}
                  className={`flex items-center justify-center space-x-2 py-2 px-3 rounded-xl border text-xs font-bold transition cursor-pointer ${
                    language === 'bn'
                      ? 'bg-amber-400 text-emerald-950 border-amber-300 font-black shadow-md'
                      : 'border-emerald-800/80 bg-emerald-900/40 text-emerald-200 hover:bg-emerald-900/70'
                  }`}
                >
                  <span>🇧🇩 বাংলা</span>
                </button>

                <button
                  type="button"
                  onClick={() => setLanguage('en')}
                  className={`flex items-center justify-center space-x-2 py-2 px-3 rounded-xl border text-xs font-bold transition cursor-pointer ${
                    language === 'en'
                      ? 'bg-amber-400 text-emerald-950 border-amber-300 font-black shadow-md'
                      : 'border-emerald-800/80 bg-emerald-900/40 text-emerald-200 hover:bg-emerald-900/70'
                  }`}
                >
                  <span>🇬🇧 English</span>
                </button>
              </div>
            </div>

            {/* 3. Day / Night Mode (Dark Mode Theme Toggle) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-emerald-400 uppercase tracking-wider">
                <span>{t('৩. থিম (Day / Night Mode)', '3. Day / Night Theme')}</span>
                <span className="text-xs font-bold text-amber-300">
                  {theme === 'dark' ? t('ডিপ এমারেল্ড ডার্ক', 'Deep Emerald Dark') : t('লাইট মোড', 'Light Mode')}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => theme === 'light' && toggleTheme()}
                  className={`flex items-center justify-center space-x-2 py-2 px-3 rounded-xl border text-xs font-bold transition cursor-pointer ${
                    theme === 'dark'
                      ? 'bg-emerald-800 border-emerald-500 text-white shadow-md'
                      : 'border-emerald-800/80 bg-emerald-900/40 text-emerald-300 hover:bg-emerald-900/70'
                  }`}
                >
                  <Moon className="w-4 h-4 text-amber-300" />
                  <span>{t('ডার্ক (Night)', 'Dark (Night)')}</span>
                </button>

                <button
                  type="button"
                  onClick={() => theme === 'dark' && toggleTheme()}
                  className={`flex items-center justify-center space-x-2 py-2 px-3 rounded-xl border text-xs font-bold transition cursor-pointer ${
                    theme === 'light'
                      ? 'bg-amber-400 text-emerald-950 border-amber-300 font-black shadow-md'
                      : 'border-emerald-800/80 bg-emerald-900/40 text-emerald-300 hover:bg-emerald-900/70'
                  }`}
                >
                  <Sun className="w-4 h-4 text-amber-400" />
                  <span>{t('লাইট (Day)', 'Light (Day)')}</span>
                </button>
              </div>
            </div>

            {/* Module Navigation Links */}
            <div className="pt-2 border-t border-emerald-800/70 space-y-1">
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider block mb-2">
                {t('প্রধান মডিউলসমূহ', 'Modules')}
              </span>

              <button
                onClick={() => handleNavClick('dashboard')}
                className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-semibold ${
                  activeTab === 'dashboard' ? 'bg-amber-400 text-emerald-950 font-bold' : 'hover:bg-emerald-900/60 text-emerald-200'
                }`}
              >
                <LayoutDashboard className="w-4 h-4 text-amber-300" />
                <span>{t('১. ড্যাশবোর্ড (Dashboard)', 'Dashboard')}</span>
              </button>

              <button
                onClick={() => handleNavClick('purchase')}
                className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-semibold ${
                  activeTab === 'purchase' ? 'bg-amber-400 text-emerald-950 font-bold' : 'hover:bg-emerald-900/60 text-emerald-200'
                }`}
              >
                <ShoppingBag className="w-4 h-4 text-amber-300" />
                <span>{t('২. ধান কেনা (Paddy Purchase)', 'Paddy Purchase')}</span>
              </button>

              <button
                onClick={() => handleNavClick('sales')}
                className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-semibold ${
                  activeTab === 'sales' ? 'bg-amber-400 text-emerald-950 font-bold' : 'hover:bg-emerald-900/60 text-emerald-200'
                }`}
              >
                <Truck className="w-4 h-4 text-amber-300" />
                <span>{t('৩. বিক্রি ও চালানি (Sales & Delivery)', 'Sales & Delivery')}</span>
              </button>

              <button
                onClick={() => handleNavClick('stock')}
                className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-semibold ${
                  activeTab === 'stock' ? 'bg-amber-400 text-emerald-950 font-bold' : 'hover:bg-emerald-900/60 text-emerald-200'
                }`}
              >
                <Warehouse className="w-4 h-4 text-amber-300" />
                <span>{t('৪. গুদাম স্টক (Warehouse Stock)', 'Warehouse Stock')}</span>
              </button>

              <button
                onClick={() => handleNavClick('accounts')}
                className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-semibold ${
                  activeTab === 'accounts' ? 'bg-amber-400 text-emerald-950 font-bold' : 'hover:bg-emerald-900/60 text-emerald-200'
                }`}
              >
                <BookOpen className="w-4 h-4 text-amber-300" />
                <span>{t('৫. খতিয়ান ও হিসাব (Khotiyan & Accounts)', 'Khotiyan & Accounts')}</span>
              </button>

              <button
                onClick={() => handleNavClick('rewards')}
                className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-semibold ${
                  activeTab === 'rewards' ? 'bg-amber-400 text-emerald-950 font-bold' : 'hover:bg-emerald-900/60 text-emerald-200'
                }`}
              >
                <Sprout className="w-4 h-4 text-amber-300" />
                <span>{t('৬. বিক্রেতা অফার (Seller Offers)', 'Seller Offers')}</span>
              </button>
            </div>
          </div>

          {/* 4. Footer Log-out / Log-in */}
          <div className="p-4 bg-emerald-900/60 border-t border-emerald-800/80">
            {isDemoUser ? (
              <button
                type="button"
                onClick={() => {
                  signInWithGoogle();
                  onClose();
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-emerald-950 font-black text-xs shadow-md transition flex items-center justify-center space-x-2 active:scale-95"
              >
                <LogIn className="w-4 h-4" />
                <span>{t('গুগল সাইন ইন (Cloud Sync)', 'Sign In with Google')}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  signOut();
                  onClose();
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow transition flex items-center justify-center space-x-2 active:scale-95"
              >
                <LogOut className="w-4 h-4" />
                <span>{t('লগ-আউট (Logout)', 'Logout Securely')}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
