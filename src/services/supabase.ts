import { createClient } from '@supabase/supabase-js';

// IP da Máquina Virtual do usuário na Oracle Cloud
export const OCI_DEFAULT_IP = '163.176.49.21';
export const OCI_DEFAULT_URL = `http://${OCI_DEFAULT_IP}:8000`;

// Endpoint padrão de contingência (Supabase Nuvem)
const FALLBACK_SUPABASE_URL = 'https://kkeizhscivyfjgetnbke.supabase.co';
const FALLBACK_SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtrZWl6aHNjaXZ5ZmpnZXRuYmtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI2ODk5NDUsImV4cCI6MjEwODI2NTk0NX0.hQzzvICbZfNPziWrj8DlD-A8-Vm4xbr25Nr0xQe3BEA';

// JWT anônimo padrão compatível com PostgREST na Oracle Cloud
const OCI_DEFAULT_ANON_JWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlhdCI6MTcwMDAwMDAwMCwiZXhwIjoyMTAwMDAwMDAwfQ.porttohub_oci_default_anon_token';

/**
 * Resolve dinamicamente a URL da API do banco de dados com prioridade:
 * 1. Configuração salva em tempo de execução no localStorage (porttohub_oci_url)
 * 2. Variável de ambiente VITE_OCI_API_URL (Oracle Cloud)
 * 3. Variável de ambiente VITE_SUPABASE_URL
 * 4. Padrão: Máquina Virtual Oracle Cloud (163.176.49.21:8000)
 */
export function resolveApiUrl(): string {
  // 1. Verificação de override no navegador
  if (typeof window !== 'undefined' && window.localStorage) {
    const ociSalvo = window.localStorage.getItem('porttohub_oci_url');
    if (ociSalvo && ociSalvo.trim().startsWith('http')) {
      return ociSalvo.trim().replace(/\/+$/, '');
    }
  }

  // 2. Variável específica da Oracle Cloud (OCI)
  const ociEnv = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_OCI_API_URL) ||
                 (typeof process !== 'undefined' && process.env?.VITE_OCI_API_URL);
  if (ociEnv && typeof ociEnv === 'string' && ociEnv.trim().startsWith('http')) {
    return ociEnv.trim().replace(/\/+$/, '');
  }

  // 3. Variável padrão VITE_SUPABASE_URL
  const envUrl = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) ||
                 (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_URL);
  if (envUrl && typeof envUrl === 'string' && !envUrl.includes('juafrepntyksgqiqzyes')) {
    return envUrl.trim().replace(/\/+$/, '');
  }

  // 4. Default: Servidor próprio na Oracle Cloud do usuário
  return OCI_DEFAULT_URL;
}

/**
 * Resolve a chave/token JWT de autenticação:
 */
export function resolveApiKey(): string {
  // 1. Chave salva no navegador para OCI
  if (typeof window !== 'undefined' && window.localStorage) {
    const ociKeySalva = window.localStorage.getItem('porttohub_oci_key');
    if (ociKeySalva && ociKeySalva.trim().length > 10) {
      return ociKeySalva.trim();
    }
  }

  // 2. Chave OCI por variável de ambiente
  const ociKeyEnv = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_OCI_ANON_KEY) ||
                    (typeof process !== 'undefined' && process.env?.VITE_OCI_ANON_KEY);
  if (ociKeyEnv && typeof ociKeyEnv === 'string' && ociKeyEnv.trim().length > 5) {
    return ociKeyEnv.trim();
  }

  // Se a URL for da Oracle Cloud (IP ou porta 8000), usa o JWT compatível com PostgREST
  const url = resolveApiUrl();
  const eServidorProprio = !url.includes('supabase.co');
  if (eServidorProprio) {
    return ociKeyEnv || OCI_DEFAULT_ANON_JWT;
  }

  // 3. Chave do Supabase
  const envKey = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) ||
                 (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_ANON_KEY);
  if (envKey && typeof envKey === 'string' && !envKey.includes('juafrepntyksgqiqzyes')) {
    return envKey.trim();
  }

  return FALLBACK_SUPABASE_KEY;
}

/**
 * Salva a URL da sua Máquina Virtual na Oracle Cloud no navegador
 * Exemplo: salvarConfiguracaoOCI('http://163.176.49.21:8000')
 */
export function salvarConfiguracaoOCI(url: string, key?: string): void {
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.setItem('porttohub_oci_url', url.trim());
    if (key) {
      window.localStorage.setItem('porttohub_oci_key', key.trim());
    }
    // Recarrega a aplicação para reinicializar o cliente
    window.location.reload();
  }
}

/**
 * Redefine e limpa o override manual da Oracle Cloud
 */
export function limparConfiguracaoOCI(): void {
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.removeItem('porttohub_oci_url');
    window.localStorage.removeItem('porttohub_oci_key');
    window.location.reload();
  }
}

/**
 * Retorna o status de conexão atual
 */
export function obterStatusConexaoBanco(): { url: string; tipo: 'oci' | 'supabase'; customizado: boolean } {
  const url = resolveApiUrl();
  const eOCI = !url.includes('supabase.co');
  const customizado = typeof window !== 'undefined' && !!window.localStorage?.getItem('porttohub_oci_url');
  return {
    url,
    tipo: eOCI ? 'oci' : 'supabase',
    customizado
  };
}

// Inicialização do cliente Supabase / PostgREST
export const supabase = createClient(resolveApiUrl(), resolveApiKey(), {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});
