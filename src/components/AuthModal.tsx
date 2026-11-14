import React, { useState } from 'react';
import { X, ShieldCheck, Zap, AlertCircle, Wallet, Lock } from 'lucide-react';
import { User } from '../types.ts';
import { signInWithGoogle } from '../lib/firebaseAuth.ts';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: User) => void;
  onShowToast: (type: 'success' | 'error' | 'warning' | 'info', title: string, message?: string) => void;
  initialMode?: 'login' | 'register';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  onShowToast
}) => {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setErrorMessage(null);
    setIsLoading(true);
    try {
      const { idToken } = await signInWithGoogle();

      const pendingRef = localStorage.getItem('pending_referral_code') || undefined;
      const response = await fetch('/api/auth/google', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`
        },
        body: JSON.stringify({ idToken, referralCode: pendingRef })
      });

      const data = await response.json();

      if (response.ok && data.success && data.user) {
        if (pendingRef) localStorage.removeItem('pending_referral_code');
        if (data.token) {
          localStorage.setItem('hanuman_auth_token', data.token);
        }
        localStorage.setItem('hanuman_user', JSON.stringify(data.user));

        onLoginSuccess({ ...data.user, token: data.token });
        onShowToast(
          'success',
          data.isNewUser ? 'Account Created (₹0.00 Balance)' : 'Signed In with Google',
          data.isNewUser
            ? 'Welcome! Please add funds in your wallet to place orders.'
            : `Welcome back, ${data.user.name}!`
        );
        onClose();
      } else {
        setErrorMessage(data.error || 'Google authentication verification failed.');
      }
    } catch (err: any) {
      if (err?.code === 'auth/popup-closed-by-user') {
        setErrorMessage('Sign-in popup was closed before completing authentication.');
      } else {
        setErrorMessage(err?.message || 'Unable to sign in with Google right now.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-[#0f172a] border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
        
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-600 text-white shadow-lg shadow-orange-500/20 mb-1">
            <Zap className="w-6 h-6 fill-white text-white" />
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
            Sign in to Boby SMM Panel
          </h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            Secure one-click authentication powered by Google OAuth 2.0. Each account is uniquely bound to your Google ID.
          </p>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-3.5 bg-rose-950/40 border border-rose-800/80 rounded-xl flex items-start gap-2.5 text-xs text-rose-300">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1 leading-relaxed">{errorMessage}</div>
          </div>
        )}

        {/* Official Google Sign-In Button */}
        <div className="space-y-4 pt-1">
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-3 px-5 py-3.5 bg-white hover:bg-slate-100 active:bg-slate-200 disabled:opacity-60 text-slate-900 font-semibold text-sm rounded-xl shadow-lg transition-all cursor-pointer border border-slate-200"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-slate-400 border-t-slate-900 rounded-full animate-spin" />
            ) : (
              <svg
                version="1.1"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 48 48"
                className="w-5 h-5 shrink-0"
              >
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                <path fill="none" d="M0 0h48v48H0z" />
              </svg>
            )}
            <span>{isLoading ? 'Verifying Google Account...' : 'Sign in with Google'}</span>
          </button>
        </div>

        {/* Security & Zero Initial Balance Policy Notice */}
        <div className="space-y-2.5 pt-2 border-t border-slate-800/80 text-[11px] text-slate-400">
          <div className="flex items-start gap-2.5 p-3 bg-slate-900/90 border border-slate-800 rounded-xl">
            <Wallet className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
            <div>
              <span className="text-slate-200 font-semibold block">₹0.00 Initial Wallet Balance</span>
              <span>New accounts start with ₹0.00. Add funds via Paytm UPI QR, PhonePe, GPay, or Cards before placing orders.</span>
            </div>
          </div>

          <div className="flex items-start gap-2.5 p-3 bg-slate-900/90 border border-slate-800 rounded-xl">
            <Lock className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <span className="text-slate-200 font-semibold block">Google UID Account Isolation</span>
              <span>Your dashboard, wallet balance, and orders are strictly bound to your verified Google UID.</span>
            </div>
          </div>

          <div className="flex items-center justify-center gap-1.5 text-slate-500 pt-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Protected by Google OAuth 2.0 & Server Token Verification</span>
          </div>
        </div>

      </div>
    </div>
  );
};
