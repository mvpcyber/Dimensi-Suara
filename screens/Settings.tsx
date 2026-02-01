
import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Plus, Trash2, Globe, Activity, CheckCircle, XCircle, Loader2, AlertTriangle, RefreshCw, Copy } from 'lucide-react';
import { checkSystemHealth } from '../services/googleService';

interface Props {
  aggregators: string[];
  setAggregators: (list: string[]) => void;
}

export const Settings: React.FC<Props> = ({ aggregators, setAggregators }) => {
  const [newAgg, setNewAgg] = useState('');
  const [healthStatus, setHealthStatus] = useState<any>(null);
  const [isChecking, setIsChecking] = useState(false);

  const runHealthCheck = async () => {
    setIsChecking(true);
    try {
        const status = await checkSystemHealth();
        setHealthStatus(status);
    } catch (err) {
        console.error(err);
    } finally {
        setIsChecking(false);
    }
  };

  useEffect(() => {
    runHealthCheck();
  }, []);

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

  const copyToClipboard = (text: string) => {
      navigator.clipboard.writeText(text);
      alert("Email disalin!");
  };

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto min-h-screen">
       <div className="mb-8 border-b border-gray-200 pb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
                <h1 className="text-3xl font-bold text-slate-800 tracking-tight flex items-center gap-3">
                    <SettingsIcon size={32} className="text-slate-400" />
                    Settings
                </h1>
                <p className="text-slate-500 mt-1">Konfigurasi parameter CMS dan status sistem.</p>
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
            {/* SYSTEM HEALTH PANEL */}
            <div className="lg:col-span-2 space-y-8">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                    <div className="flex items-center gap-3 mb-6">
                        <Activity className="text-blue-500" size={24} />
                        <h2 className="text-xl font-bold text-slate-800">System Health Status</h2>
                    </div>

                    <div className="space-y-6">
                        {/* MySQL Status */}
                        <div className="flex items-start gap-4 p-4 rounded-xl border bg-slate-50/50">
                            {healthStatus?.database.connected ? (
                                <CheckCircle className="text-green-500 mt-1" size={20} />
                            ) : (
                                <XCircle className="text-red-500 mt-1" size={20} />
                            )}
                            <div className="flex-1">
                                <h4 className="font-bold text-slate-700 text-sm">MySQL Database</h4>
                                <p className="text-xs text-slate-500 mt-1">{healthStatus?.database.message || 'Mengecek status...'}</p>
                            </div>
                        </div>

                        {/* Google Drive Status */}
                        <div className="flex items-start gap-4 p-4 rounded-xl border bg-slate-50/50">
                            {healthStatus?.googleDrive.connected ? (
                                <CheckCircle className="text-green-500 mt-1" size={20} />
                            ) : (
                                <XCircle className="text-red-500 mt-1" size={20} />
                            )}
                            <div className="flex-1">
                                <h4 className="font-bold text-slate-700 text-sm">Google Drive Access</h4>
                                <p className="text-xs text-slate-500 mt-1">{healthStatus?.googleDrive.message || 'Mengecek status...'}</p>
                                
                                {healthStatus?.googleDrive.email && (
                                    <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
                                        <p className="text-[10px] font-bold text-blue-600 uppercase mb-1">Email Service Account Anda:</p>
                                        <div className="flex items-center justify-between gap-2">
                                            <code className="text-[11px] text-slate-700 font-mono break-all">{healthStatus.googleDrive.email}</code>
                                            <button 
                                                onClick={() => copyToClipboard(healthStatus.googleDrive.email)}
                                                className="p-1.5 text-blue-500 hover:bg-blue-100 rounded transition-colors flex-shrink-0"
                                                title="Salin Email"
                                            >
                                                <Copy size={14} />
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {!healthStatus?.googleDrive.connected && (
                                    <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-xl flex items-start gap-3">
                                        <AlertTriangle className="text-yellow-600 shrink-0" size={18} />
                                        <div className="text-xs text-yellow-800 space-y-2">
                                            <p className="font-bold">Cara Memperbaiki Masalah Sharing:</p>
                                            <ol className="list-decimal ml-4 space-y-1">
                                                <li>Salin email Service Account di atas.</li>
                                                <li>Buka folder pusat di Google Drive Anda.</li>
                                                <li>Klik Kanan &gt; Share (Bagikan).</li>
                                                <li>Paste email tadi. Jika muncul error "tidak memiliki akun", coba matikan opsi "Notify people" (Beritahu orang lain).</li>
                                                <li>Pastikan role dipilih sebagai <strong>Editor</strong>.</li>
                                            </ol>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Service Account File Status */}
                        <div className="flex items-start gap-4 p-4 rounded-xl border bg-slate-50/50">
                            {healthStatus?.fileSystem.serviceAccountExists ? (
                                <CheckCircle className="text-green-500 mt-1" size={20} />
                            ) : (
                                <XCircle className="text-red-500 mt-1" size={20} />
                            )}
                            <div className="flex-1">
                                <h4 className="font-bold text-slate-700 text-sm">Credential File (`service-account.json`)</h4>
                                <p className="text-xs text-slate-500 mt-1">
                                    {healthStatus?.fileSystem.serviceAccountExists 
                                        ? 'File kredensial terdeteksi di server.' 
                                        : 'File service-account.json tidak ditemukan di folder utama server.'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* AGGREGATORS CONFIG */}
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
                            className="flex-1 px-4 py-2 border border-gray-200 rounded-xl focus:border-blue-500 outline-none text-sm"
                        />
                        <button 
                            onClick={handleAdd}
                            className="p-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
                        >
                            <Plus size={20} />
                        </button>
                    </div>

                    <div className="bg-slate-50 rounded-xl border border-gray-200 overflow-hidden max-h-64 overflow-y-auto">
                        <ul className="divide-y divide-gray-200">
                            {aggregators.map((agg, idx) => (
                                <li key={idx} className="px-4 py-3 flex justify-between items-center bg-white">
                                    <span className="text-sm font-medium text-slate-700">{agg}</span>
                                    <button 
                                        onClick={() => handleRemove(idx)}
                                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                    >
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
