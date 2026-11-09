import React, { useState, useEffect } from 'react';
import { 
  Wallet, QrCode, CreditCard, ArrowUpRight, CheckCircle2, ShieldCheck, 
  Copy, Check, Sparkles, Smartphone, Landmark, Coins, AlertCircle, 
  RefreshCw, ExternalLink, HelpCircle, ArrowRight, Send
} from 'lucide-react';
import { User, DepositRecord } from '../types.ts';

interface WalletViewProps {
  userBalance: number;
  providerBalance: string;
  currentUser: User | null;
  onRequireLogin: () => void;
  onAddFunds: (amount: number, method: string, exactNewBalance?: number) => void;
  onShowToast: (type: 'success' | 'error' | 'warning' | 'info', title: string, message?: string) => void;
}

type PaymentMethodType = 'paytm_qr' | 'phonepe' | 'gpay' | 'card' | 'netbanking' | 'crypto';

export const WalletView: React.FC<WalletViewProps> = ({
  userBalance,
  providerBalance,
  currentUser,
  onRequireLogin,
  onAddFunds,
  onShowToast
}) => {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethodType>('paytm_qr');
  const [amount, setAmount] = useState<string>('1000');
  const [utrNumber, setUtrNumber] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [copiedVpa, setCopiedVpa] = useState<boolean>(false);
  const [copiedCrypto, setCopiedCrypto] = useState<boolean>(false);

  // Card payment state
  const [cardNumber, setCardNumber] = useState<string>('');
  const [cardExpiry, setCardExpiry] = useState<string>('');
  const [cardCvv, setCardCvv] = useState<string>('');
  const [cardHolder, setCardHolder] = useState<string>('');

  // Netbanking state
  const [selectedBank, setSelectedBank] = useState<string>('State Bank of India (SBI)');

  // Crypto state
  const [cryptoTxId, setCryptoTxId] = useState<string>('');

  // Deposits history
  const [deposits, setDeposits] = useState<DepositRecord[]>([]);
  const [isLoadingDeposits, setIsLoadingDeposits] = useState<boolean>(false);

  const UPI_VPA = 'bobeegautam1@ptaxis';
  const CRYPTO_ADDRESS = 'TXn89JkL44vPwQtR12yUm79qZsA67c4E29';
  const QR_IMAGE_URL = '/assets/aistudio/IMG_20261110_004130_12c35e0e.jpg';

  const presets = [100, 500, 1000, 2000, 5000, 10000];

  // Fetch deposits history
  const fetchDeposits = async () => {
    setIsLoadingDeposits(true);
    try {
      const url = currentUser ? `/api/deposits?userId=${currentUser.id}` : '/api/deposits';
      const res = await fetch(url);
      const data = await res.json();
      if (data.success && Array.isArray(data.deposits)) {
        setDeposits(data.deposits);
      }
    } catch (e) {
      console.error('Failed fetching deposits:', e);
    } finally {
      setIsLoadingDeposits(false);
    }
  };

  useEffect(() => {
    fetchDeposits();
  }, [currentUser]);

  // Calculate bonus dynamically
  const parsedAmount = parseFloat(amount) || 0;
  const calculateBonus = (amt: number, method: PaymentMethodType) => {
    if ((method === 'paytm_qr' || method === 'phonepe' || method === 'gpay') && amt >= 1000) {
      return amt >= 5000 ? Math.round(amt * 0.05) : Math.round(amt * 0.03);
    }
    if (method === 'crypto' && amt >= 500) {
      return Math.round(amt * 0.05);
    }
    return 0;
  };

  const currentBonus = calculateBonus(parsedAmount, selectedMethod);
  const totalWillReceive = parsedAmount + currentBonus;

  // Copy VPA to clipboard
  const handleCopyVpa = () => {
    navigator.clipboard.writeText(UPI_VPA);
    setCopiedVpa(true);
    onShowToast('info', 'UPI ID Copied', `${UPI_VPA} copied to clipboard`);
    setTimeout(() => setCopiedVpa(false), 2000);
  };

  // Copy Crypto Address
  const handleCopyCrypto = () => {
    navigator.clipboard.writeText(CRYPTO_ADDRESS);
    setCopiedCrypto(true);
    onShowToast('info', 'Address Copied', 'USDT TRC20 address copied');
    setTimeout(() => setCopiedCrypto(false), 2000);
  };

  // Generate test UTR for instant simulation
  const handleFillTestUtr = () => {
    const random12 = Math.floor(400000000000 + Math.random() * 599999999999).toString();
    setUtrNumber(random12);
    onShowToast('info', 'Simulation UTR Generated', `Sample 12-digit UTR: ${random12}`);
  };

  // Handle deposit submission
  const handleDepositSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentUser) {
      onShowToast('warning', 'Login Required', 'Please sign in to your account before adding payment.');
      onRequireLogin();
      return;
    }

    if (parsedAmount < 10) {
      onShowToast('error', 'Minimum Deposit', 'Minimum deposit is ₹10 for UPI, ₹100 for Cards/NetBanking.');
      return;
    }

    if (['paytm_qr', 'phonepe', 'gpay'].includes(selectedMethod)) {
      if (!utrNumber.trim()) {
        onShowToast('warning', 'UTR Required', 'Please enter the 12-digit UTR or Transaction ID from your payment.');
        return;
      }
    }

    setIsProcessing(true);
    try {
      const response = await fetch('/api/deposit/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          amount: parsedAmount,
          method: selectedMethod,
          utrNumber: utrNumber.trim() || undefined,
          note: selectedMethod === 'crypto' ? cryptoTxId : undefined
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        onAddFunds(data.totalCredited || totalWillReceive, selectedMethod.toUpperCase(), data.newBalance);
        onShowToast(
          'success', 
          'Payment Verified & Credited!', 
          `₹${(data.totalCredited || totalWillReceive).toFixed(2)} added to your wallet ${currentBonus > 0 ? `(including ₹${currentBonus} bonus)` : ''}`
        );
        setUtrNumber('');
        setCryptoTxId('');
        fetchDeposits();
      } else {
        onShowToast('error', 'Deposit Error', data.error || 'Failed to verify transaction.');
      }
    } catch (err: any) {
      onShowToast('error', 'Network Error', err.message || 'Unable to verify payment right now.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!currentUser) {
    return (
      <div className="max-w-xl mx-auto my-8 bg-[#0f172a]/90 border border-slate-800 rounded-2xl p-8 text-center space-y-5 shadow-2xl animate-in fade-in">
        <div className="w-14 h-14 rounded-2xl bg-orange-500/15 border border-orange-500/30 text-orange-400 flex items-center justify-center mx-auto">
          <Wallet className="w-7 h-7" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-black text-white tracking-tight">
            Sign In to View Balance & Add Payment
          </h2>
          <p className="text-xs text-slate-400 leading-relaxed max-w-md mx-auto">
            Your wallet balance and deposits are securely tied to your account. Please sign in or create an account first to add funds via Paytm UPI QR, PhonePe, GPay, Cards, or Crypto.
          </p>
        </div>
        <button
          type="button"
          onClick={onRequireLogin}
          className="px-6 py-3 bg-orange-600 hover:bg-orange-500 text-white text-xs font-extrabold uppercase tracking-wider rounded-xl shadow-lg shadow-orange-600/25 transition-all inline-flex items-center gap-2 cursor-pointer"
        >
          <span>Sign In / Register Account</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      
      {/* Header */}
      <div className="pb-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <Wallet className="w-6 h-6 text-orange-500" />
            <span>Add Funds & Payment Methods</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Top up your SMM reseller wallet via Paytm UPI QR, PhonePe, Google Pay, Cards, NetBanking, or Crypto.
          </p>
        </div>

        {/* Quick VPA Badge */}
        <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 shrink-0">
          <span className="text-[10px] text-slate-400 uppercase font-semibold">Official UPI:</span>
          <span className="font-mono text-xs font-bold text-orange-400">{UPI_VPA}</span>
          <button
            type="button"
            onClick={handleCopyVpa}
            className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="Copy UPI ID"
          >
            {copiedVpa ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Top Balance Cards & Special Bonus Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        
        {/* Your Wallet Balance */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-800/40 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-bold tracking-wider text-emerald-400">
              Your Panel Balance
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-black font-mono text-emerald-400 mt-2 tabular-nums">
            ₹{userBalance.toFixed(2)}
          </p>
          <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
            Available to place instant orders across 280+ active SMM services.
          </p>
        </div>

        {/* Upstream HanumanSMM Balance */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-950/40 via-slate-900 to-slate-900 border border-amber-800/40 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-bold tracking-wider text-amber-400">
              Provider API Balance
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-black font-mono text-amber-400 mt-2 tabular-nums">
            ₹{providerBalance}
          </p>
          <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
            Live reserve held on upstream HanumanSMM master server.
          </p>
        </div>

        {/* Promo Bonus Offer Banner */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-orange-950/50 via-slate-900 to-slate-900 border border-orange-500/40 relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-bold tracking-wider text-orange-400 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-orange-400" />
              <span>Special Bonus Offer</span>
            </span>
            <span className="text-[10px] bg-orange-500/20 text-orange-300 font-bold px-2 py-0.5 rounded-full font-mono">
              ACTIVE
            </span>
          </div>
          <div className="mt-2 space-y-1">
            <div className="text-sm font-black text-white">
              +3% to +5% Extra Free Balance
            </div>
            <p className="text-[11px] text-slate-300 leading-snug">
              Deposit ₹1,000+ via Paytm UPI to get <strong>3% extra</strong>, or ₹5,000+ to get <strong>5% extra balance</strong> credited instantly!
            </p>
          </div>
        </div>

      </div>

      {/* Main Payment Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left: Payment Form & Gateway Selection */}
        <div className="lg:col-span-8 bg-[#0f172a]/80 rounded-2xl border border-slate-800 p-6 sm:p-8 backdrop-blur-sm space-y-6">
          
          <div className="flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <ArrowUpRight className="w-5 h-5 text-orange-500" />
              <span>Select Payment Gateway</span>
            </h2>
            <span className="text-xs text-slate-400">0% Gateway Fee · Instant Credit</span>
          </div>

          {/* Payment Method Selector Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            
            {/* 1. Paytm UPI QR */}
            <button
              type="button"
              onClick={() => setSelectedMethod('paytm_qr')}
              className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer relative ${
                selectedMethod === 'paytm_qr'
                  ? 'bg-orange-500/10 border-orange-500 text-white shadow-md shadow-orange-500/10'
                  : 'bg-slate-900/90 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
              }`}
            >
              <div className="absolute top-2.5 right-2.5 text-[9px] uppercase font-extrabold bg-orange-500/20 text-orange-400 px-1.5 py-0.5 rounded">
                +3% Bonus
              </div>
              <QrCode className="w-5 h-5 text-orange-400 mb-2" />
              <div className="text-xs font-extrabold text-white">Paytm UPI QR</div>
              <div className="text-[10px] text-slate-500 mt-0.5">Paytm / Any UPI App</div>
            </button>

            {/* 2. PhonePe Direct */}
            <button
              type="button"
              onClick={() => setSelectedMethod('phonepe')}
              className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                selectedMethod === 'phonepe'
                  ? 'bg-orange-500/10 border-orange-500 text-white shadow-md shadow-orange-500/10'
                  : 'bg-slate-900/90 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
              }`}
            >
              <Smartphone className="w-5 h-5 text-purple-400 mb-2" />
              <div className="text-xs font-extrabold text-white">PhonePe UPI</div>
              <div className="text-[10px] text-slate-500 mt-0.5">Direct Intent / VPA</div>
            </button>

            {/* 3. Google Pay */}
            <button
              type="button"
              onClick={() => setSelectedMethod('gpay')}
              className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                selectedMethod === 'gpay'
                  ? 'bg-orange-500/10 border-orange-500 text-white shadow-md shadow-orange-500/10'
                  : 'bg-slate-900/90 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
              }`}
            >
              <Smartphone className="w-5 h-5 text-sky-400 mb-2" />
              <div className="text-xs font-extrabold text-white">Google Pay (GPay)</div>
              <div className="text-[10px] text-slate-500 mt-0.5">Fast UPI Transfer</div>
            </button>

            {/* 4. Debit / Credit Cards */}
            <button
              type="button"
              onClick={() => setSelectedMethod('card')}
              className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                selectedMethod === 'card'
                  ? 'bg-orange-500/10 border-orange-500 text-white shadow-md shadow-orange-500/10'
                  : 'bg-slate-900/90 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
              }`}
            >
              <CreditCard className="w-5 h-5 text-emerald-400 mb-2" />
              <div className="text-xs font-extrabold text-white">Debit / Credit Cards</div>
              <div className="text-[10px] text-slate-500 mt-0.5">Visa, Master, RuPay</div>
            </button>

            {/* 5. Net Banking */}
            <button
              type="button"
              onClick={() => setSelectedMethod('netbanking')}
              className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                selectedMethod === 'netbanking'
                  ? 'bg-orange-500/10 border-orange-500 text-white shadow-md shadow-orange-500/10'
                  : 'bg-slate-900/90 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
              }`}
            >
              <Landmark className="w-5 h-5 text-amber-400 mb-2" />
              <div className="text-xs font-extrabold text-white">Net Banking</div>
              <div className="text-[10px] text-slate-500 mt-0.5">SBI, HDFC, ICICI, etc.</div>
            </button>

            {/* 6. Crypto USDT */}
            <button
              type="button"
              onClick={() => setSelectedMethod('crypto')}
              className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer relative ${
                selectedMethod === 'crypto'
                  ? 'bg-orange-500/10 border-orange-500 text-white shadow-md shadow-orange-500/10'
                  : 'bg-slate-900/90 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
              }`}
            >
              <div className="absolute top-2.5 right-2.5 text-[9px] uppercase font-extrabold bg-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded">
                +5% Bonus
              </div>
              <Coins className="w-5 h-5 text-purple-400 mb-2" />
              <div className="text-xs font-extrabold text-white">USDT Crypto</div>
              <div className="text-[10px] text-slate-500 mt-0.5">TRC20 / BEP20</div>
            </button>

          </div>

          <form onSubmit={handleDepositSubmit} className="space-y-6">
            
            {/* Amount Selection */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold uppercase text-slate-300 tracking-wider">
                  Deposit Amount (₹ INR)
                </label>
                {currentBonus > 0 && (
                  <span className="text-[11px] font-mono text-emerald-400 font-bold flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    <span>+₹{currentBonus} Extra Bonus Applied!</span>
                  </span>
                )}
              </div>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-lg">₹</span>
                <input
                  type="number"
                  min="10"
                  step="10"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Enter amount (min ₹10)"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-4 py-3 text-lg font-mono font-bold text-white focus:outline-none focus:border-orange-500 transition-colors tabular-nums"
                />
              </div>

              {/* Fast Presets */}
              <div className="flex flex-wrap items-center gap-2 mt-3">
                <span className="text-[11px] text-slate-500">Quick amounts:</span>
                {presets.map(p => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setAmount(String(p))}
                    className={`px-3 py-1.5 text-xs font-mono rounded-lg border transition-all cursor-pointer ${
                      amount === String(p)
                        ? 'bg-orange-600 text-white border-orange-500 font-bold'
                        : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border-slate-700'
                    }`}
                  >
                    ₹{p.toLocaleString('en-IN')}
                    {p >= 1000 && <span className="ml-1 text-[10px] text-orange-300">+{p >= 5000 ? '5%' : '3%'}</span>}
                  </button>
                ))}
              </div>
            </div>

            {/* ================= METHOD 1: PAYTM UPI QR ================= */}
            {selectedMethod === 'paytm_qr' && (
              <div className="p-4 sm:p-5 bg-gradient-to-b from-slate-900 to-[#0b1329] border border-sky-500/30 rounded-2xl space-y-5">
                
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-[#00BAF2] text-white flex items-center justify-center font-bold text-xs">
                      P
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white">Paytm ❤️ UPI Instant QR</h4>
                      <p className="text-[10px] text-slate-400">Scan with Paytm, PhonePe, Google Pay, or BHIM</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono bg-sky-500/20 text-sky-300 px-2 py-0.5 rounded font-bold">
                    Official Merchant QR
                  </span>
                </div>

                {/* QR Code and Instructions side-by-side */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 items-center">
                  
                  {/* Left: The Real Uploaded Paytm QR Code Image */}
                  <div className="sm:col-span-5 flex flex-col items-center">
                    <div className="p-2 bg-white rounded-2xl shadow-xl shadow-sky-500/10 border border-sky-400 max-w-[210px] w-full">
                      <img 
                        src={QR_IMAGE_URL} 
                        alt="Paytm UPI QR Code - bobeegautam1@ptaxis"
                        className="w-full h-auto rounded-xl object-contain block"
                      />
                    </div>
                    <span className="text-[10px] font-mono text-slate-400 mt-2">
                      Scan using any UPI App
                    </span>
                  </div>

                  {/* Right: Step-by-Step Payment Instructions & VPA Copy */}
                  <div className="sm:col-span-7 space-y-3.5 text-xs">
                    
                    {/* Copy UPI ID Box */}
                    <div className="p-3 bg-slate-900/90 border border-slate-700/80 rounded-xl space-y-1.5">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                        UPI ID / VPA
                      </span>
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs sm:text-sm font-extrabold text-orange-400 select-all">
                          {UPI_VPA}
                        </span>
                        <button
                          type="button"
                          onClick={handleCopyVpa}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                        >
                          {copiedVpa ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedVpa ? 'Copied' : 'Copy UPI'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Steps list */}
                    <ol className="space-y-1.5 text-slate-300 text-[11px] list-decimal list-inside leading-relaxed">
                      <li>Open Paytm, PhonePe, Google Pay, or BHIM.</li>
                      <li>Scan the QR code on the left or pay to <strong className="text-white font-mono">{UPI_VPA}</strong>.</li>
                      <li>Pay the exact amount: <strong className="text-orange-400 font-mono">₹{parsedAmount.toFixed(2)}</strong>.</li>
                      <li>Copy the <strong>12-digit UTR / Transaction ID</strong> from your UPI payment receipt.</li>
                      <li>Paste the UTR number below and click Verify.</li>
                    </ol>

                    {/* Mobile UPI Deep Link */}
                    <a
                      href={`upi://pay?pa=${UPI_VPA}&pn=BobySMMPanel&am=${parsedAmount}&cu=INR`}
                      className="inline-flex items-center gap-2 text-xs font-semibold text-sky-400 hover:text-sky-300 underline"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Pay via UPI App on Mobile</span>
                    </a>

                  </div>

                </div>

                {/* UTR Input Field */}
                <div className="pt-2 border-t border-slate-800">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold uppercase text-slate-300 tracking-wider">
                      Enter 12-Digit Transaction ID (UTR / Ref No) *
                    </label>
                    <button
                      type="button"
                      onClick={handleFillTestUtr}
                      className="text-[11px] text-orange-400 hover:text-orange-300 font-semibold underline cursor-pointer"
                    >
                      Use Test UTR
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      maxLength={18}
                      required
                      value={utrNumber}
                      onChange={(e) => setUtrNumber(e.target.value.replace(/[^a-zA-Z0-9]/g, ''))}
                      placeholder="e.g. 412389104821 (12 digits from receipt)"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-mono text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 transition-colors tracking-wider"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Found in your bank statement or UPI app under "UPI Ref No" or "Transaction ID".
                  </p>
                </div>

              </div>
            )}

            {/* ================= METHOD 2 & 3: PHONEPE & GOOGLE PAY ================= */}
            {(selectedMethod === 'phonepe' || selectedMethod === 'gpay') && (
              <div className="p-4 sm:p-5 bg-slate-900/90 border border-slate-800 rounded-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-white flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-orange-400" />
                    <span>{selectedMethod === 'phonepe' ? 'PhonePe UPI Transfer' : 'Google Pay (GPay) Transfer'}</span>
                  </h4>
                  <span className="text-[10px] font-mono text-slate-400">VPA: {UPI_VPA}</span>
                </div>

                <div className="p-3 bg-slate-800/60 rounded-xl space-y-2 text-xs text-slate-300">
                  <p>Send <strong>₹{parsedAmount.toFixed(2)}</strong> to UPI ID:</p>
                  <div className="flex items-center justify-between bg-black/40 p-2.5 rounded-lg border border-slate-700">
                    <span className="font-mono font-bold text-orange-400 text-sm">{UPI_VPA}</span>
                    <button
                      type="button"
                      onClick={handleCopyVpa}
                      className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-xs rounded text-slate-200 flex items-center gap-1 cursor-pointer"
                    >
                      {copiedVpa ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>Copy</span>
                    </button>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold uppercase text-slate-300 tracking-wider">
                      12-Digit Transaction Ref / UTR *
                    </label>
                    <button
                      type="button"
                      onClick={handleFillTestUtr}
                      className="text-[11px] text-orange-400 hover:underline cursor-pointer"
                    >
                      Use Test UTR
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    value={utrNumber}
                    onChange={(e) => setUtrNumber(e.target.value.replace(/[^a-zA-Z0-9]/g, ''))}
                    placeholder="e.g. 409182746194"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-mono text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 transition-colors"
                  />
                </div>
              </div>
            )}

            {/* ================= METHOD 4: DEBIT / CREDIT CARDS ================= */}
            {selectedMethod === 'card' && (
              <div className="p-4 sm:p-5 bg-slate-900/90 border border-slate-800 rounded-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-white flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-emerald-400" />
                    <span>Card Payment Details</span>
                  </h4>
                  <span className="text-[10px] text-slate-400 font-mono">Visa / Master / RuPay</span>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] uppercase font-semibold text-slate-400 mb-1">
                      Cardholder Name
                    </label>
                    <input
                      type="text"
                      required
                      value={cardHolder}
                      onChange={(e) => setCardHolder(e.target.value)}
                      placeholder="e.g. Rahul Sharma"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] uppercase font-semibold text-slate-400 mb-1">
                      Card Number
                    </label>
                    <input
                      type="text"
                      maxLength={19}
                      required
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value.replace(/[^0-9 ]/g, ''))}
                      placeholder="4532 •••• •••• 8912"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] uppercase font-semibold text-slate-400 mb-1">
                        Expiry Date
                      </label>
                      <input
                        type="text"
                        maxLength={5}
                        required
                        value={cardExpiry}
                        onChange={(e) => setCardExpiry(e.target.value)}
                        placeholder="MM/YY"
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] uppercase font-semibold text-slate-400 mb-1">
                        CVV / CVC
                      </label>
                      <input
                        type="password"
                        maxLength={4}
                        required
                        value={cardCvv}
                        onChange={(e) => setCardCvv(e.target.value.replace(/[^0-9]/g, ''))}
                        placeholder="•••"
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ================= METHOD 5: NET BANKING ================= */}
            {selectedMethod === 'netbanking' && (
              <div className="p-4 sm:p-5 bg-slate-900/90 border border-slate-800 rounded-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-white flex items-center gap-2">
                    <Landmark className="w-4 h-4 text-amber-400" />
                    <span>Select Your Bank</span>
                  </h4>
                  <span className="text-[10px] text-slate-400 font-mono">50+ Indian Banks</span>
                </div>

                <div>
                  <label className="block text-[11px] uppercase font-semibold text-slate-400 mb-1">
                    Popular Banks
                  </label>
                  <select
                    value={selectedBank}
                    onChange={(e) => setSelectedBank(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-orange-500 cursor-pointer"
                  >
                    <option value="State Bank of India (SBI)">State Bank of India (SBI)</option>
                    <option value="HDFC Bank">HDFC Bank</option>
                    <option value="ICICI Bank">ICICI Bank</option>
                    <option value="Axis Bank">Axis Bank</option>
                    <option value="Punjab National Bank (PNB)">Punjab National Bank (PNB)</option>
                    <option value="Kotak Mahindra Bank">Kotak Mahindra Bank</option>
                    <option value="Bank of Baroda (BOB)">Bank of Baroda (BOB)</option>
                    <option value="Canara Bank">Canara Bank</option>
                    <option value="Union Bank of India">Union Bank of India</option>
                    <option value="IndusInd Bank">IndusInd Bank</option>
                  </select>
                </div>
              </div>
            )}

            {/* ================= METHOD 6: CRYPTO USDT ================= */}
            {selectedMethod === 'crypto' && (
              <div className="p-4 sm:p-5 bg-slate-900/90 border border-purple-500/30 rounded-2xl space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <h4 className="text-xs font-bold text-white flex items-center gap-2">
                    <Coins className="w-4 h-4 text-purple-400" />
                    <span>USDT Deposit (TRC20 / BEP20)</span>
                  </h4>
                  <span className="text-[10px] font-mono bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded font-bold">
                    +5% Extra Bonus
                  </span>
                </div>

                <div className="p-3 bg-purple-950/20 border border-purple-800/40 rounded-xl space-y-2 text-xs">
                  <div className="flex justify-between items-center text-[11px] text-slate-400">
                    <span>USDT TRC20 Wallet Address:</span>
                    <span className="font-mono text-purple-300">Rate: 1 USDT = ₹89.50</span>
                  </div>
                  <div className="flex items-center justify-between bg-black/50 p-2.5 rounded-lg border border-purple-500/30">
                    <span className="font-mono text-xs text-purple-300 truncate mr-2">{CRYPTO_ADDRESS}</span>
                    <button
                      type="button"
                      onClick={handleCopyCrypto}
                      className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-xs rounded text-slate-200 flex items-center gap-1 cursor-pointer shrink-0"
                    >
                      {copiedCrypto ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>Copy</span>
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Estimated USDT: <strong className="text-white font-mono">{(parsedAmount / 89.50).toFixed(2)} USDT</strong>
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-300 tracking-wider mb-1.5">
                    Blockchain Transaction Hash (TXID)
                  </label>
                  <input
                    type="text"
                    value={cryptoTxId}
                    onChange={(e) => setCryptoTxId(e.target.value)}
                    placeholder="e.g. 7f9201a4e8..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>
            )}

            {/* Total Summary Breakdown */}
            <div className="p-3.5 bg-slate-900/90 border border-slate-800 rounded-xl flex items-center justify-between text-xs">
              <div>
                <span className="text-slate-400 block">Total Credited to Wallet:</span>
                <span className="text-base font-mono font-extrabold text-emerald-400">
                  ₹{totalWillReceive.toFixed(2)}
                </span>
              </div>
              <div className="text-right">
                <span className="text-slate-500 text-[10px] block">Fee: 0% · Zero Commission</span>
                {currentBonus > 0 && (
                  <span className="text-orange-400 font-bold font-mono text-[11px]">
                    Includes ₹{currentBonus} Bonus
                  </span>
                )}
              </div>
            </div>

            {/* Submit Verification Button */}
            <button
              type="submit"
              disabled={isProcessing || parsedAmount < 10}
              className="w-full py-3.5 px-6 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-extrabold rounded-xl shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer text-xs uppercase tracking-wider"
            >
              {isProcessing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Verifying Transaction...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Verify Payment & Credit ₹{totalWillReceive.toFixed(2)}</span>
                </>
              )}
            </button>

          </form>

        </div>

        {/* Right: Payment Instructions, Support & Guarantees */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Quick Payment Instructions */}
          <div className="bg-[#0f172a]/80 rounded-2xl border border-slate-800 p-6 backdrop-blur-sm space-y-4 text-xs">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-orange-400" />
              <span>How To Deposit Funds</span>
            </h3>

            <div className="space-y-3 text-slate-400 leading-relaxed text-[11px]">
              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                <span className="text-white font-bold block mb-1">Step 1: Scan & Pay</span>
                Scan the Paytm QR with Paytm, PhonePe, Google Pay, or BHIM, and transfer the exact amount.
              </div>

              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                <span className="text-white font-bold block mb-1">Step 2: Copy 12-Digit UTR</span>
                In your payment receipt, copy the 12-digit UPI Ref Number (e.g. 412389104821).
              </div>

              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                <span className="text-white font-bold block mb-1">Step 3: Instant Credit</span>
                Paste the UTR in the box and click verify. Your wallet balance is funded in seconds.
              </div>
            </div>
          </div>

          {/* 24x7 Support Box */}
          <div className="bg-gradient-to-br from-slate-900 to-[#0e172e] rounded-2xl border border-slate-800 p-6 text-xs space-y-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span className="font-bold text-white text-xs uppercase tracking-wider">
                24x7 Payment Protection
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Did your bank deduct money but your wallet didn't update? Contact support with your 12-digit UTR for manual review within 2 minutes.
            </p>
            <div className="pt-2 flex flex-col gap-1.5 text-[11px] font-mono">
              <div className="text-slate-300">
                <span className="text-slate-500">Merchant VPA:</span> {UPI_VPA}
              </div>
              <div className="text-slate-300">
                <span className="text-slate-500">Account:</span> Bobee Gautam
              </div>
            </div>
            <a
              href="https://t.me/boby_smm_panal_help_team"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full mt-2 py-2.5 px-4 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2 text-xs shadow-md shadow-sky-600/20"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Telegram Help Team Support</span>
            </a>
          </div>

        </div>

      </div>

      {/* Bottom: Transaction History Table */}
      <div className="bg-[#0f172a]/80 rounded-2xl border border-slate-800 p-6 backdrop-blur-sm space-y-4">
        
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
              Recent Deposits & Transactions
            </h3>
            <p className="text-xs text-slate-400">History of your payment transfers and wallet top-ups.</p>
          </div>
          <button
            type="button"
            onClick={fetchDeposits}
            disabled={isLoadingDeposits}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingDeposits ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        {deposits.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-xs">
            No deposits found. Complete your first top-up above.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[10px]">
                  <th className="pb-3 font-semibold">Deposit ID</th>
                  <th className="pb-3 font-semibold">Date & Time</th>
                  <th className="pb-3 font-semibold">Method</th>
                  <th className="pb-3 font-semibold">UTR / Ref No</th>
                  <th className="pb-3 font-semibold text-right">Amount</th>
                  <th className="pb-3 font-semibold text-right">Bonus</th>
                  <th className="pb-3 font-semibold text-right">Credited</th>
                  <th className="pb-3 font-semibold text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300">
                {deposits.map((dep) => (
                  <tr key={dep.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 font-bold text-orange-400">{dep.depositId}</td>
                    <td className="py-3 text-[11px] text-slate-400">
                      {new Date(dep.createdAt).toLocaleString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td className="py-3 font-sans text-white text-[11px]">{dep.methodTitle}</td>
                    <td className="py-3 text-slate-400 text-[11px]">{dep.utrNumber || '—'}</td>
                    <td className="py-3 text-right text-slate-300">₹{dep.amount.toFixed(2)}</td>
                    <td className="py-3 text-right text-emerald-400">
                      {dep.bonus > 0 ? `+₹${dep.bonus.toFixed(2)}` : '—'}
                    </td>
                    <td className="py-3 text-right font-bold text-white">
                      ₹{dep.totalCredited.toFixed(2)}
                    </td>
                    <td className="py-3 text-center">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                        <Check className="w-2.5 h-2.5" />
                        <span>{dep.status}</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>

    </div>
  );
};
