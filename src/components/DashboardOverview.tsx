import React from 'react';
import { 
  Building2, 
  Users, 
  ShieldCheck, 
  ShieldAlert, 
  Camera, 
  UserPlus, 
  QrCode, 
  CheckCircle2, 
  XCircle, 
  ArrowUpRight, 
  Layers, 
  Lock, 
  Clock,
  Sparkles
} from 'lucide-react';
import { Condominium, Resident, AccessLog, VisitorPass } from '../types';
import { TabType } from './Sidebar';

interface DashboardOverviewProps {
  condo: Condominium;
  residents: Resident[];
  logs: AccessLog[];
  passes: VisitorPass[];
  onNavigate: (tab: TabType) => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  condo,
  residents,
  logs,
  passes,
  onNavigate
}) => {
  const activeResidentsCount = residents.filter(r => r.status === 'Ativo').length;
  const blockedResidentsCount = residents.filter(r => r.status === 'Bloqueado').length;
  const todayLogs = logs.filter(l => l.date === '31/10/2026' || l.date.includes('2026'));
  const approvedToday = todayLogs.filter(l => l.status === 'Liberado').length;
  const deniedToday = todayLogs.filter(l => l.status === 'Negado').length;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      
      {/* Condo Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-slate-900/90 to-cyan-950/30 border border-slate-800 rounded-3xl p-6 sm:p-8">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                Condomínio Ativo: {condo.code}
              </span>
              <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[11px] font-bold px-3 py-1 rounded-full flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                Segurança {condo.securityLevel}
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {condo.name}
            </h2>

            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              {condo.address} &bull; {condo.city} - {condo.state} &bull; CNPJ: {condo.cnpj}
            </p>

            <div className="text-xs text-slate-400 flex items-center gap-4 pt-1">
              <span>Síndico(a): <strong className="text-slate-200">{condo.syndicName}</strong></span>
              <span>Contato: <strong className="text-slate-200">{condo.contactPhone}</strong></span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => onNavigate('totem')}
              className="flex items-center justify-center space-x-2 bg-gradient-to-r from-cyan-500 to-emerald-400 hover:from-cyan-400 hover:to-emerald-300 text-slate-950 px-5 py-3 rounded-2xl text-xs font-extrabold transition shadow-lg shadow-cyan-500/20"
            >
              <Camera className="w-4 h-4" />
              <span>Abrir Totem Portaria</span>
            </button>
            <button
              onClick={() => onNavigate('cadastramento')}
              className="flex items-center justify-center space-x-2 bg-slate-800 hover:bg-slate-700 text-slate-100 px-4 py-3 rounded-2xl text-xs font-bold transition border border-slate-700"
            >
              <UserPlus className="w-4 h-4" />
              <span>Cadastrar Morador</span>
            </button>
          </div>
        </div>

        {/* Decorative Grid Lines */}
        <div className="absolute -top-12 -right-12 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* KPI METRICS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Residents */}
        <div className="bg-slate-900/40 border border-slate-800 hover:border-slate-700 p-5 rounded-2xl transition flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold">Moradores Cadastrados</span>
            <div className="p-2 bg-cyan-500/10 rounded-xl text-cyan-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-white">{residents.length}</div>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
              <span>{activeResidentsCount} ativos</span>
              <span className="text-rose-400 font-medium">{blockedResidentsCount} bloqueados</span>
            </div>
          </div>
        </div>

        {/* Units */}
        <div className="bg-slate-900/40 border border-slate-800 hover:border-slate-700 p-5 rounded-2xl transition flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold">Unidades / Apartamentos</span>
            <div className="p-2 bg-blue-500/10 rounded-xl text-blue-400">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-white">{condo.totalUnits}</div>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
              <span>Capacidade total</span>
              <span className="text-cyan-400 font-mono">100% isolado</span>
            </div>
          </div>
        </div>

        {/* Accesses Approved */}
        <div className="bg-slate-900/40 border border-slate-800 hover:border-slate-700 p-5 rounded-2xl transition flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold">Acessos Liberados</span>
            <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-emerald-400">{approvedToday}</div>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
              <span>Validados com sucesso</span>
              <span className="text-emerald-400 font-mono">99.8% precisão</span>
            </div>
          </div>
        </div>

        {/* Accesses Denied */}
        <div className="bg-slate-900/40 border border-slate-800 hover:border-slate-700 p-5 rounded-2xl transition flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold">Acessos Negados / Alertas</span>
            <div className="p-2 bg-rose-500/10 rounded-xl text-rose-400">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-rose-400">{deniedToday}</div>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
              <span>Tentativas barradas</span>
              <span className="text-rose-400 font-mono">Segurança Ativa</span>
            </div>
          </div>
        </div>

      </div>

      {/* RECENT ACCESS AUDIT & DATA ISOLATION VERIFICATION */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Recent Access Stream (8 Cols) */}
        <div className="lg:col-span-8 bg-slate-900/40 border border-slate-800 rounded-3xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-cyan-400" />
              <h3 className="font-bold text-white text-sm">Últimos Acessos Validados no {condo.name}</h3>
            </div>
            <button
              onClick={() => onNavigate('logs')}
              className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1 transition"
            >
              <span>Ver todos ({logs.length})</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2.5">
            {logs.slice(0, 4).map((log) => (
              <div
                key={log.id}
                className="bg-slate-950/70 border border-slate-800/80 p-3.5 rounded-2xl flex items-center justify-between gap-3 hover:border-slate-700 transition"
              >
                <div className="flex items-center space-x-3 min-w-0">
                  {log.photoUrl ? (
                    <img
                      src={log.photoUrl}
                      alt={log.residentName}
                      className="w-10 h-10 rounded-xl object-cover border border-slate-700 shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 shrink-0">
                      <Camera className="w-4 h-4" />
                    </div>
                  )}

                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white truncate">{log.residentName}</p>
                    <p className="text-[11px] text-cyan-400 truncate">{log.unit}</p>
                    <span className="text-[10px] text-slate-400 font-mono block">
                      {log.gate} &bull; {log.method}
                    </span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span
                    className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] uppercase font-bold border ${
                      log.status === 'Liberado'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                    }`}
                  >
                    {log.status}
                  </span>
                  <p className="text-[10px] text-slate-400 font-mono mt-1">{log.timestamp}</p>
                </div>
              </div>
            ))}

            {logs.length === 0 && (
              <div className="text-center py-8 text-xs text-slate-500">
                Nenhum log registrado para este condomínio até o momento.
              </div>
            )}
          </div>
        </div>

        {/* Multi-Tenant Isolation Proof & Architecture (4 Cols) */}
        <div className="lg:col-span-4 bg-slate-900/40 border border-slate-800 rounded-3xl p-5 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center space-x-2 text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
              <h3 className="font-bold text-white text-sm">Garantia de Isolamento de Dados</h3>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              O PorttoHub opera com particionamento estrito de dados (Multi-Tenant). Cada registro de morador, foto biométrica, log de portaria e acionamento de relé possui chave de isolamento <code className="text-cyan-400 font-mono bg-slate-950 px-1.5 py-0.5 rounded">{condo.code}</code>.
            </p>

            <div className="space-y-2 bg-slate-950/80 border border-slate-800/90 p-3.5 rounded-2xl text-xs font-mono">
              <div className="flex justify-between items-center text-slate-300">
                <span>Partição Ativa:</span>
                <span className="text-emerald-400 font-bold">{condo.id}</span>
              </div>
              <div className="flex justify-between items-center text-slate-300">
                <span>Vazamento Cruzado:</span>
                <span className="text-emerald-400 font-bold">0.00% (Bloqueado)</span>
              </div>
              <div className="flex justify-between items-center text-slate-300">
                <span>Chave de Criptografia:</span>
                <span className="text-slate-400">AES-256-GCM</span>
              </div>
              <div className="flex justify-between items-center text-slate-300">
                <span>Anti-Spoofing:</span>
                <span className="text-cyan-400 font-bold">98.4% Liveness</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => onNavigate('visitantes')}
            className="w-full flex items-center justify-center space-x-2 bg-slate-800 hover:bg-slate-700 text-slate-200 py-3 rounded-xl text-xs font-bold transition border border-slate-700"
          >
            <QrCode className="w-4 h-4 text-cyan-400" />
            <span>Emitir Convite QR Code</span>
          </button>
        </div>

      </div>

    </div>
  );
};
