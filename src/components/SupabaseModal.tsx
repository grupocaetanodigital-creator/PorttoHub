import React, { useState } from 'react';
import { useTurnoCerto } from '../lib/store';
import { SUPABASE_URL, SUPABASE_SCHEMA_SQL, supabase } from '../lib/supabase';
import { Database, Check, Copy, ExternalLink, X, RefreshCw, ShieldCheck } from 'lucide-react';

interface SupabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SupabaseModal: React.FC<SupabaseModalProps> = ({ isOpen, onClose }) => {
  const { supabaseConnected, syncWithSupabase, isLoading } = useTurnoCerto();
  const [copied, setCopied] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SCHEMA_SQL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleTestConnection = async () => {
    setTestResult('Testando conexão com Supabase...');
    try {
      const { data, error } = await supabase.from('profiles').select('count', { count: 'exact', head: true });
      if (error) {
        if (error.code === '42P01') {
          setTestResult('Conectado ao Supabase! As tabelas ainda não foram criadas. Execute o script SQL abaixo no SQL Editor do Supabase.');
        } else {
          setTestResult(`Conectado ao Supabase com resposta: ${error.message}`);
        }
      } else {
        setTestResult(`Conectado com sucesso! Tabela profiles verificada.`);
      }
      await syncWithSupabase();
    } catch (err: any) {
      setTestResult(`Erro de rede: ${err.message}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Integração Supabase PostgreSQL & Storage
              </h3>
              <p className="text-xs text-slate-500 font-mono">
                {SUPABASE_URL}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-4">
          {/* Connection Status Box */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
              <div>
                <p className="text-xs font-bold text-slate-900">
                  Credenciais Supabase Injetadas Oficialmente
                </p>
                <p className="text-[11px] text-slate-500 font-mono">
                  Ref: cyyvubiythuzhdwbuogg · Chave Anon Ativa
                </p>
              </div>
            </div>

            <button
              onClick={handleTestConnection}
              disabled={isLoading}
              className="py-1.5 px-3 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 flex items-center gap-1.5 shadow-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Testar Conexão</span>
            </button>
          </div>

          {testResult && (
            <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg text-xs text-indigo-900">
              {testResult}
            </div>
          )}

          {/* SQL Script View & Copy */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Script SQL das Tabelas (Módulo 1)
              </h4>
              <button
                onClick={handleCopySql}
                className="py-1 px-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-medium flex items-center gap-1.5 transition-colors"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar Script SQL</span>
                  </>
                )}
              </button>
            </div>

            <div className="relative">
              <pre className="p-4 bg-slate-950 text-slate-300 rounded-xl text-[11px] font-mono overflow-x-auto max-h-64 leading-relaxed border border-slate-800">
                {SUPABASE_SCHEMA_SQL}
              </pre>
            </div>
            <p className="text-[11px] text-slate-500 mt-1.5">
              Dica: Abra o SQL Editor do seu Supabase e cole o script acima para criar as tabelas `profiles`, `condominios`, `escalas_trabalho`, `apontamentos_folha` e `registros_ponto`.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <a
            href="https://supabase.com/dashboard/project/cyyvubiythuzhdwbuogg/sql"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Abrir SQL Editor no Supabase</span>
          </a>

          <button
            onClick={onClose}
            className="py-1.5 px-4 bg-slate-900 text-white hover:bg-slate-800 rounded-lg text-xs font-semibold"
          >
            Concluir
          </button>
        </div>
      </div>
    </div>
  );
};
