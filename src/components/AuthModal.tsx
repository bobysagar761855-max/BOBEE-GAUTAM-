import React, { useState, useMemo, useEffect } from 'react';
import { 
  X, Lock, Mail, User as UserIcon, ArrowRight, ShieldCheck, Zap, 
  Eye, EyeOff, Check, AlertCircle, KeyRound, Sparkles, ArrowLeft, 
  CheckCircle2, Clock, RefreshCw, Copy
} from 'lucide-react';
import { User } from '../types.ts';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: User) => void;
  onShowToast: (type: 'success' | 'error' | 'warning' | 'info', title: string, message?: string) => void;
  initialMode?: 'login' | 'register';
}

type AuthMode = 'login' | 'register' | 'forgot-password' | 'verify-reset' | 'reset-success';

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  onShowToast,
  initialMode = 'login'
}) => {
  // Navigation mode
  const [mode, setMode] = useState<AuthMode>(initialMode);

  // Login preference: 'username' or 'email'
  const [loginMethod, setLoginMethod] = useState<'username' | 'email'>('username');

  // Login Form Fields
  const [loginUsername, setLoginUsername] = useState('');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register Fields
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regName, setRegName] = useState('');

  // Forgot Password / Token Verification Fields
  const [forgotInput, setForgotInput] = useState('');
  const [resetEmail, setResetEmail] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [simulatedCode, setSimulatedCode] = useState<string | null>(null);
  const [codeExpiresAt, setCodeExpiresAt] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState<string>('15:00');
  const [tokenVerified, setTokenVerified] = useState<boolean>(false);
  const [resetSuccessUser, setResetSuccessUser] = useState<User | null>(null);

  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifyingToken, setIsVerifyingToken] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Reset states when opening modal or changing initialMode
  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setErrorMessage(null);
      setInfoMessage(null);
    }
  }, [isOpen, initialMode]);

  // Expiration countdown timer for password reset token
  useEffect(() => {
    if (mode !== 'verify-reset' || !codeExpiresAt) return;

    const updateTimer = () => {
      const remainingSeconds = Math.max(0, Math.floor((codeExpiresAt - Date.now()) / 1000));
      if (remainingSeconds === 0) {
        setTimeLeft('Expired');
        return;
      }
      const mins = Math.floor(remainingSeconds / 60);
      const secs = remainingSeconds % 60;
      setTimeLeft(`${mins}:${secs < 10 ? '0' : ''}${secs}`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [mode, codeExpiresAt]);

  // Validation Logic for Register
  const isRegUsernameValid = useMemo(() => {
    return /^[a-zA-Z0-9_]{3,20}$/.test(regUsername.trim());
  }, [regUsername]);

  const isRegEmailValid = useMemo(() => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(regEmail.trim());
  }, [regEmail]);

  const getPasswordStrength = (pwd: string) => {
    if (!pwd) return { score: 0, label: 'Too short', color: 'bg-slate-700' };
    let score = 0;
    if (pwd.length >= 8) score += 1;
    if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score += 1;
    if (/[0-9]/.test(pwd)) score += 1;
    if (/[^A-Za-z0-9]/.test(pwd)) score += 1;

    if (score === 1) return { score: 1, label: 'Weak', color: 'bg-rose-500' };
    if (score === 2) return { score: 2, label: 'Fair', color: 'bg-amber-500' };
    if (score === 3) return { score: 3, label: 'Good', color: 'bg-sky-500' };
    if (score >= 4) return { score: 4, label: 'Strong', color: 'bg-emerald-500' };
    return { score: 0, label: 'Too short', color: 'bg-slate-700' };
  };

  const regPasswordStrength = useMemo(() => getPasswordStrength(regPassword), [regPassword]);
  const newPasswordStrength = useMemo(() => getPasswordStrength(newPassword), [newPassword]);

  const isRegPasswordMatch = useMemo(() => {
    return regPassword.length > 0 && regPassword === regConfirmPassword;
  }, [regPassword, regConfirmPassword]);

  const isNewPasswordMatch = useMemo(() => {
    return newPassword.length > 0 && newPassword === confirmNewPassword;
  }, [newPassword, confirmNewPassword]);

  // Validation Logic for Login
  const isLoginValid = useMemo(() => {
    if (loginMethod === 'username') {
      return loginUsername.trim().length >= 3 && loginPassword.length >= 1;
    } else {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(loginEmail.trim()) && loginPassword.length >= 1;
    }
  }, [loginMethod, loginUsername, loginEmail, loginPassword]);

  if (!isOpen) return null;

  // 1. Handle Login submission to /api/auth/login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setInfoMessage(null);

    const identifier = loginMethod === 'username' ? loginUsername.trim() : loginEmail.trim();

    if (!identifier || !loginPassword) {
      setErrorMessage(`Please enter your ${loginMethod} and password.`);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier,
          password: loginPassword
        })
      });

      const data = await response.json();

      if (response.ok && data.success && data.user) {
        if (data.token) {
          localStorage.setItem('hanuman_auth_token', data.token);
        }
        localStorage.setItem('hanuman_user', JSON.stringify(data.user));

        onLoginSuccess(data.user);
        onShowToast('success', 'Logged In Successfully', `Welcome back, @${data.user.username}!`);
        onClose();
      } else {
        setErrorMessage(data.error || 'Invalid credentials. Please verify your login details.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Network error communicating with authentication backend.');
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Handle Register submission to /api/auth/register
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setInfoMessage(null);

    if (!isRegUsernameValid) {
      setErrorMessage('Username must be 3-20 characters long and contain only letters, numbers, or underscores.');
      return;
    }

    if (!isRegEmailValid) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    if (regPassword.length < 8) {
      setErrorMessage('Password must be at least 8 characters long.');
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setErrorMessage('Passwords do not match. Please re-enter your password.');
      return;
    }

    if (!agreeTerms) {
      setErrorMessage('Please accept the Terms of Service to create your account.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: regUsername.trim().toLowerCase(),
          email: regEmail.trim().toLowerCase(),
          password: regPassword,
          name: regName.trim() || regUsername.trim()
        })
      });

      const data = await response.json();

      if (response.ok && data.success && data.user) {
        if (data.token) {
          localStorage.setItem('hanuman_auth_token', data.token);
        }
        localStorage.setItem('hanuman_user', JSON.stringify(data.user));

        onLoginSuccess(data.user);
        onShowToast('success', 'Account Created & Verified', `Welcome @${data.user.username}! ₹500 welcome credit added.`);
        onClose();
      } else {
        setErrorMessage(data.error || 'Registration failed. Please check the information provided.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Network error occurred during registration.');
    } finally {
      setIsLoading(false);
    }
  };

  // 3. Handle Forgot Password Request (/api/auth/forgot-password)
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setInfoMessage(null);

    const identifier = forgotInput.trim();
    if (!identifier) {
      setErrorMessage('Please enter your registered email address or username.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setResetEmail(data.email);
        setMaskedEmail(data.maskedEmail || data.email);
        setSimulatedCode(data.previewCode || null);
        setCodeExpiresAt(Date.now() + (data.expiresInSeconds || 900) * 1000);
        setVerificationCode(data.previewCode || '');
        setTokenVerified(false);
        setMode('verify-reset');
        onShowToast('info', 'Recovery Code Generated', `Security verification code sent to ${data.maskedEmail || data.email}`);
      } else {
        setErrorMessage(data.error || 'No registered account found with that email address or username.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to request password reset code.');
    } finally {
      setIsLoading(false);
    }
  };

  // 4. Verify Recovery Code / Token (/api/auth/verify-reset-token)
  const handleVerifyCodeOnly = async (codeToVerify?: string) => {
    const code = (codeToVerify || verificationCode).trim();
    if (!code) {
      setErrorMessage('Please enter the 6-digit verification code or token.');
      return;
    }

    setIsVerifyingToken(true);
    setErrorMessage(null);
    try {
      const response = await fetch('/api/auth/verify-reset-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tokenOrCode: code,
          email: resetEmail
        })
      });

      const data = await response.json();
      if (response.ok && data.success && data.valid) {
        setTokenVerified(true);
        setInfoMessage('Verification code verified! Please set your new password below.');
      } else {
        setTokenVerified(false);
        setErrorMessage(data.error || 'Invalid or expired verification code.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error checking verification code.');
    } finally {
      setIsVerifyingToken(false);
    }
  };

  // 5. Complete Password Reset (/api/auth/reset-password)
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setInfoMessage(null);

    const code = verificationCode.trim();
    if (!code) {
      setErrorMessage('Please provide the 6-digit recovery code or token.');
      return;
    }

    if (newPassword.length < 8) {
      setErrorMessage('New password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setErrorMessage('Passwords do not match. Please verify your entries.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tokenOrCode: code,
          email: resetEmail,
          newPassword
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        if (data.token) {
          localStorage.setItem('hanuman_auth_token', data.token);
        }
        if (data.user) {
          localStorage.setItem('hanuman_user', JSON.stringify(data.user));
          setResetSuccessUser(data.user);
        }
        setMode('reset-success');
        onShowToast('success', 'Password Updated!', 'Your new password has been securely saved.');
      } else {
        setErrorMessage(data.error || 'Failed to reset password. The code may be expired.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error communicating with reset server.');
    } finally {
      setIsLoading(false);
    }
  };

  // Quick 1-click test account fill
  const handleQuickFill = (identifier: string) => {
    if (identifier.includes('@')) {
      setLoginMethod('email');
      setLoginEmail(identifier);
    } else {
      setLoginMethod('username');
      setLoginUsername(identifier);
    }
    setLoginPassword('password123');
    setErrorMessage(null);

    fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, password: 'password123' })
    })
      .then(r => r.json())
      .then(data => {
        if (data.success && data.user) {
          if (data.token) localStorage.setItem('hanuman_auth_token', data.token);
          localStorage.setItem('hanuman_user', JSON.stringify(data.user));
          onLoginSuccess(data.user);
          onShowToast('success', 'Authenticated', `Logged in as @${data.user.username} (${data.user.role}).`);
          onClose();
        } else {
          setErrorMessage(data.error || 'Quick login failed.');
        }
      })
      .catch(() => {
        setErrorMessage('Failed to connect to authentication server.');
      });
  };

  // Copy code helper
  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
      
      <div className="relative w-full max-w-lg bg-[#0f172a] border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6 my-8">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Brand Header */}
        <div className="text-center space-y-1">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-600 text-white shadow-lg shadow-orange-500/20 mb-2">
            {mode === 'forgot-password' || mode === 'verify-reset' ? (
              <KeyRound className="w-6 h-6 text-white" />
            ) : mode === 'reset-success' ? (
              <CheckCircle2 className="w-6 h-6 text-white" />
            ) : (
              <Zap className="w-6 h-6 fill-white text-white" />
            )}
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
            {mode === 'login' && 'Sign In to Your Account'}
            {mode === 'register' && 'Create Your Reseller Account'}
            {mode === 'forgot-password' && 'Reset Your Password'}
            {mode === 'verify-reset' && 'Verify Recovery Token'}
            {mode === 'reset-success' && 'Password Successfully Reset'}
          </h2>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            {mode === 'login' && 'Enter your credentials to access your wallet, orders, and SMM API services.'}
            {mode === 'register' && 'Join the premier Indian SMM provider platform with automated API dispatch.'}
            {mode === 'forgot-password' && 'Enter your registered email address or username to receive a secure recovery code.'}
            {mode === 'verify-reset' && 'Enter the 6-digit verification code or security token sent to your email to set a new password.'}
            {mode === 'reset-success' && 'Your credentials have been securely updated. You are ready to log in.'}
          </p>
        </div>

        {/* Top Mode Switcher (Visible in Login & Register modes) */}
        {(mode === 'login' || mode === 'register') && (
          <div className="flex p-1 bg-slate-900 border border-slate-800 rounded-xl">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setErrorMessage(null);
                setInfoMessage(null);
              }}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                mode === 'login'
                  ? 'bg-orange-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Sign In (Login)
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setErrorMessage(null);
                setInfoMessage(null);
              }}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                mode === 'register'
                  ? 'bg-orange-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Create Account (Register)
            </button>
          </div>
        )}

        {/* Error Alert Display */}
        {errorMessage && (
          <div className="p-3.5 bg-rose-950/40 border border-rose-800/80 rounded-xl flex items-start gap-2.5 text-xs text-rose-300 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1 leading-relaxed">{errorMessage}</div>
          </div>
        )}

        {/* Info Alert Display */}
        {infoMessage && (
          <div className="p-3.5 bg-sky-950/40 border border-sky-800/80 rounded-xl flex items-start gap-2.5 text-xs text-sky-300 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
            <div className="flex-1 leading-relaxed">{infoMessage}</div>
          </div>
        )}

        {/* ---------------- STATE 1: LOGIN FORM ---------------- */}
        {mode === 'login' && (
          <div className="space-y-4">
            
            {/* Quick Demo Credentials */}
            <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl p-3.5 space-y-2">
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span className="uppercase tracking-wider font-semibold flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-orange-400" />
                  <span>1-Click Test Credentials</span>
                </span>
                <span className="font-mono text-slate-500">Instant fill</span>
              </div>
              <div className="grid grid-cols-1 gap-1.5">
                <button
                  type="button"
                  onClick={() => handleQuickFill('bobysagar')}
                  className="flex items-center justify-between px-3 py-2 bg-slate-800/60 hover:bg-slate-800 text-left rounded-lg text-xs transition-colors group cursor-pointer border border-slate-700/50"
                >
                  <div>
                    <span className="font-bold text-white group-hover:text-orange-400 transition-colors">Boby Sagar</span>
                    <span className="text-[11px] text-slate-400 ml-1.5 font-mono">@bobysagar</span>
                  </div>
                  <span className="text-[10px] uppercase font-bold text-orange-400 font-mono">Admin</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickFill('rohitverma')}
                  className="flex items-center justify-between px-3 py-2 bg-slate-800/60 hover:bg-slate-800 text-left rounded-lg text-xs transition-colors group cursor-pointer border border-slate-700/50"
                >
                  <div>
                    <span className="font-bold text-white group-hover:text-orange-400 transition-colors">Rohit Verma</span>
                    <span className="text-[11px] text-slate-400 ml-1.5 font-mono">@rohitverma</span>
                  </div>
                  <span className="text-[10px] uppercase font-bold text-sky-400 font-mono">Reseller</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickFill('democlient')}
                  className="flex items-center justify-between px-3 py-2 bg-slate-800/60 hover:bg-slate-800 text-left rounded-lg text-xs transition-colors group cursor-pointer border border-slate-700/50"
                >
                  <div>
                    <span className="font-bold text-white group-hover:text-orange-400 transition-colors">Demo Client</span>
                    <span className="text-[11px] text-slate-400 ml-1.5 font-mono">@democlient</span>
                  </div>
                  <span className="text-[10px] uppercase font-bold text-emerald-400 font-mono">Client</span>
                </button>
              </div>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              
              {/* Method Selector: Login with Username vs Email */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Login Identifier
                </span>
                <div className="flex items-center gap-1 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setLoginMethod('username')}
                    className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${
                      loginMethod === 'username' ? 'bg-orange-500/20 text-orange-400 font-bold' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    By Username
                  </button>
                  <span className="text-slate-600">·</span>
                  <button
                    type="button"
                    onClick={() => setLoginMethod('email')}
                    className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${
                      loginMethod === 'email' ? 'bg-orange-500/20 text-orange-400 font-bold' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    By Email
                  </button>
                </div>
              </div>

              {/* Input Field: Username */}
              {loginMethod === 'username' ? (
                <div>
                  <div className="relative">
                    <span className="text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-xs">@</span>
                    <input
                      type="text"
                      required
                      autoFocus
                      value={loginUsername}
                      onChange={(e) => setLoginUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                      placeholder="Username (e.g. bobysagar)"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 transition-colors font-mono"
                    />
                  </div>
                </div>
              ) : (
                /* Input Field: Email */
                <div>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      autoFocus
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="Email address (e.g. bobysagar761855@gmail.com)"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 transition-colors font-mono"
                    />
                  </div>
                </div>
              )}

              {/* Input Field: Password */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setForgotInput(loginMethod === 'email' ? loginEmail : (loginUsername ? `${loginUsername}@` : ''));
                      setErrorMessage(null);
                      setInfoMessage(null);
                      setMode('forgot-password');
                    }}
                    className="text-[11px] text-orange-400 hover:text-orange-300 hover:underline cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-10 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 transition-colors font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Remember Me */}
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-slate-700 bg-slate-900 text-orange-600 focus:ring-orange-500"
                  />
                  <span>Remember me on this browser</span>
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading || !isLoginValid}
                className="w-full py-3 px-4 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white font-bold rounded-xl shadow-lg shadow-orange-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer text-xs uppercase tracking-wider"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <KeyRound className="w-4 h-4" />
                    <span>Verify Credentials & Sign In</span>
                  </>
                )}
              </button>

              <div className="text-center pt-2">
                <span className="text-xs text-slate-400">
                  Don't have an account yet?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setMode('register');
                      setErrorMessage(null);
                      setInfoMessage(null);
                    }}
                    className="text-orange-400 hover:text-orange-300 font-semibold cursor-pointer underline"
                  >
                    Create Account
                  </button>
                </span>
              </div>
            </form>
          </div>
        )}

        {/* ---------------- STATE 2: REGISTER FORM ---------------- */}
        {mode === 'register' && (
          <form onSubmit={handleRegister} className="space-y-4">
            
            {/* Input Field: Username */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Username *
                </label>
                {regUsername.trim().length > 0 && (
                  <span className={`text-[10px] font-mono ${isRegUsernameValid ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {isRegUsernameValid ? '✓ Valid handle' : '3-20 chars (a-z, 0-9, _)'}
                  </span>
                )}
              </div>
              <div className="relative">
                <span className="text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-xs">@</span>
                <input
                  type="text"
                  required
                  autoFocus
                  value={regUsername}
                  onChange={(e) => setRegUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  placeholder="e.g. rahul_smm"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 transition-colors font-mono"
                />
              </div>
            </div>

            {/* Input Field: Email */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Email Address *
                </label>
                {regEmail.trim().length > 0 && (
                  <span className={`text-[10px] font-mono ${isRegEmailValid ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {isRegEmailValid ? '✓ Valid format' : 'Enter valid email'}
                  </span>
                )}
              </div>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="rahul@domain.com"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 transition-colors font-mono"
                />
              </div>
            </div>

            {/* Input Field: Password with Strength Meter */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Password *
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-10 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 transition-colors font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Password Strength Indicator */}
              {regPassword.length > 0 && (
                <div className="mt-2 space-y-1">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-slate-400">Password Strength:</span>
                    <span className="font-semibold text-slate-200">{regPasswordStrength.label}</span>
                  </div>
                  <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden flex gap-1">
                    <div className={`h-full flex-1 ${regPasswordStrength.score >= 1 ? regPasswordStrength.color : 'bg-slate-800'}`} />
                    <div className={`h-full flex-1 ${regPasswordStrength.score >= 2 ? regPasswordStrength.color : 'bg-slate-800'}`} />
                    <div className={`h-full flex-1 ${regPasswordStrength.score >= 3 ? regPasswordStrength.color : 'bg-slate-800'}`} />
                    <div className={`h-full flex-1 ${regPasswordStrength.score >= 4 ? regPasswordStrength.color : 'bg-slate-800'}`} />
                  </div>
                </div>
              )}
            </div>

            {/* Input Field: Confirm Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Confirm Password *
                </label>
                {regConfirmPassword.length > 0 && (
                  <span className={`text-[10px] font-mono ${isRegPasswordMatch ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {isRegPasswordMatch ? '✓ Passwords match' : 'Passwords do not match'}
                  </span>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={regConfirmPassword}
                  onChange={(e) => setRegConfirmPassword(e.target.value)}
                  placeholder="Repeat your password"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-10 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 transition-colors font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Optional Full Name */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Display Name (Optional)
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 transition-colors"
                />
              </div>
            </div>

            {/* Welcome Bonus Notice */}
            <div className="p-3 bg-emerald-950/40 border border-emerald-800/60 rounded-xl flex items-center gap-2 text-xs text-emerald-300">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>₹500 welcome credit automatically funded upon registration.</span>
            </div>

            {/* Terms checkbox */}
            <label className="flex items-start gap-2 text-xs text-slate-400 cursor-pointer select-none">
              <input
                type="checkbox"
                required
                checked={agreeTerms}
                onChange={(e) => setAgreeTerms(e.target.checked)}
                className="rounded border-slate-700 bg-slate-900 text-orange-600 focus:ring-orange-500 mt-0.5"
              />
              <span>
                I agree to the <span className="text-slate-300 underline">Terms of Service</span> and understand all orders are automated.
              </span>
            </label>

            {/* Register Submit Button */}
            <button
              type="submit"
              disabled={isLoading || !isRegUsernameValid || !isRegEmailValid || regPassword.length < 8 || !isRegPasswordMatch || !agreeTerms}
              className="w-full py-3 px-4 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white font-bold rounded-xl shadow-lg shadow-orange-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer text-xs uppercase tracking-wider"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Create Account & Claim ₹500</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <div className="text-center pt-2">
              <span className="text-xs text-slate-400">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setErrorMessage(null);
                    setInfoMessage(null);
                  }}
                  className="text-orange-400 hover:text-orange-300 font-semibold cursor-pointer underline"
                >
                  Sign In here
                </button>
              </span>
            </div>
          </form>
        )}

        {/* ---------------- STATE 3: FORGOT PASSWORD REQUEST ---------------- */}
        {mode === 'forgot-password' && (
          <form onSubmit={handleForgotPassword} className="space-y-4">
            
            {/* Quick Email Selection from Known Test Accounts */}
            <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl p-3 space-y-2">
              <div className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-orange-400" />
                <span>Select Registered User Account</span>
              </div>
              <div className="grid grid-cols-1 gap-1.5">
                <button
                  type="button"
                  onClick={() => setForgotInput('bobysagar761855@gmail.com')}
                  className="flex items-center justify-between px-3 py-1.5 bg-slate-800/60 hover:bg-slate-800 text-left rounded-lg text-xs transition-colors cursor-pointer border border-slate-700/50"
                >
                  <span className="text-white font-mono text-[11px]">bobysagar761855@gmail.com</span>
                  <span className="text-[10px] text-orange-400 font-bold uppercase">Admin</span>
                </button>
                <button
                  type="button"
                  onClick={() => setForgotInput('rohit@smmreseller.in')}
                  className="flex items-center justify-between px-3 py-1.5 bg-slate-800/60 hover:bg-slate-800 text-left rounded-lg text-xs transition-colors cursor-pointer border border-slate-700/50"
                >
                  <span className="text-white font-mono text-[11px]">rohit@smmreseller.in</span>
                  <span className="text-[10px] text-sky-400 font-bold uppercase">Reseller</span>
                </button>
                <button
                  type="button"
                  onClick={() => setForgotInput('demo@client.com')}
                  className="flex items-center justify-between px-3 py-1.5 bg-slate-800/60 hover:bg-slate-800 text-left rounded-lg text-xs transition-colors cursor-pointer border border-slate-700/50"
                >
                  <span className="text-white font-mono text-[11px]">demo@client.com</span>
                  <span className="text-[10px] text-emerald-400 font-bold uppercase">Client</span>
                </button>
              </div>
            </div>

            {/* Registered Identifier Field */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Registered Email or Username *
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  autoFocus
                  value={forgotInput}
                  onChange={(e) => setForgotInput(e.target.value)}
                  placeholder="Enter email or username (e.g. bobysagar761855@gmail.com)"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 transition-colors font-mono"
                />
              </div>
            </div>

            {/* Information Notice */}
            <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl flex items-start gap-2.5 text-xs text-slate-400">
              <ShieldCheck className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
              <span>
                We will dispatch a secure 6-digit recovery code and authorization token to your email inbox (valid for 15 minutes).
              </span>
            </div>

            {/* Submit Request Button */}
            <button
              type="submit"
              disabled={isLoading || !forgotInput.trim()}
              className="w-full py-3 px-4 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white font-bold rounded-xl shadow-lg shadow-orange-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer text-xs uppercase tracking-wider"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Mail className="w-4 h-4" />
                  <span>Send Password Recovery Code</span>
                </>
              )}
            </button>

            {/* Back to Sign In */}
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setErrorMessage(null);
                  setInfoMessage(null);
                }}
                className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Return to Sign In</span>
              </button>
            </div>
          </form>
        )}

        {/* ---------------- STATE 4: TOKEN-BASED VERIFICATION SCREEN ---------------- */}
        {mode === 'verify-reset' && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            
            {/* Recipient Email & Expiration Header */}
            <div className="flex items-center justify-between p-3 bg-slate-900 border border-slate-800 rounded-xl">
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">Code Sent To</span>
                <span className="text-xs font-mono font-bold text-white">{maskedEmail || resetEmail}</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-500 uppercase font-semibold flex items-center justify-end gap-1">
                  <Clock className="w-3 h-3 text-orange-400" />
                  <span>Expires In</span>
                </span>
                <span className={`text-xs font-mono font-bold ${timeLeft === 'Expired' ? 'text-rose-400' : 'text-orange-400'}`}>
                  {timeLeft}
                </span>
              </div>
            </div>

            {/* Simulated Live Inbox Banner (Instant 1-Click Fill for effortless testing) */}
            {simulatedCode && (
              <div className="p-3.5 bg-gradient-to-r from-orange-950/40 via-amber-950/30 to-slate-900 border border-orange-500/40 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-orange-300">
                    <Mail className="w-3.5 h-3.5 text-orange-400" />
                    <span>Simulated Email Inbox Dispatch</span>
                  </div>
                  <span className="text-[10px] bg-orange-500/20 text-orange-300 px-2 py-0.5 rounded font-mono">
                    Live Simulation
                  </span>
                </div>
                <div className="flex items-center justify-between bg-black/40 px-3 py-2 rounded-lg border border-orange-500/20">
                  <div>
                    <span className="text-[11px] text-slate-400 mr-2">Your 6-Digit Code:</span>
                    <span className="font-mono text-base font-extrabold text-orange-400 tracking-widest">{simulatedCode}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleCopyCode(simulatedCode)}
                      className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] rounded flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      {copiedCode ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedCode ? 'Copied' : 'Copy'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setVerificationCode(simulatedCode);
                        handleVerifyCodeOnly(simulatedCode);
                      }}
                      className="px-2 py-1 bg-orange-600 hover:bg-orange-500 text-white text-[11px] font-bold rounded cursor-pointer transition-colors"
                    >
                      Auto-fill
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Verification Code Input */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  6-Digit Recovery Code or Token *
                </label>
                {tokenVerified ? (
                  <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Code Verified</span>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleVerifyCodeOnly()}
                    disabled={isVerifyingToken || !verificationCode.trim()}
                    className="text-[11px] text-orange-400 hover:text-orange-300 underline cursor-pointer disabled:opacity-40"
                  >
                    {isVerifyingToken ? 'Verifying...' : 'Validate Code'}
                  </button>
                )}
              </div>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  autoFocus
                  maxLength={64}
                  value={verificationCode}
                  onChange={(e) => {
                    const val = e.target.value.trim();
                    setVerificationCode(val);
                    setTokenVerified(false);
                    // If user enters 6 digits, auto verify
                    if (val.length === 6 && /^\d{6}$/.test(val)) {
                      handleVerifyCodeOnly(val);
                    }
                  }}
                  placeholder="e.g. 867439 or security token"
                  className={`w-full bg-slate-900 border rounded-xl pl-10 pr-10 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none transition-colors font-mono tracking-wider ${
                    tokenVerified ? 'border-emerald-500' : 'border-slate-700 focus:border-orange-500'
                  }`}
                />
                {tokenVerified && (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                )}
              </div>
            </div>

            {/* Input Field: New Password with Strength Meter */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                New Password *
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-10 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 transition-colors font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Password Strength Indicator */}
              {newPassword.length > 0 && (
                <div className="mt-2 space-y-1">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-slate-400">Password Strength:</span>
                    <span className="font-semibold text-slate-200">{newPasswordStrength.label}</span>
                  </div>
                  <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden flex gap-1">
                    <div className={`h-full flex-1 ${newPasswordStrength.score >= 1 ? newPasswordStrength.color : 'bg-slate-800'}`} />
                    <div className={`h-full flex-1 ${newPasswordStrength.score >= 2 ? newPasswordStrength.color : 'bg-slate-800'}`} />
                    <div className={`h-full flex-1 ${newPasswordStrength.score >= 3 ? newPasswordStrength.color : 'bg-slate-800'}`} />
                    <div className={`h-full flex-1 ${newPasswordStrength.score >= 4 ? newPasswordStrength.color : 'bg-slate-800'}`} />
                  </div>
                </div>
              )}
            </div>

            {/* Input Field: Confirm New Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Confirm New Password *
                </label>
                {confirmNewPassword.length > 0 && (
                  <span className={`text-[10px] font-mono ${isNewPasswordMatch ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {isNewPasswordMatch ? '✓ Passwords match' : 'Passwords do not match'}
                  </span>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showConfirmNewPassword ? 'text' : 'password'}
                  required
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  placeholder="Repeat your new password"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-10 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 transition-colors font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  {showConfirmNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit New Password Button */}
            <button
              type="submit"
              disabled={isLoading || !verificationCode.trim() || newPassword.length < 8 || !isNewPasswordMatch || timeLeft === 'Expired'}
              className="w-full py-3 px-4 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white font-bold rounded-xl shadow-lg shadow-orange-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer text-xs uppercase tracking-wider"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Verify Token & Save New Password</span>
                </>
              )}
            </button>

            {/* Actions: Resend Code and Back to Login */}
            <div className="flex items-center justify-between pt-2 text-xs">
              <button
                type="button"
                onClick={() => {
                  setMode('forgot-password');
                  setErrorMessage(null);
                  setInfoMessage(null);
                }}
                className="text-slate-400 hover:text-white inline-flex items-center gap-1 cursor-pointer transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Change Email</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setForgotInput(resetEmail);
                  handleForgotPassword(new Event('submit') as any);
                }}
                className="text-orange-400 hover:text-orange-300 inline-flex items-center gap-1 cursor-pointer transition-colors"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Resend Code</span>
              </button>
            </div>
          </form>
        )}

        {/* ---------------- STATE 5: RESET SUCCESS SCREEN ---------------- */}
        {mode === 'reset-success' && (
          <div className="space-y-5 text-center py-2 animate-in fade-in">
            <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-500/40">
              <Check className="w-8 h-8 stroke-[3]" />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-bold text-white">Security Update Complete</h3>
              <p className="text-xs text-slate-300 max-w-sm mx-auto leading-relaxed">
                Your password has been securely updated and encrypted with PBKDF2-SHA512. Previous sessions have been revoked.
              </p>
            </div>

            <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl text-left text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-400">Account:</span>
                <span className="font-mono text-white font-bold">{resetEmail}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Protection Status:</span>
                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> Active & Protected
                </span>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              {resetSuccessUser ? (
                <button
                  type="button"
                  onClick={() => {
                    onLoginSuccess(resetSuccessUser);
                    onShowToast('success', 'Logged In', `Welcome back, @${resetSuccessUser.username}!`);
                    onClose();
                  }}
                  className="w-full py-3 px-4 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl shadow-lg shadow-orange-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer text-xs uppercase tracking-wider"
                >
                  <span>Continue to Dashboard as @{resetSuccessUser.username}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setErrorMessage(null);
                    setInfoMessage(null);
                  }}
                  className="w-full py-3 px-4 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl shadow-lg shadow-orange-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer text-xs uppercase tracking-wider"
                >
                  <KeyRound className="w-4 h-4" />
                  <span>Sign In with Your New Password</span>
                </button>
              )}
            </div>
          </div>
        )}

      </div>

    </div>
  );
};
