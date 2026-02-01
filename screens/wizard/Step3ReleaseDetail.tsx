
import React, { useState, useEffect } from 'react';
import { ReleaseData } from '../../types';
import { TextInput } from '../../components/Input';
import { Calendar, Globe, Check, Lightbulb, HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { PLATFORM_DOMAINS, SOCIAL_PLATFORMS } from '../../constants';

interface Props {
  data: ReleaseData;
  updateData: (updates: Partial<ReleaseData>) => void;
}

export const Step3ReleaseDetail: React.FC<Props> = ({ data, updateData }) => {
  const [isDistExpanded, setIsDistExpanded] = useState(false);
  const [dbPlatforms, setDbPlatforms] = useState<string[]>([]);

  useEffect(() => {
      const fetchPlatforms = async () => {
          try {
              const res = await fetch('/api/platforms');
              if(res.ok) {
                  const items = await res.json();
                  if(Array.isArray(items)) {
                      setDbPlatforms(items.map((i: any) => i.name));
                  }
              }
          } catch(e) { console.error("Failed to load platforms", e); }
      };
      fetchPlatforms();
  }, []);
  
  const togglePlatform = (platform: string) => {
    const current = data.selectedPlatforms || [];
    if (current.includes(platform)) {
      updateData({ selectedPlatforms: current.filter(p => p !== platform) });
    } else {
      updateData({ selectedPlatforms: [...current, platform] });
    }
  };

  const toggleAllPlatforms = () => {
    const current = data.selectedPlatforms || [];
    if (current.length === dbPlatforms.length) {
      updateData({ selectedPlatforms: [] });
    } else {
      updateData({ selectedPlatforms: [...dbPlatforms] });
    }
  };

  const toggleSocialPlatform = (id: string, isSelected: boolean) => {
      // Disable edit for TikTok and Douyin
      if (id === 'TikTok' || id === 'Douyin') return;

      const current = data.socialPlatforms || [];
      if (isSelected) {
          updateData({ socialPlatforms: [...current, id] });
      } else {
          updateData({ socialPlatforms: current.filter(p => p !== id) });
      }
  };

  const toggleSocialGroup = (ids: string[], shouldSelect: boolean) => {
      const lockedIds = ['TikTok', 'Douyin'];
      const current = data.socialPlatforms || [];
      
      if (shouldSelect) {
          const toAdd = ids.filter(id => !current.includes(id));
          updateData({ socialPlatforms: [...current, ...toAdd] });
      } else {
          // Only remove non-locked IDs
          const idsToRemove = ids.filter(id => !lockedIds.includes(id));
          updateData({ socialPlatforms: current.filter(p => !idsToRemove.includes(p)) });
      }
  };

  const renderSocialGroup = (title: string, items: typeof SOCIAL_PLATFORMS.IN_HOUSE) => {
      const selectedCount = items.filter(i => data.socialPlatforms?.includes(i.id)).length;
      const allSelected = selectedCount === items.length;
      const groupIds = items.map(i => i.id);

      return (
        <div className="border border-gray-200 rounded-xl p-5 mb-4 bg-white shadow-sm">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-50">
                <label className="flex items-center gap-3 cursor-pointer select-none">
                    <div className={`w-5 h-5 rounded border transition-colors flex items-center justify-center
                        ${allSelected ? 'bg-slate-800 border-slate-800' : 'bg-gray-100 border-gray-300 hover:border-gray-400'}
                    `}>
                        {allSelected && <Check size={14} className="text-white" strokeWidth={3} />}
                        {!allSelected && selectedCount > 0 && <div className="w-2.5 h-2.5 bg-slate-400 rounded-sm" />}
                    </div>
                    <input 
                        type="checkbox" 
                        className="hidden"
                        checked={allSelected}
                        onChange={() => toggleSocialGroup(groupIds, !allSelected)}
                    />
                    <span className="font-bold text-slate-700 text-sm">{title}</span>
                </label>
                <span className="text-xs font-medium text-slate-500">{selectedCount} selected</span>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {items.map(p => {
                    const isSelected = data.socialPlatforms?.includes(p.id);
                    const isLocked = p.id === 'TikTok' || p.id === 'Douyin';
                    const logoUrl = `https://logo.clearbit.com/${p.domain}`;
                    
                    return (
                        <div 
                            key={p.id} 
                            onClick={() => toggleSocialPlatform(p.id, !isSelected)}
                            className={`flex items-center p-2 rounded-lg transition-colors group select-none
                                ${isLocked ? 'cursor-not-allowed opacity-80' : 'cursor-pointer hover:bg-slate-50'}
                            `}
                        >
                            <div className={`
                                w-5 h-5 rounded flex items-center justify-center border-2 mr-3 transition-all shrink-0
                                ${isSelected 
                                    ? (isLocked ? 'bg-gray-300 border-gray-300' : 'bg-slate-800 border-slate-800') 
                                    : 'border-gray-200 bg-white group-hover:border-gray-300'}
                            `}>
                                {isSelected && <Check size={14} className="text-white" strokeWidth={3} />}
                            </div>
                            
                            <div className="w-8 h-8 rounded-lg bg-white mr-3 flex-shrink-0 overflow-hidden flex items-center justify-center border border-gray-100">
                                <img 
                                    src={logoUrl} 
                                    alt={p.name}
                                    className={`w-full h-full object-contain ${isLocked ? 'grayscale opacity-70' : ''}`}
                                    onError={(e) => {
                                        const parent = e.currentTarget.parentElement;
                                        if (parent) {
                                            e.currentTarget.style.display = 'none';
                                            parent.innerText = p.name.charAt(0);
                                            parent.className += " font-bold text-slate-400 text-xs";
                                        }
                                    }}
                                />
                            </div>
                            
                            <span className={`font-bold text-sm mr-2 ${isLocked ? 'text-slate-400' : 'text-slate-700'}`}>
                                {p.name}
                            </span>
                            
                            {'helpText' in p && (
                                <div className="group/tooltip relative">
                                    <HelpCircle size={14} className="text-slate-300 hover:text-slate-500 transition-colors" />
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-800 text-white text-[10px] rounded opacity-0 group-hover/tooltip:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                                        {(p as any).helpText}
                                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800"></div>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
      );
  };

  const renderDistributionSection = () => {
      const selectedCount = data.selectedPlatforms?.length || 0;
      const totalCount = dbPlatforms.length;
      const allSelected = selectedCount === totalCount && totalCount > 0;

      return (
        <div className="border border-gray-200 rounded-xl p-5 bg-white shadow-sm animate-fade-in">
            <div className="flex justify-between items-center mb-1">
                <div className="flex items-center gap-3">
                    <label className="flex items-center gap-3 cursor-pointer select-none">
                        <div className={`w-5 h-5 rounded border transition-colors flex items-center justify-center
                            ${allSelected ? 'bg-blue-600 border-blue-600' : 'bg-gray-100 border-gray-300 hover:border-gray-400'}
                        `}>
                            {allSelected && <Check size={14} className="text-white" strokeWidth={3} />}
                            {!allSelected && selectedCount > 0 && <div className="w-2.5 h-2.5 bg-blue-400 rounded-sm" />}
                        </div>
                        <input 
                            type="checkbox" 
                            className="hidden"
                            checked={allSelected}
                            onChange={toggleAllPlatforms}
                        />
                        <div className="flex items-center gap-2">
                            <Globe size={18} className="text-blue-600" />
                            <span className="font-bold text-slate-800 text-lg">Distribution Platforms</span>
                        </div>
                    </label>
                </div>
                
                <div className="flex items-center gap-4">
                    <button 
                        onClick={toggleAllPlatforms}
                        className="text-xs font-bold text-blue-600 hover:text-blue-800"
                    >
                        {allSelected ? "Deselect All" : "Select All"}
                    </button>
                    
                    <div className="h-4 w-px bg-gray-200"></div>
                    
                    <span className="text-xs font-medium text-slate-500 min-w-[70px] text-right">
                        {selectedCount} selected
                    </span>

                    <button 
                        onClick={() => setIsDistExpanded(!isDistExpanded)}
                        className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
                    >
                        {isDistExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </button>
                </div>
            </div>

            {isDistExpanded && (
                <div className="mt-5 pt-5 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fade-in">
                    {dbPlatforms.map((platform) => {
                    const isSelected = data.selectedPlatforms?.includes(platform);
                    const domain = PLATFORM_DOMAINS[platform];
                    const logoUrl = domain ? `https://logo.clearbit.com/${domain}` : null;

                    return (
                        <div 
                            key={platform}
                            onClick={() => togglePlatform(platform)}
                            className="flex items-center p-2 rounded-lg cursor-pointer transition-colors hover:bg-slate-50 group select-none"
                        >
                            {/* Checkbox */}
                            <div className={`
                                w-5 h-5 rounded flex items-center justify-center border-2 mr-4 transition-all shrink-0
                                ${isSelected ? 'bg-slate-800 border-slate-800' : 'border-gray-300 bg-white group-hover:border-slate-400'}
                            `}>
                                {isSelected && <Check size={14} className="text-white" strokeWidth={3} />}
                            </div>

                            {/* Logo */}
                            <div className="w-8 h-8 rounded-lg bg-white mr-4 flex-shrink-0 overflow-hidden flex items-center justify-center border border-gray-100 shadow-sm">
                                {logoUrl ? (
                                    <img 
                                        src={logoUrl} 
                                        alt={platform}
                                        className="w-full h-full object-contain"
                                        onError={(e) => {
                                            const parent = e.currentTarget.parentElement;
                                            if (parent) {
                                                e.currentTarget.style.display = 'none';
                                                parent.innerText = platform.charAt(0);
                                                parent.className += " font-bold text-slate-400 text-xs";
                                            }
                                        }}
                                    />
                                ) : (
                                    <span className="font-bold text-slate-400 text-xs">{platform.charAt(0)}</span>
                                )}
                            </div>

                            {/* Name */}
                            <span className="text-slate-700 font-medium text-sm">{platform}</span>
                        </div>
                    );
                    })}
                    {dbPlatforms.length === 0 && <p className="col-span-2 text-center text-sm text-slate-400 italic py-4">No platforms available. Add them in Settings.</p>}
                    <div className="col-span-1 sm:col-span-2 mt-4 pt-2 border-t border-gray-50">
                        <p className="text-xs text-slate-400 text-center">Your music will be delivered to the selected stores upon approval.</p>
                    </div>
                </div>
            )}
        </div>
      );
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-bold text-slate-800 mb-2">Release Specifics</h2>
        <p className="text-slate-500">Distribution details and dates.</p>
      </div>

      <div className="bg-white rounded-2xl p-8 mb-8 border border-gray-100 shadow-sm">
        <label className="block text-base font-bold text-slate-700 mb-4 flex items-center gap-2">
            <Globe size={18} className="text-blue-500" />
            Previous Distribution
        </label>
        
        <div className="space-y-3">
            <label className={`flex items-center p-4 rounded-xl border-2 cursor-pointer transition-all ${data.isNewRelease ? 'border-blue-500 bg-blue-50/50' : 'border-gray-100 hover:border-blue-200'}`}>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mr-3 ${data.isNewRelease ? 'border-blue-500' : 'border-gray-300'}`}>
                    {data.isNewRelease && <div className="w-2.5 h-2.5 rounded-full bg-blue-500"></div>}
                </div>
                <input 
                    type="radio" 
                    name="releaseType" 
                    checked={data.isNewRelease === true} 
                    onChange={() => updateData({ isNewRelease: true })}
                    className="hidden"
                />
                <span className={`font-medium ${data.isNewRelease ? 'text-blue-900' : 'text-slate-600'}`}>No, this is a brand new release</span>
            </label>
            
            <label className={`flex items-center p-4 rounded-xl border-2 cursor-pointer transition-all ${!data.isNewRelease ? 'border-blue-500 bg-blue-50/50' : 'border-gray-100 hover:border-blue-200'}`}>
                 <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mr-3 ${!data.isNewRelease ? 'border-blue-500' : 'border-gray-300'}`}>
                    {!data.isNewRelease && <div className="w-2.5 h-2.5 rounded-full bg-blue-500"></div>}
                </div>
                <input 
                    type="radio" 
                    name="releaseType" 
                    checked={data.isNewRelease === false}
                    onChange={() => updateData({ isNewRelease: false })}
                    className="hidden"
                />
                <span className={`font-medium ${!data.isNewRelease ? 'text-blue-900' : 'text-slate-600'}`}>Yes, this album has been released before</span>
            </label>
        </div>
      </div>

      {!data.isNewRelease && (
        <div className="mb-6 animate-fade-in-down">
             <label className="block text-sm font-bold text-slate-700 mb-2">Original Release Date</label>
             <input 
                type="date" 
                value={data.originalReleaseDate}
                onChange={(e) => updateData({ originalReleaseDate: e.target.value })}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
             />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Planned Release Date</label>
            <div className="relative group">
                <input 
                    type="date" 
                    value={data.plannedReleaseDate}
                    onChange={(e) => updateData({ plannedReleaseDate: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 shadow-sm transition-all"
                />
                <Calendar className="absolute right-4 top-3.5 text-blue-500 pointer-events-none group-hover:scale-110 transition-transform" size={18} />
            </div>
            <p className="text-xs text-blue-400 mt-2 font-medium">Recommended: 14 days from today</p>
        </div>
      </div>

      {/* TikTok Pre-release */}
      <div className="mb-8 pt-8 border-t border-gray-100">
        <div className="flex items-center gap-2 mb-4">
            <h3 className="font-bold text-slate-800 text-lg">TikTok pre-release</h3>
            <Lightbulb size={16} className="text-slate-400" />
        </div>

        <div className={`rounded-xl border-2 transition-all p-5 mb-3 ${data.tiktokPreRelease ? 'border-slate-800 ring-1 ring-slate-200' : 'border-gray-200'}`}>
            <label className="flex items-start gap-3 cursor-pointer">
                 <div className={`mt-1 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${data.tiktokPreRelease ? 'border-slate-800' : 'border-gray-300'}`}>
                    {data.tiktokPreRelease && <div className="w-2.5 h-2.5 rounded-full bg-slate-800"></div>}
                </div>
                <input 
                    type="radio" 
                    name="tiktok" 
                    className="hidden"
                    checked={data.tiktokPreRelease === true}
                    onChange={() => updateData({ tiktokPreRelease: true })}
                />
                <div className="flex-1">
                    <span className="font-bold text-slate-800">Turn on TikTok pre-release</span>
                    <p className="text-sm text-slate-500 mt-1">Tease unreleased songs with 15-60s TikTok song clips and drive pre-saves to streaming platforms.</p>
                    
                    {data.tiktokPreRelease && (
                        <div className="mt-4 space-y-4 animate-fade-in">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Pre-release date</label>
                                <div className="relative">
                                    <input 
                                        type="date"
                                        value={data.tiktokPreReleaseDate || ''}
                                        onChange={(e) => updateData({ tiktokPreReleaseDate: e.target.value })} 
                                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-slate-800"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Pre-release time</label>
                                <div className="relative">
                                    <input 
                                        type="time"
                                        value={data.tiktokPreReleaseTime || ''}
                                        onChange={(e) => updateData({ tiktokPreReleaseTime: e.target.value })} 
                                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-slate-800"
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </label>
        </div>

        <div className={`rounded-xl border-2 transition-all p-4 ${data.tiktokPreRelease === false ? 'border-gray-300' : 'border-gray-100 hover:border-gray-200'}`}>
            <label className="flex items-center gap-3 cursor-pointer">
                 <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${data.tiktokPreRelease === false ? 'border-gray-400' : 'border-gray-300'}`}>
                    {data.tiktokPreRelease === false && <div className="w-2.5 h-2.5 rounded-full bg-gray-400"></div>}
                </div>
                <input 
                    type="radio" 
                    name="tiktok" 
                    className="hidden"
                    checked={data.tiktokPreRelease === false}
                    onChange={() => updateData({ tiktokPreRelease: false })}
                />
                <span className="font-bold text-slate-600">Skip for now</span>
            </label>
        </div>
      </div>

      {/* Social Platforms */}
      <div className="mb-8 pt-8 border-t border-gray-100">
          <div className="flex items-center gap-2 mb-6">
             <h3 className="font-bold text-slate-800 text-lg">Social platforms</h3>
          </div>
          
          {renderSocialGroup("In-house partners", SOCIAL_PLATFORMS.IN_HOUSE)}
          {renderSocialGroup("External partners", SOCIAL_PLATFORMS.EXTERNAL)}
      </div>

      {/* DISTRIBUTION PLATFORMS */}
      <div className="mt-8 pt-8 border-t border-gray-100">
        {renderDistributionSection()}
      </div>
    </div>
  );
};
