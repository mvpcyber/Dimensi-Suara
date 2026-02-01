
import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Plus, Trash2, Globe, Activity, CheckCircle, XCircle, Loader2, RefreshCw, HardDrive, Shield, Lock, UserPlus, Server, Music2 } from 'lucide-react';
import { checkSystemHealth } from '../services/googleService';

interface Props {
  aggregators: string[];
  setAggregators: (list: string[]) => void;
}

type SettingsTab = 'SYSTEM' | 'AGGREGATOR' | 'PLATFORM' | 'ADMINISTRATOR';

interface Item {
    id: number;
    name: string;
    domain?: string;
}

export const Settings: React.FC<Props> = ({ aggregators, setAggregators }) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('SYSTEM');
  
  // Aggregator State
  const [dbAggregators, setDbAggregators] = useState<Item[]>([]);
  const [newAgg, setNewAgg] = useState('');
  const [isAggLoading, setIsAggLoading] = useState(false);

  // Platform State (DSP)
  const [platforms, setPlatforms] = useState<Item[]>([]);
  const [newPlatform, setNewPlatform] = useState('');
  const [isPlatLoading, setIsPlatLoading] = useState(false);

  // System State
  const [healthStatus, setHealthStatus] = useState<any>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Admin State
  const [admins, setAdmins] = useState<any[]>([]);
  const [newAdmin, setNewAdmin] = useState({ username: '', email: '', password: '', fullName: '' });
  const [isAdminLoading, setIsAdminLoading] = useState(false);

  const runHealthCheck = async () => {
    setIsChecking(true);
    setErrorMessage(null);
    try {
        const status = await checkSystemHealth();
        setHealthStatus(status);
    } catch (err: any) {
        setErrorMessage(`Error: ${err.message}. Backend mungkin down.`);
        setHealthStatus({
            database: { connected: false, message: 'Server Tidak Merespon' },
            storage: { connected: false, message: 'Offline' },
        });
    } finally {
        setIsChecking(false);
    }
  };

  const fetchAdmins = async () => {
      try {
          const res = await fetch('/api/admins');
          const data = await res.json();
          if(Array.isArray(data)) setAdmins(data);
      } catch (e) { console.error(e); }
  };

  const fetchAggregators = async () => {
      try {
          const res = await fetch('/api/aggregators');
          const data = await res.json();
          if(Array.isArray(data)) {
              setDbAggregators(data);
              setAggregators(data.map(d => d.name));
          }
      } catch (e) { console.error(e); }
  };

  const fetchPlatforms = async () => {
      try {
          const res = await fetch('/api/platforms');
          const data = await res.json();
          if(Array.isArray(data)) {
              setPlatforms(data);
          }
      } catch (e) { console.error(e); }
  };

  const handleAddAggregator = async () => {
      if (!newAgg.trim()) return;
      setIsAggLoading(true);
      try {
          const res = await fetch('/api/aggregators', {
              method: 'POST',
              headers: {'Content-Type': 'application/json'},
              body: JSON.stringify({ name: newAgg.trim() })
          });
          if(res.ok) {
              setNewAgg('');
              fetchAggregators();
          }
      } catch(e) { alert("Gagal menambah aggregator"); }
      finally { setIsAggLoading(false); }
  };

  const handleAddPlatform = async () => {
      if (!newPlatform.trim()) return;
      setIsPlatLoading(true);
      try {
          const res = await fetch('/api/platforms', {
              method: 'POST',
              headers: {'Content-Type': 'application/json'},
              body: JSON.stringify({ name: newPlatform.trim() })
          });
          if(res.ok) {
              setNewPlatform('');
              fetchPlatforms();
          }
      } catch(e) { alert("Gagal menambah platform"); }
      finally { setIsPlatLoading(false); }
  };

  const handleDeleteItem = async (id: number, type: 'aggregators' | 'platforms') => {
      if(!confirm(`Hapus item ini dari ${type}?`)) return;
      try {
          await fetch(`/api/${type}/${id}`, { method: 'DELETE' });
          if(type === 'aggregators') fetchAggregators();
          else fetchPlatforms();
      } catch(e) { alert("Gagal menghapus."); }
  };

  const handleAddAdmin = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsAdminLoading(true);
      try {
          const res = await fetch('/api/admins', {
              method: 'POST',
              headers: {'Content-Type': 'application/json'},
              body: JSON.stringify(newAdmin)
          });
          const result = await res.json();
          if (result.success) {
              setNewAdmin({ username: '', email: '', password: '', fullName: '' });
              fetchAdmins();
              alert("Admin berhasil ditambahkan!");
          } else {
              alert(result.error);
          }
      } catch (err) {
          alert("Gagal menambahkan admin.");
      } finally {
          setIsAdminLoading(false);
      }
  };

  useEffect(() => {
    if (activeTab === 'SYSTEM') runHealthCheck();
    if (activeTab === 'ADMINISTRATOR') fetchAdmins();
    if (activeTab === 'AGGREGATOR') fetchAggregators();
    if (activeTab === 'PLATFORM') fetchPlatforms();
  }, [activeTab]);

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto min-h-screen">
       <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-800 tracking-tight flex items-center gap-3">
                <SettingsIcon size={32} className="text-slate-400" />
                Settings
            </h1>
            <p className="text-slate-500 mt-1">Konfigurasi sistem, partner distribusi, dan hak akses.</p>
       </div>

       <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Sidebar Navigation */}
            <div className="lg:col-span-1">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden sticky top-24">
                    <div className="p-2">
                        <button 
                            onClick={() => setActiveTab('SYSTEM')}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold text-sm mb-1 ${activeTab === 'SYSTEM' ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-50'}`}
                        >
                            <Activity size={18} /> System Status
                        </button>
                        <button 
                            onClick={() => setActiveTab('AGGREGATOR')}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold text-sm mb-1 ${activeTab === 'AGGREGATOR' ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-50'}`}
                        >
                            <Globe size={18} /> Aggregator
                        </button>
                        <button 
                            onClick={() => setActiveTab('PLATFORM')}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold text-sm mb-1 ${activeTab === 'PLATFORM' ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-50'}`}
                        >
                            <Music2 size={18} /> DSP Platforms
                        </button>
                        <button 
                            onClick={() => setActiveTab('ADMINISTRATOR')}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold text-sm ${activeTab === 'ADMINISTRATOR' ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-50'}`}
                        >
                            <Shield size={18} /> Administrator
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="lg:col-span-3">
                
                {/* --- TAB: SYSTEM --- */}
                {activeTab === 'SYSTEM' && (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 animate-fade-in">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                <Server size={20} className="text-blue-500" /> System Health
                            </h2>
                            <button onClick={runHealthCheck} disabled={isChecking} className="text-sm font-bold text-slate-500 hover:text-blue-600 flex items-center gap-2">
                                {isChecking ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />} Refresh
                            </button>
                        </div>

                        {errorMessage && (
                            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-700 text-sm font-bold">
                                <XCircle size={20} /> {errorMessage}
                            </div>
                        )}

                        <div className="space-y-4">
                            <div className="flex items-center p-4 rounded-xl border bg-slate-50/50 justify-between">
                                <div className="flex items-center gap-4">
                                    <div className={`p-2 rounded-lg ${healthStatus?.database?.connected ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                        <Activity size={20} />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-slate-700">MySQL Database</h4>
                                        <p className="text-xs text-slate-500">{healthStatus?.database?.message || 'Checking...'}</p>
                                    </div>
                                </div>
                                {healthStatus?.database?.connected ? <CheckCircle className="text-green-500" /> : <XCircle className="text-red-500" />}
                            </div>

                            <div className="flex items-center p-4 rounded-xl border bg-slate-50/50 justify-between">
                                <div className="flex items-center gap-4">
                                    <div className={`p-2 rounded-lg ${healthStatus?.storage?.connected ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                        <HardDrive size={20} />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-slate-700">Local Storage (Uploads)</h4>
                                        <p className="text-xs text-slate-500">{healthStatus?.storage?.message || 'Checking...'}</p>
                                    </div>
                                </div>
                                {healthStatus?.storage?.connected ? <CheckCircle className="text-green-500" /> : <XCircle className="text-red-500" />}
                            </div>
                        </div>
                    </div>
                )}

                {/* --- TAB: AGGREGATOR --- */}
                {activeTab === 'AGGREGATOR' && (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 animate-fade-in">
                        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2 mb-6">
                            <Globe size={20} className="text-purple-500" /> Manage Aggregators
                        </h2>
                        <div className="flex gap-2 mb-6">
                            <input 
                                value={newAgg}
                                onChange={(e) => setNewAgg(e.target.value)}
                                placeholder="Nama aggregator baru..."
                                className="flex-1 px-4 py-3 border border-gray-200 rounded-xl outline-none text-sm bg-slate-50 focus:bg-white focus:border-blue-500 transition-all"
                            />
                            <button onClick={handleAddAggregator} disabled={isAggLoading} className="px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors flex items-center gap-2">
                                {isAggLoading ? <Loader2 className="animate-spin" size={18}/> : <Plus size={18} />} Add
                            </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[500px] overflow-y-auto">
                            {dbAggregators.map((agg) => (
                                <div key={agg.id} className="px-4 py-3 flex justify-between items-center bg-white border border-gray-200 rounded-xl">
                                    <span className="font-bold text-slate-700">{agg.name}</span>
                                    <button onClick={() => handleDeleteItem(agg.id, 'aggregators')} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))}
                            {dbAggregators.length === 0 && <p className="text-slate-400 text-sm italic p-4">Belum ada data aggregator.</p>}
                        </div>
                    </div>
                )}

                {/* --- TAB: PLATFORM (DSP) --- */}
                {activeTab === 'PLATFORM' && (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 animate-fade-in">
                        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2 mb-6">
                            <Music2 size={20} className="text-pink-500" /> Manage DSP Platforms
                        </h2>
                        <p className="text-sm text-slate-500 mb-4">Daftar toko musik digital (Spotify, Apple Music, dll) yang tersedia untuk rilis.</p>
                        
                        <div className="flex gap-2 mb-6">
                            <input 
                                value={newPlatform}
                                onChange={(e) => setNewPlatform(e.target.value)}
                                placeholder="Nama platform baru..."
                                className="flex-1 px-4 py-3 border border-gray-200 rounded-xl outline-none text-sm bg-slate-50 focus:bg-white focus:border-blue-500 transition-all"
                            />
                            <button onClick={handleAddPlatform} disabled={isPlatLoading} className="px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors flex items-center gap-2">
                                {isPlatLoading ? <Loader2 className="animate-spin" size={18}/> : <Plus size={18} />} Add
                            </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[500px] overflow-y-auto">
                            {platforms.map((p) => (
                                <div key={p.id} className="px-4 py-3 flex justify-between items-center bg-white border border-gray-200 rounded-xl">
                                    <span className="font-bold text-slate-700">{p.name}</span>
                                    <button onClick={() => handleDeleteItem(p.id, 'platforms')} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))}
                            {platforms.length === 0 && <p className="text-slate-400 text-sm italic p-4">Belum ada platform.</p>}
                        </div>
                    </div>
                )}

                {/* --- TAB: ADMINISTRATOR --- */}
                {activeTab === 'ADMINISTRATOR' && (
                    <div className="space-y-8 animate-fade-in">
                        {/* List Admins */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2 mb-6">
                                <Shield size={20} className="text-slate-600" /> Daftar Admin
                            </h2>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-50 border-b border-gray-200">
                                        <tr>
                                            <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase">Username</th>
                                            <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase">Nama Lengkap</th>
                                            <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase">Email</th>
                                            <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase">Dibuat</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {admins.map(admin => (
                                            <tr key={admin.id}>
                                                <td className="px-4 py-3 font-bold text-slate-700">{admin.username}</td>
                                                <td className="px-4 py-3 text-sm text-slate-600">{admin.full_name}</td>
                                                <td className="px-4 py-3 text-sm text-slate-600">{admin.email}</td>
                                                <td className="px-4 py-3 text-xs text-slate-400">{new Date(admin.created_at).toLocaleDateString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Add Admin Form */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2 mb-6">
                                <UserPlus size={20} className="text-green-600" /> Tambah Admin Baru
                            </h2>
                            <form onSubmit={handleAddAdmin} className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Username</label>
                                        <input required value={newAdmin.username} onChange={e => setNewAdmin({...newAdmin, username: e.target.value})} className="w-full px-4 py-2.5 border rounded-xl outline-none focus:border-blue-500" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nama Lengkap</label>
                                        <input required value={newAdmin.fullName} onChange={e => setNewAdmin({...newAdmin, fullName: e.target.value})} className="w-full px-4 py-2.5 border rounded-xl outline-none focus:border-blue-500" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email</label>
                                    <input required type="email" value={newAdmin.email} onChange={e => setNewAdmin({...newAdmin, email: e.target.value})} className="w-full px-4 py-2.5 border rounded-xl outline-none focus:border-blue-500" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Password</label>
                                    <input required type="password" value={newAdmin.password} onChange={e => setNewAdmin({...newAdmin, password: e.target.value})} className="w-full px-4 py-2.5 border rounded-xl outline-none focus:border-blue-500" />
                                </div>
                                <div className="pt-4">
                                    <button type="submit" disabled={isAdminLoading} className="px-6 py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition-colors flex items-center gap-2">
                                        {isAdminLoading ? <Loader2 className="animate-spin" size={18}/> : <Plus size={18} />} Simpan Admin
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

            </div>
       </div>
    </div>
  );
};
