/**
 * Wrapper de compatibilidade para themeService
 */
import { obterTemaAtual, aplicarTema, alternarTema, inicializarTema } from './themeService';

export function obterModoAltoContraste(): boolean {
  return obterTemaAtual() === 'claro';
}

export function aplicarModoAltoContraste(ativo: boolean): void {
  aplicarTema(ativo ? 'claro' : 'escuro');
}

export function alternarModoAltoContraste(): boolean {
  const novo = alternarTema();
  return novo === 'claro';
}

export function inicializarModoContraste(): void {
  inicializarTema();
}
