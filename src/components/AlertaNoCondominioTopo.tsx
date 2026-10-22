import React, { useState, useEffect } from 'react';
import { Users, AlertTriangle } from 'lucide-react';
import { supabase } from '../services/supabase';

interface AlertaNoCondominioTopoProps {
  condominioId: string;
  onNavegar: () => void;
  className?: string;
}

export default function AlertaNoCondominioTopo({
  condominioId,
  onNavegar,
  className = ''
}: AlertaNoCondominioTopoProps) {
  const [totalNoCondominio, setTotalNoCondominio] = useState<number>(0);
  const [totalEstourados, setTotalEstourados] = useState<number>(0);

  const carregarContagem = async () => {
    try {
      let queryAcessos = supabase
        .from('prestadores_acessos')
        .select('id, data_hora_entrada, limite_permanencia_ate, perfil_acesso, status_acesso')
        .eq('status_acesso', 'DENTRO');

      if (condominioId) {
        queryAcessos = queryAcessos.eq('condominio_id', condominioId);
      }

      const { data: acessosDb, error: errAcessos } = await queryAcessos;

      let lista: any[] = [];
      if (!errAcessos && acessosDb && acessosDb.length > 0) {
        lista = acessosDb;
      } else {
        // Fallback para tabela prestadores com status 'DENTRO' ou 'EM_ANDAMENTO'
        let qPrest = supabase
          .from('prestadores')
          .select('id, data_hora_entrada, limite_permanencia_ate, perfil_acesso, status_acesso')
          .in('status_acesso', ['DENTRO', 'EM_ANDAMENTO']);

        if (condominioId) {
          qPrest = qPrest.eq('condominio_id', condominioId);
        }
        const { data: prestDb } = await qPrest;
        lista = prestDb || [];
      }

      const agora = Date.now();
      let estourados = 0;

      lista.forEach((item) => {
        // Visitantes/família com perfil 'autorizado' têm permanência livre
        const ehVisitante = item.perfil_acesso === 'autorizado';
        if (!ehVisitante && item.limite_permanencia_ate) {
          const tLimite = new Date(item.limite_permanencia_ate).getTime();
          if (tLimite - agora <= 0) {
            estourados++;
          }
        }
      });

      setTotalNoCondominio(lista.length);
      setTotalEstourados(estourados);
    } catch {
      // Ignora erro transitório
    }
  };

  useEffect(() => {
    carregarContagem();

    // Eventos locais disparados dentro do próprio app
    const handleEventoLocal = () => {
      carregarContagem();
    };
    window.addEventListener('prestadores_atualizados', handleEventoLocal);

    // Canal Realtime do Supabase para escuta instantânea entre dispositivos
    const channelName = `realtime_acessos_alerta_${condominioId || 'global'}_${Date.now()}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'prestadores_acessos'
        },
        () => {
          carregarContagem();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'prestadores'
        },
        () => {
          carregarContagem();
        }
      )
      .subscribe();

    // Polling a cada 15 segundos para atualizar contadores e estourados
    const intervalo = setInterval(() => {
      carregarContagem();
    }, 15000);

    return () => {
      window.removeEventListener('prestadores_atualizados', handleEventoLocal);
      supabase.removeChannel(channel);
      clearInterval(intervalo);
    };
  }, [condominioId]);

  // Se não houver ninguém no condomínio, não renderiza o alerta
  if (totalNoCondominio === 0) {
    return null;
  }

  const temEstourados = totalEstourados > 0;

  return (
    <button
      type="button"
      onClick={onNavegar}
      title={
        temEstourados
          ? `Alerta: ${totalNoCondominio} no condomínio (${totalEstourados} com permanência estourada!). Clique para ver.`
          : `${totalNoCondominio} pessoa(s) no condomínio agora. Clique para abrir lista.`
      }
      className={`relative inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-black transition cursor-pointer select-none border shadow-xs active:scale-95 focus:outline-none ${
        temEstourados
          ? 'bg-red-950/80 hover:bg-red-900 border-red-500/70 text-white animate-pulse shadow-red-950/50'
          : 'bg-purple-950/80 hover:bg-purple-900 border-purple-500/50 text-white shadow-purple-950/40'
      } ${className}`}
    >
      {/* Indicador pulsante */}
      <span className="relative flex items-center justify-center shrink-0">
        <span
          className={`absolute -inset-1 rounded-full animate-ping opacity-75 ${
            temEstourados ? 'bg-red-400' : 'bg-emerald-400'
          }`}
        />
        {temEstourados ? (
          <AlertTriangle className="w-4 h-4 text-red-400 relative z-10" />
        ) : (
          <Users className="w-4 h-4 text-emerald-400 relative z-10" />
        )}
      </span>

      {/* Rótulo de alerta */}
      <span className="text-[11px] sm:text-xs font-black truncate flex items-center gap-1">
        <span className="hidden sm:inline text-slate-300">No Condomínio:</span>
        <span
          className={`px-1.5 py-0.5 rounded-full text-[10px] font-black leading-none ${
            temEstourados
              ? 'bg-red-600 text-white'
              : 'bg-emerald-500 text-slate-950'
          }`}
        >
          {totalNoCondominio}
        </span>
      </span>

      {/* Badge adicional se houver estourados */}
      {temEstourados && (
        <span className="text-[10px] text-red-300 font-bold hidden md:inline">
          ({totalEstourados} estourado)
        </span>
      )}
    </button>
  );
}
