import React, { useState, useEffect } from 'react';
import {
  Search, Download, ArrowUpDown, ArrowRight, Link2, Check,
  ChevronLeft, ChevronRight, X, SlidersHorizontal
} from 'lucide-react';
import { SMMService } from '../types.ts';
import {
  SEARCH_URL_PRESETS,
  SearchUrlFormat,
  getSavedSearchUrlFormat,
  saveSearchUrlFormat,
  parseUrlState,
  buildServicesSearchUrl,
  updateBrowserUrl
} from '../lib/searchUrl.ts';

interface ServicesTableProps {
  services: SMMService[];
  onSelectService: (serviceId: number) => void;
}

const ITEMS_PER_PAGE = 15;

export const ServicesTable: React.FC<ServicesTableProps> = ({ services, onSelectService }) => {
  const initialState = parseUrlState();

  const [urlFormat, setUrlFormat] = useState<SearchUrlFormat>(() => getSavedSearchUrlFormat());
  const [showUrlSettings, setShowUrlSettings] = useState<boolean>(false);
  const [customPathInput, setCustomPathInput] = useState<string>(() => getSavedSearchUrlFormat().basePath);
  const [customParamInput, setCustomParamInput] = useState<string>(() => getSavedSearchUrlFormat().queryParam);
  const [copiedUrl, setCopiedUrl] = useState<boolean>(false);

  const [searchQuery, setSearchQuery] = useState<string>(initialState.query);
  const [selectedPlatform, setSelectedPlatform] = useState<string>(initialState.platform);
  const [selectedCategory, setSelectedCategory] = useState<string>(initialState.category);
  const [sortBy, setSortBy] = useState<'id' | 'rate' | 'min' | 'name'>(initialState.sortBy);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(initialState.sortOrder);
  const [currentPage, setCurrentPage] = useState<number>(initialState.page);

  const platforms = ['All', 'Instagram', 'YouTube', 'TikTok', 'Facebook', 'LinkedIn'];

  // Categories list (include active category even while live services load so refresh preserves filter)
  const categories = Array.from(
    new Set([
      'All',
      ...services.map(s => s.category),
      ...(selectedCategory && selectedCategory !== 'All' ? [selectedCategory] : [])
    ])
  );

  // Sync state from browser Back/Forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const parsed = parseUrlState();
      if (parsed.tab === 'services') {
        setSearchQuery(parsed.query);
        setSelectedPlatform(parsed.platform);
        setSelectedCategory(parsed.category);
        setSortBy(parsed.sortBy);
        setSortOrder(parsed.sortOrder);
        setCurrentPage(parsed.page);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

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

  // Pagination
  const totalPages = Math.max(1, Math.ceil(sorted.length / ITEMS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * ITEMS_PER_PAGE;
  const paginatedServices = sorted.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  // Keep currentPage valid when results shrink
  useEffect(() => {
    if (services.length > 0 && currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [services.length, currentPage, totalPages]);

  // Sync URL whenever search, filters, sorting, pagination, or URL format changes
  useEffect(() => {
    const nextUrl = buildServicesSearchUrl({
      query: searchQuery,
      platform: selectedPlatform,
      category: selectedCategory,
      sortBy,
      sortOrder,
      page: safePage,
      format: urlFormat
    });
    updateBrowserUrl(nextUrl, false);
  }, [searchQuery, selectedPlatform, selectedCategory, sortBy, sortOrder, safePage, urlFormat]);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  const handlePlatformChange = (platform: string) => {
    setSelectedPlatform(platform);
    setCurrentPage(1);
  };

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    setCurrentPage(1);
  };

  const toggleSort = (field: 'id' | 'rate' | 'min' | 'name') => {
    if (sortBy === field) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedPlatform('All');
    setSelectedCategory('All');
    setSortBy('id');
    setSortOrder('asc');
    setCurrentPage(1);
  };

  const handleSelectPreset = (preset: SearchUrlFormat) => {
    const saved = saveSearchUrlFormat(preset);
    setUrlFormat(saved);
    setCustomPathInput(saved.basePath);
    setCustomParamInput(saved.queryParam);
  };

  const handleApplyCustomFormat = (e: React.FormEvent) => {
    e.preventDefault();
    const saved = saveSearchUrlFormat({
      id: 'custom',
      label: `Custom (${customPathInput}?${customParamInput}=...)`,
      basePath: customPathInput,
      queryParam: customParamInput,
      includeTabParam: customPathInput.trim() === '/'
    });
    setUrlFormat(saved);
    setCustomPathInput(saved.basePath);
    setCustomParamInput(saved.queryParam);
  };

  const handleCopyShareUrl = () => {
    const fullUrl = `${window.location.origin}${window.location.pathname}${window.location.search}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
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

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    selectedPlatform !== 'All' ||
    selectedCategory !== 'All' ||
    safePage > 1;

  const liveSearchUrlPreview = buildServicesSearchUrl({
    query: searchQuery || 'instagram',
    platform: selectedPlatform,
    category: selectedCategory,
    sortBy,
    sortOrder,
    page: safePage,
    format: urlFormat
  });

  // Compute compact pagination buttons
  const getPageNumbers = (): (number | 'ellipsis')[] => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const pages: (number | 'ellipsis')[] = [1];
    if (safePage > 3) pages.push('ellipsis');
    const start = Math.max(2, safePage - 1);
    const end = Math.min(totalPages - 1, safePage + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (safePage < totalPages - 2) pages.push('ellipsis');
    pages.push(totalPages);
    return pages;
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
            Browse, search, and order from {services.length} high-performance social growth services.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
          <button
            type="button"
            onClick={() => setShowUrlSettings(prev => !prev)}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border rounded-xl transition-colors cursor-pointer ${
              showUrlSettings
                ? 'bg-orange-600/20 text-orange-300 border-orange-500/50'
                : 'text-slate-200 bg-slate-900 hover:bg-slate-800 border-slate-700/80'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Search URL Format</span>
          </button>

          <button
            type="button"
            onClick={handleCopyShareUrl}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-200 bg-slate-900 hover:bg-slate-800 border border-slate-700/80 rounded-xl transition-colors cursor-pointer"
            title="Copy current search URL"
          >
            {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Link2 className="w-3.5 h-3.5 text-orange-400" />}
            <span>{copiedUrl ? 'Copied' : 'Copy URL'}</span>
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-200 bg-slate-900 hover:bg-slate-800 border border-slate-700/80 rounded-xl transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Search URL Format Customizer Panel */}
      {showUrlSettings && (
        <div className="p-4 sm:p-5 bg-[#0f172a]/90 border border-orange-500/30 rounded-2xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Link2 className="w-4 h-4 text-orange-400" />
                <span>Search URL Format Settings</span>
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Choose a preset or enter your custom Search URL path and query parameter. Older URL formats remain supported automatically.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowUrlSettings(false)}
              className="text-slate-400 hover:text-white self-end sm:self-auto p-1 cursor-pointer"
              aria-label="Close Search URL Settings"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Preset Format Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {SEARCH_URL_PRESETS.map(preset => (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleSelectPreset(preset)}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  urlFormat.id === preset.id
                    ? 'bg-orange-600/15 border-orange-500 text-white'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                }`}
              >
                <div className="text-xs font-bold">{preset.label}</div>
                <div className="text-[11px] font-mono text-orange-400 mt-1 truncate">
                  {preset.basePath}?{preset.includeTabParam ? 'tab=services&' : ''}{preset.queryParam}=instagram
                </div>
              </button>
            ))}
          </div>

          {/* Custom Format Form */}
          <form onSubmit={handleApplyCustomFormat} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end pt-2 border-t border-slate-800">
            <div className="sm:col-span-5">
              <label className="block text-[11px] uppercase font-semibold text-slate-400 mb-1">
                Base Search Path
              </label>
              <input
                type="text"
                value={customPathInput}
                onChange={(e) => setCustomPathInput(e.target.value)}
                placeholder="/bobysmmpanal or /search or /"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-orange-500"
              />
            </div>
            <div className="sm:col-span-4">
              <label className="block text-[11px] uppercase font-semibold text-slate-400 mb-1">
                Query Parameter Key
              </label>
              <input
                type="text"
                value={customParamInput}
                onChange={(e) => setCustomParamInput(e.target.value)}
                placeholder="q or s or keyword"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-orange-500"
              />
            </div>
            <div className="sm:col-span-3">
              <button
                type="submit"
                className="w-full py-2 px-4 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Apply Format
              </button>
            </div>
          </form>

          {/* Live URL Preview */}
          <div className="p-2.5 bg-slate-950/70 border border-slate-800 rounded-xl flex flex-wrap items-center justify-between gap-2 text-[11px]">
            <span className="text-slate-400">Active Search URL Preview:</span>
            <code className="font-mono text-emerald-400 break-all">
              {`${typeof window !== 'undefined' ? window.location.origin : ''}${liveSearchUrlPreview}`}
            </code>
          </div>
        </div>
      )}

      {/* Filter and Search Bar Controls */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">

        {/* Search input */}
        <div className="md:col-span-5 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search service name, ID, or keyword..."
            className="w-full bg-slate-900 border border-slate-700/80 rounded-xl pl-9 pr-9 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-orange-500 transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => handleSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Platform Filter Buttons */}
        <div className="md:col-span-4 flex items-center gap-1 overflow-x-auto py-1">
          {platforms.map(p => (
            <button
              key={p}
              type="button"
              onClick={() => handlePlatformChange(p)}
              className={`px-2.5 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
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
            onChange={(e) => handleCategoryChange(e.target.value)}
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

      {/* Results Count + Clear Filters Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
        <div>
          Showing <span className="font-mono font-bold text-white">{sorted.length === 0 ? 0 : startIndex + 1}</span>
          {'–'}
          <span className="font-mono font-bold text-white">{Math.min(startIndex + ITEMS_PER_PAGE, sorted.length)}</span>
          {' of '}
          <span className="font-mono font-bold text-orange-400">{sorted.length}</span> matching services
        </div>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={handleClearFilters}
            className="text-xs text-orange-400 hover:text-orange-300 font-semibold flex items-center gap-1 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
            <span>Reset Search & Filters</span>
          </button>
        )}
      </div>

      {/* Services Table */}
      <div className="bg-[#0f172a]/70 rounded-2xl border border-slate-800 overflow-hidden backdrop-blur-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-900/90 text-slate-400 uppercase font-semibold border-b border-slate-800 text-[11px] tracking-wider">
                <th className="py-3 px-4 w-20">
                  <button type="button" onClick={() => toggleSort('id')} className="flex items-center gap-1 hover:text-white cursor-pointer">
                    <span>ID</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="py-3 px-4 w-28">Platform</th>
                <th className="py-3 px-4 min-w-[260px]">
                  <button type="button" onClick={() => toggleSort('name')} className="flex items-center gap-1 hover:text-white cursor-pointer">
                    <span>Service Details</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="py-3 px-4 text-right w-28">
                  <button type="button" onClick={() => toggleSort('rate')} className="flex items-center gap-1 ml-auto hover:text-white cursor-pointer">
                    <span>Rate / 1k</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="py-3 px-4 text-right w-36">
                  <button type="button" onClick={() => toggleSort('min')} className="flex items-center gap-1 ml-auto hover:text-white cursor-pointer">
                    <span>Min / Max</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="py-3 px-4 text-center w-28">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-slate-300">
              {paginatedServices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-500">
                    No services found matching your criteria.
                  </td>
                </tr>
              ) : (
                paginatedServices.map(s => (
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
                        type="button"
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

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="px-4 py-3.5 bg-slate-900/80 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
            <span className="text-xs text-slate-400">
              Page <strong className="text-white font-mono">{safePage}</strong> of <strong className="text-white font-mono">{totalPages}</strong>
            </span>

            <div className="flex items-center gap-1.5 flex-wrap justify-center">
              <button
                type="button"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={safePage <= 1}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-xs font-semibold text-slate-200 flex items-center gap-1 cursor-pointer disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Prev</span>
              </button>

              {getPageNumbers().map((item, idx) =>
                item === 'ellipsis' ? (
                  <span key={`e-${idx}`} className="px-2 text-slate-500 text-xs">
                    ...
                  </span>
                ) : (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setCurrentPage(item)}
                    className={`w-8 h-8 rounded-lg text-xs font-mono font-bold transition-colors cursor-pointer ${
                      safePage === item
                        ? 'bg-orange-600 text-white shadow-sm'
                        : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300'
                    }`}
                  >
                    {item}
                  </button>
                )
              )}

              <button
                type="button"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={safePage >= totalPages}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-xs font-semibold text-slate-200 flex items-center gap-1 cursor-pointer disabled:cursor-not-allowed transition-colors"
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
