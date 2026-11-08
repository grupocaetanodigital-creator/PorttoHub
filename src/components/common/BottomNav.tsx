import React from 'react';
import { BarChart3, Users, Building2, Calendar, Receipt } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { NavigationTab } from '../../types';

export const BottomNav: React.FC = () => {
  const { activeTab, setActiveTab, turnos } = useApp();

  const emptyCount = turnos.filter(t => t.status === 'vazio').length;

  const tabs: { id: NavigationTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    {
      id: 'operacao',
      label: 'Operação',
      icon: <BarChart3 className="w-5 h-5" />,
      badge: emptyCount > 0 ? emptyCount : undefined
    },
    {
      id: 'equipe',
      label: 'Equipe',
      icon: <Users className="w-5 h-5" />
    },
    {
      id: 'postos',
      label: 'Postos',
      icon: <Building2 className="w-5 h-5" />
    },
    {
      id: 'matriz',
      label: 'Matriz',
      icon: <Calendar className="w-5 h-5" />
    },
    {
      id: 'holerite',
      label: 'Holerite RH',
      icon: <Receipt className="w-5 h-5" />
    }
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 shadow-2xl pb-safe">
      <div className="max-w-lg mx-auto flex items-center justify-around px-2 py-1.5">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex flex-col items-center justify-center min-w-[62px] min-h-[50px] py-1 px-2 rounded-xl transition-all duration-200 active:scale-95 ${
                isActive
                  ? 'text-blue-400 font-semibold'
                  : 'text-slate-400 hover:text-slate-200 font-medium'
              }`}
            >
              {/* Active subtle pill glow */}
              {isActive && (
                <span className="absolute top-0.5 inset-x-3 h-0.5 bg-blue-500 rounded-full shadow-[0_0_8px_#3b82f6]" />
              )}

              <div className="relative">
                {tab.icon}
                {/* Red alert badge on Operação tab if post is empty */}
                {tab.badge && (
                  <span className="absolute -top-1.5 -right-2 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 shadow-sm animate-pulse">
                    {tab.badge}
                  </span>
                )}
              </div>

              <span className={`text-[11px] mt-1 tracking-tight truncate max-w-[68px] ${isActive ? 'text-blue-400' : 'text-slate-400'}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
