import React, { useState, useEffect } from 'react';
import { 
  useCustomizacaoVisual, 
  TipoTamanhoEmblema, 
  TipoBordaEmblema, 
  TipoFormatoEmblema 
} from '../services/customizacaoVisualService';
import defaultEmblemImg from '../assets/images/infport_emblem_1790505567327.jpg';

export const EMBLEMA_SVG_PADRAO = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none"><circle cx="50" cy="50" r="48" fill="%230b1329" stroke="%23f59e0b" stroke-width="3"/><path d="M50 18 L76 34 V66 L50 82 L24 66 V34 Z" fill="%23b45309" stroke="%23fbbf24" stroke-width="2.5"/><path d="M50 25 L70 38 V62 L50 75 L30 62 V38 Z" fill="%231e293b" stroke="%23f59e0b" stroke-width="1.5"/><path d="M50 34 L54 44 L65 45 L57 53 L59 64 L50 58 L41 64 L43 53 L35 45 L46 44 Z" fill="%23fcd34d"/><text x="50" y="86" text-anchor="middle" font-family="sans-serif" font-weight="900" font-size="7" fill="%23fbbf24" letter-spacing="1">INFPORT</text></svg>`;

interface EmblemaInfportProps {
  tamanho?: TipoTamanhoEmblema;
  comBorda?: boolean;
  comBrilho?: boolean;
  className?: string;
  alt?: string;
  urlCustom?: string;
  corBrilhoCustom?: string;
  estiloBordaCustom?: TipoBordaEmblema;
  formatoCustom?: TipoFormatoEmblema;
  condominioId?: string;
}

const TAMANHOS: Record<TipoTamanhoEmblema, string> = {
  xs: 'w-6 h-6',
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
  lg: 'w-14 h-14',
  xl: 'w-20 h-20',
  '2xl': 'w-28 h-28',
};

/**
 * Componente do Emblema da Tela Principal e Topo
 * Suporta emblema customizável pelo administrador (upload próprio ou preset vetorial),
 * efeitos de iluminação / luz de fundo neon, formatos e anéis metálicos.
 * Garante resiliência contra erros de carregamento e respeito rigoroso às configurações.
 */
export default function EmblemaInfport({
  tamanho,
  comBorda,
  comBrilho,
  className = '',
  alt = 'Emblema do Sistema',
  urlCustom,
  corBrilhoCustom,
  estiloBordaCustom,
  formatoCustom,
  condominioId
}: EmblemaInfportProps) {
  const customVisual = useCustomizacaoVisual(condominioId);

  // Valores efetivos (props têm precedência sobre configuração do painel)
  const tamanhoEfetivo = tamanho || customVisual.emblemaTamanho || 'md';
  const sizeClasses = TAMANHOS[tamanhoEfetivo] || TAMANHOS.md;
  
  // URL base com prioridades de resiliência: custom -> salvo -> asset bundled -> public
  const urlEfetiva = urlCustom || customVisual.emblemaUrl || defaultEmblemImg || '/emblema-infport.png';
  
  // Gerenciamento de estado de fallback de imagem
  const [srcAtual, setSrcAtual] = useState<string>(urlEfetiva);

  useEffect(() => {
    setSrcAtual(urlEfetiva);
  }, [urlEfetiva]);

  // Controle estrito da luz de fundo (Glow / Brilho):
  // Se a prop comBrilho foi passada explicitamente (true ou false), obedece a prop.
  // Senão, obedece estritamente customVisual.emblemaBrilho (se for false, desliga completamente a luz).
  const brilhoAtivo = comBrilho !== undefined ? comBrilho : (customVisual.emblemaBrilho === true);
  const corBrilho = corBrilhoCustom || customVisual.emblemaCorBrilho || '#f59e0b';
  const estiloBorda = estiloBordaCustom || customVisual.emblemaEstiloBorda || 'anel_dourado';
  const formato = formatoCustom || customVisual.emblemaFormato || 'circular';

  // Classes de formato
  const formatClasses = formato === 'circular'
    ? 'rounded-full'
    : formato === 'arredondado'
      ? 'rounded-2xl'
      : 'rounded-lg';

  // Classes de borda - quando a luz de fundo está apagada (brilhoAtivo === false),
  // eliminamos qualquer box-shadow colorida para que a luz fique 100% apagada
  let borderClasses = '';
  if (comBorda !== false && estiloBorda !== 'sem_borda') {
    switch (estiloBorda) {
      case 'anel_dourado':
        borderClasses = brilhoAtivo 
          ? 'ring-2 ring-amber-400/60 shadow-amber-500/20 shadow-md'
          : 'ring-2 ring-amber-400/40';
        break;
      case 'neon':
        borderClasses = brilhoAtivo 
          ? 'ring-2 ring-cyan-400 shadow-cyan-400/40 shadow-lg'
          : 'ring-1 ring-cyan-500/40';
        break;
      case 'circulo_clean':
        borderClasses = 'ring-1 ring-slate-400/30 shadow-xs';
        break;
    }
  }

  const lidarComErro = () => {
    // Sequência de fallbacks automáticos em caso de erro no arquivo ou 404
    if (srcAtual !== defaultEmblemImg && defaultEmblemImg) {
      setSrcAtual(defaultEmblemImg);
    } else if (srcAtual !== EMBLEMA_SVG_PADRAO) {
      setSrcAtual(EMBLEMA_SVG_PADRAO);
    }
  };

  return (
    <div 
      className={`relative inline-flex items-center justify-center shrink-0 ${sizeClasses} ${className}`}
      title={`${customVisual.nomeAplicacao || 'PorttoHub'} - Identidade Visual`}
    >
      {/* Luz de Fundo / Efeito Glow Radiante - APAGA COMPLETAMENTE quando brilhoAtivo for false */}
      {brilhoAtivo && (
        <div 
          className={`absolute -inset-1 ${formatClasses} blur-md opacity-50 animate-pulse pointer-events-none transition-all duration-300`}
          style={{ backgroundColor: corBrilho }}
        />
      )}

      {/* Imagem / SVG do Emblema com resiliência total de carregamento */}
      <img
        src={srcAtual}
        alt={alt}
        className={`w-full h-full object-contain ${formatClasses} select-none transition-all duration-200 relative z-10 ${borderClasses}`}
        loading="eager"
        onError={lidarComErro}
      />
    </div>
  );
}
