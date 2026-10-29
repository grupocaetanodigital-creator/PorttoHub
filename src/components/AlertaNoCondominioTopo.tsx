import React, { useState, useEffect, useRef } from 'react';
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
  const listaAcessosRef = useRef<any[]>([]);

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

      listaAcessosRef.current = lista;
      calcularEstourados(lista);
    } catch {
      // Ignora erro transitório
    }
  };

  const calcularEstourados = (lista: any[]) => {
    const agora = Date.now();
    let estourados = 0;

    lista.forEach((item) => {
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
  };

  useEffect(() => {
    carregarContagem();

    // Eventos locais disparados dentro do próprio app
    const handleEventoLocal = () => {
      carregarContagem();
    };
    window.addEventListener('prestadores_atualizados', handleEventoLocal);
    window.addEventListener('infport_sincronizar_dados_global', handleEventoLocal);

    // Canal Realtime do Supabase com NOME ESTÁTICO (sem Date.now() para não poluir conexões e logs)
    const channelName = `realtime_acessos_${condominioId || 'global'}`;
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

    // Cálculo em memória a cada 10 segundos para detectar estouro de permanência sem requisição GET ao banco
    const intervalMemoria = setInterval(() => {
      if (listaAcessosRef.current.length > 0) {
        calcularEstourados(listaAcessosRef.current);
      }
    }, 10000);

    return () => {
      window.removeEventListener('prestadores_atualizados', handleEventoLocal);
      window.removeEventListener('infport_sincronizar_dados_global', handleEventoLocal);
      supabase.removeChannel(channel);
      clearInterval(intervalMemoria);
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
      <div className="relative">
        <Users className="w-3.5 h-3.5" />
        {temEstourados && (
          <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-ping" />
        )}
      </div>

      <span className="text-white font-black text-xs px-1.5 py-0.5 rounded-md bg-white/20 leading-none">
        {totalNoCondominio}
      </span>

      {temEstourados && (
        <span className="flex items-center gap-0.5 px-1 py-0.5 rounded bg-red-600 text-white text-[10px] font-black uppercase tracking-wider">
          <AlertTriangle className="w-2.5 h-2.5 animate-bounce" />
          {totalEstourados}
        </span>
      )}
    </button>
  );
}
