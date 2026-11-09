import React, { useState, useMemo } from 'react';
import {
  HelpCircle, Search, ChevronDown, PackageCheck, RefreshCcw,
  Code2, Wallet, Send, ArrowRight, ShieldCheck
} from 'lucide-react';

interface FAQItem {
  id: string;
  category: 'Order Processing' | 'Refund Policies' | 'API Usage' | 'Payments';
  question: string;
  answer: string;
  highlights?: string[];
}

interface FAQViewProps {
  onNavigateToTab: (tab: 'new-order' | 'services' | 'orders' | 'wallet' | 'api' | 'faq') => void;
}

const FAQ_DATA: FAQItem[] = [
  {
    id: 'order-1',
    category: 'Order Processing',
    question: 'How long does it take for an order to start after placing it?',
    answer:
      'Most Instant Start services begin within 0–15 minutes of submission. Standard servers typically start within 1–3 hours depending on queue load and service speed listed in the service title.',
    highlights: ['Instant services: 0–15 min', 'Standard services: 1–3 hrs', 'Check service title for [0-30min] or [Instant] tags']
  },
  {
    id: 'order-2',
    category: 'Order Processing',
    question: 'Why is my order marked as "Pending" or "In Progress"?',
    answer:
      '"Pending" means your order is queued in the upstream server and waiting to start. "In Progress" means delivery is actively running. You can query live start counts and remaining quantity anytime in the Orders Tracker.',
  },
  {
    id: 'order-3',
    category: 'Order Processing',
    question: 'Can I place an order for a private Instagram or YouTube account?',
    answer:
      'No. Target profiles, posts, and videos must be set to Public before placing an order and must remain public until the order reaches Completed status. Orders placed on private links cannot be delivered.',
  },
  {
    id: 'order-4',
    category: 'Order Processing',
    question: 'What happens if I place two orders for the same link at the same time?',
    answer:
      'Avoid placing overlapping orders for the same link while an existing order is still Pending or In Progress. Both servers will use the same start count, which can cause under-delivery and void refill eligibility.',
  },
  {
    id: 'refund-1',
    category: 'Refund Policies',
    question: 'When do I get a refund for a failed or cancelled order?',
    answer:
      'If an order is Cancelled due to an invalid link, private profile, or server maintenance, 100% of the order charge is automatically refunded back to your panel wallet balance.',
    highlights: ['Cancelled order: 100% auto-refund', 'Partial order: Remaining undelivered quantity refunded', 'Refunds are credited directly to your panel wallet']
  },
  {
    id: 'refund-2',
    category: 'Refund Policies',
    question: 'How does the "Partial" status refund work?',
    answer:
      'When a server stops partway through delivery, it marks the order as "Partial". You are only charged for the quantity actually delivered, and the cost of the remaining undelivered quantity is refunded to your wallet automatically.',
  },
  {
    id: 'refund-3',
    category: 'Refund Policies',
    question: 'What is the Refill Guarantee (R30 / R365) and how do I claim it?',
    answer:
      'Services tagged with R30 or R365 include a 30-day or 365-day refill guarantee against drops. Services marked "NR" (No Refill) do not include drop protection. If a refill-eligible order drops below the delivered count, contact our Telegram Help Team with your Order ID.',
  },
  {
    id: 'refund-4',
    category: 'Refund Policies',
    question: 'Can I withdraw my deposited wallet balance back to my bank or UPI?',
    answer:
      'Wallet deposits are strictly for purchasing SMM services on Boby SMM Panel and cannot be withdrawn back to bank accounts or UPI. Please deposit only the amount you intend to spend on orders.',
  },
  {
    id: 'api-1',
    category: 'API Usage',
    question: 'How do I connect my website or script to the panel API?',
    answer:
      'Our panel follows the Standard SMM Panel API v2 specification. Send HTTP POST requests with Content-Type: application/x-www-form-urlencoded to the API endpoint using your API key and an action parameter (services, add, status, balance).',
    highlights: ['Method: POST (form-urlencoded)', 'Actions: services, add, status, balance', 'Full cURL & Python examples available in API & Settings']
  },
  {
    id: 'api-2',
    category: 'API Usage',
    question: 'Where can I find my personal Client API Key?',
    answer:
      'Log in to your account and open the three-dot menu (⋮) in the top-right corner to view and copy your personal Client API Key, or visit the API & Settings tab for full integration docs.',
  },
  {
    id: 'api-3',
    category: 'API Usage',
    question: 'Are there rate limits on API requests?',
    answer:
      'We recommend caching the services list locally and polling order status at most once every 30–60 seconds per active order. Excessive polling may be temporarily throttled.',
  },
  {
    id: 'pay-1',
    category: 'Payments',
    question: 'How long does Paytm UPI QR verification take?',
    answer:
      'Paytm UPI QR deposits to bobeegautam1@ptaxis are verified instantly once you submit the 12-digit UTR / Transaction Reference Number on the Add Funds page. Deposits of ₹1,000+ also receive an automatic 3%–5% bonus.',
  },
  {
    id: 'pay-2',
    category: 'Payments',
    question: 'My UPI payment was deducted, but my wallet balance did not update. What should I do?',
    answer:
      'Double-check that you entered the exact 12-digit UTR number from your payment receipt on the Add Funds page. If it still does not credit within 2 minutes, message our Telegram Help Team with your UTR screenshot.',
  }
];

const CATEGORIES = ['All', 'Order Processing', 'Refund Policies', 'API Usage', 'Payments'] as const;

