import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';
import { authService } from '../services/auth.service';
import { Shield, Lock, User, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export const Login: React.FC = () => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier || !password) {
      setErrorMsg('Please fill in all credentials.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const response = await authService.login({ identifier, password });
      if (response.code === 1000 && response.result) {
        const { token, refreshToken, user } = response.result;
        setAuth(token, refreshToken, user);
        toast.success('Successfully authenticated as Administrator');
        navigate('/');
      } else {
        setErrorMsg(response.message || 'Authentication failed.');
      }
    } catch (err: unknown) {
      console.error(err);
      setErrorMsg('Invalid username, email, phone or password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative gradients */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-[#005ab3]/15 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-600/10 blur-[120px] pointer-events-none" />

      {/* Main Login Card */}
      <div className="w-full max-w-md bg-[#0d1628]/40 border border-slate-800/80 backdrop-blur-xl rounded-3xl p-8 shadow-2xl relative">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-[#005ab3] flex items-center justify-center text-white mb-4 shadow-lg shadow-[#005ab3]/20">
            <Shield size={24} className="stroke-[2.5]" />
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight font-outfit text-center">
            Admin Control Center
          </h1>
          <p className="text-sm text-slate-400 mt-1.5 text-center">
            Sign in to access platform oversight dashboard
          </p>
        </div>

        {errorMsg && (
          <div className="mb-6 p-4 rounded-2xl bg-red-950/30 border border-red-800/40 text-red-300 text-xs flex gap-2.5 items-start">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 block">
              Username or Email
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
                <User size={16} />
              </span>
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="w-full bg-slate-900/60 border border-slate-800 focus:border-[#005ab3] focus:ring-1 focus:ring-[#005ab3] rounded-2xl py-3 pl-11 pr-4 text-sm text-white placeholder-slate-500 outline-none transition-all duration-150"
                placeholder="admin"
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 block">
              Password
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
                <Lock size={16} />
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-900/60 border border-slate-800 focus:border-[#005ab3] focus:ring-1 focus:ring-[#005ab3] rounded-2xl py-3 pl-11 pr-4 text-sm text-white placeholder-slate-500 outline-none transition-all duration-150"
                placeholder="••••••••"
                disabled={isLoading}
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-[#005ab3] hover:bg-[#0062c4] active:bg-[#004e9c] disabled:bg-[#005ab3]/50 text-white rounded-2xl py-3 font-semibold text-sm shadow-lg shadow-[#005ab3]/10 flex items-center justify-center gap-2 transition-all duration-150 mt-2"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Authenticating...</span>
              </>
            ) : (
              <span>Sign In to Dashboard</span>
            )}
          </button>
        </form>

        <div className="mt-8 text-center border-t border-slate-900 pt-6">
          <p className="text-[11px] text-slate-500">
            Internal Platform Operations. Unauthorized access attempts will be logged.
          </p>
        </div>
      </div>
    </div>
  );
};
