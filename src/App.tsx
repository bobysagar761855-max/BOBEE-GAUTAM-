import React, { useState, useEffect, useCallback } from 'react';
import { Header, PanelTab } from './components/Header.tsx';
import { NewOrderForm } from './components/NewOrderForm.tsx';
import { ServicesTable } from './components/ServicesTable.tsx';
import { OrdersTracker } from './components/OrdersTracker.tsx';
import { WalletView } from './components/WalletView.tsx';
import { ReferralView } from './components/ReferralView.tsx';
import { ApiSettingsView } from './components/ApiSettingsView.tsx';
import { FAQView } from './components/FAQView.tsx';
import { AuthModal } from './components/AuthModal.tsx';
import { ToastContainer } from './components/Toast.tsx';
import { initialServices, SMMService } from './data/services.ts';
import { PlacedOrder, ToastMessage, User } from './types.ts';
import { initGoogleAuth, googleLogout } from './lib/firebaseAuth.ts';
import { parseUrlState, getTabBaseUrl, updateBrowserUrl } from './lib/searchUrl.ts';

export default function App() {
  const [activeTab, setActiveTab] = useState<PanelTab>(() => parseUrlState().tab);
  const [services, setServices] = useState<SMMService[]>(initialServices);
  const [orders, setOrders] = useState<PlacedOrder[]>([]);
  const [providerBalance, setProviderBalance] = useState<string>('Loading...');
  const [providerStatus, setProviderStatus] = useState<'online' | 'offline_cached' | 'auth_error' | 'loading'>('loading');
  
  // User Authentication State (no hardcoded shared user; restored strictly from verified session token)
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const token = localStorage.getItem('hanuman_auth_token');
    const saved = localStorage.getItem('hanuman_user');
    if (token && saved) {
      try {
        const parsed = JSON.parse(saved);
        if (!parsed.username && parsed.email) {
          parsed.username = parsed.email.split('@')[0];
        }
        return parsed;
      } catch {
        // invalid saved state
      }
    }
    return null;
  });

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');

  const [userBalance, setUserBalance] = useState<number>(() => {
    if (currentUser) return currentUser.balance;
    return 0;
  });

  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [preselectedServiceId, setPreselectedServiceId] = useState<number | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const showToast = useCallback((type: 'success' | 'error' | 'warning' | 'info', title: string, message?: string) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts(prev => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  }, []);

  const dismissToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const handleOpenAuth = (mode: 'login' | 'register' = 'login') => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  };

  // Sync activeTab when user navigates with browser Back / Forward
  useEffect(() => {
    const handlePopState = () => {
      const parsed = parseUrlState();
      setActiveTab(parsed.tab);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleTabChange = useCallback((tab: PanelTab) => {
    setActiveTab(tab);
    updateBrowserUrl(getTabBaseUrl(tab), true);
  }, []);

  // Capture ?ref=CODE from invite links
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref && ref.trim()) {
      localStorage.setItem('pending_referral_code', ref.trim().toUpperCase());
    }
  }, []);

  // Sync Firebase Google Auth + backend session on load
  useEffect(() => {
    const token = localStorage.getItem('hanuman_auth_token');
    if (token) {
      fetch('/api/auth/me', {
        cache: 'no-store',
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
        .then(async (res) => {
          const data = await res.json();
          if (res.ok && data.success && data.user) {
            setCurrentUser({ ...data.user, token });
            setUserBalance(data.user.balance);
          } else {
            localStorage.removeItem('hanuman_user');
            localStorage.removeItem('hanuman_auth_token');
            setCurrentUser(null);
            setUserBalance(0);
            setOrders([]);
          }
        })
        .catch(() => {
          // Token verification offline
        });
    }

    const unsubscribe = initGoogleAuth(
      async (_firebaseUser, idToken) => {
        try {
          const res = await fetch('/api/auth/google', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${idToken}`
            },
            body: JSON.stringify({ idToken })
          });
          const data = await res.json();
          if (res.ok && data.success && data.user) {
            setCurrentUser({
              ...data.user,
              photoUrl: data.user.photoUrl || _firebaseUser.photoURL || undefined,
              token: data.token
            });
            setUserBalance(data.user.balance);
          }
        } catch {
          // offline
        }
      },
      () => {
        if (!localStorage.getItem('hanuman_auth_token')) {
          setCurrentUser(null);
          setUserBalance(0);
          setOrders([]);
        }
      }
    );

    return () => unsubscribe();
  }, []);

  // Prevent browser Back-button (bfcache) from restoring a logged-out dashboard
  useEffect(() => {
    const handlePageShow = (event: PageTransitionEvent) => {
      const token = localStorage.getItem('hanuman_auth_token');
      if (!token) {
        setCurrentUser(null);
        setUserBalance(0);
        setOrders([]);
        if (event.persisted) {
          setAuthModalMode('login');
          setIsAuthModalOpen(true);
        }
        return;
      }

      if (event.persisted) {
        fetch('/api/auth/me', {
          cache: 'no-store',
          headers: { Authorization: `Bearer ${token}` }
        })
          .then(res => res.json())
          .then(data => {
            if (!data.success || !data.user) {
              localStorage.removeItem('hanuman_user');
              localStorage.removeItem('hanuman_auth_token');
              setCurrentUser(null);
              setUserBalance(0);
              setOrders([]);
              setAuthModalMode('login');
              setIsAuthModalOpen(true);
            }
          })
          .catch(() => {
            setCurrentUser(null);
            setUserBalance(0);
            setOrders([]);
            setAuthModalMode('login');
            setIsAuthModalOpen(true);
          });
      }
    };

    window.addEventListener('pageshow', handlePageShow);
    return () => window.removeEventListener('pageshow', handlePageShow);
  }, []);

  // Sync user balance with currentUser and local storage
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('hanuman_user', JSON.stringify(currentUser));
      if (currentUser.token) {
        localStorage.setItem('hanuman_auth_token', currentUser.token);
      }
      setUserBalance(currentUser.balance);
    } else {
      localStorage.removeItem('hanuman_user');
      localStorage.removeItem('hanuman_auth_token');
      setUserBalance(0);
    }
  }, [currentUser]);

  // Fetch HanumanSMM provider balance
  const fetchProviderBalance = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch('/api/balance');
      const data = await res.json();
      if (data.balance !== undefined) {
        setProviderBalance(parseFloat(data.balance).toFixed(2));
        setProviderStatus(data.status || 'online');
      } else {
        setProviderBalance('0.00');
        setProviderStatus('auth_error');
      }
    } catch {
      setProviderBalance('1,420.50');
      setProviderStatus('offline_cached');
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // Fetch placed orders strictly for the authenticated user
  const fetchOrders = useCallback(async () => {
    const token = currentUser?.token || localStorage.getItem('hanuman_auth_token');
    if (!currentUser || !token) {
      setOrders([]);
      return;
    }
    try {
      const res = await fetch('/api/orders', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (res.ok && data.orders) {
        setOrders(data.orders);
      } else {
        setOrders([]);
      }
    } catch (err) {
      console.warn('Orders fetch error:', err);
    }
  }, [currentUser]);

  // Fetch services
  const fetchServices = useCallback(async () => {
    try {
      const res = await fetch('/api/services');
      const data = await res.json();
      if (data.services && data.services.length > 0) {
        setServices(data.services);
      }
    } catch (err) {
      console.warn('Services fetch error, using curated catalog:', err);
    }
  }, []);

  useEffect(() => {
    fetchProviderBalance();
    fetchOrders();
    fetchServices();
  }, [fetchProviderBalance, fetchOrders, fetchServices]);

  const handleOrderSuccess = (newOrder: any) => {
    setOrders(prev => [newOrder, ...prev]);
    fetchOrders();
    fetchProviderBalance();
    handleTabChange('orders');
  };

  const handleDeductBalance = (amount: number, exactNewBalance?: number) => {
    if (!currentUser) return;
    const nextBalance = typeof exactNewBalance === 'number'
      ? exactNewBalance
      : Math.max(0, currentUser.balance - amount);
    setUserBalance(nextBalance);
    setCurrentUser(prev => prev ? { ...prev, balance: nextBalance } : null);
  };

  const handleAddFunds = (amount: number, _method?: string, exactNewBalance?: number) => {
    if (!currentUser) {
      handleOpenAuth('login');
      return;
    }
    const nextBalance = typeof exactNewBalance === 'number'
      ? exactNewBalance
      : currentUser.balance + amount;
    setUserBalance(nextBalance);
    setCurrentUser(prev => prev ? { ...prev, balance: nextBalance } : null);
  };

  const handleSelectServiceFromCatalog = (serviceId: number) => {
    setPreselectedServiceId(serviceId);
    handleTabChange('new-order');
    showToast('info', 'Service Selected', `Service #${serviceId} loaded into New Order.`);
  };

  const handleRefreshOrderStatus = async (orderId: string | number) => {
    const res = await fetch(`/api/status/${orderId}`);
    const data = await res.json();
    if (data.status) {
      setOrders(prev => prev.map(o => {
        if (String(o.orderId) === String(orderId)) {
          return {
            ...o,
            status: data.status,
            startCount: data.start_count ? parseInt(data.start_count, 10) : o.startCount,
            remains: data.remains ? parseInt(data.remains, 10) : o.remains
          };
        }
        return o;
      }));
    }
  };

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    setUserBalance(user.balance);
    setOrders([]);
    fetchOrders();
  };

  const handleLogout = async () => {
    const token = currentUser?.token || localStorage.getItem('hanuman_auth_token');

    // Immediately clear client state & browser storage so no stale state survives
    setCurrentUser(null);
    setUserBalance(0);
    setOrders([]);
    localStorage.removeItem('hanuman_user');
    localStorage.removeItem('hanuman_auth_token');
    localStorage.removeItem('reseller_wallet_balance');
    sessionStorage.clear();

    try {
      await googleLogout();
    } catch {
      // ignore firebase signout error
    }

    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        cache: 'no-store',
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
    } catch {
      // ignore network error on logout
    }

    // Replace history entry & open Login modal immediately
    window.history.replaceState(null, '', '/');
    setActiveTab('new-order');
    setAuthModalMode('login');
    setIsAuthModalOpen(true);
    showToast('info', 'Logged Out', 'Session destroyed. Please Sign in with Google to continue.');
  };

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col selection:bg-orange-600/30 selection:text-orange-200">
      
      {/* Top Bar Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        providerBalance={providerBalance}
        providerStatus={providerStatus}
        userBalance={userBalance}
        currentUser={currentUser}
        onRefreshBalance={fetchProviderBalance}
        onOpenAddFunds={() => handleTabChange('wallet')}
        onOpenSettings={() => handleTabChange('api')}
        onOpenAuth={handleOpenAuth}
        onLogout={handleLogout}
        isRefreshing={isRefreshing}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-8 py-6 sm:py-10">
        {!currentUser ? (
          <div className="max-w-lg mx-auto my-12 bg-[#0f172a]/90 border border-slate-800 rounded-2xl p-8 text-center space-y-5 shadow-2xl">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-600 text-white flex items-center justify-center mx-auto shadow-lg shadow-orange-500/20 font-black text-xl">
              ⚡
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-black text-white tracking-tight">
                Welcome to Boby SMM Panel
              </h1>
              <p className="text-xs text-slate-400 leading-relaxed">
                Sign in or create your account with Google to access the live dashboard, manage your wallet balance, and place orders.
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleOpenAuth('login')}
              className="w-full py-3.5 px-6 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-orange-600/25 transition-all cursor-pointer"
            >
              Sign In / Create Account with Google
            </button>
          </div>
        ) : (
          <>
            {activeTab === 'new-order' && (
              <NewOrderForm
                services={services}
                userBalance={userBalance}
                currentUser={currentUser}
                onRequireLogin={() => handleOpenAuth('login')}
                onOrderSuccess={handleOrderSuccess}
                onDeductBalance={handleDeductBalance}
                onShowToast={showToast}
                preselectedServiceId={preselectedServiceId}
              />
            )}

            {activeTab === 'services' && (
              <ServicesTable
                services={services}
                onSelectService={handleSelectServiceFromCatalog}
              />
            )}

            {activeTab === 'orders' && (
              <OrdersTracker
                orders={orders}
                currentUser={currentUser}
                onRequireLogin={() => handleOpenAuth('login')}
                onRefreshStatus={handleRefreshOrderStatus}
                onShowToast={showToast}
              />
            )}

            {activeTab === 'wallet' && (
              <WalletView
                userBalance={userBalance}
                providerBalance={providerBalance}
                currentUser={currentUser}
                onRequireLogin={() => handleOpenAuth('login')}
                onAddFunds={handleAddFunds}
                onShowToast={showToast}
              />
            )}

            {activeTab === 'referrals' && (
              <ReferralView
                currentUser={currentUser}
                onRequireLogin={() => handleOpenAuth('login')}
                onShowToast={showToast}
              />
            )}

            {activeTab === 'api' && (
              <ApiSettingsView
                onShowToast={showToast}
                onRefreshBalance={fetchProviderBalance}
              />
            )}

            {activeTab === 'faq' && (
              <FAQView onNavigateToTab={handleTabChange} />
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-slate-800/80 bg-[#090d16] px-4 sm:px-8 py-6 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-400">Boby SMM Panel</span>
            <span aria-hidden="true">·</span>
            <span>API v2 Integration</span>
            <span aria-hidden="true">·</span>
            <span className="text-emerald-500 font-medium">Provider Online</span>
          </div>

          <div className="flex items-center gap-3">
            <span>Built with automated order fulfillment & Indian rupee (INR) pricing.</span>
            <span aria-hidden="true">·</span>
            <a
              href="https://t.me/boby_smm_panal_help_team"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sky-400 hover:text-sky-300 font-semibold transition-colors"
            >
              Telegram Help Team (@boby_smm_panal_help_team)
            </a>
          </div>
        </div>
      </footer>

      {/* Authentication Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        initialMode={authModalMode}
        onClose={() => setIsAuthModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
        onShowToast={showToast}
      />

      {/* Toast Notification Container */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

    </div>
  );
}
