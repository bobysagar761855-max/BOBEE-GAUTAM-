import React, { useState } from 'react';
import { Key, Eye, EyeOff, Copy, Check, Terminal, Globe, RefreshCw, Zap } from 'lucide-react';

interface ApiSettingsViewProps {
  onShowToast: (type: 'success' | 'error' | 'warning' | 'info', title: string, message?: string) => void;
  onRefreshBalance: () => void;
}

export const ApiSettingsView: React.FC<ApiSettingsViewProps> = ({ onShowToast, onRefreshBalance }) => {
  const [apiKey, setApiKey] = useState('2058d47f3d4169e18b08bfbd5bcdaba83eae0da6');
  const [showKey, setShowKey] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedCurl, setCopiedCurl] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ status: string; latency?: number; message?: string } | null>(null);

  const handleCopyKey = () => {
    navigator.clipboard.writeText(apiKey);
    setCopiedKey(true);
    onShowToast('info', 'Key Copied', 'API Key copied to clipboard.');
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    const start = performance.now();

    try {
      const res = await fetch('/api/balance');
      const data = await res.json();
      const latency = Math.round(performance.now() - start);

      if (data.status === 'online') {
        setTestResult({
          status: 'success',
          latency,
          message: `Connected successfully! Balance: ₹${data.balance} ${data.currency}`
        });
        onRefreshBalance();
        onShowToast('success', 'Connection Healthy', `Response received in ${latency}ms.`);
      } else {
        setTestResult({
          status: 'warning',
          latency,
          message: data.error || 'Provider connection active with cached fallback.'
        });
      }
    } catch (err: any) {
      setTestResult({
        status: 'error',
        message: err.message || 'Connection failed'
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: apiKey.trim() })
      });
      const data = await res.json();
      if (data.success) {
        onShowToast('success', 'Settings Saved', 'HanumanSMM API configuration updated.');
        handleTestConnection();
      }
    } catch {
      onShowToast('error', 'Error', 'Failed to update settings.');
    }
  };

  const curlExample = `curl -X POST https://hanumansmm.in/api/v2 \\
  -d "key=${apiKey}" \\
  -d "action=add" \\
  -d "service=2973" \\
  -d "link=https://instagram.com/p/..." \\
  -d "quantity=1000"`;

  const pythonExample = `import requests

url = "https://hanumansmm.in/api/v2"
payload = {
    "key": "${apiKey}",
    "action": "add",
    "service": 2973,
    "link": "https://instagram.com/p/...",
    "quantity": 1000
}

response = requests.post(url, data=payload)
print(response.json()) # Returns: {"order": 123456}`;

  return (
    <div className="space-y-8">
      
      {/* Title */}
      <div className="pb-4 border-b border-slate-800">
        <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
          API Integration & Credentials
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Manage your HanumanSMM master credentials and inspect Standard SMM v2 protocol documentation.
        </p>
      </div>

      {/* API Key Configuration Form */}
      <div className="bg-[#0f172a]/70 rounded-2xl border border-slate-800 p-6 sm:p-8 backdrop-blur-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Key className="w-5 h-5 text-orange-500" />
              <span>Provider Credentials</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Your API key is securely handled by the backend server and never leaked to browser network traffic.
            </p>
          </div>

          <button
            onClick={handleTestConnection}
            disabled={isTesting}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-colors cursor-pointer disabled:opacity-50 self-start sm:self-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin text-orange-400' : ''}`} />
            <span>Test Connection</span>
          </button>
        </div>

        {testResult && (
          <div
            className={`p-4 rounded-xl border text-xs flex items-center justify-between gap-4 ${
              testResult.status === 'success'
                ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
                : testResult.status === 'warning'
                ? 'bg-amber-950/40 border-amber-800/60 text-amber-300'
                : 'bg-rose-950/40 border-rose-800/60 text-rose-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 shrink-0" />
              <span>{testResult.message}</span>
            </div>
            {testResult.latency !== undefined && (
              <span className="font-mono text-[11px] tabular-nums">
                Latency: {testResult.latency}ms
              </span>
            )}
          </div>
        )}

        <form onSubmit={handleSaveConfig} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-300 tracking-wider mb-2">
              Provider Endpoint URL
            </label>
            <div className="relative">
              <Globe className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                readOnly
                value="https://hanumansmm.in/api/v2"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-300 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-300 tracking-wider mb-2">
              HanumanSMM API Key
            </label>
            <div className="relative flex items-center">
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-slate-100 font-mono pr-24 focus:outline-none focus:border-orange-500 transition-colors"
              />
              <div className="absolute right-2 flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="p-1.5 text-slate-400 hover:text-slate-200 transition-colors"
                  title={showKey ? 'Hide key' : 'Show key'}
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                <button
                  type="button"
                  onClick={handleCopyKey}
                  className="p-1.5 text-slate-400 hover:text-slate-200 transition-colors"
                  title="Copy Key"
                >
                  {copiedKey ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="px-5 py-2.5 text-xs font-bold text-white bg-orange-600 hover:bg-orange-500 rounded-xl transition-colors cursor-pointer shadow-sm"
          >
            Update Configuration
          </button>
        </form>
      </div>

      {/* SMM API v2 Developer Reference */}
      <div className="bg-[#0f172a]/70 rounded-2xl border border-slate-800 p-6 sm:p-8 backdrop-blur-sm space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Terminal className="w-5 h-5 text-sky-400" />
            <span>Standard SMM v2 Protocol Reference</span>
          </h2>
          <button
            onClick={() => {
              navigator.clipboard.writeText(curlExample);
              setCopiedCurl(true);
              onShowToast('info', 'cURL Copied', 'Example copied to clipboard.');
              setTimeout(() => setCopiedCurl(false), 2000);
            }}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
          >
            {copiedCurl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>Copy cURL</span>
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <span className="text-xs font-semibold text-slate-300 block mb-1">Place Order (cURL)</span>
            <pre className="p-4 bg-slate-900 border border-slate-800 rounded-xl text-xs font-mono text-slate-300 overflow-x-auto leading-relaxed">
              {curlExample}
            </pre>
          </div>

          <div>
            <span className="text-xs font-semibold text-slate-300 block mb-1">Python Integration</span>
            <pre className="p-4 bg-slate-900 border border-slate-800 rounded-xl text-xs font-mono text-slate-300 overflow-x-auto leading-relaxed">
              {pythonExample}
            </pre>
          </div>
        </div>
      </div>

    </div>
  );
};
