import React, { useState, useEffect, useRef } from 'react';
import { Bell, BellRing } from 'lucide-react';
import { supabase } from '../services/supabase';
import {
  buscarLembretes,
  obterStatusContagem,
  reproduzirSinalSonoroAviso,
  pararAlarmeTrocaPlantao,
  isAlarmeTrocaPlantaoAtivo,
  retomarAlarmeSeAtivo,
  StatusContagemLembretes,
  LembretePortaria
} from '../services/lembretesService';

interface BotaoNotificacoesLembretesProps {
  condominioId: string;
  onAbrirPainel: () => void;
  className?: string;
}

export default function BotaoNotificacoesLembretes({
  condominioId,
  onAbrirPainel,
  className = ''
}: BotaoNotificacoesLembretesProps) {
  const [statusContagem, setStatusContagem] = useState<StatusContagemLembretes>({
    total: 0,
    totalAtivos: 0,
    pendentesNaoLidos: 0,
    pendentesCientes: 0,
    ativosAdm: 0,
    finalizados: 0,
    corAlerta: 'neutro'
  });
  const [carregando, setCarregando] = useState<boolean>(true);
  const [alarmeTrocaAtivo, setAlarmeTrocaAtivo] = useState<boolean>(isAlarmeTrocaPlantaoAtivo());
  const ultimoTotalRef = useRef<number>(0);

  // Carrega e atualiza contagem e status de pendências
  const carregarContagem = async (tocarSomSeAumentou = false) => {
    if (!condominioId) {
      setStatusContagem({
        total: 0,
        totalAtivos: 0,
        pendentesNaoLidos: 0,
        pendentesCientes: 0,
        ativosAdm: 0,
        finalizados: 0,
        corAlerta: 'neutro'
      });
      setCarregando(false);
      return;
    }

    try {
      const { lembretes } = await buscarLembretes(condominioId);
      const status = obterStatusContagem(lembretes);

      // Se surgiram novas mensagens e a contagem de ativos aumentou, toca sinal sonoro suave
      if (tocarSomSeAumentou && status.totalAtivos > ultimoTotalRef.current) {
        reproduzirSinalSonoroAviso();
      }

      ultimoTotalRef.current = status.totalAtivos;
      setStatusContagem(status);
    } catch {
      // Ignora erro transitório
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarContagem(false);
    setAlarmeTrocaAtivo(isAlarmeTrocaPlantaoAtivo());
    retomarAlarmeSeAtivo();

    // Desbloqueia Web Audio no primeiro clique/toque se o alarme estiver ativo
    const desbloquearAudio = () => {
      if (isAlarmeTrocaPlantaoAtivo()) {
        retomarAlarmeSeAtivo();
      }
    };
    window.addEventListener('click', desbloquearAudio, { once: true });
    window.addEventListener('touchstart', desbloquearAudio, { once: true });

    // Escuta eventos locais disparados na própria janela (atualizações imediatas)
    const handleEventoLocal = (e: any) => {
      const detalheCondId = e.detail?.condominioId;
      if (!detalheCondId || detalheCondId === condominioId) {
        carregarContagem(false);
      }
    };
    window.addEventListener('lembretes_portaria_atualizados', handleEventoLocal);

    // Escuta evento de alarme de troca de plantão
    const handleAlarmeTroca = (e: any) => {
      const ativo = Boolean(e.detail?.ativo);
      setAlarmeTrocaAtivo(ativo);
      if (ativo) {
        retomarAlarmeSeAtivo();
      }
    };
    window.addEventListener('alarme_troca_plantao_mudou', handleAlarmeTroca);

    // Configura canal Realtime do Supabase para escuta instantânea entre dispositivos (Portaria ⇄ Moradores)
    const channelName = `realtime_lembretes_${condominioId || 'global'}_${Date.now()}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'lembretes_portaria'
        },
        (payload) => {
          const novoLembrete = payload.new as Partial<LembretePortaria> | null;
          if (!novoLembrete || !novoLembrete.condominio_id || novoLembrete.condominio_id === condominioId) {
            carregarContagem(true);
          }
        }
      )
      .subscribe();

    // Polling de segurança a cada 15 segundos para garantir paridade
    const intervalo = setInterval(() => {
      carregarContagem(true);
    }, 15000);

    return () => {
      window.removeEventListener('lembretes_portaria_atualizados', handleEventoLocal);
      window.removeEventListener('alarme_troca_plantao_mudou', handleAlarmeTroca);
      supabase.removeChannel(channel);
      clearInterval(intervalo);
    };
  }, [condominioId]);

  const handleClick = () => {
    // "TODA VEZ QUE HOUVER TROCA DE PLANTÃO SE TIVER ALGUM LEMBRETE O APP VAI DISPARAR UM ALERTA QUE SÓ PARA QUANDO O OPERADOR APERTAR NO ÍCONE DE LEMBRETES"
    pararAlarmeTrocaPlantao();
    setAlarmeTrocaAtivo(false);
    onAbrirPainel();
  };

  const { corAlerta, totalAtivos, ativosAdm, pendentesNaoLidos, pendentesCientes } = statusContagem;
  const temPendencias = totalAtivos > 0 || alarmeTrocaAtivo;

  // Determina classes de estilo com base na cor de alerta
  const classesEstiloBotao = (() => {
    if (alarmeTrocaAtivo || corAlerta === 'vermelho') {
      return 'bg-red-500/25 text-red-300 hover:bg-red-500/35 border-2 border-red-500 ring-2 ring-red-500/60 shadow-lg shadow-red-500/30';
    }
    if (corAlerta === 'laranja') {
      return 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border-2 border-amber-400 ring-2 ring-amber-400/50 shadow-md shadow-amber-500/25';
    }
    if (corAlerta === 'azul') {
      return 'bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 border-2 border-blue-400 ring-2 ring-blue-400/50 shadow-md shadow-blue-500/25';
    }
    return 'bg-slate-800/90 text-slate-300 hover:text-white hover:bg-slate-700/80 border border-slate-700';
  })();

  const tituloTooltip = (() => {
    if (alarmeTrocaAtivo) {
      return '⚠️ ALARME DE TROCA DE PLANTÃO: Clique aqui para cessar o alerta e ver os lembretes pendentes!';
    }
    if (corAlerta === 'vermelho') {
      return `🚨 ${ativosAdm} AVISO(S) DA ADMINISTRAÇÃO (NÍVEL 0) PISCANDO EM VERMELHO!`;
    }
    if (corAlerta === 'laranja') {
      return `⚠️ ${pendentesNaoLidos} lembrete(s) aguardando ciência (Piscando em laranja)`;
    }
    if (corAlerta === 'azul') {
      return `ℹ️ ${pendentesCientes} lembrete(s) ciente(s) em andamento aguardando finalização (Piscando em azul)`;
    }
    return 'Lembretes e Recados da Portaria';
  })();

  return (
    <button
      type="button"
      onClick={handleClick}
      title={tituloTooltip}
      className={`relative inline-flex items-center justify-center p-2 rounded-xl transition-all duration-200 cursor-pointer select-none focus:outline-none focus:ring-2 focus:ring-emerald-400/50 ${classesEstiloBotao} ${className}`}
      aria-label="Notificações e Lembretes da Portaria"
    >
      {/* Ícone com animação pulsante nas cores calibradas */}
      {temPendencias ? (
        <span className="relative flex items-center justify-center">
          {/* Anel pulsante de fundo */}
          <span
            className={`absolute -inset-1 rounded-full animate-ping opacity-75 ${
              alarmeTrocaAtivo || corAlerta === 'vermelho'
                ? 'bg-red-500/60'
                : corAlerta === 'laranja'
                ? 'bg-amber-400/50'
                : 'bg-blue-400/50'
            }`}
          ></span>

          {/* Sino vibrante */}
          <BellRing
            className={`w-5 h-5 relative z-10 animate-pulse ${
              alarmeTrocaAtivo || corAlerta === 'vermelho'
                ? 'text-red-400 stroke-[2.5]'
                : corAlerta === 'laranja'
                ? 'text-amber-300 stroke-[2.5]'
                : 'text-blue-300 stroke-[2.5]'
            }`}
          />
        </span>
      ) : (
        <Bell className="w-5 h-5 transition-transform group-hover:scale-105" />
      )}

      {/* Badge Numérico Dinâmico com Contador de Pendências e Cor Respectiva */}
      {temPendencias && (
        <span
          className={`absolute -top-1.5 -right-1.5 min-w-[20px] h-[20px] px-1 text-white text-[11px] font-black rounded-full flex items-center justify-center shadow-md border-2 border-slate-900 leading-none ${
            alarmeTrocaAtivo || corAlerta === 'vermelho'
              ? 'bg-red-600 animate-bounce'
              : corAlerta === 'laranja'
              ? 'bg-amber-600 animate-bounce'
              : 'bg-blue-600 animate-pulse'
          }`}
          style={{ animationDuration: alarmeTrocaAtivo ? '0.8s' : '1.8s' }}
        >
          {totalAtivos > 99 ? '99+' : totalAtivos}
        </span>
      )}
    </button>
  );
}
