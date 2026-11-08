import React, { useState } from 'react';
import { 
  Shield, 
  MapPin, 
  Clock, 
  CheckCircle2, 
  Receipt, 
  Calendar, 
  Building2, 
  LogOut, 
  ArrowLeft, 
  Eye, 
  Navigation,
  Compass
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Holerite } from '../../types';
import { HoleriteDocumentModal } from '../holerite/HoleriteDocumentModal';
import confetti from 'canvas-confetti';

export const CollaboratorView: React.FC = () => {
  const { 
    currentUser, 
    condominios, 
    colaboradores, 
    holerites, 
    turnos, 
    switchRoleView, 
    logout, 
    showToast 
  } = useApp();

  // Find collaborator entity
  const colabEntity = colaboradores.find(c => c.id === currentUser?.id) || colaboradores[0];
  const condo = condominios.find(c => c.id === colabEntity?.condominioId);
  const myTurno = turnos.find(t => t.colaboradorTitularId === colabEntity?.id || t.colaboradorAtualId === colabEntity?.id);

  // Filter holerites for this collaborator
  const myHolerites = holerites.filter(h => h.colaboradorId === colabEntity?.id && h.publicado);

  const [pontoRegistrado, setPontoRegistrado] = useState<boolean>(true);
  const [horaPonto, setHoraPonto] = useState<string>('06:58');
  const [viewingHolerite, setViewingHolerite] = useState<Holerite | null>(null);

  const handleBaterPonto = () => {
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    setHoraPonto(timeStr);
    setPontoRegistrado(true);
    showToast(`Ponto registrado com sucesso às ${timeStr} (GPS Dentro do Raio de ${condo?.raioGpsMetros || 60}m)`, 'success');
    try {
      confetti({ particleCount: 30, spread: 50, origin: { y: 0.6 } });
    } catch {
      // ignore
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Bar for Collaborator */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800/80 px-4 py-3">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <div className="flex items-center gap-3">
            <div className="relative">
              <img
                src={colabEntity?.fotoUrl || currentUser?.avatarUrl}
                alt={colabEntity?.nome}
                className="w-10 h-10 rounded-full object-cover ring-2 ring-emerald-500/40"
              />
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-slate-900 rounded-full" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                {colabEntity?.cargo || 'Colaborador Operacional'}
              </span>
              <h1 className="text-sm font-bold text-white tracking-tight">
                {colabEntity?.nome ? colabEntity.nome.split(' ')[0] : 'Colaborador'}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => switchRoleView('supervisor')}
              className="px-3 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-300 text-xs font-bold transition-colors"
            >
              Voltar ao Painel Supervisor
            </button>
            <button
              type="button"
              onClick={logout}
              className="h-9 px-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 hover:text-red-300 flex items-center gap-1.5 text-xs font-bold transition-colors cursor-pointer"
              title="Encerrar Sessão (Sair)"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sair</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-lg w-full mx-auto p-4 space-y-4 pb-20">
        {/* Ponto Eletrônico Mobile Card */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/40 rounded-3xl border border-emerald-500/30 p-5 shadow-xl text-center space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
            <CheckCircle2 className="w-4 h-4" />
            <span>Presença Confirmada via Geofencing</span>
          </div>

          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">Horário Atual</span>
            <div className="text-4xl font-black text-white font-mono tracking-tight mt-1">
              {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Último registro de entrada: <strong className="text-white">{horaPonto}</strong>
            </p>
          </div>

          <div className="bg-slate-950/80 rounded-2xl p-3 border border-slate-800 text-left text-xs space-y-1">
            <div className="flex items-center justify-between text-slate-400">
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                Posto: {condo?.nome || 'Central'}
              </span>
              <span className="text-emerald-400 font-bold">12m do raio</span>
            </div>
            <p className="text-[11px] text-slate-500 truncate">{condo?.endereco}</p>
          </div>

          <button
            type="button"
            onClick={handleBaterPonto}
            className="w-full min-h-[50px] rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
          >
            <Clock className="w-4 h-4" />
            <span>Registrar Ponto Eletrônico (GPS)</span>
          </button>
        </div>

        {/* Informações do Turno e Posto */}
        <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-4 space-y-2.5">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Building2 className="w-4 h-4 text-blue-400" />
            <span>Meu Posto Designado</span>
          </h3>
          <div className="text-xs space-y-1 text-slate-300">
            <p><strong>Condomínio:</strong> {condo?.nome}</p>
            <p><strong>Turno:</strong> 07:00 às 19:00 (12x36 Diurno)</p>
            <p><strong>Função:</strong> {colabEntity?.cargo}</p>
            <p><strong>Matrícula:</strong> {colabEntity?.matricula}</p>
          </div>
        </div>

        {/* Meus Holerites Publicados */}
        <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Receipt className="w-4 h-4 text-blue-400" />
              <span>Meus Demonstrativos (Holerites)</span>
            </h3>
            <span className="text-[11px] font-bold text-emerald-400">{myHolerites.length} disponíveis</span>
          </div>

          {myHolerites.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-4">
              Nenhum holerite publicado pelo RH para sua matrícula no momento.
            </p>
          ) : (
            <div className="space-y-2">
              {myHolerites.map((hol) => (
                <div
                  key={hol.id}
                  className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between"
                >
                  <div>
                    <span className="text-[10px] font-bold uppercase text-blue-400">Competência</span>
                    <p className="text-xs font-bold text-white">{hol.mesReferencia}</p>
                    <p className="text-[11px] text-slate-400">Líquido: R$ {hol.valorLiquido.toFixed(2)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setViewingHolerite(hol)}
                    className="px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 text-xs font-bold flex items-center gap-1.5 transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Ver Holerite</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Official Payslip Modal for Employee */}
      <HoleriteDocumentModal
        holerite={viewingHolerite}
        colaborador={colabEntity}
        condominio={condo}
        onClose={() => setViewingHolerite(null)}
      />
    </div>
  );
};
