import { useState, useEffect } from 'react';
import { 
  obterEstadoAtualizacaoPwa, 
  inscreverEstadoAtualizacaoPwa, 
  verificarSeHaAtualizacao, 
  forcarAtualizacaoPwa 
} from '../services/pwaUpdateService';

export function usePwaUpdate() {
  const [estado, setEstado] = useState(obterEstadoAtualizacaoPwa);

  useEffect(() => {
    const desinscrever = inscreverEstadoAtualizacaoPwa((novoEstado) => {
      setEstado(novoEstado);
    });
    return desinscrever;
  }, []);

  return {
    novaVersaoDisponivel: estado.novaVersaoDisponivel,
    verificando: estado.verificando,
    atualizando: estado.atualizando,
    ultimaVerificacao: estado.ultimaVerificacao,
    verificarAtualizacao: () => verificarSeHaAtualizacao(true),
    atualizarAgora: () => forcarAtualizacaoPwa()
  };
}
