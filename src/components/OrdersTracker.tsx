import React, { useState, useEffect } from 'react';
import { RefreshCw, Copy, Check, ExternalLink, Search, ArrowRight, Lock, ChevronLeft, ChevronRight } from 'lucide-react';
import { PlacedOrder, User } from '../types.ts';
import { parseUrlState, buildOrdersUrl, updateBrowserUrl } from '../lib/searchUrl.ts';

interface OrdersTrackerProps {
  orders: PlacedOrder[];
  currentUser: User | null;
  onRequireLogin: () => void;
  onRefreshStatus: (orderId: string | number) => Promise<void>;
  onShowToast: (type: 'success' | 'error' | 'warning' | 'info', title: string, message?: string) => void;
}

const ORDERS_PER_PAGE = 15;

export const OrdersTracker: React.FC<OrdersTrackerProps> = ({
  orders,
  currentUser,
  onRequireLogin,
  onRefreshStatus,
  onShowToast
}) => {
  const initialState = parseUrlState();
  const [statusFilter, setStatusFilter] = useState<string>(initialState.status || 'All');
  const [searchQuery, setSearchQuery] = useState<string>(initialState.query || '');
  const [currentPage, setCurrentPage] = useState<number>(initialState.page || 1);
  const [copiedId, setCopiedId] = useState<string | number | null>(null);
  const [syncingId, setSyncingId] = useState<string | number | null>(null);

  const statuses = ['All', 'Pending', 'In Progress', 'Completed', 'Partial', 'Canceled'];

  useEffect(() => {
    const handlePopState = () => {
      const parsed = parseUrlState();
      if (parsed.tab === 'orders') {
        setStatusFilter(parsed.status || 'All');
        setSearchQuery(parsed.query || '');
        setCurrentPage(parsed.page || 1);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const filteredOrders = orders.filter(o => {
    const matchesStatus = statusFilter === 'All' || o.status.toLowerCase() === statusFilter.toLowerCase();
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !query ||
      String(o.orderId).toLowerCase().includes(query) ||
      o.link.toLowerCase().includes(query) ||
      o.serviceName.toLowerCase().includes(query);

    return matchesStatus && matchesSearch;
  });

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / ORDERS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedOrders = filteredOrders.slice((safePage - 1) * ORDERS_PER_PAGE, safePage * ORDERS_PER_PAGE);

  useEffect(() => {
    if (orders.length > 0 && currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [orders.length, currentPage, totalPages]);

  useEffect(() => {
    const nextUrl = buildOrdersUrl({
      query: searchQuery,
      status: statusFilter,
      page: safePage
    });
    updateBrowserUrl(nextUrl, false);
  }, [searchQuery, statusFilter, safePage]);

  const totalSpent = orders.reduce((sum, o) => sum + (Number(o.charge) || 0), 0);
  const completedCount = orders.filter(o => o.status.toLowerCase() === 'completed').length;
  const inProgressCount = orders.filter(o => o.status.toLowerCase() === 'in progress' || o.status.toLowerCase() === 'pending').length;

  const handleCopy = (id: string | number) => {
    navigator.clipboard.writeText(String(id));
    setCopiedId(id);
    onShowToast('info', 'Copied to Clipboard', `Order #${id} copied.`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSync = async (id: string | number) => {
    setSyncingId(id);
    try {
      await onRefreshStatus(id);
      onShowToast('success', 'Status Refreshed', `Checked live status for Order #${id}`);
    } catch {
      onShowToast('error', 'Status Check Failed', 'Could not sync with provider.');
    } finally {
      setSyncingId(null);
    }
  };

  const getStatusColor = (status: string) => {
    const s = status.toLowerCase();
    if (s === 'completed') return 'text-emerald-400 bg-emerald-950/60 border-emerald-800/60';
    if (s === 'in progress') return 'text-sky-400 bg-sky-950/60 border-sky-800/60';
    if (s === 'pending') return 'text-amber-400 bg-amber-950/60 border-amber-800/60';
    if (s === 'canceled') return 'text-rose-400 bg-rose-950/60 border-rose-800/60';
    return 'text-slate-300 bg-slate-800 border-slate-700';
  };

  if (!currentUser) {
    return (
      <div className="max-w-xl mx-auto my-8 bg-[#0f172a]/90 border border-slate-800 rounded-2xl p-8 text-center space-y-5 shadow-2xl animate-in fade-in">
        <div className="w-14 h-14 rounded-2xl bg-orange-500/15 border border-orange-500/30 text-orange-400 flex items-center justify-center mx-auto">
          <Lock className="w-7 h-7" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-black text-white tracking-tight">
            Sign In to View Your Orders
          </h2>
          <p className="text-xs text-slate-400 leading-relaxed max-w-md mx-auto">
            Order history is private to each user account. Sign in or register to track your own orders and live status updates.
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
    <div className="space-y-6">
      
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Orders History & Real-Time Tracking
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Monitor fulfillment progress, view start counts and remainders from HanumanSMM.
          </p>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-[#0f172a]/70 border border-slate-800 rounded-xl p-4">
          <span className="text-xs text-slate-400">Total Placed</span>
          <p className="text-2xl font-bold font-mono text-white mt-1 tabular-nums">
            {orders.length}
          </p>
        </div>
        <div className="bg-[#0f172a]/70 border border-slate-800 rounded-xl p-4">
          <span className="text-xs text-slate-400">Active / In Progress</span>
          <p className="text-2xl font-bold font-mono text-sky-400 mt-1 tabular-nums">
            {inProgressCount}
          </p>
        </div>
        <div className="bg-[#0f172a]/70 border border-slate-800 rounded-xl p-4">
          <span className="text-xs text-slate-400">Completed</span>
          <p className="text-2xl font-bold font-mono text-emerald-400 mt-1 tabular-nums">
            {completedCount}
          </p>
        </div>
        <div className="bg-[#0f172a]/70 border border-slate-800 rounded-xl p-4">
          <span className="text-xs text-slate-400">Total Volume</span>
          <p className="text-2xl font-bold font-mono text-amber-400 mt-1 tabular-nums">
            ₹{totalSpent.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Status Filters */}
        <div className="flex items-center gap-1 overflow-x-auto py-1">
          {statuses.map(st => (
            <button
              key={st}
              type="button"
              onClick={() => { setStatusFilter(st); setCurrentPage(1); }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
                statusFilter === st
                  ? 'bg-orange-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            placeholder="Search order ID or link..."
            className="w-full bg-slate-900 border border-slate-700/80 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-orange-500 transition-colors"
          />
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-[#0f172a]/70 rounded-2xl border border-slate-800 overflow-hidden backdrop-blur-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-900/90 text-slate-400 uppercase font-semibold border-b border-slate-800 text-[11px] tracking-wider">
                <th className="py-3 px-4">Order ID</th>
                <th className="py-3 px-4 min-w-[200px]">Service</th>
                <th className="py-3 px-4 min-w-[220px]">Target Link</th>
                <th className="py-3 px-4 text-right">Quantity</th>
                <th className="py-3 px-4 text-right">Charge</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Start / Remains</th>
                <th className="py-3 px-4 text-center">Live Check</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-slate-300">
              {paginatedOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-500">
                    No orders found matching the filter.
                  </td>
                </tr>
              ) : (
                paginatedOrders.map(order => (
                  <tr key={order.id} className="hover:bg-slate-800/40 transition-colors">
                    
                    {/* Order ID */}
                    <td className="py-3.5 px-4 font-mono font-bold text-orange-400 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span>#{order.orderId}</span>
                        <button
                          onClick={() => handleCopy(order.orderId)}
                          title="Copy Order ID"
                          className="text-slate-500 hover:text-slate-300 transition-colors p-0.5"
                        >
                          {copiedId === order.orderId ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                      <span className="text-[10px] text-slate-500 block font-sans">
                        {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </td>

                    {/* Service */}
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-slate-200 line-clamp-1" title={order.serviceName}>
                        {order.serviceName}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        Service ID: #{order.serviceId} · {order.category}
                      </div>
                    </td>

                    {/* Target Link */}
                    <td className="py-3.5 px-4 font-mono text-slate-400 max-w-xs truncate">
                      <a
                        href={order.link}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="hover:text-orange-400 flex items-center gap-1 transition-colors"
                      >
                        <span className="truncate">{order.link}</span>
                        <ExternalLink className="w-3 h-3 shrink-0" />
                      </a>
                    </td>

                    {/* Quantity */}
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-white tabular-nums">
                      {order.quantity.toLocaleString()}
                    </td>

                    {/* Charge */}
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-400 tabular-nums">
                      ₹{order.charge.toFixed(2)}
                    </td>

                    {/* Status badge */}
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <span className={`inline-block px-2.5 py-0.5 rounded-md text-[11px] font-semibold border ${getStatusColor(order.status)}`}>
                        {order.status}
                      </span>
                    </td>

                    {/* Start count & remains */}
                    <td className="py-3.5 px-4 text-right font-mono text-[11px] text-slate-300 tabular-nums whitespace-nowrap">
                      <span>{order.startCount.toLocaleString()}</span>
                      <span className="text-slate-500 mx-1">/</span>
                      <span>{order.remains.toLocaleString()}</span>
                    </td>

                    {/* Live Check Button */}
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => handleSync(order.orderId)}
                        disabled={syncingId === order.orderId}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg text-xs transition-colors cursor-pointer disabled:opacity-50"
                        title="Query live status from HanumanSMM API"
                      >
                        <RefreshCw className={`w-3 h-3 ${syncingId === order.orderId ? 'animate-spin text-orange-400' : ''}`} />
                        <span>Check</span>
                      </button>
                    </td>

                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="px-4 py-3 bg-slate-900/80 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>
              Page <strong className="text-white font-mono">{safePage}</strong> of <strong className="text-white font-mono">{totalPages}</strong> ({filteredOrders.length} orders)
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={safePage <= 1}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 flex items-center gap-1 cursor-pointer disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Prev</span>
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={safePage >= totalPages}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 flex items-center gap-1 cursor-pointer disabled:cursor-not-allowed"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};
