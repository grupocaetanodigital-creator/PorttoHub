/**
 * Hook Especializado de Custódia de Itens: Local-First (IndexedDB) + Delta Sync + Realtime
 */

import { useMemo } from 'react';
import { useLocalFirstSync } from './useLocalFirstSync';
import { ItemCustodia } from '../services/custodiaService';

export function useCustodiaSync(condominioId: string | undefined) {
  const {
    dados,
    carregandoLocal,
    sincronizandoDelta,
    ultimoSync,
    recarregarDelta,
    mutarLocal
  } = useLocalFirstSync<ItemCustodia>('custodia', condominioId, {
    habilitarRealtime: true,
    intervaloDeltaMs: 45000
  });

  const itensGuardados = useMemo(() => {
    return dados.filter(
      (item) => item.status === 'Guardado' || item.status === 'Retido' || item.status === 'Aguardando Retirada' || item.status === 'Pendente'
    );
  }, [dados]);

  const itensRetirados = useMemo(() => {
    return dados.filter(
      (item) => item.status === 'Retirado' || item.status === 'Devolvido' || item.status === 'Baixado'
    );
  }, [dados]);

  return {
    todosItens: dados,
    itensGuardados,
    itensRetirados,
    totalGuardados: itensGuardados.length,
    carregandoLocal,
    sincronizandoDelta,
    ultimoSync,
    recarregarDelta,
    mutarLocal
  };
}
