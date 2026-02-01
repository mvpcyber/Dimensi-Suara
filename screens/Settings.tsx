
import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Plus, Trash2, Globe, Activity, CheckCircle, XCircle, Loader2, AlertTriangle, RefreshCw, Copy, ExternalLink, HelpCircle, LogIn, LogOut } from 'lucide-react';
import { checkSystemHealth } from '../services/googleService';
import { GOOGLE_CONFIG } from '../constants';

interface Props {
  aggregators: string[];
  setAggregators: (list: string[]) => void;
}

export const Settings: React.FC<Props> = ({ aggregators, setAggregators }) => {
  const [newAgg, setNewAgg] = useState('');
  const [healthStatus, setHealthStatus] = useState<any>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const [googleToken, setGoogleToken] = useState<string | null>(localStorage.getItem('google_access_token'));

  const runHealthCheck = async () => {
    setIsChecking(true);
    setErrorMessage(null);
    try {
        const status = await checkSystemHealth();
        setHealthStatus(status);
    } catch (err: any) {
        setErrorMessage(`Error: ${err.message}`);
    } finally {
        setIsChecking(false);
    }
  };

  useEffect(() => {
    runHealthCheck();
  }, []);

  const handleGoogleLogin = () => {
    const client = (window as any).google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CONFIG.CLIENT_ID,
      scope: 'https://www.googleapis.com/auth/drive.file',
      callback: (response: any) => {
        if (response.access_token) {
          localStorage.setItem('google_access_token', response.access_token);
          setGoogleToken(response.access_token);
          runHealthCheck();
          alert("Login Google Berhasil!");
        }
      },
    });
    client.requestAccessToken();
  };

  const handleGoogleLogout = () => {
    localStorage.removeItem('google_access_token');
    setGoogleToken(null);
    runHealthCheck();
  };

  const handleAdd = () => {
    if (newAgg.trim()) {
        setAggregators([...aggregators, newAgg.trim()]);
        setNewAgg('');
    }
  };

  const handleRemove = (index: number) => {
    const newList = aggregators.filter((_, i) => i !== index);
    setAggregators(newList);
  };

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto min-h-screen">
       <div className="mb-8 border-b border-gray-200 pb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
                <h1 className="text-3xl font-bold text-slate-800 tracking-tight flex items-center gap-3">
                    <SettingsIcon size={32} className="text-slate-400" />
                    Pengaturan Sistem
                </h1>
                <p className="text-slate-500 mt-1">Kelola koneksi Google dan database.</p>
            </div>
            <div className="flex gap-2">
                {!googleToken ? (
                    <button 
                        onClick={handleGoogleLogin}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 shadow-md transition-all"
                    >
                        <LogIn size={16} /> Login Google
                    </button>
                ) : (
                    <button 
                        onClick={handleGoogleLogout}
                        className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-xl font-bold text-sm hover:bg-red-100 transition-all"
                    >
                        <LogOut size={16} /> Logout Google
                    </button>
                )}
                <button 
                    onClick={runHealthCheck}
                    disabled={isChecking}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-slate-600 font-bold text-sm hover:bg-slate-50 transition-all shadow-sm"
                >
                    {isChecking ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                    Refresh
                </button>
            </div>
       </div>

       <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                    <div className="flex items-center gap-3 mb-6">
                        <Activity className="text-blue-500" size={24} />
                        <h2 className="text-xl font-bold text-slate-800">Status Koneksi</h2>
                    </div>

                    <div className="space-y-4">
                        <div className="p-4 rounded-xl border bg-slate-50/50 flex items-center gap-4">
                            {googleToken ? <CheckCircle className="text-green-500" /> : <XCircle className="text-slate-300" />}
                            <div>
                                <h4 className="font-bold text-sm">Google User Auth</h4>
                                <p className="text-xs text-slate-500">{googleToken ? 'Berhasil Login' : 'Klik Login Google di atas'}</p>
                            </div>
                        </div>

                        <div className="p-4 rounded-xl border bg-slate-50/50 flex items-center gap-4">
                             {healthStatus?.database.connected ? <CheckCircle className="text-green-500" /> : <XCircle className="text-red-500" />}
                             <div>
                                <h4 className="font-bold text-sm">Database MySQL</h4>
                                <p className="text-xs text-slate-500">{healthStatus?.database.message || 'Connecting...'}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                <div className="flex items-center gap-3 mb-6">
                    <Globe className="text-purple-500" size={24} />
                    <h2 className="text-xl font-bold text-slate-800">Aggregators</h2>
                </div>
                <div className="space-y-4">
                    <div className="flex gap-2">
                        <input value={newAgg} onChange={(e) => setNewAgg(e.target.value)} className="flex-1 px-4 py-2 border rounded-xl" />
                        <button onClick={handleAdd} className="p-2.5 bg-blue-600 text-white rounded-xl"><Plus size={20} /></button>
                    </div>
                    <ul className="divide-y border rounded-xl overflow-hidden">
                        {aggregators.map((agg, idx) => (
                            <li key={idx} className="px-4 py-2 flex justify-between items-center bg-white">
                                <span className="text-sm">{agg}</span>
                                <button onClick={() => handleRemove(idx)} className="text-red-500"><Trash2 size={16} /></button>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
       </div>
    </div>
  );
};
