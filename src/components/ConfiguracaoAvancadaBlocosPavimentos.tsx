import React, { useState, useMemo } from 'react';
import {
  Building2,
  Layers,
  Home,
  ArrowUp,
  Plus,
  Trash2,
  Copy,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Info,
  Sparkles,
  Sliders,
  Warehouse,
  Hash,
  Eye,
  X,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import {
  BlocoDetalhe,
  BlocoEstruturaAvancada,
  PavimentoConfig,
  criarEstruturaPadraoBloco,
  gerarUnidadesAgrupadasPorPavimento,
  gerarUnidadesDeBlocoEstruturado
} from '../services/condominioService';

interface Props {
  tipoEstrutura: string; // 'blocos' | 'torres'
  blocos: BlocoDetalhe[];
  onChangeBlocos: (novosBlocos: BlocoDetalhe[]) => void;
  unidadesPadraoGeral?: number;
}

export default function ConfiguracaoAvancadaBlocosPavimentos({
  tipoEstrutura,
  blocos,
  onChangeBlocos,
  unidadesPadraoGeral = 20
}: Props) {
  const eTorre = tipoEstrutura === 'torres';
  const labelTipo = eTorre ? 'Torre' : 'Bloco';
  const labelTipoPlural = eTorre ? 'Torres' : 'Blocos';

  // Bloco selecionado para edição detalhada na Etapa B
  const [blocoAtivoIndex, setBlocoAtivoIndex] = useState<number>(0);
  // Pavimento expandido na Etapa B (accordion)
  const [pavimentoExpandido, setPavimentoExpandido] = useState<string>('terreo');
  // Visualização da prévia: 'grid' ou 'resumo'
  const [modoPrevia, setModoPrevia] = useState<'grid' | 'resumo'>('grid');
  // Filtro de busca na prévia
  const [filtroPrevia, setFiltroPrevia] = useState<string>('');

  // Input temporário para adicionar unidade avulsa
  const [novaUnidadeAvulsa, setNovaUnidadeAvulsa] = useState<string>('');

  // Garante que cada bloco tenha uma estrutura válida inicializada
  const blocosComEstrutura = useMemo(() => {
    return blocos.map((b, idx) => {
      if (b.estrutura) {
        return b;
      }
      // Se ainda não tem estrutura avançada, inicializa uma coerente
      const defaultEst = criarEstruturaPadraoBloco(b.nome || `${labelTipo} ${idx + 1}`);
      // Ajusta para a quantidade de unidades atual do bloco
      const totalUnd = Number(b.unidades) || unidadesPadraoGeral;
      if (totalUnd >= 10) {
        const andares = Math.max(1, Math.floor(totalUnd / 4));
        const porAndar = Math.max(2, Math.round(totalUnd / andares));
        defaultEst.qtdAndaresSuperiores = andares;
        defaultEst.andaresPadraoUnidades = porAndar;
      }
      return {
        ...b,
        estrutura: defaultEst
      };
    });
  }, [blocos, labelTipo, unidadesPadraoGeral]);

  // Se o índice ativo for inválido, ajusta
  const indiceSeguro = Math.min(Math.max(0, blocoAtivoIndex), Math.max(0, blocosComEstrutura.length - 1));
  const blocoAtivo = blocosComEstrutura[indiceSeguro] || blocosComEstrutura[0];

  // Atualiza um bloco inteiro
  const atualizarBloco = (index: number, blocoModificado: BlocoDetalhe) => {
    // Recalcula o total de unidades a partir da estrutura
    const totalCalculado = gerarUnidadesDeBlocoEstruturado(blocoModificado).length;
    const blocoAtualizado: BlocoDetalhe = {
      ...blocoModificado,
      unidades: totalCalculado
    };

    const novos = [...blocosComEstrutura];
    novos[index] = blocoAtualizado;
    onChangeBlocos(novos);
  };

  // Atualiza campo específico da estrutura do bloco ativo
  const atualizarEstruturaAtiva = (campos: Partial<BlocoEstruturaAvancada>) => {
    if (!blocoAtivo) return;
    const estAtual = blocoAtivo.estrutura || criarEstruturaPadraoBloco(blocoAtivo.nome);
    const novaEst: BlocoEstruturaAvancada = {
      ...estAtual,
      ...campos
    };
    atualizarBloco(indiceSeguro, {
      ...blocoAtivo,
      estrutura: novaEst
    });
  };

  // Adicionar novo bloco
  const handleAdicionarBloco = () => {
    const novoIdx = blocosComEstrutura.length + 1;
    const novoNome = eTorre ? `Torre ${novoIdx}` : `Bloco ${String.fromCharCode(65 + blocosComEstrutura.length)}`;
    const novaEst = criarEstruturaPadraoBloco(novoNome);
    const novoBloco: BlocoDetalhe = {
      nome: novoNome,
      unidades: gerarUnidadesDeBlocoEstruturado({ nome: novoNome, unidades: 0, estrutura: novaEst }).length,
      estrutura: novaEst
    };
    const novos = [...blocosComEstrutura, novoBloco];
    onChangeBlocos(novos);
    setBlocoAtivoIndex(novos.length - 1);
  };

  // Duplicar bloco selecionado
  const handleDuplicarBloco = (indexParaDuplicar: number) => {
    const original = blocosComEstrutura[indexParaDuplicar];
    if (!original) return;
    const novoIdx = blocosComEstrutura.length + 1;
    const novoNome = eTorre ? `Torre ${novoIdx}` : `Bloco ${String.fromCharCode(65 + blocosComEstrutura.length)}`;
    const estCopiada: BlocoEstruturaAvancada = JSON.parse(JSON.stringify(original.estrutura || criarEstruturaPadraoBloco(novoNome)));
    estCopiada.id = `bloco-${Date.now()}`;
    estCopiada.nome = novoNome;

    const novoBloco: BlocoDetalhe = {
      nome: novoNome,
      unidades: gerarUnidadesDeBlocoEstruturado({ nome: novoNome, unidades: 0, estrutura: estCopiada }).length,
      estrutura: estCopiada
    };
    const novos = [...blocosComEstrutura, novoBloco];
    onChangeBlocos(novos);
    setBlocoAtivoIndex(novos.length - 1);
  };

  // Remover bloco
  const handleRemoverBloco = (indexParaRemover: number) => {
    if (blocosComEstrutura.length <= 1) return;
    const novos = blocosComEstrutura.filter((_, idx) => idx !== indexParaRemover);
    onChangeBlocos(novos);
    if (blocoAtivoIndex >= novos.length) {
      setBlocoAtivoIndex(Math.max(0, novos.length - 1));
    }
  };

  // Carregar Preset Exemplo Bloco A (solicitado pelo usuário)
  // Bloco A: 16 andares. Térreo possui 7 unidades sem o andar à frente (01, 02, 03, 04, 06, 07 - sem 05). Andares 1º ao 16º = 10 unidades cada (101..1610)
  const aplicarPresetBlocoA = () => {
    const est: BlocoEstruturaAvancada = {
      id: `bloco-a-${Date.now()}`,
      nome: blocoAtivo?.nome || (eTorre ? 'Torre A' : 'Bloco A'),
      possuiSubsolo: false,
      qtdSubsolos: 0,
      possuiTerreo: true,
      terreoModo: 'personalizado',
      terreoQtd: 7,
      terreoIncluirPrefixo: false,
      terreoPrefixo: '',
      terreoUnidadesCustom: ['01', '02', '03', '04', '06', '07'],
      terreoUnidadesOmitidas: [],
      qtdAndaresSuperiores: 16,
      andaresRegraPadrao: true,
      andaresPadraoUnidades: 10,
      andaresDigitosUnidade: 2,
      andaresSeparador: '',
      andaresDetalhes: [],
      unidadesAvulsas: []
    };
    atualizarEstruturaAtiva(est);
  };

  // Carregar Preset Exemplo Bloco B (solicitado pelo usuário)
  // Bloco B: 2 subsolos com 5 unidades cada (S1-01..S1-05, S2-01..S2-05), Térreo com 8 unidades específicas (01, 02, 03, 04, 06, 08, 09, 10 - sem 05 e 07), 8 andares superiores
  const aplicarPresetBlocoB = () => {
    const subsolosDetalhes: PavimentoConfig[] = [
      {
        id: 'subsolo-1',
        tipo: 'subsolo',
        nome: 'Subsolo 1',
        prefixo: 'S1',
        quantidadeUnidades: 5,
        incluirPrefixoAndar: true,
        modoNumeracao: 'padrao',
        digitosUnidade: 2,
        unidadesCustomizadas: [],
        unidadesOmitidas: []
      },
      {
        id: 'subsolo-2',
        tipo: 'subsolo',
        nome: 'Subsolo 2',
        prefixo: 'S2',
        quantidadeUnidades: 5,
        incluirPrefixoAndar: true,
        modoNumeracao: 'padrao',
        digitosUnidade: 2,
        unidadesCustomizadas: [],
        unidadesOmitidas: []
      }
    ];

    const est: BlocoEstruturaAvancada = {
      id: `bloco-b-${Date.now()}`,
      nome: blocoAtivo?.nome || (eTorre ? 'Torre B' : 'Bloco B'),
      possuiSubsolo: true,
      qtdSubsolos: 2,
      subsolosDetalhes,
      possuiTerreo: true,
      terreoModo: 'personalizado',
      terreoQtd: 8,
      terreoIncluirPrefixo: false,
      terreoPrefixo: '',
      terreoUnidadesCustom: ['01', '02', '03', '04', '06', '08', '09', '10'],
      terreoUnidadesOmitidas: [],
      qtdAndaresSuperiores: 8,
      andaresRegraPadrao: true,
      andaresPadraoUnidades: 8,
      andaresDigitosUnidade: 2,
      andaresSeparador: '',
      andaresDetalhes: [],
      unidadesAvulsas: []
    };
    atualizarEstruturaAtiva(est);
  };

  // Gera a lista de unidades do bloco ativo agrupadas por pavimento para a prévia
  const gruposPavimentosBlocoAtivo = useMemo(() => {
    if (!blocoAtivo) return [];
    return gerarUnidadesAgrupadasPorPavimento(blocoAtivo);
  }, [blocoAtivo]);

  // Total geral de unidades de todos os blocos
  const totalGeralCondominio = useMemo(() => {
    return blocosComEstrutura.reduce((acc, b) => acc + (Number(b.unidades) || 0), 0);
  }, [blocosComEstrutura]);

  const estAtiva = blocoAtivo?.estrutura || criarEstruturaPadraoBloco(blocoAtivo?.nome || 'Bloco');

  // Adicionar unidade avulsa
  const handleAdicionarAvulsa = () => {
    if (!novaUnidadeAvulsa.trim()) return;
    const lista = [...(estAtiva.unidadesAvulsas || [])];
    if (!lista.includes(novaUnidadeAvulsa.trim())) {
      lista.push(novaUnidadeAvulsa.trim());
      atualizarEstruturaAtiva({ unidadesAvulsas: lista });
    }
    setNovaUnidadeAvulsa('');
  };

  // Remover unidade avulsa
  const handleRemoverAvulsa = (nomeAvulsa: string) => {
    const lista = (estAtiva.unidadesAvulsas || []).filter(u => u !== nomeAvulsa);
    atualizarEstruturaAtiva({ unidadesAvulsas: lista });
  };

  return (
    <div className="space-y-6">
      {/* Banner de Apresentação e Atalhos de Presets */}
      <div className="p-4 sm:p-5 bg-linear-to-r from-blue-500/10 via-indigo-500/10 to-emerald-500/10 border border-blue-200 dark:border-blue-800/60 rounded-2xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-blue-600 text-white shadow-xs">
                <Sliders className="w-4 h-4" />
              </span>
              <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                Geração Flexível & Personalizada por Pavimento
              </h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Configure prédios com pavimentos assimétricos, garagens/subsolos, térreo com exceções de numeração e andares superiores com regras individuais ou padronizadas.
            </p>
          </div>

          {/* Modelos Prontos de Exemplo */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Exemplos Rápidos:
            </span>
            <button
              type="button"
              onClick={aplicarPresetBlocoA}
              className="px-3 py-1.5 rounded-xl border border-blue-300 dark:border-blue-700 bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-xs font-black transition cursor-pointer shadow-2xs flex items-center gap-1.5"
              title="Carrega: 16 andares, térreo com 7 unidades (01..07 sem 05), andares 101..1610"
            >
              <Building2 className="w-3.5 h-3.5 text-blue-600" />
              <span>Exemplo Bloco A (16 andares)</span>
            </button>
            <button
              type="button"
              onClick={aplicarPresetBlocoB}
              className="px-3 py-1.5 rounded-xl border border-indigo-300 dark:border-indigo-700 bg-white dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-xs font-black transition cursor-pointer shadow-2xs flex items-center gap-1.5"
              title="Carrega: 2 subsolos (S1 e S2), térreo com exceções, 8 andares"
            >
              <Warehouse className="w-3.5 h-3.5 text-indigo-600" />
              <span>Exemplo Bloco B (Subsolos)</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ETAPA A: DEFINIÇÃO GERAL DE BLOCOS                                       */}
      {/* ========================================================================= */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white font-black text-sm flex items-center justify-center shadow-xs">
              A
            </div>
            <div>
              <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <span>Etapa A: Definição Geral de {labelTipoPlural}</span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300">
                  {blocosComEstrutura.length} {blocosComEstrutura.length === 1 ? labelTipo : labelTipoPlural}
                </span>
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Cadastre os blocos e torres com suas características gerais de subsolo, térreo e andares superiores
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleAdicionarBloco}
            className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black flex items-center justify-center gap-2 transition cursor-pointer active:scale-98 shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Adicionar {labelTipo}</span>
          </button>
        </div>

        {/* Grade de Cards dos Blocos da Etapa A */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {blocosComEstrutura.map((bloco, idx) => {
            const est = bloco.estrutura || criarEstruturaPadraoBloco(bloco.nome);
            const isAtivo = idx === indiceSeguro;
            const unidadesCount = Number(bloco.unidades) || gerarUnidadesDeBlocoEstruturado(bloco).length;

            return (
              <div
                key={est.id || idx}
                onClick={() => setBlocoAtivoIndex(idx)}
                className={`p-4 rounded-xl border-2 transition cursor-pointer relative ${
                  isAtivo
                    ? 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-500 shadow-sm ring-2 ring-blue-500/20'
                    : 'bg-slate-50/70 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                {/* Header do Card */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <span className={`w-6 h-6 rounded-lg text-xs font-black flex items-center justify-center ${
                      isAtivo ? 'bg-blue-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}>
                      {idx + 1}
                    </span>
                    <input
                      type="text"
                      value={est.nome}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => {
                        const novoNome = e.target.value;
                        atualizarBloco(idx, {
                          ...bloco,
                          nome: novoNome,
                          estrutura: { ...est, nome: novoNome }
                        });
                      }}
                      placeholder={`${labelTipo} ${idx + 1}`}
                      className="text-xs font-black text-slate-900 dark:text-white bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900 px-1 py-0.5 rounded outline-none w-32"
                    />
                  </div>

                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => handleDuplicarBloco(idx)}
                      title="Duplicar este bloco"
                      className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    {blocosComEstrutura.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoverBloco(idx)}
                        title="Excluir este bloco"
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Campos do Bloco */}
                <div className="space-y-3 pt-1 text-xs" onClick={(e) => e.stopPropagation()}>
                  {/* Possui Subsolo? */}
                  <div className="flex items-center justify-between gap-2 p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={est.possuiSubsolo}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          atualizarBloco(idx, {
                            ...bloco,
                            estrutura: {
                              ...est,
                              possuiSubsolo: checked,
                              qtdSubsolos: checked ? Math.max(1, est.qtdSubsolos || 1) : 0
                            }
                          });
                        }}
                        className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                      />
                      <span className="font-bold text-slate-800 dark:text-slate-200">Possui Subsolo?</span>
                    </label>

                    {est.possuiSubsolo && (
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-slate-500">Qtd:</span>
                        <input
                          type="number"
                          min="1"
                          max="10"
                          value={est.qtdSubsolos || 1}
                          onChange={(e) => {
                            const q = Math.max(1, Math.min(10, parseInt(e.target.value) || 1));
                            atualizarBloco(idx, {
                              ...bloco,
                              estrutura: { ...est, qtdSubsolos: q }
                            });
                          }}
                          className="w-12 px-1.5 py-0.5 text-center font-black bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-xs text-slate-900 dark:text-white"
                        />
                      </div>
                    )}
                  </div>

                  {/* Possui Térreo? */}
                  <div className="flex items-center justify-between gap-2 p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={est.possuiTerreo}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          atualizarBloco(idx, {
                            ...bloco,
                            estrutura: { ...est, possuiTerreo: checked }
                          });
                        }}
                        className="w-4 h-4 text-emerald-600 rounded cursor-pointer"
                      />
                      <span className="font-bold text-slate-800 dark:text-slate-200">Possui Térreo?</span>
                    </label>

                    {est.possuiTerreo && (
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${
                        est.terreoModo === 'personalizado'
                          ? 'bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300'
                          : 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-300'
                      }`}>
                        {est.terreoModo === 'personalizado' ? 'Exceção / Livre' : 'Padrão'}
                      </span>
                    )}
                  </div>

                  {/* Andares Superiores */}
                  <div className="flex items-center justify-between gap-2 p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                    <span className="font-bold text-slate-800 dark:text-slate-200">Andares Superiores:</span>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={est.qtdAndaresSuperiores}
                        onChange={(e) => {
                          const q = Math.max(0, Math.min(100, parseInt(e.target.value) || 0));
                          atualizarBloco(idx, {
                            ...bloco,
                            estrutura: { ...est, qtdAndaresSuperiores: q }
                          });
                        }}
                        className="w-14 px-1.5 py-0.5 text-center font-black bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-xs text-slate-900 dark:text-white"
                      />
                      <span className="text-[10px] text-slate-500">andares</span>
                    </div>
                  </div>
                </div>

                {/* Rodapé do Card do Bloco */}
                <div className="mt-3 pt-2.5 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between text-[11px]">
                  <span className="text-slate-500 dark:text-slate-400">Total calculado:</span>
                  <span className="font-black text-blue-700 dark:text-blue-300 bg-blue-100/70 dark:bg-blue-900/40 px-2 py-0.5 rounded-md">
                    {unidadesCount} unidades
                  </span>
                </div>

                {isAtivo && (
                  <div className="absolute -top-2 -right-2 bg-blue-600 text-white rounded-full p-1 shadow-sm">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ETAPA B: MATRIZ DE CONFIGURAÇÃO POR PAVIMENTO/ANDAR (O PONTO-CHAVE)       */}
      {/* ========================================================================= */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white font-black text-sm flex items-center justify-center shadow-xs">
              B
            </div>
            <div>
              <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <span>Etapa B: Matriz por Pavimento — {estAtiva.nome}</span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-900/60 text-indigo-800 dark:text-indigo-300">
                  {blocoAtivo ? gerarUnidadesDeBlocoEstruturado(blocoAtivo).length : 0} unidades
                </span>
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Ajuste fino de numeração, prefixos e exceções específicas para Subsolos, Térreo e Andares do {estAtiva.nome}
              </p>
            </div>
          </div>

          {/* Abas para alternar o bloco sendo configurado */}
          {blocosComEstrutura.length > 1 && (
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl overflow-x-auto max-w-full">
              {blocosComEstrutura.map((b, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setBlocoAtivoIndex(idx)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer whitespace-nowrap ${
                    idx === indiceSeguro
                      ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  {b.nome || `${labelTipo} ${idx + 1}`}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* --------------------------------------------------------------------- */}
        {/* 1. SUBSOLOS (SE HOUVER)                                               */}
        {/* --------------------------------------------------------------------- */}
        {estAtiva.possuiSubsolo && (
          <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-950/60 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div
              className="flex items-center justify-between cursor-pointer select-none"
              onClick={() => setPavimentoExpandido(pavimentoExpandido === 'subsolos' ? '' : 'subsolos')}
            >
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  <Warehouse className="w-4 h-4" />
                </span>
                <div>
                  <h5 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                    <span>1. Subsolos / Garagens ({estAtiva.qtdSubsolos || 1} pavimentos)</span>
                  </h5>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Prefixos como S1, S2, SS ou lista livre de unidades/vagas
                  </p>
                </div>
              </div>
              <span className="p-1 text-slate-400">
                {pavimentoExpandido === 'subsolos' ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </span>
            </div>

            {pavimentoExpandido === 'subsolos' && (
              <div className="pt-2 space-y-4 border-t border-slate-200/80 dark:border-slate-800">
                {Array.from({ length: estAtiva.qtdSubsolos || 1 }).map((_, sIdx) => {
                  const sNum = sIdx + 1;
                  const sId = `subsolo-${sNum}`;
                  const sCfg = estAtiva.subsolosDetalhes?.find(p => p.id === sId) || {
                    id: sId,
                    tipo: 'subsolo',
                    nome: (estAtiva.qtdSubsolos || 1) === 1 ? 'Subsolo' : `Subsolo ${sNum}`,
                    prefixo: (estAtiva.qtdSubsolos || 1) === 1 ? 'SS' : `S${sNum}`,
                    quantidadeUnidades: 5,
                    incluirPrefixoAndar: true,
                    modoNumeracao: 'padrao',
                    digitosUnidade: 2,
                    unidadesCustomizadas: [],
                    unidadesOmitidas: []
                  };

                  const atualizarSubsoloCfg = (novosCampos: Partial<PavimentoConfig>) => {
                    const lista = [...(estAtiva.subsolosDetalhes || [])];
                    const idxExistente = lista.findIndex(p => p.id === sId);
                    const modificado: PavimentoConfig = { ...sCfg, ...novosCampos };
                    if (idxExistente >= 0) {
                      lista[idxExistente] = modificado;
                    } else {
                      lista.push(modificado);
                    }
                    atualizarEstruturaAtiva({ subsolosDetalhes: lista });
                  };

                  return (
                    <div key={sId} className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <span className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                          {sCfg.nome || `Subsolo ${sNum}`}
                        </span>

                        <div className="flex items-center gap-2">
                          <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={sCfg.incluirPrefixoAndar !== false}
                              onChange={(e) => atualizarSubsoloCfg({ incluirPrefixoAndar: e.target.checked })}
                              className="w-3.5 h-3.5 text-blue-600 rounded cursor-pointer"
                            />
                            <span>Incluir Prefixo no Número (ex: {sCfg.prefixo || 'S1'}-01)</span>
                          </label>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                            Prefixo do Pavimento
                          </label>
                          <input
                            type="text"
                            value={sCfg.prefixo || ''}
                            onChange={(e) => atualizarSubsoloCfg({ prefixo: e.target.value })}
                            placeholder={sNum === 1 ? 'S1' : `S${sNum}`}
                            className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-900 dark:text-white"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                            Qtd de Unidades
                          </label>
                          <input
                            type="number"
                            min="1"
                            max="100"
                            value={sCfg.quantidadeUnidades || 5}
                            onChange={(e) => atualizarSubsoloCfg({ quantidadeUnidades: Math.max(1, parseInt(e.target.value) || 1) })}
                            className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-900 dark:text-white"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                            Modo de Numeração
                          </label>
                          <select
                            value={sCfg.modoNumeracao || 'padrao'}
                            onChange={(e) => atualizarSubsoloCfg({ modoNumeracao: e.target.value as any })}
                            className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-900 dark:text-white cursor-pointer"
                          >
                            <option value="padrao">Padrão Sequencial (01, 02...)</option>
                            <option value="personalizado">Personalizado / Exceções</option>
                          </select>
                        </div>
                      </div>

                      {/* Se modo personalizado ativo no subsolo */}
                      {sCfg.modoNumeracao === 'personalizado' && (
                        <div className="pt-2">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                            Unidades específicas (separadas por vírgula):
                          </label>
                          <input
                            type="text"
                            value={(sCfg.unidadesCustomizadas || []).join(', ')}
                            onChange={(e) => {
                              const arr = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                              atualizarSubsoloCfg({ unidadesCustomizadas: arr });
                            }}
                            placeholder="Ex: S1-01, S1-02, S1-03, S1-04, S1-05"
                            className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-900 dark:text-white"
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* --------------------------------------------------------------------- */}
        {/* 2. TÉRREO (SE HOUVER) — COM EXCEÇÕES PERSONALIZADAS                   */}
        {/* --------------------------------------------------------------------- */}
        {estAtiva.possuiTerreo && (
          <div className="p-4 sm:p-5 bg-emerald-50/60 dark:bg-emerald-950/20 rounded-2xl border border-emerald-200 dark:border-emerald-800/60 space-y-4">
            <div
              className="flex items-center justify-between cursor-pointer select-none"
              onClick={() => setPavimentoExpandido(pavimentoExpandido === 'terreo' ? '' : 'terreo')}
            >
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300">
                  <Home className="w-4 h-4" />
                </span>
                <div>
                  <h5 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                    <span>2. Pavimento Térreo</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200">
                      {estAtiva.terreoModo === 'personalizado' ? 'Numeração Livre / Exceções' : 'Padrão'}
                    </span>
                  </h5>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400">
                    Defina unidades sem prefixo de andar (ex: 01, 02, 03, 04, 06, 07) ou omita números ausentes
                  </p>
                </div>
              </div>
              <span className="p-1 text-slate-400">
                {pavimentoExpandido === 'terreo' ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </span>
            </div>

            {pavimentoExpandido === 'terreo' && (
              <div className="pt-2 space-y-4 border-t border-emerald-200/80 dark:border-emerald-800/60">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                      Modo de Numeração
                    </label>
                    <select
                      value={estAtiva.terreoModo}
                      onChange={(e) => atualizarEstruturaAtiva({ terreoModo: e.target.value as any })}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white cursor-pointer"
                    >
                      <option value="personalizado">Numeração Livre / Personalizada (Recomendado)</option>
                      <option value="padrao">Padrão Sequencial (01, 02, 03...)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                      Inclusão do Andar como Prefixo?
                    </label>
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => atualizarEstruturaAtiva({ terreoIncluirPrefixo: false })}
                        className={`px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer ${
                          !estAtiva.terreoIncluirPrefixo
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        Não (ex: 01, 02, 03)
                      </button>
                      <button
                        type="button"
                        onClick={() => atualizarEstruturaAtiva({ terreoIncluirPrefixo: true })}
                        className={`px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer ${
                          estAtiva.terreoIncluirPrefixo
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        Sim (ex: T-01 ou 001)
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                      Quantidade Prevista
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={estAtiva.terreoQtd || 6}
                      onChange={(e) => atualizarEstruturaAtiva({ terreoQtd: Math.max(1, parseInt(e.target.value) || 1) })}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                {/* Editor de Lista Personalizada / Exceções do Térreo */}
                <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-emerald-200 dark:border-emerald-800/60 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Hash className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Lista de Numeração / Exceções do Térreo</span>
                    </label>
                    <span className="text-[10px] text-slate-500">
                      Separado por vírgula (ex: 01, 02, 03, 04, 06, 07 — note sem o 05)
                    </span>
                  </div>

                  <input
                    type="text"
                    value={(estAtiva.terreoUnidadesCustom || []).join(', ')}
                    onChange={(e) => {
                      const arr = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                      atualizarEstruturaAtiva({
                        terreoUnidadesCustom: arr,
                        terreoModo: 'personalizado'
                      });
                    }}
                    placeholder="01, 02, 03, 04, 06, 07"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white"
                  />

                  {/* Chips interativos para remoção ou omissão rápida */}
                  {estAtiva.terreoUnidadesCustom && estAtiva.terreoUnidadesCustom.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap pt-1">
                      <span className="text-[10px] font-bold text-slate-500">Clique para remover exceção:</span>
                      {estAtiva.terreoUnidadesCustom.map((u, uIdx) => (
                        <span
                          key={uIdx}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 text-xs font-black"
                        >
                          {u}
                          <button
                            type="button"
                            onClick={() => {
                              const filtrado = estAtiva.terreoUnidadesCustom?.filter((_, i) => i !== uIdx);
                              atualizarEstruturaAtiva({ terreoUnidadesCustom: filtrado });
                            }}
                            className="hover:text-red-600 cursor-pointer"
                            title={`Remover unidade ${u}`}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* --------------------------------------------------------------------- */}
        {/* 3. ANDARES SUPERIORES (TIPO)                                          */}
        {/* --------------------------------------------------------------------- */}
        {estAtiva.qtdAndaresSuperiores > 0 && (
          <div className="p-4 sm:p-5 bg-blue-50/60 dark:bg-blue-950/20 rounded-2xl border border-blue-200 dark:border-blue-800/60 space-y-4">
            <div
              className="flex items-center justify-between cursor-pointer select-none"
              onClick={() => setPavimentoExpandido(pavimentoExpandido === 'andares' ? '' : 'andares')}
            >
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
                  <ArrowUp className="w-4 h-4" />
                </span>
                <div>
                  <h5 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                    <span>3. Andares Superiores ({estAtiva.qtdAndaresSuperiores} andares)</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200">
                      {estAtiva.andaresRegraPadrao ? 'Regra Padrão para Todos' : 'Personalizado por Andar'}
                    </span>
                  </h5>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400">
                    Ex: 1º andar = 101 a 110; 16º andar = 1601 a 1610 (número do andar prefixado)
                  </p>
                </div>
              </div>
              <span className="p-1 text-slate-400">
                {pavimentoExpandido === 'andares' ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </span>
            </div>

            {pavimentoExpandido === 'andares' && (
              <div className="pt-2 space-y-4 border-t border-blue-200/80 dark:border-blue-800/60">
                {/* Toggle: Aplicar regra padrão para todos os andares? */}
                <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-blue-200 dark:border-blue-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="block text-xs font-black text-slate-900 dark:text-white">
                      Aplicar regra padrão para todos os andares?
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      Se SIM, replica a mesma quantidade e formatação para todos os pavimentos superiores
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => atualizarEstruturaAtiva({ andaresRegraPadrao: true })}
                      className={`px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer ${
                        estAtiva.andaresRegraPadrao
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      Sim (Padrão)
                    </button>
                    <button
                      type="button"
                      onClick={() => atualizarEstruturaAtiva({ andaresRegraPadrao: false })}
                      className={`px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer ${
                        !estAtiva.andaresRegraPadrao
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      Não (Por Andar)
                    </button>
                  </div>
                </div>

                {/* Se Regra Padrão for SIM */}
                {estAtiva.andaresRegraPadrao ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                        Qtd de Unidades por Andar
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="50"
                        value={estAtiva.andaresPadraoUnidades || 10}
                        onChange={(e) => atualizarEstruturaAtiva({ andaresPadraoUnidades: Math.max(1, parseInt(e.target.value) || 1) })}
                        placeholder="Ex: 10"
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-blue-300 dark:border-blue-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                        Formato do Identificador Predial
                      </label>
                      <select
                        value={estAtiva.andaresDigitosUnidade === 2 ? '2dig' : 'hifen'}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === 'hifen') {
                            atualizarEstruturaAtiva({ andaresDigitosUnidade: 2, andaresSeparador: '-' });
                          } else {
                            atualizarEstruturaAtiva({ andaresDigitosUnidade: 2, andaresSeparador: '' });
                          }
                        }}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-blue-300 dark:border-blue-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white cursor-pointer"
                      >
                        <option value="2dig">Andar + 2 dígitos (Ex: 101..110, 1601..1610) [Padrão Nacional]</option>
                        <option value="hifen">Andar com hífen (Ex: 1-01..1-10, 16-01..16-10)</option>
                      </select>
                    </div>
                  </div>
                ) : (
                  /* Se Regra Padrão for NÃO (Personalizado por Andar individual) */
                  <div className="space-y-3">
                    <p className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                      Defina individualmente cada um dos {estAtiva.qtdAndaresSuperiores} andares superiores:
                    </p>

                    <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1">
                      {Array.from({ length: estAtiva.qtdAndaresSuperiores }).map((_, aIdx) => {
                        const andarNum = aIdx + 1;
                        const aId = `andar-${andarNum}`;
                        const aCfg = estAtiva.andaresDetalhes?.find(p => p.id === aId) || {
                          id: aId,
                          tipo: 'andar',
                          nome: `${andarNum}º Andar`,
                          prefixo: String(andarNum),
                          quantidadeUnidades: estAtiva.andaresPadraoUnidades || 10,
                          incluirPrefixoAndar: true,
                          modoNumeracao: 'padrao',
                          digitosUnidade: 2,
                          unidadesCustomizadas: [],
                          unidadesOmitidas: []
                        };

                        const atualizarAndarIndividual = (novosCampos: Partial<PavimentoConfig>) => {
                          const lista = [...(estAtiva.andaresDetalhes || [])];
                          const idxExistente = lista.findIndex(p => p.id === aId);
                          const modificado: PavimentoConfig = { ...aCfg, ...novosCampos };
                          if (idxExistente >= 0) {
                            lista[idxExistente] = modificado;
                          } else {
                            lista.push(modificado);
                          }
                          atualizarEstruturaAtiva({ andaresDetalhes: lista });
                        };

                        return (
                          <div key={aId} className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                            <div className="flex items-center gap-2">
                              <span className="w-5 h-5 rounded-md bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 flex items-center justify-center font-black text-[10px]">
                                {andarNum}
                              </span>
                              <input
                                type="text"
                                value={aCfg.nome}
                                onChange={(e) => atualizarAndarIndividual({ nome: e.target.value })}
                                placeholder={`${andarNum}º Andar`}
                                className="font-bold text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 px-2 py-1 rounded-md w-28 text-slate-900 dark:text-white"
                              />
                            </div>

                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] text-slate-500">Prefixo:</span>
                                <input
                                  type="text"
                                  value={aCfg.prefixo}
                                  onChange={(e) => atualizarAndarIndividual({ prefixo: e.target.value })}
                                  placeholder={String(andarNum)}
                                  className="w-12 text-center font-black bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 px-1 py-1 rounded-md text-xs text-slate-900 dark:text-white"
                                />
                              </div>

                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] text-slate-500">Unidades:</span>
                                <input
                                  type="number"
                                  min="1"
                                  max="50"
                                  value={aCfg.quantidadeUnidades}
                                  onChange={(e) => atualizarAndarIndividual({ quantidadeUnidades: Math.max(1, parseInt(e.target.value) || 1) })}
                                  className="w-14 text-center font-black bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 px-1 py-1 rounded-md text-xs text-slate-900 dark:text-white"
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* --------------------------------------------------------------------- */}
        {/* 4. ÁREAS COMUNS & UNIDADES AVULSAS (PORTARIA, ZELADORIA, ADM)         */}
        {/* --------------------------------------------------------------------- */}
        <div className="p-3.5 bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-purple-600" />
              <span>Unidades Avulsas / Administrativas (Opcional)</span>
            </span>
            <span className="text-[10px] text-slate-500">
              Ex: Portaria, Zeladoria, Salão de Festas, Administração
            </span>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={novaUnidadeAvulsa}
              onChange={(e) => setNovaUnidadeAvulsa(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAdicionarAvulsa();
                }
              }}
              placeholder="Digite o nome (ex: Portaria ou Zeladoria) e clique em Adicionar"
              className="flex-1 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white"
            />
            <button
              type="button"
              onClick={handleAdicionarAvulsa}
              className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1 shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Adicionar</span>
            </button>
          </div>

          {estAtiva.unidadesAvulsas && estAtiva.unidadesAvulsas.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap pt-1">
              {estAtiva.unidadesAvulsas.map((av, avIdx) => (
                <span
                  key={avIdx}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-purple-100 dark:bg-purple-900/60 text-purple-900 dark:text-purple-200 text-xs font-bold"
                >
                  {av}
                  <button
                    type="button"
                    onClick={() => handleRemoverAvulsa(av)}
                    className="hover:text-red-600 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* PRÉ-VISUALIZAÇÃO INTERATIVA EM TEMPO REAL                                */}
      {/* ========================================================================= */}
      <div className="bg-slate-900 text-white rounded-2xl p-5 sm:p-6 shadow-md space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30">
              <Eye className="w-4 h-4" />
            </span>
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-200 flex items-center gap-2">
                <span>Pré-Visualização em Tempo Real — {estAtiva.nome}</span>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500 text-slate-950">
                  {gruposPavimentosBlocoAtivo.reduce((acc, g) => acc + g.unidades.length, 0)} Unidades no {estAtiva.nome}
                </span>
              </h4>
              <p className="text-[11px] text-slate-400">
                Total consolidado no condomínio: <strong className="text-white">{totalGeralCondominio} unidades</strong> ({blocosComEstrutura.length} {labelTipoPlural})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={filtroPrevia}
              onChange={(e) => setFiltroPrevia(e.target.value)}
              placeholder="Buscar unidade na prévia..."
              className="px-2.5 py-1 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* Grupos de Unidades por Pavimento */}
        <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
          {gruposPavimentosBlocoAtivo.map((grupo) => {
            const unidsFiltradas = filtroPrevia
              ? grupo.unidades.filter(u => u.toLowerCase().includes(filtroPrevia.toLowerCase()))
              : grupo.unidades;

            if (unidsFiltradas.length === 0) return null;

            const badgeCor =
              grupo.tipo === 'subsolo'
                ? 'bg-slate-800 text-slate-300 border-slate-700'
                : grupo.tipo === 'terreo'
                ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                : grupo.tipo === 'andar'
                ? 'bg-blue-950 text-blue-300 border-blue-800'
                : 'bg-purple-950 text-purple-300 border-purple-800';

            return (
              <div key={grupo.pavimentoId} className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-md border text-[11px] font-black ${badgeCor}`}>
                      {grupo.nome}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      ({unidsFiltradas.length} {unidsFiltradas.length === 1 ? 'unidade' : 'unidades'})
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  {unidsFiltradas.map((num, uIdx) => (
                    <span
                      key={uIdx}
                      className="px-2.5 py-1 rounded-lg bg-slate-800/90 hover:bg-slate-700 border border-slate-700 text-xs font-mono font-bold text-slate-100 transition shadow-2xs"
                    >
                      {num}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
