
import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Footer } from './components/Footer';
import { ReleaseTypeSelection } from './screens/ReleaseTypeSelection';
import { ReleaseWizard } from './screens/ReleaseWizard';
import { AllReleases } from './screens/AllReleases';
import { Dashboard } from './screens/Dashboard'; 
import { Statistics } from './screens/Statistics'; 
import { Contracts } from './screens/Contracts';
import { Settings } from './screens/Settings';
import { LoginScreen } from './screens/LoginScreen'; 
import { ReleaseDetailModal } from './components/ReleaseDetailModal';
import { ReleaseType, ReleaseData, Contract } from './types';
import { Menu, Bell, User, LogOut, AlertTriangle, Loader2 } from 'lucide-react';
import { getAllReleases } from './services/googleService';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isAuthChecking, setIsAuthChecking] = useState<boolean>(true);
  const [currentUser, setCurrentUser] = useState<string>('');
  const [isLoadingData, setIsLoadingData] = useState<boolean>(false);
  
  const [showLogoutDialog, setShowLogoutDialog] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>('DASHBOARD');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [allReleases, setAllReleases] = useState<ReleaseData[]>([]);
  const [allContracts, setAllContracts] = useState<Contract[]>([]);
  const [aggregators, setAggregators] = useState<string[]>(["LokaMusik", "SoundOn", "Tunecore", "Believe"]);
  
  const [wizardStep, setWizardStep] = useState<'SELECTION' | 'WIZARD'>('SELECTION');
  const [releaseType, setReleaseType] = useState<ReleaseType | null>(null);
  const [editingRelease, setEditingRelease] = useState<ReleaseData | null>(null); 
  const [viewingRelease, setViewingRelease] = useState<ReleaseData | null>(null); 

  // Fetch data dari Database
  const refreshData = async () => {
    if (!isAuthenticated) return;
    setIsLoadingData(true);
    try {
        const releases = await getAllReleases();
        setAllReleases(releases);
        
        const contractRes = await fetch('/api/contracts');
        if (contractRes.ok) {
            const data = await contractRes.json();
            // PENTING: Map data agar tidak crash di komponen Contracts
            const mappedContracts: Contract[] = data.map((item: any) => ({
                id: item.id.toString(),
                contractNumber: item.contract_number,
                artistName: item.artist_name,
                startDate: item.start_date ? item.start_date.split('T')[0] : '',
                endDate: item.end_date ? item.end_date.split('T')[0] : '',
                durationYears: item.duration_years,
                royaltyRate: item.royalty_rate,
                status: item.status,
                createdDate: item.created_at ? item.created_at.split('T')[0] : '',
                ktpFile: null, npwpFile: null, signatureFile: null
            }));
            setAllContracts(mappedContracts);
        }
    } catch (err) {
        console.error("Gagal memuat data dari database:", err);
    } finally {
        setIsLoadingData(false);
    }
  };

  useEffect(() => {
    const storedAuth = localStorage.getItem('cms_auth');
    const storedUser = localStorage.getItem('cms_user');
    if (storedAuth === 'true') {
      setIsAuthenticated(true);
      if (storedUser) setCurrentUser(storedUser);
    }
    setIsAuthChecking(false);
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
        refreshData();
    }
  }, [isAuthenticated]);

  const handleLogin = (username: string) => {
    localStorage.setItem('cms_auth', 'true');
    localStorage.setItem('cms_user', username);
    setCurrentUser(username);
    setIsAuthenticated(true);
  };

  const confirmLogout = () => {
    localStorage.removeItem('cms_auth');
    localStorage.removeItem('cms_user');
    setIsAuthenticated(false);
    setShowLogoutDialog(false);
  };

  const handleSidebarNavigate = (tab: string) => {
    setActiveTab(tab);
    setIsMobileMenuOpen(false);
    setViewingRelease(null);
    if (tab === 'NEW') {
      setWizardStep('SELECTION');
      setReleaseType(null);
      setEditingRelease(null);
    }
  };

  const handleSaveRelease = async (data: ReleaseData) => {
      await refreshData();
      setActiveTab('ALL'); 
      setViewingRelease(null);
  };

  if (isAuthChecking) return null;
  if (!isAuthenticated) return <LoginScreen onLogin={handleLogin} />;

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100 font-sans">
      <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="md:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-md text-slate-700">
        <Menu size={24} />
      </button>

      <div className={`fixed inset-0 z-40 transform transition-transform duration-300 md:relative md:translate-x-0 md:w-auto ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
         <Sidebar activeTab={activeTab} onNavigate={handleSidebarNavigate} currentUser={currentUser} />
         <div className={`absolute inset-0 bg-black/50 -z-10 md:hidden ${isMobileMenuOpen ? 'block' : 'hidden'}`} onClick={() => setIsMobileMenuOpen(false)}></div>
      </div>

      <main className="flex-1 w-full md:ml-0 overflow-x-hidden min-h-screen flex flex-col relative">
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-white/50 px-6 py-4 flex items-center justify-between shadow-sm">
            <h2 className="text-xl font-bold text-slate-800 tracking-tight hidden md:block">Dimensi Suara CMS</h2>
            <div className="flex items-center gap-6">
                {isLoadingData && <Loader2 className="animate-spin text-blue-500" size={18} />}
                <button onClick={() => setShowLogoutDialog(true)} className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl font-bold text-xs transition-colors">
                    <LogOut size={16} /> Logout
                </button>
            </div>
        </header>

        <div className="flex-1">
          {activeTab === 'DASHBOARD' && <Dashboard releases={allReleases} onViewRelease={setViewingRelease} onNavigateToAll={() => setActiveTab('ALL')} />}
          {activeTab === 'STATISTICS' && <Statistics releases={allReleases} />}
          {activeTab.startsWith('CONTRACT') && <Contracts activeTab={activeTab} contracts={allContracts} setContracts={setAllContracts} />}
          {activeTab === 'NEW' && (
            <>
              {wizardStep === 'SELECTION' && <ReleaseTypeSelection onSelect={(t) => {setReleaseType(t); setWizardStep('WIZARD');}} />}
              {wizardStep === 'WIZARD' && releaseType && <ReleaseWizard type={releaseType} onBack={() => setWizardStep('SELECTION')} onSave={handleSaveRelease} initialData={editingRelease} />}
            </>
          )}
          {activeTab === 'ALL' && !viewingRelease && <AllReleases releases={allReleases} onViewRelease={setViewingRelease} onUpdateRelease={refreshData} availableAggregators={aggregators} />}
          {viewingRelease && <ReleaseDetailModal release={viewingRelease} isOpen={true} onClose={() => setViewingRelease(null)} onUpdate={refreshData} availableAggregators={aggregators} />}
          {activeTab === 'SETTINGS' && <Settings aggregators={aggregators} setAggregators={setAggregators} />}
        </div>
        <Footer />
        
        {showLogoutDialog && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowLogoutDialog(false)}></div>
                <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm relative z-10 animate-fade-in-up border border-white">
                    <h3 className="text-xl font-bold text-slate-800 text-center mb-2">Logout</h3>
                    <p className="text-slate-500 text-center text-sm mb-8">Yakin ingin keluar?</p>
                    <div className="flex gap-3">
                        <button onClick={() => setShowLogoutDialog(false)} className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 font-bold rounded-xl text-sm">Batal</button>
                        <button onClick={confirmLogout} className="flex-1 px-4 py-2.5 bg-red-600 text-white font-bold rounded-xl text-sm">Keluar</button>
                    </div>
                </div>
            </div>
        )}
      </main>
    </div>
  );
};

export default App;