export const FAQView: React.FC<FAQViewProps> = ({ onNavigateToTab }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<(typeof CATEGORIES)[number]>('All');
  const [openId, setOpenId] = useState<string | null>('order-1');

  const filteredFaqs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return FAQ_DATA.filter((item) => {
      const matchesCat = selectedCategory === 'All' || item.category === selectedCategory;
      const matchesQuery =
        !q ||
        item.question.toLowerCase().includes(q) ||
        item.answer.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q);
      return matchesCat && matchesQuery;
    });
  }, [searchQuery, selectedCategory]);

  const getCategoryIcon = (category: FAQItem['category']) => {
    switch (category) {
      case 'Order Processing':
        return <PackageCheck className="w-4 h-4 text-orange-400" />;
      case 'Refund Policies':
        return <RefreshCcw className="w-4 h-4 text-emerald-400" />;
      case 'API Usage':
        return <Code2 className="w-4 h-4 text-sky-400" />;
      case 'Payments':
        return <Wallet className="w-4 h-4 text-amber-400" />;
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="pb-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <HelpCircle className="w-6 h-6 text-orange-500" />
            <span>Frequently Asked Questions (FAQ)</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Answers on order processing, automatic refunds, refill guarantees, payments, and API integration.
          </p>
        </div>

        <a
          href="https://t.me/boby_smm_panal_help_team"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-xl shadow-md shadow-sky-600/20 transition-colors shrink-0"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Telegram Help Team</span>
        </a>
      </div>

      {/* Search & Category Filter */}
      <div className="bg-[#0f172a]/70 rounded-2xl border border-slate-800 p-4 sm:p-5 space-y-4">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search questions (e.g. refund, pending, refill, API, UTR)..."
            className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 transition-colors"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-orange-600 text-white shadow-sm shadow-orange-600/30'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* FAQ Accordion List */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-8 space-y-3">
          {filteredFaqs.length === 0 ? (
            <div className="p-8 bg-[#0f172a]/70 rounded-2xl border border-slate-800 text-center space-y-2">
              <p className="text-sm font-bold text-white">No matching questions found</p>
              <p className="text-xs text-slate-400">
                Try clearing your search filter or reach out to our Telegram Help Team directly.
              </p>
            </div>
          ) : (
            filteredFaqs.map((item) => {
              const isOpen = openId === item.id;
              return (
                <div
                  key={item.id}
                  className={`rounded-2xl border transition-colors ${
                    isOpen
                      ? 'bg-[#0f172a] border-orange-500/50'
                      : 'bg-[#0f172a]/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setOpenId(isOpen ? null : item.id)}
                    className="w-full px-5 py-4 flex items-center justify-between gap-4 text-left cursor-pointer"
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 shrink-0">{getCategoryIcon(item.category)}</div>
                      <div>
                        <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 block mb-0.5">
                          {item.category}
                        </span>
                        <span className="text-xs sm:text-sm font-bold text-white leading-snug">
                          {item.question}
                        </span>
                      </div>
                    </div>
                    <ChevronDown
                      className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
                        isOpen ? 'rotate-180 text-orange-400' : ''
                      }`}
                    />
                  </button>

                  {isOpen && (
                    <div className="px-5 pb-5 pt-1 pl-12 space-y-3 text-xs text-slate-300 leading-relaxed border-t border-slate-800/70">
                      <p className="pt-2">{item.answer}</p>
                      {item.highlights && item.highlights.length > 0 && (
                        <ul className="space-y-1 bg-slate-900/90 border border-slate-800 rounded-xl p-3 font-mono text-[11px] text-slate-300">
                          {item.highlights.map((hl, idx) => (
                            <li key={idx} className="flex items-center gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0" />
                              <span>{hl}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Right Column: Quick Links & Direct Support */}
        <div className="lg:col-span-4 space-y-5">
          <div className="bg-[#0f172a]/80 rounded-2xl border border-slate-800 p-6 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Quick Actions</span>
            </h3>
            <div className="space-y-2 text-xs">
              <button
                type="button"
                onClick={() => onNavigateToTab('orders')}
                className="w-full flex items-center justify-between px-3.5 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-slate-200 transition-colors cursor-pointer"
              >
                <span>Check Live Order Status</span>
                <ArrowRight className="w-3.5 h-3.5 text-orange-400" />
              </button>
              <button
                type="button"
                onClick={() => onNavigateToTab('wallet')}
                className="w-full flex items-center justify-between px-3.5 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-slate-200 transition-colors cursor-pointer"
              >
                <span>Submit UTR / Add Funds</span>
                <ArrowRight className="w-3.5 h-3.5 text-orange-400" />
              </button>
              <button
                type="button"
                onClick={() => onNavigateToTab('api')}
                className="w-full flex items-center justify-between px-3.5 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-slate-200 transition-colors cursor-pointer"
              >
                <span>View API v2 Documentation</span>
                <ArrowRight className="w-3.5 h-3.5 text-orange-400" />
              </button>
            </div>
          </div>

          <div className="bg-gradient-to-br from-sky-950/40 via-slate-900 to-slate-900 rounded-2xl border border-sky-800/50 p-6 space-y-3 text-xs">
            <h4 className="font-bold text-white text-sm">Still Need Assistance?</h4>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              Include your <strong>Order ID</strong> or <strong>12-digit UTR</strong> when messaging our support team for the fastest resolution.
            </p>
            <a
              href="https://t.me/boby_smm_panal_help_team"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2.5 px-4 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2 text-xs shadow-md shadow-sky-600/20"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Chat on Telegram (@boby_smm_panal_help_team)</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
