import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, CheckCircle2 } from 'lucide-react';
import ModalInstalarAppPWA from './ModalInstalarAppPWA';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isStandalone, install } = usePWAInstall();
  const [modalAberto, setModalAberto] = useState(false);

  // Se já estiver rodando como PWA standalone instalado, exibe selo sutil
  if (isStandalone || isInstalled) {
    return (
      <span 
        title="INFPORT 1.0 operando como Aplicativo Oficial (Standalone PWA)"
        className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-[11px] font-bold text-emerald-400"
      >
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
        <span>App Instalado</span>
      </span>
    );
  }

  const handleClick = async () => {
    if (isInstallable) {
      const instalado = await install();
      if (!instalado) {
        setModalAberto(true);
      }
    } else {
      setModalAberto(true);
    }
  };

  return (
    <>
      <button
        onClick={handleClick}
        className="flex items-center gap-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 px-3 py-1.5 text-xs font-black text-slate-950 shadow-md transition active:scale-95 cursor-pointer"
        title="Instalar INFPORT 1.0 como aplicativo oficial (sem barra de navegador e com cache de posto)"
      >
        <Download className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Instalar Aplicativo</span>
        <span className="sm:hidden">Instalar App</span>
      </button>

      <ModalInstalarAppPWA
        aberto={modalAberto}
        onFechar={() => setModalAberto(false)}
      />
    </>
  );
};
