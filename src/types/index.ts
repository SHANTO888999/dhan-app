export interface PaddyVariety {
  id: string;
  name: string; // e.g. "বিআর-২৮ (BR-28)", "কাটারীভোগ (Katari)"
  code?: string;
  defaultPurchaseRate?: number; // টাকা/মন
  defaultSaleRate?: number; // টাকা/মন
  currentStockMon: number; // মন
  lowStockThreshold?: number; // মন - সতর্কবার্তা সীমা
  description?: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Seller {
  id: string;
  memberId?: string; // e.g. "SL-2026-001" (Year-based Member ID)
  name: string;
  phone: string;
  village: string; // গ্রাম (সার্চ ও ফিল্টারের জন্য আবশ্যক)
  address?: string; // বিকল্প ঠিকানা
  nid?: string; // জাতীয় পরিচয়পত্র (ঐচ্ছিক)
  notes?: string;
  currentBalance?: number;
  totalPurchasedMon?: number;
  totalPurchasedAmount?: number;
  totalPaidAmount?: number;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

// Backward-compatibility alias
export type Farmer = Seller;

export interface PurchaseMemo {
  id: string;
  invoiceNumber: string; // e.g. MEMO-1001
  memoNo?: string;
  sellerId: string;
  sellerName?: string;
  bags?: number;
  sellerPhone?: string;
  sellerVillage?: string;
  // Aliases
  farmerId?: string;
  farmerName?: string;
  farmerPhone?: string;
  farmerVillage?: string;
  paddyType: string; // ধানের জাত
  varietyId?: string;
  varietyName?: string;
  quantityMon: number; // মন
  weightMon?: number;
  weightKg?: number;
  totalMon: number; // মন
  ratePerMon: number; // প্রতি মনের দর (টাকা)
  totalBill: number; // মোট বিল (টাকা) - Central Ledger Engine
  totalAmount?: number; // alias for totalBill
  paidAmount?: number;
  instantPayment?: number;
  dueAmount?: number;
  deductions?: number;
  laborCost?: number;
  paymentMethod?: string;
  date: string; // YYYY-MM-DD
  time?: string; // e.g. 10:30 AM
  notes?: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

// Backward-compatibility alias
export type Purchase = PurchaseMemo;

export interface Buyer {
  id: string;
  name: string; // মিল / চাতাল / ক্রেতার নাম
  phone: string;
  address: string;
  village?: string;
  nid?: string;
  notes?: string;
  currentBalance?: number;
  openingBalance?: number;
  totalSoldMon?: number;
  totalSalesAmount?: number;
  totalReceivedAmount?: number;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

// Backward-compatibility alias
export type Party = Buyer;

export interface Sale {
  id: string;
  challanNumber: string; // e.g. CHL-2001
  partyId: string;
  partyName: string;
  partyPhone: string;
  varietyId: string;
  varietyName: string;
  bagCount: number; // বস্তার সংখ্যা
  totalMon: number; // মোট মন
  ratePerMon: number; // দর (টাকা/মন)
  totalAmount: number; // মোট চালানি মূল্য
  receivedAmount: number; // আদায়কৃত টাকা
  dueAmount: number; // বাকি
  perBagWeight?: number;
  perBagUnit?: 'mon' | 'kg';
  transportTruckNo?: string;
  transportDriverName?: string;
  transportDriverPhone?: string;
  transportDriverNid?: string;
  transportDriverNidImage?: string;
  transportTruckFare?: number;
  farePaidBy?: 'seller' | 'buyer';
  date: string;
  smsSent?: boolean;
  notes?: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentRecord {
  id: string;
  sellerId: string;
  sellerName?: string;
  amount: number;
  date: string;
  note?: string;
  paymentMethod: 'Cash' | 'Bank' | 'Bkash';
  receiptNumber?: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export type PaymentLog = PaymentRecord;

export interface StockItem {
  paddyType: string;
  totalMon: number;
  totalBags: number;
  lastUpdated: string;
}

export interface Payment {
  id: string;
  type: 'farmer_payment' | 'party_collection' | 'expense' | 'other_income';
  entityId?: string;
  entityName?: string;
  amount: number;
  paymentMethod: string;
  date: string;
  note?: string;
  receiptNumber?: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CashLog {
  id: string;
  type: 'IN' | 'OUT';
  amount: number;
  sourceOrRecipient: string;
  date: string;
  note?: string;
  referenceId?: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export type CashEntry = CashLog;

export interface BusinessSettings {
  id: string;
  businessName: string;
  proprietor: string;
  phone: string;
  address: string;
  smsGatewayApiKey?: string;
  smsGatewaySenderId?: string;
  smsAutoSendFarmer?: boolean;
  smsAutoSendBuyer?: boolean;
  thermalPrinterWidth: 58 | 80;
  invoiceFooterNote: string;
  customExpenseCategories?: string[];
  lowStockAlertMon?: number; // ডিফল্ট স্টক অ্যালার্ট থ্রেশহোল্ড
  // ধানের মেমো পেজের ফিল্ড কাস্টমাইজেশন (সেটিংস থেকে নির্বাচনযোগ্য)
  showMemoBags?: boolean; // বস্তার সংখ্যা (ডিফল্ট: বন্ধ)
  showMemoLabor?: boolean; // লেবার খরচ
  showMemoDeductions?: boolean; // চালতা ও অন্যান্য কর্তন
  showMemoNotes?: boolean; // নোটস ও মন্তব্য
  userId: string;
  createdAt?: string;
  updatedAt?: string;
}

export type ActiveTab = 'dashboard' | 'purchase' | 'sales' | 'stock' | 'accounts' | 'rewards' | 'varieties' | 'settings';
