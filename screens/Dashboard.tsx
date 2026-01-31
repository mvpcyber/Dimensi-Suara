
import React from 'react';
import { ReleaseData } from '../types';
import { 
    LayoutDashboard, 
    Clock, 
    Loader2, 
    CheckCircle, 
    AlertTriangle, 
    Music, 
    Disc,
    ArrowRight,
    Globe
} from 'lucide-react';

interface Props {
  releases: ReleaseData[];
  onViewRelease: (release: ReleaseData) => void;
  onNavigateToAll: () => void;
}

export const Dashboard: React.FC<Props> = ({ releases, onViewRelease, onNavigateToAll }) => {
  
  // Calculate Stats
  const stats = {
    total: releases.length,
    pending: releases.filter(r => r.status === 'Pending').length,
    processing: releases.filter(r => r.status === 'Processing').length,
    live: releases.filter(r => r.status === 'Live').length,
    rejected: releases.filter(r => r.status === 'Rejected').length,
  };

  // Filter Recent Activity: Only Pending & Processing
  const recentActivity = releases
    .filter(r => r.status === 'Pending' || r.status === 'Processing')
    .slice(0, 5);

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
            <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Dashboard</h1>
            <p className="text-slate-500 mt-1">Welcome back, here is your catalog overview.</p>
       </div>

       {/* STATS CARDS */}
       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
            <StatCard 
                title="Pending Review" 
                count={stats.pending} 
                icon={<Clock size={24} />} 
                colorClass="text-yellow-600" 
                bgClass="bg-yellow-50"
                subtext="Waiting for approval"
            />
            <StatCard 
                title="Processing" 
                count={stats.processing} 
                icon={<Loader2 size={24} className={stats.processing > 0 ? "animate-spin-slow" : ""} />} 
                colorClass="text-blue-600" 
                bgClass="bg-blue-50"
                subtext="Sent to stores"
            />
            <StatCard 
                title="Live Releases" 
                count={stats.live} 
                icon={<CheckCircle size={24} />} 
                colorClass="text-green-600" 
                bgClass="bg-green-50"
                subtext="Active on DSPs"
            />
            <StatCard 
                title="Rejected" 
                count={stats.rejected} 
                icon={<AlertTriangle size={24} />} 
                colorClass="text-red-600" 
                bgClass="bg-red-50"
                subtext="Requires attention"
            />
       </div>

       {/* RECENT ACTIVITY TABLE */}
       <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                    <LayoutDashboard size={20} className="text-slate-400" />
                    Recent Activity (Pending & Processing)
                </h3>
                <button 
                    onClick={onNavigateToAll}
                    className="text-sm font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                    View All <ArrowRight size={16} />
                </button>
            </div>
            
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-gray-100">
                        <tr>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Cover</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Title</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Artist</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Aggregator</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Status</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Date</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {recentActivity.map((release) => {
                             let statusClass = "bg-gray-100 text-gray-600 border-gray-200";
                             // Only Pending and Processing logic needed for this table based on filter
                             if (release.status === 'Processing') statusClass = "bg-blue-100 text-blue-700 border-blue-200";
                             if (release.status === 'Pending') statusClass = "bg-yellow-100 text-yellow-700 border-yellow-200";

                             return (
                                <tr 
                                    key={release.id} 
                                    onClick={() => onViewRelease(release)}
                                    className="hover:bg-blue-50/30 transition-colors cursor-pointer group"
                                >
                                    <td className="px-6 py-3">
                                        <div className="w-10 h-10 rounded-lg bg-gray-100 overflow-hidden border border-gray-200">
                                            {release.coverArt ? (
                                                <img src={URL.createObjectURL(release.coverArt)} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="flex items-center justify-center h-full text-gray-400"><Disc size={16} /></div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-3 font-bold text-slate-700 group-hover:text-blue-600 transition-colors">
                                        {release.title}
                                    </td>
                                    <td className="px-6 py-3 text-sm text-slate-600">
                                        {release.primaryArtists[0]}
                                    </td>
                                    <td className="px-6 py-3 text-sm">
                                        {release.aggregator ? (
                                            <div className="flex items-center gap-2 text-slate-700 font-medium">
                                                <Globe size={14} className="text-purple-500" />
                                                {release.aggregator}
                                            </div>
                                        ) : (
                                            <span className="text-slate-400 italic text-xs">-</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-3">
                                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${statusClass}`}>
                                            {release.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-3 text-sm text-slate-500">
                                        {release.submissionDate || "N/A"}
                                    </td>
                                </tr>
                             )
                        })}
                        {recentActivity.length === 0 && (
                            <tr>
                                <td colSpan={6} className="p-8 text-center text-slate-400 text-sm">
                                    No pending or processing releases found.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
       </div>
    </div>
  );
};
