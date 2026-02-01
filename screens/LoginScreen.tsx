
import React, { useState, useEffect } from 'react';
import { Music4, User, Lock, ArrowRight, AlertCircle, Eye, EyeOff, Loader2, Database, Wifi } from 'lucide-react';
import { checkSystemHealth } from '../services/googleService';

interface Props {
  onLogin: (user: any) => void;
}

export const LoginScreen: React.FC<Props> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [dbStatus, setDbStatus] = useState<{connected: boolean, message: string} | null>(null);

  useEffect(() => {
      const checkDb = async () => {
          try {
              const status = await checkSystemHealth();
              setDbStatus({
                  connected: status.database.connected,
                  message: status.database.connected ? 'Database Online' : 'Database Offline'
              });
          } catch (e) {
              setDbStatus({ connected: false, message: 'Server Unreachable' });
          }
      };
      checkDb();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            localStorage.setItem('cms_token', data.token);
            onLogin(data.user);
        } else {
            setError(data.error || 'Login gagal.');
        }
    } catch (err) {
        setError('Terjadi kesalahan koneksi server.');
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-blue-100 p-4 relative">
      
      {/* Database Status Indicator */}
      <div className="absolute top-6 right-6 flex items-center gap-2 px-4 py-2 bg-white/90 backdrop-blur-md rounded-full shadow-sm border border-slate-100 text-xs font-bold transition-all hover:shadow-md cursor-default">
          {dbStatus === null ? (
              <>
                  <Loader2 size={14} className="animate-spin text-slate-400" />
                  <span className="text-slate-500">Checking System...</span>
              </>
          ) : dbStatus.connected ? (
              <>
                  <div className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                  </div>
                  <span className="text-green-700 flex items-center gap-1.5">
                      <Database size={14} /> 
                      Online Database
                  </span>
              </>
          ) : (
              <>
                  <div className="w-2 h-2 rounded-full bg-red-500"></div>
                  <span className="text-red-600 flex items-center gap-1.5">
                      <Wifi size={14} className="text-red-500" />
                      {dbStatus.message}
                  </span>
              </>
          )}
      </div>

      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl shadow-blue-900/10 border border-white p-8 md:p-10 animate-fade-in-up">
        
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-2xl flex items-center justify-center text-white mx-auto mb-4 shadow-lg shadow-blue-500/30">
            <Music4 size={32} />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Dimensi Suara CMS</h1>
          <p className="text-slate-500 text-sm mt-1">Sign in to manage your music distribution</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          {error && (
            <div className="bg-red-50 text-red-600 text-sm p-4 rounded-xl flex items-center gap-2 border border-red-100 animate-pulse">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 ml-1">Username</label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
                <User size={18} />
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-medium text-slate-700 placeholder:text-slate-400"
                placeholder="Enter username"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 ml-1">Password</label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
                <Lock size={18} />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-11 pr-12 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-medium text-slate-700 placeholder:text-slate-400"
                placeholder="Enter password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full py-4 rounded-xl font-bold text-white shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 transition-all transform active:scale-95
              ${isLoading 
                ? 'bg-slate-300 cursor-not-allowed' 
                : 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:brightness-110 hover:-translate-y-1'
              }`}
          >
            {isLoading ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                Signing In...
              </>
            ) : (
              <>
                Sign In
                <ArrowRight size={20} />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-xs text-slate-400">
            Protected CMS Area. Authorized personnel only.
          </p>
        </div>
      </div>
    </div>
  );
};
