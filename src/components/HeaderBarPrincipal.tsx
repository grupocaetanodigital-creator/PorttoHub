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
    <header 
      className="text-slate-900 dark:text-white px-3 sm:px-5 py-2 sm:py-2.5 flex items-center justify-between sticky top-0 z-30 shadow-xs border-b border-slate-200 dark:border-slate-800/80 transition-all select-none bg-white/95 dark:bg-slate-900/95 backdrop-blur-md"
      style={{
        backgroundColor: customVisual.corFundoHeader || undefined,
        borderRadius: customVisual.raioBorda === 'reto' ? '0px' : customVisual.raioBorda === 'suave' ? '6px' : customVisual.raioBorda === 'pill' ? '24px' : undefined
      }}
    >
      
      {/* ========================================================
          LADO ESQUERDO: LOGO + NOME DA APLICAÇÃO + SUBTÍTULO
         ======================================================== */}
      <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">

        {/* LOGO / EMBLEMA OFICIAL DO SISTEMA */}
        <div 
          onClick={onAbrirVersaoInfo} 
          className="shrink-0 flex items-center cursor-pointer group transition-transform active:scale-95"
          title={`${nomeExibicao} - Clique para ver informações da versão`}
        >
          <EmblemaInfport 
            tamanho={customVisual.emblemaTamanho || "sm"} 
            condominioId={condominioId || operador?.condominio_id} 
            className="group-hover:scale-105 transition-transform"
          />
        </div>

        {/* NOME DO SISTEMA E SUBTÍTULO OPERACIONAL */}
        <div className="flex flex-col min-w-0 leading-tight">
          <div className="flex items-center gap-2 min-w-0">
            <span 
              className={`font-black tracking-tight flex items-center gap-1.5 truncate ${
                customVisual.corFundoHeader ? 'text-white' : 'text-slate-900 dark:text-white'
              } ${obterClasseTamanhoFonte(customVisual.tamanhoFonteNome)}`}
              style={{
                fontFamily: `var(--app-font-family, ${customVisual.familiaFonte || 'inherit'})`,
                fontWeight: customVisual.pesoFonte === 'negrito' ? 800 : customVisual.pesoFonte === 'semibold' ? 600 : 500
              }}
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

            {/* Badge Enterprise */}
            {customVisual.exibirBadgeEnterprise && (
              <span 
                className="text-[9px] uppercase font-mono font-bold tracking-wider px-1.5 py-0.5 rounded shrink-0 hidden xs:inline-block"
                style={{ 
                  backgroundColor: `${customVisual.corPrimaria || '#10b981'}25`,
                  color: customVisual.corPrimaria || '#10b981',
                  borderColor: `${customVisual.corPrimaria || '#10b981'}40`
                }}
              >
                Enterprise
              </span>
            )}
          </div>

          {/* SUBTÍTULO VISÍVEL */}
          {customVisual.subtituloAplicacao && (
            <span 
              className={`font-medium truncate mt-0.5 ${
                customVisual.corFundoHeader ? 'text-slate-300' : 'text-slate-500 dark:text-slate-400'
              } ${
                customVisual.tamanhoFonteSubtitulo === 'base' ? 'text-xs' : 
                customVisual.tamanhoFonteSubtitulo === 'sm' ? 'text-[11px]' : 'text-[10px]'
              }`}
            >
              {customVisual.subtituloAplicacao}
            </span>
          )}
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
