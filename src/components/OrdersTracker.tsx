import React, { useState } from 'react';
import { RefreshCw, Copy, Check, ExternalLink, Search } from 'lucide-react';
import { PlacedOrder } from '../types.ts';

interface OrdersTrackerProps {
  orders: PlacedOrder[];
  onRefreshStatus: (orderId: string | number) => Promise<void>;
  onShowToast: (type: 'success' | 'error' | 'warning' | 'info', title: string, message?: string) => void;
}

export const OrdersTracker: React.FC<OrdersTrackerProps> = ({
  orders,
  onRefreshStatus,
  onShowToast
}) => {
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedId, setCopiedId] = useState<string | number | null>(null);
  const [syncingId, setSyncingId] = useState<string | number | null>(null);

  const statuses = ['All', 'Pending', 'In Progress', 'Completed', 'Partial', 'Canceled'];

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
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-colors ${
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
            onChange={(e) => setSearchQuery(e.target.value)}
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
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-500">
                    No orders found matching the filter.
                  </td>
                </tr>
              ) : (
                filteredOrders.map(order => (
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
      </div>

    </div>
  );
};
