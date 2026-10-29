import React from 'react';
import EmblemaInfport from './EmblemaInfport';
import BotaoNotificacoesLembretes from './BotaoNotificacoesLembretes';
import AlertaNoCondominioTopo from './AlertaNoCondominioTopo';
import { NOME_APLICACAO } from '../services/versaoService';
import { useCustomizacaoVisual, obterClasseTamanhoFonte } from '../services/customizacaoVisualService';

interface HeaderBarPrincipalProps {
  condominioId?: string;
  condominioNome?: string;
  operador: any;
  eAdmin?: boolean;
  eSindico?: boolean;
  onAbrirDrawerMobile?: () => void;
  onAbrirNotificacoes: () => void;
  onAbrirDoctor?: () => void;
  onAbrirMeuPerfil?: () => void;
  onAbrirVersaoInfo: () => void;
  onLogout?: () => void;
  onNavegarModulo?: (modulo: string) => void;
}

/**
 * Header Bar da Tela Principal (Dashboard)
 * Mantém exclusivamente:
 * 1. LOGO (EmblemaInfport com brilho e formato configurável)
 * 2. NOME (PorttoHub / Identidade Visual)
 * 3. NOTIFICAÇÕES (Alerta de presentes + Sininho de lembretes e recados)
 */
export default function HeaderBarPrincipal({
  condominioId,
  operador,
  onAbrirNotificacoes,
  onAbrirVersaoInfo,
  onNavegarModulo
}: HeaderBarPrincipalProps) {
  const customVisual = useCustomizacaoVisual(condominioId || operador?.condominio_id);
  const nomeExibicao = customVisual.nomeAplicacao || NOME_APLICACAO || 'PorttoHub';

  return (
    <header className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md text-slate-900 dark:text-white px-3 sm:px-5 py-2.5 flex items-center justify-between sticky top-0 z-30 shadow-xs border-b border-slate-200 dark:border-slate-800/80 transition-all select-none">
      
      {/* ========================================================
          LADO ESQUERDO: LOGO + NOME DA APLICAÇÃO
         ======================================================== */}
      <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">

        {/* LOGO / EMBLEMA OFICIAL DO SISTEMA */}
        <div 
          onClick={onAbrirVersaoInfo} 
          className="shrink-0 flex items-center cursor-pointer group transition-transform active:scale-95"
          title={`${nomeExibicao} - Clique para ver informações da versão`}
        >
          <EmblemaInfport 
            tamanho="sm" 
            condominioId={condominioId || operador?.condominio_id} 
            className="group-hover:scale-105 transition-transform"
          />
        </div>

        {/* NOME DO SISTEMA */}
        <div className="flex items-center gap-2 min-w-0">
          <span 
            className={`font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-1.5 truncate ${obterClasseTamanhoFonte(customVisual.tamanhoFonteNome)}`}
          >
            {nomeExibicao}
            
            {/* Badge Pulsante Online */}
            {customVisual.exibirBadgeOnline && (
              <span 
                className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 inline-block ring-2 ring-emerald-500/30" 
                title="Conexão Online e Sincronizada" 
              />
            )}
          </span>
        </div>
      </div>

      {/* ========================================================
          LADO DIREITO: ALERTA NO CONDOMÍNIO + NOTIFICAÇÕES (CININHO) + ACESSIBILIDADE
         ======================================================== */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* ALERTA DE PESSOAS PRESENTES NO CONDOMÍNIO (AO LADO DO CININHO) */}
        {condominioId && (
          <AlertaNoCondominioTopo
            condominioId={condominioId}
            onNavegar={() => onNavegarModulo ? onNavegarModulo('prestadores') : undefined}
          />
        )}

        {/* NOTIFICAÇÕES & LEMBRETES DA PORTARIA (CININHO) */}
        <div className="relative shrink-0">
          <BotaoNotificacoesLembretes
            condominioId={condominioId || ''}
            onAbrirPainel={onAbrirNotificacoes}
          />
        </div>
      </div>
    </header>
  );
}
