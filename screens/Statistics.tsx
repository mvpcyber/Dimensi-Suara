
import React, { useState, useEffect } from 'react';
import { ReleaseData } from '../types';
import { 
    Music, 
    Disc, 
    Layers, 
    Mic2, 
    TrendingUp, 
    PlayCircle, 
    Users, 
    ArrowUpRight, 
    ArrowDownRight 
} from 'lucide-react';

interface Props {
  releases: ReleaseData[]; // Legacy prop (we will fetch new data internally)
}

export const Statistics: React.FC<Props> = ({ releases }) => {
  const [stats, setStats] = useState({
      catalog: { totalTracks: 0, albums: 0, singles: 0 },
      platforms: [] as any[]
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
      const fetchStats = async () => {
          setIsLoading(true);
          try {
              const res = await fetch('/api/statistics');
              if(res.ok) {
                  const data = await res.json();
                  setStats(data);
              }
          } catch(e) { console.error("Stats fetch error", e); }
          finally { setIsLoading(false); }
      };
      fetchStats();
  }, []);

  const totalRevenue = stats.platforms.reduce((acc, curr) => acc + Number(curr.total_revenue), 0);
  const totalStreams = stats.platforms.reduce((acc, curr) => acc + Number(curr.total_streams), 0);

  // Helper formatting
  const formatIDR = (num: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num);
  const formatNumber = (num: number) => new Intl.NumberFormat('id-ID').format(num);

  const StatCard = ({ title, count, icon, colorClass, bgClass, subtext }: any) => (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between transition-transform hover:-translate-y-1 hover:shadow-md">
        <div>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">{title}</p>
            <h3 className="text-3xl font-bold text-slate-800">{count}</h3>
            <p className="text-xs text-slate-400 mt-2 font-medium">{subtext}</p>
        </div>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${bgClass} ${colorClass}`}>
            {icon}
        </div>
    </div>
  );

  if (isLoading) return <div className="p-8 text-center text-slate-400">Loading statistics...</div>;

  return (
    <div className="p-4 md:p-8 w-full max-w-[1400px] mx-auto min-h-screen">
       <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Statistik & Laporan</h1>
            <p className="text-slate-500 mt-1">Analisis performa katalog musik dan pendapatan Anda.</p>
       </div>

       {/* CATALOG STATS */}
       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
            <StatCard 
                title="Total Rilis Lagu" 
                count={stats.catalog.totalTracks} 
                icon={<Mic2 size={24} />} 
                colorClass="text-blue-600" 
                bgClass="bg-blue-50"
                subtext="Total track individual"
            />
            <StatCard 
                title="Total Album" 
                count={stats.catalog.albums} 
                icon={<Disc size={24} />} 
                colorClass="text-purple-600" 
                bgClass="bg-purple-50"
                subtext="> 1 Tracks"
            />
            <StatCard 
                title="Total Single" 
                count={stats.catalog.singles} 
                icon={<Music size={24} />} 
                colorClass="text-cyan-600" 
                bgClass="bg-cyan-50"
                subtext="1 Track"
            />
       </div>

       {/* REVENUE & STREAM OVERVIEW */}
       <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
            {/* Main Metrics */}
            <div className="lg:col-span-2 bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-8 text-white shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500 rounded-full blur-[100px] opacity-20"></div>
                <div className="relative z-10">
                    <h3 className="text-slate-300 font-medium mb-1 flex items-center gap-2">
                        <TrendingUp size={18} /> Estimasi Pendapatan
                    </h3>
                    <div className="text-4xl md:text-5xl font-bold mb-8">
                        {formatIDR(totalRevenue)}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-8 border-t border-slate-700 pt-6">
                        <div>
                            <p className="text-slate-400 text-sm mb-1 flex items-center gap-2">
                                <PlayCircle size={14} /> Total Streams
                            </p>
                            <p className="text-2xl font-bold">{formatNumber(totalStreams)}</p>
                        </div>
                        <div>
                            <p className="text-slate-400 text-sm mb-1 flex items-center gap-2">
                                <Users size={14} /> Pendengar Aktif
                            </p>
                            <p className="text-2xl font-bold">{formatNumber(Math.round(totalStreams / 12))}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Top Song (Mock for layout completeness, can be dynamic later) */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col">
                <h3 className="font-bold text-slate-800 mb-6">Catalog Highlights</h3>
                <div className="flex-1 flex flex-col items-center justify-center text-center">
                    <div className="w-32 h-32 rounded-2xl bg-gradient-to-br from-blue-400 to-indigo-500 shadow-lg mb-4 flex items-center justify-center text-white">
                        <Music size={48} />
                    </div>
                    <h4 className="font-bold text-lg text-slate-800">Your Top Release</h4>
                    <p className="text-slate-500 text-sm mb-4">Calculated monthly</p>
                </div>
            </div>
       </div>

       {/* PLATFORM BREAKDOWN TABLE */}
       <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100">
                <h3 className="font-bold text-lg text-slate-800">Analitik Platform</h3>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-gray-100">
                        <tr>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Platform</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase w-1/3">Revenue Share</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-right">Streams</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-right">Pendapatan</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {stats.platforms.map((platform, idx) => {
                            const revenue = Number(platform.total_revenue);
                            const streams = Number(platform.total_streams);
                            const percentage = totalRevenue > 0 ? (revenue / totalRevenue) * 100 : 0;

                            return (
                                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <span className="font-bold text-slate-700">{platform.platform_name}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                                            <div 
                                                className={`h-full rounded-full bg-blue-500`} 
                                                style={{ width: `${percentage}%` }}
                                            ></div>
                                        </div>
                                        <div className="text-[10px] text-slate-400 mt-1">{percentage.toFixed(1)}% Share</div>
                                    </td>
                                    <td className="px-6 py-4 text-right font-mono text-sm text-slate-600">
                                        {formatNumber(streams)}
                                    </td>
                                    <td className="px-6 py-4 text-right font-bold text-sm text-slate-700">
                                        {formatIDR(revenue)}
                                    </td>
                                </tr>
                            );
                        })}
                        {stats.platforms.length === 0 && (
                            <tr>
                                <td colSpan={4} className="p-8 text-center text-slate-400 italic">Belum ada data analitik.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
       </div>
    </div>
  );
};
