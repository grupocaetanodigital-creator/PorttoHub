import React, { useState, useEffect } from 'react';
import { 
  Package, 
  Footprints, 
  Key, 
  AlertTriangle, 
  Box, 
  HardHat, 
  Radio, 
  CheckCircle2, 
  Clock, 
  Search,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Filter,
  Layers
} from 'lucide-react';
import { ConsolidacaoPosto, isModuloHabilitado } from '../pages/PassagemPosto';

interface TabelasResumoPostoProps {
  consolidacao: ConsolidacaoPosto;
  modoConferencia?: boolean;
  onConferirItem?: (modulo: string) => void;
  statusConferencia?: Record<string, boolean>;
  featureFlags?: any;
}

export default function TabelasResumoPosto({
  consolidacao,
  modoConferencia = false,
  onConferirItem,
  statusConferencia = {},
  featureFlags
}: TabelasResumoPostoProps) {
  const flags = featureFlags || (consolidacao as any)?.featureFlags || null;
  const [tabelaAtiva, setTabelaAtiva] = useState<'geral' | 'encomendas' | 'bancada' | 'rondas' | 'chaves' | 'ocorrencias' | 'custodia' | 'prestadores' | 'materiais'>('geral');
  const [filtroTexto, setFiltroTexto] = useState('');

  useEffect(() => {
    if (tabelaAtiva !== 'geral' && !isModuloHabilitado(tabelaAtiva, flags)) {
      setTabelaAtiva('geral');
    }
  }, [tabelaAtiva, flags]);

  const enc = consolidacao.encomendas;
  const ban = consolidacao.bancada;
  const ron = consolidacao.rondas;
  const cha = consolidacao.chaves;
  const oco = consolidacao.ocorrencias;
  const cus = consolidacao.custodia;
  const pre = consolidacao.prestadores;
  const mat = consolidacao.materiais;

  return (
    <div className="space-y-2.5">
      {/* Seletor de Tabela / Abas de Resumo Compactas */}
      <div className="flex flex-wrap gap-1 p-1 bg-slate-100 rounded-lg border border-slate-200">
        <button
          type="button"
          onClick={() => setTabelaAtiva('geral')}
          className={`px-2.5 py-1 text-xs font-bold rounded-md transition flex items-center gap-1 cursor-pointer ${
            tabelaAtiva === 'geral' ? 'bg-slate-900 text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-200'
          }`}
        >
          <span>📊 Geral</span>
        </button>

        {isModuloHabilitado('encomendas', flags) && (
          <button
            type="button"
            onClick={() => setTabelaAtiva('encomendas')}
            className={`px-2.5 py-1 text-xs font-bold rounded-md transition flex items-center gap-1 cursor-pointer ${
              tabelaAtiva === 'encomendas' ? 'bg-purple-700 text-white shadow-2xs' : 'text-slate-600 hover:bg-purple-50'
            }`}
          >
            <Package className="w-3 h-3" />
            <span>Encomendas ({enc.totalRetidasNoPosto})</span>
          </button>
        )}

        {isModuloHabilitado('bancada', flags) && (
          <button
            type="button"
            onClick={() => setTabelaAtiva('bancada')}
            className={`px-2.5 py-1 text-xs font-bold rounded-md transition flex items-center gap-1 cursor-pointer ${
              tabelaAtiva === 'bancada' ? 'bg-amber-600 text-white shadow-2xs' : 'text-slate-600 hover:bg-amber-50'
            }`}
          >
            <Layers className="w-3 h-3" />
            <span>Bancada ({ban?.totalVolumes || 0})</span>
          </button>
        )}

        {isModuloHabilitado('rondas', flags) && (
          <button
            type="button"
            onClick={() => setTabelaAtiva('rondas')}
            className={`px-2.5 py-1 text-xs font-bold rounded-md transition flex items-center gap-1 cursor-pointer ${
              tabelaAtiva === 'rondas' ? 'bg-indigo-700 text-white shadow-2xs' : 'text-slate-600 hover:bg-indigo-50'
            }`}
          >
            <Footprints className="w-3 h-3" />
            <span>Rondas ({ron.totalExecutadasPlantao})</span>
          </button>
        )}

        {isModuloHabilitado('chaves', flags) && (
          <button
            type="button"
            onClick={() => setTabelaAtiva('chaves')}
            className={`px-2.5 py-1 text-xs font-bold rounded-md transition flex items-center gap-1 cursor-pointer ${
              tabelaAtiva === 'chaves' ? 'bg-amber-700 text-white shadow-2xs' : 'text-slate-600 hover:bg-amber-50'
            }`}
          >
            <Key className="w-3 h-3" />
            <span>Chaves ({cha.totalFora})</span>
          </button>
        )}

        {isModuloHabilitado('ocorrencias', flags) && (
          <button
            type="button"
            onClick={() => setTabelaAtiva('ocorrencias')}
            className={`px-2.5 py-1 text-xs font-bold rounded-md transition flex items-center gap-1 cursor-pointer ${
              tabelaAtiva === 'ocorrencias' ? 'bg-red-700 text-white shadow-2xs' : 'text-slate-600 hover:bg-red-50'
            }`}
          >
            <AlertTriangle className="w-3 h-3" />
            <span>Ocorrências ({oco.totalPendentes})</span>
          </button>
        )}

        {isModuloHabilitado('custodia', flags) && (
          <button
            type="button"
            onClick={() => setTabelaAtiva('custodia')}
            className={`px-2.5 py-1 text-xs font-bold rounded-md transition flex items-center gap-1 cursor-pointer ${
              tabelaAtiva === 'custodia' ? 'bg-sky-700 text-white shadow-2xs' : 'text-slate-600 hover:bg-sky-50'
            }`}
          >
            <Box className="w-3 h-3" />
            <span>Custódia ({cus.totalAguardando})</span>
          </button>
        )}

        {isModuloHabilitado('prestadores', flags) && (
          <button
            type="button"
            onClick={() => setTabelaAtiva('prestadores')}
            className={`px-2.5 py-1 text-xs font-bold rounded-md transition flex items-center gap-1 cursor-pointer ${
              tabelaAtiva === 'prestadores' ? 'bg-blue-700 text-white shadow-2xs' : 'text-slate-600 hover:bg-blue-50'
            }`}
          >
            <HardHat className="w-3 h-3" />
            <span>Prestadores ({pre.totalPresentes})</span>
          </button>
        )}

        {isModuloHabilitado('materiais', flags) && (
          <button
            type="button"
            onClick={() => setTabelaAtiva('materiais')}
            className={`px-2.5 py-1 text-xs font-bold rounded-md transition flex items-center gap-1 cursor-pointer ${
              tabelaAtiva === 'materiais' ? 'bg-emerald-700 text-white shadow-2xs' : 'text-slate-600 hover:bg-emerald-50'
            }`}
          >
            <Radio className="w-3 h-3" />
            <span>Materiais ({mat.totalEquipamentos})</span>
          </button>
        )}
      </div>

      {/* 1. TABELA MESTRE EXECUTIVA (RESUMO GERAL DO PLANTÃO) */}
      {tabelaAtiva === 'geral' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="p-3.5 bg-slate-900 text-white flex justify-between items-center">
            <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Tabela de Resumo Consolidado do Plantão
            </span>
            <span className="text-[11px] text-slate-300">
              Conferência rápida dos módulos
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b text-[11px] uppercase">
                <tr>
                  <th className="p-3">Módulo</th>
                  <th className="p-3">Métricas do Plantão</th>
                  <th className="p-3">Pendências / Atenção Crítica</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {/* Encomendas */}
                {isModuloHabilitado('encomendas', flags) && (
                <tr className="hover:bg-slate-50/80 transition">
                  <td className="p-3 font-bold text-purple-950 flex items-center gap-2">
                    <Package className="w-4 h-4 text-purple-600" />
                    Encomendas & RE
                  </td>
                  <td className="p-3">
                    <strong>{enc.totalRePlantao}</strong> REs recebidas • <strong>{enc.qtdPacotesTriadosPlantao}</strong> triados • <strong>{enc.qtdPacotesRetiradosPlantao}</strong> retirados
                  </td>
                  <td className="p-3">
                    {enc.reFaltandoTriagem > 0 ? (
                      <span className="text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded font-bold">
                        ⚠️ {enc.reFaltandoTriagem} RE(s) aguardando ({enc.qtdFaltaTriagem} volumes a triar)
                      </span>
                    ) : (
                      <span className="text-emerald-700 font-medium">✓ Triagem 100% em dia ({enc.totalRetidasNoPosto} pacotes retidos no posto)</span>
                    )}
                  </td>
                  <td className="p-3 text-center">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      enc.reFaltandoTriagem > 0 ? 'bg-amber-100 text-amber-900' : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {enc.reFaltandoTriagem > 0 ? 'Pendente' : 'Normal'}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <button
                      type="button"
                      onClick={() => setTabelaAtiva('encomendas')}
                      className="text-purple-700 hover:text-purple-900 font-bold text-xs underline"
                    >
                      Ver Detalhes
                    </button>
                  </td>
                </tr>
                )}

                {/* Bancada (Balcão Físico) */}
                {isModuloHabilitado('bancada', flags) && (
                <tr className="hover:bg-slate-50/80 transition">
                  <td className="p-3 font-bold text-amber-950 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-amber-600" />
                    Bancada de Portaria (Balcão)
                  </td>
                  <td className="p-3">
                    <strong>{ban?.totalVolumes || 0}</strong> volume(s) físicos • <strong>{ban?.totalUnidades || 0}</strong> unidade(s)
                  </td>
                  <td className="p-3">
                    {ban && ban.estruturasResumo && ban.estruturasResumo.length > 0 ? (
                      <span className="text-amber-900 font-medium">
                        Disponíveis na bancada: {ban.estruturasResumo.map(g => `${g.estrutura} (${g.totalVolumes} vol)`).join(' • ')}
                      </span>
                    ) : (
                      <span className="text-emerald-700 font-medium">✓ Bancada livre / sem volumes pendentes</span>
                    )}
                  </td>
                  <td className="p-3 text-center">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      (ban?.totalVolumes || 0) > 0 ? 'bg-amber-100 text-amber-900' : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {(ban?.totalVolumes || 0) > 0 ? `${ban?.totalVolumes} Vol.` : 'Livre'}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <button
                      type="button"
                      onClick={() => setTabelaAtiva('bancada')}
                      className="text-amber-700 hover:text-amber-900 font-bold text-xs underline"
                    >
                      Ver Detalhes
                    </button>
                  </td>
                </tr>
                )}

                {/* Rondas */}
                {isModuloHabilitado('rondas', flags) && (
                <tr className="hover:bg-slate-50/80 transition">
                  <td className="p-3 font-bold text-indigo-950 flex items-center gap-2">
                    <Footprints className="w-4 h-4 text-indigo-600" />
                    Rondas Patrimoniais
                  </td>
                  <td className="p-3">
                    <strong>{ron.totalExecutadasPlantao}</strong> executadas (<strong>{ron.concluidas}</strong> 100% concluídas)
                  </td>
                  <td className="p-3">
                    {ron.temDivergencias ? (
                      <span className="text-red-800 bg-red-50 border border-red-200 px-2 py-0.5 rounded font-bold">
                        🚨 {ron.listaDivergencias.length} divergência(s) / falha(s) nas rondas
                      </span>
                    ) : (
                      <span className="text-emerald-700 font-medium">✓ Nenhuma falha ou divergência GPS/NFC</span>
                    )}
                  </td>
                  <td className="p-3 text-center">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      ron.temDivergencias ? 'bg-red-100 text-red-900' : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {ron.temDivergencias ? 'Divergência' : 'Concluído'}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <button
                      type="button"
                      onClick={() => setTabelaAtiva('rondas')}
                      className="text-indigo-700 hover:text-indigo-900 font-bold text-xs underline"
                    >
                      Ver Detalhes
                    </button>
                  </td>
                </tr>
                )}

                {/* Chaves */}
                {isModuloHabilitado('chaves', flags) && (
                <tr className="hover:bg-slate-50/80 transition">
                  <td className="p-3 font-bold text-amber-950 flex items-center gap-2">
                    <Key className="w-4 h-4 text-amber-600" />
                    Quadro de Chaves
                  </td>
                  <td className="p-3">
                    <strong>{cha.totalFora}</strong> chave(s) fora do quadro
                  </td>
                  <td className="p-3">
                    {cha.totalFora > 0 ? (
                      <span className="text-amber-900 font-medium">
                        Com prestadores/moradores (
                        {cha.listaChavesFora.filter(k => k.atrasado).length > 0 ? (
                          <strong className="text-red-700">🚨 {cha.listaChavesFora.filter(k => k.atrasado).length} com devolução atrasada!</strong>
                        ) : 'Todas no prazo previsto'})
                      </span>
                    ) : (
                      <span className="text-emerald-700 font-medium">✓ Todas as chaves recolhidas no quadro</span>
                    )}
                  </td>
                  <td className="p-3 text-center">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      cha.totalFora > 0 ? 'bg-amber-100 text-amber-900' : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {cha.totalFora > 0 ? `${cha.totalFora} Fora` : '100% Quadro'}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <button
                      type="button"
                      onClick={() => setTabelaAtiva('chaves')}
                      className="text-amber-700 hover:text-amber-900 font-bold text-xs underline"
                    >
                      Ver Detalhes
                    </button>
                  </td>
                </tr>
                )}

                {/* Ocorrências */}
                {isModuloHabilitado('ocorrencias', flags) && (
                <tr className="hover:bg-slate-50/80 transition">
                  <td className="p-3 font-bold text-red-950 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                    Livro de Ocorrências
                  </td>
                  <td className="p-3">
                    <strong>{oco.totalPendentes}</strong> ocorrência(s) não resolvida(s)
                  </td>
                  <td className="p-3">
                    {oco.totalPendentes > 0 ? (
                      <span className="text-red-800 font-bold bg-red-50 border border-red-200 px-2 py-0.5 rounded">
                        🚨 Consta pendência ativa (independente de estar há 10+ dias em aberto!)
                      </span>
                    ) : (
                      <span className="text-emerald-700 font-medium">✓ Todas as ocorrências foram solucionadas</span>
                    )}
                  </td>
                  <td className="p-3 text-center">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      oco.totalPendentes > 0 ? 'bg-red-100 text-red-900' : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {oco.totalPendentes > 0 ? 'Atenção' : 'Sem Pendências'}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <button
                      type="button"
                      onClick={() => setTabelaAtiva('ocorrencias')}
                      className="text-red-700 hover:text-red-900 font-bold text-xs underline"
                    >
                      Ver Detalhes
                    </button>
                  </td>
                </tr>
                )}

                {/* Custódia */}
                {isModuloHabilitado('custodia', flags) && (
                <tr className="hover:bg-slate-50/80 transition">
                  <td className="p-3 font-bold text-sky-950 flex items-center gap-2">
                    <Box className="w-4 h-4 text-sky-600" />
                    Custódia Portaria
                  </td>
                  <td className="p-3">
                    <strong>{cus.totalAguardando}</strong> item(ns) retidos na guarita
                  </td>
                  <td className="p-3">
                    {cus.totalAguardando > 0 ? (
                      <span className="text-slate-600">Aguardando retirada pelos destinatários</span>
                    ) : (
                      <span className="text-slate-500 italic">Nenhum objeto retido no momento</span>
                    )}
                  </td>
                  <td className="p-3 text-center">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800">
                      {cus.totalAguardando} Itens
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <button
                      type="button"
                      onClick={() => setTabelaAtiva('custodia')}
                      className="text-sky-700 hover:text-sky-900 font-bold text-xs underline"
                    >
                      Ver Detalhes
                    </button>
                  </td>
                </tr>
                )}

                {/* Prestadores */}
                {isModuloHabilitado('prestadores', flags) && (
                <tr className="hover:bg-slate-50/80 transition">
                  <td className="p-3 font-bold text-blue-950 flex items-center gap-2">
                    <HardHat className="w-4 h-4 text-blue-600" />
                    Autorizados & Prestadores
                  </td>
                  <td className="p-3">
                    <strong>{pre.totalPresentes}</strong> dentro do condomínio • <strong>{pre.totalLiberados ?? 0}</strong> liberados ativos
                  </td>
                  <td className="p-3">
                    {pre.totalPresentes > 0 ? (
                      <span className="text-blue-900 font-medium">
                        {pre.listaPresentes?.filter(p => p.estourado).length > 0 ? (
                          <strong className="text-red-700">🚨 {pre.listaPresentes?.filter(p => p.estourado).length} com tempo estourado!</strong>
                        ) : 'Pessoas dentro com crachá e destino regular'}
                      </span>
                    ) : (
                      <span className="text-slate-500 italic">Nenhum prestador ou visitante no condomínio</span>
                    )}
                  </td>
                  <td className="p-3 text-center">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      pre.totalPresentes > 0 ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {pre.totalPresentes > 0 ? `${pre.totalPresentes} No Posto` : 'Nenhum'}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <button
                      type="button"
                      onClick={() => setTabelaAtiva('prestadores')}
                      className="text-blue-700 hover:text-blue-900 font-bold text-xs underline"
                    >
                      Ver Detalhes
                    </button>
                  </td>
                </tr>
                )}

                {/* Materiais */}
                {isModuloHabilitado('materiais', flags) && (
                <tr className="hover:bg-slate-50/80 transition">
                  <td className="p-3 font-bold text-emerald-950 flex items-center gap-2">
                    <Radio className="w-4 h-4 text-emerald-600" />
                    Inventário & Materiais
                  </td>
                  <td className="p-3">
                    <strong>{mat.totalEquipamentos}</strong> equipamentos registrados (<strong>{mat.perfeitos}</strong> 100% OK)
                  </td>
                  <td className="p-3">
                    {mat.avariados > 0 ? (
                      <span className="text-red-800 bg-red-50 border border-red-200 px-2 py-0.5 rounded font-bold">
                        ⚠️ {mat.avariados} equipamento(s) com avaria ou defeito informado
                      </span>
                    ) : (
                      <span className="text-emerald-700 font-medium">✓ HTs, lanternas e celulares em perfeito estado</span>
                    )}
                  </td>
                  <td className="p-3 text-center">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      mat.avariados > 0 ? 'bg-red-100 text-red-900' : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {mat.avariados > 0 ? 'Com Avaria' : '100% OK'}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <button
                      type="button"
                      onClick={() => setTabelaAtiva('materiais')}
                      className="text-emerald-700 hover:text-emerald-900 font-bold text-xs underline"
                    >
                      Ver Detalhes
                    </button>
                  </td>
                </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. TABELA ESPECÍFICA: ENCOMENDAS & LOTES RE */}
      {tabelaAtiva === 'encomendas' && (
        <div className="bg-white rounded-xl border border-purple-200 overflow-hidden shadow-sm space-y-4 p-4">
          <div className="flex justify-between items-center border-b pb-2">
            <h4 className="font-bold text-purple-950 text-sm flex items-center gap-2">
              <Package className="w-4 h-4 text-purple-600" />
              Tabela de Recebimento de Encomendas (RE) & Status da Triagem
            </h4>
            <span className="text-xs bg-purple-50 text-purple-800 px-2.5 py-1 rounded-full font-bold">
              Total Retido no Posto: {enc.totalRetidasNoPosto} pacote(s)
            </span>
          </div>

          {enc.lotesPendentes.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-purple-50 text-purple-950 font-bold text-[11px] uppercase border-b border-purple-100">
                  <tr>
                    <th className="p-2.5">Código RE</th>
                    <th className="p-2.5">Entregador / Transportadora</th>
                    <th className="p-2.5 text-center">Qtd Declarada</th>
                    <th className="p-2.5 text-center">Qtd Triada</th>
                    <th className="p-2.5 text-center">Falta Triar</th>
                    <th className="p-2.5 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {enc.lotesPendentes.map((lote) => {
                    const falta = Math.max(0, lote.qtdDeclarada - lote.qtdTriada);
                    return (
                      <tr key={lote.id} className="hover:bg-purple-50/40">
                        <td className="p-2.5 font-mono font-bold text-purple-900">{lote.codigo}</td>
                        <td className="p-2.5">
                          <strong>{lote.entregadorEmpresa}</strong> ({lote.entregadorNome})
                        </td>
                        <td className="p-2.5 text-center font-bold">{lote.qtdDeclarada}</td>
                        <td className="p-2.5 text-center text-emerald-700 font-bold">{lote.qtdTriada}</td>
                        <td className="p-2.5 text-center text-amber-700 font-bold">{falta}</td>
                        <td className="p-2.5 text-center">
                          <span className="bg-amber-100 text-amber-800 font-bold text-[10px] px-2 py-0.5 rounded-full uppercase">
                            {lote.status.replace('_', ' ')}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center p-6 bg-slate-50 rounded-xl text-slate-500 text-xs">
              ✓ Todos os lotes de entrega (RE) foram triados e registrados no sistema.
            </div>
          )}
        </div>
      )}

      {/* 2.1 TABELA ESPECÍFICA: BANCADA DE PORTARIA & CONFERÊNCIA DE BALCÃO */}
      {tabelaAtiva === 'bancada' && (
        <div className="bg-white rounded-xl border border-amber-200 overflow-hidden shadow-sm space-y-4 p-4">
          <div className="flex justify-between items-center border-b pb-2">
            <h4 className="font-bold text-amber-950 text-sm flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-600" />
              Conferência Física da Bancada (Volumes no Balcão por Torre e Unidade)
            </h4>
            <span className="text-xs bg-amber-50 text-amber-900 border border-amber-300 px-2.5 py-1 rounded-full font-bold">
              Total Físico: {ban?.totalVolumes || 0} volume(s) em {ban?.totalUnidades || 0} unidade(s)
            </span>
          </div>

          {ban && ban.estruturasResumo && ban.estruturasResumo.length > 0 ? (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {ban.estruturasResumo.map(grupo => (
                  <div key={grupo.estrutura} className="bg-amber-50/50 rounded-xl border border-amber-200 p-3 space-y-2">
                    <div className="flex justify-between items-center border-b border-amber-200/80 pb-1.5">
                      <strong className="text-xs font-black text-amber-950 flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-amber-600" />
                        {grupo.estrutura}
                      </strong>
                      <span className="text-[10px] font-bold bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full">
                        {grupo.totalVolumes} vol. ({grupo.totalUnidades} un.)
                      </span>
                    </div>

                    <div className="divide-y divide-amber-100 max-h-48 overflow-y-auto pr-1">
                      {(grupo.itens || (grupo as any).unidades || []).map((item: any, idx: number) => (
                        <div key={item.id || idx} className="py-1.5 flex justify-between items-center text-xs">
                          <div>
                            <span className="font-black text-slate-900">Unidade {item.unidade}</span>
                            {item.observacao && (
                              <p className="text-[10px] text-slate-500 italic">{item.observacao}</p>
                            )}
                          </div>
                          <span className="font-bold text-amber-950 bg-white px-1.5 py-0.5 rounded border border-amber-200 font-mono text-[11px]">
                            {item.volumes || 1} vol.
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center p-6 bg-slate-50 rounded-xl text-slate-500 text-xs">
              ✓ Bancada limpa. Nenhum volume físico retido na portaria neste momento.
            </div>
          )}
        </div>
      )}

      {/* 3. TABELA ESPECÍFICA: RONDAS PATRIMONIAIS */}
      {tabelaAtiva === 'rondas' && (
        <div className="bg-white rounded-xl border border-indigo-200 overflow-hidden shadow-sm space-y-4 p-4">
          <div className="flex justify-between items-center border-b pb-2">
            <h4 className="font-bold text-indigo-950 text-sm flex items-center gap-2">
              <Footprints className="w-4 h-4 text-indigo-600" />
              Tabela de Rondas Executadas no Plantão
            </h4>
            <span className="text-xs bg-indigo-50 text-indigo-800 px-2.5 py-1 rounded-full font-bold">
              {ron.totalExecutadasPlantao} ronda(s) realizadas
            </span>
          </div>

          {ron.temDivergencias && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-900 space-y-1">
              <strong className="block uppercase text-[10px] text-red-800">Alertas e Divergências Detectadas:</strong>
              <ul className="list-disc pl-4 space-y-0.5">
                {ron.listaDivergencias.map((d, i) => (
                  <li key={i}>{d}</li>
                ))}
              </ul>
            </div>
          )}

          {ron.rondasRecentes.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-indigo-50 text-indigo-950 font-bold text-[11px] uppercase border-b border-indigo-100">
                  <tr>
                    <th className="p-2.5">Início</th>
                    <th className="p-2.5">Fim</th>
                    <th className="p-2.5">Operador Ronda</th>
                    <th className="p-2.5 text-center">Pontos Lidos / Totais</th>
                    <th className="p-2.5 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {ron.rondasRecentes.map((r) => (
                    <tr key={r.id} className="hover:bg-indigo-50/40">
                      <td className="p-2.5 font-mono">{new Date(r.inicio).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                      <td className="p-2.5 font-mono">{r.fim ? new Date(r.fim).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Em andamento'}</td>
                      <td className="p-2.5 font-bold text-slate-900">{r.operador}</td>
                      <td className="p-2.5 text-center font-bold">
                        {r.pontosLidos} / {r.pontosTotais}
                      </td>
                      <td className="p-2.5 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          r.status === 'Concluída' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {r.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center p-6 bg-slate-50 rounded-xl text-slate-500 text-xs">
              Nenhuma ronda registrada neste turno.
            </div>
          )}
        </div>
      )}

      {/* 4. TABELA ESPECÍFICA: CHAVES FORA DO QUADRO */}
      {tabelaAtiva === 'chaves' && (
        <div className="bg-white rounded-xl border border-amber-200 overflow-hidden shadow-sm space-y-4 p-4">
          <div className="flex justify-between items-center border-b pb-2">
            <h4 className="font-bold text-amber-950 text-sm flex items-center gap-2">
              <Key className="w-4 h-4 text-amber-600" />
              Tabela de Chaves Fora do Quadro — Detalhes e Portador
            </h4>
            <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${
              cha.totalFora > 0 ? 'bg-amber-100 text-amber-900' : 'bg-emerald-100 text-emerald-800'
            }`}>
              {cha.totalFora > 0 ? `${cha.totalFora} Chave(s) Fora` : 'Todas no Quadro'}
            </span>
          </div>

          {cha.listaChavesFora.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-amber-50 text-amber-950 font-bold text-[11px] uppercase border-b border-amber-100">
                  <tr>
                    <th className="p-2.5">Chave / Código</th>
                    <th className="p-2.5">Setor</th>
                    <th className="p-2.5">Com Quem Está</th>
                    <th className="p-2.5">Documento / Fone</th>
                    <th className="p-2.5">Empresa / Ap.</th>
                    <th className="p-2.5">Retirada Em</th>
                    <th className="p-2.5 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {cha.listaChavesFora.map((k) => (
                    <tr key={k.id} className="hover:bg-amber-50/40">
                      <td className="p-2.5 font-bold text-amber-950">
                        {k.nomeChave} <span className="text-[10px] text-slate-500 font-mono">({k.codigoChave})</span>
                      </td>
                      <td className="p-2.5">{k.setor}</td>
                      <td className="p-2.5 font-bold text-slate-900">{k.comQuemTa}</td>
                      <td className="p-2.5 text-slate-600">{k.documento} • {k.telefone}</td>
                      <td className="p-2.5">{k.empresaOuApto}</td>
                      <td className="p-2.5 font-mono text-[11px]">{new Date(k.retiradaEm).toLocaleString('pt-BR')}</td>
                      <td className="p-2.5 text-center">
                        {k.atrasado ? (
                          <span className="bg-red-600 text-white font-bold text-[9px] px-2 py-0.5 rounded uppercase">
                            ATRASADO
                          </span>
                        ) : (
                          <span className="bg-emerald-100 text-emerald-800 font-bold text-[9px] px-2 py-0.5 rounded uppercase">
                            No Prazo
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center p-6 bg-slate-50 rounded-xl text-emerald-700 text-xs font-medium">
              ✓ Nenhuma chave fora do quadro. Todas guardadas e conferidas no painel físico.
            </div>
          )}
        </div>
      )}

      {/* 5. TABELA ESPECÍFICA: OCORRÊNCIAS PENDENTES (MESMO HÁ 10+ DIAS!) */}
      {tabelaAtiva === 'ocorrencias' && (
        <div className="bg-white rounded-xl border border-red-200 overflow-hidden shadow-sm space-y-4 p-4">
          <div className="flex justify-between items-center border-b pb-2">
            <h4 className="font-bold text-red-950 text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              Tabela de Ocorrências Não Resolvidas (Mesmo de Dias Anteriores!)
            </h4>
            <span className="text-xs bg-red-100 text-red-800 px-2.5 py-1 rounded-full font-bold">
              {oco.totalPendentes} pendência(s) ativa(s)
            </span>
          </div>

          <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-900 font-medium">
            ⚠️ <strong>Atenção do Operador:</strong> As ocorrências abaixo continuam em aberto e não podem ser esquecidas até que sejam formalmente resolvidas e concluídas no sistema!
          </div>

          {oco.listaPendentes.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-red-50 text-red-950 font-bold text-[11px] uppercase border-b border-red-100">
                  <tr>
                    <th className="p-2.5">Ocorrência</th>
                    <th className="p-2.5 text-center">Tempo em Aberto</th>
                    <th className="p-2.5">Prioridade</th>
                    <th className="p-2.5">Unidade / Local</th>
                    <th className="p-2.5">Registrado Por</th>
                    <th className="p-2.5">Data Abertura</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {oco.listaPendentes.map((item) => (
                    <tr key={item.id} className="hover:bg-red-50/40">
                      <td className="p-2.5">
                        <strong className="text-slate-900 block">{item.titulo}</strong>
                        <span className="text-[11px] text-slate-600 italic block mt-0.5">"{item.descricao}"</span>
                      </td>
                      <td className="p-2.5 text-center">
                        <span className="bg-red-600 text-white font-bold text-[10px] px-2 py-0.5 rounded-full uppercase whitespace-nowrap">
                          🚨 Há {item.diasEmAberto} dia(s)!
                        </span>
                      </td>
                      <td className="p-2.5">
                        <span className="text-[10px] font-bold uppercase bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                          {item.prioridade}
                        </span>
                      </td>
                      <td className="p-2.5 font-bold">{item.unidadeBloco || 'Área Comum'}</td>
                      <td className="p-2.5 text-slate-600">{item.operador}</td>
                      <td className="p-2.5 font-mono text-[11px]">{new Date(item.criadaEm).toLocaleDateString('pt-BR')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center p-6 bg-slate-50 rounded-xl text-emerald-700 text-xs font-medium">
              ✓ Nenhuma ocorrência pendente. Livro 100% resolvido!
            </div>
          )}
        </div>
      )}

      {/* 6. TABELA ESPECÍFICA: CUSTÓDIA */}
      {tabelaAtiva === 'custodia' && (
        <div className="bg-white rounded-xl border border-sky-200 overflow-hidden shadow-sm space-y-4 p-4">
          <div className="flex justify-between items-center border-b pb-2">
            <h4 className="font-bold text-sky-950 text-sm flex items-center gap-2">
              <Box className="w-4 h-4 text-sky-600" />
              Tabela de Itens em Custódia na Guarita
            </h4>
            <span className="text-xs bg-sky-100 text-sky-800 px-2.5 py-1 rounded-full font-bold">
              {cus.totalAguardando} item(ns)
            </span>
          </div>

          {cus.listaCustodias.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-sky-50 text-sky-950 font-bold text-[11px] uppercase border-b border-sky-100">
                  <tr>
                    <th className="p-2.5">Código</th>
                    <th className="p-2.5">Descrição do Item</th>
                    <th className="p-2.5">De Quem (Origem)</th>
                    <th className="p-2.5">Para Quem (Destino)</th>
                    <th className="p-2.5">Data Guarda</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {cus.listaCustodias.map((c) => (
                    <tr key={c.id} className="hover:bg-sky-50/40">
                      <td className="p-2.5 font-mono font-bold text-sky-900">{c.codigo}</td>
                      <td className="p-2.5 font-bold text-slate-900">{c.descricao}</td>
                      <td className="p-2.5">{c.origem}</td>
                      <td className="p-2.5 font-bold text-slate-900">{c.destino}</td>
                      <td className="p-2.5 font-mono text-[11px]">{new Date(c.entradaEm).toLocaleString('pt-BR')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center p-6 bg-slate-50 rounded-xl text-slate-500 text-xs">
              Nenhum item em custódia na portaria.
            </div>
          )}
        </div>
      )}

      {/* 7. TABELA ESPECÍFICA: PRESTADORES & AUTORIZADOS */}
      {tabelaAtiva === 'prestadores' && (
        <div className="bg-white rounded-xl border border-blue-200 overflow-hidden shadow-sm space-y-6 p-4">
          {/* A) DENTRO DO CONDOMÍNIO */}
          <div className="space-y-3">
            <div className="flex justify-between items-center border-b pb-2">
              <h4 className="font-bold text-blue-950 text-sm flex items-center gap-2">
                <HardHat className="w-4 h-4 text-blue-600" />
                Pessoas DENTRO do Condomínio Agora (Entrada Registrada)
              </h4>
              <span className="text-xs bg-blue-100 text-blue-800 px-2.5 py-1 rounded-full font-bold">
                {pre.totalPresentes} presente(s)
              </span>
            </div>

            {pre.listaPresentes && pre.listaPresentes.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-blue-50 text-blue-950 font-bold text-[11px] uppercase border-b border-blue-100">
                    <tr>
                      <th className="p-2.5">Nome</th>
                      <th className="p-2.5">Empresa / Vínculo</th>
                      <th className="p-2.5">Destino</th>
                      <th className="p-2.5 text-center">Crachá</th>
                      <th className="p-2.5">Horário Entrada</th>
                      <th className="p-2.5">Documento</th>
                      <th className="p-2.5 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-800">
                    {pre.listaPresentes.map((p) => (
                      <tr key={p.id} className="hover:bg-blue-50/40">
                        <td className="p-2.5 font-bold text-slate-900">{p.nome}</td>
                        <td className="p-2.5">{p.empresa}</td>
                        <td className="p-2.5 font-bold text-blue-950">{p.destino}</td>
                        <td className="p-2.5 text-center font-mono font-bold">{p.cracha}</td>
                        <td className="p-2.5 font-mono text-[11px]">{new Date(p.entradaEm).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                        <td className="p-2.5 text-slate-600">{p.documento}</td>
                        <td className="p-2.5 text-center">
                          {p.estourado ? (
                            <span className="bg-red-600 text-white font-bold px-2 py-0.5 rounded text-[10px] uppercase animate-pulse">
                              Tempo Estourado
                            </span>
                          ) : (
                            <span className="bg-emerald-600 text-white font-bold px-2 py-0.5 rounded text-[10px] uppercase">
                              No Condomínio
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center p-4 bg-slate-50 rounded-xl text-slate-500 text-xs">
                Nenhum prestador ou visitante dentro do condomínio no momento.
              </div>
            )}
          </div>

          {/* B) AUTORIZADOS LIBERADOS NO CONDOMÍNIO (AGUARDANDO ENTRADA) */}
          <div className="space-y-3 pt-2 border-t border-slate-200">
            <div className="flex justify-between items-center border-b pb-2">
              <h4 className="font-bold text-purple-950 text-sm flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-purple-600" />
                Cadastros LIBERADOS no Condomínio (Aguardando Entrada)
              </h4>
              <span className="text-xs bg-purple-100 text-purple-800 px-2.5 py-1 rounded-full font-bold">
                {pre.totalLiberados ?? (pre.listaLiberados?.length || 0)} liberado(s)
              </span>
            </div>

            {pre.listaLiberados && pre.listaLiberados.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-purple-50 text-purple-950 font-bold text-[11px] uppercase border-b border-purple-100">
                    <tr>
                      <th className="p-2.5">Nome</th>
                      <th className="p-2.5">Perfil</th>
                      <th className="p-2.5">Empresa / Vínculo</th>
                      <th className="p-2.5">Destino</th>
                      <th className="p-2.5">Validade</th>
                      <th className="p-2.5">Documento</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-800">
                    {pre.listaLiberados.map((p) => (
                      <tr key={p.id} className="hover:bg-purple-50/40">
                        <td className="p-2.5 font-bold text-slate-900">{p.nome}</td>
                        <td className="p-2.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            p.perfil === 'autorizado' ? 'bg-purple-100 text-purple-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {p.perfil === 'autorizado' ? 'Visitante/Família' : 'Prestador'}
                          </span>
                        </td>
                        <td className="p-2.5">{p.empresa}</td>
                        <td className="p-2.5 font-bold text-purple-950">{p.destino}</td>
                        <td className="p-2.5 font-bold text-emerald-700">{p.validade}</td>
                        <td className="p-2.5 text-slate-600">{p.documento}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center p-4 bg-slate-50 rounded-xl text-slate-500 text-xs">
                Nenhum outro cadastro liberado cadastrado.
              </div>
            )}
          </div>
        </div>
      )}

      {/* 8. TABELA ESPECÍFICA: MATERIAIS */}
      {tabelaAtiva === 'materiais' && (
        <div className="bg-white rounded-xl border border-emerald-200 overflow-hidden shadow-sm space-y-4 p-4">
          <div className="flex justify-between items-center border-b pb-2">
            <h4 className="font-bold text-emerald-950 text-sm flex items-center gap-2">
              <Radio className="w-4 h-4 text-emerald-600" />
              Tabela de Materiais & Equipamentos da Guarita
            </h4>
            <span className="text-xs bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full font-bold">
              {mat.totalEquipamentos} equipamentos ({mat.perfeitos} perfeitos)
            </span>
          </div>

          {mat.listaAvariados.length > 0 && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl space-y-2">
              <strong className="block text-red-900 text-xs uppercase font-bold">
                ⚠️ Equipamentos com Avaria ou Manutenção:
              </strong>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-red-100/60 text-red-950 font-bold text-[10px] uppercase">
                    <tr>
                      <th className="p-2">Equipamento</th>
                      <th className="p-2">Categoria</th>
                      <th className="p-2">Patrimônio</th>
                      <th className="p-2">Defeito / Observação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-red-100 text-red-950">
                    {mat.listaAvariados.map((a) => (
                      <tr key={a.id}>
                        <td className="p-2 font-bold">{a.nome}</td>
                        <td className="p-2">{a.categoria}</td>
                        <td className="p-2 font-mono">{a.codigoPatrimonio || 'S/N'}</td>
                        <td className="p-2 font-medium italic">{a.observacao || a.estado}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {mat.alteracoesPlantao.length > 0 && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-xs">
              <strong className="block text-slate-800 font-bold text-[11px] uppercase">
                📝 Alterações, Adições e Exclusões de Materiais no Turno:
              </strong>
              {mat.alteracoesPlantao.map((alt, i) => (
                <div key={i} className="flex justify-between items-center text-slate-700">
                  <span><strong>[{alt.tipo}]</strong> {alt.detalhe?.nome || 'Item'} — {alt.detalhe?.observacao || alt.detalhe?.estado || ''}</span>
                  <span className="text-[10px] text-slate-400 font-mono">por {alt.operador}</span>
                </div>
              ))}
            </div>
          )}

          {mat.listaAvariados.length === 0 && mat.alteracoesPlantao.length === 0 && (
            <div className="text-center p-6 bg-slate-50 rounded-xl text-emerald-700 text-xs font-medium">
              ✓ Todos os equipamentos da guarita testados e 100% operacionais.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
