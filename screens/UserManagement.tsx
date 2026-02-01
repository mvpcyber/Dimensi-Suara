
import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Mail, CheckCircle, AlertTriangle, Loader2, Search } from 'lucide-react';

interface Candidate {
  id: number;
  contract_number: string;
  artist_name: string;
}

interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  full_name: string;
  created_at: string;
}

export const UserManagement: React.FC = () => {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Create User State
  const [selectedContract, setSelectedContract] = useState<string>('');
  const [emailInput, setEmailInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [message, setMessage] = useState<{type: 'success'|'error', text: string} | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    try {
        const [candRes, usersRes] = await Promise.all([
            fetch('/api/users/candidates'),
            fetch('/api/users')
        ]);
        setCandidates(await candRes.json());
        setUsers(await usersRes.json());
    } catch (e) {
        console.error("Fetch error", e);
    } finally {
        setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleGenerate = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedContract || !emailInput) return;

      setIsGenerating(true);
      setMessage(null);

      try {
          const res = await fetch('/api/users/generate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ contractId: selectedContract, email: emailInput })
          });
          const data = await res.json();

          if (data.success) {
              setMessage({ type: 'success', text: data.message });
              setEmailInput('');
              setSelectedContract('');
              fetchData(); // Refresh list
          } else {
              setMessage({ type: 'error', text: data.error || 'Gagal membuat user' });
          }
      } catch (err) {
          setMessage({ type: 'error', text: 'Server error' });
      } finally {
          setIsGenerating(false);
      }
  };

  return (
    <div className="p-4 md:p-8 max-w-[1400px] mx-auto min-h-screen">
       <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-800 tracking-tight flex items-center gap-3">
                <Users size={32} className="text-blue-600" />
                Manajemen User (Artist)
            </h1>
            <p className="text-slate-500 mt-1">Buat akun untuk artist yang kontraknya sudah selesai & kirim kredensial via email.</p>
       </div>

       <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* LEFT: CREATE USER FORM */}
            <div className="lg:col-span-1">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sticky top-24">
                    <h2 className="font-bold text-xl text-slate-800 mb-6 flex items-center gap-2">
                        <UserPlus size={20} className="text-green-600" />
                        Generate Akun Baru
                    </h2>

                    {message && (
                        <div className={`p-4 rounded-xl text-sm font-bold mb-4 flex items-center gap-2 ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                            {message.type === 'success' ? <CheckCircle size={16}/> : <AlertTriangle size={16}/>}
                            {message.text}
                        </div>
                    )}

                    <form onSubmit={handleGenerate} className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Pilih Artist (Kontrak Selesai)</label>
                            <select 
                                value={selectedContract}
                                onChange={(e) => setSelectedContract(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-blue-500 focus:outline-none bg-white text-sm"
                                required
                            >
                                <option value="">-- Pilih Kontrak --</option>
                                {candidates.map(c => (
                                    <option key={c.id} value={c.id}>{c.artist_name} ({c.contract_number})</option>
                                ))}
                            </select>
                            {candidates.length === 0 && (
                                <p className="text-[10px] text-slate-400 mt-1 italic">Tidak ada kandidat kontrak selesai yang belum punya akun.</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Email Login Artist</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-3 text-slate-400" size={18} />
                                <input 
                                    type="email" 
                                    value={emailInput}
                                    onChange={(e) => setEmailInput(e.target.value)}
                                    placeholder="email@artist.com"
                                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-300 focus:border-blue-500 focus:outline-none"
                                    required
                                />
                            </div>
                            <p className="text-[10px] text-slate-400 mt-1">Password akan di-generate otomatis & dikirim ke email ini.</p>
                        </div>

                        <button 
                            type="submit" 
                            disabled={isGenerating || !selectedContract}
                            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isGenerating ? <Loader2 className="animate-spin" /> : <UserPlus size={18} />}
                            Generate & Kirim Email
                        </button>
                    </form>
                </div>
            </div>

            {/* RIGHT: EXISTING USERS LIST */}
            <div className="lg:col-span-2">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                        <h3 className="font-bold text-slate-800">Daftar User Aktif</h3>
                        <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-xs font-bold">Total: {users.length}</span>
                    </div>
                    
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-4 font-bold text-slate-600">Username</th>
                                    <th className="px-6 py-4 font-bold text-slate-600">Nama Lengkap</th>
                                    <th className="px-6 py-4 font-bold text-slate-600">Role</th>
                                    <th className="px-6 py-4 font-bold text-slate-600">Tanggal Dibuat</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {users.map(user => (
                                    <tr key={user.id} className="hover:bg-slate-50">
                                        <td className="px-6 py-4 font-bold text-slate-700">{user.username}</td>
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-slate-800">{user.full_name}</div>
                                            <div className="text-xs text-slate-400">{user.email}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${user.role === 'Admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                                                {user.role}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-slate-500">
                                            {new Date(user.created_at).toLocaleDateString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
       </div>
    </div>
  );
};
