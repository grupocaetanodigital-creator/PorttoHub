import React, { useState } from 'react';
import { Database, CheckCircle2, Copy, ExternalLink, ShieldCheck } from 'lucide-react';
import { BottomSheet } from '../ui/BottomSheet';
import { isSupabaseConfigured } from '../../lib/supabase';
import { useApp } from '../../context/AppContext';

interface SupabaseSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SupabaseSettingsModal: React.FC<SupabaseSettingsModalProps> = ({ isOpen, onClose }) => {
  const { showToast } = useApp();
  const [copied, setCopied] = useState(false);

  const sampleSql = `-- Script de Criação das Tabelas TurnoCerto no Supabase:
CREATE TABLE IF NOT EXISTS condominios (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL,
  endereco TEXT NOT NULL,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  raio_gps_metros INTEGER DEFAULT 60,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS colaboradores (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  cpf TEXT NOT NULL,
  matricula TEXT NOT NULL,
  cargo TEXT NOT NULL,
  jornada TEXT NOT NULL,
  condominio_id TEXT REFERENCES condominios(id),
  salario_base NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS turnos (
  id TEXT PRIMARY KEY,
  condominio_id TEXT REFERENCES condominios(id),
  posto_nome TEXT NOT NULL,
  data DATE NOT NULL,
  periodo TEXT NOT NULL,
  status TEXT NOT NULL,
  colaborador_titular_id TEXT,
  colaborador_atual_id TEXT,
  ft_designada BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS holerites (
  id TEXT PRIMARY KEY,
  colaborador_id TEXT REFERENCES colaboradores(id),
  mes_referencia TEXT NOT NULL,
  salario_base NUMERIC(10,2) NOT NULL,
  total_proventos NUMERIC(10,2) NOT NULL,
  total_descontos NUMERIC(10,2) NOT NULL,
  valor_liquido NUMERIC(10,2) NOT NULL,
  itens JSONB NOT NULL,
  publicado BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);`;

  const copySql = () => {
    navigator.clipboard.writeText(sampleSql);
    setCopied(true);
    showToast('Script SQL copiado para a área de transferência!', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="Integração Supabase & Banco de Dados"
      subtitle="Conexão com PostgreSQL e tabelas do TurnoCerto"
      maxHeight="max-h-[90vh]"
    >
      <div className="space-y-4 text-xs text-slate-300">
        <div className={`p-3.5 rounded-2xl border flex items-center gap-3 ${
          isSupabaseConfigured
            ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
            : 'bg-blue-950/40 border-blue-500/40 text-blue-200'
        }`}>
          <Database className="w-6 h-6 shrink-0 text-blue-400" />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white text-xs">
                Status: {isSupabaseConfigured ? '🟢 Conectado ao Supabase Remoto' : '⚡ Modo Híbrido Reativo (Local + Cloud-Ready)'}
              </span>
            </div>
            <p className="text-[11px] mt-0.5 opacity-90">
              Todos os dados de postos, equipe, turnos e holerites são persistidos com reatividade imediata no navegador e sincronizam automaticamente via API REST do Supabase.
            </p>
          </div>
        </div>

        <div className="bg-slate-800/80 rounded-2xl p-4 border border-slate-700/60 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-bold text-white text-xs flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Variáveis de Ambiente Suportadas:
            </span>
          </div>

          <div className="space-y-2 font-mono text-[11px]">
            <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-700">
              <p className="text-slate-400">VITE_SUPABASE_URL</p>
              <p className="text-slate-200 truncate">{import.meta.env.VITE_SUPABASE_URL || 'https://sua-instancia.supabase.co'}</p>
            </div>
            <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-700">
              <p className="text-slate-400">VITE_SUPABASE_ANON_KEY</p>
              <p className="text-slate-200 truncate">{import.meta.env.VITE_SUPABASE_ANON_KEY ? '•••••••••••••••••••••••' : 'sua-chave-anon-publica'}</p>
            </div>
          </div>
        </div>

        <div className="bg-slate-800/80 rounded-2xl p-4 border border-slate-700/60 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-white text-xs">Schema SQL DDL Automático:</span>
            <button
              type="button"
              onClick={copySql}
              className="px-2.5 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 text-[11px] font-semibold text-white flex items-center gap-1.5 transition-colors"
            >
              {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copiado!' : 'Copiar SQL'}</span>
            </button>
          </div>
          <pre className="bg-slate-950 p-3 rounded-xl text-[10px] text-slate-300 font-mono overflow-x-auto max-h-36">
            {sampleSql}
          </pre>
        </div>

        <div className="pt-2">
          <button
            type="button"
            onClick={onClose}
            className="w-full min-h-[46px] rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </BottomSheet>
  );
};
