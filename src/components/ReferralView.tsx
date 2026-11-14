import React, { useState, useEffect, useCallback } from 'react';
import { Users, Copy, Check, Gift, Wallet, Share2, RefreshCw, UserPlus } from 'lucide-react';
import { User } from '../types.ts';

interface ReferralItem {
  id: string;
  name: string;
  maskedEmail: string;
  joinedAt: string;
  totalDeposited: number;
  commissionEarned: number;
}

interface ReferralViewProps {
  currentUser: User | null;
  onRequireLogin: () => void;
  onShowToast: (type: 'success' | 'error' | 'warning' | 'info', title: string, message?: string) => void;
}

export const ReferralView: React.FC<ReferralViewProps> = ({
  currentUser,
  onRequireLogin,
  onShowToast
}) => {
  const [referralCode, setReferralCode] = useState<string>(currentUser?.referralCode || '');
  const [referralEarnings, setReferralEarnings] = useState<number>(currentUser?.referralEarnings || 0);
  const [referrals, setReferrals] = useState<ReferralItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  const referralLink = referralCode
    ? `${window.location.origin}/?ref=${encodeURIComponent(referralCode)}`
    : '';

  const fetchReferrals = useCallback(async () => {
    const token = currentUser?.token || localStorage.getItem('hanuman_auth_token');
    if (!currentUser || !token) return;

    setIsLoading(true);
    try {
      const res = await fetch('/api/referrals', {
        cache: 'no-store',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setReferralCode(data.referralCode || '');
        setReferralEarnings(Number(data.referralEarnings || 0));
        setReferrals(Array.isArray(data.referrals) ? data.referrals : []);
      }
    } catch (err) {
      console.error('Failed loading referrals:', err);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchReferrals();
  }, [fetchReferrals]);

  const handleCopyLink = () => {
    if (!referralLink) return;
    navigator.clipboard.writeText(referralLink);
    setCopiedLink(true);
    onShowToast('success', 'Invite Link Copied', 'Share this link with friends to earn 5% commission on their deposits.');
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyCode = () => {
    if (!referralCode) return;
    navigator.clipboard.writeText(referralCode);
    setCopiedCode(true);
    onShowToast('info', 'Referral Code Copied', `Code ${referralCode} copied to clipboard.`);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  if (!currentUser) {
    return (
      <div className="max-w-xl mx-auto my-8 bg-[#0f172a]/90 border border-slate-800 rounded-2xl p-8 text-center space-y-4">
        <Users className="w-10 h-10 text-orange-400 mx-auto" />
        <h2 className="text-xl font-bold text-white">Sign In to Access Referrals</h2>
        <p className="text-xs text-slate-400">
          Get your personal invite link and track commissions from friends who join Boby SMM Panel.
        </p>
        <button
          type="button"
          onClick={onRequireLogin}
          className="px-6 py-2.5 bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold rounded-xl cursor-pointer"
        >
          Sign In with Google
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <Users className="w-6 h-6 text-orange-500" />
            <span>Refer & Earn 5% Commission</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Invite friends using your unique referral link. You earn 5% wallet commission on every deposit they make.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchReferrals}
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition-colors cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-orange-400' : ''}`} />
          <span>Refresh Stats</span>
        </button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#0f172a]/80 border border-slate-800 rounded-2xl p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center text-orange-400 shrink-0">
            <UserPlus className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-400 block">Total Invited Users</span>
            <span className="text-2xl font-black text-white font-mono tabular-nums">{referrals.length}</span>
          </div>
        </div>

        <div className="bg-[#0f172a]/80 border border-slate-800 rounded-2xl p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-400 block">Total Commission Earned</span>
            <span className="text-2xl font-black text-emerald-400 font-mono tabular-nums">
              ₹{referralEarnings.toFixed(2)}
            </span>
          </div>
        </div>

        <div className="bg-[#0f172a]/80 border border-slate-800 rounded-2xl p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400 shrink-0">
            <Gift className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-400 block">Commission Rate</span>
            <span className="text-2xl font-black text-sky-400 font-mono tabular-nums">5.0%</span>
          </div>
        </div>
      </div>

      {/* Invite Link & Code Box */}
      <div className="bg-[#0f172a]/80 border border-slate-800 rounded-2xl p-6 space-y-5">
        <div className="flex items-center gap-2 text-sm font-bold text-white">
          <Share2 className="w-4 h-4 text-orange-400" />
          <span>Your Personal Invite Link & Code</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-8 space-y-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
              Referral Invite Link
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={referralLink || 'Generating invite link...'}
                className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs font-mono text-slate-200 focus:outline-none"
              />
              <button
                type="button"
                onClick={handleCopyLink}
                className="px-4 py-2.5 bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedLink ? 'Copied' : 'Copy Link'}</span>
              </button>
            </div>
          </div>

          <div className="lg:col-span-4 space-y-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
              Referral Code
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={referralCode || '---'}
                className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs font-mono font-bold text-orange-400 focus:outline-none"
              />
              <button
                type="button"
                onClick={handleCopyCode}
                className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCode ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Invited Users Table */}
      <div className="bg-[#0f172a]/80 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-sm font-bold text-white">Referred Users History</h2>
          <span className="text-xs font-mono text-slate-400">{referrals.length} total</span>
        </div>

        {referrals.length === 0 ? (
          <div className="p-8 text-center space-y-2">
            <p className="text-sm font-semibold text-slate-300">No referrals yet</p>
            <p className="text-xs text-slate-500">
              Share your invite link above. When someone signs up and adds funds, you automatically receive 5% in your wallet!
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/60 text-slate-400 uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-6">User</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Joined</th>
                  <th className="py-3 px-4 text-right">Deposited</th>
                  <th className="py-3 px-6 text-right">Your 5% Bonus</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {referrals.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3.5 px-6 font-semibold text-white">{r.name}</td>
                    <td className="py-3.5 px-4 font-mono text-slate-400">{r.maskedEmail}</td>
                    <td className="py-3.5 px-4 text-slate-400">
                      {new Date(r.joinedAt).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-slate-300">
                      ₹{r.totalDeposited.toFixed(2)}
                    </td>
                    <td className="py-3.5 px-6 text-right font-mono font-bold text-emerald-400">
                      +₹{r.commissionEarned.toFixed(2)}
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
