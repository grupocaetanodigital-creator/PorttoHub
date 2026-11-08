import React, { useState, useEffect, useRef } from 'react';
import { HardHat, AlertTriangle } from 'lucide-react';
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
      // REGRA: Controle de permanência e alertas aplicam-se EXCLUSIVAMENTE a prestadores de serviço e obras.
      // Visitantes e familiares possuem circulação livre e não requerem controle de tempo/saída.
      let queryAcessos = supabase
        .from('prestadores_acessos')
        .select('id, data_hora_entrada, limite_permanencia_ate, perfil_acesso, status_acesso')
        .neq('perfil_acesso', 'autorizado')
        .eq('status_acesso', 'DENTRO');

      if (condominioId) {
        queryAcessos = queryAcessos.eq('condominio_id', condominioId);
      }

      const { data: acessosDb, error: errAcessos } = await queryAcessos;

      let lista: any[] = [];
      if (!errAcessos && acessosDb && acessosDb.length > 0) {
        lista = acessosDb.filter((item: any) => item.perfil_acesso !== 'autorizado');
      } else {
        // Fallback para tabela prestadores com status 'DENTRO' ou 'EM_ANDAMENTO' excluindo visitantes/família
        let qPrest = supabase
          .from('prestadores')
          .select('id, data_hora_entrada, limite_permanencia_ate, perfil_acesso, status_acesso')
          .neq('perfil_acesso', 'autorizado')
          .in('status_acesso', ['DENTRO', 'EM_ANDAMENTO']);

        if (condominioId) {
          qPrest = qPrest.eq('condominio_id', condominioId);
        }
        const { data: prestDb } = await qPrest;
        lista = (prestDb || []).filter((item: any) => item.perfil_acesso !== 'autorizado');
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

    // Filtra estritamente apenas prestadores de serviço / obras
    const prestadores = (lista || []).filter(
      (item) => item && item.perfil_acesso !== 'autorizado'
    );

    prestadores.forEach((item) => {
      if (item.limite_permanencia_ate) {
        const tLimite = new Date(item.limite_permanencia_ate).getTime();
        if (tLimite - agora <= 0) {
          estourados++;
        }
      }
    });

    setTotalNoCondominio(prestadores.length);
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

    // Cálculo em memória a cada 10 segundos para detectar estouro de permanência de prestadores sem requisições desnecessárias
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

  // Se não houver nenhum prestador em permanência no condomínio, não renderiza o botão
  if (totalNoCondominio === 0) {
    return null;
  }

  const temEstourados = totalEstourados > 0;

  const handleClick = () => {
    try {
      window.dispatchEvent(new CustomEvent('infport_abrir_permanencia_prestadores'));
    } catch {}
    onNavegar();
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      title={
        temEstourados
          ? `Alerta de Permanência: ${totalNoCondominio} prestador(es) no condomínio (${totalEstourados} com permanência estourada!). Clique para ver.`
          : `Permanência de Prestadores: ${totalNoCondominio} prestador(es) em serviço no condomínio. Clique para abrir lista.`
      }
      className={`relative inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-black transition cursor-pointer select-none border shadow-xs active:scale-95 focus:outline-none ${
        temEstourados
          ? 'bg-red-950/80 hover:bg-red-900 border-red-500/70 text-white animate-pulse shadow-red-950/50'
          : 'bg-amber-950/80 hover:bg-amber-900/90 border-amber-500/50 text-amber-200 shadow-amber-950/40'
      } ${className}`}
    >
      <div className="relative flex items-center">
        <HardHat className={`w-3.5 h-3.5 ${temEstourados ? 'text-white' : 'text-amber-400'}`} />
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
