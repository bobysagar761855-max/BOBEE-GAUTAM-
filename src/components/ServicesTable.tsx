import React, { useState } from 'react';
import { Search, Download, ArrowUpDown, ArrowRight } from 'lucide-react';
import { SMMService } from '../types.ts';

interface ServicesTableProps {
  services: SMMService[];
  onSelectService: (serviceId: number) => void;
}

export const ServicesTable: React.FC<ServicesTableProps> = ({ services, onSelectService }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState<string>('All');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'id' | 'rate' | 'min' | 'name'>('id');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const platforms = ['All', 'Instagram', 'YouTube', 'TikTok', 'Facebook', 'LinkedIn'];

  // Categories list
  const categories = ['All', ...Array.from(new Set(services.map(s => s.category)))];

  // Filtering
  const filtered = services.filter(s => {
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !query ||
      s.name.toLowerCase().includes(query) ||
      s.id.toString().includes(query) ||
      s.category.toLowerCase().includes(query) ||
      s.desc.toLowerCase().includes(query);

    const matchesPlatform =
      selectedPlatform === 'All' ||
      s.platform.toLowerCase() === selectedPlatform.toLowerCase();

    const matchesCategory =
      selectedCategory === 'All' ||
      s.category === selectedCategory;

    return matchesSearch && matchesPlatform && matchesCategory;
  });

  // Sorting
  const sorted = [...filtered].sort((a, b) => {
    let comparison = 0;
    if (sortBy === 'id') comparison = a.id - b.id;
    else if (sortBy === 'rate') comparison = a.rate - b.rate;
    else if (sortBy === 'min') comparison = a.min - b.min;
    else if (sortBy === 'name') comparison = a.name.localeCompare(b.name);

    return sortOrder === 'asc' ? comparison : -comparison;
  });

  const toggleSort = (field: 'id' | 'rate' | 'min' | 'name') => {
    if (sortBy === field) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const handleExportCSV = () => {
    const headers = ['ID', 'Platform', 'Category', 'Service Name', 'Rate per 1k (INR)', 'Min', 'Max', 'Description'];
    const rows = sorted.map(s => [
      s.id,
      s.platform,
      `"${s.category.replace(/"/g, '""')}"`,
      `"${s.name.replace(/"/g, '""')}"`,
      s.rate.toFixed(2),
      s.min,
      s.max,
      `"${s.desc.replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `boby_smm_panel_services_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Title & Quick Action Strip */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Services Catalog
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Browse, search, and order from 26 high-performance social growth services.
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-200 bg-slate-900 hover:bg-slate-800 border border-slate-700/80 rounded-xl transition-colors self-start md:self-auto"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export CSV</span>
        </button>
      </div>

      {/* Filter and Search Bar Controls */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
        
        {/* Search input */}
        <div className="md:col-span-5 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search service name, ID, or keyword..."
            className="w-full bg-slate-900 border border-slate-700/80 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-orange-500 transition-colors"
          />
        </div>

        {/* Platform Filter Buttons */}
        <div className="md:col-span-4 flex items-center gap-1 overflow-x-auto py-1">
          {platforms.map(p => (
            <button
              key={p}
              onClick={() => setSelectedPlatform(p)}
              className={`px-2.5 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
                selectedPlatform === p
                  ? 'bg-orange-600 text-white font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              {p}
            </button>
          ))}
        </div>

        {/* Category selector */}
        <div className="md:col-span-3">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-orange-500 transition-colors"
          >
            {categories.map(c => (
              <option key={c} value={c}>
                {c === 'All' ? 'All Categories' : c}
              </option>
            ))}
          </select>
        </div>

      </div>

      {/* Services Table */}
      <div className="bg-[#0f172a]/70 rounded-2xl border border-slate-800 overflow-hidden backdrop-blur-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-900/90 text-slate-400 uppercase font-semibold border-b border-slate-800 text-[11px] tracking-wider">
                <th className="py-3 px-4 w-20">
                  <button onClick={() => toggleSort('id')} className="flex items-center gap-1 hover:text-white">
                    <span>ID</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="py-3 px-4 w-28">Platform</th>
                <th className="py-3 px-4 min-w-[260px]">
                  <button onClick={() => toggleSort('name')} className="flex items-center gap-1 hover:text-white">
                    <span>Service Details</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="py-3 px-4 text-right w-28">
                  <button onClick={() => toggleSort('rate')} className="flex items-center gap-1 ml-auto hover:text-white">
                    <span>Rate / 1k</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="py-3 px-4 text-right w-36">
                  <button onClick={() => toggleSort('min')} className="flex items-center gap-1 ml-auto hover:text-white">
                    <span>Min / Max</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="py-3 px-4 text-center w-28">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-slate-300">
              {sorted.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-500">
                    No services found matching your criteria.
                  </td>
                </tr>
              ) : (
                sorted.map(s => (
                  <tr key={s.id} className="hover:bg-slate-800/40 transition-colors group">
                    
                    {/* ID */}
                    <td className="py-3.5 px-4 font-mono font-bold text-orange-400 tabular-nums">
                      #{s.id}
                    </td>

                    {/* Platform */}
                    <td className="py-3.5 px-4 font-medium text-slate-300">
                      {s.platform}
                    </td>

                    {/* Service Name & Specs */}
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-white group-hover:text-orange-400 transition-colors leading-snug">
                        {s.name}
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[11px] text-slate-400">
                        <span>{s.category}</span>
                        <span aria-hidden="true">·</span>
                        <span>{s.speed || '100k/day'}</span>
                        <span aria-hidden="true">·</span>
                        <span className={s.refill ? 'text-emerald-400' : 'text-slate-500'}>
                          {s.refill ? 'Refill Guarantee' : 'No Refill'}
                        </span>
                        {s.cancel && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="text-sky-400">Cancel Button</span>
                          </>
                        )}
                      </div>
                    </td>

                    {/* Rate per 1k */}
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-400 tabular-nums text-sm">
                      ₹{s.rate.toFixed(2)}
                    </td>

                    {/* Min / Max */}
                    <td className="py-3.5 px-4 text-right font-mono text-slate-300 tabular-nums text-xs">
                      <span>{s.min.toLocaleString()}</span>
                      <span className="text-slate-500 mx-1">/</span>
                      <span>{s.max.toLocaleString()}</span>
                    </td>

                    {/* Quick Order Button */}
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => onSelectService(s.id)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-800 group-hover:bg-orange-600 text-slate-200 group-hover:text-white rounded-lg text-xs font-semibold transition-all cursor-pointer shadow-sm"
                      >
                        <span>Order</span>
                        <ArrowRight className="w-3 h-3" />
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
