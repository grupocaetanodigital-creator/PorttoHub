import React, { useState } from 'react';
import { TurnoCertoProvider, useTurnoCerto } from './lib/store';
import { TopBar } from './components/TopBar';
import { LoginScreen } from './components/LoginScreen';
import { FirstAccessCameraModal } from './components/FirstAccessCameraModal';
import { SupervisorDashboard } from './components/SupervisorDashboard';
import { FuncionarioHome } from './components/FuncionarioHome';
import { SupabaseModal } from './components/SupabaseModal';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

const AppContent: React.FC = () => {
  const { currentUser, notification, setNotification } = useTurnoCerto();
  const [supabaseModalOpen, setSupabaseModalOpen] = useState(false);

  // 1. Tela 01: Se não estiver logado, exibe tela de login
  if (!currentUser) {
    return (
      <>
        <LoginScreen onOpenSupabaseModal={() => setSupabaseModalOpen(true)} />
        <SupabaseModal
          isOpen={supabaseModalOpen}
          onClose={() => setSupabaseModalOpen(false)}
        />
      </>
    );
  }

  // 2. Tela 02: Se for primeiro acesso pendente, força abertura da câmera nativa
  const isPrimeiroAcessoPendente = !currentUser.primeiro_acesso_concluido;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
      {/* Top Bar seguindo o Top Bar Contract */}
      <TopBar onOpenSupabaseModal={() => setSupabaseModalOpen(true)} />

      {/* Floating Global Toast Notification */}
      {notification && (
        <div className="fixed top-20 right-4 z-50 max-w-sm w-full bg-slate-900 text-white rounded-xl shadow-xl border border-slate-700 p-3.5 flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
          {notification.type === 'success' && (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          )}
          {notification.type === 'error' && (
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          )}
          {notification.type === 'warning' && (
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          )}
          {notification.type === 'info' && (
            <Info className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
          )}
          <div className="flex-1 text-xs leading-relaxed">{notification.message}</div>
          <button
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Tela 02: Modal de Captura Facial de Identidade Obrigatória */}
      {isPrimeiroAcessoPendente && <FirstAccessCameraModal />}

      {/* Redirecionamento pelo Perfil */}
      <main className="flex-1 pb-12">
        {currentUser.role === 'supervisor' || currentUser.role === 'admin' ? (
          <SupervisorDashboard />
        ) : (
          <FuncionarioHome />
        )}
      </main>

      {/* Modal de Configuração e SQL do Supabase */}
      <SupabaseModal
        isOpen={supabaseModalOpen}
        onClose={() => setSupabaseModalOpen(false)}
      />
    </div>
  );
};

export default function App() {
  return (
    <TurnoCertoProvider>
      <AppContent />
    </TurnoCertoProvider>
  );
}
