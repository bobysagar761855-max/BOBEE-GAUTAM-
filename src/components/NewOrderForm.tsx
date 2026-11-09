import React, { useState, useId } from 'react';
import { Send, AlertTriangle, ShieldCheck, Zap, Sparkles, Check, Info } from 'lucide-react';
import { SMMService, User } from '../types.ts';

interface NewOrderFormProps {
  services: SMMService[];
  userBalance: number;
  currentUser: User | null;
  onRequireLogin: () => void;
  onOrderSuccess: (order: any) => void;
  onDeductBalance: (amount: number) => void;
  onShowToast: (type: 'success' | 'error' | 'warning' | 'info', title: string, message?: string) => void;
  preselectedServiceId?: number | null;
}

export const NewOrderForm: React.FC<NewOrderFormProps> = ({
  services,
  userBalance,
  currentUser,
  onRequireLogin,
  onOrderSuccess,
  onDeductBalance,
  onShowToast,
  preselectedServiceId
}) => {
  const [selectedPlatform, setSelectedPlatform] = useState<string>('All');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedServiceId, setSelectedServiceId] = useState<number>(() => {
    return preselectedServiceId || (services[0]?.id || 4281);
  });
  const [link, setLink] = useState<string>('');
  const [quantity, setQuantity] = useState<string>('1000');
  const [customComments, setCustomComments] = useState<string>('');
  const [isLiveDispatch, setIsLiveDispatch] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const commentsId = useId();

  // Filter services by platform
  const platformFiltered = selectedPlatform === 'All'
    ? services
    : services.filter(s => s.platform.toLowerCase() === selectedPlatform.toLowerCase());

  // Available categories
  const categories = Array.from(new Set(platformFiltered.map(s => s.category)));

  // If active category not in current platform, reset to first or empty
  const activeCategory = (selectedCategory && categories.includes(selectedCategory))
    ? selectedCategory
    : (categories[0] || '');

  // Filter services by active category
  const categoryServices = platformFiltered.filter(s => !activeCategory || s.category === activeCategory);

  // Active selected service
  const currentService = services.find(s => s.id === selectedServiceId) || categoryServices[0] || services[0];

  // Update selected service if current service is outside filtered list
  React.useEffect(() => {
    if (preselectedServiceId && preselectedServiceId !== selectedServiceId) {
      const found = services.find(s => s.id === preselectedServiceId);
      if (found) {
        setSelectedPlatform('All');
        setSelectedCategory(found.category);
        setSelectedServiceId(found.id);
        if (found.min) setQuantity(String(Math.max(1000, found.min)));
      }
    }
  }, [preselectedServiceId, services]);

  const parsedQty = parseInt(quantity, 10) || 0;
  const unitRate = currentService ? currentService.rate : 0;
  const totalCost = currentService ? (parsedQty * unitRate) / 1000 : 0;

  const isQuantityValid = currentService && parsedQty >= currentService.min && parsedQty <= currentService.max;
  const isCustomCommentService = currentService && (
    currentService.category.toLowerCase().includes('comment') ||
    currentService.name.toLowerCase().includes('custom comment')
  );

  const handleQuickQty = (amount: number) => {
    setQuantity(String(amount));
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentService) {
      onShowToast('error', 'Service Error', 'Please select a valid service first.');
      return;
    }

    if (!link.trim()) {
      onShowToast('warning', 'Missing Link', 'Please enter a valid social media URL or username.');
      return;
    }

    if (!isQuantityValid) {
      onShowToast(
        'error',
        'Invalid Quantity',
        `Quantity must be between ${currentService.min.toLocaleString()} and ${currentService.max.toLocaleString()} for this service.`
      );
      return;
    }

    if (userBalance < totalCost) {
      onShowToast(
        'error',
        'Insufficient Balance',
        `You need ₹${totalCost.toFixed(2)} but your current reseller wallet balance is ₹${userBalance.toFixed(2)}. Please add funds.`
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const payload: any = {
        service: currentService.id,
        link: link.trim(),
        quantity: parsedQty,
        rate: currentService.rate,
        category: currentService.category,
        serviceName: currentService.name,
        forceSimulation: !isLiveDispatch,
        userId: currentUser?.id || undefined,
        userEmail: currentUser?.email || undefined
      };

      if (isCustomCommentService && customComments.trim()) {
        payload.comments = customComments.trim();
      }

      const response = await fetch('/api/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (data.success) {
        // Deduct from local wallet
        onDeductBalance(totalCost);

        onOrderSuccess({
          orderId: data.orderId,
          serviceId: currentService.id,
          serviceName: currentService.name,
          category: currentService.category,
          link: link.trim(),
          quantity: parsedQty,
          charge: totalCost,
          isLive: Boolean(data.isLive)
        });

        onShowToast(
          'success',
          'Order Dispatched!',
          `Order #${data.orderId} submitted successfully. Estimated charge: ₹${totalCost.toFixed(2)}`
        );

        // Reset fields
        setLink('');
        setCustomComments('');
      } else {
        onShowToast(
          'error',
          'Provider Declined Order',
          data.error || 'HanumanSMM could not process this order. You can switch to Simulation Mode to test.'
        );
      }
    } catch (err: any) {
      onShowToast('error', 'Network Error', err.message || 'Failed to communicate with server.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const platforms = ['All', 'Instagram', 'YouTube', 'TikTok', 'Facebook', 'LinkedIn'];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      
      {/* Left Column: The Order Configuration Form */}
      <div className="lg:col-span-8 bg-[#0f172a]/70 rounded-2xl border border-slate-800 p-6 sm:p-8 backdrop-blur-sm">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-6 border-b border-slate-800">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
              <span>Place New Order</span>
              <span className="text-xs font-mono font-medium text-orange-400 bg-orange-950/60 border border-orange-800/60 px-2 py-0.5 rounded">
                API v2
              </span>
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Select your service, paste your destination link, and submit instantly to HanumanSMM.
            </p>
          </div>

          {/* Mode Switcher */}
          <div className="flex items-center gap-2 p-1 bg-slate-900 border border-slate-800 rounded-lg text-xs self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setIsLiveDispatch(true)}
              className={`px-3 py-1.5 rounded-md font-semibold transition-colors flex items-center gap-1.5 ${
                isLiveDispatch
                  ? 'bg-orange-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Live API</span>
            </button>
            <button
              type="button"
              onClick={() => setIsLiveDispatch(false)}
              className={`px-3 py-1.5 rounded-md font-semibold transition-colors flex items-center gap-1.5 ${
                !isLiveDispatch
                  ? 'bg-slate-700 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Demo Mode</span>
            </button>
          </div>
        </div>

        <form onSubmit={handlePlaceOrder} className="space-y-6">
          
          {/* Platform Filter Buttons */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2.5">
              Select Platform
            </label>
            <div className="flex flex-wrap gap-2">
              {platforms.map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => {
                    setSelectedPlatform(p);
                    const matching = p === 'All' ? services : services.filter(s => s.platform.toLowerCase() === p.toLowerCase());
                    if (matching[0]) {
                      setSelectedCategory(matching[0].category);
                      setSelectedServiceId(matching[0].id);
                    }
                  }}
                  className={`px-3.5 py-2 text-xs font-semibold rounded-lg border transition-all ${
                    selectedPlatform === p
                      ? 'bg-orange-500/10 border-orange-500/80 text-orange-400 shadow-sm'
                      : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Category Dropdown */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Category
            </label>
            <select
              value={activeCategory}
              onChange={(e) => {
                const cat = e.target.value;
                setSelectedCategory(cat);
                const firstSrv = platformFiltered.find(s => s.category === cat);
                if (firstSrv) setSelectedServiceId(firstSrv.id);
              }}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-100 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors"
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Service Dropdown */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Service
              </label>
              <span className="text-xs text-slate-400 font-mono">
                {categoryServices.length} available
              </span>
            </div>
            <select
              value={currentService?.id || ''}
              onChange={(e) => {
                const id = parseInt(e.target.value, 10);
                setSelectedServiceId(id);
                const found = services.find(s => s.id === id);
                if (found && found.min) {
                  setQuantity(String(Math.max(1000, found.min)));
                }
              }}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-100 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors"
            >
              {categoryServices.map(s => (
                <option key={s.id} value={s.id}>
                  #{s.id} — {s.name} (₹{s.rate.toFixed(2)}/1k)
                </option>
              ))}
            </select>
          </div>

          {/* Service Specification Callout Card */}
          {currentService && (
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 text-xs space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-semibold text-slate-200 text-sm">{currentService.name}</h2>
                  <p className="text-slate-400 mt-1 leading-relaxed">{currentService.desc}</p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-slate-400 text-[11px] block">Rate per 1,000</span>
                  <span className="text-base font-bold font-mono text-emerald-400 tabular-nums">
                    ₹{currentService.rate.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Clean unboxed metadata with dot separators */}
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800/80 text-slate-400">
                <span>Min: <strong className="text-slate-200 font-mono">{currentService.min.toLocaleString()}</strong></span>
                <span aria-hidden="true">·</span>
                <span>Max: <strong className="text-slate-200 font-mono">{currentService.max.toLocaleString()}</strong></span>
                <span aria-hidden="true">·</span>
                <span>Speed: <strong className="text-slate-200">{currentService.speed || '100k/day'}</strong></span>
                <span aria-hidden="true">·</span>
                <span>Refill: <strong className={currentService.refill ? 'text-emerald-400' : 'text-slate-400'}>
                  {currentService.refill ? 'Guaranteed Refill' : 'No Refill'}
                </strong></span>
              </div>
            </div>
          )}

          {/* Target Link Input */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Destination Link / URL
              </label>
              <span className="text-[11px] text-slate-400">
                {currentService?.platform === 'Instagram' && 'e.g. https://www.instagram.com/p/...'}
                {currentService?.platform === 'YouTube' && 'e.g. https://youtu.be/... or channel URL'}
                {currentService?.platform === 'TikTok' && 'e.g. https://www.tiktok.com/@user/video/...'}
                {currentService?.platform === 'Facebook' && 'e.g. https://facebook.com/page/...'}
              </span>
            </div>
            <input
              type="text"
              required
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="https://instagram.com/p/..."
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors font-mono"
            />
          </div>

          {/* Custom Comments textarea if custom comment service */}
          {isCustomCommentService && (
            <div>
              <label htmlFor={commentsId} className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Custom Comments (1 per line)
              </label>
              <textarea
                id={commentsId}
                rows={4}
                value={customComments}
                onChange={(e) => setCustomComments(e.target.value)}
                placeholder="Awesome video!&#10;Keep it up!&#10;Great content brother!"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors font-mono text-xs"
              />
            </div>
          )}

          {/* Quantity Section with Quick Steppers */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Quantity
              </label>
              {currentService && (
                <span className="text-[11px] font-mono text-slate-400">
                  Range: {currentService.min.toLocaleString()} – {currentService.max.toLocaleString()}
                </span>
              )}
            </div>

            <input
              type="number"
              required
              min={currentService?.min || 10}
              max={currentService?.max || 1000000}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors font-mono font-bold tabular-nums text-lg"
            />

            {/* Quick Chips */}
            <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
              <span className="text-[11px] text-slate-500 mr-1">Quick:</span>
              {[100, 500, 1000, 2500, 5000, 10000].map(val => (
                <button
                  key={val}
                  type="button"
                  onClick={() => handleQuickQty(val)}
                  className="px-2 py-1 text-[11px] font-mono bg-slate-800/80 hover:bg-slate-700 rounded text-slate-300 border border-slate-700/60 transition-colors"
                >
                  +{val.toLocaleString()}
                </button>
              ))}
              {currentService && (
                <>
                  <button
                    type="button"
                    onClick={() => handleQuickQty(currentService.min)}
                    className="px-2 py-1 text-[11px] font-mono bg-slate-800 hover:bg-slate-700 rounded text-slate-400 border border-slate-700 transition-colors"
                  >
                    Min ({currentService.min})
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickQty(Math.min(currentService.max, 50000))}
                    className="px-2 py-1 text-[11px] font-mono bg-slate-800 hover:bg-slate-700 rounded text-slate-400 border border-slate-700 transition-colors"
                  >
                    Max
                  </button>
                </>
              )}
            </div>

            {currentService && !isQuantityValid && parsedQty > 0 && (
              <p className="flex items-center gap-1.5 text-xs text-rose-400 mt-2">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>Quantity is outside provider limits ({currentService.min} to {currentService.max.toLocaleString()})</span>
              </p>
            )}
          </div>

          {/* Pricing & Final Charge Calculation Box */}
          <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 to-slate-900/90 rounded-xl border border-slate-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold block">Total Charge</span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-3xl font-black text-orange-400 font-mono tabular-nums">
                  ₹{totalCost.toFixed(2)}
                </span>
                <span className="text-xs text-slate-400 font-mono">INR</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5 font-mono">
                Calculation: ({parsedQty.toLocaleString()} × ₹{unitRate.toFixed(2)}) / 1,000
              </p>
            </div>

            <div className="text-left sm:text-right text-xs space-y-1 text-slate-400">
              <p>Your Balance: <strong className="text-emerald-400 font-mono font-bold">₹{userBalance.toFixed(2)}</strong></p>
              <p>Remaining After: <strong className={`font-mono ${userBalance >= totalCost ? 'text-slate-300' : 'text-rose-400'}`}>
                ₹{(userBalance - totalCost).toFixed(2)}
              </strong></p>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting || !isQuantityValid || !link.trim()}
            className="w-full py-4 px-6 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 disabled:opacity-50 disabled:pointer-events-none text-white font-bold text-base rounded-xl shadow-lg shadow-orange-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Submitting to HanumanSMM...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>
                  {isLiveDispatch ? 'Submit Live Order to HanumanSMM' : 'Submit Demo Order (Local Test)'}
                </span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Right Column: Instant Guidelines, Security & Best Practices */}
      <div className="lg:col-span-4 space-y-6">
        
        {/* Order Guard Card */}
        <div className="bg-[#0f172a]/70 rounded-2xl border border-slate-800 p-6 backdrop-blur-sm space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Order Guidelines</span>
          </h2>
          
          <ul className="text-xs text-slate-300 space-y-3.5 leading-relaxed">
            <li className="flex items-start gap-2.5">
              <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>Ensure target account or post is strictly <strong>Public</strong>. Private posts fail immediately on the server.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>Do not place overlapping orders for the identical link until the first finishes.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>For YouTube Watch Time (Service #6210), video duration must be at least 60 minutes.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>Indian Real Likes (#4281 & #2973) begin within 0–30 minutes of submission.</span>
            </li>
          </ul>
        </div>

        {/* Live Hanuman Connection Info */}
        <div className="bg-[#0f172a]/70 rounded-2xl border border-slate-800 p-6 backdrop-blur-sm space-y-3 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-orange-400" />
              <span>Provider Endpoint</span>
            </span>
            <span className="text-[11px] font-mono text-emerald-400">hanumansmm.in</span>
          </div>
          <div className="p-3 bg-slate-900 rounded-lg border border-slate-800/80 font-mono text-[11px] text-slate-400 break-all">
            POST https://hanumansmm.in/api/v2
          </div>
          <p className="text-slate-400 leading-relaxed text-[11px]">
            Orders with <strong>Live API</strong> toggle on are dispatched directly to your upstream account. If your account runs out of funds, you can switch to <strong>Demo Mode</strong> at the top to test workflows.
          </p>
        </div>

      </div>

    </div>
  );
};
