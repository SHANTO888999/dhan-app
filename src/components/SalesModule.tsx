import React, { useState } from 'react';
import { 
  Truck, 
  PlusCircle, 
  Search, 
  Printer, 
  Share2, 
  UserPlus, 
  Calendar, 
  Trash2, 
  FileText, 
  Phone, 
  MapPin, 
  Send, 
  Package, 
  Scale, 
  Navigation,
  MessageSquare,
  MoreVertical,
  Eye,
  CheckCircle,
  Building2,
  Camera,
  IdCard,
  ShoppingBag,
  AlertTriangle,
  X,
  Clock
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { useThemeLanguage } from '../context/ThemeLanguageContext';
import { Party, Sale } from '../types';
import { 
  calculateAmount, 
  formatCurrency, 
  toBengaliNumber 
} from '../utils/weight';
import { MemberDetailsPage } from './MemberDetailsPage';
import { ConfirmationModal } from './ConfirmationModal';

interface SalesModuleProps {
  onViewReceipt: (type: 'purchase' | 'sale', item: unknown) => void;
  openNewModalInitially?: boolean;
  onSwitchToPurchase?: () => void;
}

export const SalesModule: React.FC<SalesModuleProps> = ({
  onViewReceipt,
  openNewModalInitially = false,
  onSwitchToPurchase,
}) => {
  const { 
    sales, 
    parties, 
    varieties, 
    addSale, 
    deleteSale, 
    addParty, 
    deleteParty,
    settings 
  } = useData();

  const { t } = useThemeLanguage();

  const [activeSubTab, setActiveSubTab] = useState<'challans' | 'parties'>('challans');
  const [detailedPartyId, setDetailedPartyId] = useState<string | null>(null);

  const [isEntryModalOpen, setIsEntryModalOpen] = useState(openNewModalInitially);
  const [isNewPartyModalOpen, setIsNewPartyModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterVariety, setFilterVariety] = useState('ALL');

  // Active 3-dot menu state
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // Deletion Confirmation Target States
  const [deleteSaleTarget, setDeleteSaleTarget] = useState<Sale | null>(null);
  const [deletePartyTarget, setDeletePartyTarget] = useState<Party | null>(null);

  // Form State
  const [selectedPartyId, setSelectedPartyId] = useState('');
  const [selectedVarietyId, setSelectedVarietyId] = useState('');
  // Weight & Bag Calculation States (Per bag weight vs direct total weight)
  const [calcMode, setCalcMode] = useState<'per_bag' | 'total_weight'>('per_bag');
  const [bagCount, setBagCount] = useState<number | ''>('');
  const [perBagWeight, setPerBagWeight] = useState<number | ''>(50); // Default 50
  const [perBagUnit, setPerBagUnit] = useState<'mon' | 'kg'>('mon'); // Default 'mon' or toggleable to 'kg'
  const [directMon, setDirectMon] = useState<number | ''>('');
  const [directKg, setDirectKg] = useState<number | ''>('');
  const [ratePerMon, setRatePerMon] = useState<number | ''>('');
  const [receivedAmount, setReceivedAmount] = useState<number | ''>('');
  const [truckNo, setTruckNo] = useState('');
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [driverNid, setDriverNid] = useState('');
  const [driverNidImage, setDriverNidImage] = useState<string>(''); // Base64 image
  const [truckFare, setTruckFare] = useState<number | ''>('');
  const [farePaidBy, setFarePaidBy] = useState<'buyer' | 'seller'>('buyer');
  const [saleDate, setSaleDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [sendSMS, setSendSMS] = useState(settings.smsAutoSendBuyer);
  const [submitting, setSubmitting] = useState(false);

  // Requirement 2.2: Warning Modal State for Incomplete Optional Fields
  const [showIncompleteWarning, setShowIncompleteWarning] = useState(false);
  const [printAfterWarning, setPrintAfterWarning] = useState(false);

  // New Party Form State
  const [newPartyName, setNewPartyName] = useState('');
  const [newPartyPhone, setNewPartyPhone] = useState('');
  const [newPartyAddress, setNewPartyAddress] = useState('');
  const [newPartyNid, setNewPartyNid] = useState('');
  const [newPartyOpeningBalance, setNewPartyOpeningBalance] = useState<number | ''>(0);

  // Math Calculations (সঠিক জায়গায় সঠিক ইনপুট ও বস্তা-মন নির্ভুল হিসাব)
  const numBags = typeof bagCount === 'number' ? bagCount : 0;
  const numPerBagWeight = typeof perBagWeight === 'number' ? perBagWeight : 0;

  // Compute total mon based on active mode
  let calculatedTotalMon = 0;
  let calculatedPerBagWeightDisplay = '০';
  let calculatedPerBagUnitDisplay = perBagUnit === 'mon' ? 'মণ' : 'কেজি';

  if (calcMode === 'per_bag') {
    if (perBagUnit === 'mon') {
      calculatedTotalMon = numBags * numPerBagWeight;
      calculatedPerBagWeightDisplay = numPerBagWeight > 0 ? numPerBagWeight.toString() : '০';
      calculatedPerBagUnitDisplay = 'মণ';
    } else {
      // perBagUnit === 'kg' (1 Mon = 40 Kg)
      const totalKg = numBags * numPerBagWeight;
      calculatedTotalMon = totalKg / 40;
      calculatedPerBagWeightDisplay = numPerBagWeight > 0 ? numPerBagWeight.toString() : '০';
      calculatedPerBagUnitDisplay = 'কেজি';
    }
  } else {
    // calcMode === 'total_weight'
    const dMon = typeof directMon === 'number' ? directMon : 0;
    const dKg = typeof directKg === 'number' ? directKg : 0;
    calculatedTotalMon = dMon + (dKg / 40);
    const totalKg = (dMon * 40) + dKg;
    const perBagKg = numBags > 0 ? totalKg / numBags : 0;
    calculatedPerBagWeightDisplay = perBagKg > 0 ? perBagKg.toFixed(1) : '০';
    calculatedPerBagUnitDisplay = 'কেজি';
  }

  const numMon = calculatedTotalMon;
  const numRate = typeof ratePerMon === 'number' ? ratePerMon : 0;
  const computedTotalAmount = calculateAmount(numMon, numRate);
  const numReceived = typeof receivedAmount === 'number' ? receivedAmount : 0;
  const computedDueAmount = Math.max(0, computedTotalAmount - numReceived);
  const avgKgPerBag = numBags > 0 ? ((numMon * 40) / numBags).toFixed(1) : '0';

  // Stock check
  const currentVariety = varieties.find(v => v.id === selectedVarietyId);
  const availableStock = currentVariety?.currentStockMon || 0;
  const isStockInsufficient = numMon > availableStock;

  const handleVarietyChange = (varId: string) => {
    setSelectedVarietyId(varId);
    const target = varieties.find(v => v.id === varId);
    if (target && target.defaultSaleRate) {
      setRatePerMon(target.defaultSaleRate);
    }
  };

  // Open entry modal with pre-selected party (Requirement 2.1)
  const handleOpenSaleForParty = (partyId: string) => {
    setSelectedPartyId(partyId);
    setIsEntryModalOpen(true);
  };

  // Requirement 2.3: Handle Driver NID image upload
  const handleNidImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert(t('ছবির সাইজ ২MB এর বেশি হতে পারবে না।', 'Image size must be less than 2MB.'));
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setDriverNidImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Check if optional fields are missing (Requirement 2.2)
  const checkHasMissingFields = () => {
    return !truckNo.trim() || !driverName.trim() || !driverPhone.trim() || !driverNid.trim() || !notes.trim();
  };

  // Pre-submit check for Sale
  const handleInitiateSubmitSale = (e: React.FormEvent, printImmediately = false) => {
    e.preventDefault();
    if (!selectedPartyId) {
      alert(t('দয়া করে ক্রেতা/পার্টি নির্বাচন করুন।', 'Please select a buyer/party.'));
      return;
    }
    if (!selectedVarietyId) {
      alert(t('দয়া করে ধানের জাত নির্বাচন করুন।', 'Please select a variety.'));
      return;
    }
    if (numMon <= 0) {
      alert(t('মোট ওজনের পরিমাণ (মন) লিখুন।', 'Please enter total weight in Mon.'));
      return;
    }
    if (numRate <= 0) {
      alert(t('প্রতি মনের বিক্রয় দর উল্লেখ করুন।', 'Please enter rate per Mon.'));
      return;
    }

    // Requirement 2.2: সবগুলো ঘর পূরণ না করে enter করতে চাইলে একটি সতর্ক notification দেখাবে
    if (checkHasMissingFields()) {
      setPrintAfterWarning(printImmediately);
      setShowIncompleteWarning(true);
      return;
    }

    // If all optional fields are filled, save directly
    executeSaveSale(printImmediately);
  };

  // Execute Sale Save (either directly or after warning "Yes")
  const executeSaveSale = async (printImmediately = false) => {
    const party = parties.find(p => p.id === selectedPartyId);
    const variety = varieties.find(v => v.id === selectedVarietyId);

    setSubmitting(true);
    setShowIncompleteWarning(false);

    try {
      const result = await addSale({
        partyId: selectedPartyId,
        partyName: party?.name || '',
        partyPhone: party?.phone || '',
        varietyId: selectedVarietyId,
        varietyName: variety?.name || '',
        bagCount: numBags,
        totalMon: numMon,
        ratePerMon: numRate,
        totalAmount: computedTotalAmount,
        receivedAmount: numReceived,
        dueAmount: computedDueAmount,
        perBagWeight: calcMode === 'per_bag' && typeof perBagWeight === 'number' ? perBagWeight : undefined,
        perBagUnit: calcMode === 'per_bag' ? perBagUnit : undefined,
        transportTruckNo: truckNo,
        transportDriverName: driverName,
        transportDriverPhone: driverPhone,
        transportDriverNid: driverNid,
        transportDriverNidImage: driverNidImage,
        transportTruckFare: typeof truckFare === 'number' ? truckFare : 0,
        farePaidBy,
        date: saleDate,
        notes,
        smsSent: sendSMS,
      });

      // Reset form
      setBagCount('');
      setPerBagWeight(50);
      setDirectMon('');
      setDirectKg('');
      setRatePerMon('');
      setReceivedAmount('');
      setTruckNo('');
      setDriverName('');
      setDriverPhone('');
      setDriverNid('');
      setDriverNidImage('');
      setTruckFare('');
      setNotes('');
      setIsEntryModalOpen(false);

      if (printImmediately) {
        const createdSale: Sale = {
          id: result.id,
          challanNumber: result.challanNumber,
          partyId: selectedPartyId,
          partyName: party?.name || '',
          partyPhone: party?.phone || '',
          varietyId: selectedVarietyId,
          varietyName: variety?.name || '',
          bagCount: numBags,
          totalMon: numMon,
          ratePerMon: numRate,
          totalAmount: computedTotalAmount,
          receivedAmount: numReceived,
          dueAmount: computedDueAmount,
          perBagWeight: calcMode === 'per_bag' && typeof perBagWeight === 'number' ? perBagWeight : undefined,
          perBagUnit: calcMode === 'per_bag' ? perBagUnit : undefined,
          transportTruckNo: truckNo,
          transportDriverName: driverName,
          transportDriverPhone: driverPhone,
          transportDriverNid: driverNid,
          transportDriverNidImage: driverNidImage,
          transportTruckFare: typeof truckFare === 'number' ? truckFare : 0,
          farePaidBy,
          date: saleDate,
          notes,
          smsSent: sendSMS,
          userId: '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        onViewReceipt('sale', createdSale);
      }
    } catch (err) {
      console.error('Error saving sale:', err);
      alert(t('চালান সংরক্ষণ করা সম্ভব হয়নি।', 'Failed to save sales challan.'));
    } finally {
      setSubmitting(false);
    }
  };

  // Quick Add Party with Duplicate check
  const handleCreateParty = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = newPartyName.trim();
    const trimmedPhone = newPartyPhone.trim();

    if (!trimmedName) {
      alert(t('পার্টির নাম লিখুন', 'Please enter party name'));
      return;
    }

    // Duplicate check
    const isDuplicate = parties.some(p => 
      (trimmedPhone && p.phone && p.phone.trim() === trimmedPhone) ||
      (p.name.trim().toLowerCase() === trimmedName.toLowerCase() && p.phone.trim() === trimmedPhone)
    );

    if (isDuplicate) {
      alert(t('একই নাম ও মোবাইল নম্বরের পার্টি/মিল ইতিমধ্যে নিবন্ধিত রয়েছে!', 'A party with this name and mobile number already exists!'));
      return;
    }

    try {
      const newId = await addParty({
        name: trimmedName,
        phone: trimmedPhone,
        address: newPartyAddress.trim(),
        openingBalance: typeof newPartyOpeningBalance === 'number' ? newPartyOpeningBalance : 0,
      });
      setSelectedPartyId(newId);
      setIsNewPartyModalOpen(false);
      setNewPartyName('');
      setNewPartyPhone('');
      setNewPartyAddress('');
      setNewPartyNid('');
      setNewPartyOpeningBalance(0);
    } catch (err) {
      alert(t('পার্টি যোগ করা যায়নি', 'Failed to add party'));
    }
  };

  // Delete Party with Confirmation (Requirement 2.5)
  const handleDeleteParty = async (party: Party) => {
    const isSure = window.confirm(
      `আপনি কি নিশ্চিতভাবে "${party.name}" ক্রেতা/পার্টিকে মুছে ফেলতে চান?\nমুছে ফেললে এই পার্টির তথ্য তালিকা থেকে সরে যাবে।`
    );
    if (!isSure) return;

    try {
      await deleteParty(party.id);
      setOpenMenuId(null);
    } catch (err) {
      alert(t('পার্টি মুছে ফেলা সম্ভব হয়নি', 'Failed to delete party'));
    }
  };

  // Delete Sale with Confirmation (Requirement 2.5)
  const handleDeleteSale = async (sale: Sale) => {
    const isSure = window.confirm(
      `আপনি কি নিশ্চিত যে ${sale.challanNumber} নম্বর চালানটি মুছে ফেলতে চান?\nএতে গুদাম স্টক এবং পার্টির বকেয়া পূর্বের অবস্থায় ফিরে যাবে।`
    );
    if (!isSure) return;

    try {
      await deleteSale(sale.id);
      setOpenMenuId(null);
    } catch (err) {
      alert(t('চালান মুছে ফেলা যায়নি', 'Failed to delete sale'));
    }
  };

  // Overall Financial Totals
  const totalSalesBill = sales.reduce((acc, s) => acc + s.totalAmount, 0);
  const totalReceived = sales.reduce((acc, s) => acc + s.receivedAmount, 0);
  const totalDue = sales.reduce((acc, s) => acc + s.dueAmount, 0);
  const totalMonSold = sales.reduce((acc, s) => acc + s.totalMon, 0);
  const totalBagsSold = sales.reduce((acc, s) => acc + (s.bagCount || 0), 0);

  // Filter Sales
  const filteredSales = sales.filter(s => {
    const matchesSearch =
      s.partyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.challanNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.partyPhone && s.partyPhone.includes(searchTerm)) ||
      (s.transportTruckNo && s.transportTruckNo.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesVariety = filterVariety === 'ALL' || s.varietyId === filterVariety;
    return matchesSearch && matchesVariety;
  });

  // Filter Parties
  const filteredParties = parties.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.phone && p.phone.includes(searchTerm)) ||
    (p.address && p.address.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // If viewing detailed profile page (Requirement 2.7)
  if (detailedPartyId) {
    return (
      <MemberDetailsPage
        memberType="party"
        memberId={detailedPartyId}
        onBack={() => setDetailedPartyId(null)}
        onViewReceipt={onViewReceipt}
        onStartTransaction={(pid: string) => {
          setDetailedPartyId(null);
          handleOpenSaleForParty(pid);
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs transition-colors">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center space-x-2">
            <Truck className="w-6 h-6 text-emerald-700 dark:text-emerald-400" />
            <span>{t('ধান বিক্রি ও ট্রাক চালানি (Sales & Transport)', 'Paddy Sales & Transport Challan')}</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {t('মিল মালিক ও পাইকারদের কাছে ধান বিক্রি, বস্তা ও মন হিসাব, ট্রাক ও ড্রাইভার ট্র্যাকিং।', 'Track sales to mills, bag & mon weights, and transport/driver details.')}
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsNewPartyModalOpen(true)}
            className="px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold text-xs transition flex items-center space-x-1.5 shadow-xs"
          >
            <UserPlus className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
            <span>{t('+ নতুন ক্রেতা / পার্টি', '+ Register Party')}</span>
          </button>

          <button
            onClick={() => {
              setSelectedPartyId('');
              setIsEntryModalOpen(true);
            }}
            className="px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs sm:text-sm shadow transition flex items-center space-x-1.5 active:scale-95"
          >
            <PlusCircle className="w-4 h-4 text-amber-300" />
            <span>{t('+ নতুন বিক্রি চালান', '+ New Sales Challan')}</span>
          </button>
        </div>
      </div>

      {/* Top Summary Cards (Requirement 2: ধান কেনাকাটার page-এর মতো একইভাবে) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Volume */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
            {t('মোট বিক্রয়কৃত ধান', 'Total Sold Paddy')}
          </span>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            {toBengaliNumber(totalMonSold.toFixed(1))} <span className="text-sm font-semibold text-slate-500">{t('মন', 'Mon')}</span>
          </div>
          <div className="text-xs font-semibold text-blue-600 dark:text-blue-400 mt-1">
            {toBengaliNumber(totalBagsSold)} {t('বস্তা', 'Bags')} ({toBengaliNumber(sales.length)} {t('টি চালান', 'invoices')})
          </div>
        </div>

        {/* Card 2: Total Sales Bill */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
            {t('মোট বিক্রয় বিল', 'Total Sales Bill')}
          </span>
          <div className="text-2xl font-black text-emerald-700 dark:text-emerald-400 mt-1">
            {formatCurrency(totalSalesBill)}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            {t('পার্টিদের কাছে মোট বিক্রয় মূল্য', 'Total revenue billed')}
          </div>
        </div>

        {/* Card 3: Total Received */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
            {t('আদায়কৃত টাকা', 'Total Received')}
          </span>
          <div className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">
            {formatCurrency(totalReceived)}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            {t('নগদ ও ব্যাংক আদায়', 'Collected from buyers')}
          </div>
        </div>

        {/* Card 4: Total Due */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
            {t('মোট বাকি পাওনা', 'Total Receivables (Due)')}
          </span>
          <div className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">
            {formatCurrency(totalDue)}
          </div>
          <div className="text-xs font-semibold text-rose-500 mt-1">
            {t('পার্টির কাছে বকেয়া পাওনা', 'Pending collection')}
          </div>
        </div>
      </div>

      {/* Subtab Toggle: Challans vs Parties */}
      <div className="flex items-center justify-between bg-slate-100 dark:bg-slate-800/80 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700">
        <div className="flex space-x-1">
          <button
            onClick={() => setActiveSubTab('challans')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center space-x-1.5 ${
              activeSubTab === 'challans'
                ? 'bg-white dark:bg-slate-900 text-emerald-950 dark:text-amber-200 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Truck className="w-4 h-4 text-emerald-600" />
            <span>{t('বিক্রি ও চালানের তালিকা', 'Sales Challans')}</span>
            <span className="ml-1 text-[11px] px-1.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700">
              {toBengaliNumber(sales.length)}
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('parties')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center space-x-1.5 ${
              activeSubTab === 'parties'
                ? 'bg-white dark:bg-slate-900 text-emerald-950 dark:text-amber-200 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Building2 className="w-4 h-4 text-blue-600" />
            <span>{t('ক্রেতা ও মিল পার্টির তালিকা', 'Parties List')}</span>
            <span className="ml-1 text-[11px] px-1.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700">
              {toBengaliNumber(parties.length)}
            </span>
          </button>
        </div>

        <p className="text-[11px] text-slate-500 dark:text-slate-400 pr-3 hidden md:inline">
          {t('যেকোনো তালিকায় ডাবল-ক্লিক করলে বিস্তারিত চালান ও প্রোফাইল ওপেন হবে।', 'Double-click any row to view full details.')}
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row gap-3 items-center justify-between transition-colors">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder={
              activeSubTab === 'challans' 
                ? t('পার্টি, চালান নম্বর বা ট্রাক নম্বর খুঁজুন...', 'Search party, challan or truck...') 
                : t('পার্টি/মিলের নাম, ফোন বা মোকাম খুঁজুন...', 'Search party name, phone or address...')
            }
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {activeSubTab === 'challans' && (
          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{t('ধানের জাত:', 'Variety:')}</span>
            <select
              value={filterVariety}
              onChange={e => setFilterVariety(e.target.value)}
              className="py-1.5 px-3 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="ALL">{t('সকল জাত', 'All Varieties')}</option>
              {varieties.map(v => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* VIEW 1: Sales & Truck Shipments Table */}
      {activeSubTab === 'challans' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden transition-colors">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 font-semibold">
                <tr>
                  <th className="py-3 px-4">{t('চালান নং ও তারিখ', 'Challan & Date')}</th>
                  <th className="py-3 px-4">{t('পার্টি / ক্রেতা', 'Buyer / Party')}</th>
                  <th className="py-3 px-4">{t('ধানের জাত', 'Variety')}</th>
                  <th className="py-3 px-4">{t('বস্তা ও মোট ওজন', 'Bags & Mon')}</th>
                  <th className="py-3 px-4">{t('ট্রাক ও ড্রাইভার', 'Truck & Driver')}</th>
                  <th className="py-3 px-4 text-right">{t('মোট বিল', 'Total Bill')}</th>
                  <th className="py-3 px-4 text-right">{t('নগদ আদায়', 'Received')}</th>
                  <th className="py-3 px-4 text-right">{t('বাকি', 'Due')}</th>
                  <th className="py-3 px-4 text-center">{t('অ্যাকশন', 'Actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredSales.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400">
                      {t('কোনো বিক্রয় চালানের তথ্য পাওয়া যায়নি।', 'No sales challans found.')}
                    </td>
                  </tr>
                ) : (
                  filteredSales.map(s => (
                    <tr 
                      key={s.id} 
                      onDoubleClick={() => setDetailedPartyId(s.partyId)}
                      title={t('ডাবল ক্লিক করে এই পার্টির বিস্তারিত খতিয়ান ও হিসাব দেখুন', 'Double-click to view detailed ledger')}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/60 transition cursor-pointer select-none"
                    >
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 dark:text-white">{s.challanNumber}</div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">{s.date}</div>
                      </td>
                      {/* পার্টির নাম ও ফোন সেলটি ক্লিক করলে সরাসরি বিক্রি চালানের এন্ট্রি পেজ ওপেন হবে */}
                      <td className="py-3 px-4">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenSaleForParty(s.partyId);
                          }}
                          className="w-full text-left group p-1 -m-1 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition flex flex-col items-start"
                          title={t('ক্লিক করে এই মিল/পার্টির জন্য সরাসরি ধান বিক্রি চালান এন্ট্রি করুন', 'Click to directly enter sales challan for this party')}
                        >
                          <span className="font-bold text-slate-900 dark:text-white group-hover:text-emerald-700 dark:group-hover:text-emerald-400 group-hover:underline">
                            {s.partyName}
                          </span>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400">{s.partyPhone || '---'}</span>
                        </button>
                      </td>
                      <td className="py-3 px-4 font-medium text-emerald-800 dark:text-emerald-400">
                        {s.varietyName}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-800 dark:text-slate-200">
                          {toBengaliNumber(s.bagCount)} বস্তা ({toBengaliNumber(s.totalMon)} মন)
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          {s.perBagWeight ? `প্রতি বস্তা: ${toBengaliNumber(s.perBagWeight)} ${s.perBagUnit === 'kg' ? 'কেজি' : 'মন'} | ` : ''}দর: ৳{s.ratePerMon}/মন
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-700 dark:text-slate-300">
                          {s.transportTruckNo || '---'}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          {s.transportDriverName ? `${s.transportDriverName} (${s.transportDriverPhone || ''})` : 'কোনো ড্রাইভার নেই'}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900 dark:text-white">
                        {formatCurrency(s.totalAmount)}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(s.receivedAmount)}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-rose-600 dark:text-rose-400">
                        {formatCurrency(s.dueAmount)}
                      </td>
                      {/* Eye svg button removed; double clicking list displays full data */}
                      <td className="py-3 px-4 text-center" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-center space-x-1.5">
                          <button
                            onClick={() => onViewReceipt('sale', s)}
                            title={t('চালান প্রিন্ট ও শেয়ার', 'Print Challan')}
                            className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 transition"
                          >
                            <Printer className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => setDeleteSaleTarget(s)}
                            title={t('মুছে ফেলুন', 'Delete')}
                            className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 hover:bg-rose-100 transition cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 2: Parties List (Requirement 2, 2.1, 2.5, 2.7) */}
      {activeSubTab === 'parties' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden transition-colors">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 font-semibold">
                <tr>
                  <th className="py-3 px-4">{t('পার্টি/মিলের নাম ও মোবাইল (ক্লিক বাটন)', 'Party & Mobile (Click Button)')}</th>
                  <th className="py-3 px-4">{t('ঠিকানা ও মোকাম', 'Address')}</th>
                  <th className="py-3 px-4">{t('মোট বিক্রি ধান (মন)', 'Total Mon')}</th>
                  <th className="py-3 px-4 text-right">{t('মোট বিক্রয় বিল', 'Total Bill')}</th>
                  <th className="py-3 px-4 text-right">{t('আদায়', 'Received')}</th>
                  <th className="py-3 px-4 text-right">{t('বর্তমান পাওনা (টাকা)', 'Current Due')}</th>
                  <th className="py-3 px-4 text-center">{t('অ্যাকশন বাটন', 'Actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald-900/40">
                {filteredParties.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      {t('কোনো পার্টির তথ্য পাওয়া যায়নি।', 'No party records found.')}
                    </td>
                  </tr>
                ) : (
                  filteredParties.map(p => {
                    const partySales = sales.filter(s => s.partyId === p.id || (p.phone && s.partyPhone === p.phone));
                    const totalSoldMon = partySales.reduce((sum, s) => sum + (s.totalMon || 0), 0);
                    const totalSalesAmount = partySales.reduce((sum, s) => sum + (s.totalAmount || 0), 0);
                    const totalReceivedAmount = partySales.reduce((sum, s) => sum + (s.receivedAmount || 0), 0);
                    const currentBalance = (p.openingBalance || 0) + (totalSalesAmount - totalReceivedAmount);
                    const isPaid = currentBalance <= 0;

                    return (
                      <tr
                        key={p.id}
                        onDoubleClick={() => setDetailedPartyId(p.id)}
                        title={t('ডাবল ক্লিক করে এই পার্টির বিস্তারিত খতিয়ান ও হিসাব দেখুন', 'Double-click to view detailed ledger')}
                        className={`transition cursor-pointer select-none ${
                          isPaid
                            ? 'opacity-80 bg-emerald-950/40 text-slate-300 hover:opacity-100 hover:bg-emerald-900/40'
                            : 'hover:bg-emerald-900/40'
                        }`}
                      >
                        {/* মিল বা কোম্পানির নাম ও মোবাইল */}
                        <td className="py-3.5 px-4">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenSaleForParty(p.id);
                            }}
                            className="text-left group flex flex-col items-start cursor-pointer"
                            title={t('ক্লিক করে এই মিল/পার্টির জন্য সরাসরি ধান বিক্রি চালান এন্ট্রি করুন', 'Click to directly enter sales challan')}
                          >
                            <span className="font-bold text-white group-hover:text-amber-300 group-hover:underline text-sm flex items-center space-x-1.5">
                              <span>{p.name}</span>
                              {isPaid && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-900 text-emerald-300 border border-emerald-700 font-semibold inline-flex items-center space-x-0.5">
                                  <CheckCircle className="w-3 h-3" />
                                  <span>পরিশোধিত</span>
                                </span>
                              )}
                            </span>
                            <span className="text-xs text-emerald-300/80 flex items-center space-x-1 mt-0.5">
                              <Phone className="w-3 h-3 text-amber-300" />
                              <span>{p.phone || 'ফোন নম্বর নেই'}</span>
                            </span>
                          </button>
                        </td>

                        <td className="py-3.5 px-4 text-emerald-200">
                          {p.address || p.village || 'শেরপুর, বগুড়া'}
                        </td>

                        <td className="py-3.5 px-4 font-black text-white">
                          {toBengaliNumber(totalSoldMon.toFixed(1))} মন
                        </td>

                        <td className="py-3.5 px-4 text-right font-bold text-amber-300">
                          {formatCurrency(totalSalesAmount)}
                        </td>

                        <td className="py-3.5 px-4 text-right text-emerald-300 font-bold">
                          {formatCurrency(totalReceivedAmount)}
                        </td>

                        <td className="py-3.5 px-4 text-right font-black">
                          <span className={isPaid ? 'text-emerald-400' : 'text-rose-400'}>
                            {formatCurrency(currentBalance)}
                          </span>
                        </td>

                        {/* Action buttons with 3-dot overlay menu */}
                        <td className="py-3.5 px-4 text-center relative" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center justify-center space-x-2">
                            <button
                              type="button"
                              onClick={() => handleOpenSaleForParty(p.id)}
                              className="px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs shadow-xs transition flex items-center space-x-1 active:scale-95 cursor-pointer"
                              title={t('এই পার্টির চালানি চালান ওপেন করুন', 'Open Sales Challan')}
                            >
                              <PlusCircle className="w-3.5 h-3.5 text-amber-300" />
                              <span>{t('+ বিক্রি চালান', '+ Challan')}</span>
                            </button>

                            {/* 3-dot Menu with strict z-50 overlay */}
                            <div className="relative inline-block text-left">
                              <button
                                type="button"
                                onClick={() => setOpenMenuId(openMenuId === p.id ? null : p.id)}
                                className="p-1.5 rounded-lg hover:bg-emerald-800 text-slate-300 hover:text-white transition cursor-pointer"
                                title="মেনু (⋮)"
                              >
                                <MoreVertical className="w-4 h-4" />
                              </button>

                              {openMenuId === p.id && (
                                <>
                                  <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setOpenMenuId(null)} />
                                  <div className="absolute right-0 top-full mt-1 w-48 bg-slate-900 border border-emerald-700 rounded-2xl shadow-2xl z-50 py-1.5 text-left animate-in fade-in duration-100">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setDetailedPartyId(p.id);
                                        setOpenMenuId(null);
                                      }}
                                      className="w-full px-3 py-2 text-left text-xs font-semibold text-slate-200 hover:bg-emerald-900/60 flex items-center space-x-2 cursor-pointer"
                                    >
                                      <Eye className="w-4 h-4 text-emerald-400" />
                                      <span>{t('বিস্তারিত প্রোফাইল (Details)', 'View Details')}</span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => {
                                        handleOpenSaleForParty(p.id);
                                        setOpenMenuId(null);
                                      }}
                                      className="w-full px-3 py-2 text-left text-xs font-semibold text-slate-200 hover:bg-emerald-900/60 flex items-center space-x-2 cursor-pointer"
                                    >
                                      <PlusCircle className="w-4 h-4 text-amber-400" />
                                      <span>{t('+ বিক্রি চালান এন্ট্রি', '+ New Challan')}</span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => {
                                        setDeletePartyTarget(p);
                                        setOpenMenuId(null);
                                      }}
                                      className="w-full px-3 py-2 text-left text-xs font-semibold text-rose-400 hover:bg-rose-950/40 flex items-center space-x-2 cursor-pointer"
                                    >
                                      <Trash2 className="w-4 h-4 text-rose-400" />
                                      <span>{t('পার্টি মুছে ফেলুন (Delete)', 'Delete Party')}</span>
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
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

      {/* MODAL 1: Sales Entry Form */}
      {isEntryModalOpen && (
        <div 
          className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6"
          onClick={() => setIsEntryModalOpen(false)}
        >
          <div 
            className="bg-slate-900 rounded-3xl shadow-2xl max-w-3xl w-full border border-emerald-800/80 animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh] text-slate-100 overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="shrink-0 bg-emerald-950 text-white px-5 py-4 flex items-center justify-between border-b border-emerald-800/80 shadow-xs">
              <div className="flex items-center space-x-2">
                <Truck className="w-5 h-5 text-amber-300" />
                <h3 className="font-bold text-base sm:text-lg">
                  {t('ধান বিক্রি ও ট্রাক চালান (Sale & Shipment Entry)', 'New Sale & Shipment Challan')}
                </h3>
              </div>
              <div className="flex items-center space-x-2">
                {onSwitchToPurchase && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsEntryModalOpen(false);
                      onSwitchToPurchase();
                    }}
                    className="text-xs font-bold px-2.5 py-1 rounded-lg bg-emerald-800 hover:bg-emerald-700 text-amber-300 transition flex items-center space-x-1 border border-emerald-700 shadow-xs cursor-pointer"
                    title={t('বিক্রেতার থেকে ধান কেনা মেমো এন্ট্রি করতে চান?', 'Go to Purchase Entry')}
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                    <span>{t('ধান কেনা মেমোতে যান ➔', 'Purchase Entry ➔')}</span>
                  </button>
                )}
                <button
                  onClick={() => setIsEntryModalOpen(false)}
                  className="text-white/80 hover:text-white font-bold p-1 text-lg leading-none"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Modal Form */}
            <form onSubmit={(e) => handleInitiateSubmitSale(e, false)} className="flex flex-col flex-1 overflow-hidden min-h-0">
              <div className="p-5 sm:p-6 space-y-5 text-slate-100 overflow-y-auto flex-1 overscroll-contain">
              
              {/* Row 1: Party & Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                      {t('ক্রেতা / মিল পার্টি *', 'Buyer / Mill Party *')}
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsNewPartyModalOpen(true)}
                      className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 hover:underline"
                    >
                      {t('+ নতুন পার্টি', '+ New Party')}
                    </button>
                  </div>
                  <select
                    value={selectedPartyId}
                    onChange={e => setSelectedPartyId(e.target.value)}
                    required
                    className="w-full p-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="">{t('-- ক্রেতা / পার্টি নির্বাচন করুন --', '-- Select Party --')}</option>
                    {parties.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.phone}) {(p.currentBalance || 0) > 0 ? `[পাওনা: ৳${p.currentBalance}]` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {t('চালানের তারিখ *', 'Challan Date *')}
                  </label>
                  <input
                    type="date"
                    required
                    value={saleDate}
                    onChange={e => setSaleDate(e.target.value)}
                    className="w-full p-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Row 2: Variety & Stock Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                      {t('ধানের জাত / ধরন *', 'Paddy Variety *')}
                    </label>
                    {selectedVarietyId && (
                      <span className={`text-[11px] font-bold ${isStockInsufficient ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {t('মজুদ: ', 'Stock: ')}{toBengaliNumber(availableStock)} মন
                      </span>
                    )}
                  </div>
                  <select
                    value={selectedVarietyId}
                    onChange={e => handleVarietyChange(e.target.value)}
                    required
                    className="w-full p-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="">{t('-- ধানের জাত নির্বাচন করুন --', '-- Select Variety --')}</option>
                    {varieties.map(v => (
                      <option key={v.id} value={v.id}>
                        {v.name} (মজুদ: {v.currentStockMon} মন | দর: ৳{v.defaultSaleRate || 0})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {t('প্রতি মনের দর (টাকা) *', 'Rate Per Mon (৳) *')}
                  </label>
                  <input
                    type="number"
                    min="100"
                    step="1"
                    required
                    placeholder="যেমন: 1350"
                    value={ratePerMon}
                    onChange={e => setRatePerMon(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full p-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Row 3: Bag Count & Weight Calculation (Upgraded per user requirement) */}
              <div className="bg-emerald-50/80 dark:bg-emerald-950/40 p-4 rounded-2xl border border-emerald-200 dark:border-emerald-800 space-y-3 shadow-xs">
                
                {/* Mode Selector & Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-emerald-200/80 dark:border-emerald-800/80 pb-2.5">
                  <div className="flex items-center space-x-2">
                    <Scale className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                    <span className="text-xs font-bold text-emerald-950 dark:text-emerald-200">
                      {t('বস্তা ও ধানের ওজন হিসাব (Weight Calculation)', 'Bags & Weight Calculation')}
                    </span>
                  </div>

                  {/* Mode Tabs */}
                  <div className="flex items-center p-0.5 rounded-lg bg-emerald-100/80 dark:bg-emerald-900/60 text-[11px] font-bold">
                    <button
                      type="button"
                      onClick={() => setCalcMode('per_bag')}
                      className={`px-2.5 py-1 rounded-md transition ${
                        calcMode === 'per_bag'
                          ? 'bg-emerald-700 text-white shadow-xs'
                          : 'text-emerald-800 dark:text-emerald-300 hover:text-emerald-950'
                      }`}
                    >
                      {t('প্রতি বস্তার ওজন দিয়ে হিসাব', 'By Weight Per Bag')}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCalcMode('total_weight');
                        if (calculatedTotalMon > 0 && !directMon) {
                          setDirectMon(Math.floor(calculatedTotalMon));
                          setDirectKg(Number(((calculatedTotalMon - Math.floor(calculatedTotalMon)) * 40).toFixed(1)));
                        }
                      }}
                      className={`px-2.5 py-1 rounded-md transition ${
                        calcMode === 'total_weight'
                          ? 'bg-emerald-700 text-white shadow-xs'
                          : 'text-emerald-800 dark:text-emerald-300 hover:text-emerald-950'
                      }`}
                    >
                      {t('সরাসরি মোট ওজন', 'Direct Total Weight')}
                    </button>
                  </div>
                </div>

                {/* MODE 1: PER BAG CALCULATION (User's primary requirement: "per boshtai 50 mon/kg dhan ache") */}
                {calcMode === 'per_bag' && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Input 1: Bag Count */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                          {t('বস্তার সংখ্যা (মোট বস্তা) *', 'Bag Count (Total Bags) *')}
                        </label>
                        <input
                          type="number"
                          min="1"
                          required
                          placeholder="যেমন: ১২০"
                          value={bagCount}
                          onChange={e => setBagCount(e.target.value === '' ? '' : Number(e.target.value))}
                          className="w-full p-2.5 text-base rounded-xl border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-black focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        />
                      </div>

                      {/* Input 2: Per Bag Weight with Unit Toggle */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                            {t('প্রতি বস্তায় ধানের পরিমাণ *', 'Paddy per Bag *')}
                          </label>

                          {/* Unit Toggle: Mon vs Kg */}
                          <div className="flex items-center bg-slate-200 dark:bg-slate-700 rounded-md p-0.5 text-[10px] font-bold">
                            <button
                              type="button"
                              onClick={() => setPerBagUnit('mon')}
                              className={`px-2 py-0.5 rounded transition ${
                                perBagUnit === 'mon'
                                  ? 'bg-amber-600 text-white font-extrabold shadow-xs'
                                  : 'text-slate-700 dark:text-slate-300'
                              }`}
                            >
                              মণ (Mon)
                            </button>
                            <button
                              type="button"
                              onClick={() => setPerBagUnit('kg')}
                              className={`px-2 py-0.5 rounded transition ${
                                perBagUnit === 'kg'
                                  ? 'bg-emerald-600 text-white font-extrabold shadow-xs'
                                  : 'text-slate-700 dark:text-slate-300'
                              }`}
                            >
                              কেজি (Kg)
                            </button>
                          </div>
                        </div>

                        <div className="relative">
                          <input
                            type="number"
                            min="0.1"
                            step="any"
                            required
                            placeholder={perBagUnit === 'mon' ? 'যেমন: ৫০' : 'যেমন: ৫০'}
                            value={perBagWeight}
                            onChange={e => setPerBagWeight(e.target.value === '' ? '' : Number(e.target.value))}
                            className="w-full p-2.5 text-base rounded-xl border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-black pr-20 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                          />
                          <span className="absolute right-3 top-3 text-xs font-bold text-slate-500 dark:text-slate-400 pointer-events-none">
                            {perBagUnit === 'mon' ? 'মণ / বস্তা' : 'কেজি / বস্তা'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Quick Preset Buttons */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                        {t('কুইক সেট:', 'Presets:')}
                      </span>
                      {perBagUnit === 'mon' ? (
                        <>
                          <button
                            type="button"
                            onClick={() => setPerBagWeight(50)}
                            className="px-2 py-0.5 text-[11px] rounded bg-white dark:bg-slate-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-slate-300 dark:border-slate-700 font-bold text-slate-800 dark:text-slate-200 transition"
                          >
                            ৫০ মণ
                          </button>
                          <button
                            type="button"
                            onClick={() => setPerBagWeight(1)}
                            className="px-2 py-0.5 text-[11px] rounded bg-white dark:bg-slate-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-slate-300 dark:border-slate-700 font-bold text-slate-800 dark:text-slate-200 transition"
                          >
                            ১ মণ (৪০ কেজি)
                          </button>
                          <button
                            type="button"
                            onClick={() => setPerBagWeight(1.25)}
                            className="px-2 py-0.5 text-[11px] rounded bg-white dark:bg-slate-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-slate-300 dark:border-slate-700 font-bold text-slate-800 dark:text-slate-200 transition"
                          >
                            ১.২৫ মণ (৫০ কেজি)
                          </button>
                          <button
                            type="button"
                            onClick={() => setPerBagWeight(2)}
                            className="px-2 py-0.5 text-[11px] rounded bg-white dark:bg-slate-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-slate-300 dark:border-slate-700 font-bold text-slate-800 dark:text-slate-200 transition"
                          >
                            ২ মণ
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => setPerBagWeight(50)}
                            className="px-2 py-0.5 text-[11px] rounded bg-white dark:bg-slate-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-slate-300 dark:border-slate-700 font-bold text-slate-800 dark:text-slate-200 transition"
                          >
                            ৫০ কেজি (স্ট্যান্ডার্ড)
                          </button>
                          <button
                            type="button"
                            onClick={() => setPerBagWeight(60)}
                            className="px-2 py-0.5 text-[11px] rounded bg-white dark:bg-slate-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-slate-300 dark:border-slate-700 font-bold text-slate-800 dark:text-slate-200 transition"
                          >
                            ৬০ কেজি
                          </button>
                          <button
                            type="button"
                            onClick={() => setPerBagWeight(75)}
                            className="px-2 py-0.5 text-[11px] rounded bg-white dark:bg-slate-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-slate-300 dark:border-slate-700 font-bold text-slate-800 dark:text-slate-200 transition"
                          >
                            ৭৫ কেজি
                          </button>
                          <button
                            type="button"
                            onClick={() => setPerBagWeight(85)}
                            className="px-2 py-0.5 text-[11px] rounded bg-white dark:bg-slate-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-slate-300 dark:border-slate-700 font-bold text-slate-800 dark:text-slate-200 transition"
                          >
                            ৮৫ কেজি
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* MODE 2: DIRECT TOTAL WEIGHT (Truck Scale / Weighbridge) */}
                {calcMode === 'total_weight' && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                          {t('বস্তার সংখ্যা (Bags) *', 'Bag Count *')}
                        </label>
                        <input
                          type="number"
                          min="1"
                          required
                          placeholder="যেমন: ১২০"
                          value={bagCount}
                          onChange={e => setBagCount(e.target.value === '' ? '' : Number(e.target.value))}
                          className="w-full p-2.5 text-base rounded-xl border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-black focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                          {t('মোট ওজন (মন) *', 'Total Weight (Mon) *')}
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          required
                          placeholder="যেমন: ১৫০ বা ৬০০০"
                          value={directMon}
                          onChange={e => setDirectMon(e.target.value === '' ? '' : Number(e.target.value))}
                          className="w-full p-2.5 text-base rounded-xl border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-black focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                          {t('অতিরিক্ত কেজি (০-৩৯)', 'Extra Kg (0-39)')}
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="39.99"
                          step="any"
                          placeholder="যেমন: ০"
                          value={directKg}
                          onChange={e => setDirectKg(e.target.value === '' ? '' : Number(e.target.value))}
                          className="w-full p-2.5 text-base rounded-xl border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-black focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* CRYSTAL-CLEAR LIVE BREAKDOWN CARD (Fixes the misunderstanding completely) */}
                <div className="bg-white dark:bg-slate-900/90 rounded-xl p-3 border border-emerald-300 dark:border-emerald-700/60 shadow-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 border-b border-slate-100 dark:border-slate-800 pb-2">
                    <div className="flex items-center space-x-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      <span className="text-xs font-bold text-emerald-950 dark:text-emerald-200">
                        {t('মোট ধানের নির্ভুল হিসাব:', 'Accurate Total Paddy Summary:')}
                      </span>
                    </div>
                    <div className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                      {numBags > 0 ? (
                        <span>
                          {toBengaliNumber(numBags)} বস্তা × প্রতি বস্তা{' '}
                          <b>{toBengaliNumber(calculatedPerBagWeightDisplay)} {calculatedPerBagUnitDisplay}</b>
                        </span>
                      ) : (
                        <span>{t('বস্তার সংখ্যা লিখুন', 'Enter bag count')}</span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2.5 text-center">
                    <div className="p-2 rounded-lg bg-emerald-50/70 dark:bg-emerald-950/60">
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-bold uppercase">
                        {t('মোট বস্তা', 'Total Bags')}
                      </span>
                      <span className="text-base font-black text-emerald-800 dark:text-emerald-300">
                        {toBengaliNumber(numBags)} টি
                      </span>
                    </div>

                    <div className="p-2 rounded-lg bg-amber-50/70 dark:bg-amber-950/60">
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-bold uppercase">
                        {t('প্রতি বস্তায় ধান', 'Paddy per Bag')}
                      </span>
                      <span className="text-base font-black text-amber-800 dark:text-amber-300">
                        {toBengaliNumber(calculatedPerBagWeightDisplay)} {calculatedPerBagUnitDisplay}
                      </span>
                    </div>

                    <div className="p-2 rounded-lg bg-emerald-100/70 dark:bg-emerald-900/60 sm:col-span-2">
                      <span className="text-[10px] text-slate-600 dark:text-slate-300 block font-bold uppercase">
                        {t('সর্বমোট চালানি ওজন', 'Total Shipment Weight')}
                      </span>
                      <div className="flex items-center justify-center space-x-1">
                        <span className="text-lg font-black text-emerald-950 dark:text-emerald-100">
                          {toBengaliNumber(numMon.toFixed(2))} মন
                        </span>
                        <span className="text-xs text-emerald-800 dark:text-emerald-300 font-semibold">
                          ({toBengaliNumber((numMon * 40).toFixed(1))} কেজি)
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Explicit Explanation Label preventing the reported misunderstanding */}
                  {numBags > 0 && numMon > 0 && (
                    <div className="mt-2.5 pt-2 border-t border-dashed border-emerald-200 dark:border-emerald-800 text-[11px] font-semibold text-emerald-900 dark:text-emerald-300 flex items-start space-x-1.5">
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold text-sm leading-none">✓</span>
                      <span>
                        {t(
                          `নির্ভুল হিসাব: ${toBengaliNumber(numBags)}টি বস্তার প্রতিটিতে ${toBengaliNumber(calculatedPerBagWeightDisplay)} ${calculatedPerBagUnitDisplay} করে সর্বমোট ${toBengaliNumber(numMon.toFixed(2))} মণ ধান লোড হচ্ছে (${toBengaliNumber(numBags)} বস্তায় মোট ${toBengaliNumber(calculatedPerBagWeightDisplay)} ${calculatedPerBagUnitDisplay} নয়, বরং প্রতি বস্তায় ${toBengaliNumber(calculatedPerBagWeightDisplay)} ${calculatedPerBagUnitDisplay})।`,
                          `Accurate calculation: ${numBags} bags with ${calculatedPerBagWeightDisplay} ${calculatedPerBagUnitDisplay} in each bag gives a total of ${numMon.toFixed(2)} Mon of paddy.`
                        )}
                      </span>
                    </div>
                  )}
                </div>

                {isStockInsufficient && (
                  <p className="text-xs font-bold text-rose-600 dark:text-rose-400 flex items-center space-x-1 p-2 rounded-lg bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                    <span>{t('সতর্কতা: গুদামে বর্তমান স্টকের চেয়ে বেশি বিক্রি ইনপুট দেওয়া হয়েছে!', 'Warning: Entered weight exceeds current stock!')}</span>
                  </p>
                )}
              </div>

              {/* Row 4: Total Bill, Received Amount & Due */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block uppercase">
                    {t('মোট বিক্রয় মূল্য (টাকা)', 'Total Sales Bill')}
                  </span>
                  <div className="text-xl font-black text-slate-900 dark:text-white mt-1">
                    {formatCurrency(computedTotalAmount)}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {t('নগদ আদায় / প্রাপ্তি (৳)', 'Received Amount (৳)')}
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="যেমন: 20000"
                    value={receivedAmount}
                    onChange={e => setReceivedAmount(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full p-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold text-base focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div className="bg-blue-50 dark:bg-blue-950/40 p-3 rounded-xl border border-blue-200 dark:border-blue-900">
                  <span className="text-[11px] font-semibold text-blue-800 dark:text-blue-300 block uppercase">
                    {t('অবশিষ্ট পাওনা (পার্টি খতিয়ানে)', 'Remaining Due')}
                  </span>
                  <div className="text-xl font-black text-blue-600 dark:text-blue-400 mt-1">
                    {formatCurrency(computedDueAmount)}
                  </div>
                </div>
              </div>

              {/* Row 5: Transport Details (Requirements 2.3 & 2.4) */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 space-y-3">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center space-x-1.5">
                  <Navigation className="w-4 h-4 text-emerald-600" />
                  <span>{t('পরিবহন ও ট্রাক বিবরণী (Transport Details - ঐচ্ছিক)', 'Transport Details (Optional)')}</span>
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      {t('ট্রাক নম্বর', 'Truck Number')}
                    </label>
                    <input
                      type="text"
                      placeholder="ঢাকা মেট্রো-ট ১১-২২৩৩"
                      value={truckNo}
                      onChange={e => setTruckNo(e.target.value)}
                      className="w-full p-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      {t('ড্রাইভারের নাম', 'Driver Name')}
                    </label>
                    <input
                      type="text"
                      placeholder="যেমন: রফিক মিয়া"
                      value={driverName}
                      onChange={e => setDriverName(e.target.value)}
                      className="w-full p-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      {t('ড্রাইভারের মোবাইল', 'Driver Phone')}
                    </label>
                    <input
                      type="text"
                      placeholder="০১৭xxxxxxxx"
                      value={driverPhone}
                      onChange={e => setDriverPhone(e.target.value)}
                      className="w-full p-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                {/* Requirements 2.3 & 2.4: NID Number and NID Photo Option */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200 dark:border-slate-700">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1 flex items-center space-x-1">
                      <IdCard className="w-3.5 h-3.5 text-indigo-500" />
                      <span>{t('ড্রাইভারের NID নম্বর (ঐচ্ছিক)', 'Driver NID Number (Optional)')}</span>
                    </label>
                    <input
                      type="text"
                      placeholder="যেমন: 198210192837465"
                      value={driverNid}
                      onChange={e => setDriverNid(e.target.value)}
                      className="w-full p-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1 flex items-center space-x-1">
                      <Camera className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{t('NID কার্ডের ছবি (ঐচ্ছিক)', 'NID Card Photo (Optional)')}</span>
                    </label>
                    
                    <div className="flex items-center space-x-2">
                      <label className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition flex items-center space-x-1">
                        <Camera className="w-3.5 h-3.5" />
                        <span>{driverNidImage ? t('ছবি পরিবর্তন', 'Change Photo') : t('ছবি আপলোড / ক্যামেরা', 'Upload Photo')}</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleNidImageUpload}
                          className="hidden"
                        />
                      </label>

                      {driverNidImage && (
                        <div className="flex items-center space-x-2">
                          <img
                            src={driverNidImage}
                            alt="Driver NID"
                            className="w-8 h-8 rounded-md object-cover border border-emerald-500"
                          />
                          <button
                            type="button"
                            onClick={() => setDriverNidImage('')}
                            className="text-rose-500 hover:text-rose-700 text-xs font-bold"
                          >
                            ✕
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200 dark:border-slate-700">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      {t('ট্রাকের ভাড়া (৳)', 'Truck Fare (৳)')}
                    </label>
                    <input
                      type="number"
                      min="0"
                      placeholder="যেমন: 5000"
                      value={truckFare}
                      onChange={e => setTruckFare(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full p-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      {t('ভাড়া পরিশোধকারী', 'Fare Paid By')}
                    </label>
                    <select
                      value={farePaidBy}
                      onChange={e => setFarePaidBy(e.target.value as 'buyer' | 'seller')}
                      className="w-full p-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    >
                      <option value="buyer">ক্রেতা / পার্টি বহন করবে</option>
                      <option value="seller">আড়তদার বহন করবে</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  {t('মন্তব্য / নোট (ঐচ্ছিক)', 'Notes / Remarks (Optional)')}
                </label>
                <input
                  type="text"
                  placeholder="যেমন: বাবুবাজার মোকামে ডেলিভারি..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="w-full p-2 text-xs sm:text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              </div>

              {/* Action Buttons (Clean Fixed Bottom) */}
              <div className="shrink-0 bg-slate-900 px-5 sm:px-6 py-4 border-t border-emerald-800/80 flex flex-col sm:flex-row items-center justify-end gap-2.5 shadow-md">
                <button
                  type="button"
                  onClick={() => setIsEntryModalOpen(false)}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 font-semibold text-xs hover:bg-slate-800 cursor-pointer"
                >
                  {t('বাতিল', 'Cancel')}
                </button>

                <button
                  type="button"
                  disabled={submitting}
                  onClick={(e) => handleInitiateSubmitSale(e, true)}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs sm:text-sm shadow flex items-center justify-center space-x-1.5 transition active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>{submitting ? t('সংরক্ষণ হচ্ছে...', 'Saving...') : t('চালান সংরক্ষণ ও প্রিন্ট', 'Save & Print Challan')}</span>
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-emerald-950 font-black text-xs sm:text-sm shadow-md transition active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  <span>{submitting ? t('সংরক্ষণ হচ্ছে...', 'Saving...') : t('✓ চালান সম্পন্ন করুন', '✓ Complete Challan')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Incomplete Form Warning Notification (Requirement 2.2) */}
      {showIncompleteWarning && (
        <div 
          className="fixed inset-0 z-60 overflow-y-auto bg-black/70 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setShowIncompleteWarning(false)}
        >
          <div 
            className="bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-amber-500 animate-in fade-in zoom-in-95 duration-150 text-slate-100"
            onClick={e => e.stopPropagation()}
          >
            <div className="bg-amber-500 text-amber-950 px-5 py-4 flex items-center space-x-2 font-black">
              <AlertTriangle className="w-5 h-5 text-amber-950" />
              <span>{t('সতর্কতা নোটিফিকেশন (Incomplete Fields)', 'Warning: Incomplete Fields')}</span>
            </div>

            <div className="p-5 space-y-4 text-slate-200 text-sm">
              <p className="font-semibold text-white">
                {t(
                  'সবগুলো ঘর পূরণ করা হয়নি (যেমন: ট্রাক নম্বর, ড্রাইভারের নাম, ড্রাইভারের মোবাইল, NID বা মন্তব্য খালি রয়েছে)।',
                  'Not all fields have been filled (e.g. truck number, driver name/phone, NID or notes are empty).'
                )}
              </p>
              <p className="text-xs text-slate-400">
                {t(
                  'আপনি কি এভাবেই চালানটি সংরক্ষণ করতে চান, নাকি পুনরায় এডিট করবেন?',
                  'Do you want to save the challan as-is, or go back and edit?'
                )}
              </p>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-emerald-900/60">
                <button
                  type="button"
                  onClick={() => setShowIncompleteWarning(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 font-bold text-xs hover:bg-slate-800 transition cursor-pointer"
                >
                  {t('← আবার এডিট করুন (Edit)', '← Edit')}
                </button>

                <button
                  type="button"
                  onClick={() => executeSaveSale(printAfterWarning)}
                  className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs shadow transition active:scale-95 cursor-pointer"
                >
                  {t('হ্যাঁ, এভাবেই সেভ করুন (Yes)', 'Yes, Save')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: New Party Registration (Requirement 2.5: No duplicates) */}
      {isNewPartyModalOpen && (
        <div 
          className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
          onClick={() => setIsNewPartyModalOpen(false)}
        >
          <div 
            className="bg-slate-900 rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-emerald-800/80 animate-in fade-in zoom-in-95 duration-150 text-slate-100"
            onClick={e => e.stopPropagation()}
          >
            <div className="bg-emerald-950 text-white px-5 py-4 flex items-center justify-between border-b border-emerald-800">
              <h3 className="font-bold text-base flex items-center space-x-2">
                <UserPlus className="w-4 h-4 text-amber-300" />
                <span>{t('নতুন ক্রেতা / মিল পার্টি নিবন্ধন', 'Register New Buyer / Party')}</span>
              </h3>
              <button
                onClick={() => setIsNewPartyModalOpen(false)}
                className="text-white/80 hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateParty} className="p-5 space-y-4 text-slate-800 dark:text-slate-200">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {t('ক্রেতা / মিলের নাম *', 'Party / Mill Name *')}
                </label>
                <input
                  type="text"
                  required
                  placeholder="যেমন: সোনার বাংলা অটো রাইস মিল"
                  value={newPartyName}
                  onChange={e => setNewPartyName(e.target.value)}
                  className="w-full p-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {t('মোবাইল নম্বর * (ইউনিক)', 'Mobile Number * (Unique)')}
                </label>
                <input
                  type="text"
                  required
                  placeholder="যেমন: 01712345678"
                  value={newPartyPhone}
                  onChange={e => setNewPartyPhone(e.target.value)}
                  className="w-full p-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {t('জাতীয় পরিচয়পত্র / NID (ঐচ্ছিক)', 'NID Number (Optional)')}
                </label>
                <input
                  type="text"
                  placeholder="যেমন: 19851012345678901"
                  value={newPartyNid}
                  onChange={e => setNewPartyNid(e.target.value)}
                  className="w-full p-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {t('ঠিকানা / মোকাম', 'Address / Market Location')}
                </label>
                <input
                  type="text"
                  placeholder="যেমন: বাবুবাজার, ঢাকা / নওগাঁ"
                  value={newPartyAddress}
                  onChange={e => setNewPartyAddress(e.target.value)}
                  className="w-full p-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {t('পূর্বের বাকি টাকা (৳)', 'Opening Balance (৳)')}
                </label>
                <input
                  type="number"
                  placeholder="0"
                  value={newPartyOpeningBalance}
                  onChange={e => setNewPartyOpeningBalance(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full p-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsNewPartyModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold"
                >
                  {t('বাতিল', 'Cancel')}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow"
                >
                  {t('নিবন্ধন সম্পন্ন করুন', 'Register Party')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Deleting Sale / Challan */}
      <ConfirmationModal
        isOpen={Boolean(deleteSaleTarget)}
        title={t('চালান মুছে ফেলার নিশ্চিতকরণ', 'Delete Challan Confirmation')}
        message={t('আপনি কি নিশ্চিত যে এই চালানটি মুছে ফেলতে চান? এতে চালানের ধান গুদাম স্টকে ফেরত যাবে এবং খতিয়ানের লেনদেন সমন্বয় হবে।', 'Are you sure you want to delete this sales challan? The paddy will be restored to warehouse stock and the ledger adjusted.')}
        itemDetails={deleteSaleTarget ? `চালান #${deleteSaleTarget.challanNumber} • পার্টি: ${deleteSaleTarget.partyName} • মোট বিল: ${formatCurrency(deleteSaleTarget.totalAmount)} • ধান: ${toBengaliNumber(deleteSaleTarget.totalMon.toFixed(1))} মন` : ''}
        onConfirm={async () => {
          if (deleteSaleTarget) {
            await deleteSale(deleteSaleTarget.id);
            setDeleteSaleTarget(null);
          }
        }}
        onCancel={() => setDeleteSaleTarget(null)}
      />

      {/* Confirmation Modal for Deleting Party */}
      <ConfirmationModal
        isOpen={Boolean(deletePartyTarget)}
        title={t('পার্টি মুছে ফেলার নিশ্চিতকরণ', 'Delete Party Confirmation')}
        message={t('আপনি কি নিশ্চিতভাবে এই পার্টিকে মুছে ফেলতে চান?', 'Are you sure you want to delete this party?')}
        itemDetails={deletePartyTarget ? `পার্টি: ${deletePartyTarget.name} (${deletePartyTarget.phone || 'ফোন নেই'})` : ''}
        onConfirm={async () => {
          if (deletePartyTarget) {
            await deleteParty(deletePartyTarget.id);
            setDeletePartyTarget(null);
          }
        }}
        onCancel={() => setDeletePartyTarget(null)}
      />
    </div>
  );
};
