import React, { useState, useRef, useEffect } from 'react';
import {
  RefreshCw, Wallet, Plus, Zap, Settings, User as UserIcon, LogOut,
  Copy, Check, Send, MoreVertical, ShoppingCart, ListChecks,
  Package, HelpCircle, LogIn, UserPlus
} from 'lucide-react';
import { User } from '../types.ts';

export type PanelTab = 'new-order' | 'services' | 'orders' | 'wallet' | 'api' | 'faq';

interface HeaderProps {
  activeTab: PanelTab;
  setActiveTab: (tab: PanelTab) => void;
  providerBalance: string;
  providerStatus: 'online' | 'offline_cached' | 'auth_error' | 'loading';
  userBalance: number;
  currentUser: User | null;
  onRefreshBalance: () => void;
  onOpenAddFunds: () => void;
  onOpenSettings: () => void;
  onOpenAuth: (mode?: 'login' | 'register') => void;
  onLogout: () => void;
  isRefreshing: boolean;
}

const TAB_LABELS: Record<PanelTab, string> = {
  'new-order': 'New Order',
  'services': 'Services Catalog',
  'orders': 'Orders Tracker',
  'wallet': 'Add Funds & Wallet',
  'api': 'API & Settings',
  'faq': 'FAQ & Help Center'
};

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  providerBalance,
  userBalance,
  currentUser,
  onRefreshBalance,
  onOpenAddFunds,
  onOpenSettings,
  onOpenAuth,
  onLogout,
  isRefreshing
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCopyKey = () => {
    if (currentUser?.apiKey) {
      navigator.clipboard.writeText(currentUser.apiKey);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  const navigateTo = (tab: PanelTab) => {
    setActiveTab(tab);
    setIsMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-[#090d16]/95 backdrop-blur-md border-b border-slate-800/80 px-4 sm:px-8 py-3.5 transition-colors">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">

        {/* Left: Brand Wordmark + Active Section Indicator */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center text-white font-bold text-lg shadow-md shadow-orange-500/20 shrink-0">
            <Zap className="w-5 h-5 fill-white text-white" />
          </div>
          <button
            onClick={() => navigateTo('new-order')}
            className="text-left group cursor-pointer truncate"
          >
            <span className="text-base sm:text-lg font-extrabold tracking-tight text-white group-hover:text-orange-400 transition-colors">
              Boby<span className="text-orange-500 font-black"> SMM Panel</span>
            </span>
          </button>
          <span className="hidden sm:inline-block text-slate-700">/</span>
          <span className="hidden sm:inline-block text-xs font-semibold text-slate-400 truncate">
            {TAB_LABELS[activeTab]}
          </span>
        </div>

        {/* Right: Account Wallet Balance (after login) or Sign In + Three-Dot (⋮) Menu */}
        <div className="flex items-center gap-2.5 shrink-0">
          {currentUser ? (
            <button
              type="button"
              onClick={() => navigateTo('wallet')}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-950/40 hover:bg-emerald-950/70 border border-emerald-800/40 text-xs transition-colors cursor-pointer"
              title="Open Wallet & Add Funds"
            >
              <Wallet className="w-3.5 h-3.5 text-emerald-400" />
              <span className="font-mono font-bold text-emerald-400 tabular-nums">
                ₹{userBalance.toFixed(2)}
              </span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onOpenAuth('login')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold transition-colors cursor-pointer shadow-sm shadow-orange-600/25"
              title="Sign in to view balance & add payment"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
          )}

          {/* Unified Three-Dot Menu Button */}
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setIsMenuOpen((prev) => !prev)}
              aria-label="Open menu"
              aria-expanded={isMenuOpen}
              className={`flex items-center gap-2 p-2 rounded-xl border transition-all cursor-pointer ${
                isMenuOpen
                  ? 'bg-orange-600 border-orange-500 text-white shadow-md shadow-orange-600/25'
                  : 'bg-slate-900/90 border-slate-700/80 text-slate-200 hover:border-orange-500/80 hover:text-white'
              }`}
              title="All Menu & Account Options"
            >
              {currentUser && (
                <div className="w-5 h-5 rounded-md bg-gradient-to-tr from-orange-500 to-amber-500 flex items-center justify-center text-white text-[10px] font-bold font-mono">
                  {getInitials(currentUser.name || currentUser.username)}
                </div>
              )}
              <MoreVertical className="w-4 h-4" />
            </button>

            {/* Unified Three-Dot Dropdown Menu */}
            {isMenuOpen && (
              <div className="absolute right-0 mt-2.5 w-72 sm:w-80 bg-[#0f172a] border border-slate-700/90 rounded-2xl p-3 shadow-2xl space-y-3 z-50 animate-in fade-in slide-in-from-top-2 max-h-[85vh] overflow-y-auto">
                
                {/* Section 1: User Account Header or Login/Register */}
                {currentUser ? (
                  <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800 space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-white truncate">
                          {currentUser.name || `@${currentUser.username}`}
                        </p>
                        <p className="text-[11px] text-slate-400 font-mono truncate">
                          {currentUser.email}
                        </p>
                      </div>
                      <span className="text-[10px] uppercase font-bold font-mono px-2 py-0.5 rounded bg-orange-950/60 border border-orange-800/80 text-orange-400 shrink-0">
                        {currentUser.role}
                      </span>
                    </div>

                    {/* Client API Key */}
                    <div className="pt-2 border-t border-slate-800/80 text-[11px] space-y-1">
                      <div className="flex items-center justify-between text-slate-400">
                        <span>Client API Key</span>
                        <button
                          type="button"
                          onClick={handleCopyKey}
                          className="text-orange-400 hover:text-orange-300 flex items-center gap-1 font-mono cursor-pointer"
                        >
                          {copiedKey ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedKey ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                      <div className="font-mono text-slate-300 truncate text-[10px]">
                        {currentUser.apiKey}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800 space-y-2.5">
                    <p className="text-xs text-slate-300 font-semibold">
                      Sign in to manage orders & wallet
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setIsMenuOpen(false);
                          onOpenAuth('login');
                        }}
                        className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-200 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors cursor-pointer"
                      >
                        <LogIn className="w-3.5 h-3.5" />
                        <span>Sign In</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsMenuOpen(false);
                          onOpenAuth('register');
                        }}
                        className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-orange-600 hover:bg-orange-500 rounded-lg transition-colors cursor-pointer"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>Register</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Section 2: Navigation & Panel Features */}
                <div className="space-y-1">
                  <div className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Panel Navigation
                  </div>

                  <button
                    type="button"
                    onClick={() => navigateTo('new-order')}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                      activeTab === 'new-order'
                        ? 'bg-orange-600 text-white'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                    }`}
                  >
                    <ShoppingCart className="w-4 h-4 shrink-0" />
                    <span>New Order</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => navigateTo('services')}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                      activeTab === 'services'
                        ? 'bg-orange-600 text-white'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                    }`}
                  >
                    <Package className="w-4 h-4 shrink-0" />
                    <span>Services Catalog</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => navigateTo('orders')}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                      activeTab === 'orders'
                        ? 'bg-orange-600 text-white'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                    }`}
                  >
                    <ListChecks className="w-4 h-4 shrink-0" />
                    <span>Orders Tracker</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      onOpenAddFunds();
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                      activeTab === 'wallet'
                        ? 'bg-orange-600 text-white'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <Plus className="w-4 h-4 shrink-0" />
                      <span>Add Funds & Payment</span>
                    </span>
                    <span className="font-mono text-[11px] text-emerald-400">
                      ₹{userBalance.toFixed(0)}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      onOpenSettings();
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                      activeTab === 'api'
                        ? 'bg-orange-600 text-white'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                    }`}
                  >
                    <Settings className="w-4 h-4 shrink-0" />
                    <span>API & Settings</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => navigateTo('faq')}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                      activeTab === 'faq'
                        ? 'bg-orange-600 text-white'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                    }`}
                  >
                    <HelpCircle className="w-4 h-4 shrink-0" />
                    <span>FAQ & Help Center</span>
                  </button>
                </div>

                {/* Section 3: Provider Reserve & Telegram Support */}
                <div className="pt-2 border-t border-slate-800 space-y-2">
                  <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs">
                    <span className="text-slate-400">Provider Balance:</span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-bold text-amber-400 tabular-nums">
                        ₹{providerBalance}
                      </span>
                      <button
                        type="button"
                        onClick={onRefreshBalance}
                        disabled={isRefreshing}
                        title="Refresh Provider Balance"
                        className="text-slate-400 hover:text-white p-0.5 disabled:opacity-50 cursor-pointer"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-orange-400' : ''}`} />
                      </button>
                    </div>
                  </div>

                  <a
                    href="https://t.me/boby_smm_panal_help_team"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setIsMenuOpen(false)}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-bold text-sky-300 hover:text-white bg-sky-950/50 hover:bg-sky-600/30 border border-sky-800/60 rounded-xl transition-colors"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Help Team Telegram Support</span>
                  </a>
                </div>

                {/* Section 4: Account Actions (when logged in) */}
                {currentUser && (
                  <div className="pt-2 border-t border-slate-800 space-y-1">
                    <button
                      type="button"
                      onClick={() => {
                        setIsMenuOpen(false);
                        onOpenAuth('login');
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-slate-300 hover:text-white hover:bg-slate-800/60 transition-colors text-left cursor-pointer"
                    >
                      <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                      <span>Switch Account</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsMenuOpen(false);
                        onLogout();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 transition-colors text-left font-semibold cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Log Out</span>
                    </button>
                  </div>
                )}

              </div>
            )}
          </div>
        </div>

      </div>
    </header>
  );
};
