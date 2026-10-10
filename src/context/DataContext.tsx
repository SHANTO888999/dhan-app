import React, { createContext, useContext, useState, useMemo } from 'react';
import { 
  PaddyVariety, 
  Seller, 
  PurchaseMemo, 
  Buyer, 
  Sale, 
  PaymentRecord, 
  CashLog, 
  BusinessSettings 
} from '../types';
import { calculateAmount } from '../utils/weight';

export interface SellerStats {
  totalMon: number;
  totalBags: number;
  totalBill: number;
  totalPaid: number;
  currentDue: number;
  memoCount: number;
  paymentCount: number;
  lastDate?: string;
}

interface DataContextType {
  varieties: PaddyVariety[];
  sellers: Seller[];
  farmers: Seller[];
  purchases: PurchaseMemo[];
  parties: Buyer[];
  sales: Sale[];
  payments: PaymentRecord[];
  cashLogs: CashLog[];
  settings: BusinessSettings;
  loadingData: boolean;

  // Central Ledger Engine
  getSellerStats: (sellerId: string) => SellerStats;
  totalPurchasedAmount: number;
  totalPurchasedMon: number;
  totalPaidAmount: number;
  totalCurrentDue: number;
  todayTotalPurchase: number;
  todayTotalMon: number;
  todayCashDisbursed: number;
  todayNewDueAdded: number;
  cashInHand: number;

