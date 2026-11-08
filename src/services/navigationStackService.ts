/**
 * PorttoHub — Gerenciador Unificado de Pilha de Navegação e Botão Voltar Nativo
 * 
 * ORDEM ESTRITA DE PRIORIDADE PARA O BOTÃO VOLTAR NATIVO (Mobile & Tablets):
 * 1. PRIORIDADE 1: Se o teclado virtual estiver aberto (campo focado), executa blur() e consome o evento.
 * 2. PRIORIDADE 2: Se houver qualquer modal, gaveta ou overlay ativo, fecha estritamente o topo da pilha LIFO.
 * 3. PRIORIDADE 3: Se o módulo ativo estiver em uma sub-tela/aba interna, retrocede 1 nível de fluxo interno.
 * 4. PRIORIDADE 4: Se estiver no topo de um módulo, retorna para o módulo anterior da pilha (ou Dashboard).
 * 5. PRIORIDADE 5: Se estiver na tela inicial (Dashboard), previne o fechamento acidental da aplicação.
 */

type FecharHandler = () => boolean | void;

interface ItemPilhaModal {
  id: string;
  fechar: FecharHandler;
}

interface ItemSubNavegacao {
  moduloId: string;
  voltarSubNivel: () => boolean; // retorna true se retrocedeu 1 nível, false se já estava no topo
}

class NavigationStackService {
  private pilhaModais: ItemPilhaModal[] = [];
  private handlersSubNavegacao: Map<string, ItemSubNavegacao> = new Map();
  private handlerVoltarModulo: (() => void) | null = null;
  private moduloAtual: string = 'dashboard';
  private inicializado: boolean = false;
  private ultimoVoltarDashboardTimestamp: number = 0;

  public inicializar(onVoltarModulo: () => void) {
    this.handlerVoltarModulo = onVoltarModulo;
    if (this.inicializado || typeof window === 'undefined') return;
    this.inicializado = true;

    // Escuta evento popstate nativo disparado pelo botão Voltar do Android ou gestos de navegação
    window.addEventListener('popstate', (e) => this.tratarBotaoVoltarNativo(e));
  }

  public setModuloAtual(modulo: string) {
    this.moduloAtual = modulo;
  }

  /**
   * PRIORIDADE 1: Verifica e fecha teclado virtual se algum input estiver com foco ativo
   */
  private fecharTecladoVirtualSeAberto(): boolean {
    if (typeof document === 'undefined') return false;
    const ativo = document.activeElement as HTMLElement | null;
    if (ativo && (ativo.tagName === 'INPUT' || ativo.tagName === 'TEXTAREA' || ativo.isContentEditable)) {
      ativo.blur();
      return true; // consumiu o evento de voltar
    }
    return false;
  }

  /**
   * Registra a abertura de um modal/overlay na pilha LIFO
   */
  public empilharModal(id: string, fechar: FecharHandler): () => void {
    // Remove ocorrência anterior com o mesmo id se houver
    this.pilhaModais = this.pilhaModais.filter(m => m.id !== id);
    this.pilhaModais.push({ id, fechar });

    // Registra entrada no histórico do navegador para capturar o popstate
    try {
      window.history.pushState({ porttohub_modal: id }, '');
    } catch {}

    // Retorna função para desempilhar quando o modal fechar normalmente pela UI
    return () => {
      this.desempilharModal(id);
    };
  }

  public desempilharModal(id: string) {
    this.pilhaModais = this.pilhaModais.filter(m => m.id !== id);
  }

  /**
   * Registra controlador de sub-navegação para telas internas (ex: formulário de cadastro, detalhes de lote)
   */
  public registrarSubNavegacao(moduloId: string, voltarSubNivel: () => boolean): () => void {
    this.handlersSubNavegacao.set(moduloId, { moduloId, voltarSubNivel });
    return () => {
      this.handlersSubNavegacao.delete(moduloId);
    };
  }

  /**
   * Executa a cadeia de prioridades ao interceptar o botão voltar do SO
   */
  public tratarBotaoVoltarNativo(e?: PopStateEvent): boolean {
    // 1. Prioridade 1: Fecha teclado virtual
    if (this.fecharTecladoVirtualSeAberto()) {
      if (e) e.preventDefault?.();
      // Repõe entrada de histórico para não sair da tela
      try { window.history.pushState(null, '', window.location.href); } catch {}
      return true;
    }

    // 2. Prioridade 2: Fecha o modal mais recente aberto (topo da pilha LIFO)
    if (this.pilhaModais.length > 0) {
      const modalDoTopo = this.pilhaModais.pop();
      if (modalDoTopo) {
        try {
          modalDoTopo.fechar();
        } catch (err) {
          console.warn('[NavigationStack] Erro ao fechar modal:', err);
        }
        if (e) e.preventDefault?.();
        return true;
      }
    }

    // 3. Prioridade 3: Se houver sub-fluxo interno na tela ativa
    const subNav = this.handlersSubNavegacao.get(this.moduloAtual);
    if (subNav) {
      const retrocedeu = subNav.voltarSubNivel();
      if (retrocedeu) {
        if (e) e.preventDefault?.();
        return true;
      }
    }

    // 4. Prioridade 4: Se estiver em tela profunda diferente do Dashboard
    if (this.moduloAtual !== 'dashboard') {
      if (this.handlerVoltarModulo) {
        this.handlerVoltarModulo();
        if (e) e.preventDefault?.();
        return true;
      }
    }

    // 5. Prioridade 5: Já está no Dashboard
    const agora = Date.now();
    if (agora - this.ultimoVoltarDashboardTimestamp > 2500) {
      this.ultimoVoltarDashboardTimestamp = agora;
      // Previne sair imediatamente do app e emite notificação suave
      try { window.history.pushState(null, '', window.location.href); } catch {}
      window.dispatchEvent(new CustomEvent('porttohub_toast_voltar_dashboard'));
      if (e) e.preventDefault?.();
      return true;
    }

    // Se pressionado duas vezes no Dashboard dentro de 2.5s, permite o comportamento do sistema
    return false;
  }
}

export const navigationStack = new NavigationStackService();
