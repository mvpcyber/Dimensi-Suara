
import React from 'react';
import { ReleaseData } from '../types';
import { 
    Music, 
    Disc, 
    Layers, 
    Mic2, 
    TrendingUp, 
    DollarSign, 
    PlayCircle, 
    Users, 
    ArrowUpRight, 
    ArrowDownRight 
} from 'lucide-react';

interface Props {
  releases: ReleaseData[];
}

export const Statistics: React.FC<Props> = ({ releases }) => {
  
  // 1. Calculate Catalog Stats
  const stats = {
    totalTracks: releases.reduce((acc, r) => acc + r.tracks.length, 0),
    singles: releases.filter(r => r.tracks.length === 1).length,
    eps: releases.filter(r => r.tracks.length >= 2 && r.tracks.length <= 6).length,
    albums: releases.filter(r => r.tracks.length > 6).length,
  };

  // 2. Mock Analytics Data
  const platformData = [
    { name: 'Spotify', streams: 850400, revenue: 3500000, trend: '+12.5%', isUp: true, color: 'bg-green-500', icon: 'S' },
    { name: 'Apple Music', streams: 320100, revenue: 1800000, trend: '+5.2%', isUp: true, color: 'bg-red-500', icon: 'A' },
    { name: 'YouTube Music', streams: 1200500, revenue: 950000, trend: '-2.1%', isUp: false, color: 'bg-red-600', icon: 'Y' },
    { name: 'TikTok', streams: 2500000, revenue: 450000, trend: '+24.8%', isUp: true, color: 'bg-black', icon: 'T' },
    { name: 'Resso', streams: 150000, revenue: 200000, trend: '+1.0%', isUp: true, color: 'bg-orange-500', icon: 'R' }
  ];

  const totalRevenue = platformData.reduce((acc, curr) => acc + curr.revenue, 0);
  const totalStreams = platformData.reduce((acc, curr) => acc + curr.streams, 0);

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
                count={stats.totalTracks} 
                icon={<Mic2 size={24} />} 
                colorClass="text-blue-600" 
                bgClass="bg-blue-50"
                subtext="Total track individual"
            />
            <StatCard 
                title="Total Album" 
                count={stats.albums} 
                icon={<Disc size={24} />} 
                colorClass="text-purple-600" 
                bgClass="bg-purple-50"
                subtext="> 6 Tracks"
            />
            <StatCard 
                title="Total EP" 
                count={stats.eps} 
                icon={<Layers size={24} />} 
                colorClass="text-indigo-600" 
                bgClass="bg-indigo-50"
                subtext="2 - 6 Tracks"
            />
            <StatCard 
                title="Total Single" 
                count={stats.singles} 
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
                        <TrendingUp size={18} /> Estimasi Pendapatan (Bulan Ini)
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
                            <span className="text-green-400 text-xs font-bold flex items-center mt-1">
                                <ArrowUpRight size={12} className="mr-1" /> +14.2%
                            </span>
                        </div>
                        <div>
                            <p className="text-slate-400 text-sm mb-1 flex items-center gap-2">
                                <Users size={14} /> Pendengar Aktif
                            </p>
                            <p className="text-2xl font-bold">{formatNumber(Math.round(totalStreams / 12))}</p>
                            <span className="text-green-400 text-xs font-bold flex items-center mt-1">
                                <ArrowUpRight size={12} className="mr-1" /> +8.5%
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Top Song Demo */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col">
                <h3 className="font-bold text-slate-800 mb-6">Top Performing Song</h3>
                <div className="flex-1 flex flex-col items-center justify-center text-center">
                    <div className="w-32 h-32 rounded-2xl bg-gradient-to-br from-blue-400 to-indigo-500 shadow-lg mb-4 flex items-center justify-center text-white">
                        <Music size={48} />
                    </div>
                    <h4 className="font-bold text-lg text-slate-800">Summer Vibes Vol. 1</h4>
                    <p className="text-slate-500 text-sm mb-4">The Weekend Band</p>
                    <div className="flex gap-4 text-center">
                         <div>
                             <div className="text-xs text-slate-400 uppercase font-bold">Streams</div>
                             <div className="font-bold text-slate-700">450k</div>
                         </div>
                         <div>
                             <div className="text-xs text-slate-400 uppercase font-bold">Revenue</div>
                             <div className="font-bold text-slate-700">Rp 1.2jt</div>
                         </div>
                    </div>
                </div>
            </div>
       </div>

       {/* PLATFORM BREAKDOWN TABLE */}
       <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100">
                <h3 className="font-bold text-lg text-slate-800">Analitik Platform (Demo Data)</h3>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-gray-100">
                        <tr>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Platform</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase w-1/3">Performance Share</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-right">Streams</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-right">Pendapatan</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-right">Trend</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {platformData.map((platform, idx) => {
                            // Calculate percentage for bar width
                            const percentage = (platform.streams / totalStreams) * 100;

                            return (
                                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-lg ${platform.color} flex items-center justify-center text-white font-bold text-xs shadow-sm`}>
                                                {platform.icon}
                                            </div>
                                            <span className="font-bold text-slate-700">{platform.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                                            <div 
                                                className={`h-full rounded-full ${platform.color}`} 
                                                style={{ width: `${percentage}%` }}
                                            ></div>
                                        </div>
                                        <div className="text-[10px] text-slate-400 mt-1">{percentage.toFixed(1)}% Share</div>
                                    </td>
                                    <td className="px-6 py-4 text-right font-mono text-sm text-slate-600">
                                        {formatNumber(platform.streams)}
                                    </td>
                                    <td className="px-6 py-4 text-right font-bold text-sm text-slate-700">
                                        {formatIDR(platform.revenue)}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${platform.isUp ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                            {platform.isUp ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                                            {platform.trend}
                                        </span>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
       </div>
    </div>
  );
};