  // Actions (Pure Synchronous State + LocalStorage)
  addVariety: (v: Omit<PaddyVariety, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateVariety: (id: string, v: Partial<PaddyVariety>) => Promise<void>;
  deleteVariety: (id: string) => Promise<void>;

  addSeller: (s: Omit<Seller, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateSeller: (id: string, s: Partial<Seller>) => Promise<void>;
  deleteSeller: (id: string) => Promise<void>;
  addFarmer: (f: Omit<Seller, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  deleteFarmer: (id: string) => Promise<void>;

  addPurchase: (p: {
    sellerId: string;
    sellerName?: string;
    sellerPhone?: string;
    sellerVillage?: string;
    varietyId?: string;
    paddyType: string;
    quantityMon: number;
    weightMon?: number;
    weightKg?: number;
    bags?: number;
    ratePerMon: number;
    totalBill?: number;
    instantPayment?: number;
    deductions?: number;
    laborCost?: number;
    date: string;
    time?: string;
    notes?: string;
  }) => Promise<{ id: string; invoiceNumber: string }>;
  deletePurchase: (id: string) => Promise<void>;

  addParty: (p: Omit<Buyer, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateParty: (id: string, p: Partial<Buyer>) => Promise<void>;
  deleteParty: (id: string) => Promise<void>;

  addSale: (s: Omit<Sale, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'challanNumber'>) => Promise<{ id: string; challanNumber: string }>;
  deleteSale: (id: string) => Promise<void>;

  recordSellerPayment: (params: {
    sellerId: string;
    amount: number;
    date: string;
    paymentMethod: 'Cash' | 'Bank' | 'Bkash';
    note?: string;
  }) => Promise<string>;
  deletePayment: (id: string) => Promise<void>;

  addCashEntry: (entry: Omit<CashLog, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  deleteCashEntry: (id: string) => Promise<void>;

  updateSettings: (s: Partial<BusinessSettings>) => Promise<void>;
  resetSampleData: () => Promise<void>;
}

const DEFAULT_SETTINGS: BusinessSettings = {
  id: 'default',
  businessName: 'মেসার্স সোনার বাংলা ধান আড়ত',
  proprietor: 'হাজী মো: রফিকুল ইসলাম',
  phone: '01712-345678',
  address: 'ধানের মোকাম রোড, শেরপুর, বগুড়া',
  smsAutoSendFarmer: false,
  smsAutoSendBuyer: false,
  thermalPrinterWidth: 58,
  invoiceFooterNote: 'সততাই ব্যবসার মূলধন। আমাদের সাথে ব্যবসার জন্য ধন্যবাদ।',
  lowStockAlertMon: 50,
  showMemoBags: false,
  showMemoLabor: false,
  showMemoDeductions: false,
  showMemoNotes: false,
  userId: 'local_user',
};

export const DEFAULT_VARIETIES: Omit<PaddyVariety, 'id' | 'userId' | 'createdAt' | 'updatedAt'>[] = [
  { name: 'কাটারীভোগ (Katari)', code: 'KAT', defaultPurchaseRate: 1450, defaultSaleRate: 1530, currentStockMon: 165, lowStockThreshold: 35, description: 'সুগন্ধি দিনাজপুরের কাটারি' },
  { name: 'ব্রি-২৮ (BR-28)', code: 'BR-28', defaultPurchaseRate: 1180, defaultSaleRate: 1250, currentStockMon: 340, lowStockThreshold: 60, description: 'বোরো মৌসুমের চিকন ধান' },
  { name: 'ব্রি-২৯ (BR-29)', code: 'BR-29', defaultPurchaseRate: 1120, defaultSaleRate: 1180, currentStockMon: 250, lowStockThreshold: 50, description: 'বোরো মৌসুমের অধিক ফলনশীল ধান' },
  { name: 'স্বর্ণা (Sharna)', code: 'SHR', defaultPurchaseRate: 1050, defaultSaleRate: 1100, currentStockMon: 480, lowStockThreshold: 80, description: 'মোটা ধান, সরকারি সংগ্রহ উপযোগী' },
  { name: 'মিনিকেট (Minikit)', code: 'MNK', defaultPurchaseRate: 1350, defaultSaleRate: 1420, currentStockMon: 210, lowStockThreshold: 50, description: 'উন্নত পলিশ চালের ধান' },
  { name: 'গুটি স্বর্ণা (Guti Sharna)', code: 'G-SHR', defaultPurchaseRate: 1040, defaultSaleRate: 1090, currentStockMon: 320, lowStockThreshold: 50, description: 'জনপ্রিয় গুটি স্বর্ণা ধান' },
  { name: 'নাজিরশাইল (Najirshail)', code: 'NJR', defaultPurchaseRate: 1400, defaultSaleRate: 1480, currentStockMon: 180, lowStockThreshold: 40, description: 'চিকন নাজিরশাইল ধান' },
  { name: 'জিরাশাইল (Jirashail)', code: 'JIR', defaultPurchaseRate: 1300, defaultSaleRate: 1370, currentStockMon: 190, lowStockThreshold: 45, description: 'চিকন প্রিমিয়াম ধান' },
  { name: 'পাইজাম (Paijam)', code: 'PAI', defaultPurchaseRate: 1150, defaultSaleRate: 1210, currentStockMon: 120, lowStockThreshold: 40, description: 'মাঝারি দানাদার ধান' },
];

const DEFAULT_SELLERS: Omit<Seller, 'id' | 'userId' | 'createdAt' | 'updatedAt'>[] = [
  { memberId: '2601', name: 'মো: আব্দুল করিম', phone: '01711223344', village: 'ভবানীপুর', address: 'ভবানীপুর, শেরপুর', notes: 'বোরো ও আমন ধান সরবরাহকারী' },
  { memberId: '2602', name: 'মোঃ জামান সরকার', phone: '01822334455', village: 'চকধলী', address: 'চকধলী, বগুড়া', notes: 'নিয়মিত বিক্রেতা' },
  { memberId: '2603', name: 'সুভাষ চন্দ্র বর্মন', phone: '01933445566', village: 'মাঝিরা', address: 'মাঝিরা, শাহজাহানপুর', notes: 'চিকন ধান উৎপাদক' },
  { memberId: '2604', name: 'আলহাজ্ব রফিকুল ইসলাম', phone: '01755667788', village: 'মির্জাপুর', address: 'মির্জাপুর, শেরপুর', notes: 'কাটারীভোগ ও বিআর-২৮' },
];

const DEFAULT_BUYERS: Omit<Buyer, 'id' | 'userId' | 'createdAt' | 'updatedAt'>[] = [
  { name: 'মেসার্স ভাই ভাই অটো রাইস মিল', phone: '01799887766', address: 'মহাসড়ক বাইপাস, নওগাঁ', village: 'নওগাঁ সদর', notes: 'নিয়মিত চালানি ক্রেতা' },
  { name: 'সোনার মদিনা চাতাল ও রাইস মিল', phone: '01755443322', address: 'পুঠিয়া, রাজশাহী', village: 'পুঠিয়া', notes: 'স্বর্ণা ও মিনিকেট ক্রেতা' },
  { name: 'আলহাজ্ব কাশেম ট্রেডার্স', phone: '01811998877', address: 'বাবুবাজার মোকাম, ঢাকা', village: 'বাবুবাজার', notes: 'পাইকারি আড়তদার' },
];

const DataContext = createContext<DataContextType | undefined>(undefined);

const STORAGE_KEY_PREFIX = 'arat_v2_clean_';

function loadLocal<T>(key: string, fallback: T): T {
  try {
    const item = localStorage.getItem(STORAGE_KEY_PREFIX + key);
    return item ? JSON.parse(item) : fallback;
  } catch (e) {
    return fallback;
  }
}

function saveLocal<T>(key: string, data: T) {
  try {
    localStorage.setItem(STORAGE_KEY_PREFIX + key, JSON.stringify(data));
  } catch (e) {}
}

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const userId = 'local_user';

  const [varieties, setVarieties] = useState<PaddyVariety[]>(() => {
    const saved = loadLocal<PaddyVariety[] | null>('varieties', null);
    if (saved && saved.length > 0) return saved;
    const now = new Date().toISOString();
    const seeded = DEFAULT_VARIETIES.map((v, i) => ({
      ...v,
      id: 'var_' + (i + 1),
      userId,
      createdAt: now,
      updatedAt: now,
    }));
    saveLocal('varieties', seeded);
    return seeded;
  });

  const [sellers, setSellers] = useState<Seller[]>(() => {
    const saved = loadLocal<Seller[] | null>('sellers', null);
    if (saved && saved.length > 0) return saved;
    const now = new Date().toISOString();
    const seeded = DEFAULT_SELLERS.map((s, i) => ({
      ...s,
      id: 'sel_' + (i + 1),
      userId,
      createdAt: now,
      updatedAt: now,
    }));
    saveLocal('sellers', seeded);
    return seeded;
  });

  const [parties, setParties] = useState<Buyer[]>(() => {
    const saved = loadLocal<Buyer[] | null>('parties', null);
    if (saved && saved.length > 0) return saved;
    const now = new Date().toISOString();
    const seeded = DEFAULT_BUYERS.map((b, i) => ({
      ...b,
      id: 'buyer_' + (i + 1),
      userId,
      createdAt: now,
      updatedAt: now,
    }));
    saveLocal('parties', seeded);
    return seeded;
  });

  const [purchases, setPurchases] = useState<PurchaseMemo[]>(() => {
    const saved = loadLocal<PurchaseMemo[] | null>('purchases', null);
    if (saved && saved.length > 0) return saved;
    const now = new Date().toISOString();
    const todayDate = now.split('T')[0];
    const seeded: PurchaseMemo[] = [
      {
        id: 'memo_1',
        invoiceNumber: 'MEMO-1001',
        sellerId: 'sel_1',
        sellerName: 'মো: আব্দুল করিম',
        sellerPhone: '01711223344',
        sellerVillage: 'ভবানীপুর',
        varietyId: 'var_2',
        paddyType: 'ব্রি-২৮ (BR-28)',
        quantityMon: 45,
        weightMon: 45,
        weightKg: 0,
        bags: 36,
        totalMon: 45,
        ratePerMon: 1180,
        totalBill: 53100,
        totalAmount: 53100,
        date: todayDate,
        notes: 'আমন মৌসুমের শুকনা ধান',
        userId,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'memo_2',
        invoiceNumber: 'MEMO-1002',
        sellerId: 'sel_2',
        sellerName: 'মোঃ জামান সরকার',
        sellerPhone: '01822334455',
        sellerVillage: 'চকধলী',
        varietyId: 'var_5',
        paddyType: 'মিনিকেট (Minikit)',
        quantityMon: 28,
        weightMon: 28,
        weightKg: 0,
        bags: 22,
        totalMon: 28,
        ratePerMon: 1350,
        totalBill: 37800,
        totalAmount: 37800,
        date: todayDate,
        notes: 'পলিশ মিনিকেট ধান',
        userId,
        createdAt: now,
        updatedAt: now,
      },
    ];
    saveLocal('purchases', seeded);
    return seeded;
  });

  const [sales, setSales] = useState<Sale[]>(() => {
    const saved = loadLocal<Sale[] | null>('sales', null);
    if (saved && saved.length > 0) return saved;
    const now = new Date().toISOString();
    const todayDate = now.split('T')[0];
    const seeded: Sale[] = [
      {
        id: 'sale_1',
        challanNumber: 'CHL-2001',
        partyId: 'buyer_1',
        partyName: 'মেসার্স ভাই ভাই অটো রাইস মিল',
        partyPhone: '01799887766',
        varietyId: 'var_2',
        varietyName: 'ব্রি-২৮ (BR-28)',
        bagCount: 80,
        totalMon: 70,
        ratePerMon: 1250,
        totalAmount: 87500,
        receivedAmount: 50000,
        dueAmount: 37500,
        transportTruckNo: 'ঢাকা মেট্রো-ট ১১-৫৪৩২',
        transportDriverName: 'মো: রফিক মিয়া',
        transportDriverPhone: '01722334455',
        date: todayDate,
        userId,
        createdAt: now,
        updatedAt: now,
      }
    ];
    saveLocal('sales', seeded);
    return seeded;
  });

  const [payments, setPayments] = useState<PaymentRecord[]>(() => {
    const saved = loadLocal<PaymentRecord[] | null>('payments', null);
    if (saved && saved.length > 0) return saved;
    const now = new Date().toISOString();
    const todayDate = now.split('T')[0];
    const seeded: PaymentRecord[] = [
      {
        id: 'pay_1',
        sellerId: 'sel_1',
        sellerName: 'মো: আব্দুল করিম',
        amount: 25000,
        date: todayDate,
        paymentMethod: 'Cash',
        note: 'হাটের প্রথম কিস্তি পরিশোধ',
        receiptNumber: 'VOUCHER-501',
        userId,
        createdAt: now,
        updatedAt: now,
      }
    ];
    saveLocal('payments', seeded);
    return seeded;
  });

  const [cashLogs, setCashLogs] = useState<CashLog[]>(() => {
    const saved = loadLocal<CashLog[] | null>('cash_logs', null);
    if (saved && saved.length > 0) return saved;
    const now = new Date().toISOString();
    const todayDate = now.split('T')[0];
    const seeded: CashLog[] = [
      {
        id: 'cash_1',
        type: 'IN',
        amount: 200000,
        sourceOrRecipient: 'হাটের প্রারম্ভিক ক্যাশ জমা (ব্যাংক উত্তোলন)',
        date: todayDate,
        note: 'আজকের হাটের দিন কেনাকাটার জন্য ক্যাশ জমা',
        userId,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'cash_2',
        type: 'OUT',
        amount: 25000,
        sourceOrRecipient: 'মো: আব্দুল করিম (বিক্রেতা পরিশোধ)',
        date: todayDate,
        note: 'ভাউচার #VOUCHER-501',
        userId,
        createdAt: now,
        updatedAt: now,
      },
    ];
    saveLocal('cash_logs', seeded);
    return seeded;
  });

  const [settings, setSettings] = useState<BusinessSettings>(() => {
    return loadLocal<BusinessSettings>('settings', DEFAULT_SETTINGS);
  });

  const loadingData = false;

  // =========================================================================
  // CENTRAL LEDGER ENGINE (Single Source of Truth)
  // Current Due = Total Purchase Bills - Total Khotiyan Payments
  // =========================================================================
  const getSellerStats = (sellerId: string): SellerStats => {
    const seller = sellers.find(s => s.id === sellerId);
    const sellerPhone = seller?.phone;

    const sellerMemos = purchases.filter(
      p => p.sellerId === sellerId || (sellerPhone && p.sellerPhone === sellerPhone)
    );

    const totalMon = sellerMemos.reduce((sum, m) => sum + (m.totalMon || m.quantityMon || 0), 0);
    const totalBags = sellerMemos.reduce((sum, m) => sum + (m.bags || (m.totalMon ? Math.round(m.totalMon / 1.25) : 0)), 0);
    const totalBill = sellerMemos.reduce((sum, m) => sum + (m.totalBill || m.totalAmount || 0), 0);

    const sellerPayments = payments.filter(
      pay => pay.sellerId === sellerId || (pay as unknown as { entityId?: string }).entityId === sellerId
    );
    const totalPaid = sellerPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const currentDue = Math.max(0, totalBill - totalPaid);
    const lastDate = sellerMemos[0]?.date || sellerPayments[0]?.date;

    return {
      totalMon,
      totalBags,
      totalBill,
      totalPaid,
      currentDue,
      memoCount: sellerMemos.length,
      paymentCount: sellerPayments.length,
      lastDate,
    };
  };

  const totalPurchasedAmount = useMemo(() => {
    return purchases.reduce((sum, p) => sum + (p.totalBill || p.totalAmount || 0), 0);
  }, [purchases]);

  const totalPurchasedMon = useMemo(() => {
    return purchases.reduce((sum, p) => sum + (p.totalMon || p.quantityMon || 0), 0);
  }, [purchases]);

  const totalPaidAmount = useMemo(() => {
    return payments.reduce((sum, pay) => sum + (pay.amount || 0), 0);
  }, [payments]);

  const totalCurrentDue = useMemo(() => {
    return sellers.reduce((sum, s) => {
      const stats = getSellerStats(s.id);
      return sum + stats.currentDue;
    }, 0);
  }, [sellers, purchases, payments]);

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  const todayPurchases = useMemo(() => {
    return purchases.filter(p => p.date === todayStr || (p.createdAt && p.createdAt.startsWith(todayStr)));
  }, [purchases, todayStr]);

  const todayTotalPurchase = useMemo(() => {
    return todayPurchases.reduce((sum, p) => sum + (p.totalBill || p.totalAmount || 0), 0);
  }, [todayPurchases]);

  const todayTotalMon = useMemo(() => {
    return todayPurchases.reduce((sum, p) => sum + (p.totalMon || p.quantityMon || 0), 0);
  }, [todayPurchases]);

  const todayCashDisbursed = useMemo(() => {
    return payments
      .filter(p => p.date === todayStr || (p.createdAt && p.createdAt.startsWith(todayStr)))
      .reduce((sum, p) => sum + (p.amount || 0), 0);
  }, [payments, todayStr]);

  const todayNewDueAdded = todayTotalPurchase;

  const cashInHand = useMemo(() => {
    const totalIn = cashLogs
      .filter(c => c.type === 'IN')
      .reduce((sum, c) => sum + (c.amount || 0), 0);
    const totalOut = cashLogs
      .filter(c => c.type === 'OUT')
      .reduce((sum, c) => sum + (c.amount || 0), 0);
    return Math.max(0, totalIn - totalOut);
  }, [cashLogs]);

  // Actions
  const addVariety = async (v: Omit<PaddyVariety, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<string> => {
    const now = new Date().toISOString();
    const newId = 'var_' + Date.now().toString(36);
    const item: PaddyVariety = { ...v, id: newId, userId, createdAt: now, updatedAt: now };
    const updated = [item, ...varieties];
    setVarieties(updated);
    saveLocal('varieties', updated);
    return newId;
  };

  const updateVariety = async (id: string, updates: Partial<PaddyVariety>) => {
    const now = new Date().toISOString();
    const updated = varieties.map(v => v.id === id ? { ...v, ...updates, updatedAt: now } : v);
    setVarieties(updated);
    saveLocal('varieties', updated);
  };

  const deleteVariety = async (id: string) => {
    const updated = varieties.filter(v => v.id !== id);
    setVarieties(updated);
    saveLocal('varieties', updated);
  };

  const addSeller = async (s: Omit<Seller, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<string> => {
    const now = new Date().toISOString();
    const newId = 'sel_' + Date.now().toString(36);
    const currentYear = new Date().getFullYear();
    const shortYear = String(currentYear).slice(-2);
    const countInYear = sellers.filter(existing => {
      if (existing.memberId && existing.memberId.startsWith(shortYear)) return true;
      const d = existing.createdAt ? new Date(existing.createdAt) : new Date();
      return (isNaN(d.getFullYear()) ? currentYear : d.getFullYear()) === currentYear;
    }).length;
    const generatedMemberId = s.memberId || `${shortYear}${String(countInYear + 1).padStart(2, '0')}`;

    const seller: Seller = {
      ...s,
      memberId: generatedMemberId,
      village: s.village || 'শেরপুর',
      id: newId,
      userId,
      createdAt: now,
      updatedAt: now,
    };
    const updated = [seller, ...sellers];
    setSellers(updated);
    saveLocal('sellers', updated);
    return newId;
  };

  const updateSeller = async (id: string, updates: Partial<Seller>) => {
    const now = new Date().toISOString();
    const updated = sellers.map(s => s.id === id ? { ...s, ...updates, updatedAt: now } : s);
    setSellers(updated);
    saveLocal('sellers', updated);
  };

  const deleteSeller = async (id: string) => {
    const updated = sellers.filter(s => s.id !== id);
    setSellers(updated);
    saveLocal('sellers', updated);
  };

  const addPurchase = async (p: {
    sellerId: string;
    sellerName?: string;
    sellerPhone?: string;
    sellerVillage?: string;
    varietyId?: string;
    paddyType: string;
    quantityMon: number;
    weightMon?: number;
    weightKg?: number;
    bags?: number;
    ratePerMon: number;
    totalBill?: number;
    instantPayment?: number;
    deductions?: number;
    laborCost?: number;
    date: string;
    time?: string;
    notes?: string;
  }): Promise<{ id: string; invoiceNumber: string }> => {
    const now = new Date().toISOString();
    const invoiceNumber = `MEMO-${1000 + purchases.length + 1}`;
    const newId = 'memo_' + Date.now().toString(36);

    const calculatedBill = calculateAmount(p.quantityMon, p.ratePerMon);
    const finalBill = typeof p.totalBill === 'number' && p.totalBill >= 0 ? p.totalBill : calculatedBill;
    const bagCount = typeof p.bags === 'number' && p.bags > 0 ? p.bags : (p.weightMon ? Math.round(p.weightMon / 1.25) : 0);

    const paidAmt = typeof p.instantPayment === 'number' && p.instantPayment > 0 ? p.instantPayment : 0;
    const dueAmt = Math.max(0, finalBill - paidAmt);

    const newMemo: PurchaseMemo = {
      id: newId,
      invoiceNumber,
      sellerId: p.sellerId,
      sellerName: p.sellerName,
      sellerPhone: p.sellerPhone,
      sellerVillage: p.sellerVillage,
      varietyId: p.varietyId,
      paddyType: p.paddyType,
      quantityMon: p.quantityMon,
      weightMon: p.weightMon,
      weightKg: p.weightKg,
      bags: bagCount,
      totalMon: p.quantityMon,
      ratePerMon: p.ratePerMon,
      totalBill: finalBill,
      totalAmount: finalBill,
      instantPayment: paidAmt,
      paidAmount: paidAmt,
      dueAmount: dueAmt,
      deductions: p.deductions || 0,
      laborCost: p.laborCost || 0,
      date: p.date || now.split('T')[0],
      time: p.time || new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
      notes: p.notes,
      userId,
      createdAt: now,
      updatedAt: now,
    };

    // Real-Time Stock Updates & Fix Zero Stock Glitch:
    // Match variety by ID, exact name, or partial name; or auto-register custom variety!
    const cleanType = (p.paddyType || '').trim();
    let targetVar = varieties.find(v => 
      v.id === p.varietyId || 
      v.name.toLowerCase() === cleanType.toLowerCase() ||
      v.name.toLowerCase().includes(cleanType.toLowerCase()) ||
      cleanType.toLowerCase().includes(v.name.toLowerCase())
    );

    let updatedVar = [...varieties];
    if (targetVar) {
      const newStock = (targetVar.currentStockMon || 0) + p.quantityMon;
      updatedVar = updatedVar.map(v => v.id === targetVar!.id ? { ...v, currentStockMon: newStock, updatedAt: now } : v);
    } else {
      // Auto-register variety so it never stays 0 Mon in Warehouse Stock!
      const newVar: PaddyVariety = {
        id: 'var_' + Date.now().toString(36),
        name: cleanType || 'দেশি সাধারণ ধান',
        code: (cleanType || 'VAR').substring(0, 4).toUpperCase(),
        defaultPurchaseRate: p.ratePerMon,
        defaultSaleRate: Math.round(p.ratePerMon * 1.06),
        currentStockMon: p.quantityMon,
        lowStockThreshold: 40,
        description: `${cleanType} ধানের জাত`,
        userId,
        createdAt: now,
        updatedAt: now,
      };
      updatedVar = [newVar, ...updatedVar];
    }
    setVarieties(updatedVar);
    saveLocal('varieties', updatedVar);

    const updatedPurchases = [newMemo, ...purchases];
    setPurchases(updatedPurchases);
    saveLocal('purchases', updatedPurchases);

    // Instant Partial / Advance Payment handling
    if (p.instantPayment && p.instantPayment > 0) {
      const payId = 'pay_' + Date.now().toString(36);
      const voucherNum = `VOUCHER-${500 + payments.length + 1}`;
      const newPayment: PaymentRecord = {
        id: payId,
        sellerId: p.sellerId,
        sellerName: p.sellerName || 'বিক্রেতা',
        amount: p.instantPayment,
        date: p.date || now.split('T')[0],
        paymentMethod: 'Cash',
        note: `মেমো #${invoiceNumber} ক্রয়কালে নগদ পরিশোধ`,
        receiptNumber: voucherNum,
        userId,
        createdAt: now,
        updatedAt: now,
      };
      const updatedPayments = [newPayment, ...payments];
      setPayments(updatedPayments);
      saveLocal('payments', updatedPayments);

      const cashEntry: CashLog = {
        id: 'cash_' + Date.now().toString(36),
        type: 'OUT',
        amount: p.instantPayment,
        sourceOrRecipient: `${p.sellerName || 'বিক্রেতা'} (মেমো নগদ প্রদান)`,
        date: p.date || now.split('T')[0],
        note: `মেমো #${invoiceNumber} বাবদ তাৎক্ষণিক পরিশোধ`,
        referenceId: newId,
        userId,
        createdAt: now,
        updatedAt: now,
      };
      const updatedCash = [cashEntry, ...cashLogs];
      setCashLogs(updatedCash);
      saveLocal('cash_logs', updatedCash);
    }

    return { id: newId, invoiceNumber };
  };

  const deletePurchase = async (id: string) => {
    const memo = purchases.find(p => p.id === id);
    if (!memo) return;

    const cleanType = (memo.paddyType || '').trim();
    const targetVar = varieties.find(v => 
      v.id === memo.varietyId || 
      v.name.toLowerCase() === cleanType.toLowerCase() ||
      v.name.toLowerCase().includes(cleanType.toLowerCase())
    );
    const rolledBackStock = Math.max(0, (targetVar?.currentStockMon || 0) - (memo.totalMon || memo.quantityMon || 0));

    const updated = purchases.filter(p => p.id !== id);
    setPurchases(updated);
    saveLocal('purchases', updated);

    if (targetVar) {
      const updatedVar = varieties.map(v => v.id === targetVar.id ? { ...v, currentStockMon: rolledBackStock } : v);
      setVarieties(updatedVar);
      saveLocal('varieties', updatedVar);
    }

    // Rollback any associated instant cash log
    const updatedCash = cashLogs.filter(c => c.referenceId !== id);
    if (updatedCash.length !== cashLogs.length) {
      setCashLogs(updatedCash);
      saveLocal('cash_logs', updatedCash);
    }
  };

  const addParty = async (p: Omit<Buyer, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<string> => {
    const now = new Date().toISOString();
    const newId = 'buyer_' + Date.now().toString(36);
    const buyer: Buyer = { ...p, id: newId, userId, createdAt: now, updatedAt: now };

    const updated = [buyer, ...parties];
    setParties(updated);
    saveLocal('parties', updated);
    return newId;
  };

  const updateParty = async (id: string, updates: Partial<Buyer>) => {
    const now = new Date().toISOString();
    const updated = parties.map(p => p.id === id ? { ...p, ...updates, updatedAt: now } : p);
    setParties(updated);
    saveLocal('parties', updated);
  };

  const deleteParty = async (id: string) => {
    const updated = parties.filter(p => p.id !== id);
    setParties(updated);
    saveLocal('parties', updated);
  };

  const addSale = async (s: Omit<Sale, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'challanNumber'>): Promise<{ id: string; challanNumber: string }> => {
    const now = new Date().toISOString();
    const challanNumber = `CHL-${2000 + sales.length + 1}`;
    const newId = 'sale_' + Date.now().toString(36);

    const newSale: Sale = {
      ...s,
      id: newId,
      challanNumber,
      userId,
      createdAt: now,
      updatedAt: now,
    };

    const targetVar = varieties.find(v => v.id === s.varietyId);
    const newStock = Math.max(0, (targetVar?.currentStockMon || 0) - s.totalMon);

    const cashEntry: CashLog | null = s.receivedAmount > 0 ? {
      id: 'cash_' + Date.now().toString(36),
      type: 'IN',
      amount: s.receivedAmount,
      sourceOrRecipient: `${s.partyName} (চালান আদায়)`,
      date: s.date || now.split('T')[0],
      note: `চালান #${challanNumber} বাবদ আদায়`,
      referenceId: newId,
      userId,
      createdAt: now,
      updatedAt: now,
    } : null;

    const updatedSales = [newSale, ...sales];
    setSales(updatedSales);
    saveLocal('sales', updatedSales);

    if (targetVar) {
      const updatedV = varieties.map(v => v.id === targetVar.id ? { ...v, currentStockMon: newStock } : v);
      setVarieties(updatedV);
      saveLocal('varieties', updatedV);
    }

    if (cashEntry) {
      const updatedCash = [cashEntry, ...cashLogs];
      setCashLogs(updatedCash);
      saveLocal('cash_logs', updatedCash);
    }

    return { id: newId, challanNumber };
  };

  const deleteSale = async (id: string) => {
    const sale = sales.find(s => s.id === id);
    if (!sale) return;

    const targetVar = varieties.find(v => v.id === sale.varietyId);
    const restoredStock = (targetVar?.currentStockMon || 0) + sale.totalMon;

    const updated = sales.filter(s => s.id !== id);
    setSales(updated);
    saveLocal('sales', updated);

    if (targetVar) {
      const updatedV = varieties.map(v => v.id === targetVar.id ? { ...v, currentStockMon: restoredStock } : v);
      setVarieties(updatedV);
      saveLocal('varieties', updatedV);
    }

    const updatedCash = cashLogs.filter(c => c.referenceId !== id);
    setCashLogs(updatedCash);
    saveLocal('cash_logs', updatedCash);
  };

  const recordSellerPayment = async (params: {
    sellerId: string;
    amount: number;
    date: string;
    paymentMethod: 'Cash' | 'Bank' | 'Bkash';
    note?: string;
  }): Promise<string> => {
    const seller = sellers.find(s => s.id === params.sellerId);
    const now = new Date().toISOString();
    const receiptNumber = `VOUCHER-${500 + payments.length + 1}`;
    const newId = 'pay_' + Date.now().toString(36);

    const paymentRecord: PaymentRecord = {
      id: newId,
      sellerId: params.sellerId,
      sellerName: seller?.name || 'বিক্রেতা',
      amount: params.amount,
      date: params.date || now.split('T')[0],
      paymentMethod: params.paymentMethod,
      note: params.note || 'খতিয়ান থেকে পরিশোধ',
      receiptNumber,
      userId,
      createdAt: now,
      updatedAt: now,
    };

    let cashEntry: CashLog | null = null;
    if (params.paymentMethod === 'Cash') {
      cashEntry = {
        id: 'cash_' + Date.now().toString(36),
        type: 'OUT',
        amount: params.amount,
        sourceOrRecipient: `${seller?.name || 'বিক্রেতা'} (খতিয়ান পরিশোধ)`,
        date: params.date || now.split('T')[0],
        note: params.note || `ভাউচার #${receiptNumber}`,
        referenceId: newId,
        userId,
        createdAt: now,
        updatedAt: now,
      };
    }

    const updatedPayments = [paymentRecord, ...payments];
    setPayments(updatedPayments);
    saveLocal('payments', updatedPayments);

    if (cashEntry) {
      const updatedCash = [cashEntry, ...cashLogs];
      setCashLogs(updatedCash);
      saveLocal('cash_logs', updatedCash);
    }

    return newId;
  };

  const deletePayment = async (id: string) => {
    const updatedPayments = payments.filter(p => p.id !== id);
    setPayments(updatedPayments);
    saveLocal('payments', updatedPayments);

    const updatedCash = cashLogs.filter(c => c.referenceId !== id);
    setCashLogs(updatedCash);
    saveLocal('cash_logs', updatedCash);
  };

  const addCashEntry = async (entry: Omit<CashLog, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<string> => {
    const now = new Date().toISOString();
    const newId = 'cash_' + Date.now().toString(36);
    const log: CashLog = {
      ...entry,
      id: newId,
      userId,
      createdAt: now,
      updatedAt: now,
    };

    const updated = [log, ...cashLogs];
    setCashLogs(updated);
    saveLocal('cash_logs', updated);
    return newId;
  };

  const deleteCashEntry = async (id: string) => {
    const updated = cashLogs.filter(c => c.id !== id);
    setCashLogs(updated);
    saveLocal('cash_logs', updated);
  };

  const updateSettings = async (s: Partial<BusinessSettings>) => {
    const updated = { ...settings, ...s };
    setSettings(updated);
    saveLocal('settings', updated);
  };

  const resetSampleData = async () => {
    try {
      localStorage.clear();
      window.location.reload();
    } catch (e) {}
  };

  return (
    <DataContext.Provider
      value={{
        varieties,
        sellers,
        farmers: sellers,
        purchases,
        parties,
        sales,
        payments,
        cashLogs,
        settings,
        loadingData,

        getSellerStats,
        totalPurchasedAmount,
        totalPurchasedMon,
        totalPaidAmount,
        totalCurrentDue,
        todayTotalPurchase,
        todayTotalMon,
        todayCashDisbursed,
        todayNewDueAdded,
        cashInHand,

        addVariety,
        updateVariety,
        deleteVariety,

        addSeller,
        updateSeller,
        deleteSeller,
        addFarmer: addSeller,
        deleteFarmer: deleteSeller,

        addPurchase,
        deletePurchase,

        addParty,
        updateParty,
        deleteParty,

        addSale,
        deleteSale,

        recordSellerPayment,
        deletePayment,

        addCashEntry,
        deleteCashEntry,

        updateSettings,
        resetSampleData,
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within DataProvider');
  }
  return context;
};
