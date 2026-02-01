
import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Plus, Trash2, Globe, Activity, CheckCircle, XCircle, Loader2, RefreshCw, HardDrive } from 'lucide-react';
import { checkSystemHealth } from '../services/googleService';

interface Props {
  aggregators: string[];
  setAggregators: (list: string[]) => void;
}

export const Settings: React.FC<Props> = ({ aggregators, setAggregators }) => {
  const [newAgg, setNewAgg] = useState('');
  const [healthStatus, setHealthStatus] = useState<any>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const runHealthCheck = async () => {
    setIsChecking(true);
    setErrorMessage(null);
    try {
        const status = await checkSystemHealth();
        setHealthStatus(status);
    } catch (err: any) {
        console.error("Health Check Error:", err);
        setErrorMessage(`Error: ${err.message}. Pastikan Backend (Node.js) sedang berjalan.`);
        setHealthStatus({
            database: { connected: false, message: 'Server Tidak Merespon' },
            storage: { connected: false, message: 'Offline' },
        });
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

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto min-h-screen">
       <div className="mb-8 border-b border-gray-200 pb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
                <h1 className="text-3xl font-bold text-slate-800 tracking-tight flex items-center gap-3">
                    <SettingsIcon size={32} className="text-slate-400" />
                    Settings
                </h1>
                <p className="text-slate-500 mt-1">Konfigurasi database dan status server (Local Storage).</p>
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

       {errorMessage && (
           <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-700 shadow-sm">
               <XCircle size={20} className="shrink-0" />
               <div className="text-xs font-bold leading-relaxed">{errorMessage}</div>
           </div>
       )}

       <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                    <div className="flex items-center gap-3 mb-6">
                        <Activity className="text-blue-500" size={24} />
                        <h2 className="text-xl font-bold text-slate-800">System Health Status</h2>
                    </div>

                    <div className="space-y-6">
                        {/* Database Status */}
                        <div className="flex items-start gap-4 p-4 rounded-xl border bg-slate-50/50">
                            {healthStatus?.database?.connected ? (
                                <CheckCircle className="text-green-500 mt-1" size={20} />
                            ) : (
                                <XCircle className="text-red-500 mt-1" size={20} />
                            )}
                            <div className="flex-1">
                                <h4 className="font-bold text-slate-700 text-sm">MySQL Database</h4>
                                <p className="text-xs text-slate-500 mt-1">{healthStatus?.database?.message || 'Mengecek status...'}</p>
                            </div>
                        </div>

                        {/* Local Storage Status */}
                        <div className="flex items-start gap-4 p-4 rounded-xl border bg-slate-50/50">
                            {healthStatus?.storage?.connected ? (
                                <CheckCircle className="text-green-500 mt-1" size={20} />
                            ) : (
                                <XCircle className="text-red-500 mt-1" size={20} />
                            )}
                            <div className="flex-1">
                                <h4 className="font-bold text-slate-700 text-sm flex items-center gap-2">
                                    <HardDrive size={14} /> Local File Storage
                                </h4>
                                <p className={`text-xs mt-1 ${healthStatus?.storage?.connected ? 'text-slate-500' : 'text-red-500 font-bold'}`}>
                                    {healthStatus?.storage?.message || 'Mengecek folder uploads...'}
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
                    <div className="bg-slate-50 rounded-xl border border-gray-200 overflow-hidden max-h-64 overflow-y-auto">
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
