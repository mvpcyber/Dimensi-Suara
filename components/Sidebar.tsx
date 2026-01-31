
import React from 'react';
import { PlusCircle, ListMusic, Music4, Settings, LayoutDashboard, BarChart3, FileSignature } from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  onNavigate: (tab: string) => void;
  currentUser: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onNavigate, currentUser }) => {
  return (
    <aside className="w-64 bg-white/80 backdrop-blur-xl border-r border-white/50 min-h-screen flex flex-col shadow-lg shadow-blue-900/5 transition-all duration-300 hidden md:flex sticky top-0">
      {/* Brand Logo */}
      <div className="h-20 flex items-center px-8 border-b border-gray-100 flex-shrink-0">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center text-white mr-3 shadow-lg shadow-blue-500/30">
          <Music4 size={24} />
        </div>
        <span className="font-bold text-xl text-slate-800 tracking-tight">Dimensi Suara</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-8 px-4 space-y-8 overflow-y-auto">
        
        {/* Main Menu */}
        <div>
          <h3 className="px-4 text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
            Menu Utama
          </h3>
          <ul className="space-y-2">
            <li>
              <button
                onClick={() => onNavigate('DASHBOARD')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group font-medium text-sm
                  ${activeTab === 'DASHBOARD' 
                    ? 'bg-blue-50 text-blue-600 shadow-sm ring-1 ring-blue-100' 
                    : 'text-slate-600 hover:bg-gray-50 hover:text-slate-900'}`}
              >
                <LayoutDashboard size={20} className={activeTab === 'DASHBOARD' ? 'text-blue-500' : 'text-slate-400 group-hover:text-slate-600'} />
                Dashboard
              </button>
            </li>
            <li>
              <button
                onClick={() => onNavigate('NEW')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group font-medium text-sm
                  ${activeTab === 'NEW' 
                    ? 'bg-blue-50 text-blue-600 shadow-sm ring-1 ring-blue-100' 
                    : 'text-slate-600 hover:bg-gray-50 hover:text-slate-900'}`}
              >
                <PlusCircle size={20} className={activeTab === 'NEW' ? 'text-blue-500' : 'text-slate-400 group-hover:text-slate-600'} />
                New Release
              </button>
            </li>
            <li>
              <button
                onClick={() => onNavigate('ALL')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group font-medium text-sm
                  ${activeTab === 'ALL' 
                    ? 'bg-blue-50 text-blue-600 shadow-sm ring-1 ring-blue-100' 
                    : 'text-slate-600 hover:bg-gray-50 hover:text-slate-900'}`}
              >
                <ListMusic size={20} className={activeTab === 'ALL' ? 'text-blue-500' : 'text-slate-400 group-hover:text-slate-600'} />
                All Release
              </button>
            </li>
             <li>
              <button
                onClick={() => onNavigate('STATISTICS')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group font-medium text-sm
                  ${activeTab === 'STATISTICS' 
                    ? 'bg-blue-50 text-blue-600 shadow-sm ring-1 ring-blue-100' 
                    : 'text-slate-600 hover:bg-gray-50 hover:text-slate-900'}`}
              >
                <BarChart3 size={20} className={activeTab === 'STATISTICS' ? 'text-blue-500' : 'text-slate-400 group-hover:text-slate-600'} />
                Statistik
              </button>
            </li>
          </ul>
        </div>

        {/* Kontrak Menu */}
        <div>
          <h3 className="px-4 text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
            Kontrak
          </h3>
          <ul className="space-y-2">
            <li>
              <button
                onClick={() => onNavigate('CONTRACT_NEW')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group font-medium text-sm
                  ${activeTab === 'CONTRACT_NEW' 
                    ? 'bg-blue-50 text-blue-600 shadow-sm ring-1 ring-blue-100' 
                    : 'text-slate-600 hover:bg-gray-50 hover:text-slate-900'}`}
              >
                <PlusCircle size={20} className={activeTab === 'CONTRACT_NEW' ? 'text-blue-500' : 'text-slate-400 group-hover:text-slate-600'} />
                Kontrak Baru
              </button>
            </li>
            <li>
              <button
                onClick={() => onNavigate('CONTRACT_ALL')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group font-medium text-sm
                  ${activeTab === 'CONTRACT_ALL' 
                    ? 'bg-blue-50 text-blue-600 shadow-sm ring-1 ring-blue-100' 
                    : 'text-slate-600 hover:bg-gray-50 hover:text-slate-900'}`}
              >
                <FileSignature size={20} className={activeTab === 'CONTRACT_ALL' ? 'text-blue-500' : 'text-slate-400 group-hover:text-slate-600'} />
                Semua Kontrak
              </button>
            </li>
          </ul>
        </div>

        {/* Settings */}
        <div>
          <h3 className="px-4 text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
            Pengaturan
          </h3>
          <ul className="space-y-2">
            <li>
              <button 
                onClick={() => onNavigate('SETTINGS')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group font-medium text-sm
                  ${activeTab === 'SETTINGS' 
                    ? 'bg-blue-50 text-blue-600 shadow-sm ring-1 ring-blue-100' 
                    : 'text-slate-600 hover:bg-gray-50 hover:text-slate-900'}`}
              >
                <Settings size={20} className={activeTab === 'SETTINGS' ? 'text-blue-500' : 'text-slate-400 group-hover:text-slate-600'} />
                Settings
              </button>
            </li>
          </ul>
        </div>
      </nav>
    </aside>
  );
};
