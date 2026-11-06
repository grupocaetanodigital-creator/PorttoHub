import React, { useState } from 'react';
import { useTurnoCerto } from '../lib/store';
import { DemonstrativoPagamento, ItemDemonstrativo, StatusHolerite, TipoItemHolerite } from '../types/database';
import {
  FileText,
  Plus,
  Trash2,
  CheckCircle,
  Eye,
  Edit3,
  Calendar,
  DollarSign,
  User,
  Zap,
  AlertCircle,
  Download,
  X,
  Share2,
  ArrowRight,
  ShieldAlert,
  Percent
} from 'lucide-react';

export const RHHoleritePainel: React.FC = () => {
  const {
    profiles,
    apontamentos,
    demonstrativos,
    salvarDemonstrativo,
    alternarStatusDemonstrativo,
    excluirDemonstrativo
  } = useTurnoCerto();

  const [activeView, setActiveView] = useState<'lista' | 'editor'>('lista');
  const [selectedHoleriteId, setSelectedHoleriteId] = useState<string | null>(null);
  const [previewModalOpen, setPreviewModalOpen] = useState<boolean>(false);
  const [previewDemonstrativo, setPreviewDemonstrativo] = useState<DemonstrativoPagamento | null>(null);

  // Form State
  const [funcionarioId, setFuncionarioId] = useState<string>(profiles[1]?.id || '');
  const [mesReferencia, setMesReferencia] = useState<string>('2026-03');
  const [salarioBase, setSalarioBase] = useState<number>(2140);
  const [status, setStatus] = useState<StatusHolerite>('rascunho');
  const [dataPagamento, setDataPagamento] = useState<string>('2026-04-05');
  const [observacoes, setObservacoes] = useState<string>('');

  // Dynamic lines of items
  const [itens, setItens] = useState<ItemDemonstrativo[]>([
    {
      id: 'item-1',
      demonstrativo_id: '',
      codigo: '001',
      descricao: 'Salário Base Porteiro Líder',
      referencia: '30 dias',
      tipo: 'provento',
      valor: 2140.00,
      ordem: 1
    },
    {
      id: 'item-2',
      demonstrativo_id: '',
      codigo: '015',
      descricao: 'Adicional Noturno 20% CLT',
      referencia: '20.00%',
      tipo: 'provento',
      valor: 428.00,
      ordem: 2
    },
    {
      id: 'item-3',
      demonstrativo_id: '',
      codigo: '901',
      descricao: 'INSS Regime Geral CLT',
      referencia: '9.00%',
      tipo: 'desconto',
      valor: 231.12,
      ordem: 3
    },
    {
      id: 'item-4',
      demonstrativo_id: '',
      codigo: '905',
      descricao: 'Vale Transporte (Desconto Legal)',
      referencia: '6.00%',
      tipo: 'desconto',
      valor: 128.40,
      ordem: 4
    }
  ]);

  // Live calculations
  const totalProventos = itens
    .filter((i) => i.tipo === 'provento')
    .reduce((sum, i) => sum + (Number(i.valor) || 0), 0);

  const totalDescontos = itens
    .filter((i) => i.tipo === 'desconto')
    .reduce((sum, i) => sum + (Number(i.valor) || 0), 0);

  const salarioLiquido = Math.max(0, totalProventos - totalDescontos);
  const baseFgts = totalProventos;
  const valorFgts = Number((baseFgts * 0.08).toFixed(2));
  const inssItem = itens.find((i) => i.codigo === '901' || i.descricao.toLowerCase().includes('inss'));
  const baseIrrf = Math.max(0, totalProventos - (inssItem ? Number(inssItem.valor) : 0));

  // Handler to open editor for an existing payslip
  const handleEdit = (dem: DemonstrativoPagamento) => {
    setSelectedHoleriteId(dem.id);
    setFuncionarioId(dem.funcionario_id);
    setMesReferencia(dem.mes_referencia);
    setSalarioBase(dem.salario_base);
    setStatus(dem.status);
    setDataPagamento(dem.data_pagamento || '2026-04-05');
    setObservacoes(dem.observacoes || '');
    setItens(dem.itens && dem.itens.length > 0 ? dem.itens : []);
    setActiveView('editor');
  };

  // Handler to start new manual payslip
  const handleNovoHolerite = () => {
    setSelectedHoleriteId(null);
    const targetFunc = profiles.find((p) => p.role === 'funcionario') || profiles[1];
    setFuncionarioId(targetFunc ? targetFunc.id : '');
    setMesReferencia('2026-03');
    setSalarioBase(2140);
    setStatus('rascunho');
    setDataPagamento('2026-04-05');
    setObservacoes('');
    setItens([
      {
        id: `line-${Date.now()}-1`,
        demonstrativo_id: '',
        codigo: '001',
        descricao: 'Salário Base Categoria CLT',
        referencia: '30 dias',
        tipo: 'provento',
        valor: 2140.00,
        ordem: 1
      },
      {
        id: `line-${Date.now()}-2`,
        demonstrativo_id: '',
        codigo: '901',
        descricao: 'INSS Previdência Social',
        referencia: '7.50%',
        tipo: 'desconto',
        valor: 160.50,
        ordem: 2
      }
    ]);
    setActiveView('editor');
  };

  // Add custom dynamic line
  const handleAddLine = (tipo: TipoItemHolerite = 'provento') => {
    const newLine: ItemDemonstrativo = {
      id: `line-${Date.now()}`,
      demonstrativo_id: selectedHoleriteId || '',
      codigo: tipo === 'provento' ? '050' : '950',
      descricao: tipo === 'provento' ? 'Novo Vencimento / Adicional' : 'Novo Desconto em Folha',
      referencia: '1',
      tipo,
      valor: 100.00,
      ordem: itens.length + 1
    };
    setItens([...itens, newLine]);
  };

  // Remove line
  const handleRemoveLine = (id: string) => {
    setItens(itens.filter((i) => i.id !== id));
  };

  // Update line field
  const handleUpdateLine = (id: string, field: keyof ItemDemonstrativo, value: any) => {
    setItens(itens.map((item) => {
      if (item.id === id) {
        return { ...item, [field]: value };
      }
      return item;
    }));
  };

  // Quick Preset: Pull FTs from Module 1
  const handlePresetFTs = () => {
    const ftsDoColaborador = apontamentos.filter(
      (a) => a.funcionario_id === funcionarioId && a.tipo_ocorrencia === 'ft_trabalhada'
    );
    const qtdFTs = ftsDoColaborador.length || 1;
    const valorTotalFT = qtdFTs * 240.00;

    const newLine: ItemDemonstrativo = {
      id: `ft-${Date.now()}`,
      demonstrativo_id: selectedHoleriteId || '',
      codigo: '102',
      descricao: `Folga Trabalhada (FT ⚡ Cobertura Emergencial)`,
      referencia: `${qtdFTs} turno(s)`,
      tipo: 'provento',
      valor: valorTotalFT,
      ordem: itens.length + 1
    };
    setItens([...itens, newLine]);
  };

  // Quick Preset: Pull Faltas from Module 1
  const handlePresetFaltas = () => {
    const faltasDoColaborador = apontamentos.filter(
      (a) => a.funcionario_id === funcionarioId && a.tipo_ocorrencia === 'falta_nao_justificada' && a.status_processamento === 'descontar'
    );
    const qtdFaltas = faltasDoColaborador.length || 1;
    const valorDia = Number((salarioBase / 30).toFixed(2));
    const valorDesconto = valorDia * qtdFaltas;

    const newLine: ItemDemonstrativo = {
      id: `falta-${Date.now()}`,
      demonstrativo_id: selectedHoleriteId || '',
      codigo: '910',
      descricao: `Falta Não Justificada (${qtdFaltas} dia(s) + perda DSR)`,
      referencia: `${qtdFaltas} dia(s)`,
      tipo: 'desconto',
      valor: valorDesconto,
      ordem: itens.length + 1
    };
    setItens([...itens, newLine]);
  };

  // Quick Preset: Calculate INSS and VT 6%
  const handlePresetEncargos = () => {
    // Standard INSS tier approx
    const inssVal = Number((salarioBase * 0.09).toFixed(2));
    const vtVal = Number((salarioBase * 0.06).toFixed(2));

    let updated = itens.filter((i) => i.codigo !== '901' && i.codigo !== '905');
    updated.push({
      id: `inss-${Date.now()}`,
      demonstrativo_id: selectedHoleriteId || '',
      codigo: '901',
      descricao: 'INSS Previdência Social Regime Geral',
      referencia: '9.00%',
      tipo: 'desconto',
      valor: inssVal,
      ordem: updated.length + 1
    });
    updated.push({
      id: `vt-${Date.now()}`,
      demonstrativo_id: selectedHoleriteId || '',
      codigo: '905',
      descricao: 'Vale Transporte (Desconto Legal CLT)',
      referencia: '6.00%',
      tipo: 'desconto',
      valor: vtVal,
      ordem: updated.length + 2
    });
    setItens(updated);
  };

  // Save changes
  const handleSave = async (finalStatus?: StatusHolerite) => {
    const targetStatus = finalStatus || status;
    const res = await salvarDemonstrativo(
      {
        id: selectedHoleriteId || undefined,
        funcionario_id: funcionarioId,
        mes_referencia: mesReferencia,
        salario_base: salarioBase,
        status: targetStatus,
        data_pagamento: dataPagamento,
        observacoes
      },
      itens
    );

    if (res.success) {
      setActiveView('lista');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-amber-500" />
            <span>Módulo de Holerite Digital · Lançamento 100% Manual RH</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Lançamento linha por linha de proventos e descontos, cálculo automático de encargos e controle de publicação.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {activeView === 'editor' ? (
            <button
              onClick={() => setActiveView('lista')}
              className="py-1.5 px-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
            >
              Voltar para Lista
            </button>
          ) : (
            <button
              onClick={handleNovoHolerite}
              className="py-2 px-4 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4 text-amber-400" />
              <span>Novo Holerite Manual</span>
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* VISTA 1: LISTA DE DEMONSTRATIVOS (PAINEL GERAL RH)                       */}
      {/* ========================================================================= */}
      {activeView === 'lista' && (
        <div className="space-y-6">
          {/* Summary KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-xs text-slate-500 font-medium">Total de Holerites</span>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-2xl font-bold font-mono tabular-nums text-slate-900">
                  {demonstrativos.length}
                </span>
                <span className="text-xs text-slate-400">Competências ativas</span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-xs text-slate-500 font-medium">Holerites Publicados</span>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-2xl font-bold font-mono tabular-nums text-emerald-600">
                  {demonstrativos.filter((d) => d.status === 'publicado').length}
                </span>
                <span className="text-xs text-emerald-600 font-medium">Visíveis no App</span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-xs text-slate-500 font-medium">Rascunhos em Edição RH</span>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-2xl font-bold font-mono tabular-nums text-amber-600">
                  {demonstrativos.filter((d) => d.status === 'rascunho').length}
                </span>
                <span className="text-xs text-amber-600 font-medium">Não publicados</span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-xs text-slate-500 font-medium">Total Líquido Previsto</span>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-xl font-bold font-mono tabular-nums text-slate-900">
                  R$ {demonstrativos.reduce((sum, d) => sum + d.salario_liquido, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
                <span className="text-xs text-slate-400">Folha total</span>
              </div>
            </div>
          </div>

          {/* Tabela de Holerites Cadastrados */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Demonstrativos de Pagamento Emitidos
                </h3>
                <p className="text-xs text-slate-500">
                  Controle individual de vencimentos, descontos e liberação para o funcionário.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600">
                    <th className="py-3 px-4 font-semibold">Colaborador</th>
                    <th className="py-3 px-4 font-semibold">Competência</th>
                    <th className="py-3 px-4 font-semibold">Vencimentos</th>
                    <th className="py-3 px-4 font-semibold">Descontos</th>
                    <th className="py-3 px-4 font-semibold">Salário Líquido</th>
                    <th className="py-3 px-4 font-semibold">Status de Publicação</th>
                    <th className="py-3 px-4 font-semibold">Ciente Digital</th>
                    <th className="py-3 px-4 font-semibold text-right">Ações RH</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {demonstrativos.map((dem) => {
                    const func = profiles.find((p) => p.id === dem.funcionario_id);
                    const isPublicado = dem.status === 'publicado';

                    return (
                      <tr key={dem.id} className="hover:bg-slate-50/70 transition-colors">
                        {/* Colaborador */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            {func?.avatar_url ? (
                              <img
                                src={func.avatar_url}
                                alt=""
                                referrerPolicy="no-referrer"
                                className="w-7 h-7 rounded-full object-cover shrink-0"
                              />
                            ) : (
                              <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center font-bold text-xs shrink-0">
                                {func?.full_name?.charAt(0) || '?'}
                              </div>
                            )}
                            <div>
                              <p className="font-semibold text-slate-900">{func?.full_name || 'Funcionário'}</p>
                              <p className="text-[11px] text-slate-500 font-mono">{func?.cpf}</p>
                            </div>
                          </div>
                        </td>

                        {/* Competência */}
                        <td className="py-3 px-4 font-mono font-semibold text-slate-700">
                          {dem.mes_referencia}
                        </td>

                        {/* Vencimentos */}
                        <td className="py-3 px-4 font-mono tabular-nums text-emerald-700 font-medium">
                          R$ {dem.total_proventos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>

                        {/* Descontos */}
                        <td className="py-3 px-4 font-mono tabular-nums text-red-600 font-medium">
                          - R$ {dem.total_descontos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>

                        {/* Salário Líquido */}
                        <td className="py-3 px-4 font-mono tabular-nums font-bold text-slate-900">
                          R$ {dem.salario_liquido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>

                        {/* Status */}
                        <td className="py-3 px-4">
                          {isPublicado ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded">
                              ✓ Publicado
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-100 border border-amber-200 px-2 py-0.5 rounded">
                              ✎ Rascunho RH
                            </span>
                          )}
                        </td>

                        {/* Ciente Digital */}
                        <td className="py-3 px-4">
                          {dem.ciente_funcionario_em ? (
                            <span className="text-[11px] text-indigo-700 font-semibold flex items-center gap-1">
                              <CheckCircle className="w-3.5 h-3.5" />
                              <span>Assinado</span>
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-400">
                              Pendente
                            </span>
                          )}
                        </td>

                        {/* Ações */}
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Visualizar */}
                            <button
                              onClick={() => {
                                setPreviewDemonstrativo(dem);
                                setPreviewModalOpen(true);
                              }}
                              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded"
                              title="Visualizar modelo tradicional CLT"
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            {/* Editar */}
                            <button
                              onClick={() => handleEdit(dem)}
                              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded"
                              title="Editar linhas de proventos/descontos"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>

                            {/* Toggle Publicar / Despublicar */}
                            <button
                              onClick={() => alternarStatusDemonstrativo(dem.id, isPublicado ? 'rascunho' : 'publicado')}
                              className={`py-1 px-2.5 rounded font-bold text-[11px] transition-colors ${
                                isPublicado
                                  ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                  : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                              }`}
                            >
                              {isPublicado ? 'Ocultar' : 'Publicar 🚀'}
                            </button>

                            {/* Excluir */}
                            <button
                              onClick={() => {
                                if (confirm(`Confirma a exclusão do holerite de ${func?.full_name} (${dem.mes_referencia})?`)) {
                                  excluirDemonstrativo(dem.id);
                                }
                              }}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                              title="Excluir demonstrativo"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VISTA 2: FORMULÁRIO DE LANÇAMENTO 100% MANUAL RH (LINHA POR LINHA)       */}
      {/* ========================================================================= */}
      {activeView === 'editor' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {selectedHoleriteId ? 'Editar Demonstrativo de Pagamento' : 'Lançamento Manual de Holerite Digital'}
                </h3>
                <p className="text-xs text-slate-500">
                  Insira o salário base e adicione dinamicamente as linhas de proventos e descontos.
                </p>
              </div>

              {/* Status Switcher */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-600">Status:</span>
                <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setStatus('rascunho')}
                    className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${
                      status === 'rascunho'
                        ? 'bg-amber-100 text-amber-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    ✎ Rascunho (RH)
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatus('publicado')}
                    className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${
                      status === 'publicado'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    ✓ Publicado (App)
                  </button>
                </div>
              </div>
            </div>

            {/* Cabeçalho do Holerite (Colaborador, Mês, Salário Base) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Colaborador */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Colaborador Beneficiário
                </label>
                <select
                  value={funcionarioId}
                  onChange={(e) => setFuncionarioId(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium focus:ring-1 focus:ring-slate-900"
                >
                  {profiles
                    .filter((p) => p.role === 'funcionario')
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.full_name} ({p.cargo || 'Portaria'} - {p.cpf})
                      </option>
                    ))}
                </select>
              </div>

              {/* Mês de Referência */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mês de Referência (Competência)
                </label>
                <input
                  type="month"
                  value={mesReferencia}
                  onChange={(e) => setMesReferencia(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono font-medium focus:ring-1 focus:ring-slate-900"
                />
              </div>

              {/* Salário Base Contratual */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Salário Base CLT (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={salarioBase}
                  onChange={(e) => setSalarioBase(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 focus:ring-1 focus:ring-slate-900"
                />
              </div>

              {/* Data de Pagamento */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Data Prevista de Pagamento
                </label>
                <input
                  type="date"
                  value={dataPagamento}
                  onChange={(e) => setDataPagamento(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono focus:ring-1 focus:ring-slate-900"
                />
              </div>
            </div>

            {/* Presets Rápidos de Lançamento */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs font-bold text-slate-700">
                Atalhos de Lançamento Rápido:
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handlePresetFTs}
                  className="py-1 px-2.5 bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs font-bold rounded-lg border border-amber-300 transition-colors flex items-center gap-1"
                >
                  <Zap className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                  <span>Importar FTs do Módulo 1 (⚡)</span>
                </button>

                <button
                  type="button"
                  onClick={handlePresetFaltas}
                  className="py-1 px-2.5 bg-red-100 hover:bg-red-200 text-red-900 text-xs font-bold rounded-lg border border-red-300 transition-colors flex items-center gap-1"
                >
                  <AlertCircle className="w-3.5 h-3.5 text-red-600" />
                  <span>Importar Faltas Descontadas (❌)</span>
                </button>

                <button
                  type="button"
                  onClick={handlePresetEncargos}
                  className="py-1 px-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1"
                >
                  <Percent className="w-3.5 h-3.5" />
                  <span>Calcular INSS e VT (6%)</span>
                </button>
              </div>
            </div>

            {/* Tabela Dinâmica de Itens (Linha por Linha) */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Linhas do Demonstrativo de Pagamento ({itens.length})
                </h4>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleAddLine('provento')}
                    className="py-1 px-2.5 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-300 text-xs font-bold rounded-lg transition-colors flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Adicionar Vencimento (Provento)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddLine('desconto')}
                    className="py-1 px-2.5 bg-red-50 text-red-800 hover:bg-red-100 border border-red-300 text-xs font-bold rounded-lg transition-colors flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Adicionar Desconto</span>
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 border-b border-slate-200 font-semibold">
                      <th className="py-2.5 px-3 w-20">Cód</th>
                      <th className="py-2.5 px-3">Descrição da Rubrica</th>
                      <th className="py-2.5 px-3 w-28">Referência</th>
                      <th className="py-2.5 px-3 w-32">Tipo</th>
                      <th className="py-2.5 px-3 w-36">Valor (R$)</th>
                      <th className="py-2.5 px-3 w-16 text-center">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {itens.map((item, index) => {
                      const isDesconto = item.tipo === 'desconto';
                      return (
                        <tr
                          key={item.id}
                          className={`hover:bg-slate-50 transition-colors ${
                            isDesconto ? 'bg-red-50/20' : 'bg-emerald-50/10'
                          }`}
                        >
                          {/* Código */}
                          <td className="py-2 px-3">
                            <input
                              type="text"
                              value={item.codigo}
                              onChange={(e) => handleUpdateLine(item.id, 'codigo', e.target.value)}
                              className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-xs font-mono font-bold text-center"
                              placeholder="001"
                            />
                          </td>

                          {/* Descrição */}
                          <td className="py-2 px-3">
                            <input
                              type="text"
                              value={item.descricao}
                              onChange={(e) => handleUpdateLine(item.id, 'descricao', e.target.value)}
                              className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-xs font-medium"
                              placeholder="Descrição do item"
                            />
                          </td>

                          {/* Referência */}
                          <td className="py-2 px-3">
                            <input
                              type="text"
                              value={item.referencia || ''}
                              onChange={(e) => handleUpdateLine(item.id, 'referencia', e.target.value)}
                              className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-xs text-center"
                              placeholder="30 dias / 20%"
                            />
                          </td>

                          {/* Tipo */}
                          <td className="py-2 px-3">
                            <select
                              value={item.tipo}
                              onChange={(e) => handleUpdateLine(item.id, 'tipo', e.target.value as TipoItemHolerite)}
                              className={`w-full px-2 py-1 border rounded text-xs font-bold ${
                                isDesconto
                                  ? 'text-red-700 border-red-300 bg-red-50'
                                  : 'text-emerald-800 border-emerald-300 bg-emerald-50'
                              }`}
                            >
                              <option value="provento">🟢 Provento (Vencimento)</option>
                              <option value="desconto">🔴 Desconto em Folha</option>
                            </select>
                          </td>

                          {/* Valor */}
                          <td className="py-2 px-3">
                            <div className="relative">
                              <span className="absolute left-2 top-1 text-[11px] text-slate-400">R$</span>
                              <input
                                type="number"
                                step="0.01"
                                value={item.valor}
                                onChange={(e) => handleUpdateLine(item.id, 'valor', Number(e.target.value))}
                                className={`w-full pl-8 pr-2 py-1 bg-white border rounded text-xs font-mono font-bold ${
                                  isDesconto ? 'text-red-600 border-red-300' : 'text-slate-900 border-slate-300'
                                }`}
                              />
                            </div>
                          </td>

                          {/* Excluir linha */}
                          <td className="py-2 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveLine(item.id)}
                              className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors"
                              title="Remover linha"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}

                    {itens.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-6 text-center text-slate-500 text-xs">
                          Nenhuma linha lançada. Clique em "+ Adicionar Vencimento" para começar.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Painel de Cálculo em Tempo Real (Totais e Bases) */}
            <div className="bg-slate-950 text-white rounded-xl p-5 grid grid-cols-1 md:grid-cols-3 gap-6 shadow-md">
              <div className="space-y-2">
                <span className="text-xs text-slate-400 uppercase tracking-wider block">
                  Resumo de Fechamento do Holerite
                </span>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300">Total de Vencimentos:</span>
                  <span className="font-mono tabular-nums font-bold text-emerald-400">
                    + R$ {totalProventos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300">Total de Descontos:</span>
                  <span className="font-mono tabular-nums font-bold text-red-400">
                    - R$ {totalDescontos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Salário Líquido Destaque */}
              <div className="bg-slate-900/90 rounded-lg p-3.5 border border-slate-800 flex flex-col justify-center items-center text-center">
                <span className="text-xs text-amber-400 font-semibold uppercase tracking-wider">
                  Salário Líquido a Receber
                </span>
                <span className="text-2xl sm:text-3xl font-black font-mono tabular-nums text-white mt-1">
                  R$ {salarioLiquido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>

              {/* Bases Legais CLT */}
              <div className="text-xs space-y-1.5 text-slate-300 border-l border-slate-800 pl-4">
                <span className="text-[11px] text-slate-400 uppercase tracking-wider block font-semibold mb-1">
                  Bases de Cálculo
                </span>
                <div className="flex justify-between">
                  <span>Base INSS / FGTS:</span>
                  <span className="font-mono font-semibold text-white">R$ {baseFgts.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>FGTS do Mês (8%):</span>
                  <span className="font-mono font-semibold text-amber-400">R$ {valorFgts.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Base IRRF:</span>
                  <span className="font-mono font-semibold text-white">R$ {baseIrrf.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Observações / Mensagem ao Funcionário */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Observações do RH no Holerite (Opcional)
              </label>
              <textarea
                rows={2}
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                placeholder="Ex: Valor referente à dobra de turno FT de 12x36 e escala regular aprovada."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
              />
            </div>

            {/* Ações de Salvamento */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setActiveView('lista')}
                className="w-full sm:w-auto py-2 px-4 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
              >
                Cancelar Edição
              </button>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => handleSave('rascunho')}
                  className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-lg transition-colors"
                >
                  Salvar Rascunho (Privado RH)
                </button>

                <button
                  type="button"
                  onClick={() => handleSave('publicado')}
                  className="py-2.5 px-5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>Publicar no App do Funcionário</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL DE PREVIEW DO MODELO TRADICIONAL DE HOLERITE (CLT)                  */}
      {/* ========================================================================= */}
      {previewModalOpen && previewDemonstrativo && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-slate-700" />
                <h3 className="text-sm font-bold text-slate-900">
                  Demonstrativo de Pagamento de Salário (Recibo CLT)
                </h3>
              </div>
              <button
                onClick={() => setPreviewModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 font-mono text-xs text-slate-800">
              {/* Cabeçalho da Empresa */}
              <div className="border border-slate-300 p-3 rounded-lg bg-slate-50 leading-relaxed text-[11px]">
                <div className="flex justify-between font-bold text-slate-900 border-b border-slate-200 pb-1 mb-1">
                  <span>TURNO CERTO SERVIÇOS OPERACIONAIS E FACILIDADES LTDA</span>
                  <span>CNPJ: 12.345.678/0001-90</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Recibo de Pagamento de Salário</span>
                  <span className="font-bold text-slate-900">Competência: {previewDemonstrativo.mes_referencia}</span>
                </div>
              </div>

              {/* Dados do Colaborador */}
              {(() => {
                const func = profiles.find((p) => p.id === previewDemonstrativo.funcionario_id);
                return (
                  <div className="border border-slate-300 p-3 rounded-lg grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
                    <div>
                      <span className="text-slate-400 block text-[9px]">CÓD / FUNCIONÁRIO</span>
                      <strong className="text-slate-900">{func?.full_name}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[9px]">CPF</span>
                      <span className="tabular-nums">{func?.cpf}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[9px]">CARGO / FUNÇÃO</span>
                      <span>{func?.cargo || 'Porteiro'}</span>
                    </div>
                  </div>
                );
              })()}

              {/* Tabela Tradicional de Proventos e Descontos */}
              <div className="border border-slate-300 rounded-lg overflow-hidden">
                <table className="w-full text-left text-[11px]">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-300 font-bold text-slate-700">
                      <th className="p-2 w-12 text-center">Cód.</th>
                      <th className="p-2">Descrição</th>
                      <th className="p-2 w-20 text-center">Ref.</th>
                      <th className="p-2 w-24 text-right">Vencimentos</th>
                      <th className="p-2 w-24 text-right text-red-600">Descontos</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {previewDemonstrativo.itens?.map((it) => (
                      <tr key={it.id}>
                        <td className="p-2 text-center text-slate-500">{it.codigo}</td>
                        <td className="p-2">{it.descricao}</td>
                        <td className="p-2 text-center text-slate-500">{it.referencia || '-'}</td>
                        <td className="p-2 text-right tabular-nums">
                          {it.tipo === 'provento' ? it.valor.toFixed(2) : ''}
                        </td>
                        <td className="p-2 text-right tabular-nums text-red-600 font-semibold">
                          {it.tipo === 'desconto' ? it.valor.toFixed(2) : ''}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-100 border-t border-slate-300 font-bold">
                      <td colSpan={3} className="p-2 text-right uppercase">Totais:</td>
                      <td className="p-2 text-right text-emerald-700 tabular-nums">
                        R$ {previewDemonstrativo.total_proventos.toFixed(2)}
                      </td>
                      <td className="p-2 text-right text-red-600 tabular-nums">
                        R$ {previewDemonstrativo.total_descontos.toFixed(2)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Faixa de Líquido */}
              <div className="border-2 border-slate-900 bg-slate-50 p-3 rounded-lg flex items-center justify-between">
                <span className="font-bold text-slate-900 uppercase">VALOR LÍQUIDO A RECEBER:</span>
                <span className="text-xl font-bold text-slate-900 tabular-nums">
                  R$ {previewDemonstrativo.salario_liquido.toFixed(2)}
                </span>
              </div>

              {/* Bases Legais */}
              <div className="border border-slate-300 p-2.5 rounded-lg grid grid-cols-4 gap-2 text-[10px] text-center bg-slate-50">
                <div>
                  <span className="text-slate-400 block">Sal. Base</span>
                  <span className="font-bold">R$ {previewDemonstrativo.salario_base.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Base INSS</span>
                  <span className="font-bold">R$ {previewDemonstrativo.base_inss.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Base FGTS</span>
                  <span className="font-bold">R$ {previewDemonstrativo.base_fgts.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">FGTS do Mês</span>
                  <span className="font-bold text-amber-600">R$ {previewDemonstrativo.valor_fgts.toFixed(2)}</span>
                </div>
              </div>

              {/* Ciente Digital */}
              <div className="p-3 border border-slate-200 rounded-lg text-center text-[10px] text-slate-500">
                {previewDemonstrativo.ciente_funcionario_em ? (
                  <p className="text-emerald-700 font-bold">
                    ✓ Assinatura Digital Confirmada em: {new Date(previewDemonstrativo.ciente_funcionario_em).toLocaleString('pt-BR')}
                  </p>
                ) : (
                  <p>Aguardando confirmação de ciente digital pelo colaborador no aplicativo mobile.</p>
                )}
              </div>
            </div>

            <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <button
                onClick={() => window.print()}
                className="py-1.5 px-3 bg-slate-900 text-white rounded text-xs font-semibold flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Imprimir Holerite</span>
              </button>
              <button
                onClick={() => setPreviewModalOpen(false)}
                className="py-1.5 px-4 text-xs font-semibold text-slate-600 hover:text-slate-900"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
