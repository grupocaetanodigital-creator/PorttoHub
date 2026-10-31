import React from 'react';
import { 
  Camera, 
  Users, 
  UserPlus, 
  Clock, 
  Cpu, 
  Building2, 
  LayoutDashboard, 
  QrCode, 
  ShieldCheck, 
  Radio, 
  Lock
} from 'lucide-react';
import { Condominium } from '../types';

export type TabType = 
  | 'dashboard' 
  | 'totem' 
  | 'moradores' 
  | 'cadastramento' 
  | 'visitantes' 
  | 'logs' 
  | 'dispositivos' 
  | 'condominios';

interface SidebarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  activeCondo: Condominium;
  residentsCount: number;
  logsCount: number;
  passesCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  activeCondo,
  residentsCount,
  logsCount,
  passesCount
}) => {
  const navItems: { id: TabType; label: string; icon: React.ReactNode; badge?: number | string }[] = [
    {
      id: 'dashboard',
      label: 'Visão Geral',
      icon: <LayoutDashboard className="w-4 h-4" />
    },
    {
      id: 'totem',
      label: 'Totem Facial (Portaria)',
      icon: <Camera className="w-4 h-4" />,
      badge: 'LIVE'
    },
    {
      id: 'moradores',
      label: 'Moradores & Unidades',
      icon: <Users className="w-4 h-4" />,
      badge: residentsCount
    },
    {
      id: 'cadastramento',
      label: 'Cadastramento Facial',
      icon: <UserPlus className="w-4 h-4" />
    },
    {
      id: 'visitantes',
      label: 'Convites Digitais & QR',
      icon: <QrCode className="w-4 h-4" />,
      badge: passesCount
    },
    {
      id: 'logs',
      label: 'Auditoria de Acessos',
      icon: <Clock className="w-4 h-4" />,
      badge: logsCount
    },
    {
      id: 'dispositivos',
      label: 'Hardware & Relés IoT',
      icon: <Cpu className="w-4 h-4" />
    },
    {
      id: 'condominios',
      label: 'Gestão Multi-Condomínio',
      icon: <Building2 className="w-4 h-4" />
    }
  ];

  return (
    <aside className="w-full lg:w-64 border-r border-slate-800 bg-slate-900/50 p-4 flex flex-col space-y-1 shrink-0">
      
      {/* Current Condo Pill */}
      <div className="mb-3 px-3 py-2.5 bg-slate-950/70 border border-slate-800 rounded-2xl flex items-center justify-between">
        <div className="min-w-0 pr-2">
          <span className="text-[10px] font-bold uppercase text-cyan-400 block tracking-wider">
            Escopo Ativo
          </span>
          <p className="text-xs font-bold text-white truncate">{activeCondo.name}</p>
        </div>
        <span className="text-[10px] font-mono bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded border border-cyan-500/30">
          {activeCondo.code}
        </span>
      </div>

      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 pb-1 pt-1">
        Menu de Navegação
      </div>

      {/* Nav List */}
      <nav className="flex-1 space-y-1">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition ${
                isActive
                  ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 shadow-md shadow-cyan-950/20'
                  : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
              }`}
            >
              <div className="flex items-center space-x-3 truncate">
                <span className={isActive ? 'text-cyan-400' : 'text-slate-500'}>
                  {item.icon}
                </span>
                <span className="truncate">{item.label}</span>
              </div>
              {item.badge !== undefined && (
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                    item.badge === 'LIVE'
                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30 animate-pulse'
                      : isActive
                      ? 'bg-cyan-500/20 text-cyan-300'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Security & Isolation Status Box */}
      <div className="pt-4 mt-auto">
        <div className="bg-slate-950/80 border border-slate-800/90 rounded-2xl p-3.5 space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center space-x-1.5 text-emerald-400 font-bold">
              <Radio className="w-3.5 h-3.5 animate-pulse" />
              <span>Totem Conectado</span>
            </span>
            <span className="text-[10px] bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded text-slate-400 font-mono">
              v2.4
            </span>
          </div>

          <div className="space-y-1 text-[11px] text-slate-400 pt-1 border-t border-slate-800/60 font-mono">
            <div className="flex justify-between items-center">
              <span>Isolamento Tenant:</span>
              <span className="text-emerald-400 font-bold">{activeCondo.code}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Anti-Spoofing:</span>
              <span className="text-cyan-400 font-bold">Ativado (98%)</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Relés IP:</span>
              <span className="text-emerald-400 font-bold">Online</span>
            </div>
          </div>
        </div>
      </div>

    </aside>
  );
};
