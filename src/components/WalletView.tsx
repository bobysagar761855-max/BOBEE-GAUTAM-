import React, { useState, useEffect } from 'react';
import {
  Wallet, CreditCard, ArrowUpRight, CheckCircle2, ShieldCheck,
  Check, AlertCircle, RefreshCw, HelpCircle, ArrowRight, Send, Lock
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

export const WalletView: React.FC<WalletViewProps> = ({
  userBalance,
  providerBalance,
  currentUser,
  onRequireLogin,
  onAddFunds,
  onShowToast
}) => {
  const [amount, setAmount] = useState<string>('500');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Deposits history
  const [deposits, setDeposits] = useState<DepositRecord[]>([]);
  const [isLoadingDeposits, setIsLoadingDeposits] = useState<boolean>(false);

  const presets = [10, 20, 50, 100, 200, 500, 1000, 2000, 3000, 5000, 10000];

  // Fetch deposits history strictly for the logged-in user
  const fetchDeposits = async () => {
    const token = currentUser?.token || localStorage.getItem('hanuman_auth_token');
    if (!currentUser || !token) {
      setDeposits([]);
      return;
    }
    setIsLoadingDeposits(true);
    try {
      const res = await fetch('/api/deposits', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.deposits)) {
        setDeposits(data.deposits);
      } else {
        setDeposits([]);
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

  const parsedAmount = parseFloat(amount) || 0;
  const totalWillReceive = parsedAmount;

  // Handle Razorpay Payment Gateway Checkout
  const handleRazorpayPayment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentUser) {
      onShowToast('warning', 'Login Required', 'Please sign in to your account before adding payment.');
      onRequireLogin();
      return;
    }

    if (Number.isNaN(parsedAmount) || parsedAmount < 10 || parsedAmount > 10000) {
      onShowToast('error', 'Invalid Amount', 'Deposit amount must be between ₹10 and ₹10,000.');
      return;
    }

    // Check if Razorpay script loaded
    if (typeof (window as any).Razorpay === 'undefined') {
      onShowToast('error', 'Gateway Error', 'Razorpay Checkout SDK is still loading. Please check your internet connection and try again.');
      return;
    }

    setIsProcessing(true);
    try {
      const token = currentUser.token || localStorage.getItem('hanuman_auth_token') || '';

      // 1. Create order on backend
      const orderRes = await fetch('/api/wallet/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ amount: parsedAmount })
      });

      const orderData = await orderRes.json();

      if (!orderRes.ok || !orderData.success) {
        throw new Error(orderData.error || orderData.message || 'Failed to initialize payment gateway.');
      }

      // 2. Open Razorpay Checkout modal
      const options = {
        key: orderData.key_id,
        amount: orderData.amount,
        currency: orderData.currency || 'INR',
        name: 'Boby SMM Panel',
        description: `Wallet Balance Top-up (₹${parsedAmount.toFixed(2)})`,
        image: 'https://cdn-icons-png.flaticon.com/512/9131/9131529.png',
        order_id: orderData.order_id,
        prefill: {
          name: currentUser.name || orderData.user?.name || '',
          email: currentUser.email || orderData.user?.email || '',
          contact: currentUser.phone || orderData.user?.phone || ''
        },
        theme: {
          color: '#ea580c'
        },
        handler: async function (response: any) {
          setIsProcessing(true);
          try {
            // 3. Verify payment signature on backend
            const verifyRes = await fetch('/api/wallet/verify-payment', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
              },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                amount: parsedAmount
              })
            });

            const verifyData = await verifyRes.json();

            if (verifyRes.ok && verifyData.success) {
              onAddFunds(verifyData.totalCredited || totalWillReceive, 'RAZORPAY', verifyData.newBalance);
              onShowToast(
                'success',
                'Payment Verified & Credited!',
                `₹${(verifyData.totalCredited || totalWillReceive).toFixed(2)} added to your wallet successfully.`
              );
              fetchDeposits();
            } else {
              onShowToast('error', 'Verification Failed', verifyData.error || verifyData.message || 'Payment signature could not be verified.');
              fetchDeposits();
            }
          } catch (vErr: any) {
            onShowToast('error', 'Verification Error', vErr?.message || 'Error communicating with verification server.');
          } finally {
            setIsProcessing(false);
          }
        },
        modal: {
          ondismiss: function () {
            setIsProcessing(false);
            onShowToast('info', 'Payment Dismissed', 'Razorpay checkout was closed without completing payment.');
            fetchDeposits();
          }
        }
      };

      const razorpay = new (window as any).Razorpay(options);
      razorpay.on('payment.failed', function (resp: any) {
        setIsProcessing(false);
        onShowToast('error', 'Payment Failed', resp.error?.description || 'Transaction was declined by bank or gateway.');
        fetchDeposits();
      });
      razorpay.open();
    } catch (err: any) {
      setIsProcessing(false);
      onShowToast('error', 'Gateway Error', err?.message || 'Failed to initiate Razorpay checkout.');
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
            Your wallet balance and deposits are securely tied to your account. Please sign in or create an account first to add funds securely via Razorpay.
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
            <span>Add Funds to Wallet</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Top up your SMM reseller wallet securely via Razorpay automated instant checkout.
          </p>
        </div>

        {/* Gateway Security Badge */}
        <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 shrink-0">
          <Lock className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-[10px] text-slate-400 uppercase font-semibold">Gateway:</span>
          <span className="font-mono text-xs font-bold text-blue-400">Razorpay Verified</span>
        </div>
      </div>

      {/* Top Balance Cards */}
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

        {/* Instant Gateway Assurance Card */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-blue-950/40 via-slate-900 to-slate-900 border border-blue-500/30 relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-bold tracking-wider text-blue-400 flex items-center gap-1.5">
              <CreditCard className="w-4 h-4 text-blue-400" />
              <span>Razorpay Checkout</span>
            </span>
            <span className="text-[10px] bg-blue-500/20 text-blue-300 font-bold px-2 py-0.5 rounded-full font-mono">
              INSTANT
            </span>
          </div>
          <div className="mt-2 space-y-1">
            <div className="text-sm font-black text-white">
              Automated Instant Wallet Credit
            </div>
            <p className="text-[11px] text-slate-300 leading-snug">
              Deposit ₹10 – ₹10,000 securely with cryptographic verification and immediate balance updates.
            </p>
          </div>
        </div>

      </div>

      {/* Main Payment Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

        {/* Left: Razorpay Payment Form */}
        <div className="lg:col-span-8 bg-[#0f172a]/80 rounded-2xl border border-slate-800 p-6 sm:p-8 backdrop-blur-sm space-y-6">

          <div className="flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <ArrowUpRight className="w-5 h-5 text-orange-500" />
              <span>Payment Gateway</span>
            </h2>
            <span className="text-xs text-slate-400">0% Gateway Fee · Instant Credit</span>
          </div>

          {/* Single Razorpay Gateway Selector Card */}
          <div className="p-4 rounded-xl border bg-gradient-to-br from-blue-600/20 to-orange-500/20 border-blue-500 text-white shadow-lg shadow-blue-500/10 ring-1 ring-blue-500 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600/30 border border-blue-500/40 flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-extrabold text-white">Pay with Razorpay</span>
                  <span className="text-[10px] font-bold text-blue-400 font-mono tracking-tight">RAZORPAY</span>
                </div>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  Automated checkout supporting UPI, Cards, NetBanking & Wallets
                </p>
              </div>
            </div>
            <span className="text-[9px] uppercase font-extrabold bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded shrink-0">
              Instant Auto
            </span>
          </div>

          <form onSubmit={handleRazorpayPayment} className="space-y-6">

            {/* Amount Selection */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold uppercase text-slate-300 tracking-wider">
                  Deposit Amount (₹ INR)
                </label>
                <span className="text-[11px] font-mono text-slate-400">
                  Limit: ₹10 – ₹10,000
                </span>
              </div>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-lg">₹</span>
                <input
                  type="number"
                  min="10"
                  max="10000"
                  step="1"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Enter amount (₹10 - ₹10,000)"
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
                  </button>
                ))}
              </div>
            </div>

            {/* Razorpay Gateway Details */}
            <div className="p-4 sm:p-5 bg-gradient-to-b from-slate-900 to-[#07132a] border border-blue-500/30 rounded-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-md shadow-blue-600/30">
                    ₹
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                      <span>Razorpay Instant Automated Gateway</span>
                      <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-mono">
                        SECURE
                      </span>
                    </h4>
                    <p className="text-[10px] text-slate-400">256-bit Encrypted Payment Processing & HMAC Signature Verification</p>
                  </div>
                </div>
                <span className="text-[10px] font-mono text-blue-400 font-bold bg-blue-950/60 border border-blue-800/60 px-2 py-0.5 rounded">
                  Official SDK
                </span>
              </div>

              <div className="p-3.5 bg-slate-800/40 border border-slate-800 rounded-xl space-y-2 text-xs text-slate-300">
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    Clicking <strong>"Pay with Razorpay"</strong> below will open the official Razorpay checkout popup.
                  </p>
                </div>
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    Complete your payment seamlessly via any supported method inside the Razorpay modal.
                  </p>
                </div>
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    Your payment signature is automatically verified by the server and funds are added to your wallet in real time.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-blue-950/30 border border-blue-900/50 rounded-xl text-xs">
                <span className="text-slate-400">Payer Account:</span>
                <span className="font-semibold text-white truncate max-w-[240px]">
                  {currentUser?.name} ({currentUser?.email})
                </span>
              </div>
            </div>

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
                <span className="text-blue-400 font-bold font-mono text-[11px]">
                  Instant Auto Credit
                </span>
              </div>
            </div>

            {/* Submit Razorpay Payment Button */}
            <button
              type="submit"
              disabled={isProcessing || parsedAmount < 10 || parsedAmount > 10000}
              className="w-full py-3.5 px-6 disabled:opacity-50 text-white font-extrabold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer text-xs uppercase tracking-wider bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-blue-600/30"
            >
              {isProcessing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Processing Razorpay Payment...</span>
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4" />
                  <span>Pay ₹{totalWillReceive.toFixed(2)} with Razorpay</span>
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
                <span className="text-white font-bold block mb-1">Step 1: Choose Amount</span>
                Select a quick amount tile (₹10 – ₹10,000) or enter your custom deposit amount.
              </div>

              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                <span className="text-white font-bold block mb-1">Step 2: Complete Checkout</span>
                Click "Pay with Razorpay" and confirm your payment safely inside the Razorpay popup.
              </div>

              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                <span className="text-white font-bold block mb-1">Step 3: Instant Credit</span>
                Our server verifies the Razorpay signature and updates your wallet balance immediately.
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
              Did your payment succeed but your wallet didn't update? Contact support with your Razorpay Payment ID for instant assistance.
            </p>
            <div className="pt-2 flex flex-col gap-1.5 text-[11px] font-mono">
              <div className="text-slate-300">
                <span className="text-slate-500">Gateway:</span> Razorpay Secure Checkout
              </div>
              <div className="text-slate-300">
                <span className="text-slate-500">Account:</span> {currentUser.name}
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
            <p className="text-xs text-slate-400">History of your Razorpay payment transactions and wallet top-ups.</p>
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
            No deposits found. Complete your first Razorpay top-up above.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[10px]">
                  <th className="pb-3 font-semibold">Order / Deposit ID</th>
                  <th className="pb-3 font-semibold">Date & Time</th>
                  <th className="pb-3 font-semibold">Gateway</th>
                  <th className="pb-3 font-semibold">Payment ID</th>
                  <th className="pb-3 font-semibold text-right">Amount</th>
                  <th className="pb-3 font-semibold text-right">Credited</th>
                  <th className="pb-3 font-semibold text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300">
                {deposits.map((dep) => (
                  <tr key={dep.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 font-bold text-orange-400">{dep.razorpayOrderId || dep.depositId}</td>
                    <td className="py-3 text-[11px] text-slate-400">
                      {new Date(dep.createdAt).toLocaleString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td className="py-3 font-sans text-white text-[11px]">{dep.methodTitle}</td>
                    <td className="py-3 text-slate-400 text-[11px]">{dep.razorpayPaymentId || dep.utrNumber || '—'}</td>
                    <td className="py-3 text-right text-slate-300">₹{dep.amount.toFixed(2)}</td>
                    <td className="py-3 text-right font-bold text-white">
                      ₹{dep.totalCredited.toFixed(2)}
                    </td>
                    <td className="py-3 text-center">
                      {dep.status === 'Completed' || dep.status === 'Success' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                          <Check className="w-2.5 h-2.5" />
                          <span>Success</span>
                        </span>
                      ) : dep.status === 'Failed' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30">
                          <AlertCircle className="w-2.5 h-2.5" />
                          <span>Failed</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                          <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                          <span>{dep.status}</span>
                        </span>
                      )}
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
