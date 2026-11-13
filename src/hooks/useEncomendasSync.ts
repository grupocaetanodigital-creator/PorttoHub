/**
 * Hook Especializado de Encomendas: Local-First (IndexedDB) + Delta Sync + Realtime
 * Garante enriquecimento estrito por morador_id único, sem associação indevida por número de unidade.
 */

import { useMemo } from 'react';
import { useLocalFirstSync } from './useLocalFirstSync';
import { getCondominioConfigLocal } from '../services/condominioService';
import { enriquecerEncomendaComMorador } from '../services/encomendasService';

export interface EncomendaItemLocal {
  id: string;
  condominio_id: string;
  lote_re_id?: string;
  codigo_rastreio?: string;
  codigo_barras?: string;
  transportadora?: string;
  morador_id?: string | null;
  destinatario?: string | null;
  destinatario_nome?: string;
  moradores?: {
    id?: string;
    nome: string;
    telefone?: string;
    bloco?: string;
    unidade?: string;
  } | null;
  unidade_bloco?: string;
  unidade?: string;
  bloco?: string;
  local_armazenamento?: string;
  status: 'Aguardando Retirada' | 'Entregue' | 'Retido' | 'retido' | 'entregue' | string;
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

  const { dados: moradoresLocais } = useLocalFirstSync<any>('moradores', condominioId, {
    habilitarRealtime: true,
    intervaloDeltaMs: 120000
  });

  const todasEncomendas = useMemo(() => {
    const tipoEstrutura = condominioId ? getCondominioConfigLocal(condominioId)?.tipo_estrutura : undefined;
    return dados.map((item) =>
      enriquecerEncomendaComMorador(item, moradoresLocais, [], tipoEstrutura) as EncomendaItemLocal
    );
  }, [dados, moradoresLocais, condominioId]);

  const itensRetidos = useMemo(() => {
    return todasEncomendas.filter((item) => {
      const s = String(item.status || '').toLowerCase().trim();
      return s === 'retido' || s === 'aguardando retirada' || s === 'aguardando_retirada';
    });
  }, [todasEncomendas]);

  const itensEntregues = useMemo(() => {
    return todasEncomendas.filter((item) => String(item.status || '').toLowerCase().trim() === 'entregue');
  }, [todasEncomendas]);

  return {
    todasEncomendas,
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
