/**
 * Serviço de Gerenciamento do Ciclo de Vida e Atualização Imediata do PWA
 * 
 * Resolve o problema de cache agressivo do Service Worker na portaria:
 * 1. Registra com { updateViaCache: 'none' } para sempre verificar se há novo sw.js.
 * 2. Detecta automaticamente quando um novo build é publicado no GitHub/Vercel.
 * 3. Notifica a interface em tempo real com indicador visual.
 * 4. Permite forçar atualização imediata com 1 clique (limpa caches legados sem deslogar o operador).
 */

interface PwaUpdateState {
  novaVersaoDisponivel: boolean;
  verificando: boolean;
  atualizando: boolean;
  ultimaVerificacao: Date | null;
}

let estadoAtual: PwaUpdateState = {
  novaVersaoDisponivel: false,
  verificando: false,
  atualizando: false,
  ultimaVerificacao: null
};

const listeners = new Set<(estado: PwaUpdateState) => void>();
let registrationInstance: ServiceWorkerRegistration | null = null;
let inicializado = false;

function notificarMudanca() {
  listeners.forEach(fn => {
    try {
      fn({ ...estadoAtual });
    } catch (e) {
      console.warn('[PWA Update] Erro ao notificar listener:', e);
    }
  });

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('infport_pwa_update_state', { detail: estadoAtual }));
  }
}

/**
 * Retorna o estado atual da atualização do PWA
 */
export function obterEstadoAtualizacaoPwa(): PwaUpdateState {
  return { ...estadoAtual };
}

/**
 * Inscreve um ouvinte para mudanças de estado de atualização
 */
export function inscreverEstadoAtualizacaoPwa(fn: (estado: PwaUpdateState) => void): () => void {
  listeners.add(fn);
  fn({ ...estadoAtual });
  return () => {
    listeners.delete(fn);
  };
}

/**
 * Inicializa a detecção proativa de novas versões do Service Worker
 */
export async function inicializarDetectorAtualizacoesPwa(): Promise<void> {
  if (inicializado || typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }
  inicializado = true;

  try {
    // 1. Tenta obter registro existente ou registrar novo
    let reg = await navigator.serviceWorker.getRegistration();

    if (!reg) {
      reg = await navigator.serviceWorker.register('/sw.js', {
        updateViaCache: 'none' // Garante que o navegador nunca use cache HTTP para o sw.js
      });
    }

    registrationInstance = reg;
    estadoAtual.ultimaVerificacao = new Date();

    // 2. Se já houver um worker esperando, a nova versão já está pronta para ativar
    if (reg.waiting) {
      console.log('[PWA Update] Nova versão encontrada em espera (waiting).');
      estadoAtual.novaVersaoDisponivel = true;
      notificarMudanca();
    }

    // 3. Monitora quando um novo worker começa a ser baixado
    reg.addEventListener('updatefound', () => {
      const novoWorker = reg.installing;
      if (!novoWorker) return;

      console.log('[PWA Update] Nova versão detectada instalando...');
      novoWorker.addEventListener('statechange', () => {
        if (novoWorker.state === 'installed' && navigator.serviceWorker.controller) {
          console.log('[PWA Update] Nova versão instalada com sucesso! Pronta para ativação.');
          estadoAtual.novaVersaoDisponivel = true;
          notificarMudanca();
        }
      });
    });

    // 4. Se o controller mudar (novo worker ativou), recarrega se estava atualizando
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        console.log('[PWA Update] Novo controller ativo. Recarregando aplicação...');
        window.location.reload();
      }
    });

    // 5. Verificação periódica automática a cada 10 minutos
    setInterval(() => {
      verificarSeHaAtualizacao(false);
    }, 10 * 60 * 1000);

    // 6. Verifica quando a aba/tela volta ao foco (ex: operador desbloqueia o tablet)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        verificarSeHaAtualizacao(false);
      }
    });

    // 7. Verifica quando a conexão de internet é restaurada
    window.addEventListener('online', () => {
      verificarSeHaAtualizacao(false);
    });

    // Faz uma checagem inicial após 3 segundos da inicialização
    setTimeout(() => {
      verificarSeHaAtualizacao(false);
    }, 3000);

  } catch (err) {
    console.warn('[PWA Update] Falha ao inicializar detector de atualizações:', err);
  }
}

/**
 * Consulta o servidor para verificar se há nova versão publicada
 */
export async function verificarSeHaAtualizacao(notificarUsuario = true): Promise<boolean> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return false;
  }

  estadoAtual.verificando = true;
  notificarMudanca();

  try {
    const reg = registrationInstance || await navigator.serviceWorker.getRegistration();
    estadoAtual.ultimaVerificacao = new Date();

    if (reg) {
      registrationInstance = reg;
      await reg.update();

      if (reg.waiting) {
        estadoAtual.novaVersaoDisponivel = true;
        estadoAtual.verificando = false;
        notificarMudanca();
        return true;
      }
    }
  } catch (err) {
    console.warn('[PWA Update] Erro ao consultar atualização:', err);
  } finally {
    estadoAtual.verificando = false;
    notificarMudanca();
  }

  return estadoAtual.novaVersaoDisponivel;
}

/**
 * Força atualização imediata da aplicação:
 * 1. Envia comando SKIP_WAITING para o Service Worker em espera.
 * 2. Esvazia todos os caches do CacheStorage para não carregar JS antigo.
 * 3. Preserva a autenticação e estado do operador no localStorage.
 * 4. Recarrega a página de forma limpa.
 */
export async function forcarAtualizacaoPwa(): Promise<void> {
  estadoAtual.atualizando = true;
  notificarMudanca();

  try {
    // 1. Aciona skipWaiting em todos os registros
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      for (const reg of regs) {
        if (reg.waiting) {
          reg.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
        try {
          await reg.update();
        } catch {}
      }
    }

    // 2. Limpa todos os caches do CacheStorage (Workbox e caches de assets)
    if (typeof window !== 'undefined' && 'caches' in window) {
      try {
        const chaves = await caches.keys();
        await Promise.all(chaves.map(nome => caches.delete(nome)));
        console.log('[PWA Update] Caches do CacheStorage limpos com sucesso:', chaves);
      } catch (e) {
        console.warn('[PWA Update] Aviso ao limpar caches:', e);
      }
    }

    // 3. Limpa sessionStorage temporário mantendo intacto o localStorage (sessão do operador salva)
    try {
      sessionStorage.clear();
    } catch {}

    // 4. Recarrega a página forçando bypass de cache pelo navegador
    setTimeout(() => {
      const urlLimpa = new URL(window.location.href);
      urlLimpa.searchParams.set('_v', Date.now().toString());
      window.location.href = urlLimpa.toString();
    }, 300);

  } catch (err) {
    console.error('[PWA Update] Falha crítica na atualização, forçando reload simples:', err);
    window.location.reload();
  }
}
