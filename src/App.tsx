import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { LoginScreen } from './components/login/LoginScreen';
import { TopBar } from './components/common/TopBar';
import { BottomNav } from './components/common/BottomNav';
import { OperacaoTab } from './components/tabs/OperacaoTab';
import { EquipeTab } from './components/tabs/EquipeTab';
import { PostosTab } from './components/tabs/PostosTab';
import { MatrizTab } from './components/tabs/MatrizTab';
import { HoleriteTab } from './components/tabs/HoleriteTab';
import { FTCoverageModal } from './components/modals/FTCoverageModal';
import { SupabaseSettingsModal } from './components/modals/SupabaseSettingsModal';
import { ChangePasswordModal } from './components/modals/ChangePasswordModal';
import { ToastContainer } from './components/ui/Toast';
import { CollaboratorView } from './components/collaborator/CollaboratorView';
import { Smartphone, Monitor } from 'lucide-react';

const MainLayout: React.FC = () => {
  const { 
    currentUser, 
    activeTab, 
    isMobileFrame, 
    setIsMobileFrame, 
    isChangePasswordModalOpen, 
    setIsChangePasswordModalOpen 
  } = useApp();
  const [supabaseModalOpen, setSupabaseModalOpen] = useState(false);

  // If not logged in, show Login Screen
  if (!currentUser) {
    return <LoginScreen />;
  }

  // If logged in as Operational Collaborator, render collaborator view
  if (currentUser.role === 'operacional') {
    return (
      <>
        <CollaboratorView />
        <ToastContainer />
      </>
    );
  }

  // Supervisor / Gestor / RH Main Dashboard View
  const renderActiveTab = () => {
    switch (activeTab) {
      case 'operacao':
        return <OperacaoTab />;
      case 'equipe':
        return <EquipeTab />;
      case 'postos':
        return <PostosTab />;
      case 'matriz':
        return <MatrizTab />;
      case 'holerite':
        return <HoleriteTab />;
      default:
        return <OperacaoTab />;
    }
  };

  const appContent = (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans relative selection:bg-blue-600 selection:text-white">
      {/* Top Bar Fixo */}
      <TopBar onOpenSupabaseConfig={() => setSupabaseModalOpen(true)} />

      {/* Main Content Area */}
      <main className="flex-1 max-w-lg w-full mx-auto px-4 pt-4 pb-24">
        {renderActiveTab()}
      </main>

      {/* Fixed Bottom Navigation Bar */}
      <BottomNav />

      {/* Global FTCoverage Modal */}
      <FTCoverageModal />

      {/* Supabase Settings / DDL Schema Modal */}
      <SupabaseSettingsModal
        isOpen={supabaseModalOpen}
        onClose={() => setSupabaseModalOpen(false)}
      />

      {/* Trocar Senha Modal */}
      <ChangePasswordModal
        isOpen={isChangePasswordModalOpen}
        onClose={() => setIsChangePasswordModalOpen(false)}
      />

      {/* Toast Alert Notifications */}
      <ToastContainer />
    </div>
  );

  // If user enabled mobile bezel device frame simulation
  if (isMobileFrame) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
        {/* Toggle Bar */}
        <div className="mb-4 flex items-center gap-3 bg-slate-800/90 border border-slate-700 px-4 py-2 rounded-2xl shadow-lg">
          <span className="text-xs font-semibold text-slate-300">
            Simulador de Smartphone (PWA Mobile-First)
          </span>
          <button
            type="button"
            onClick={() => setIsMobileFrame(false)}
            className="px-3 py-1 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white transition-colors"
          >
            Expandir Tela Cheia
          </button>
        </div>

        {/* iPhone / Smartphone Bezel Frame */}
        <div className="w-full max-w-[420px] h-[860px] bg-black rounded-[52px] p-3 ring-8 ring-slate-800/80 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] relative flex flex-col overflow-hidden border border-slate-700/50">
          {/* Dynamic Island / Speaker Pill */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 w-28 h-5 bg-black rounded-full z-50 flex items-center justify-center">
            <div className="w-2.5 h-2.5 rounded-full bg-slate-900 ml-auto mr-3 ring-1 ring-slate-800" />
          </div>

          {/* Screen Content */}
          <div className="w-full h-full rounded-[42px] overflow-hidden overflow-y-auto overscroll-contain relative bg-slate-950 flex flex-col">
            {appContent}
          </div>
        </div>
      </div>
    );
  }

  // Native Fullscreen Mobile-First PWA (Default)
  return appContent;
};

export default function App() {
  return (
    <AppProvider>
      <MainLayout />
    </AppProvider>
  );
}
