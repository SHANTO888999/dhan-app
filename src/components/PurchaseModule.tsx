import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  PlusCircle, 
  Search, 
  Printer, 
  Trash2, 
  Scale, 
  User, 
  Phone, 
  MapPin, 
  Building2, 
  ShoppingBag, 
  CheckCircle, 
  MoreVertical, 
  Eye, 
  Truck,
  FileText,
  Calendar,
  X,
  Coins,
  Share2,
  TrendingUp,
  AlertCircle,
  AlertTriangle,
  Receipt,
  CheckCircle2,
  Clock,
  Sparkles,
  Sprout,
  MessageSquare,
  Send,
  Smartphone,
  SlidersHorizontal,
  ArrowUp
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { useThemeLanguage } from '../context/ThemeLanguageContext';
import { PurchaseMemo, Seller } from '../types';
import { calculateTotalMon, calculateTotalKg, calculateAmount, formatCurrency, toBengaliNumber } from '../utils/weight';
import { ConfirmationModal } from './ConfirmationModal';
import { playEntrySuccessSound, playPrintSound, playInputStepSound, playValidationErrorSound, playCashSound } from '../utils/sound';
import { printFullDocument } from '../utils/pdfExport';
import { printThermalReceipt } from '../utils/thermalPrinter';
import { sendGatewaySMS, getWhatsAppShareUrl, getDirectSMSUrl } from '../utils/sms';
import { getSellerMemberId, getSellerYear } from '../utils/sellerId';

interface PurchaseModuleProps {
  onViewReceipt: (type: 'purchase', item: PurchaseMemo) => void;
  openNewModalInitially?: boolean;
  onSwitchToSale?: () => void;
}

