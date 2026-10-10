import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  ShoppingBag, 
  Truck, 
  Warehouse, 
  BookOpen, 
  Sprout, 
  Wheat,
  Menu,
  Coins,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { ActiveTab } from '../types';
import { useData } from '../context/DataContext';
import { useThemeLanguage } from '../context/ThemeLanguageContext';
import { NavigationDrawer } from './NavigationDrawer';
import { formatCurrency } from '../utils/weight';

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  onOpenQuickPurchase: () => void;
  onOpenQuickSale: () => void;
  onOpenDailySummary?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
}) => {
  const { settings, totalPurchasedAmount, totalPaidAmount, totalCurrentDue, cashInHand } = useData();
  const { language, setLanguage, t } = useThemeLanguage();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Strict Navigation Order (Requirement 3) with Individual Premium Styles & Animations
  const navItems: { 
    id: ActiveTab; 
    label: string; 
    enLabel: string; 
    icon: React.ComponentType<{ className?: string }>;
    accentBg: string;
    accentColor: string;
    iconAnimClass: string;
    hoverBorder: string;
  }[] = [
    { 
      id: 'dashboard', 
      label: 'ড্যাশবোর্ড', 
      enLabel: 'Dashboard', 
      icon: LayoutDashboard,
      accentBg: 'bg-indigo-100 dark:bg-indigo-950/80',
      accentColor: 'text-indigo-600 dark:text-indigo-400',
      iconAnimClass: 'group-hover:rotate-12 group-hover:scale-120',
      hoverBorder: 'hover:border-indigo-400 dark:hover:border-indigo-500 hover:shadow-indigo-500/20'
    },
    { 
      id: 'purchase', 
      label: 'ধান কেনা', 
      enLabel: 'Paddy Purchase', 
      icon: ShoppingBag,
      accentBg: 'bg-emerald-100 dark:bg-emerald-950/80',
      accentColor: 'text-emerald-600 dark:text-emerald-400',
      iconAnimClass: 'group-hover:-translate-y-1 group-hover:scale-120',
      hoverBorder: 'hover:border-emerald-400 dark:hover:border-emerald-500 hover:shadow-emerald-500/20'
    },
    { 
      id: 'sales', 
      label: 'বিক্রি ও চালানি', 
      enLabel: 'Sales & Delivery', 
      icon: Truck,
      accentBg: 'bg-blue-100 dark:bg-blue-950/80',
      accentColor: 'text-blue-600 dark:text-blue-400',
      iconAnimClass: 'group-hover:translate-x-1.5 group-hover:scale-115',
      hoverBorder: 'hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-blue-500/20'
    },
    { 
      id: 'stock', 
      label: 'গুদাম স্টক', 
      enLabel: 'Warehouse Stock', 
      icon: Warehouse,
      accentBg: 'bg-teal-100 dark:bg-teal-950/80',
      accentColor: 'text-teal-600 dark:text-teal-400',
      iconAnimClass: 'group-hover:scale-125 group-hover:-rotate-6',
      hoverBorder: 'hover:border-teal-400 dark:hover:border-teal-500 hover:shadow-teal-500/20'
    },
    { 
      id: 'varieties', 
      label: 'ধানের জাত', 
      enLabel: 'Paddy Varieties', 
      icon: Wheat,
      accentBg: 'bg-amber-100 dark:bg-amber-950/80',
      accentColor: 'text-amber-600 dark:text-amber-400',
      iconAnimClass: 'group-hover:rotate-[-18deg] group-hover:scale-125',
      hoverBorder: 'hover:border-amber-400 dark:hover:border-amber-500 hover:shadow-amber-500/20'
    },
    { 
      id: 'accounts', 
      label: 'খতিয়ান ও হিসাব', 
      enLabel: 'Khotiyan & Accounts', 
      icon: BookOpen,
      accentBg: 'bg-violet-100 dark:bg-violet-950/80',
      accentColor: 'text-violet-600 dark:text-violet-400',
      iconAnimClass: 'group-hover:scale-125 group-hover:rotate-6',
      hoverBorder: 'hover:border-violet-400 dark:hover:border-violet-500 hover:shadow-violet-500/20'
    },
    { 
      id: 'rewards', 
      label: 'বিক্রেতা অফার', 
      enLabel: 'Seller Offers', 
      icon: Sprout,
      accentBg: 'bg-rose-100 dark:bg-rose-950/80',
      accentColor: 'text-rose-600 dark:text-rose-400',
      iconAnimClass: 'group-hover:scale-125 group-hover:-translate-y-1',
      hoverBorder: 'hover:border-rose-400 dark:hover:border-rose-500 hover:shadow-rose-500/20'
    },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md text-slate-900 dark:text-white shadow-xs border-b border-slate-200/90 dark:border-slate-800 transition-colors">
        {/* Top Header Bar */}
        <div className="w-full px-4 lg:px-6">
          <div className="flex items-center justify-between h-16 gap-3">
            
            {/* Left: 3-Line Hamburger Menu & Logo */}
            <div className="flex items-center space-x-2.5 sm:space-x-3 shrink-0">
              {/* 3-Line Hamburger Menu (≡) placed in Top Bar */}
              <button
                type="button"
                onClick={() => setIsDrawerOpen(true)}
                className="p-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-amber-300 border-2 border-slate-200 dark:border-slate-700 transition shadow-xs flex items-center justify-center active:scale-95 cursor-pointer group"
                title={t('মেনু ও সেটিংস (≡)', 'Menu & Settings (≡)')}
                aria-label="Open Navigation Drawer"
              >
                <Menu className="w-5 h-5 sm:w-6 sm:h-6 text-slate-700 dark:text-amber-300 group-hover:scale-110 transition-transform" />
              </button>

              {/* Logo & Business Brand */}
              <div 
                className="flex items-center space-x-2.5 cursor-pointer select-none group" 
                onClick={() => setActiveTab('dashboard')}
              >
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-400 via-amber-300 to-emerald-400 flex items-center justify-center text-slate-950 shadow-md font-black text-xl group-hover:scale-105 group-hover:rotate-3 transition-transform">
                  <Wheat className="w-6 h-6 text-slate-950" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h1 className="font-extrabold text-base sm:text-lg tracking-tight leading-tight text-slate-900 dark:text-white truncate max-w-[150px] sm:max-w-none group-hover:text-amber-600 dark:group-hover:text-amber-300 transition-colors">
                      {settings.businessName || 'ধানের আড়ত ম্যানেজমেন্ট v2.0'}
                    </h1>
                    <span className="hidden lg:inline-block px-2 py-0.5 text-[10px] font-black bg-amber-400 text-slate-950 rounded-md tracking-wider shadow-2xs">
                      v2.0
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate hidden sm:block">
                    {settings.proprietor ? `প্রোঃ ${settings.proprietor}` : 'সেন্ট্রাল লেজার ও ক্যাশ ফ্লো'} • {settings.phone}
                  </p>
                </div>
              </div>
            </div>

            {/* Dynamic Header Summary Bar (4 Aesthetic Mini-Metric Capsules) */}
            <div className="hidden lg:flex items-center gap-2 xl:gap-2.5">
              {/* Capsule 1: হাতে নগদ (Cash in Hand) */}
              <div className="flex items-center space-x-2 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent dark:from-amber-950/40 dark:to-slate-900/90 px-3 py-1.5 rounded-2xl border-2 border-amber-300/70 dark:border-amber-700/60 shadow-xs hover:-translate-y-0.5 hover:shadow-md hover:border-amber-400 transition-all duration-200 group cursor-default">
                <div className="w-7 h-7 rounded-xl bg-amber-100 dark:bg-amber-900/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 shadow-2xs group-hover:rotate-12 transition-transform">
                  <Coins className="w-3.5 h-3.5" />
                </div>
                <div className="leading-tight">
                  <span className="text-[9px] font-black text-amber-800/80 dark:text-amber-300/80 uppercase tracking-wider block">
                    {t('হাতে নগদ', 'Cash in Hand')}
                  </span>
                  <span className="text-xs font-black text-amber-700 dark:text-amber-300 tracking-tight block">
                    {formatCurrency(cashInHand)}
                  </span>
                </div>
              </div>

              {/* Capsule 2: মোট কেনা টাকা (Total Purchased) */}
              <div className="flex items-center space-x-2 bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-transparent dark:from-blue-950/40 dark:to-slate-900/90 px-3 py-1.5 rounded-2xl border-2 border-blue-300/70 dark:border-blue-700/60 shadow-xs hover:-translate-y-0.5 hover:shadow-md hover:border-blue-400 transition-all duration-200 group cursor-default">
                <div className="w-7 h-7 rounded-xl bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 shadow-2xs group-hover:-translate-y-0.5 transition-transform">
                  <ShoppingBag className="w-3.5 h-3.5" />
                </div>
                <div className="leading-tight">
                  <span className="text-[9px] font-black text-blue-800/80 dark:text-blue-300/80 uppercase tracking-wider block">
                    {t('মোট কেনা টাকা', 'Total Purchased')}
                  </span>
                  <span className="text-xs font-black text-slate-900 dark:text-white tracking-tight block">
                    {formatCurrency(totalPurchasedAmount)}
                  </span>
                </div>
              </div>

              {/* Capsule 3: মোট পরিশোধ (Total Paid) */}
              <div className="flex items-center space-x-2 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent dark:from-emerald-950/40 dark:to-slate-900/90 px-3 py-1.5 rounded-2xl border-2 border-emerald-300/70 dark:border-emerald-700/60 shadow-xs hover:-translate-y-0.5 hover:shadow-md hover:border-emerald-400 transition-all duration-200 group cursor-default">
                <div className="w-7 h-7 rounded-xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-115 transition-transform">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
                <div className="leading-tight">
                  <span className="text-[9px] font-black text-emerald-800/80 dark:text-emerald-300/80 uppercase tracking-wider block">
                    {t('মোট পরিশোধ', 'Total Paid')}
                  </span>
                  <span className="text-xs font-black text-emerald-700 dark:text-emerald-400 tracking-tight block">
                    {formatCurrency(totalPaidAmount)}
                  </span>
                </div>
              </div>

              {/* Capsule 4: বর্তমান মোট বকেয়া (Total Due) */}
              <div className="flex items-center space-x-2 bg-gradient-to-br from-rose-500/10 via-rose-500/5 to-transparent dark:from-rose-950/40 dark:to-slate-900/90 px-3 py-1.5 rounded-2xl border-2 border-rose-300/70 dark:border-rose-700/60 shadow-xs hover:-translate-y-0.5 hover:shadow-md hover:border-rose-400 transition-all duration-200 group cursor-default">
                <div className="w-7 h-7 rounded-xl bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 shadow-2xs group-hover:rotate-12 transition-transform">
                  <AlertCircle className="w-3.5 h-3.5" />
                </div>
                <div className="leading-tight">
                  <span className="text-[9px] font-black text-rose-800/80 dark:text-rose-300/80 uppercase tracking-wider block">
                    {t('বর্তমান মোট বকেয়া', 'Total Due')}
                  </span>
                  <span className="text-xs font-black text-rose-600 dark:text-rose-400 tracking-tight block">
                    {formatCurrency(totalCurrentDue)}
                  </span>
                </div>
              </div>
            </div>

            {/* Right Spacer (Balanced Alignment) */}
            <div className="hidden sm:block shrink-0 w-2" />
          </div>
        </div>

        {/* Dynamic Summary Bar for Mobile / Small Screens */}
        <div className="lg:hidden bg-slate-100 dark:bg-slate-900 px-3 py-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px] font-bold text-slate-700 dark:text-slate-300">
          <div>
            <span className="text-slate-500 dark:text-slate-400 font-normal">নগদ: </span>
            <span className="text-amber-600 dark:text-amber-300">{formatCurrency(cashInHand)}</span>
          </div>
          <div>
            <span className="text-slate-500 dark:text-slate-400 font-normal">কেনা: </span>
            <span className="text-slate-900 dark:text-white">{formatCurrency(totalPurchasedAmount)}</span>
          </div>
          <div>
            <span className="text-slate-500 dark:text-slate-400 font-normal">পরিশোধ: </span>
            <span className="text-emerald-700 dark:text-emerald-400">{formatCurrency(totalPaidAmount)}</span>
          </div>
          <div>
            <span className="text-rose-600 dark:text-rose-400 font-normal">বকেয়া: </span>
            <span className="text-rose-600 dark:text-rose-400">{formatCurrency(totalCurrentDue)}</span>
          </div>
        </div>

        {/* Primary Desktop/Mobile Navigation Bar Tabs (Strict Order 1-7 with Individual Premium Styling & Animations) */}
        <nav className="bg-slate-50/70 dark:bg-slate-900/90 border-t border-slate-200/90 dark:border-slate-800/90 overflow-x-auto scrollbar-none py-1.5">
          <div className="w-full px-4 lg:px-6">
            <div className="flex items-center gap-2 sm:gap-2.5 py-1">
              {navItems.map(item => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveTab(item.id)}
                    className={`group relative flex items-center space-x-2 px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all duration-300 ease-out whitespace-nowrap cursor-pointer active:scale-95 ${
                      isActive
                        ? 'bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 text-slate-950 font-black shadow-md shadow-amber-400/30 border-2 border-amber-300 ring-2 ring-amber-400/50 scale-[1.02]'
                        : `bg-white dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 border-2 border-slate-200/90 dark:border-slate-700/80 shadow-xs hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white hover:-translate-y-1 hover:shadow-md ${item.hoverBorder}`
                    }`}
                  >
                    <span className={`p-1 rounded-xl transition-all duration-300 ${
                      isActive 
                        ? 'bg-slate-950/15 text-slate-950 scale-105' 
                        : `${item.accentBg} ${item.accentColor} ${item.iconAnimClass}`
                    }`}>
                      <Icon className="w-4 h-4" />
                    </span>
                    <span className="tracking-tight">{t(item.label, item.enLabel)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </nav>
      </header>

      {/* Navigation Drawer (Contains Settings exclusively) */}
      <NavigationDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onOpenSettings={() => {
          setActiveTab('settings');
          setIsDrawerOpen(false);
        }}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />
    </>
  );
};
