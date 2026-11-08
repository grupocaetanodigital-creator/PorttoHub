import React, { useState, useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';
import { obterTemaAtual, aplicarTema, TipoTema } from '../services/themeService';

interface SeletorTemaProps {
  className?: string;
  onAlternar?: (novoTema: TipoTema) => void;
  variante?: 'padrao' | 'compacto';
}

export default function SeletorTema({ 
  className = '', 
  onAlternar,
  variante = 'padrao'
}: SeletorTemaProps) {
  const [tema, setTema] = useState<TipoTema>(() => obterTemaAtual());

  useEffect(() => {
    const handleEvento = (e: any) => {
      if (e.detail?.tema) {
        setTema(e.detail.tema);
      }
    };

    window.addEventListener('infport_tema_alterado', handleEvento);
    return () => window.removeEventListener('infport_tema_alterado', handleEvento);
  }, []);

  const handleSelecionar = (novoTema: TipoTema) => {
    setTema(novoTema);
    aplicarTema(novoTema);
    if (onAlternar) {
      onAlternar(novoTema);
    }
  };

  const eClaro = tema === 'claro';

  return (
    <div 
      className={`inline-flex items-center gap-1 p-1 rounded-xl shrink-0 transition-colors ${
        eClaro
          ? 'bg-slate-100 border border-slate-200' 
          : 'bg-slate-800 border border-slate-700'
      } ${className}`}
      role="group"
      aria-label="Seletor de Tema"
    >
      {/* Botão Modo Claro */}
      <button
        type="button"
        onClick={() => handleSelecionar('claro')}
        title="Ativar Modo Claro"
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition cursor-pointer ${
          eClaro
            ? 'bg-white text-slate-900 font-bold shadow-xs border border-slate-200/80'
            : 'text-slate-400 hover:text-slate-200 font-medium'
        }`}
      >
        <span>Modo Claro</span>
        <Sun className={`w-3.5 h-3.5 shrink-0 ${eClaro ? 'text-amber-500' : 'text-slate-400'}`} />
      </button>

      {/* Botão Modo Escuro */}
      <button
        type="button"
        onClick={() => handleSelecionar('escuro')}
        title="Ativar Modo Escuro"
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition cursor-pointer ${
          !eClaro
            ? 'bg-slate-900 text-white font-bold shadow-xs border border-slate-700'
            : 'text-slate-600 hover:text-slate-900 font-medium'
        }`}
      >
        <Moon className={`w-3.5 h-3.5 shrink-0 ${!eClaro ? 'text-emerald-400' : 'text-slate-500'}`} />
        <span>Modo Escuro</span>
      </button>
    </div>
  );
}