export const PurchaseModule: React.FC<PurchaseModuleProps> = ({
  onViewReceipt,
  openNewModalInitially = false,
  onSwitchToSale,
}) => {
  const { 
    purchases, 
    sellers, 
    parties,
    varieties, 
    payments,
    addPurchase, 
    deletePurchase, 
    addSeller, 
    deleteSeller,
    addVariety,
    getSellerStats,
    settings 
  } = useData();

  const { t } = useThemeLanguage();

  const [activeSubTab, setActiveSubTab] = useState<'memos' | 'sellers'>('memos');
  const [isEntryModalOpen, setIsEntryModalOpen] = useState(openNewModalInitially);
  const [isNewSellerModalOpen, setIsNewSellerModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterVariety, setFilterVariety] = useState('ALL');

  // Active 3-dot dropdown menu ID for memos & sellers
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [openSellerMenuId, setOpenSellerMenuId] = useState<string | null>(null);

  // Top Notification Toast Banner
  const [topNotification, setTopNotification] = useState<string | null>(null);

  // Statement SMS Dispatch state
  const [statementSmsSending, setStatementSmsSending] = useState(false);
  const [statementSmsResult, setStatementSmsResult] = useState<string | null>(null);

  // Floating Action Menu state (Solves clipped menu and table jumping / unwanted scrollbars)
  const [floatingMenu, setFloatingMenu] = useState<{
    type: 'memo' | 'seller';
    id: string;
    item: any;
    top?: number;
    bottom?: number;
    right: number;
  } | null>(null);

  useEffect(() => {
    if (!floatingMenu) return;
    const handleCloseMenu = () => setFloatingMenu(null);
    window.addEventListener('resize', handleCloseMenu);
    window.addEventListener('scroll', handleCloseMenu, true);
    return () => {
      window.removeEventListener('resize', handleCloseMenu);
      window.removeEventListener('scroll', handleCloseMenu, true);
    };
  }, [floatingMenu]);

  // Deletion Confirmation States
  const [deleteMemoTarget, setDeleteMemoTarget] = useState<PurchaseMemo | null>(null);
  const [deleteSellerTarget, setDeleteSellerTarget] = useState<Seller | null>(null);

  // History Modal on Double Click
  const [historyModalSeller, setHistoryModalSeller] = useState<{ id: string; name: string; phone: string; village?: string; memberId?: string } | null>(null);

  // Dedicated Print Statement Modal State (100% works across all browsers and iframes)
  const [printingSeller, setPrintingSeller] = useState<{ id: string; name: string; phone: string; village?: string; memberId?: string } | null>(null);

  // Thorough background scroll lock: locks document.body, documentElement and <main> so main page NEVER scrolls behind modal
  useEffect(() => {
    if (historyModalSeller || printingSeller || isEntryModalOpen || isNewSellerModalOpen) {
      const origBodyOverflow = document.body.style.overflow;
      const origHtmlOverflow = document.documentElement.style.overflow;
      const mainElem = document.querySelector('main');
      const origMainOverflow = mainElem ? mainElem.style.overflow : '';

      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
      if (mainElem) {
        mainElem.style.overflow = 'hidden';
      }

      return () => {
        document.body.style.overflow = origBodyOverflow;
        document.documentElement.style.overflow = origHtmlOverflow;
        if (mainElem) {
          mainElem.style.overflow = origMainOverflow;
        }
      };
    }
  }, [historyModalSeller, printingSeller, isEntryModalOpen, isNewSellerModalOpen]);

  // Futuristic Floating Scroll-to-Top State & Listeners
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const mainElem = document.querySelector('main');
      const scrollPos = Math.max(
        window.pageYOffset || document.documentElement.scrollTop || 0,
        mainElem?.scrollTop || 0
      );
      setShowScrollTop(scrollPos > 160);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    const mainElem = document.querySelector('main');
    if (mainElem) {
      mainElem.addEventListener('scroll', handleScroll, { passive: true });
    }

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (mainElem) {
        mainElem.removeEventListener('scroll', handleScroll);
      }
    };
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    document.documentElement.scrollTo({ top: 0, behavior: 'smooth' });
    const mainElem = document.querySelector('main');
    if (mainElem) {
      mainElem.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Form State: Seller Selection vs Direct Input
  const [sellerInputMode, setSellerInputMode] = useState<'select' | 'manual'>('select');
  const [selectedSellerId, setSelectedSellerId] = useState('');
  const [directSellerName, setDirectSellerName] = useState('');
  const [directSellerPhone, setDirectSellerPhone] = useState('');
  const [directSellerVillage, setDirectSellerVillage] = useState('');

  // Rice Variety: Dropdown + Custom Variety
  const [selectedVarietyId, setSelectedVarietyId] = useState('');
  const [isCustomVariety, setIsCustomVariety] = useState(false);
  const [customVarietyName, setCustomVarietyName] = useState('');

  // Quantity & Rates
  const [bags, setBags] = useState<number | ''>('');
  const [weightMon, setWeightMon] = useState<number | ''>('');
  const [weightKg, setWeightKg] = useState<number | ''>('');
  const [ratePerMon, setRatePerMon] = useState<number | ''>('');
  const [deductions, setDeductions] = useState<number | ''>('');
  const [laborCost, setLaborCost] = useState<number | ''>('');
  const [instantPayment, setInstantPayment] = useState<number | ''>('');

  // Interactive Form Navigation & Gentle Red Ambient Glow States
  const [isShaking, setIsShaking] = useState(false);
  const [showRedAmbientGlow, setShowRedAmbientGlow] = useState(false);
  const [fieldErrorMsg, setFieldErrorMsg] = useState<{ field: string; message: string } | null>(null);

  // Custom Seller Selector Dropdown with Distinct Name Color State
  const [isSellerDropdownOpen, setIsSellerDropdownOpen] = useState(false);
  const [sellerSearchQuery, setSellerSearchQuery] = useState('');
  const sellerDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleDocClick = (e: MouseEvent) => {
      if (sellerDropdownRef.current && !sellerDropdownRef.current.contains(e.target as Node)) {
        setIsSellerDropdownOpen(false);
      }
    };
    if (isSellerDropdownOpen) {
      document.addEventListener('mousedown', handleDocClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleDocClick);
    };
  }, [isSellerDropdownOpen]);

  // Field Refs for Auto-Advance on Enter Key
  const sellerSelectRef = useRef<HTMLSelectElement>(null);
  const directSellerNameRef = useRef<HTMLInputElement>(null);
  const directSellerPhoneRef = useRef<HTMLInputElement>(null);
  const directSellerVillageRef = useRef<HTMLInputElement>(null);
  const varietySelectRef = useRef<HTMLSelectElement>(null);
  const customVarietyRef = useRef<HTMLInputElement>(null);
  const rateRef = useRef<HTMLInputElement>(null);
  const weightMonRef = useRef<HTMLInputElement>(null);
  const weightKgRef = useRef<HTMLInputElement>(null);
  const bagsRef = useRef<HTMLInputElement>(null);
  const laborRef = useRef<HTMLInputElement>(null);
  const deductionsRef = useRef<HTMLInputElement>(null);
  const paymentRef = useRef<HTMLInputElement>(null);
  const notesRef = useRef<HTMLInputElement>(null);
  
  // Format today's local date & time
  const todayStr = useMemo(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }, []);

  const currentTimeStr = useMemo(() => {
    const d = new Date();
    return d.toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit', hour12: true });
  }, []);

  const nextInvoiceNumber = useMemo(() => {
    let maxNum = 1000 + purchases.length;
    purchases.forEach(p => {
      const match = (p.invoiceNumber || '').match(/\d+/);
      if (match) {
        const n = parseInt(match[0], 10);
        if (n > maxNum) maxNum = n;
      }
    });
    return `MEMO-${maxNum + 1}`;
  }, [purchases]);

  const [purchaseDate, setPurchaseDate] = useState(todayStr);
  const [purchaseTime, setPurchaseTime] = useState(() => {
    const d = new Date();
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  });
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // New Seller Registration Modal State
  const [newSellerName, setNewSellerName] = useState('');
  const [newSellerPhone, setNewSellerPhone] = useState('');
  const [newSellerVillage, setNewSellerVillage] = useState('');
  const [newSellerAddress, setNewSellerAddress] = useState('');

  // Strict 11-digit Bangladesh phone validation: 01[3-9]\d{8}
  const BD_PHONE_REGEX = /^01[3-9]\d{8}$/;

  // Computed Quantity & Bill
  const numMon = typeof weightMon === 'number' ? weightMon : 0;
  const numKg = typeof weightKg === 'number' ? weightKg : 0;
  const computedTotalMon = calculateTotalMon(numMon, numKg);
  const computedTotalKg = calculateTotalKg(numMon, numKg);
  const numRate = typeof ratePerMon === 'number' ? ratePerMon : 0;
  const numBags = typeof bags === 'number' ? bags : (numMon > 0 ? Math.round(numMon / 1.25) : 0);
  const numDeductions = typeof deductions === 'number' ? deductions : 0;
  const numLabor = typeof laborCost === 'number' ? laborCost : 0;
  const rawBill = calculateAmount(computedTotalMon, numRate);
  const computedTotalBill = Math.max(0, rawBill - numDeductions - numLabor);
  const numInstantPayment = typeof instantPayment === 'number' && instantPayment > 0 ? instantPayment : 0;
  const computedRemainingDue = Math.max(0, computedTotalBill - numInstantPayment);

  // Toggle Fixed Floating 3-Dot Action Menu
  const toggleActionMenu = (e: React.MouseEvent<HTMLButtonElement>, type: 'memo' | 'seller', item: any) => {
    e.stopPropagation();
    if (floatingMenu?.id === item.id) {
      setFloatingMenu(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUpward = spaceBelow < 220;

    setFloatingMenu({
      type,
      id: item.id,
      item,
      top: openUpward ? undefined : rect.bottom + 6,
      bottom: openUpward ? (window.innerHeight - rect.top + 6) : undefined,
      right: window.innerWidth - rect.right,
    });
  };

  // Active Selected Seller details for Live Memo
  const activeSellerDetails = useMemo(() => {
    if (sellerInputMode === 'manual') {
      return {
        name: directSellerName.trim() || 'বিক্রেতার নাম লিখুন',
        phone: directSellerPhone.trim() || 'ফোন নম্বর',
        village: directSellerVillage.trim() || 'গ্রাম উল্লেখ নেই'
      };
    }
    const found = sellers.find(s => s.id === selectedSellerId);
    return {
      name: found?.name || 'বিক্রেতা নির্বাচন করুন',
      phone: found?.phone || 'ফোন নেই',
      village: found?.village || 'গ্রাম'
    };
  }, [sellerInputMode, selectedSellerId, directSellerName, directSellerPhone, directSellerVillage, sellers]);

  const activeVarietyName = useMemo(() => {
    if (isCustomVariety || selectedVarietyId === 'CUSTOM') {
      return customVarietyName.trim() || 'কাস্টম জাত';
    }
    const found = varieties.find(v => v.id === selectedVarietyId);
    return found?.name || 'জাত নির্বাচন করুন';
  }, [isCustomVariety, selectedVarietyId, customVarietyName, varieties]);

  // =========================================================================
  // 1. LIVE LEDGER SYNCHRONIZATION (Khotiyan Linking)
  // Computes the real live paid & due balance for each memo, preserving each memo's direct cash payment
  // =========================================================================
  const memoKhotiyanBalances = useMemo(() => {
    const map = new Map<string, { allocatedPaid: number; remainingDue: number; isFullyPaid: boolean }>();
    
    // Group purchases by seller
    sellers.forEach(s => {
      const sMemos = purchases
        .filter(p => p.sellerId === s.id || (s.phone && p.sellerPhone === s.phone))
        .sort((a, b) => new Date(a.createdAt || a.date).getTime() - new Date(b.createdAt || b.date).getTime());
      
      const sPayments = payments.filter(
        pay => pay.sellerId === s.id || (s.phone && pay.note?.includes(s.phone)) || (pay as unknown as { entityId?: string }).entityId === s.id
      );

      // Sum of auto-generated instant payments recorded when creating each memo
      const sumDirectPayments = sMemos.reduce((sum, m) => sum + (m.instantPayment || m.paidAmount || 0), 0);
      const totalRecordedPayments = sPayments.reduce((sum, pay) => sum + (pay.amount || 0), 0);

      // Only extra/standalone ledger payments (beyond the memo's own instant cash) are distributed across open dues
      let extraAvailableCash = Math.max(0, totalRecordedPayments - sumDirectPayments);

      sMemos.forEach(m => {
        const total = m.totalBill || m.totalAmount || 0;
        const directPaid = m.instantPayment || m.paidAmount || 0;
        const initialDue = Math.max(0, total - directPaid);

        // Extra cash from Khotiyan further pays down remaining due
        const extraAllocated = Math.min(initialDue, extraAvailableCash);
        extraAvailableCash = Math.max(0, extraAvailableCash - extraAllocated);

        const finalPaid = directPaid + extraAllocated;
        const finalDue = Math.max(0, total - finalPaid);

        map.set(m.id, {
          allocatedPaid: finalPaid,
          remainingDue: finalDue,
          isFullyPaid: finalDue === 0
        });
      });
    });

    // Fallback for direct/unregistered sellers
    purchases.forEach(m => {
      if (!map.has(m.id)) {
        const total = m.totalBill || m.totalAmount || 0;
        const paid = m.instantPayment || m.paidAmount || 0;
        const due = Math.max(0, total - paid);
        map.set(m.id, {
          allocatedPaid: paid,
          remainingDue: due,
          isFullyPaid: due === 0
        });
      }
    });

    return map;
  }, [purchases, sellers, payments]);

  // TOP BAR 4 AESTHETIC METRIC CARDS (Calculated for Today's Purchases with Live Khotiyan Link)
  const todayPurchases = useMemo(() => {
    return purchases.filter(p => p.date === todayStr);
  }, [purchases, todayStr]);

  const todayTotalMon = useMemo(() => {
    return todayPurchases.reduce((acc, p) => acc + (p.totalMon || p.quantityMon || 0), 0);
  }, [todayPurchases]);

  const todayTotalBags = useMemo(() => {
    return todayPurchases.reduce((acc, p) => acc + (p.bags || 0), 0);
  }, [todayPurchases]);

  const todayTotalAmount = useMemo(() => {
    return todayPurchases.reduce((acc, p) => acc + (p.totalBill || p.totalAmount || 0), 0);
  }, [todayPurchases]);

  const todayPaidAmount = useMemo(() => {
    return todayPurchases.reduce((acc, p) => {
      const live = memoKhotiyanBalances.get(p.id);
      return acc + (live ? live.allocatedPaid : (p.instantPayment || p.paidAmount || 0));
    }, 0);
  }, [todayPurchases, memoKhotiyanBalances]);

  const todayDueAmount = useMemo(() => {
    return todayPurchases.reduce((acc, p) => {
      const live = memoKhotiyanBalances.get(p.id);
      return acc + (live ? live.remainingDue : Math.max(0, (p.totalBill || 0) - (p.instantPayment || 0)));
    }, 0);
  }, [todayPurchases, memoKhotiyanBalances]);

  const todayAvgRate = useMemo(() => {
    return todayTotalMon > 0 ? Math.round(todayTotalAmount / todayTotalMon) : 0;
  }, [todayTotalAmount, todayTotalMon]);

  const todayDueSellersCount = useMemo(() => {
    const dueSellers = new Set(
      todayPurchases
        .filter(p => {
          const live = memoKhotiyanBalances.get(p.id);
          const due = live ? live.remainingDue : Math.max(0, (p.totalBill || 0) - (p.instantPayment || 0));
          return due > 0;
        })
        .map(p => p.sellerId || p.sellerName)
    );
    return dueSellers.size;
  }, [todayPurchases, memoKhotiyanBalances]);

  // All-time Total Outstanding Due Balance across all purchases & sellers
  const totalAllTimeDueAmount = useMemo(() => {
    return purchases.reduce((acc, p) => {
      const live = memoKhotiyanBalances.get(p.id);
      return acc + (live ? live.remainingDue : Math.max(0, (p.totalBill || 0) - (p.instantPayment || 0)));
    }, 0);
  }, [purchases, memoKhotiyanBalances]);

  const totalAllTimeDueSellersCount = useMemo(() => {
    const dueSellers = new Set(
      purchases
        .filter(p => {
          const live = memoKhotiyanBalances.get(p.id);
          const due = live ? live.remainingDue : Math.max(0, (p.totalBill || 0) - (p.instantPayment || 0));
          return due > 0;
        })
        .map(p => p.sellerId || p.sellerName)
    );
    return dueSellers.size;
  }, [purchases, memoKhotiyanBalances]);

  // Reset form clean on opening
  const resetPurchaseForm = () => {
    setSellerInputMode('select');
    setSelectedSellerId('');
    setDirectSellerName('');
    setDirectSellerPhone('');
    setDirectSellerVillage('');
    setSelectedVarietyId('');
    setIsCustomVariety(false);
    setCustomVarietyName('');
    setBags('');
    setWeightMon('');
    setWeightKg('');
    setRatePerMon('');
    setDeductions('');
    setLaborCost('');
    setInstantPayment('');
    setPurchaseDate(todayStr);
    setPurchaseTime(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }));
    setNotes('');
    setFieldErrorMsg(null);
    setIsSellerDropdownOpen(false);
    setSellerSearchQuery('');
    setIsShaking(false);
    setShowRedAmbientGlow(false);
  };

  // Auto-fill rate when variety changes
  const handleVarietyChange = (varId: string) => {
    if (varId === 'CUSTOM') {
      setIsCustomVariety(true);
      setSelectedVarietyId('CUSTOM');
      return;
    }
    setIsCustomVariety(false);
    setSelectedVarietyId(varId);
    const target = varieties.find(v => v.id === varId);
    if (target && target.defaultPurchaseRate) {
      setRatePerMon(target.defaultPurchaseRate);
    }
  };

  // Validation Error Trigger with gentle screen shake, soft red vignette glow & audio cue
  const triggerValidationError = (field: string, message: string, inputElement?: HTMLElement | null) => {
    playValidationErrorSound();
    setIsShaking(true);
    setShowRedAmbientGlow(true);
    setFieldErrorMsg({ field, message });

    if (inputElement) {
      inputElement.focus();
      if ('select' in inputElement && typeof (inputElement as HTMLInputElement).select === 'function') {
        (inputElement as HTMLInputElement).select();
      }
    }

    setTimeout(() => setIsShaking(false), 450);
    setTimeout(() => setShowRedAmbientGlow(false), 850);
  };

  // Keyboard Navigation: Enter advances to next field smoothly, validates errors, doesn't block on optional fields
  const handleFieldKeyDown = (e: React.KeyboardEvent, fieldKey: string) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();

    switch (fieldKey) {
      case 'sellerSelect': {
        if (!selectedSellerId) {
          triggerValidationError('sellerSelect', 'অনুগ্রহ করে একজন বিক্রেতা নির্বাচন করুন', sellerSelectRef.current);
          return;
        }
        playInputStepSound();
        setFieldErrorMsg(null);
        varietySelectRef.current?.focus();
        break;
      }
      case 'directSellerName': {
        if (!directSellerName.trim()) {
          triggerValidationError('directSellerName', 'বিক্রেতার পুরো নাম লিখুন', directSellerNameRef.current);
          return;
        }
        playInputStepSound();
        setFieldErrorMsg(null);
        directSellerPhoneRef.current?.focus();
        break;
      }
      case 'directSellerPhone': {
        const cleanPhone = directSellerPhone.trim();
        if (!BD_PHONE_REGEX.test(cleanPhone)) {
          triggerValidationError('directSellerPhone', 'সঠিক ১১ সংখ্যার মোবাইল নম্বর লিখুন (যেমন: 01712345678)', directSellerPhoneRef.current);
          return;
        }
        playInputStepSound();
        setFieldErrorMsg(null);
        directSellerVillageRef.current?.focus();
        break;
      }
      case 'directSellerVillage': {
        // ঐচ্ছিক ফিল্ড - এন্টারে আটকাবে না
        playInputStepSound();
        setFieldErrorMsg(null);
        varietySelectRef.current?.focus();
        break;
      }
      case 'varietySelect': {
        if (!selectedVarietyId) {
          triggerValidationError('varietySelect', 'ধানের জাত নির্বাচন করুন', varietySelectRef.current);
          return;
        }
        if (selectedVarietyId === 'CUSTOM') {
          if (!customVarietyName.trim()) {
            triggerValidationError('customVariety', 'নতুন জাতের নাম লিখুন', customVarietyRef.current);
            return;
          }
        }
        playInputStepSound();
        setFieldErrorMsg(null);
        rateRef.current?.focus();
        break;
      }
      case 'customVariety': {
        if (!customVarietyName.trim()) {
          triggerValidationError('customVariety', 'নতুন জাতের নাম লিখুন', customVarietyRef.current);
          return;
        }
        playInputStepSound();
        setFieldErrorMsg(null);
        rateRef.current?.focus();
        break;
      }
      case 'rate': {
        const r = typeof ratePerMon === 'number' ? ratePerMon : 0;
        if (r <= 0) {
          triggerValidationError('rate', 'প্রতি মনের সঠিক দর লিখুন', rateRef.current);
          return;
        }
        playInputStepSound();
        setFieldErrorMsg(null);
        weightMonRef.current?.focus();
        break;
      }
      case 'weightMon': {
        const m = typeof weightMon === 'number' ? weightMon : 0;
        if (m <= 0) {
          triggerValidationError('weightMon', 'ধানের ওজন (মণ) লিখুন', weightMonRef.current);
          return;
        }
        playInputStepSound();
        setFieldErrorMsg(null);
        weightKgRef.current?.focus();
        break;
      }
      case 'weightKg': {
        // ঐচ্ছিক কেজি - এন্টারে আটকাবে না
        const k = typeof weightKg === 'number' ? weightKg : 0;
        if (k < 0 || k >= 40) {
          triggerValidationError('weightKg', 'কেজি ০ থেকে ৩৯ এর মধ্যে হতে হবে', weightKgRef.current);
          return;
        }
        playInputStepSound();
        setFieldErrorMsg(null);
        if (settings.showMemoBags) {
          bagsRef.current?.focus();
        } else if (settings.showMemoLabor) {
          laborRef.current?.focus();
        } else if (settings.showMemoDeductions) {
          deductionsRef.current?.focus();
        } else {
          paymentRef.current?.focus();
        }
        break;
      }
      case 'bags': {
        // ঐচ্ছিক বস্তা সংখ্যা - এন্টারে আটকাবে না
        playInputStepSound();
        setFieldErrorMsg(null);
        if (settings.showMemoLabor) {
          laborRef.current?.focus();
        } else if (settings.showMemoDeductions) {
          deductionsRef.current?.focus();
        } else {
          paymentRef.current?.focus();
        }
        break;
      }
      case 'labor': {
        // ঐচ্ছিক লেবার খরচ - এন্টারে আটকাবে না
        playInputStepSound();
        setFieldErrorMsg(null);
        if (settings.showMemoDeductions) {
          deductionsRef.current?.focus();
        } else {
          paymentRef.current?.focus();
        }
        break;
      }
      case 'deductions': {
        // ঐচ্ছিক কর্তন - এন্টারে আটকাবে না
        playInputStepSound();
        setFieldErrorMsg(null);
        paymentRef.current?.focus();
        break;
      }
      case 'payment': {
        // নগদ পরিশোধ - ঐচ্ছিক, এন্টারে আটকাবে না
        playInputStepSound();
        setFieldErrorMsg(null);
        if (settings.showMemoNotes) {
          notesRef.current?.focus();
        } else {
          handleSubmitPurchase(e as unknown as React.FormEvent, false);
        }
        break;
      }
      case 'notes': {
        // ঐচ্ছিক মন্তব্য - সাবমিট
        playInputStepSound();
        setFieldErrorMsg(null);
        handleSubmitPurchase(e as unknown as React.FormEvent, false);
        break;
      }
    }
  };

  const handleOpenPurchaseForSeller = (sellerId: string) => {
    resetPurchaseForm();
    setSelectedSellerId(sellerId);
    setIsEntryModalOpen(true);
  };

  // WhatsApp Share Trigger for Memo
  const handleShareMemoWhatsApp = (memo: PurchaseMemo) => {
    const sellerInfo = memo.sellerName ? `👤 বিক্রেতা: ${memo.sellerName} (${memo.sellerPhone || ''})` : '';
    const due = Math.max(0, (memo.totalBill || memo.totalAmount || 0) - (memo.instantPayment || memo.paidAmount || 0));
    const text = `🌾 *${settings.businessName || 'মেসার্স সোনার বাংলা ধান আড়ত'}*\n📄 *ক্রয় মেমো নং:* ${memo.invoiceNumber}\n📅 তারিখ: ${memo.date}\n${sellerInfo}\n🌾 ধানের জাত: ${memo.paddyType || memo.varietyName}\n⚖️ পরিমাণ: ${toBengaliNumber((memo.totalMon || memo.quantityMon || 0).toFixed(1))} মণ (${toBengaliNumber(memo.bags || 0)} বস্তা)\n💰 দর: ৳${toBengaliNumber(memo.ratePerMon)}/মণ\n💵 মোট বিল: ৳${toBengaliNumber(memo.totalBill || memo.totalAmount || 0)}\n💳 নগদ পরিশোধ: ৳${toBengaliNumber(memo.instantPayment || memo.paidAmount || 0)}\n⚠️ বাকি দেনা: ৳${toBengaliNumber(due)}\n${settings.invoiceFooterNote || 'ধন্যবাদ।'}`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  // Status Pill Helper (Synchronized with Khotiyan Payments)
  const getPaymentStatus = (memo: PurchaseMemo) => {
    const live = memoKhotiyanBalances.get(memo.id);
    const total = memo.totalBill || memo.totalAmount || 0;
    const paid = live ? live.allocatedPaid : (memo.instantPayment || memo.paidAmount || 0);
    const due = live ? live.remainingDue : Math.max(0, total - paid);

    if (total <= 0 || due <= 0) {
      return { label: '🟢 পরিশোধিত', pill: 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800' };
    }
    if (paid > 0) {
      return { label: '🟡 আংশিক পরিশোধ', pill: 'bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-300 border-amber-300 dark:border-amber-800' };
    }
    return { label: '🔴 বকেয়া', pill: 'bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-800' };
  };

  // Open Full Seller Statement & Khotiyan Print / Share Modal
  const handlePrintFullSellerStatement = (seller: { id: string; name: string; phone: string; village?: string; memberId?: string }) => {
    playPrintSound();
    setPrintingSeller(seller);
  };

  // Submit Purchase Memo
  const handleSubmitPurchase = async (e: React.FormEvent, printImmediately = false) => {
    e.preventDefault();

    let finalSellerId = selectedSellerId;
    let finalSellerName = '';
    let finalSellerPhone = '';
    let finalSellerVillage = '';

    if (sellerInputMode === 'manual') {
      const trimmedName = directSellerName.trim();
      const trimmedPhone = directSellerPhone.trim();
      const trimmedVillage = directSellerVillage.trim() || 'গ্রাম উল্লেখ নেই';

      if (!trimmedName) {
        alert(t('বিক্রেতার নাম লিখুন।', 'Please enter seller name.'));
        return;
      }

      if (!BD_PHONE_REGEX.test(trimmedPhone)) {
        alert(
          t(
            ' ১১ ডিজিটের  মোবাইল নম্বর দিন (যেমন: 01712345678)',
            ' enter  11-digit  mobile number (e.g. 01712345678)'
          )
        );
        return;
      }

      const existing = sellers.find(s => s.phone && s.phone.trim() === trimmedPhone);
      if (existing) {
        finalSellerId = existing.id;
        finalSellerName = existing.name;
        finalSellerPhone = existing.phone;
        finalSellerVillage = existing.village;
      } else {
        try {
          const newSid = await addSeller({
            name: trimmedName,
            phone: trimmedPhone,
            village: trimmedVillage,
            address: trimmedVillage,
          });
          finalSellerId = newSid;
          finalSellerName = trimmedName;
          finalSellerPhone = trimmedPhone;
          finalSellerVillage = trimmedVillage;
        } catch (err) {
          console.error('Failed to create seller:', err);
          alert(t('বিক্রেতার তথ্য সংরক্ষণ করা যায়নি।', 'Failed to register seller.'));
          return;
        }
      }
    } else {
      if (!selectedSellerId) {
        alert(t('দয়া করে বিক্রেতা নির্বাচন করুন।', 'Please select a seller.'));
        return;
      }
      const seller = sellers.find(s => s.id === selectedSellerId);
      finalSellerName = seller?.name || '';
      finalSellerPhone = seller?.phone || '';
      finalSellerVillage = seller?.village || '';
    }

    let finalVarietyId = selectedVarietyId;
    let finalVarietyName = '';

    if (isCustomVariety || selectedVarietyId === 'CUSTOM') {
      const trimmedVarName = customVarietyName.trim();
      if (!trimmedVarName) {
        alert(t('কাস্টম ধানের জাতের নাম লিখুন।', 'Please enter custom variety name.'));
        return;
      }
      const existingVar = varieties.find(v => v.name.toLowerCase() === trimmedVarName.toLowerCase());
      if (existingVar) {
        finalVarietyId = existingVar.id;
        finalVarietyName = existingVar.name;
      } else {
        try {
          const newVarId = await addVariety({
            name: trimmedVarName,
            code: trimmedVarName.slice(0, 3).toUpperCase(),
            defaultPurchaseRate: numRate,
            defaultSaleRate: numRate + 70,
            currentStockMon: 0,
            description: 'কাস্টম জাত',
          });
          finalVarietyId = newVarId;
          finalVarietyName = trimmedVarName;
        } catch {
          finalVarietyName = trimmedVarName;
        }
      }
    } else {
      if (!selectedVarietyId) {
        alert(t('দয়া করে ধানের জাত নির্বাচন করুন।', 'Please select a paddy variety.'));
        return;
      }
      const targetVar = varieties.find(v => v.id === selectedVarietyId);
      finalVarietyName = targetVar?.name || '';
    }

    if (computedTotalMon <= 0) {
      alert(t('সঠিক ধানের পরিমাণ (মণ/কেজি) লিখুন।', 'Please enter a valid weight in Mon/Kg.'));
      return;
    }

    if (numRate <= 0) {
      alert(t('প্রতি মনের সঠিক দর লিখুন।', 'Please enter rate per Mon.'));
      return;
    }

    setSubmitting(true);
    try {
      // Auto-capture current time at the exact moment of clicking purchase / saving memo
      const now = new Date();
      const autoCapturedTime = now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });

      const res = await addPurchase({
        sellerId: finalSellerId,
        sellerName: finalSellerName,
        sellerPhone: finalSellerPhone,
        sellerVillage: finalSellerVillage,
        varietyId: finalVarietyId,
        paddyType: finalVarietyName,
        quantityMon: computedTotalMon,
        weightMon: numMon,
        weightKg: numKg,
        bags: numBags,
        ratePerMon: numRate,
        totalBill: computedTotalBill,
        instantPayment: numInstantPayment,
        deductions: numDeductions,
        laborCost: numLabor,
        date: purchaseDate,
        time: autoCapturedTime,
        notes: (numDeductions > 0 || numLabor > 0)
          ? `${notes.trim() ? notes.trim() + ' | ' : ''}${numDeductions > 0 ? `কর্তন: ৳${numDeductions} ` : ''}${numLabor > 0 ? `লেবার: ৳${numLabor}` : ''}`.trim()
          : notes.trim(),
      });

      if (printImmediately && res.id) {
        const fullMemo: PurchaseMemo = {
          id: res.id,
          invoiceNumber: res.invoiceNumber,
          sellerId: finalSellerId,
          sellerName: finalSellerName,
          sellerPhone: finalSellerPhone,
          sellerVillage: finalSellerVillage,
          varietyId: finalVarietyId,
          paddyType: finalVarietyName,
          varietyName: finalVarietyName,
          quantityMon: computedTotalMon,
          weightMon: numMon,
          weightKg: numKg,
          bags: numBags,
          totalMon: computedTotalMon,
          ratePerMon: numRate,
          totalBill: computedTotalBill,
          totalAmount: computedTotalBill,
          instantPayment: numInstantPayment,
          paidAmount: numInstantPayment,
          dueAmount: computedRemainingDue,
          deductions: numDeductions,
          laborCost: numLabor,
          date: purchaseDate,
          time: autoCapturedTime,
          notes: notes.trim(),
          userId: '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        playPrintSound();
        onViewReceipt('purchase', fullMemo);
      }

      // Cash payment register chime or pleasant audio chime & top notification
      if (numInstantPayment > 0) {
        playCashSound();
      } else {
        playEntrySuccessSound();
      }
      setTopNotification(`✓ ধান ক্রয়ের মেমো #${res.invoiceNumber} সফলভাবে সংরক্ষিত হয়েছে!`);
      setTimeout(() => setTopNotification(null), 3800);

      resetPurchaseForm();
      setIsEntryModalOpen(false);
    } catch (err) {
      console.error('Purchase creation error:', err);
      alert(t('মেমো সংরক্ষণ করা সম্ভব হয়নি।', 'Failed to save memo.'));
    } finally {
      setSubmitting(false);
    }
  };

  // Submit New Seller Registration
  const handleRegisterSeller = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = newSellerName.trim();
    const trimmedPhone = newSellerPhone.trim();
    const trimmedVillage = newSellerVillage.trim();

    if (!trimmedName) {
      alert(t('বিক্রেতার নাম লিখুন', 'Please enter seller name'));
      return;
    }

    if (!BD_PHONE_REGEX.test(trimmedPhone)) {
      alert(t('সঠিক ১১ ডিজিটের মোবাইল নম্বর দিন (যেমন: 01712345678)', 'Please enter a valid 11-digit mobile number'));
      return;
    }

    const existing = sellers.find(s => s.phone && s.phone.trim() === trimmedPhone);
    if (existing) {
      alert(t('একই মোবাইল নম্বরের বিক্রেতা ইতিমধ্যে নিবন্ধিত রয়েছে!', 'A seller with this mobile number already exists!'));
      return;
    }

    try {
      await addSeller({
        name: trimmedName,
        phone: trimmedPhone,
        village: trimmedVillage || 'গ্রাম উল্লেখ নেই',
        address: newSellerAddress.trim() || trimmedVillage,
      });

      setNewSellerName('');
      setNewSellerPhone('');
      setNewSellerVillage('');
      setNewSellerAddress('');
      setIsNewSellerModalOpen(false);
    } catch (err) {
      console.error(err);
      alert(t('বিক্রেতা যোগ করা যায়নি', 'Failed to add seller'));
    }
  };

  // Filters & Sorting (Unpaid/Due at top, Paid at bottom, sorted newest first within groups)
  const filteredPurchases = useMemo(() => {
    const list = purchases.filter(p => {
      const matchSearch = 
        !searchTerm.trim() ||
        (p.invoiceNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.sellerName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.sellerPhone || '').includes(searchTerm) ||
        (p.sellerVillage || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.paddyType || p.varietyName || '').toLowerCase().includes(searchTerm.toLowerCase());

      const matchVariety = filterVariety === 'ALL' || p.varietyId === filterVariety || p.paddyType === filterVariety;
      return matchSearch && matchVariety;
    });

    return list.sort((a, b) => {
      const liveA = memoKhotiyanBalances.get(a.id);
      const liveB = memoKhotiyanBalances.get(b.id);
      const dueA = liveA ? liveA.remainingDue : Math.max(0, (a.totalBill || 0) - (a.instantPayment || 0));
      const dueB = liveB ? liveB.remainingDue : Math.max(0, (b.totalBill || 0) - (b.instantPayment || 0));
      
      const isPaidA = dueA <= 0 ? 1 : 0;
      const isPaidB = dueB <= 0 ? 1 : 0;
      
      // Unpaid (0) comes first, Paid (1) goes to bottom
      if (isPaidA !== isPaidB) {
        return isPaidA - isPaidB;
      }
      return new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime();
    });
  }, [purchases, searchTerm, filterVariety, memoKhotiyanBalances]);

  const filteredSellers = useMemo(() => {
    return sellers
      .filter(s => {
        if (!searchTerm.trim()) return true;
        const q = searchTerm.toLowerCase();
        const memberId = getSellerMemberId(s, sellers).toLowerCase();
        return (
          memberId.includes(q) ||
          s.name.toLowerCase().includes(q) ||
          s.phone.includes(q) ||
          (s.village && s.village.toLowerCase().includes(q)) ||
          (s.address && s.address.toLowerCase().includes(q))
        );
      })
      .sort((a, b) => {
        const statsA = getSellerStats(a.id);
        const statsB = getSellerStats(b.id);
        if (statsA.currentDue > 0 && statsB.currentDue <= 0) return -1;
        if (statsB.currentDue > 0 && statsA.currentDue <= 0) return 1;
        return new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime();
      });
  }, [sellers, searchTerm, getSellerStats]);

  return (
    <div className="space-y-3.5 sm:space-y-4 pb-16">

      {/* Top Floating Notification Toast on Successful Memo Entry */}
      {topNotification && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[100] bg-emerald-600 text-white font-black px-5 py-2.5 rounded-2xl shadow-2xl flex items-center space-x-2.5 border-2 border-emerald-400 animate-in slide-in-from-top-4 duration-300">
          <CheckCircle2 className="w-5 h-5 text-amber-300 shrink-0" />
          <span className="text-xs sm:text-sm">{topNotification}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. 4 SLIM & CRISP METRIC CARDS (No Wasted Space, Zero Verbose Text) */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
        {/* Card 1: ধান ক্রয় (Paddy Bought) */}
        <div className="group relative overflow-hidden bg-gradient-to-br from-indigo-500/15 via-purple-500/10 to-indigo-600/5 dark:from-indigo-950/70 dark:via-purple-950/40 dark:to-slate-900 border-2 border-indigo-300 dark:border-indigo-700/80 rounded-2xl p-3 sm:p-3.5 text-slate-900 dark:text-white shadow-md shadow-indigo-500/5 hover:shadow-indigo-500/20 hover:border-indigo-400 dark:hover:border-indigo-400 hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between min-h-[96px]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-indigo-700 dark:text-indigo-300 flex items-center space-x-1.5">
              <span className="p-1 rounded-lg bg-indigo-100 dark:bg-indigo-900/80 text-indigo-700 dark:text-indigo-300">
                <Scale className="w-3.5 h-3.5" />
              </span>
              <span>{t('ধান ক্রয়', 'Paddy Bought')}</span>
            </span>
            <span className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 border border-indigo-300 dark:border-indigo-700 shadow-2xs">
              {toBengaliNumber(todayPurchases.length)} মেমো
            </span>
          </div>

          <div className="mt-2 flex items-baseline space-x-1.5 flex-wrap">
            <div className="text-xl sm:text-2xl font-black text-indigo-950 dark:text-indigo-200 tracking-tight">
              {toBengaliNumber(todayTotalMon.toFixed(1))} মণ
            </div>
            <div className="text-xs font-bold text-slate-500 dark:text-slate-400">
              ({toBengaliNumber(todayTotalBags)} বস্তা)
            </div>
          </div>
        </div>

        {/* Card 2: ক্রয়মূল্য (Purchase Bill) */}
        <div className="group relative overflow-hidden bg-gradient-to-br from-emerald-500/15 via-teal-500/10 to-emerald-600/5 dark:from-emerald-950/70 dark:via-teal-950/40 dark:to-slate-900 border-2 border-emerald-300 dark:border-emerald-700/80 rounded-2xl p-3 sm:p-3.5 text-slate-900 dark:text-white shadow-md shadow-emerald-500/5 hover:shadow-emerald-500/20 hover:border-emerald-400 dark:hover:border-emerald-400 hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between min-h-[96px]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-emerald-800 dark:text-emerald-300 flex items-center space-x-1.5">
              <span className="p-1 rounded-lg bg-emerald-100 dark:bg-emerald-900/80 text-emerald-700 dark:text-emerald-300">
                <ShoppingBag className="w-3.5 h-3.5" />
              </span>
              <span>{t('ক্রয়মূল্য', 'Purchase Bill')}</span>
            </span>
            <span className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700 shadow-2xs">
              বিল
            </span>
          </div>

          <div className="mt-2 text-xl sm:text-2xl font-black text-emerald-950 dark:text-emerald-200 tracking-tight">
            {formatCurrency(todayTotalAmount)}
          </div>
        </div>

        {/* Card 3: নগদ পরিশোধ (Cash Paid) */}
        <div className="group relative overflow-hidden bg-gradient-to-br from-sky-500/15 via-blue-500/10 to-cyan-600/5 dark:from-blue-950/70 dark:via-sky-950/40 dark:to-slate-900 border-2 border-sky-300 dark:border-sky-700/80 rounded-2xl p-3 sm:p-3.5 text-slate-900 dark:text-white shadow-md shadow-sky-500/5 hover:shadow-sky-500/20 hover:border-sky-400 dark:hover:border-sky-400 hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between min-h-[96px]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-blue-800 dark:text-blue-300 flex items-center space-x-1.5">
              <span className="p-1 rounded-lg bg-blue-100 dark:bg-blue-900/80 text-blue-700 dark:text-blue-300">
                <Coins className="w-3.5 h-3.5" />
              </span>
              <span>{t('নগদ পরিশোধ', 'Cash Paid')}</span>
            </span>
            <span className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700 flex items-center space-x-1 shadow-2xs">
              <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600 inline" />
              <span>পরিশোধিত</span>
            </span>
          </div>

          <div className="mt-2 text-xl sm:text-2xl font-black text-blue-950 dark:text-blue-200 tracking-tight">
            {formatCurrency(todayPaidAmount)}
          </div>
        </div>

        {/* Card 4: মোট বকেয়া (Total Due) */}
        <div className={`group relative overflow-hidden border-2 rounded-2xl p-3 sm:p-3.5 text-slate-900 dark:text-white shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between min-h-[96px] ${
          totalAllTimeDueAmount > 0 
            ? 'bg-gradient-to-br from-rose-500/15 via-amber-500/10 to-rose-600/5 dark:from-rose-950/70 dark:via-amber-950/40 dark:to-slate-900 border-rose-300 dark:border-rose-700/80 shadow-rose-500/5 hover:border-rose-400' 
            : 'bg-gradient-to-br from-emerald-500/15 via-teal-500/10 to-emerald-600/5 dark:from-emerald-950/70 dark:via-teal-950/40 dark:to-slate-900 border-emerald-300 dark:border-emerald-700/80 shadow-emerald-500/5 hover:border-emerald-400'
        }`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-black flex items-center space-x-1.5 ${
              totalAllTimeDueAmount > 0 ? 'text-rose-800 dark:text-rose-300' : 'text-emerald-800 dark:text-emerald-300'
            }`}>
              <span className={`p-1 rounded-lg ${
                totalAllTimeDueAmount > 0 ? 'bg-rose-100 dark:bg-rose-900/80 text-rose-700 dark:text-rose-300' : 'bg-emerald-100 dark:bg-emerald-900/80 text-emerald-700 dark:text-emerald-300'
              }`}>
                {totalAllTimeDueAmount > 0 ? <AlertTriangle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
              </span>
              <span>{t('মোট বকেয়া', 'Total Due')}</span>
            </span>
            <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black border shadow-2xs ${
              totalAllTimeDueAmount > 0 
                ? 'bg-rose-100 dark:bg-rose-900 text-rose-800 dark:text-rose-200 border-rose-300 dark:border-rose-700' 
                : 'bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700'
            }`}>
              {totalAllTimeDueAmount > 0 ? `${toBengaliNumber(totalAllTimeDueSellersCount)} জন` : 'পরিশোধিত'}
            </span>
          </div>

          <div className={`mt-2 text-xl sm:text-2xl font-black tracking-tight ${
            totalAllTimeDueAmount > 0 ? 'text-rose-700 dark:text-rose-300' : 'text-emerald-700 dark:text-emerald-300'
          }`}>
            {formatCurrency(totalAllTimeDueAmount)}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. ULTRA-COMPACT UNIFIED TOOLBAR: TABS + SEARCH + VARIETY + ICON BUTTONS */}
      {/* ========================================================================= */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-white dark:bg-slate-900 p-2 sm:p-2.5 rounded-2xl border-2 border-slate-200 dark:border-slate-800 shadow-2xs">
        {/* Left: Tab Switcher (Paka Memo & Bikretar Talika) */}
        <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setActiveSubTab('memos')}
            className={`px-3 py-1.5 rounded-lg text-xs sm:text-[13px] font-black transition-all duration-200 flex items-center space-x-1.5 cursor-pointer active:scale-95 ${
              activeSubTab === 'memos'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-600/30'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700/60'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>{t('পাকা মেমো', 'Purchase Memos')}</span>
            <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-black ${
              activeSubTab === 'memos' ? 'bg-amber-400 text-slate-950 shadow-2xs' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
            }`}>
              {toBengaliNumber(purchases.length)}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('sellers')}
            className={`px-3 py-1.5 rounded-lg text-xs sm:text-[13px] font-black transition-all duration-200 flex items-center space-x-1.5 cursor-pointer active:scale-95 ${
              activeSubTab === 'sellers'
                ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700/60'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>{t('বিক্রেতার তালিকা', 'Sellers List')}</span>
            <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-black ${
              activeSubTab === 'sellers' ? 'bg-amber-400 text-slate-950 shadow-2xs' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
            }`}>
              {toBengaliNumber(sellers.length)}
            </span>
          </button>
        </div>

        {/* Center: Compact Search Bar & Variety Dropdown Side-by-Side */}
        <div className="flex items-center gap-1.5">
          <div className="relative w-36 sm:w-44">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-400" />
            <input
              type="text"
              placeholder={
                activeSubTab === 'memos'
                  ? t('খুঁজুন (মেমো, নাম)...', 'Search memo, name...')
                  : t('খুঁজুন (আইডি, নাম)...', 'Search ID, name...')
              }
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-7 pr-2.5 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <select
            value={filterVariety}
            onChange={e => setFilterVariety(e.target.value)}
            className="py-1.5 px-2 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer shadow-2xs shrink-0 max-w-[130px]"
          >
            <option value="ALL">{t('সকল জাত', 'All Varieties')}</option>
            {varieties.map(v => (
              <option key={v.id} value={v.id}>{v.name}</option>
            ))}
          </select>
        </div>

        {/* Far Right: ONLY Icon Buttons with + (No text!) */}
        <div className="flex items-center gap-1.5 shrink-0 ml-auto">
          {/* Button 1: Man Icon with + (New Seller) - No text */}
          <button
            type="button"
            onClick={() => setIsNewSellerModalOpen(true)}
            className="p-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black shadow-md hover:shadow-emerald-600/30 active:scale-90 transition-all cursor-pointer flex items-center justify-center space-x-0.5"
            title={t('নতুন বিক্রেতা নিবন্ধন (+)', 'Register New Seller (+)')}
          >
            <User className="w-4 h-4" />
            <span className="text-sm font-black leading-none">+</span>
          </button>

          {/* Button 2: Paddy/Sprout Icon with + (New Purchase) - No text */}
          <button
            type="button"
            onClick={() => {
              resetPurchaseForm();
              setIsEntryModalOpen(true);
            }}
            className="p-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-300 hover:from-amber-300 hover:to-amber-200 text-slate-950 font-black shadow-md hover:shadow-amber-500/30 active:scale-90 transition-all border border-amber-400 cursor-pointer flex items-center justify-center space-x-0.5"
            title={t('নতুন ধান ক্রয় এন্ট্রি (+)', 'New Paddy Purchase (+)')}
          >
            <Sprout className="w-4 h-4 text-slate-950" />
            <span className="text-sm font-black leading-none text-slate-950">+</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. ULTRA-PREMIUM PURCHASE TABLE & STATUS PILLS & HOVER ACTIONS */}
      {/* ========================================================================= */}
      {activeSubTab === 'memos' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border-2 border-slate-200 dark:border-slate-800 shadow-md overflow-hidden">
          <div className="overflow-x-auto p-2 sm:p-2.5 [scrollbar-gutter:stable]">
            <table className="w-full text-left border-separate border-spacing-y-2">
              <thead className="text-slate-700 dark:text-slate-300 font-black text-xs sm:text-[13px] uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-3 sm:px-4">{t('মেমো ও তারিখ', 'Invoice & Date')}</th>
                  <th className="py-2.5 px-3 sm:px-4">{t('বিক্রেতা ও গ্রাম', 'Seller & Village')}</th>
                  <th className="py-2.5 px-3 sm:px-4">{t('ধানের জাত', 'Variety')}</th>
                  <th className="py-2.5 px-3 sm:px-4 text-right">{t('ওজন ও বস্তা', 'Weight & Bags')}</th>
                  <th className="py-2.5 px-3 sm:px-4 text-right">{t('দর (মণ)', 'Rate')}</th>
                  <th className="py-2.5 px-3 sm:px-4 text-right">{t('মোট বিল', 'Total Bill')}</th>
                  <th className="py-2.5 px-3 sm:px-4 text-right">{t('নগদ পরিশোধ', 'Cash Paid')}</th>
                  <th className="py-2.5 px-3 sm:px-4 text-right">{t('বকেয়া দেনা', 'Due Balance')}</th>
                  <th className="py-2.5 px-3 sm:px-4 text-center">{t('অবস্থা', 'Status')}</th>
                  <th className="py-2.5 px-3 sm:px-4 text-center">{t('অ্যাকশন', 'Actions')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredPurchases.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-slate-400 font-bold text-sm bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700">
                      <ShoppingBag className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                      {t('কোনো ধান ক্রয়ের মেমো পাওয়া যায়নি।', 'No purchase memos found.')}
                    </td>
                  </tr>
                ) : (
                  filteredPurchases.map((p) => {
                    const liveBalance = memoKhotiyanBalances.get(p.id);
                    const total = p.totalBill || p.totalAmount || 0;
                    const paid = liveBalance ? liveBalance.allocatedPaid : (p.instantPayment || p.paidAmount || 0);
                    const due = liveBalance ? liveBalance.remainingDue : Math.max(0, total - paid);
                    const status = getPaymentStatus(p);
                    const isPaid = due <= 0;

                    return (
                      <tr 
                        key={p.id} 
                        onDoubleClick={() => setHistoryModalSeller({ id: p.sellerId, name: p.sellerName || 'বিক্রেতা', phone: p.sellerPhone || '', village: p.sellerVillage })}
                        title={t('ডাবল ক্লিক করে এই বিক্রেতার সকল লেনদেন ও খতিয়ান দেখুন', 'Double-click to view ledger')}
                        className={`group/row relative transition-all duration-200 ease-out cursor-pointer transform-gpu hover:-translate-y-1 hover:scale-[1.006] hover:shadow-xl hover:z-20 ${
                          isPaid
                            ? 'bg-slate-200/60 dark:bg-slate-950/80 text-slate-500 dark:text-slate-500 hover:bg-slate-300/70 dark:hover:bg-slate-900/90 shadow-2xs'
                            : 'bg-white dark:bg-slate-900 hover:bg-gradient-to-r hover:from-emerald-50/90 hover:via-white hover:to-emerald-50/90 dark:hover:from-slate-800 dark:hover:via-slate-800/95 dark:hover:to-slate-800 text-slate-900 dark:text-white shadow-xs hover:shadow-emerald-950/10'
                        }`}
                      >
                        {/* Invoice & Date/Time (Time clearly displayed under date) */}
                        <td 
                          className="py-3 px-3 sm:px-4 first:rounded-l-2xl border-y first:border-l border-slate-200/80 dark:border-slate-800/80 group-hover/row:border-emerald-400/80 dark:group-hover/row:border-emerald-500/70 whitespace-nowrap cursor-pointer transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenPurchaseForSeller(p.sellerId);
                          }}
                          title={t('নতুন ধান ক্রয়ের মেমো এন্ট্রি করতে ক্লিক করুন', 'Click to enter new purchase')}
                        >
                          <span className={`px-2.5 py-1 rounded-lg border font-mono text-xs font-black shadow-2xs transition-all ${
                            isPaid
                              ? 'bg-slate-300/70 dark:bg-slate-800/80 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                              : 'bg-amber-100/90 dark:bg-amber-950/80 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-300 group-hover/row:border-amber-400'
                          }`}>
                            {p.invoiceNumber}
                          </span>
                          <div className="mt-1 flex flex-col items-start gap-0.5">
                            <div className={`text-[11px] font-bold flex items-center space-x-1 ${
                              isPaid ? 'text-slate-500 dark:text-slate-500' : 'text-slate-600 dark:text-slate-300'
                            }`}>
                              <Calendar className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0 inline" />
                              <span>{p.date}</span>
                            </div>
                            {p.time && (
                              <div className={`text-[10px] font-bold flex items-center space-x-1 ${
                                isPaid ? 'text-slate-400 dark:text-slate-500' : 'text-slate-500 dark:text-slate-400'
                              }`}>
                                <Clock className="w-2.5 h-2.5 text-amber-500 shrink-0 inline" />
                                <span>{p.time}</span>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Seller & Village with Distinct Eye-Catching Name Color */}
                        <td 
                          className="py-3 px-3 sm:px-4 border-y border-slate-200/80 dark:border-slate-800/80 group-hover/row:border-emerald-400/80 dark:group-hover/row:border-emerald-500/70 cursor-pointer transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenPurchaseForSeller(p.sellerId);
                          }}
                          title={t('নতুন ধান ক্রয়ের মেমো এন্ট্রি করতে ক্লিক করুন', 'Click to enter new purchase')}
                        >
                          <div className="text-left group/seller flex flex-col items-start">
                            {/* DISTINCT EYE-CATCHING SELLER NAME COLOR */}
                            <span className="font-black text-sm text-emerald-700 dark:text-emerald-400 group-hover/seller:text-emerald-500 transition-colors">
                              {p.sellerName}
                            </span>
                            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center space-x-1 mt-0.5">
                              <Phone className="w-3 h-3 text-emerald-500 inline" />
                              <span>{p.sellerPhone || '---'}</span>
                              {p.sellerVillage && (
                                <span className="text-slate-400"> • {p.sellerVillage}</span>
                              )}
                            </span>
                          </div>
                        </td>

                        {/* Paddy Variety */}
                        <td className="py-3 px-3 sm:px-4 border-y border-slate-200/80 dark:border-slate-800/80 group-hover/row:border-emerald-400/80 dark:group-hover/row:border-emerald-500/70 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-lg font-bold text-xs sm:text-[13px] border ${
                            isPaid
                              ? 'bg-slate-300/60 dark:bg-slate-800/70 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700'
                              : 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border-emerald-300/70 dark:border-emerald-800'
                          }`}>
                            {p.paddyType || p.varietyName}
                          </span>
                        </td>

                        {/* Quantity & Bags */}
                        <td className="py-3 px-3 sm:px-4 border-y border-slate-200/80 dark:border-slate-800/80 group-hover/row:border-emerald-400/80 dark:group-hover/row:border-emerald-500/70 text-right whitespace-nowrap">
                          <div className={`font-black text-sm ${isPaid ? 'text-slate-600 dark:text-slate-400' : 'text-slate-900 dark:text-slate-100'}`}>
                            {toBengaliNumber((p.totalMon || p.quantityMon || 0).toFixed(1))} মণ
                          </div>
                          <div className="text-xs font-bold text-slate-500 dark:text-slate-400">
                            {toBengaliNumber(p.bags || (p.totalMon ? Math.round(p.totalMon / 1.25) : 0))} বস্তা
                          </div>
                        </td>

                        {/* Rate */}
                        <td className={`py-3 px-3 sm:px-4 border-y border-slate-200/80 dark:border-slate-800/80 group-hover/row:border-emerald-400/80 dark:group-hover/row:border-emerald-500/70 text-right whitespace-nowrap font-bold text-xs sm:text-sm ${
                          isPaid ? 'text-slate-500 dark:text-slate-400' : 'text-slate-700 dark:text-slate-300'
                        }`}>
                          ৳ {toBengaliNumber(p.ratePerMon)}
                        </td>

                        {/* TOTAL BILL */}
                        <td className="py-3 px-3 sm:px-4 border-y border-slate-200/80 dark:border-slate-800/80 group-hover/row:border-emerald-400/80 dark:group-hover/row:border-emerald-500/70 text-right whitespace-nowrap">
                          <div className={`font-black text-sm ${isPaid ? 'text-slate-500 dark:text-slate-400' : 'text-slate-950 dark:text-white'}`}>
                            {formatCurrency(total)}
                          </div>
                        </td>

                        {/* CASH PAID (PROMINENTLY DISPLAYED) */}
                        <td className="py-3 px-3 sm:px-4 border-y border-slate-200/80 dark:border-slate-800/80 group-hover/row:border-emerald-400/80 dark:group-hover/row:border-emerald-500/70 text-right whitespace-nowrap">
                          <div className="font-black text-sm text-emerald-600 dark:text-emerald-400">
                            {formatCurrency(paid)}
                          </div>
                        </td>

                        {/* REMAINING DUE */}
                        <td className="py-3 px-3 sm:px-4 border-y border-slate-200/80 dark:border-slate-800/80 group-hover/row:border-emerald-400/80 dark:group-hover/row:border-emerald-500/70 text-right whitespace-nowrap">
                          {due > 0 ? (
                            <div className="font-black text-sm text-rose-600 dark:text-rose-400">
                              {formatCurrency(due)}
                            </div>
                          ) : (
                            <div className="font-bold text-xs text-slate-400 dark:text-slate-500">
                              ৳ ০
                            </div>
                          )}
                        </td>

                        {/* Status Pill - Only Paid Tag Stays Bold & Vivid */}
                        <td className="py-3 px-3 sm:px-4 border-y border-slate-200/80 dark:border-slate-800/80 group-hover/row:border-emerald-400/80 dark:group-hover/row:border-emerald-500/70 text-center whitespace-nowrap">
                          {isPaid ? (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-black bg-emerald-600 text-white shadow-md border-2 border-emerald-400 ring-2 ring-emerald-300 dark:ring-emerald-800 animate-in fade-in">
                              ✓ পরিশোধিত
                            </span>
                          ) : (
                            <span className={`px-2.5 py-1 rounded-full text-xs font-black border shadow-2xs ${status.pill}`}>
                              {status.label}
                            </span>
                          )}
                        </td>

                        {/* 3-Dot Action Menu - Always Clean, Normal & Visible */}
                        <td className="py-3 px-3 sm:px-4 last:rounded-r-2xl border-y last:border-r border-slate-200/80 dark:border-slate-800/80 group-hover/row:border-emerald-400/80 dark:group-hover/row:border-emerald-500/70 text-center whitespace-nowrap pointer-events-auto" onClick={e => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={(e) => toggleActionMenu(e, 'memo', p)}
                            className="p-1.5 rounded-xl border-2 transition cursor-pointer shadow-xs active:scale-95 bg-white hover:bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700 hover:border-slate-400"
                            title="মেনু খুলুন"
                          >
                            <MoreVertical className="w-4 h-4" />
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

      {/* VIEW 2: Sellers Directory Table */}
      {activeSubTab === 'sellers' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border-2 border-slate-200 dark:border-slate-800 shadow-md overflow-hidden">
          <div className="overflow-x-auto p-2 sm:p-2.5 [scrollbar-gutter:stable]">
            <table className="w-full text-left border-separate border-spacing-y-2">
              <thead className="text-slate-700 dark:text-slate-300 font-black text-xs sm:text-sm uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-4">{t('সদস্য আইডি ও সাল', 'Member ID & Year')}</th>
                  <th className="py-2.5 px-4">{t('বিক্রেতার নাম, মোবাইল ও গ্রাম', 'Seller, Phone & Address')}</th>
                  <th className="py-2.5 px-4 text-right">{t('মোট সরবরাহ ধান', 'Total Supplied')}</th>
                  <th className="py-2.5 px-4 text-right">{t('মোট বিল', 'Total Bill')}</th>
                  <th className="py-2.5 px-4 text-right">{t('পরিশোধিত টাকা', 'Total Paid')}</th>
                  <th className="py-2.5 px-4 text-right">{t('বর্তমান বকেয়া পাওনা', 'Current Balance Due')}</th>
                  <th className="py-2.5 px-4 text-center">{t('অ্যাকশন', 'Actions')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredSellers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400 font-bold text-sm bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700">
                      <User className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                      {t('কোনো নিবন্ধিত বিক্রেতা পাওয়া যায়নি।', 'No registered sellers found.')}
                    </td>
                  </tr>
                ) : (
                  filteredSellers.map((s) => {
                    const memberId = getSellerMemberId(s, sellers);
                    const sellerYear = getSellerYear(s);
                    const stats = getSellerStats(s.id);
                    const isPaidSeller = stats.currentDue <= 0;

                    return (
                      <tr 
                        key={s.id} 
                        onDoubleClick={() => setHistoryModalSeller({ id: s.id, name: s.name, phone: s.phone, village: s.village, memberId })}
                        title={t('ডাবল ক্লিক করে এই বিক্রেতার সকল লেনদেন ও খতিয়ান দেখুন', 'Double-click to view ledger')}
                        className={`group/row relative transition-all duration-200 ease-out cursor-pointer transform-gpu hover:-translate-y-1 hover:scale-[1.006] hover:shadow-xl hover:z-20 ${
                          isPaidSeller
                            ? 'bg-slate-200/60 dark:bg-slate-950/80 text-slate-500 dark:text-slate-500 hover:bg-slate-300/70 dark:hover:bg-slate-900/90 shadow-2xs'
                            : 'bg-white dark:bg-slate-900 hover:bg-gradient-to-r hover:from-indigo-50/90 hover:via-white hover:to-indigo-50/90 dark:hover:from-slate-800 dark:hover:via-slate-800/95 dark:hover:to-slate-800 text-slate-900 dark:text-white shadow-xs hover:shadow-indigo-950/10'
                        }`}
                      >
                        {/* 1. Member ID & Registration Year */}
                        <td 
                          className="py-3.5 px-4 first:rounded-l-2xl border-y first:border-l border-slate-200/80 dark:border-slate-800/80 group-hover/row:border-indigo-400/80 dark:group-hover/row:border-indigo-500/70 whitespace-nowrap cursor-pointer transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenPurchaseForSeller(s.id);
                          }}
                          title={t('নতুন ধান ক্রয়ের মেমো এন্ট্রি করতে ক্লিক করুন', 'Click to enter new purchase')}
                        >
                          <span className={`px-3 py-1.5 rounded-xl border-2 font-mono text-sm sm:text-base font-black shadow-xs transition-all ${
                            isPaidSeller
                              ? 'bg-slate-300/70 dark:bg-slate-800/80 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                              : 'bg-indigo-50 dark:bg-indigo-950/80 border-indigo-300 dark:border-indigo-700 text-indigo-900 dark:text-indigo-200'
                          }`}>
                            ID: {toBengaliNumber(memberId)}
                          </span>
                          <div className={`text-xs font-bold mt-1 flex items-center space-x-1 ${
                            isPaidSeller ? 'text-slate-400 dark:text-slate-500' : 'text-slate-500 dark:text-slate-400'
                          }`}>
                            <Calendar className="w-3.5 h-3.5 text-indigo-500 shrink-0 inline" />
                            <span>{toBengaliNumber(sellerYear)} সাল</span>
                          </div>
                        </td>

                        {/* 2. Seller Name, Mobile & Village / Address */}
                        <td 
                          className="py-3.5 px-4 border-y border-slate-200/80 dark:border-slate-800/80 group-hover/row:border-indigo-400/80 dark:group-hover/row:border-indigo-500/70 cursor-pointer transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenPurchaseForSeller(s.id);
                          }}
                          title={t('নতুন ধান ক্রয়ের মেমো এন্ট্রি করতে ক্লিক করুন', 'Click to enter new purchase')}
                        >
                          <div className="text-left group/seller flex flex-col items-start">
                            <span className={`font-black text-base sm:text-lg transition-colors ${
                              isPaidSeller
                                ? 'text-slate-600 dark:text-slate-400 group-hover/seller:text-slate-900 dark:group-hover/seller:text-white'
                                : 'text-slate-900 dark:text-white group-hover/seller:text-emerald-600 dark:group-hover/seller:text-emerald-400 group-hover/seller:underline'
                            }`}>
                              {s.name}
                            </span>
                            <span className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300 flex items-center space-x-1.5 mt-0.5">
                              <Phone className="w-3.5 h-3.5 text-emerald-500 inline" />
                              <span>{s.phone || '---'}</span>
                              {s.village && (
                                <span className="text-slate-400 font-normal"> • {s.village}</span>
                              )}
                            </span>
                          </div>
                        </td>

                        {/* 3. Total Paddy Mon & Bags */}
                        <td className="py-3.5 px-4 border-y border-slate-200/80 dark:border-slate-800/80 group-hover/row:border-indigo-400/80 dark:group-hover/row:border-indigo-500/70 text-right whitespace-nowrap">
                          <div className={`font-black text-base sm:text-lg ${isPaidSeller ? 'text-slate-600 dark:text-slate-400' : 'text-slate-900 dark:text-slate-100'}`}>
                            {toBengaliNumber(stats.totalMon.toFixed(1))} মণ
                          </div>
                          <div className="text-xs sm:text-sm font-bold text-slate-500 dark:text-slate-400">
                            {toBengaliNumber(stats.totalBags || Math.round(stats.totalMon / 1.25))} বস্তা
                          </div>
                        </td>

                        {/* 4. Total Bill */}
                        <td className={`py-3.5 px-4 border-y border-slate-200/80 dark:border-slate-800/80 group-hover/row:border-indigo-400/80 dark:group-hover/row:border-indigo-500/70 text-right whitespace-nowrap font-black text-base sm:text-lg ${
                          isPaidSeller ? 'text-slate-600 dark:text-slate-400' : 'text-slate-900 dark:text-slate-100'
                        }`}>
                          {formatCurrency(stats.totalBill)}
                        </td>

                        {/* 5. Total Paid */}
                        <td className="py-3.5 px-4 border-y border-slate-200/80 dark:border-slate-800/80 group-hover/row:border-indigo-400/80 dark:group-hover/row:border-indigo-500/70 text-right whitespace-nowrap font-black text-base sm:text-lg text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(stats.totalPaid)}
                        </td>

                        {/* 6. Current Balance Due / Status - Only Paid Tag Stays Bold & Vivid */}
                        <td className="py-3.5 px-4 border-y border-slate-200/80 dark:border-slate-800/80 group-hover/row:border-indigo-400/80 dark:group-hover/row:border-indigo-500/70 text-right whitespace-nowrap">
                          {stats.currentDue > 0 ? (
                            <span className="font-black text-lg sm:text-xl text-rose-600 dark:text-rose-400">
                              {formatCurrency(stats.currentDue)}
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-black bg-emerald-600 text-white shadow-md border-2 border-emerald-400 ring-2 ring-emerald-300 dark:ring-emerald-800 animate-in fade-in">
                              ✓ পরিশোধিত
                            </span>
                          )}
                        </td>

                        {/* 7. Action Column: Clean 3-Dot Menu Button Always Normal & Visible */}
                        <td className="py-3.5 px-4 last:rounded-r-2xl border-y last:border-r border-slate-200/80 dark:border-slate-800/80 group-hover/row:border-indigo-400/80 dark:group-hover/row:border-indigo-500/70 text-center whitespace-nowrap pointer-events-auto" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center justify-center">
                            <button
                              type="button"
                              onClick={(e) => toggleActionMenu(e, 'seller', s)}
                              className="p-2 rounded-xl bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border-2 border-slate-300 dark:border-slate-600 transition cursor-pointer shadow-xs active:scale-95"
                              title="মেনু খুলুন"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>
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
      )}

      {/* ========================================================================= */}
      {/* 4. PURCHASE ENTRY FORM WITH LIVE DIGITAL RECEIPT PREVIEW (SPLIT MODAL) */}
      {/* ========================================================================= */}
      {isEntryModalOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150 overscroll-contain select-none"
          onClick={() => setIsEntryModalOpen(false)}
          onWheel={e => e.stopPropagation()}
        >
          <div 
            className={`bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-6xl w-full border-2 border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-150 flex flex-col max-h-[94vh] text-slate-900 dark:text-slate-100 overflow-hidden select-text transition-all ${
              isShaking ? 'animate-shake ring-4 ring-rose-500/50' : ''
            }`}
            onClick={e => e.stopPropagation()}
            onWheel={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="shrink-0 bg-slate-900 text-white px-5 sm:px-6 py-3.5 flex items-center justify-between border-b-2 border-slate-700 shadow-md">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-xl bg-amber-400 text-slate-950 font-black">
                  <Sprout className="w-5 h-5 text-slate-950" />
                </div>
                <h3 className="font-black text-base sm:text-lg text-white tracking-tight">
                  {t('ধান ক্রয়ের পাকা মেমো', 'Paddy Purchase Memo')}
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setIsEntryModalOpen(false)}
                className="text-slate-400 hover:text-white font-black w-8 h-8 rounded-full bg-slate-800/80 hover:bg-slate-700 flex items-center justify-center transition cursor-pointer active:scale-90 border border-slate-700"
                title="বন্ধ করুন"
              >
                ✕
              </button>
            </div>

            {/* Split Layout: Left Form (7 cols) + Right Live Digital Receipt (5 cols) */}
            <form onSubmit={(e) => handleSubmitPurchase(e, false)} className="flex flex-col flex-1 overflow-hidden min-h-0">
              <div className="p-4 sm:p-5 overflow-y-auto flex-1 overscroll-contain">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                  
                  {/* LEFT COLUMN: FORM INPUTS (7 Columns) */}
                  <div className="lg:col-span-7 space-y-3.5">
                    {/* Seller Selection or Direct Input */}
                    <div className="bg-slate-50 dark:bg-slate-800/80 p-3 sm:p-3.5 rounded-2xl border-2 border-slate-200 dark:border-slate-700 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center space-x-1.5">
                          <User className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span>{t('বিক্রেতা নির্বাচন *', 'Seller Selection *')}</span>
                        </span>

                        <div className="relative flex items-center p-1 bg-slate-200/90 dark:bg-slate-800 rounded-2xl border border-slate-300/80 dark:border-slate-700 shadow-inner">
                          {/* Smooth spring sliding background pill */}
                          <div 
                            className={`absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-500/20 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                              sellerInputMode === 'select' ? 'left-1' : 'left-[calc(50%)]'
                            }`}
                          />
                          <button
                            type="button"
                            onClick={() => setSellerInputMode('select')}
                            className={`relative z-10 px-3.5 py-1.5 text-xs font-black rounded-xl transition-all duration-200 flex items-center justify-center space-x-1.5 cursor-pointer active:scale-95 ${
                              sellerInputMode === 'select'
                                ? 'text-white'
                                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                            }`}
                          >
                            <User className="w-3.5 h-3.5" />
                            <span>{t('তালিকা', 'List')}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setSellerInputMode('manual')}
                            className={`relative z-10 px-3.5 py-1.5 text-xs font-black rounded-xl transition-all duration-200 flex items-center justify-center space-x-1.5 cursor-pointer active:scale-95 ${
                              sellerInputMode === 'manual'
                                ? 'text-white'
                                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                            }`}
                          >
                            <PlusCircle className="w-3.5 h-3.5" />
                            <span>{t('নতুন বিক্রেতা', 'New Seller')}</span>
                          </button>
                        </div>
                      </div>

                      {sellerInputMode === 'select' ? (
                        <div ref={sellerDropdownRef} className="relative">
                          {/* Hidden standard select kept for form validation and refs */}
                          <select
                            ref={sellerSelectRef}
                            value={selectedSellerId}
                            onChange={e => {
                              setSelectedSellerId(e.target.value);
                              setFieldErrorMsg(null);
                            }}
                            required={sellerInputMode === 'select'}
                            className="sr-only pointer-events-none"
                            tabIndex={-1}
                          >
                            <option value="">-- নির্বাচন করুন --</option>
                            {sellers.map(s => (
                              <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                          </select>

                          {/* Custom Dropdown Trigger with distinctly highlighted seller name */}
                          {(() => {
                            const sel = sellers.find(s => s.id === selectedSellerId);
                            const memId = sel ? getSellerMemberId(sel, sellers) : '';
                            const stats = sel ? getSellerStats(sel.id) : null;
                            return (
                              <button
                                type="button"
                                onClick={() => setIsSellerDropdownOpen(prev => !prev)}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') {
                                    handleFieldKeyDown(e, 'sellerSelect');
                                  }
                                }}
                                className={`w-full text-left p-2.5 text-xs sm:text-sm rounded-xl border-2 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium flex items-center justify-between transition-all cursor-pointer shadow-xs ${
                                  fieldErrorMsg?.field === 'sellerSelect' 
                                    ? 'border-rose-500 ring-2 ring-rose-400' 
                                    : isSellerDropdownOpen 
                                    ? 'border-emerald-500 ring-2 ring-emerald-400/40' 
                                    : 'border-slate-300 dark:border-slate-600 hover:border-emerald-400'
                                }`}
                              >
                                <div className="truncate flex-1">
                                  {sel ? (
                                    <span>
                                      <span className="font-mono text-slate-500 dark:text-slate-400 font-bold">[{toBengaliNumber(memId)}] </span>
                                      {/* DISTINCT HIGHLIGHTED COLOR FOR SELLER NAME */}
                                      <span className="text-emerald-700 dark:text-emerald-400 font-black text-sm px-1.5 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-300/80 dark:border-emerald-700 shadow-2xs">
                                        {sel.name}
                                      </span>
                                      <span className="text-slate-600 dark:text-slate-300 font-medium"> ({sel.phone || 'ফোন নেই'})</span>
                                      <span className="text-slate-400"> • {sel.village || 'শেরপুর'}</span>
                                      <span className="text-rose-600 dark:text-rose-400 font-bold"> (বকেয়া: ৳{toBengaliNumber(stats?.currentDue || 0)})</span>
                                    </span>
                                  ) : (
                                    <span className="text-slate-400 font-bold">
                                      {t('-- বিক্রেতা নির্বাচন করুন --', '-- Select Seller --')}
                                    </span>
                                  )}
                                </div>
                                <span className="ml-2 text-slate-400 text-xs shrink-0">▼</span>
                              </button>
                            );
                          })()}

                          {/* Dropdown Options Menu */}
                          {isSellerDropdownOpen && (
                            <div className="absolute top-full left-0 right-0 mt-1.5 z-40 bg-white dark:bg-slate-900 border-2 border-emerald-500/70 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-h-64 flex flex-col">
                              {/* Search Box */}
                              <div className="p-2 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60">
                                <input
                                  type="text"
                                  autoFocus
                                  placeholder="নাম বা মোবাইল নম্বর দিয়ে খুঁজুন..."
                                  value={sellerSearchQuery}
                                  onChange={e => setSellerSearchQuery(e.target.value)}
                                  className="w-full py-1.5 px-3 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                              </div>

                              {/* Sellers List with distinct color on name */}
                              <div className="overflow-y-auto flex-1 divide-y divide-slate-100 dark:divide-slate-800">
                                {sellers
                                  .filter(s => {
                                    if (!sellerSearchQuery.trim()) return true;
                                    const q = sellerSearchQuery.toLowerCase();
                                    return s.name.toLowerCase().includes(q) || (s.phone && s.phone.includes(q)) || (s.village && s.village.toLowerCase().includes(q));
                                  })
                                  .map(s => {
                                    const memberId = getSellerMemberId(s, sellers);
                                    const stats = getSellerStats(s.id);
                                    const isSelected = s.id === selectedSellerId;
                                    return (
                                      <button
                                        type="button"
                                        key={s.id}
                                        onClick={() => {
                                          setSelectedSellerId(s.id);
                                          setFieldErrorMsg(null);
                                          setIsSellerDropdownOpen(false);
                                          playInputStepSound();
                                          varietySelectRef.current?.focus();
                                        }}
                                        className={`w-full text-left p-2.5 text-xs transition cursor-pointer flex items-center justify-between hover:bg-emerald-50/80 dark:hover:bg-slate-800 ${
                                          isSelected ? 'bg-emerald-100/70 dark:bg-emerald-950/50 font-bold' : ''
                                        }`}
                                      >
                                        <div className="truncate">
                                          <span className="font-mono text-slate-500 dark:text-slate-400 font-bold">[{toBengaliNumber(memberId)}] </span>
                                          {/* DISTINCT NAME COLOR IN DROPDOWN LIST */}
                                          <span className="text-emerald-700 dark:text-emerald-400 font-black text-sm">
                                            {s.name}
                                          </span>
                                          <span className="text-slate-600 dark:text-slate-300"> ({s.phone || 'ফোন নেই'})</span>
                                          <span className="text-slate-400"> • {s.village || 'শেরপুর'}</span>
                                          <span className="text-rose-600 dark:text-rose-400 font-bold"> (বকেয়া: ৳{toBengaliNumber(stats.currentDue)})</span>
                                        </div>
                                        {isSelected && (
                                          <span className="text-emerald-600 dark:text-emerald-400 font-black text-xs ml-2">✓</span>
                                        )}
                                      </button>
                                    );
                                  })}
                              </div>
                            </div>
                          )}

                          {fieldErrorMsg?.field === 'sellerSelect' && (
                            <p className="text-[11px] font-bold text-rose-500 mt-1 animate-in fade-in">
                              ⚠️ {fieldErrorMsg.message}
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 animate-in fade-in duration-200">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center space-x-1">
                              <User className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                              <span>{t('বিক্রেতার নাম *', 'Seller Name *')}</span>
                            </label>
                            <input
                              ref={directSellerNameRef}
                              type="text"
                              required={sellerInputMode === 'manual'}
                              placeholder="পূর্ণ নাম লিখুন"
                              value={directSellerName}
                              onChange={e => {
                                setDirectSellerName(e.target.value);
                                setFieldErrorMsg(null);
                              }}
                              onKeyDown={e => handleFieldKeyDown(e, 'directSellerName')}
                              className={`w-full py-2 px-3 text-xs sm:text-sm rounded-xl border-2 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition-all shadow-xs ${
                                fieldErrorMsg?.field === 'directSellerName' ? 'border-rose-500 ring-2 ring-rose-400' : 'border-slate-300 dark:border-slate-600'
                              }`}
                            />
                            {fieldErrorMsg?.field === 'directSellerName' && (
                              <p className="text-[11px] font-bold text-rose-500 mt-1 animate-in fade-in">
                                ⚠️ {fieldErrorMsg.message}
                              </p>
                            )}
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center space-x-1">
                              <Phone className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                              <span>{t('মোবাইল নম্বর', 'Phone Number')}</span>
                            </label>
                            <input
                              ref={directSellerPhoneRef}
                              type="tel"
                              maxLength={11}
                              required={sellerInputMode === 'manual'}
                              placeholder="০১৭১২৩৪৫৬৭৮"
                              value={directSellerPhone}
                              onChange={e => {
                                setDirectSellerPhone(e.target.value);
                                setFieldErrorMsg(null);
                              }}
                              onKeyDown={e => handleFieldKeyDown(e, 'directSellerPhone')}
                              className={`w-full py-2 px-3 text-xs sm:text-sm rounded-xl border-2 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono font-bold focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition-all shadow-xs ${
                                fieldErrorMsg?.field === 'directSellerPhone' ? 'border-rose-500 ring-2 ring-rose-400' : 'border-slate-300 dark:border-slate-600'
                              }`}
                            />
                            {fieldErrorMsg?.field === 'directSellerPhone' && (
                              <p className="text-[11px] font-bold text-rose-500 mt-1 animate-in fade-in">
                                ⚠️ {fieldErrorMsg.message}
                              </p>
                            )}
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center space-x-1">
                              <MapPin className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                              <span>{t('গ্রাম / এলাকা', 'Village / Area')}</span>
                            </label>
                            <input
                              ref={directSellerVillageRef}
                              type="text"
                              placeholder="গ্রাম বা এলাকা"
                              value={directSellerVillage}
                              onChange={e => setDirectSellerVillage(e.target.value)}
                              onKeyDown={e => handleFieldKeyDown(e, 'directSellerVillage')}
                              className="w-full py-2 px-3 text-xs sm:text-sm rounded-xl border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition-all shadow-xs"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Paddy Variety & Rate */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-black text-slate-800 dark:text-slate-200 mb-1">
                          {t('ধানের জাত *', 'Paddy Variety *')}
                        </label>
                        <select
                          ref={varietySelectRef}
                          value={selectedVarietyId}
                          onChange={e => {
                            handleVarietyChange(e.target.value);
                            setFieldErrorMsg(null);
                          }}
                          onKeyDown={e => handleFieldKeyDown(e, 'varietySelect')}
                          required
                          className={`w-full py-1.5 px-2.5 text-xs sm:text-sm rounded-xl border-2 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none ${
                            fieldErrorMsg?.field === 'varietySelect' ? 'border-rose-500 ring-2 ring-rose-400' : 'border-slate-300 dark:border-slate-600'
                          }`}
                        >
                          <option value="">{t('-- ধানের জাত নির্বাচন করুন --', '-- Select Variety --')}</option>
                          {varieties.map(v => (
                            <option key={v.id} value={v.id}>
                              {v.name} (দর: ৳{v.defaultPurchaseRate || 0})
                            </option>
                          ))}
                          <option value="CUSTOM">{t('➕ অন্যান্য / নতুন জাত...', '➕ Other / Custom...')}</option>
                        </select>
                        {fieldErrorMsg?.field === 'varietySelect' && (
                          <p className="text-[11px] font-bold text-rose-500 mt-1 animate-in fade-in">
                            ⚠️ {fieldErrorMsg.message}
                          </p>
                        )}

                        {isCustomVariety && (
                          <div className="mt-1.5 animate-in fade-in duration-200">
                            <input
                              ref={customVarietyRef}
                              type="text"
                              required
                              placeholder="নতুন ধানের জাতের নাম লিখুন"
                              value={customVarietyName}
                              onChange={e => {
                                setCustomVarietyName(e.target.value);
                                setFieldErrorMsg(null);
                              }}
                              onKeyDown={e => handleFieldKeyDown(e, 'customVariety')}
                              className={`w-full py-1 px-2.5 text-xs rounded-xl border-2 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-semibold ${
                                fieldErrorMsg?.field === 'customVariety' ? 'border-rose-500 ring-2 ring-rose-400' : 'border-amber-400'
                              }`}
                            />
                            {fieldErrorMsg?.field === 'customVariety' && (
                              <p className="text-[11px] font-bold text-rose-500 mt-1 animate-in fade-in">
                                ⚠️ {fieldErrorMsg.message}
                              </p>
                            )}
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs font-black text-slate-800 dark:text-slate-200 mb-1">
                          {t('দর (টাকা/মণ) *', 'Rate Per Mon (৳) *')}
                        </label>
                        <input
                          ref={rateRef}
                          type="number"
                          min="100"
                          step="1"
                          required
                          placeholder="যেমন: 1250"
                          value={ratePerMon}
                          onChange={e => {
                            setRatePerMon(e.target.value === '' ? '' : Number(e.target.value));
                            setFieldErrorMsg(null);
                          }}
                          onKeyDown={e => handleFieldKeyDown(e, 'rate')}
                          className={`w-full py-1.5 px-2.5 text-sm sm:text-base rounded-xl border-2 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-black focus:ring-2 focus:ring-emerald-500 focus:outline-none ${
                            fieldErrorMsg?.field === 'rate' ? 'border-rose-500 ring-2 ring-rose-400' : 'border-slate-300 dark:border-slate-600'
                          }`}
                        />
                        {fieldErrorMsg?.field === 'rate' && (
                          <p className="text-[11px] font-bold text-rose-500 mt-1 animate-in fade-in">
                            ⚠️ {fieldErrorMsg.message}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Weight (Mon & Kg) + Dynamic Optional Fields from Settings */}
                    <div className="bg-slate-50 dark:bg-slate-800/80 p-3 sm:p-3.5 rounded-2xl border-2 border-slate-200 dark:border-slate-700 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center space-x-1.5">
                          <Scale className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span>{t('ধানের ওজন ও পরিমাপ', 'Paddy Weight')}</span>
                        </span>
                        <span className="text-xs font-black text-emerald-700 dark:text-emerald-400">
                          <b>{toBengaliNumber(computedTotalMon.toFixed(2))} মণ</b> ({toBengaliNumber(computedTotalKg.toFixed(1))} কেজি)
                        </span>
                      </div>

                      <div className={`grid grid-cols-2 ${
                        (settings.showMemoBags || settings.showMemoLabor || settings.showMemoDeductions) ? 'sm:grid-cols-4' : 'sm:grid-cols-2'
                      } gap-2`}>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-0.5">
                            {t('ওজন (মণ) *', 'Weight (Mon) *')}
                          </label>
                          <input
                            ref={weightMonRef}
                            type="number"
                            min="0"
                            step="any"
                            required
                            placeholder="যেমন: ৫০"
                            value={weightMon}
                            onChange={e => {
                              setWeightMon(e.target.value === '' ? '' : Number(e.target.value));
                              setFieldErrorMsg(null);
                            }}
                            onKeyDown={e => handleFieldKeyDown(e, 'weightMon')}
                            className={`w-full py-1.5 px-2.5 text-xs sm:text-sm rounded-xl border-2 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-black focus:ring-2 focus:ring-emerald-500 ${
                              fieldErrorMsg?.field === 'weightMon' ? 'border-rose-500 ring-2 ring-rose-400' : 'border-slate-300 dark:border-slate-600'
                            }`}
                          />
                          {fieldErrorMsg?.field === 'weightMon' && (
                            <p className="text-[10px] font-bold text-rose-500 mt-0.5 animate-in fade-in">
                              ⚠️ {fieldErrorMsg.message}
                            </p>
                          )}
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-0.5">
                            {t('কেজি (০-৩৯) [ঐচ্ছিক]', 'Kg (0-39) [Optional]')}
                          </label>
                          <input
                            ref={weightKgRef}
                            type="number"
                            min="0"
                            max="39.99"
                            step="any"
                            placeholder="যেমন: ১৫"
                            value={weightKg}
                            onChange={e => {
                              setWeightKg(e.target.value === '' ? '' : Number(e.target.value));
                              setFieldErrorMsg(null);
                            }}
                            onKeyDown={e => handleFieldKeyDown(e, 'weightKg')}
                            className={`w-full py-1.5 px-2.5 text-xs sm:text-sm rounded-xl border-2 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-black focus:ring-2 focus:ring-emerald-500 ${
                              fieldErrorMsg?.field === 'weightKg' ? 'border-rose-500 ring-2 ring-rose-400' : 'border-slate-300 dark:border-slate-600'
                            }`}
                          />
                          {fieldErrorMsg?.field === 'weightKg' && (
                            <p className="text-[10px] font-bold text-rose-500 mt-0.5 animate-in fade-in">
                              ⚠️ {fieldErrorMsg.message}
                            </p>
                          )}
                        </div>

                        {/* Optional Bags (enabled via Settings) */}
                        {settings.showMemoBags && (
                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-0.5">
                              {t('বস্তা সংখ্যা [ঐচ্ছিক]', 'Bags [Optional]')}
                            </label>
                            <input
                              ref={bagsRef}
                              type="number"
                              min="0"
                              step="1"
                              placeholder="৪০"
                              value={bags}
                              onChange={e => setBags(e.target.value === '' ? '' : Number(e.target.value))}
                              onKeyDown={e => handleFieldKeyDown(e, 'bags')}
                              className="w-full py-1.5 px-2.5 text-xs sm:text-sm rounded-xl border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-black focus:ring-2 focus:ring-emerald-500"
                            />
                          </div>
                        )}

                        {/* Optional Labor Cost (enabled via Settings) */}
                        {settings.showMemoLabor && (
                          <div>
                            <label className="block text-[11px] font-bold text-amber-700 dark:text-amber-400 mb-0.5">
                              {t('লেবার খরচ (৳) [ঐচ্ছিক]', 'Labor (৳)')}
                            </label>
                            <input
                              ref={laborRef}
                              type="number"
                              min="0"
                              step="any"
                              placeholder="১০০"
                              value={laborCost}
                              onChange={e => setLaborCost(e.target.value === '' ? '' : Number(e.target.value))}
                              onKeyDown={e => handleFieldKeyDown(e, 'labor')}
                              className="w-full py-1.5 px-2.5 text-xs sm:text-sm rounded-xl border-2 border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-900 text-amber-700 dark:text-amber-400 font-black focus:ring-2 focus:ring-emerald-500"
                            />
                          </div>
                        )}

                        {/* Optional Deductions (enabled via Settings) */}
                        {settings.showMemoDeductions && (
                          <div>
                            <label className="block text-[11px] font-bold text-rose-700 dark:text-rose-400 mb-0.5">
                              {t('চালতা / কর্তন (৳) [ঐচ্ছিক]', 'Deductions (৳)')}
                            </label>
                            <input
                              ref={deductionsRef}
                              type="number"
                              min="0"
                              step="any"
                              placeholder="২০০"
                              value={deductions}
                              onChange={e => setDeductions(e.target.value === '' ? '' : Number(e.target.value))}
                              onKeyDown={e => handleFieldKeyDown(e, 'deductions')}
                              className="w-full py-1.5 px-2.5 text-xs sm:text-sm rounded-xl border-2 border-rose-300 dark:border-rose-700 bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 font-black focus:ring-2 focus:ring-emerald-500"
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Instant Payment Input - Prominently Placed in Center Form */}
                    <div className="bg-emerald-50/80 dark:bg-emerald-950/40 p-3 sm:p-3.5 rounded-2xl border-2 border-emerald-400 dark:border-emerald-700 space-y-1.5 shadow-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-emerald-950 dark:text-emerald-300 flex items-center space-x-1.5">
                          <Coins className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          <span>{t('নগদ পরিশোধ / পরিশোধ বক্স (টাকা)', 'Instant Payment (৳)')}</span>
                        </span>
                        {numInstantPayment > 0 && (
                          <span className="text-xs font-black text-emerald-800 dark:text-emerald-300">
                            অবশিষ্ট বাকি: ৳{toBengaliNumber(computedRemainingDue)}
                          </span>
                        )}
                      </div>
                      <input
                        ref={paymentRef}
                        type="number"
                        min="0"
                        max={computedTotalBill}
                        step="any"
                        placeholder="যেমন: ৫,০০০ (না দিলে ফাঁকা রাখুন - Enter চাপুন)"
                        value={instantPayment}
                        onChange={e => setInstantPayment(e.target.value === '' ? '' : Number(e.target.value))}
                        onKeyDown={e => handleFieldKeyDown(e, 'payment')}
                        className="w-full py-2 px-3 text-sm sm:text-base rounded-xl border-2 border-emerald-400 bg-white dark:bg-slate-900 text-emerald-900 dark:text-emerald-200 font-black focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>

                    {/* Date (Time auto-recorded upon saving memo) + Optional Notes */}
                    <div className={`grid grid-cols-1 ${settings.showMemoNotes ? 'sm:grid-cols-2' : 'grid-cols-1'} gap-2.5`}>
                      <div className="bg-slate-50 dark:bg-slate-800/80 p-3 rounded-2xl border-2 border-slate-200 dark:border-slate-700 space-y-2.5">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center space-x-1">
                            <Calendar className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                            <span>{t('মেমোর তারিখ', 'Memo Date')}</span>
                          </label>
                          <input
                            type="date"
                            value={purchaseDate}
                            onChange={e => setPurchaseDate(e.target.value)}
                            className="w-full py-2 px-3 text-xs sm:text-sm rounded-xl border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition-all shadow-xs"
                          />
                        </div>

                        {/* Automatic Time Recording Indicator Badge (No Manual Input Box) */}
                        <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-emerald-50/90 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-[11px] font-bold text-emerald-800 dark:text-emerald-300">
                          <span className="flex items-center space-x-1.5">
                            <Clock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                            <span>{t('সময়', 'Time')}:</span>
                          </span>
                          <span className="font-mono text-emerald-700 dark:text-emerald-300 font-black">
                            {currentTimeStr} (অটো যুক্ত হবে)
                          </span>
                        </div>
                      </div>

                      {settings.showMemoNotes && (
                        <div className="bg-slate-50 dark:bg-slate-800/80 p-3 rounded-2xl border-2 border-slate-200 dark:border-slate-700 flex flex-col justify-between">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center space-x-1">
                              <MessageSquare className="w-3.5 h-3.5 text-amber-500" />
                              <span>{t('নোটস / মন্তব্য', 'Notes / Remarks')}</span>
                            </label>
                            <textarea
                              ref={notesRef as any}
                              rows={3}
                              placeholder="পরিষ্কার ধান..."
                              value={notes}
                              onChange={e => setNotes(e.target.value)}
                              onKeyDown={e => handleFieldKeyDown(e, 'notes')}
                              className="w-full py-1.5 px-2.5 text-xs rounded-xl border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium resize-none focus:ring-2 focus:ring-emerald-500"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ========================================================================= */}
                  {/* RIGHT COLUMN: LIVE DIGITAL RECEIPT PREVIEW (5 Columns) */}
                  {/* ========================================================================= */}
                  <div className="lg:col-span-5 bg-gradient-to-b from-amber-50/95 via-orange-50/30 to-amber-100/50 dark:from-slate-900/95 dark:via-slate-900/90 dark:to-slate-950 border-2 border-amber-300 dark:border-amber-600/40 rounded-3xl p-4 sm:p-5 shadow-2xl relative font-sans space-y-3.5 backdrop-blur-xs overflow-hidden">
                    {/* Header: Shop & Live Badge */}
                    <div className="pb-3 border-b-2 border-dashed border-amber-300 dark:border-slate-700 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 text-[10px] font-black tracking-wide shadow-2xs">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          <span>লাইভ ডিজিটাল মেমো</span>
                        </span>
                        <span className="text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400 flex items-center space-x-1">
                          <Calendar className="w-3 h-3 text-amber-600 dark:text-amber-400 inline" />
                          <span>{purchaseDate} • {currentTimeStr}</span>
                        </span>
                      </div>

                      <div className="text-center pt-1">
                        <h4 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">
                          {settings.businessName || 'মেসার্স সোনার বাংলা ধান আড়ত'}
                        </h4>
                        <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 mt-0.5">
                          {settings.address || 'ধানের প্রধান আড়ত ও কমিশন এজেন্ট'} {settings.phone && <span className="ml-1 text-slate-500">| মোবা: {settings.phone}</span>}
                        </p>
                        <div className="mt-2 inline-flex items-center space-x-2 px-3 py-0.5 rounded-full bg-gradient-to-r from-amber-200 via-amber-300 to-amber-200 dark:from-amber-950/90 dark:via-amber-900/60 dark:to-amber-950/90 border border-amber-400 dark:border-amber-700 text-[11px] font-black text-amber-950 dark:text-amber-200 shadow-2xs">
                          <span>ধান ক্রয়ের পাকা মেমো</span>
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-600 dark:bg-amber-400" />
                          <span className="font-mono">{nextInvoiceNumber}</span>
                        </div>
                      </div>
                    </div>

                    {/* Seller Details Block with Visible Upcoming Memo Number */}
                    <div className="bg-white/95 dark:bg-slate-900/95 rounded-2xl p-3 border border-amber-200/90 dark:border-slate-700 shadow-2xs space-y-1.5 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-slate-500 dark:text-slate-400 flex items-center space-x-1">
                          <User className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span>বিক্রেতা:</span>
                        </span>
                        <span className="font-black text-slate-900 dark:text-white text-sm">{activeSellerDetails.name}</span>
                      </div>
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="font-bold text-slate-500 dark:text-slate-400 flex items-center space-x-1">
                          <Phone className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                          <span>মোবাইল:</span>
                        </span>
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{activeSellerDetails.phone}</span>
                      </div>
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="font-bold text-slate-500 dark:text-slate-400 flex items-center space-x-1">
                          <MapPin className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                          <span>ঠিকানা / গ্রাম:</span>
                        </span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">{activeSellerDetails.village}</span>
                      </div>
                    </div>

                    {/* Line Items Table */}
                    <div className="rounded-2xl border border-amber-200 dark:border-slate-700 overflow-hidden bg-white/95 dark:bg-slate-900/95 shadow-2xs">
                      <table className="w-full text-xs">
                        <thead className="bg-amber-100/80 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-black border-b border-amber-200 dark:border-slate-700">
                          <tr>
                            <th className="py-2 px-2.5 text-left">বিবরণ</th>
                            <th className="py-2 px-1.5 text-center">বস্তা</th>
                            <th className="py-2 px-1.5 text-right">ওজন</th>
                            <th className="py-2 px-1.5 text-right">দর</th>
                            <th className="py-2 px-2.5 text-right">টাকা</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          <tr>
                            <td className="py-2.5 px-2.5 font-black text-slate-900 dark:text-white">
                              <span className="inline-block px-1.5 py-0.5 rounded bg-amber-100/60 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 font-bold text-[11px]">
                                {activeVarietyName}
                              </span>
                            </td>
                            <td className="py-2.5 px-1.5 text-center font-bold text-slate-700 dark:text-slate-300">
                              {toBengaliNumber(numBags)}
                            </td>
                            <td className="py-2.5 px-1.5 text-right font-black text-slate-900 dark:text-slate-100">
                              {toBengaliNumber(computedTotalMon.toFixed(2))} মণ
                            </td>
                            <td className="py-2.5 px-1.5 text-right font-bold text-slate-700 dark:text-slate-300">
                              ৳{toBengaliNumber(numRate)}
                            </td>
                            <td className="py-2.5 px-2.5 text-right font-black text-slate-900 dark:text-white">
                              {formatCurrency(rawBill)}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* Financial Summary Breakdown */}
                    <div className="bg-white/95 dark:bg-slate-900/95 rounded-2xl p-3.5 border border-amber-200/90 dark:border-slate-700 space-y-2 text-xs shadow-xs">
                      <div className="flex justify-between text-slate-600 dark:text-slate-400 font-bold">
                        <span>মোট মূল্য:</span>
                        <span>{formatCurrency(rawBill)}</span>
                      </div>

                      {numDeductions > 0 && (
                        <div className="flex justify-between text-rose-600 dark:text-rose-400 font-bold">
                          <span>কর্তন:</span>
                          <span>- {formatCurrency(numDeductions)}</span>
                        </div>
                      )}

                      {numLabor > 0 && (
                        <div className="flex justify-between text-amber-700 dark:text-amber-400 font-bold">
                          <span>লেবার খরচ:</span>
                          <span>- {formatCurrency(numLabor)}</span>
                        </div>
                      )}

                      <div className="flex justify-between items-center p-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white shadow-md">
                        <span className="font-black text-xs uppercase tracking-wider">সর্বমোট বিল:</span>
                        <span className="font-black text-lg sm:text-xl tracking-tight">
                          {formatCurrency(computedTotalBill)}
                        </span>
                      </div>

                      <div className="flex justify-between items-center text-xs font-bold text-emerald-800 dark:text-emerald-300 pt-0.5">
                        <span>নগদ পরিশোধ:</span>
                        <span className="font-black text-sm">{formatCurrency(numInstantPayment)}</span>
                      </div>

                      {computedRemainingDue > 0 ? (
                        <div className="flex justify-between items-center p-2 rounded-xl bg-rose-50 dark:bg-rose-950/70 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-300 font-black">
                          <span>অবশিষ্ট দেনা / বকেয়া:</span>
                          <span className="text-base font-black">{formatCurrency(computedRemainingDue)}</span>
                        </div>
                      ) : (
                        <div className="flex justify-between items-center p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 font-black text-xs">
                          <span>পরিশোধ অবস্থা:</span>
                          <span className="flex items-center space-x-1.5">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                            <span>সম্পূর্ণ পরিশোধিত</span>
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Signatures & Decorative Verified Footer */}
                    <div className="pt-3 border-t-2 border-dashed border-amber-300 dark:border-slate-700 space-y-2">
                      <div className="flex justify-between text-[10px] font-bold text-slate-500 dark:text-slate-400 px-3 pt-1">
                        <div className="text-center border-t border-slate-400 dark:border-slate-600 pt-1 w-20">হিসাবরক্ষক</div>
                        <div className="text-center border-t border-slate-400 dark:border-slate-600 pt-1 w-20">আড়তদার সিল</div>
                      </div>
                      <div className="text-center text-[9px] font-mono text-slate-400 dark:text-slate-500 tracking-wider">
                        ✓ DIGITAL-POS-VERIFIED-VOUCHER
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons (Fixed Bottom Bar): কিনুন & কিনুন ও মেমো */}
              <div className="shrink-0 bg-slate-100 dark:bg-slate-800 px-5 sm:px-6 py-3.5 border-t-2 border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-end gap-2.5 shadow-md">
                <button
                  type="button"
                  onClick={() => setIsEntryModalOpen(false)}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl border-2 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-black text-xs hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer active:scale-95 transition"
                >
                  {t('বাতিল', 'Cancel')}
                </button>

                <button
                  type="button"
                  disabled={submitting}
                  onClick={(e) => handleSubmitPurchase(e, true)}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs sm:text-sm shadow-md shadow-emerald-600/20 flex items-center justify-center space-x-1.5 transition active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>{submitting ? t('সংরক্ষণ হচ্ছে...', 'Saving...') : t('🖨️ কিনুন ও মেমো প্রিন্ট', '🖨️ Buy & Print Memo')}</span>
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-300 hover:from-amber-300 hover:to-amber-200 text-slate-950 font-black text-xs sm:text-sm shadow-md shadow-amber-400/20 transition active:scale-95 disabled:opacity-50 cursor-pointer border border-amber-400 flex items-center justify-center space-x-1.5"
                >
                  <CheckCircle2 className="w-4 h-4 text-slate-950" />
                  <span>{submitting ? t('সংরক্ষণ হচ্ছে...', 'Saving...') : t('✓ কিনুন (সংরক্ষণ)', '✓ Buy & Save')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: REGISTER NEW SELLER MODAL */}
      {/* ========================================================================= */}
      {isNewSellerModalOpen && (
        <div 
          className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setIsNewSellerModalOpen(false)}
        >
          <div 
            className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-md w-full p-6 text-slate-900 dark:text-slate-100 animate-in zoom-in-95 duration-150 space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b-2 border-slate-100 dark:border-slate-800">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-amber-400 text-slate-950 font-black">
                  <User className="w-5 h-5 text-slate-950" />
                </div>
                <div>
                  <h3 className="font-black text-base sm:text-lg">
                    {t('নতুন বিক্রেতা নিবন্ধন', 'Register New Seller')}
                  </h3>
                  <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                    বিক্রেতার স্থায়ী খতিয়ান ও প্রোফাইল তৈরি করুন
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsNewSellerModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRegisterSeller} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {t('বিক্রেতার পুরো নাম *', 'Seller Full Name *')}
                </label>
                <input
                  type="text"
                  required
                  placeholder="যেমন: হাজী আব্দুল করিম"
                  value={newSellerName}
                  onChange={e => setNewSellerName(e.target.value)}
                  className="w-full p-2.5 text-sm rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {t('মোবাইল নম্বর (১১ ডিজিট) *', 'Phone Number (11 Digits) *')}
                </label>
                <input
                  type="tel"
                  maxLength={11}
                  required
                  placeholder="01712345678"
                  value={newSellerPhone}
                  onChange={e => setNewSellerPhone(e.target.value)}
                  className="w-full p-2.5 text-sm rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {t('গ্রাম (Village)', 'Village')}
                  </label>
                  <input
                    type="text"
                    placeholder="যেমন: শেরপুর"
                    value={newSellerVillage}
                    onChange={e => setNewSellerVillage(e.target.value)}
                    className="w-full p-2 text-sm rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {t('ডাকঘর / থানা', 'Thana / District')}
                  </label>
                  <input
                    type="text"
                    placeholder="যেমন: শেরপুর সদর"
                    value={newSellerAddress}
                    onChange={e => setNewSellerAddress(e.target.value)}
                    className="w-full p-2 text-sm rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsNewSellerModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs cursor-pointer"
                >
                  {t('বাতিল', 'Cancel')}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs shadow transition active:scale-95 cursor-pointer"
                >
                  {t('নিবন্ধন সম্পন্ন করুন', 'Register')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: SELLER TRANSACTION HISTORY & KHOTIYAN MODAL */}
      {/* ========================================================================= */}
      {historyModalSeller && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-150 overscroll-contain"
          onClick={() => setHistoryModalSeller(null)}
          onWheel={e => e.stopPropagation()}
        >
          <div 
            className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-4xl w-full flex flex-col h-[88vh] max-h-[88vh] overflow-hidden text-slate-900 dark:text-slate-100 animate-in zoom-in-95 duration-150"
            onClick={e => e.stopPropagation()}
            onWheel={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-slate-100 dark:bg-slate-800 px-5 py-4 flex items-center justify-between border-b-2 border-slate-200 dark:border-slate-700 shrink-0">
              <div className="flex items-center space-x-3 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center font-black shrink-0">
                  <User className="w-5 h-5 text-slate-950" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center flex-wrap gap-2">
                    <h3 className="font-black text-base sm:text-lg text-slate-900 dark:text-white truncate">
                      {historyModalSeller.name}
                    </h3>

                    {/* Member ID & Year Badge */}
                    {(() => {
                      const memberId = historyModalSeller.memberId || getSellerMemberId(historyModalSeller, sellers);
                      const sYear = getSellerYear(historyModalSeller);
                      return (
                        <div className="flex items-center space-x-1.5">
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-black bg-indigo-100 text-indigo-900 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-700 shadow-2xs flex items-center space-x-1">
                            <span className="text-[10px] text-indigo-600 dark:text-indigo-400">আইডি:</span>
                            <span>{memberId}</span>
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                            {toBengaliNumber(sYear)} সাল
                          </span>
                        </div>
                      );
                    })()}

                    {/* Member Role Badge (বিক্রেতা / ক্রেতা) */}
                    {(() => {
                      const isSeller = sellers.some(s => s.id === historyModalSeller.id || (s.phone && s.phone === historyModalSeller.phone));
                      const isBuyer = parties.some(p => p.id === historyModalSeller.id || (p.phone && p.phone === historyModalSeller.phone));
                      if (isSeller && isBuyer) {
                        return (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-gradient-to-r from-emerald-500 to-indigo-600 text-white shadow-2xs">
                            🌾 ধান বিক্রেতা ও ক্রেতা
                          </span>
                        );
                      }
                      if (isBuyer) {
                        return (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800 shadow-2xs">
                            🛒 চাল ক্রেতা (পার্টি)
                          </span>
                        );
                      }
                      return (
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 shadow-2xs">
                          🌾 ধান বিক্রেতা
                        </span>
                      );
                    })()}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center space-x-1.5 font-bold mt-0.5">
                    <span>{historyModalSeller.phone}</span>
                    {historyModalSeller.village && <span>• গ্রাম: {historyModalSeller.village}</span>}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setHistoryModalSeller(null)}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 font-bold text-xs cursor-pointer active:scale-95 transition"
                >
                  ✕ {t('বন্ধ করুন', 'Close')}
                </button>
              </div>
            </div>

            {/* Scrollable Body (Guaranteed internal scroll with min-h-0 and overscroll-contain) */}
            <div 
              className="p-5 sm:p-6 space-y-5 overflow-y-auto overscroll-contain flex-1 min-h-0 touch-pan-y"
              onWheel={e => e.stopPropagation()}
            >
              {(() => {
                const stats = getSellerStats(historyModalSeller.id);
                const sellerMemos = purchases
                  .filter(p => p.sellerId === historyModalSeller.id || (historyModalSeller.phone && p.sellerPhone === historyModalSeller.phone))
                  .sort((a, b) => new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime());

                return (
                  <>
                    {/* Summary Cards with Hover Animations */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="bg-indigo-50/80 dark:bg-slate-800 border-2 border-indigo-200 dark:border-slate-700 p-3.5 rounded-2xl transform hover:-translate-y-1 hover:shadow-lg hover:border-indigo-400 dark:hover:border-indigo-500 transition-all duration-300 group cursor-default">
                        <span className="text-[10px] font-black text-indigo-700 dark:text-indigo-400 uppercase block group-hover:scale-105 transition-transform origin-left">মোট সরবরাহ ধান</span>
                        <div className="text-xl font-black text-slate-900 dark:text-white mt-1">
                          {toBengaliNumber(stats.totalMon.toFixed(1))} মণ
                        </div>
                      </div>

                      <div className="bg-emerald-50/80 dark:bg-slate-800 border-2 border-emerald-200 dark:border-slate-700 p-3.5 rounded-2xl transform hover:-translate-y-1 hover:shadow-lg hover:border-emerald-400 dark:hover:border-emerald-500 transition-all duration-300 group cursor-default">
                        <span className="text-[10px] font-black text-emerald-800 dark:text-emerald-400 uppercase block group-hover:scale-105 transition-transform origin-left">মোট ক্রয় মূল্য</span>
                        <div className="text-xl font-black text-emerald-800 dark:text-emerald-400 mt-1">
                          {formatCurrency(stats.totalBill)}
                        </div>
                      </div>

                      <div className="bg-blue-50/80 dark:bg-slate-800 border-2 border-blue-200 dark:border-slate-700 p-3.5 rounded-2xl transform hover:-translate-y-1 hover:shadow-lg hover:border-blue-400 dark:hover:border-blue-500 transition-all duration-300 group cursor-default">
                        <span className="text-[10px] font-black text-blue-800 dark:text-blue-400 uppercase block group-hover:scale-105 transition-transform origin-left">মোট পরিশোধিত</span>
                        <div className="text-xl font-black text-blue-800 dark:text-blue-400 mt-1">
                          {formatCurrency(stats.totalPaid)}
                        </div>
                      </div>

                      <div className={`p-3.5 rounded-2xl border-2 transform hover:-translate-y-1 hover:shadow-lg transition-all duration-300 group cursor-default ${stats.currentDue > 0 ? 'bg-rose-50/80 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 hover:border-rose-500' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-emerald-400'}`}>
                        <span className="text-[10px] font-black text-rose-800 dark:text-rose-400 uppercase block group-hover:scale-105 transition-transform origin-left">বর্তমান বকেয়া</span>
                        <div className={`text-xl font-black mt-1 ${stats.currentDue > 0 ? 'text-rose-700 dark:text-rose-400' : 'text-emerald-700 dark:text-emerald-400'}`}>
                          {formatCurrency(stats.currentDue)}
                        </div>
                      </div>
                    </div>

                    {/* Memos List with Per-Memo Paid & Due breakdown */}
                    <div className="space-y-2 pt-2">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <h4 className="font-black text-xs uppercase text-slate-800 dark:text-slate-200 tracking-wider">
                          আইটেমভিত্তিক ধান কেনা চালান তালিকা ({toBengaliNumber(sellerMemos.length)})
                        </h4>
                        <button
                          type="button"
                          onClick={() => handlePrintFullSellerStatement({ ...historyModalSeller, memberId: historyModalSeller.memberId || getSellerMemberId(historyModalSeller, sellers) })}
                          className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-md transition flex items-center space-x-1.5 cursor-pointer active:scale-95 hover:scale-105"
                          title="সম্পূর্ণ খতিয়ান ও মেমো তালিকা সুন্দরভাবে প্রিন্ট করুন"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>{t('সম্পূর্ণ প্রিন্ট', 'Full Print')}</span>
                        </button>
                      </div>

                      <div className="border-2 border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden hover:border-slate-400 dark:hover:border-slate-700 transition-all duration-200 shadow-xs hover:shadow-md">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-black border-b border-slate-200 dark:border-slate-700">
                            <tr>
                              <th className="py-2.5 px-3">তারিখ</th>
                              <th className="py-2.5 px-3">মেমো নং</th>
                              <th className="py-2.5 px-3">ধানের জাত</th>
                              <th className="py-2.5 px-3 text-right">পরিমাণ (মণ)</th>
                              <th className="py-2.5 px-3 text-right">দর (৳)</th>
                              <th className="py-2.5 px-3 text-right">মোট বিল</th>
                              <th className="py-2.5 px-3 text-right text-emerald-700 dark:text-emerald-400">পরিশোধিত (৳)</th>
                              <th className="py-2.5 px-3 text-right text-rose-700 dark:text-rose-400">অবশিষ্ট দেনা (৳)</th>
                              <th className="py-2.5 px-3 text-center">রসিদ</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                            {sellerMemos.length === 0 ? (
                              <tr>
                                <td colSpan={9} className="py-8 text-center text-slate-400 font-bold">
                                  {t('এই বিক্রেতার কোনো পূর্ববর্তী মেমো নেই।', 'No historical memos.')}
                                </td>
                              </tr>
                            ) : (
                              sellerMemos.map(m => {
                                const live = memoKhotiyanBalances.get(m.id);
                                const total = m.totalBill || m.totalAmount || 0;
                                const memoPaid = live ? live.allocatedPaid : (m.instantPayment || m.paidAmount || 0);
                                const memoDue = live ? live.remainingDue : Math.max(0, total - memoPaid);

                                return (
                                  <tr key={m.id} className="hover:bg-amber-50/50 dark:hover:bg-slate-800/60 transition-colors">
                                    <td className="py-2.5 px-3 font-mono font-bold text-slate-600 dark:text-slate-400">{m.date}</td>
                                    <td className="py-2.5 px-3 font-mono font-black text-amber-700 dark:text-amber-300">{m.invoiceNumber}</td>
                                    <td className="py-2.5 px-3 font-bold text-emerald-700 dark:text-emerald-400">{m.paddyType || m.varietyName}</td>
                                    <td className="py-2.5 px-3 text-right font-black text-slate-900 dark:text-white">
                                      {toBengaliNumber((m.totalMon || m.quantityMon || 0).toFixed(1))} মণ
                                    </td>
                                    <td className="py-2.5 px-3 text-right font-bold text-slate-700 dark:text-slate-300">৳{toBengaliNumber(m.ratePerMon)}</td>
                                    <td className="py-2.5 px-3 text-right font-black text-slate-900 dark:text-slate-100">{formatCurrency(total)}</td>
                                    <td className="py-2.5 px-3 text-right font-black text-emerald-700 dark:text-emerald-400">{formatCurrency(memoPaid)}</td>
                                    <td className="py-2.5 px-3 text-right font-black">
                                      {memoDue > 0 ? (
                                        <span className="text-rose-600 dark:text-rose-400">{formatCurrency(memoDue)}</span>
                                      ) : (
                                        <span className="text-slate-400 dark:text-slate-500 font-semibold">৳ 0</span>
                                      )}
                                    </td>
                                    <td className="py-2.5 px-3 text-center">
                                      <button
                                        type="button"
                                        onClick={() => onViewReceipt('purchase', m)}
                                        className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-emerald-100 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 cursor-pointer active:scale-90 transition-transform"
                                        title="মেমো প্রিন্ট"
                                      >
                                        <Printer className="w-3.5 h-3.5 text-emerald-600" />
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
                  </>
                );
              })()}
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-100 dark:bg-slate-800 border-t-2 border-slate-200 dark:border-slate-700 flex items-center justify-end shrink-0">
              <button
                type="button"
                onClick={() => setHistoryModalSeller(null)}
                className="px-5 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-900 dark:text-white font-bold text-xs cursor-pointer shadow-xs active:scale-95 transition"
              >
                {t('বন্ধ করুন', 'Close')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: FULL SELLER STATEMENT PRINT MODAL (100% RELIABLE PRINTING) */}
      {/* ========================================================================= */}
      {printingSeller && (() => {
        const stats = getSellerStats(printingSeller.id);
        const sellerMemberId = printingSeller.memberId || getSellerMemberId(printingSeller, sellers);
        const sellerYear = getSellerYear(printingSeller);
        const sellerMemos = purchases
          .filter(p => p.sellerId === printingSeller.id || (printingSeller.phone && p.sellerPhone === printingSeller.phone))
          .sort((a, b) => new Date(a.createdAt || a.date).getTime() - new Date(b.createdAt || b.date).getTime());
        
        const sellerPayments = payments
          .filter(pay => pay.sellerId === printingSeller.id || (pay as unknown as { entityId?: string }).entityId === printingSeller.id)
          .sort((a, b) => new Date(a.createdAt || a.date).getTime() - new Date(b.createdAt || b.date).getTime());

        const isSeller = sellers.some(s => s.id === printingSeller.id || (s.phone && s.phone === printingSeller.phone));
        const isBuyer = parties.some(p => p.id === printingSeller.id || (p.phone && p.phone === printingSeller.phone));
        const memberRole = isSeller && isBuyer ? 'ধান বিক্রেতা ও ক্রেতা' : isBuyer ? 'চাল ক্রেতা (পার্টি)' : 'ধান বিক্রেতা';

        const statementText = `*${settings.businessName || 'মেসার্স সোনার বাংলা ধান আড়ত'}*\n📄 *সদস্য খতিয়ান হিসাব বিবরণী*\n🆔 সদস্য আইডি: ${sellerMemberId}\n👤 নাম: ${printingSeller.name} (${printingSeller.phone || '---'})\n📍 গ্রাম/ঠিকানা: ${printingSeller.village || 'উল্লেখ নেই'}\n🌾 মোট সরবরাহকৃত ধান: ${toBengaliNumber(stats.totalMon.toFixed(1))} মণ\n💵 মোট বিক্রয় মূল্য: ৳${toBengaliNumber(stats.totalBill)}\n💳 মোট পরিশোধ: ৳${toBengaliNumber(stats.totalPaid)}\n⚠️ বর্তমান অবশিষ্ট বকেয়া: ৳${toBengaliNumber(stats.currentDue)}\n📅 রিপোর্ট তারিখ: ${new Date().toLocaleDateString('bn-BD')}\n${settings.invoiceFooterNote || 'ধন্যবাদ।'}`;

        const statementWhatsAppUrl = getWhatsAppShareUrl(printingSeller.phone || '', statementText);
        const statementDirectSMSUrl = getDirectSMSUrl(printingSeller.phone || '', statementText);

        const handleStatementA4 = () => {
          playPrintSound();
          try {
            window.print();
          } catch (e) {
            console.warn(e);
          }
        };

        const handleStatementThermal = () => {
          playPrintSound();
          const thermalHtml = `
            <div style="text-align: center; font-family: monospace; font-size: 12px;">
              <div style="font-weight: bold; font-size: 14px;">${settings.businessName}</div>
              <div style="font-size: 10px;">${settings.address} | মোবা: ${settings.phone}</div>
              <div style="border-bottom: 1px dashed #000; margin: 4px 0;"></div>
              <div style="font-weight: bold;">সদস্য খতিয়ান হিসাব বিবরণী</div>
              <div style="font-size: 10px;">আইডি: ${sellerMemberId} | তারিখ: ${new Date().toLocaleDateString('bn-BD')}</div>
              <div style="border-bottom: 1px dashed #000; margin: 4px 0;"></div>
            </div>
            <div style="font-size: 11px; font-family: monospace; line-height: 1.4;">
              <div><strong>সদস্য আইডি:</strong> ${sellerMemberId}</div>
              <div><strong>নাম:</strong> ${printingSeller.name}</div>
              <div><strong>ফোন:</strong> ${printingSeller.phone || '---'}</div>
              <div><strong>গ্রাম:</strong> ${printingSeller.village || '---'}</div>
              <div style="border-bottom: 1px dashed #000; margin: 4px 0;"></div>
              <div style="display: flex; justify-content: space-between;"><span>মোট ধান:</span><span>${toBengaliNumber(stats.totalMon.toFixed(1))} মণ</span></div>
              <div style="display: flex; justify-content: space-between;"><span>মোট ক্রয় বিল:</span><span>৳ ${stats.totalBill.toLocaleString('en-IN')}</span></div>
              <div style="display: flex; justify-content: space-between;"><span>মোট পরিশোধ:</span><span>৳ ${stats.totalPaid.toLocaleString('en-IN')}</span></div>
              <div style="border-bottom: 1px dashed #000; margin: 4px 0;"></div>
              <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 12px;"><span>অবশিষ্ট বকেয়া:</span><span>৳ ${stats.currentDue.toLocaleString('en-IN')}</span></div>
            </div>
            <div style="border-top: 1px dashed #000; margin-top: 8px; padding-top: 4px; text-align: center; font-size: 10px; font-family: monospace;">
              ${settings.invoiceFooterNote || 'ধন্যবাদ।'}
            </div>
          `;
          printThermalReceipt(thermalHtml, settings.thermalPrinterWidth || 58);
        };

        const handleSendStatementSMS = async () => {
          if (!printingSeller.phone) {
            alert('বিক্রেতার মোবাইল নম্বর নেই');
            return;
          }
          setStatementSmsSending(true);
          setStatementSmsResult(null);
          try {
            const res = await sendGatewaySMS(printingSeller.phone, statementText, settings);
            if (res.success) {
              setStatementSmsResult(`সফলভাবে SMS পাঠানো হয়েছে!`);
            } else {
              setStatementSmsResult(`ত্রুটি: ${res.error || 'পাঠানো যায়নি'}`);
            }
          } catch {
            setStatementSmsResult('SMS গেটওয়েতে সমস্যা দেখা দিয়েছে');
          } finally {
            setStatementSmsSending(false);
          }
        };

        return (
          <div 
            className="fixed inset-0 z-[60] bg-black/85 backdrop-blur-xs flex flex-col items-center justify-start p-2 sm:p-4 overflow-y-auto overscroll-contain"
            onClick={() => setPrintingSeller(null)}
            onWheel={e => e.stopPropagation()}
          >
            <div 
              className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-4xl w-full my-auto overflow-hidden animate-in zoom-in-95 duration-150"
              onClick={e => e.stopPropagation()}
              onWheel={e => e.stopPropagation()}
            >
              {/* Top Action Bar with A4, Thermal, WhatsApp, SMS, Close */}
              <div className="bg-slate-900 text-white px-4 sm:px-6 py-3.5 border-b border-slate-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                <div className="flex items-center space-x-2.5">
                  <Printer className="w-5 h-5 text-amber-300 shrink-0" />
                  <div>
                    <h3 className="font-black text-sm sm:text-base text-white">
                      {t('হিসাব বিবরণী প্রিন্ট ও ডিজিটাল শেয়ার', 'Statement Print & Share')}
                    </h3>
                    <p className="text-[11px] font-bold text-slate-400">
                      {printingSeller.name} ({printingSeller.phone || '---'})
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* A4 Print */}
                  <button
                    type="button"
                    onClick={handleStatementA4}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-black text-xs shadow-md transition flex items-center space-x-1.5 cursor-pointer active:scale-95 border border-slate-700 hover:border-slate-500"
                    title="A4 সাইজ ফরম্যাটে পূর্ণাঙ্গ হিসাব প্রিন্ট / PDF"
                  >
                    <FileText className="w-3.5 h-3.5 text-sky-400" />
                    <span>A4 মেমো / PDF</span>
                  </button>

                  {/* Thermal Print */}
                  <button
                    type="button"
                    onClick={handleStatementThermal}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-md transition flex items-center space-x-1.5 cursor-pointer active:scale-95"
                    title="থার্মাল রসিদ প্রিন্টার দিয়ে প্রিন্ট করুন"
                  >
                    <Printer className="w-3.5 h-3.5 text-amber-300" />
                    <span>থার্মাল ({settings.thermalPrinterWidth || 58}mm)</span>
                  </button>

                  {/* WhatsApp */}
                  <a
                    href={statementWhatsAppUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs shadow-md transition flex items-center space-x-1.5 cursor-pointer active:scale-95"
                    title="হোয়াটসঅ্যাপে সম্পূর্ণ হিসাব বিবরণী পাঠান"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>WhatsApp</span>
                  </a>

                  {/* Mobile SMS */}
                  <a
                    href={statementDirectSMSUrl}
                    className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition flex items-center space-x-1.5 cursor-pointer active:scale-95"
                    title="মোবাইলের SMS অ্যাপে খুলুন"
                  >
                    <Smartphone className="w-3.5 h-3.5 text-blue-200" />
                    <span>মেসেজ</span>
                  </a>

                  {/* Gateway SMS */}
                  {printingSeller.phone && (
                    <button
                      type="button"
                      disabled={statementSmsSending}
                      onClick={handleSendStatementSMS}
                      className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-md transition flex items-center space-x-1.5 cursor-pointer active:scale-95 disabled:opacity-50"
                      title="অনলাইন গেটওয়ে দিয়ে সরাসরি SMS পাঠান"
                    >
                      <Send className="w-3.5 h-3.5 text-slate-950" />
                      <span>{statementSmsSending ? 'পাঠানো হচ্ছে...' : 'SMS পাঠান'}</span>
                    </button>
                  )}

                  {/* Close */}
                  <button
                    type="button"
                    onClick={() => {
                      setPrintingSeller(null);
                      setStatementSmsResult(null);
                    }}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs cursor-pointer border border-slate-700"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {statementSmsResult && (
                <div className="bg-emerald-50 dark:bg-emerald-950/60 border-b border-emerald-300 dark:border-emerald-800 px-5 py-2 text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
                  <span>{statementSmsResult}</span>
                  <button type="button" onClick={() => setStatementSmsResult(null)} className="text-slate-400 hover:text-slate-600">✕</button>
                </div>
              )}

              {/* Printable Sheet */}
              <div id="statement-print-sheet" className="p-6 sm:p-8 bg-white text-slate-950 font-sans">
                <style>{`
                  @media print {
                    body * { visibility: hidden !important; }
                    #statement-print-sheet, #statement-print-sheet * { visibility: visible !important; }
                    #statement-print-sheet {
                      position: fixed !important;
                      left: 0 !important;
                      top: 0 !important;
                      width: 100% !important;
                      margin: 0 !important;
                      padding: 12mm !important;
                      background: white !important;
                      color: #0f172a !important;
                      z-index: 99999999 !important;
                    }
                  }
                `}</style>
                <div>
                    {/* Header */}
                    <div className="text-center border-b-2 border-slate-900 pb-3 mb-4">
                      <h2 className="text-2xl font-black text-slate-950 tracking-tight">
                        {settings.businessName || 'মেসার্স সোনার বাংলা ধান আড়ত ও চাতাল'}
                      </h2>
                      <p className="text-xs text-slate-600 mt-1">
                        প্রোপ্রাইটর: {settings.proprietor || 'হাজী মো: রফিকুল ইসলাম'} | মোবাইল: {settings.phone || '01700000000'} | {settings.address || 'শেরপুর সদর, শেরপুর'}
                      </p>
                      <div className="inline-block mt-2 px-3 py-1 bg-slate-100 border border-slate-300 rounded-full font-black text-xs text-slate-800">
                        সদস্য খতিয়ান ও সম্পূর্ণ বিক্রয় হিসাব বিবরণী
                      </div>
                    </div>

                    {/* Member Info */}
                    <div className="flex flex-col sm:flex-row justify-between bg-slate-50 border border-slate-200 rounded-xl p-3 mb-4 text-xs">
                      <div>
                        <div><strong>সদস্যের নাম:</strong> {printingSeller.name} <span className="inline-block ml-2 px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-black text-[11px]">{memberRole}</span></div>
                        <div className="mt-1"><strong>সদস্য আইডি:</strong> <span className="font-mono font-bold text-indigo-950 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">{sellerMemberId}</span></div>
                        <div className="mt-1"><strong>মোবাইল:</strong> {printingSeller.phone || '---'}</div>
                        <div className="mt-1"><strong>ঠিকানা/গ্রাম:</strong> {printingSeller.village || 'উল্লেখ নেই'}</div>
                      </div>
                      <div className="mt-2 sm:mt-0 sm:text-right">
                        <div><strong>সদস্য সাল:</strong> {toBengaliNumber(sellerYear)} সাল</div>
                        <div className="mt-1"><strong>রিপোর্ট তারিখ:</strong> {new Date().toLocaleDateString('bn-BD')}</div>
                        <div className="mt-1"><strong>মোট মেমো সংখ্যা:</strong> {sellerMemos.length} টি</div>
                        <div className="mt-1"><strong>খতিয়ান অবস্থা:</strong> {stats.currentDue > 0 ? <span className="text-rose-700 font-black">বকেয়া পাওনাদার</span> : <span className="text-emerald-700 font-black">সম্পূর্ণ পরিশোধিত</span>}</div>
                      </div>
                    </div>

                    {/* 4 Summary Stats */}
                    <div className="grid grid-cols-4 gap-2 mb-4">
                      <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-2.5 text-center">
                        <div className="text-[10px] text-indigo-700 font-bold uppercase">মোট সরবরাহ ধান</div>
                        <div className="text-sm sm:text-base font-black text-indigo-950 mt-0.5">{toBengaliNumber(stats.totalMon.toFixed(1))} মণ</div>
                      </div>
                      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2.5 text-center">
                        <div className="text-[10px] text-emerald-800 font-bold uppercase">মোট ক্রয় মূল্য</div>
                        <div className="text-sm sm:text-base font-black text-emerald-950 mt-0.5">{formatCurrency(stats.totalBill)}</div>
                      </div>
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-2.5 text-center">
                        <div className="text-[10px] text-blue-800 font-bold uppercase">মোট পরিশোধিত</div>
                        <div className="text-sm sm:text-base font-black text-blue-950 mt-0.5">{formatCurrency(stats.totalPaid)}</div>
                      </div>
                      <div className={`rounded-lg p-2.5 text-center border ${stats.currentDue > 0 ? 'bg-rose-50 border-rose-200' : 'bg-slate-50 border-slate-200'}`}>
                        <div className="text-[10px] font-bold uppercase text-slate-700">বর্তমান বকেয়া পাওনা</div>
                        <div className={`text-sm sm:text-base font-black mt-0.5 ${stats.currentDue > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>{formatCurrency(stats.currentDue)}</div>
                      </div>
                    </div>

                    {/* Memos Table */}
                    <h4 className="font-bold text-xs uppercase text-slate-800 border-b border-slate-300 pb-1 mb-2">
                      আইটেমভিত্তিক ধান বিক্রয়/ক্রয়ের মেমো তালিকা
                    </h4>
                    <table className="w-full text-left text-[11px] border border-slate-200 mb-4">
                      <thead className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                        <tr>
                          <th className="py-2 px-2.5">তারিখ</th>
                          <th className="py-2 px-2.5">মেমো নং</th>
                          <th className="py-2 px-2.5">ধানের জাত</th>
                          <th className="py-2 px-2.5 text-right">পরিমাণ</th>
                          <th className="py-2 px-2.5 text-right">দর</th>
                          <th className="py-2 px-2.5 text-right">মোট বিল</th>
                          <th className="py-2 px-2.5 text-right">পরিশোধ</th>
                          <th className="py-2 px-2.5 text-right">অবশিষ্ট দেনা</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {sellerMemos.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="py-4 text-center text-slate-400">কোনো মেমো পাওয়া যায়নি</td>
                          </tr>
                        ) : (
                          sellerMemos.map(m => {
                            const live = memoKhotiyanBalances.get(m.id);
                            const total = m.totalBill || m.totalAmount || 0;
                            const memoPaid = live ? live.allocatedPaid : (m.instantPayment || m.paidAmount || 0);
                            const memoDue = live ? live.remainingDue : Math.max(0, total - memoPaid);
                            return (
                              <tr key={m.id}>
                                <td className="py-1.5 px-2.5 font-mono">{m.date}</td>
                                <td className="py-1.5 px-2.5 font-mono font-bold">{m.invoiceNumber}</td>
                                <td className="py-1.5 px-2.5">{m.paddyType || m.varietyName || 'ধান'}</td>
                                <td className="py-1.5 px-2.5 text-right">{(m.totalMon || m.quantityMon || 0).toFixed(1)} মণ ({m.bags || 0} বস্তা)</td>
                                <td className="py-1.5 px-2.5 text-right">৳{m.ratePerMon}</td>
                                <td className="py-1.5 px-2.5 text-right font-bold">{formatCurrency(total)}</td>
                                <td className="py-1.5 px-2.5 text-right text-emerald-700 font-bold">{formatCurrency(memoPaid)}</td>
                                <td className={`py-1.5 px-2.5 text-right font-bold ${memoDue > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>{formatCurrency(memoDue)}</td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>

                    {/* Payments Table if any */}
                    {sellerPayments.length > 0 && (
                      <div className="mb-4">
                        <h4 className="font-bold text-xs uppercase text-slate-800 border-b border-slate-300 pb-1 mb-2">
                          খতিয়ান নগদ পরিশোধ / ভাউচার তালিকা
                        </h4>
                        <table className="w-full text-left text-[11px] border border-slate-200">
                          <thead className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                            <tr>
                              <th className="py-2 px-2.5">তারিখ</th>
                              <th className="py-2 px-2.5">ভাউচার নং</th>
                              <th className="py-2 px-2.5">পদ্ধতি</th>
                              <th className="py-2 px-2.5">বিবরণ / নোট</th>
                              <th className="py-2 px-2.5 text-right">পরিশোধিত টাকা</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200">
                            {sellerPayments.map(p => (
                              <tr key={p.id}>
                                <td className="py-1.5 px-2.5 font-mono">{p.date}</td>
                                <td className="py-1.5 px-2.5 font-mono font-bold">{p.receiptNumber || 'VOUCHER'}</td>
                                <td className="py-1.5 px-2.5">{p.paymentMethod || 'Cash'}</td>
                                <td className="py-1.5 px-2.5">{p.note || 'খতিয়ান পরিশোধ'}</td>
                                <td className="py-1.5 px-2.5 text-right font-bold text-emerald-700">{formatCurrency(p.amount || 0)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Signatures */}
                    <div className="mt-8 pt-4 flex justify-between text-xs text-slate-600 border-t border-dashed border-slate-300">
                      <div className="text-center w-36 border-t border-slate-400 pt-1">বিক্রেতার স্বাক্ষর</div>
                      <div className="text-center w-36 border-t border-slate-400 pt-1">ম্যানেজার / ক্যাশিয়ার</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

      {/* Confirmation Modal for Deleting Memo */}
      <ConfirmationModal
        isOpen={Boolean(deleteMemoTarget)}
        title={t('মেমো মুছে ফেলার নিশ্চিতকরণ', 'Delete Memo Confirmation')}
        message={t('আপনি কি নিশ্চিতভাবে এই ধান ক্রয়ের মেমোটি মুছে ফেলতে চান?', 'Are you sure you want to delete this memo?')}
        itemDetails={deleteMemoTarget ? `মেমো #${deleteMemoTarget.invoiceNumber} • বিক্রেতা: ${deleteMemoTarget.sellerName} • মোট বিল: ${formatCurrency(deleteMemoTarget.totalBill || deleteMemoTarget.totalAmount || 0)}` : ''}
        onConfirm={async () => {
          if (deleteMemoTarget) {
            await deletePurchase(deleteMemoTarget.id);
            setDeleteMemoTarget(null);
          }
        }}
        onCancel={() => setDeleteMemoTarget(null)}
      />

      {/* Confirmation Modal for Deleting Seller */}
      <ConfirmationModal
        isOpen={Boolean(deleteSellerTarget)}
        title={t('বিক্রেতা মুছে ফেলার নিশ্চিতকরণ', 'Delete Seller Confirmation')}
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

      {/* ========================================================================= */}
      {/* 5. GENTLE RED AMBIENT GLOW VIGNETTE ON VALIDATION ERROR */}
      {/* ========================================================================= */}
      {showRedAmbientGlow && (
        <div 
          className="fixed inset-0 pointer-events-none z-[9999] animate-red-ambient shadow-[inset_0_0_120px_rgba(244,63,94,0.32)] ring-8 ring-inset ring-rose-500/25"
          aria-hidden="true"
        />
      )}

      {/* ========================================================================= */}
      {/* 6. FIXED FLOATING 3-DOT ACTION MENU (PORTAL: ZERO TABLE CLIPPING & JUMPING) */}
      {/* ========================================================================= */}
      {floatingMenu && typeof document !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 z-[9990] select-none" 
          onClick={(e) => {
            e.stopPropagation();
            setFloatingMenu(null);
          }}
        >
          {/* Transparent Backdrop Click Catcher */}
          <div className="fixed inset-0 bg-transparent" />

          {/* Floating Menu Popover */}
          <div
            onClick={e => e.stopPropagation()}
            style={{
              position: 'fixed',
              top: floatingMenu.top !== undefined ? `${floatingMenu.top}px` : undefined,
              bottom: floatingMenu.bottom !== undefined ? `${floatingMenu.bottom}px` : undefined,
              right: `${floatingMenu.right}px`,
            }}
            className="w-48 rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 shadow-2xl py-1.5 text-xs text-left font-bold animate-in fade-in zoom-in-95 duration-100 divide-y divide-slate-100 dark:divide-slate-800 z-[9995]"
          >
            {floatingMenu.type === 'memo' ? (
              <>
                <div className="py-1">
                  <button
                    type="button"
                    onClick={() => {
                      const item = floatingMenu.item as PurchaseMemo;
                      setFloatingMenu(null);
                      onViewReceipt('purchase', item);
                    }}
                    className="w-full px-3.5 py-2 text-slate-700 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-slate-800 hover:text-emerald-600 dark:hover:text-emerald-400 flex items-center space-x-2.5 transition cursor-pointer"
                  >
                    <Printer className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>প্রিন্ট ও প্রিভিউ</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const item = floatingMenu.item as PurchaseMemo;
                      setFloatingMenu(null);
                      handleShareMemoWhatsApp(item);
                    }}
                    className="w-full px-3.5 py-2 text-slate-700 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-slate-800 hover:text-emerald-600 dark:hover:text-emerald-400 flex items-center space-x-2.5 transition cursor-pointer"
                  >
                    <Share2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>হোয়াটসঅ্যাপে শেয়ার</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const item = floatingMenu.item as PurchaseMemo;
                      setFloatingMenu(null);
                      setHistoryModalSeller({ id: item.sellerId, name: item.sellerName || 'বিক্রেতা', phone: item.sellerPhone || '', village: item.sellerVillage });
                    }}
                    className="w-full px-3.5 py-2 text-slate-700 dark:text-slate-200 hover:bg-amber-50 dark:hover:bg-slate-800 hover:text-amber-600 dark:hover:text-amber-400 flex items-center space-x-2.5 transition cursor-pointer"
                  >
                    <Eye className="w-4 h-4 text-amber-500 shrink-0" />
                    <span>খতিয়ান ও প্রোফাইল</span>
                  </button>
                </div>

                <div className="py-1">
                  <button
                    type="button"
                    onClick={() => {
                      const item = floatingMenu.item as PurchaseMemo;
                      setFloatingMenu(null);
                      setDeleteMemoTarget(item);
                    }}
                    className="w-full px-3.5 py-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center space-x-2.5 transition cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4 text-rose-500 shrink-0" />
                    <span>মেমো মুছুন</span>
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="py-1">
                  <button
                    type="button"
                    onClick={() => {
                      const item = floatingMenu.item as Seller;
                      setFloatingMenu(null);
                      handleOpenPurchaseForSeller(item.id);
                    }}
                    className="w-full px-3.5 py-2 text-slate-700 dark:text-slate-200 hover:bg-amber-50 dark:hover:bg-slate-800 hover:text-amber-600 dark:hover:text-amber-400 flex items-center space-x-2.5 transition cursor-pointer"
                  >
                    <Sprout className="w-4 h-4 text-amber-500 shrink-0" />
                    <span>নতুন ধান কেনা</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const item = floatingMenu.item as Seller;
                      setFloatingMenu(null);
                      setHistoryModalSeller({ id: item.id, name: item.name, phone: item.phone || '', village: item.village, memberId: (item as any).memberId });
                    }}
                    className="w-full px-3.5 py-2 text-slate-700 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-slate-800 hover:text-emerald-600 dark:hover:text-emerald-400 flex items-center space-x-2.5 transition cursor-pointer"
                  >
                    <Eye className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>সকল লেনদেন ও খতিয়ান</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const item = floatingMenu.item as Seller;
                      setFloatingMenu(null);
                      handlePrintFullSellerStatement(item);
                    }}
                    className="w-full px-3.5 py-2 text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-slate-800 hover:text-blue-600 dark:hover:text-blue-400 flex items-center space-x-2.5 transition cursor-pointer"
                  >
                    <Printer className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                    <span>সম্পূর্ণ হিসাব প্রিন্ট</span>
                  </button>
                </div>

                {Boolean((floatingMenu.item as Seller).phone) && (
                  <div className="py-1">
                    <a
                      href={`tel:${(floatingMenu.item as Seller).phone}`}
                      onClick={() => setFloatingMenu(null)}
                      className="w-full px-3.5 py-2 text-slate-700 dark:text-slate-200 hover:bg-sky-50 dark:hover:bg-slate-800 hover:text-sky-600 flex items-center space-x-2.5 transition"
                    >
                      <Phone className="w-4 h-4 text-sky-500 shrink-0" />
                      <span>কল করুন</span>
                    </a>

                    <a
                      href={`https://wa.me/88${((floatingMenu.item as Seller).phone || '').replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setFloatingMenu(null)}
                      className="w-full px-3.5 py-2 text-slate-700 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-slate-800 hover:text-emerald-600 flex items-center space-x-2.5 transition"
                    >
                      <Share2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>WhatsApp বার্তা</span>
                    </a>
                  </div>
                )}

                <div className="py-1">
                  <button
                    type="button"
                    onClick={() => {
                      const item = floatingMenu.item as Seller;
                      setFloatingMenu(null);
                      setDeleteSellerTarget(item);
                    }}
                    className="w-full px-3.5 py-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center space-x-2.5 transition cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4 text-rose-500 shrink-0" />
                    <span>বিক্রেতা মুছুন</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* 7. COMPACT FLOATING SCROLL-TO-TOP BUTTON (ARROW ONLY, ZERO TEXT, OUT OF WAY OF 3-DOT) */}
      {showScrollTop && typeof document !== 'undefined' && createPortal(
        <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-30 animate-in fade-in zoom-in-95 duration-200">
          <button
            type="button"
            onClick={scrollToTop}
            title={t('উপরে ফিরে যান', 'Scroll back to top')}
            className="group relative w-11 h-11 rounded-full bg-gradient-to-tr from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-400 text-white shadow-xl shadow-emerald-950/20 dark:shadow-black/50 border-2 border-emerald-300/80 hover:border-white hover:scale-110 active:scale-90 transition-all duration-200 cursor-pointer flex items-center justify-center p-0"
          >
            {/* Subtle radar ping pulse */}
            <span className="absolute inset-0 rounded-full bg-emerald-400 opacity-20 animate-ping pointer-events-none" />
            <ArrowUp className="w-5 h-5 transition-transform duration-200 group-hover:-translate-y-0.5 relative z-10" />
          </button>
        </div>,
        document.body
      )}
    </div>
  );
};
