import React, { Component, ReactNode, ErrorInfo } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  nomeModulo?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export default class ModuloErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ModuloErrorBoundary] Erro ao renderizar módulo:', error, errorInfo);
  }

  public handleTentarNovamente = () => {
    this.setState({ hasError: false, error: undefined });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[460px] w-full p-8 space-y-4 bg-slate-50/50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800 m-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-500 shadow-lg shadow-amber-500/5">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <div className="text-center space-y-1 max-w-md">
            <p className="text-xs font-bold uppercase tracking-wider text-amber-500">
              Instabilidade de Conexão ou Nova Versão
            </p>
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
              Não foi possível carregar o módulo {this.props.nomeModulo ? `"${this.props.nomeModulo}"` : ''}
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              O módulo foi atualizado ou a rede oscilou. Clique no botão abaixo para recarregar com a versão mais recente.
            </p>
          </div>
          <button
            type="button"
            onClick={this.handleTentarNovamente}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            Recarregar Módulo
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
