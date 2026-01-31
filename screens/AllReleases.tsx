
import React, { useState, useEffect } from 'react';
import { Disc, Music, Calendar, Eye, Search, Filter, ArrowUpDown, ArrowUp, ArrowDown, Globe, ChevronLeft, ChevronRight, List } from 'lucide-react';
import { ReleaseData } from '../types';

interface Props {
  releases: ReleaseData[];
  onViewRelease: (release: ReleaseData) => void;
  onUpdateRelease: (release: ReleaseData) => void;
  availableAggregators: string[];
}

type SortKey = 'title' | 'artist' | 'type' | 'date' | 'aggregator' | 'status';
type SortDirection = 'asc' | 'desc';

interface SortConfig {
  key: SortKey;
  direction: SortDirection;
}

export const AllReleases: React.FC<Props> = ({ releases, onViewRelease, availableAggregators }) => {
  const [activeStatusTab, setActiveStatusTab] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Sorting State
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'date', direction: 'desc' });

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [isViewAll, setIsViewAll] = useState(false);
  const ITEMS_PER_PAGE = 10;

  // Reset pagination when filter/search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeStatusTab, searchQuery, isViewAll]);

  // Define Tabs
  const tabs = [
    { id: 'ALL', label: 'All Release', statusMap: null },
    { id: 'PENDING', label: 'Pending', statusMap: 'Pending' },
    { id: 'PROCESSING', label: 'Proses', statusMap: 'Processing' },
    { id: 'RELEASED', label: 'Released', statusMap: 'Live' },
    { id: 'REJECTED', label: 'Reject', statusMap: 'Rejected' },
  ];

  const getCount = (statusMap: string | null) => {
    if (statusMap === null) return releases.length;
    return releases.filter(r => r.status === statusMap).length;
  };

  // 1. Filter Logic
  const filteredReleases = releases.filter(release => {
    // Status Filter
    const currentTab = tabs.find(t => t.id === activeStatusTab);
    const statusMatch = currentTab?.statusMap ? release.status === currentTab.statusMap : true;
    
    // Search Filter (Expanded to include Aggregator)
    const searchLower = searchQuery.toLowerCase();
    const searchMatch = 
        release.title.toLowerCase().includes(searchLower) || 
        release.primaryArtists.some(a => a.toLowerCase().includes(searchLower)) ||
        (release.upc && release.upc.includes(searchLower)) ||
        (release.aggregator && release.aggregator.toLowerCase().includes(searchLower)); // Added Aggregator Search

    return statusMatch && searchMatch;
  });

  // 2. Sorting Logic
  const sortedReleases = [...filteredReleases].sort((a, b) => {
    const direction = sortConfig.direction === 'asc' ? 1 : -1;
    
    switch (sortConfig.key) {
        case 'title':
            return a.title.localeCompare(b.title) * direction;
        case 'artist':
            return (a.primaryArtists[0] || '').localeCompare(b.primaryArtists[0] || '') * direction;
        case 'aggregator':
            return (a.aggregator || '').localeCompare(b.aggregator || '') * direction;
        case 'status':
            return (a.status || '').localeCompare(b.status || '') * direction;
        case 'type':
            const typeA = a.tracks.length > 1 ? "Album" : "Single";
            const typeB = b.tracks.length > 1 ? "Album" : "Single";
            return typeA.localeCompare(typeB) * direction;
        case 'date':
        default:
            const dateA = a.plannedReleaseDate || a.submissionDate || '';
            const dateB = b.plannedReleaseDate || b.submissionDate || '';
            return dateA.localeCompare(dateB) * direction;
    }
  });

  // 3. Pagination Logic
  const totalItems = sortedReleases.length;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
  
  const displayedReleases = isViewAll 
    ? sortedReleases 
    : sortedReleases.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const handleSort = (key: SortKey) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const SortIcon = ({ columnKey }: { columnKey: SortKey }) => {
     if (sortConfig.key !== columnKey) return <ArrowUpDown size={14} className="text-slate-300 opacity-0 group-hover:opacity-50" />;
     return sortConfig.direction === 'asc' 
        ? <ArrowUp size={14} className="text-blue-500" /> 
        : <ArrowDown size={14} className="text-blue-500" />;
  };

  const ThSortable = ({ label, sortKey, align = 'left' }: { label: string, sortKey: SortKey, align?: 'left'|'right' }) => (
      <th 
        className={`px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors group text-${align}`}
        onClick={() => handleSort(sortKey)}
      >
        <div className={`flex items-center gap-2 ${align === 'right' ? 'justify-end' : ''}`}>
            {label}
            <SortIcon columnKey={sortKey} />
        </div>
      </th>
  );

  return (
    <div className="p-4 md:p-8 w-full max-w-[1400px] mx-auto min-h-screen">
       <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div>
                <h1 className="text-3xl font-bold text-slate-800 tracking-tight">All Releases</h1>
                <p className="text-slate-500 mt-1">Manage and track your music catalog status.</p>
            </div>
            <div className="relative w-full md:w-auto">
                <input 
                    type="text" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search Title, Artist, UPC, Aggregator..." 
                    className="w-full md:w-80 pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 bg-white shadow-sm transition-all"
                />
                <Search size={18} className="absolute left-3 top-3 text-gray-400" />
            </div>
        </div>

        {/* STATUS TABS NAVIGATION */}
        <div className="flex overflow-x-auto pb-2 mb-6 gap-2 no-scrollbar">
            {tabs.map((tab) => {
                const isActive = activeStatusTab === tab.id;
                const count = getCount(tab.statusMap);
                
                return (
                    <button
                        key={tab.id}
                        onClick={() => setActiveStatusTab(tab.id)}
                        className={`
                            whitespace-nowrap px-4 py-2 rounded-full font-bold text-sm transition-all flex items-center gap-2 border
                            ${isActive 
                                ? 'bg-slate-800 text-white border-slate-800 shadow-md transform scale-105' 
                                : 'bg-white text-slate-500 border-gray-200 hover:border-slate-300 hover:bg-gray-50'}
                        `}
                    >
                        {tab.label}
                        <span className={`px-1.5 py-0.5 rounded-full text-[10px] min-w-[20px] text-center ${isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>
                            {count}
                        </span>
                    </button>
                );
            })}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col min-h-[500px]">
            <div className="overflow-x-auto flex-1">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-gray-100">
                        <tr>
                            <ThSortable label="Release" sortKey="title" />
                            <ThSortable label="Type" sortKey="type" />
                            <ThSortable label="Release Date" sortKey="date" />
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Codes</th>
                            <ThSortable label="Aggregator" sortKey="aggregator" />
                            <ThSortable label="Status" sortKey="status" />
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {displayedReleases.map((release) => {
                            // Determine type
                            const type = release.tracks.length > 1 ? "Album/EP" : "Single";
                            
                            // Date priority: Planned > Original > Submission
                            const displayDate = release.plannedReleaseDate || release.originalReleaseDate || release.submissionDate || "N/A";
                            const status = release.status || "Pending";

                            // Determine color based on status
                            let statusClass = "bg-gray-100 text-gray-600 border-gray-200";
                            if (status === 'Live') statusClass = "bg-green-100 text-green-700 border-green-200";
                            if (status === 'Processing') statusClass = "bg-blue-100 text-blue-700 border-blue-200";
                            if (status === 'Pending') statusClass = "bg-yellow-100 text-yellow-700 border-yellow-200";
                            if (status === 'Rejected') statusClass = "bg-red-100 text-red-700 border-red-200 cursor-help";

                            // ISRC Logic
                            const isSingle = release.tracks.length === 1;
                            const isrcDisplay = isSingle 
                                ? (release.tracks[0]?.isrc || "-") 
                                : (release.tracks.length > 0 ? `${release.tracks.length} Tracks` : "-");

                            // Rejection Tooltip Logic
                            const rejectionTooltip = status === 'Rejected' && release.rejectionReason 
                                ? `Reason: ${release.rejectionReason}` 
                                : undefined;

                            return (
                                <tr key={release.id || Math.random()} className="hover:bg-blue-50/30 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-12 h-12 rounded-lg bg-blue-50 overflow-hidden flex items-center justify-center text-slate-400 relative shrink-0 border border-blue-100`}>
                                                {release.coverArt ? (
                                                    <img src={URL.createObjectURL(release.coverArt)} alt="Art" className="w-full h-full object-cover" />
                                                ) : (
                                                    <Disc size={20} />
                                                )}
                                            </div>
                                            <div className="min-w-[150px]">
                                                <div className="font-bold text-slate-800 truncate max-w-[200px]" title={release.title}>{release.title || "Untitled Release"}</div>
                                                <div className="text-xs text-slate-500 truncate max-w-[200px]">{release.primaryArtists[0] || "Unknown Artist"}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-white text-slate-600 border border-gray-200 whitespace-nowrap shadow-sm">
                                            <Music size={12} />
                                            {type}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-600 whitespace-nowrap">
                                        <div className="flex items-center gap-2">
                                            <Calendar size={14} className="text-slate-400" />
                                            {displayDate}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col gap-1.5">
                                            <div className="flex items-center gap-2 text-xs">
                                                <span className="font-bold text-slate-400 w-8">UPC</span>
                                                <span className={`font-mono px-1.5 py-0.5 rounded ${release.upc ? 'bg-slate-100 text-slate-700' : 'text-slate-300 italic'}`}>
                                                    {release.upc || "Pending"}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2 text-xs">
                                                <span className="font-bold text-slate-400 w-8">ISRC</span>
                                                <span className={`font-mono px-1.5 py-0.5 rounded ${isrcDisplay !== '-' ? 'bg-slate-100 text-slate-700' : 'text-slate-300 italic'}`}>
                                                    {isrcDisplay}
                                                </span>
                                            </div>
                                        </div>
                                    </td>
                                    {/* NEW AGGREGATOR COLUMN */}
                                    <td className="px-6 py-4">
                                        {release.aggregator ? (
                                            <div className="flex items-center gap-2 text-sm font-medium text-purple-700 bg-purple-50 px-3 py-1.5 rounded-lg border border-purple-100 w-fit">
                                                <Globe size={14} />
                                                {release.aggregator}
                                            </div>
                                        ) : (
                                            <span className="text-xs text-slate-300 italic">Not set</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col items-start gap-1">
                                            <span 
                                                title={rejectionTooltip}
                                                className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap border ${statusClass}`}
                                            >
                                                {status === 'Live' ? 'Released' : status}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button 
                                                onClick={() => onViewRelease(release)}
                                                className="flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-200 text-slate-600 hover:text-blue-600 hover:border-blue-300 rounded-lg transition-all text-xs font-bold shadow-sm whitespace-nowrap"
                                                title="View & Manage"
                                            >
                                                <Eye size={14} /> View
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            
            {sortedReleases.length === 0 && (
                <div className="p-16 text-center">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Filter size={24} className="text-slate-300" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-700 mb-1">No releases found</h3>
                    <p className="text-slate-400 text-sm">
                        {activeStatusTab === 'ALL' && searchQuery === ''
                            ? "You haven't created any releases yet." 
                            : `No results found for your current filter/search.`}
                    </p>
                </div>
            )}

            {/* Pagination Footer */}
            <div className="p-4 border-t border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50/50">
                <div className="flex items-center gap-4">
                     <span className="text-sm text-slate-500">
                        Showing {displayedReleases.length} of {totalItems} results
                     </span>
                     <button 
                        onClick={() => setIsViewAll(!isViewAll)}
                        className={`text-xs font-bold px-3 py-1.5 rounded-lg border flex items-center gap-2 transition-colors ${isViewAll ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-white text-slate-600 border-gray-200 hover:bg-slate-50'}`}
                     >
                        <List size={14} />
                        {isViewAll ? "Show Paged" : "View All"}
                     </button>
                </div>

                {!isViewAll && totalPages > 1 && (
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                            disabled={currentPage === 1}
                            className="p-2 rounded-lg border border-gray-200 bg-white text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
                        >
                            <ChevronLeft size={16} />
                        </button>
                        
                        <div className="flex items-center gap-1">
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                // Logic to show window of pages around current
                                let pageNum = i + 1;
                                if (totalPages > 5) {
                                    if (currentPage > 3) pageNum = currentPage - 2 + i;
                                    if (pageNum > totalPages) pageNum = pageNum - (pageNum - totalPages);
                                }
                                
                                return (
                                    <button
                                        key={pageNum}
                                        onClick={() => setCurrentPage(pageNum)}
                                        className={`w-8 h-8 rounded-lg text-sm font-bold flex items-center justify-center transition-colors
                                            ${currentPage === pageNum 
                                                ? 'bg-blue-600 text-white shadow-sm' 
                                                : 'text-slate-600 hover:bg-slate-100'}`}
                                    >
                                        {pageNum}
                                    </button>
                                );
                            })}
                        </div>

                        <button
                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                            disabled={currentPage === totalPages}
                            className="p-2 rounded-lg border border-gray-200 bg-white text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>
                )}
            </div>
        </div>
    </div>
  );
};
