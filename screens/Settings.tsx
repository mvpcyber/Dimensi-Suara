
import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Plus, Trash2, Globe, Activity, CheckCircle, XCircle, Loader2, AlertTriangle, RefreshCw, Copy, ExternalLink, HelpCircle, LogIn, ShieldCheck } from 'lucide-react';
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
  const [isDriveConnected, setIsDriveConnected] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('google_drive_token');
    setIsDriveConnected(!!token);
    runHealthCheck();
  }, []);

  const runHealthCheck = async () => {
    setIsChecking(true);
    setErrorMessage(null);
    try {
        const status = await checkSystemHealth();
        setHealthStatus(status);
    } catch (err: any) {
        setErrorMessage(`Error: ${err.message}.`);
    } finally {
        setIsChecking(false);
    }
  };

  const handleGoogleDriveAuth = () => {
    if (!(window as any).google) {
        alert("Google Library belum dimuat. Periksa koneksi internet.");
        return;
    }

    const client = (window as any).google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CONFIG.CLIENT_ID,
        scope: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.metadata.readonly',
        callback: (response: any) => {
            if (response.access_token) {
                localStorage.setItem('google_drive_token', response.access_token);
                setIsDriveConnected(true);
                runHealthCheck();
                alert("Berhasil terhubung ke Google Drive Anda!");
            }
        },
    });
    client.requestAccessToken();
  };

  const disconnectDrive = () => {
      localStorage.removeItem('google_drive_token');
      setIsDriveConnected(false);
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
                    Settings
                </h1>
                <p className="text-slate-500 mt-1">Konfigurasi penyimpanan dan status server.</p>
            </div>
            <button 
                onClick={runHealthCheck}
                disabled={isChecking}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-slate-600 font-bold text-sm hover:bg-slate-50 transition-all shadow-sm"
            >
                {isChecking ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                Refresh Status
            </button>
       </div>

       <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
                {/* Google Drive Auth Card */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                    <div className="flex items-center gap-3 mb-4">
                        <Globe className="text-blue-500" size={24} />
                        <h2 className="text-xl font-bold text-slate-800">Penyimpanan Google Drive</h2>
                    </div>
                    <p className="text-sm text-slate-500 mb-6">
                        Hubungkan akun Google Anda untuk melewati batasan kuota Service Account. File akan diunggah langsung ke Drive Anda.
                    </p>
                    
                    {isDriveConnected ? (
                        <div className="flex flex-col sm:flex-row items-center gap-4 p-4 bg-green-50 border border-green-200 rounded-2xl">
                            <div className="w-12 h-12 bg-green-500 text-white rounded-full flex items-center justify-center shadow-lg shadow-green-200">
                                <ShieldCheck size={24} />
                            </div>
                            <div className="flex-1 text-center sm:text-left">
                                <h4 className="font-bold text-green-800">Akun Terhubung</h4>
                                <p className="text-xs text-green-600">Aplikasi siap mengunggah file ke kapasitas 2 TB Anda.</p>
                            </div>
                            <button 
                                onClick={disconnectDrive}
                                className="px-4 py-2 bg-white text-red-500 border border-red-200 rounded-xl text-xs font-bold hover:bg-red-50 transition-colors"
                            >
                                Putuskan
                            </button>
                        </div>
                    ) : (
                        <button 
                            onClick={handleGoogleDriveAuth}
                            className="w-full sm:w-auto flex items-center justify-center gap-3 px-8 py-4 bg-blue-600 text-white font-bold rounded-2xl shadow-xl shadow-blue-500/30 hover:bg-blue-700 hover:-translate-y-1 transition-all"
                        >
                            <LogIn size={20} />
                            Hubungkan Google Drive
                        </button>
                    )}
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                    <div className="flex items-center gap-3 mb-6">
                        <Activity className="text-blue-500" size={24} />
                        <h2 className="text-xl font-bold text-slate-800">System Health Status</h2>
                    </div>

                    <div className="space-y-6">
                        <div className="flex items-start gap-4 p-4 rounded-xl border bg-slate-50/50">
                            {healthStatus?.database.connected ? (
                                <CheckCircle className="text-green-500 mt-1" size={20} />
                            ) : (
                                <XCircle className="text-red-500 mt-1" size={20} />
                            )}
                            <div className="flex-1">
                                <h4 className="font-bold text-slate-700 text-sm">MySQL Database</h4>
                                <p className="text-xs text-slate-500 mt-1">{healthStatus?.database.message || 'Mengecek...'}</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-4 p-4 rounded-xl border bg-slate-50/50">
                            {healthStatus?.googleDrive.connected ? (
                                <CheckCircle className="text-green-500 mt-1" size={20} />
                            ) : (
                                <XCircle className="text-red-500 mt-1" size={20} />
                            )}
                            <div className="flex-1">
                                <h4 className="font-bold text-slate-700 text-sm">Google Drive Access</h4>
                                <p className={`text-xs mt-1 ${healthStatus?.googleDrive.connected ? 'text-slate-500' : 'text-red-500 font-bold'}`}>
                                    {healthStatus?.googleDrive.message || 'Penyimpanan Belum Terhubung'}
                                </p>
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
                        <input 
                            value={newAgg}
                            onChange={(e) => setNewAgg(e.target.value)}
                            placeholder="Add aggregator..."
                            className="flex-1 px-4 py-2 border border-gray-200 rounded-xl outline-none text-sm"
                        />
                        <button onClick={handleAdd} className="p-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700">
                            <Plus size={20} />
                        </button>
                    </div>
                    <div className="bg-slate-50 rounded-xl border border-gray-200 overflow-hidden max-h-64 overflow-y-auto no-scrollbar">
                        <ul className="divide-y divide-gray-200">
                            {aggregators.map((agg, idx) => (
                                <li key={idx} className="px-4 py-3 flex justify-between items-center bg-white">
                                    <span className="text-sm font-medium text-slate-700">{agg}</span>
                                    <button onClick={() => handleRemove(idx)} className="p-1.5 text-slate-400 hover:text-red-500">
                                        <Trash2 size={16} />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>
       </div>
    </div>
  );
};
