/**
 * Hook Especializado de Encomendas: Local-First (IndexedDB) + Delta Sync + Realtime
 */

import { useMemo } from 'react';
import { useLocalFirstSync } from './useLocalFirstSync';

export interface EncomendaItemLocal {
  id: string;
  condominio_id: string;
  lote_re_id?: string;
  codigo_rastreio?: string;
  transportadora?: string;
  destinatario_nome?: string;
  unidade_bloco?: string;
  unidade?: string;
  bloco?: string;
  local_armazenamento?: string;
  status: 'Aguardando Retirada' | 'Entregue' | 'Retido' | string;
  data_hora_recebimento?: string;
  data_hora_entrega?: string;
  operador_recebimento?: string;
  operador_entrega?: string;
  recebedor_nome?: string;
  recebedor_documento?: string;
  foto_etiqueta_url?: string;
  created_at: string;
  updated_at?: string;
}

export function useEncomendasSync(condominioId: string | undefined) {
  const {
    dados,
    carregandoLocal,
    sincronizandoDelta,
    ultimoSync,
    recarregarDelta,
    mutarLocal
  } = useLocalFirstSync<EncomendaItemLocal>('encomendas_itens', condominioId, {
    habilitarRealtime: true,
    intervaloDeltaMs: 45000 // Verificação periódica suave a cada 45s
  });

  const itensRetidos = useMemo(() => {
    return dados.filter(
      (item) => item.status === 'Aguardando Retirada' || item.status === 'Retido' || item.status === 'aguardando_retirada'
    );
  }, [dados]);

  const itensEntregues = useMemo(() => {
    return dados.filter(
      (item) => item.status === 'Entregue' || item.status === 'entregue'
    );
  }, [dados]);

  return {
    todasEncomendas: dados,
    itensRetidos,
    itensEntregues,
    totalRetidos: itensRetidos.length,
    carregandoLocal,
    sincronizandoDelta,
    ultimoSync,
    recarregarDelta,
    mutarLocal
  };
}
