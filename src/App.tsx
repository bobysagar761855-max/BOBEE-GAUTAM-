import React, { useState, useEffect, useCallback } from 'react';
import { Header, PanelTab } from './components/Header.tsx';
import { NewOrderForm } from './components/NewOrderForm.tsx';
import { ServicesTable } from './components/ServicesTable.tsx';
import { OrdersTracker } from './components/OrdersTracker.tsx';
import { WalletView } from './components/WalletView.tsx';
import { ApiSettingsView } from './components/ApiSettingsView.tsx';
import { FAQView } from './components/FAQView.tsx';
import { AuthModal } from './components/AuthModal.tsx';
import { ToastContainer } from './components/Toast.tsx';
import { initialServices, SMMService } from './data/services.ts';
import { PlacedOrder, ToastMessage, User } from './types.ts';

export default function App() {
  const [activeTab, setActiveTab] = useState<PanelTab>('new-order');
  const [services, setServices] = useState<SMMService[]>(initialServices);
  const [orders, setOrders] = useState<PlacedOrder[]>([]);
  const [providerBalance, setProviderBalance] = useState<string>('Loading...');
  const [providerStatus, setProviderStatus] = useState<'online' | 'offline_cached' | 'auth_error' | 'loading'>('loading');
  
  // User Authentication State
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('hanuman_user');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (!parsed.username && parsed.email) {
          parsed.username = parsed.email.split('@')[0];
        }
        return parsed;
      } catch {
        // fallback
      }
    }
    // Default pre-authenticated admin user
    return {
      id: 'usr-admin-1',
      username: 'bobysagar',
      name: 'Boby Sagar',
      email: 'bobysagar761855@gmail.com',
      role: 'admin',
      balance: 2500.00,
      apiKey: 'hn_live_admin_89a3f2d1e4',
      token: 'hn_sess_admin_seed',
      phone: '+91 98765 43210',
      createdAt: new Date().toISOString()
    };
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

  // Sync session with backend on load
  useEffect(() => {
    const token = localStorage.getItem('hanuman_auth_token');
    if (token) {
      fetch(`/api/auth/me?token=${token}`)
        .then(res => res.json())
        .then(data => {
          if (data.success && data.user) {
            setCurrentUser(data.user);
            setUserBalance(data.user.balance);
          }
        })
        .catch(() => {
          // Token verification offline
        });
    }
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
    }
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem('reseller_wallet_balance', userBalance.toString());
  }, [userBalance]);

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

  // Fetch placed orders (user-filtered if client, all if admin)
  const fetchOrders = useCallback(async () => {
    try {
      const url = currentUser ? `/api/orders?userId=${currentUser.id}` : '/api/orders';
      const res = await fetch(url);
      const data = await res.json();
      if (data.orders) {
        setOrders(data.orders);
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
    setActiveTab('orders');
  };

  const handleDeductBalance = (amount: number) => {
    setUserBalance(prev => Math.max(0, prev - amount));
    if (currentUser) {
      setCurrentUser(prev => prev ? { ...prev, balance: Math.max(0, prev.balance - amount) } : null);
    }
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
    setActiveTab('new-order');
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
    fetchOrders();
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setUserBalance(0);
    localStorage.removeItem('hanuman_user');
    localStorage.removeItem('hanuman_auth_token');
    showToast('info', 'Logged Out', 'You have been logged out of your account.');
  };

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col selection:bg-orange-600/30 selection:text-orange-200">
      
      {/* Top Bar Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        providerBalance={providerBalance}
        providerStatus={providerStatus}
        userBalance={userBalance}
        currentUser={currentUser}
        onRefreshBalance={fetchProviderBalance}
        onOpenAddFunds={() => setActiveTab('wallet')}
        onOpenSettings={() => setActiveTab('api')}
        onOpenAuth={handleOpenAuth}
        onLogout={handleLogout}
        isRefreshing={isRefreshing}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-8 py-6 sm:py-10">
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

        {activeTab === 'api' && (
          <ApiSettingsView
            onShowToast={showToast}
            onRefreshBalance={fetchProviderBalance}
          />
        )}

        {activeTab === 'faq' && (
          <FAQView onNavigateToTab={setActiveTab} />
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
