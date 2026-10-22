import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { uploadFotoComprimidaStorage } from '../services/imageUtils';
import { 
  ShieldCheck, 
  PackagePlus, 
  PackageCheck, 
  Camera, 
  Search, 
  MessageCircle, 
  ExternalLink, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  User,
  History,
  FileSpreadsheet,
  RefreshCw,
  Eye,
  Filter,
  Calendar,
  X,
  Copy,
  ArrowRight,
  Share2,
  Check,
  FileText
} from 'lucide-react';
import { 
  carregarCondominioConfig, 
  isEstruturaCasas, 
  isEstruturaTorres, 
  getNomeRotuloBloco, 
  getNomeRotuloUnidade, 
  obterListaBlocosOuTorres, 
  formatarIdentificacaoUnidade, 
  formatarTextoWhatsUnidade,
  saoUnidadesEquivalentes,
  CondominioConfig 
} from '../services/condominioService';

interface CustodiaProps {
  usuarioLogado?: any;
}

export default function Custodia({ usuarioLogado }: CustodiaProps) {
  const [aba, setAba] = useState<'entrada' | 'saida' | 'auditoria'>('entrada');
  const [loading, setLoading] = useState(false);
  const [uploadingFoto, setUploadingFoto] = useState(false);
  const [mensagem, setMensagem] = useState({ tipo: '', texto: '' });

  const [condoConfig, setCondoConfig] = useState<CondominioConfig | null>(null);
  const [moradores, setMoradores] = useState<any[]>([]);
  const [itensGuardados, setItensGuardados] = useState<any[]>([]);
  const [historicoCompleto, setHistoricoCompleto] = useState<any[]>([]);

  // Filtros de Auditoria & Histórico
  const [buscaAuditoria, setBuscaAuditoria] = useState('');
  const [filtroStatusAuditoria, setFiltroStatusAuditoria] = useState<'todos' | 'aguardando' | 'retirado'>('todos');
  const [filtroFluxoAuditoria, setFiltroFluxoAuditoria] = useState<'todos' | 'M-M' | 'M-T' | 'T-M'>('todos');
  const [filtroPeriodoAuditoria, setFiltroPeriodoAuditoria] = useState<'todos' | 'hoje' | '7dias' | '30dias'>('todos');

  // Modais de Auditoria
  const [itemDossieModal, setItemDossieModal] = useState<any | null>(null);
  const [fotoAmpliadaModal, setFotoAmpliadaModal] = useState<{ url: string; titulo: string } | null>(null);
  const [copiadoDossie, setCopiadoDossie] = useState(false);

  const [fluxo, setFluxo] = useState('M-M');
  
  const [origemUnidade, setOrigemUnidade] = useState('');
  const [origemBloco, setOrigemBloco] = useState('');
  const [origemNome, setOrigemNome] = useState('');
  const [origemWhats, setOrigemWhats] = useState('');

  const [destinoUnidade, setDestinoUnidade] = useState('');
  const [destinoBloco, setDestinoBloco] = useState('');
  const [destinoNome, setDestinoNome] = useState('');
  const [destinoWhats, setDestinoWhats] = useState('');

  const [descricaoItem, setDescricaoItem] = useState('');
  const [fotoEntradaUrl, setFotoEntradaUrl] = useState('');
  const [whatsEntradaLink, setWhatsEntradaLink] = useState<any | null>(null);

  const [buscaTermo, setBuscaTermo] = useState('');
  const [itemSelecionadoSaida, setItemSelecionadoSaida] = useState<any | null>(null);
  const [recebedorNome, setRecebedorNome] = useState('');
  const [recebedorDoc, setRecebedorDoc] = useState('');
  const [fotoSaidaUrl, setFotoSaidaUrl] = useState('');
  const condId = usuarioLogado?.condominio_id || '';
  const isGlobal = !condId || condId === 'global';
  const [whatsSaidaLink, setWhatsSaidaLink] = useState<any | null>(null);

  useEffect(() => {
    carregarDados();
  }, [aba, condId]);

  const carregarDados = async () => {
    setLoading(true);

    try {
      const targetCondo = condId || usuarioLogado?.listaCondominios?.[0]?.id;
      if (targetCondo) {
        const cfg = await carregarCondominioConfig(targetCondo);
        setCondoConfig(cfg);
        if (isEstruturaCasas(cfg?.tipo_estrutura)) {
          setOrigemBloco('Casa');
          setDestinoBloco('Casa');
        }
      }

      let moradQuery = supabase
        .from('moradores')
        .select('*')
        .order('nome');
      if (!isGlobal) {
        moradQuery = moradQuery.eq('condominio_id', condId);
      }
      const { data: moradData } = await moradQuery;
      setMoradores(moradData || []);

      let custodiaQuery = supabase
        .from('custodia')
        .select('*')
        .order('created_at', { ascending: false });
      if (!isGlobal) {
        custodiaQuery = custodiaQuery.eq('condominio_id', condId);
      }
      const { data: custodiaData, error: errCustodia } = await custodiaQuery;

      if (errCustodia) throw errCustodia;

      const todos = custodiaData || [];
      setHistoricoCompleto(todos);

      const guardados = todos.filter((c: any) => {
        const s = (c.status || '').trim().toLowerCase();
        return s === 'aguardando retirada' || s === 'guardado' || s === 'retido' || s === 'pendente';
      });
      setItensGuardados(guardados);
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: err.message });
    } finally {
      setLoading(false);
    }
  };

  const eEstruturaCasas = isEstruturaCasas(condoConfig?.tipo_estrutura);
  const eEstruturaTorres = isEstruturaTorres(condoConfig?.tipo_estrutura);
  const rotuloBloco = getNomeRotuloBloco(condoConfig?.tipo_estrutura);
  const rotuloUnidade = getNomeRotuloUnidade(condoConfig?.tipo_estrutura);

  const listaBlocos = obterListaBlocosOuTorres(condoConfig, moradores);

  const uploadFotoStorage = async (file: File | null, pasta: string, setUrlCallback: (url: string) => void) => {
    if (!file) return;
    setUploadingFoto(true);
    setMensagem({ tipo: '', texto: '' });

    try {
      const { publicUrl, tamanhoOriginalKb, tamanhoComprimidoKb, taxaReducaoPct } = await uploadFotoComprimidaStorage({
        file,
        pasta,
        maxWidth: 1000,
        maxHeight: 1000,
        qualidade: 0.75
      });

      setUrlCallback(publicUrl);
      const detalheEconomia = taxaReducaoPct > 0 ? ` (${tamanhoOriginalKb}KB ➔ ${tamanhoComprimidoKb}KB, -${taxaReducaoPct}%)` : '';
      setMensagem({ tipo: 'sucesso', texto: `Foto salva com sucesso!${detalheEconomia}` });
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: 'Erro ao salvar foto: ' + err.message });
    } finally {
      setUploadingFoto(false);
    }
  };

  const selecionarOrigemMorador = (unid: string, bloc: string) => {
    const blocoEfetivo = eEstruturaCasas ? 'Casa' : bloc;
    setOrigemUnidade(unid);
    setOrigemBloco(blocoEfetivo);
    const m = moradores.find(x => 
      saoUnidadesEquivalentes(x.unidade, unid) &&
      (eEstruturaCasas || !blocoEfetivo.trim() || (x.bloco || '').toLowerCase() === blocoEfetivo.trim().toLowerCase())
    );
    if (m) {
      setOrigemNome(m.nome);
      setOrigemWhats(m.telefone || '');
    }
  };

  const selecionarDestinoMorador = (unid: string, bloc: string) => {
    const blocoEfetivo = eEstruturaCasas ? 'Casa' : bloc;
    setDestinoUnidade(unid);
    setDestinoBloco(blocoEfetivo);
    const m = moradores.find(x => 
      saoUnidadesEquivalentes(x.unidade, unid) &&
      (eEstruturaCasas || !blocoEfetivo.trim() || (x.bloco || '').toLowerCase() === blocoEfetivo.trim().toLowerCase())
    );
    if (m) {
      setDestinoNome(m.nome);
      setDestinoWhats(m.telefone || '');
    }
  };

  const moradoresOrigemFiltrados = moradores.filter(
    (m) => origemUnidade && m.unidade && saoUnidadesEquivalentes(m.unidade, origemUnidade) && (eEstruturaCasas || !origemBloco || (m.bloco || '').toLowerCase() === origemBloco.toLowerCase())
  );
  const moradoresDestinoFiltrados = moradores.filter(
    (m) => destinoUnidade && m.unidade && saoUnidadesEquivalentes(m.unidade, destinoUnidade) && (eEstruturaCasas || !destinoBloco || (m.bloco || '').toLowerCase() === destinoBloco.toLowerCase())
  );

  const salvarEntradaCustodia = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!descricaoItem.trim() || !fotoEntradaUrl.trim() || !origemNome.trim() || !destinoNome.trim()) {
      setMensagem({ tipo: 'erro', texto: 'Preencha a origem, destino, descrição do item e tire a foto.' });
      return;
    }
    setLoading(true);

    try {
      const seq = Math.floor(1000 + Math.random() * 9000);
      const codigoCustodia = `CUST-${new Date().getFullYear()}-${seq}`;

      const targetCondo = condId || usuarioLogado?.listaCondominios?.[0]?.id || 'aa205bfb-55cc-42fe-ab25-9c16ac943851';
      const novoRegistro = {
        condominio_id: targetCondo,
        codigo_custodia: codigoCustodia,
        fluxo,
        origem_tipo: fluxo.startsWith('M') ? 'Morador' : 'Terceiro',
        origem_unidade: origemUnidade.trim(),
        origem_bloco: eEstruturaCasas ? 'Casa' : origemBloco.trim(),
        origem_nome_doc: origemNome.trim(),
        origem_whats: origemWhats.trim(),
        destino_tipo: fluxo.endsWith('M') ? 'Morador' : 'Terceiro',
        destino_unidade: destinoUnidade.trim(),
        destino_bloco: eEstruturaCasas ? 'Casa' : destinoBloco.trim(),
        destino_nome_doc: destinoNome.trim(),
        destino_whats: destinoWhats.trim(),
        descricao: descricaoItem.trim(),
        foto_entrada_url: fotoEntradaUrl.trim(),
        status: 'Aguardando Retirada',
        operador_entrada: usuarioLogado?.login || usuarioLogado?.nome || 'Portaria'
      };

      const { error } = await supabase
        .from('custodia')
        .insert([novoRegistro]);

      if (error) throw error;

      const telDestino = destinoWhats.replace(/\D/g, '');
      const textoWhats = `🔑 *ITEM EM CUSTÓDIA NA PORTARIA*\nCódigo: ${codigoCustodia}\nDe: ${origemNome} (${origemUnidade ? 'Ap. ' + origemUnidade : 'Terceiro'})\nPara: ${destinoNome}\nDescrição: ${descricaoItem}\nFoto do Objeto: ${fotoEntradaUrl}\n\nPor favor, retire na guarita informando o código!`;

      setWhatsEntradaLink({
        codigo: codigoCustodia,
        link: telDestino ? `https://wa.me/55${telDestino}?text=${encodeURIComponent(textoWhats)}` : `https://wa.me/?text=${encodeURIComponent(textoWhats)}`
      });

      setOrigemUnidade(''); setOrigemBloco(''); setOrigemNome(''); setOrigemWhats('');
      setDestinoUnidade(''); setDestinoBloco(''); setDestinoNome(''); setDestinoWhats('');
      setDescricaoItem(''); setFotoEntradaUrl('');
      carregarDados();
      setMensagem({ tipo: 'sucesso', texto: `Item guardado com sucesso! Código: ${codigoCustodia}` });
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: err.message });
    } finally {
      setLoading(false);
    }
  };

  const efetivarSaidaCustodia = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemSelecionadoSaida || !recebedorNome.trim() || !fotoSaidaUrl.trim()) {
      setMensagem({ tipo: 'erro', texto: 'Informe o nome do retirante e tire a foto do comprovante.' });
      return;
    }
    setLoading(true);

    try {
      const { error } = await supabase
        .from('custodia')
        .update({
          status: 'Retirado',
          data_hora_saida: new Date().toISOString(),
          recebedor_nome: recebedorNome.trim(),
          recebedor_doc: recebedorDoc.trim(),
          foto_saida_url: fotoSaidaUrl.trim(),
          operador_saida: usuarioLogado?.login || usuarioLogado?.nome || 'Portaria'
        })
        .eq('id', itemSelecionadoSaida.id);

      if (error) throw error;

      const telOrigem = itemSelecionadoSaida.origem_whats?.replace(/\D/g, '') || '';
      const textoConfirmacao = `✅ *ITEM ENTREGUE COM SUCESSO*\nCódigo: ${itemSelecionadoSaida.codigo_custodia}\nObjeto: ${itemSelecionadoSaida.descricao}\nRetirado Por: ${recebedorNome}\nComprovante: ${fotoSaidaUrl}\n\nOperador Responsável: ${usuarioLogado?.login || 'Portaria'}\nData/Hora: ${new Date().toLocaleString('pt-BR')}`;

      setWhatsSaidaLink({
        link: telOrigem ? `https://wa.me/55${telOrigem}?text=${encodeURIComponent(textoConfirmacao)}` : `https://wa.me/?text=${encodeURIComponent(textoConfirmacao)}`
      });

      setItemSelecionadoSaida(null);
      setRecebedorNome(''); setRecebedorDoc(''); setFotoSaidaUrl('');
      carregarDados();
      setMensagem({ tipo: 'sucesso', texto: 'Baixa de saída da custódia realizada com sucesso!' });
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: err.message });
    } finally {
      setLoading(false);
    }
  };

  const itensFiltradosSaida = itensGuardados.filter((item: any) => {
    const termo = buscaTermo.toLowerCase();
    const cod = item.codigo_custodia?.toLowerCase() || '';
    const desc = item.descricao?.toLowerCase() || '';
    const dest = item.destino_nome_doc?.toLowerCase() || '';
    const orig = item.origem_nome_doc?.toLowerCase() || '';
    const unid = item.destino_unidade?.toLowerCase() || '';
    return cod.includes(termo) || desc.includes(termo) || dest.includes(termo) || orig.includes(termo) || unid.includes(termo);
  });

  // Funções de Cálculo e Auditoria
  const calcularPermanencia = (entradaIso: string, saidaIso?: string | null) => {
    if (!entradaIso) return 'N/D';
    const inicio = new Date(entradaIso).getTime();
    const fim = saidaIso ? new Date(saidaIso).getTime() : Date.now();
    const diffMs = fim - inicio;
    if (diffMs < 0) return '0 min';

    const minutos = Math.floor(diffMs / (1000 * 60));
    const horas = Math.floor(minutos / 60);
    const dias = Math.floor(horas / 24);

    if (dias > 0) {
      const horasRestantes = horas % 24;
      return `${dias}d ${horasRestantes}h`;
    }
    if (horas > 0) {
      const minsRestantes = minutos % 60;
      return `${horas}h ${minsRestantes}m`;
    }
    return `${minutos} min`;
  };

  const exportarCSVCustodia = (itens: any[]) => {
    if (!itens || itens.length === 0) return;
    const cabecalhos = [
      'Codigo_Custodia',
      'Status',
      'Descricao',
      'Fluxo',
      'Origem_Tipo',
      'Origem_Nome',
      'Origem_Unidade',
      'Origem_Bloco',
      'Origem_Whats',
      'Destino_Tipo',
      'Destino_Nome',
      'Destino_Unidade',
      'Destino_Bloco',
      'Destino_Whats',
      'Data_Entrada',
      'Operador_Entrada',
      'Data_Saida',
      'Operador_Saida',
      'Recebedor_Nome',
      'Recebedor_Doc',
      'Foto_Entrada_URL',
      'Foto_Saida_URL'
    ];

    const linhas = itens.map(i => [
      `"${i.codigo_custodia || ''}"`,
      `"${i.status || ''}"`,
      `"${(i.descricao || '').replace(/"/g, '""')}"`,
      `"${i.fluxo || ''}"`,
      `"${i.origem_tipo || ''}"`,
      `"${(i.origem_nome_doc || '').replace(/"/g, '""')}"`,
      `"${i.origem_unidade || ''}"`,
      `"${i.origem_bloco || ''}"`,
      `"${i.origem_whats || ''}"`,
      `"${i.destino_tipo || ''}"`,
      `"${(i.destino_nome_doc || '').replace(/"/g, '""')}"`,
      `"${i.destino_unidade || ''}"`,
      `"${i.destino_bloco || ''}"`,
      `"${i.destino_whats || ''}"`,
      `"${i.created_at ? new Date(i.created_at).toLocaleString('pt-BR') : ''}"`,
      `"${i.operador_entrada || ''}"`,
      `"${i.data_hora_saida ? new Date(i.data_hora_saida).toLocaleString('pt-BR') : ''}"`,
      `"${i.operador_saida || ''}"`,
      `"${(i.recebedor_nome || '').replace(/"/g, '""')}"`,
      `"${i.recebedor_doc || ''}"`,
      `"${i.foto_entrada_url || ''}"`,
      `"${i.foto_saida_url || ''}"`
    ]);

    const csvContent = '\uFEFF' + [cabecalhos.join(';'), ...linhas.map(l => l.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `auditoria_custodia_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtragem de Auditoria
  const itensAuditoriaFiltrados = historicoCompleto.filter((item: any) => {
    // 1. Filtro por status
    if (filtroStatusAuditoria === 'aguardando') {
      const s = (item.status || '').toLowerCase();
      if (s !== 'aguardando retirada' && s !== 'guardado' && s !== 'retido' && s !== 'pendente') return false;
    } else if (filtroStatusAuditoria === 'retirado') {
      const s = (item.status || '').toLowerCase();
      if (s !== 'retirado') return false;
    }

    // 2. Filtro por fluxo
    if (filtroFluxoAuditoria !== 'todos') {
      if (item.fluxo !== filtroFluxoAuditoria) return false;
    }

    // 3. Filtro por período
    if (filtroPeriodoAuditoria !== 'todos') {
      const dataItem = new Date(item.created_at || item.data_hora_entrada || Date.now());
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);

      if (filtroPeriodoAuditoria === 'hoje') {
        const itemDia = new Date(dataItem);
        itemDia.setHours(0, 0, 0, 0);
        if (itemDia.getTime() !== hoje.getTime()) return false;
      } else if (filtroPeriodoAuditoria === '7dias') {
        const limite = new Date();
        limite.setDate(limite.getDate() - 7);
        if (dataItem < limite) return false;
      } else if (filtroPeriodoAuditoria === '30dias') {
        const limite = new Date();
        limite.setDate(limite.getDate() - 30);
        if (dataItem < limite) return false;
      }
    }

    // 4. Filtro por busca textual
    if (buscaAuditoria.trim()) {
      const t = buscaAuditoria.toLowerCase();
      const cod = (item.codigo_custodia || '').toLowerCase();
      const desc = (item.descricao || '').toLowerCase();
      const origNome = (item.origem_nome_doc || '').toLowerCase();
      const origUnid = (item.origem_unidade || '').toString().toLowerCase();
      const origBloc = (item.origem_bloco || '').toLowerCase();
      const destNome = (item.destino_nome_doc || '').toLowerCase();
      const destUnid = (item.destino_unidade || '').toString().toLowerCase();
      const destBloc = (item.destino_bloco || '').toLowerCase();
      const recNome = (item.recebedor_nome || '').toLowerCase();
      const recDoc = (item.recebedor_doc || '').toLowerCase();
      const opEnt = (item.operador_entrada || '').toLowerCase();
      const opSai = (item.operador_saida || '').toLowerCase();

      return (
        cod.includes(t) ||
        desc.includes(t) ||
        origNome.includes(t) ||
        origUnid.includes(t) ||
        origBloc.includes(t) ||
        destNome.includes(t) ||
        destUnid.includes(t) ||
        destBloc.includes(t) ||
        recNome.includes(t) ||
        recDoc.includes(t) ||
        opEnt.includes(t) ||
        opSai.includes(t)
      );
    }

    return true;
  });

  // Métricas de Auditoria
  const metricasAuditoria = {
    total: historicoCompleto.length,
    aguardando: itensGuardados.length,
    retirados: historicoCompleto.filter(i => (i.status || '').toLowerCase() === 'retirado').length,
    retiradosHoje: historicoCompleto.filter(i => {
      if ((i.status || '').toLowerCase() !== 'retirado' || !i.data_hora_saida) return false;
      const d = new Date(i.data_hora_saida);
      const h = new Date();
      return d.toDateString() === h.toDateString();
    }).length
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-3 bg-white rounded-xl shadow-2xs border border-slate-200 overflow-hidden">
        <button
          onClick={() => setAba('entrada')}
          className={`p-2.5 text-left border-b-2 transition cursor-pointer ${aba === 'entrada' ? 'border-emerald-600 bg-slate-50' : 'border-transparent'}`}
        >
          <span className="text-[10px] font-bold uppercase text-slate-400 block">Fluxo 1</span>
          <strong className="text-xs sm:text-sm text-slate-900 flex items-center gap-1.5"><PackagePlus className="w-3.5 h-3.5 text-emerald-600" /> Receber e Guardar</strong>
        </button>

        <button
          onClick={() => setAba('saida')}
          className={`p-2.5 text-left border-b-2 transition cursor-pointer ${aba === 'saida' ? 'border-emerald-600 bg-slate-50' : 'border-transparent'}`}
        >
          <span className="text-[10px] font-bold uppercase text-slate-400 block">Fluxo 2</span>
          <strong className="text-xs sm:text-sm text-slate-900 flex items-center gap-1.5"><PackageCheck className="w-3.5 h-3.5 text-blue-600" /> Baixa / Devolução ({itensGuardados.length})</strong>
        </button>

        <button
          onClick={() => setAba('auditoria')}
          className={`p-2.5 text-left border-b-2 transition cursor-pointer ${aba === 'auditoria' ? 'border-purple-600 bg-purple-50/50' : 'border-transparent'}`}
        >
          <span className="text-[10px] font-bold uppercase text-slate-400 block">Fluxo 3</span>
          <strong className="text-xs sm:text-sm text-slate-900 flex items-center gap-1.5"><History className="w-3.5 h-3.5 text-purple-600" /> Auditoria & Histórico ({historicoCompleto.length})</strong>
        </button>
      </div>

      {mensagem.texto && (
        <div className={`p-2.5 rounded-xl flex items-center gap-2 text-xs font-medium ${
          mensagem.tipo === 'sucesso' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {mensagem.tipo === 'sucesso' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          <span>{mensagem.texto}</span>
        </div>
      )}

      {aba === 'entrada' && (
        <div className="bg-white p-3 sm:p-4 rounded-xl shadow-2xs border border-slate-200 space-y-3">
          <div className="border-b pb-2">
            <h3 className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" /> Custódia de Itens na Portaria
            </h3>
            <p className="text-[11px] text-slate-500">
              Registre o objeto deixado na guarita identificando quem entregou e quem está autorizado a retirar.
            </p>
          </div>

          <form onSubmit={salvarEntradaCustodia} className="space-y-3 max-w-4xl">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Selecione o Fluxo de Custódia *</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setFluxo('M-M')}
                  className={`p-2.5 rounded-lg border text-center transition cursor-pointer font-bold ${fluxo === 'M-M' ? 'bg-slate-900 text-white border-slate-900 shadow-xs' : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'}`}
                >
                  <p className="text-xs font-bold">Morador ➔ Morador</p>
                </button>

                <button
                  type="button"
                  onClick={() => setFluxo('M-T')}
                  className={`p-2.5 rounded-lg border text-center transition cursor-pointer font-bold ${fluxo === 'M-T' ? 'bg-slate-900 text-white border-slate-900 shadow-xs' : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'}`}
                >
                  <p className="text-xs font-bold">Morador ➔ Terceiro</p>
                </button>

                <button
                  type="button"
                  onClick={() => setFluxo('T-M')}
                  className={`p-2.5 rounded-lg border text-center transition cursor-pointer font-bold ${fluxo === 'T-M' ? 'bg-slate-900 text-white border-slate-900 shadow-xs' : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'}`}
                >
                  <p className="text-xs font-bold">Terceiro ➔ Morador</p>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div className="space-y-2">
                <h4 className="font-bold text-[11px] uppercase text-slate-700 border-b pb-1 flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-emerald-600" /> Origem (Quem Deixou o Objeto)
                </h4>

                {fluxo.startsWith('M') ? (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 uppercase">
                          {rotuloUnidade} *
                        </label>
                        <input
                          type="text"
                          required
                          value={origemUnidade}
                          onChange={(e) => {
                            selecionarOrigemMorador(e.target.value, origemBloco);
                          }}
                          placeholder={eEstruturaCasas ? "Ex: 01 ou 24" : "Ex: 101"}
                          className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 uppercase">
                          {rotuloBloco}
                        </label>
                        {eEstruturaCasas ? (
                          <div className="w-full p-2 bg-emerald-50 border border-emerald-300 rounded-lg text-emerald-950 text-xs font-black flex items-center justify-between">
                            <span>🏠 Casa</span>
                            <span className="text-[9px] bg-emerald-200 text-emerald-900 px-1.5 py-0.5 rounded font-bold uppercase">Automático</span>
                          </div>
                        ) : (
                          <select
                            value={origemBloco}
                            onChange={(e) => {
                              setOrigemBloco(e.target.value);
                              selecionarOrigemMorador(origemUnidade, e.target.value);
                            }}
                            className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-bold"
                          >
                            <option value="">{eEstruturaTorres ? 'Todas / Sem Torre' : 'Todos / Sem Bloco'}</option>
                            {listaBlocos.map((b) => (
                              <option key={b} value={b}>{b}</option>
                            ))}
                          </select>
                        )}
                      </div>
                    </div>

                    {moradoresOrigemFiltrados.length > 0 && (
                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-emerald-800 uppercase">
                          Moradores da {eEstruturaCasas ? 'Casa' : 'Unidade'} {origemUnidade}:
                        </label>
                        <div className="flex flex-wrap gap-1">
                          {moradoresOrigemFiltrados.map((m) => (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => {
                                setOrigemNome(m.nome);
                                if (m.telefone) setOrigemWhats(m.telefone);
                              }}
                              className="px-2 py-0.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 rounded text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
                            >
                              👤 {m.nome}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase">Nome do Morador *</label>
                      <input
                        type="text"
                        required
                        value={origemNome}
                        onChange={(e) => setOrigemNome(e.target.value)}
                        placeholder="Nome do morador"
                        className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs"
                      />
                    </div>
                  </>
                ) : (
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase">Nome / Empresa do Terceiro *</label>
                    <input
                      type="text"
                      required
                      value={origemNome}
                      onChange={(e) => setOrigemNome(e.target.value)}
                      placeholder="Ex: Farmácia Drogasil / Entregador João"
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase">WhatsApp para Contato</label>
                  <input
                    type="text"
                    value={origemWhats}
                    onChange={(e) => setOrigemWhats(e.target.value)}
                    placeholder="Ex: 11940609960"
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-bold text-xs uppercase text-slate-700 border-b pb-2 flex items-center gap-1.5">
                  <User className="w-4 h-4 text-blue-600" /> Destino (Quem Vai Retirar)
                </h4>

                {fluxo.endsWith('M') ? (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 uppercase">
                          {rotuloUnidade} *
                        </label>
                        <input
                          type="text"
                          required
                          value={destinoUnidade}
                          onChange={(e) => {
                            selecionarDestinoMorador(e.target.value, destinoBloco);
                          }}
                          placeholder={eEstruturaCasas ? "Ex: 01 ou 24" : "Ex: 101"}
                          className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-xs font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 uppercase">
                          {rotuloBloco}
                        </label>
                        {eEstruturaCasas ? (
                          <div className="w-full p-2 bg-emerald-50 border border-emerald-300 rounded-lg text-emerald-950 text-xs font-black flex items-center justify-between">
                            <span>🏠 Casa</span>
                            <span className="text-[9px] bg-emerald-200 text-emerald-900 px-1.5 py-0.5 rounded font-bold uppercase">Automático</span>
                          </div>
                        ) : (
                          <select
                            value={destinoBloco}
                            onChange={(e) => {
                              setDestinoBloco(e.target.value);
                              selecionarDestinoMorador(destinoUnidade, e.target.value);
                            }}
                            className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-xs font-bold"
                          >
                            <option value="">{eEstruturaTorres ? 'Todas / Sem Torre' : 'Todos / Sem Bloco'}</option>
                            {listaBlocos.map((b) => (
                              <option key={b} value={b}>{b}</option>
                            ))}
                          </select>
                        )}
                      </div>
                    </div>

                    {moradoresDestinoFiltrados.length > 0 && (
                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-blue-800 uppercase">
                          Moradores do Ap. {destinoUnidade}:
                        </label>
                        <div className="flex flex-wrap gap-1">
                          {moradoresDestinoFiltrados.map((m) => (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => {
                                setDestinoNome(m.nome);
                                if (m.telefone) setDestinoWhats(m.telefone);
                              }}
                              className="px-2 py-0.5 bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-300 rounded text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
                            >
                              👤 {m.nome}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase">Nome do Morador Destinatário *</label>
                      <input
                        type="text"
                        required
                        value={destinoNome}
                        onChange={(e) => setDestinoNome(e.target.value)}
                        placeholder="Nome do destinatário"
                        className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-xs"
                      />
                    </div>
                  </>
                ) : (
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase">Nome / Documento do Terceiro *</label>
                    <input
                      type="text"
                      required
                      value={destinoNome}
                      onChange={(e) => setDestinoNome(e.target.value)}
                      placeholder="Ex: Técnico Enel / Maria da Limpeza"
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-xs"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase">WhatsApp para Notificação</label>
                  <input
                    type="text"
                    value={destinoWhats}
                    onChange={(e) => setDestinoWhats(e.target.value)}
                    placeholder="Ex: 11940609960"
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-xs"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Descrição do Objeto em Custódia *</label>
                <input
                  type="text"
                  required
                  value={descricaoItem}
                  onChange={(e) => setDescricaoItem(e.target.value)}
                  placeholder="Ex: Molho de chaves do portão social, envelope pardo, capacete preto..."
                  className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase">Foto Obrigatória do Objeto Retido *</label>
                <label className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 px-4 rounded-xl cursor-pointer flex items-center justify-center gap-2 transition text-xs shadow-sm">
                  <Camera className="w-5 h-5 text-emerald-400" />
                  {uploadingFoto ? 'Processando foto...' : '📷 Tirar Foto do Objeto Guardado'}
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={(e) => uploadFotoStorage(e.target.files ? e.target.files[0] : null, 'custodia_entrada', setFotoEntradaUrl)}
                    className="hidden"
                    disabled={uploadingFoto}
                  />
                </label>

                {fotoEntradaUrl && (
                  <div className="mt-2 relative w-28 h-28 rounded-lg overflow-hidden border-2 border-emerald-500 shadow-sm">
                    <img src={fotoEntradaUrl} alt="Objeto Guardado" loading="lazy" decoding="async" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || uploadingFoto}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-xl transition shadow-md uppercase text-sm"
            >
              Confirmar Entrada e Guardar Objeto
            </button>
          </form>

          {whatsEntradaLink && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2 max-w-4xl">
              <p className="text-xs font-bold text-emerald-900">
                Custódia {whatsEntradaLink.codigo} registrada! Notifique o destinatário no WhatsApp:
              </p>
              <a
                href={whatsEntradaLink.link}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 bg-emerald-600 text-white text-xs font-bold px-4 py-2.5 rounded-lg hover:bg-emerald-700 transition"
              >
                <MessageCircle className="w-4 h-4" /> Enviar Notificação de Guarda no WhatsApp <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}
        </div>
      )}

      {aba === 'saida' && (
        <div className="bg-white p-3 sm:p-4 rounded-xl shadow-2xs border border-slate-200 space-y-3">
          <div className="border-b pb-2">
            <h3 className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-1.5">
              <PackageCheck className="w-4 h-4 text-blue-600" /> Devolução de Objeto em Custódia
            </h3>
            <p className="text-[11px] text-slate-500">
              Localize o item na portaria e registre a retirada colhendo a foto e nome de quem recebeu.
            </p>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={buscaTermo}
              onChange={(e) => setBuscaTermo(e.target.value)}
              placeholder="Buscar por código, unidade, nome do morador ou descrição..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-xs outline-none focus:ring-1 focus:ring-slate-900"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {itensFiltradosSaida.map((item: any) => (
              <div
                key={item.id}
                onClick={() => setItemSelecionadoSaida(item)}
                className={`p-2.5 rounded-lg border cursor-pointer transition space-y-2 ${
                  itemSelecionadoSaida?.id === item.id 
                    ? 'border-blue-600 bg-blue-50/50 ring-1 ring-blue-600' 
                    : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                }`}
              >
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <span className="text-[10px] font-bold font-mono bg-slate-900 text-white px-1.5 py-0.2 rounded">
                      {item.codigo_custodia}
                    </span>
                    <h4 className="font-bold text-xs text-slate-900 mt-0.5">{item.descricao}</h4>
                  </div>
                  {item.foto_entrada_url && (
                    <img src={item.foto_entrada_url} alt="Objeto" loading="lazy" decoding="async" className="w-10 h-10 rounded-md object-cover border shrink-0" />
                  )}
                </div>

                <div className="text-[11px] text-slate-600 space-y-0.5 bg-white p-2 rounded-md border border-slate-200">
                  <p className="truncate">
                    <span className="font-bold text-slate-800">De:</span> {item.origem_nome_doc} {item.origem_unidade ? `(Ap. ${item.origem_unidade})` : ''}
                  </p>
                  <p className="truncate">
                    <span className="font-bold text-slate-800">Para:</span> {item.destino_nome_doc} {item.destino_unidade ? `(Ap. ${item.destino_unidade})` : ''}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1 font-mono">
                    <Clock className="w-2.5 h-2.5" /> {new Date(item.data_hora_entrada || item.created_at).toLocaleString('pt-BR')}
                  </p>
                </div>
              </div>
            ))}

            {itensFiltradosSaida.length === 0 && (
              <div className="col-span-full text-center py-6 text-slate-500 text-xs italic">
                Nenhum objeto aguardando retirada no momento.
              </div>
            )}
          </div>

          {itemSelecionadoSaida && (
            <form onSubmit={efetivarSaidaCustodia} className="p-3 sm:p-3.5 bg-slate-900 text-white rounded-xl space-y-2.5 max-w-2xl shadow-2xs animate-in fade-in border border-slate-800">
              <div className="flex justify-between items-center border-b border-slate-800 pb-1.5">
                <h4 className="font-bold text-xs sm:text-sm text-emerald-400 flex items-center gap-1.5">
                  <PackageCheck className="w-4 h-4 text-emerald-400" />
                  Retirada: {itemSelecionadoSaida.codigo_custodia} ({itemSelecionadoSaida.descricao})
                </h4>
                <button
                  type="button"
                  onClick={() => setItemSelecionadoSaida(null)}
                  className="text-slate-400 hover:text-white p-1 text-xs cursor-pointer"
                >
                  Cancelar
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold uppercase mb-0.5 text-slate-300">Nome de Quem Retirou *</label>
                  <input
                    type="text"
                    required
                    value={recebedorNome}
                    onChange={(e) => setRecebedorNome(e.target.value)}
                    placeholder="Ex: Maria (Própria Moradora)"
                    className="w-full p-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs font-medium focus:border-emerald-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase mb-0.5 text-slate-300">Documento / RG (Opcional)</label>
                  <input
                    type="text"
                    value={recebedorDoc}
                    onChange={(e) => setRecebedorDoc(e.target.value)}
                    placeholder="Ex: 12.345.678-9"
                    className="w-full p-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs font-mono focus:border-emerald-500 transition"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold uppercase text-slate-300">Foto do Retirante com o Objeto *</label>
                <label className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-2 px-3 rounded-lg cursor-pointer flex items-center justify-center gap-1.5 transition text-xs border border-slate-700 shadow-2xs">
                  <Camera className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{uploadingFoto ? 'Salvando comprovante...' : '📷 Tirar Foto da Devolução / Retirante'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={(e) => uploadFotoStorage(e.target.files ? e.target.files[0] : null, 'custodia_saida', setFotoSaidaUrl)}
                    className="hidden"
                    disabled={uploadingFoto}
                  />
                </label>

                {fotoSaidaUrl && (
                  <div className="mt-1 relative w-16 h-16 rounded-lg overflow-hidden border border-emerald-400 shadow-2xs">
                    <img src={fotoSaidaUrl} alt="Foto Retirada" loading="lazy" decoding="async" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || uploadingFoto}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 rounded-lg transition shadow-2xs uppercase text-xs cursor-pointer"
              >
                Efetivar Baixa de Devolução
              </button>
            </form>
          )}

          {whatsSaidaLink && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2 max-w-2xl">
              <p className="text-xs font-bold text-emerald-900">
                Devolução concluída! Notifique quem deixou o objeto sobre a entrega:
              </p>
              <a
                href={whatsSaidaLink.link}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 bg-emerald-600 text-white text-xs font-bold px-4 py-2.5 rounded-lg hover:bg-emerald-700 transition"
              >
                <MessageCircle className="w-4 h-4" /> Enviar Confirmação de Entrega no WhatsApp <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* FLUXO 3: AUDITORIA & HISTÓRICO COMPLETO DE ITENS DE CUSTÓDIA              */}
      {/* ========================================================================= */}
      {aba === 'auditoria' && (
        <div className="bg-white p-3 sm:p-4 rounded-xl shadow-2xs border border-slate-200 space-y-4 animate-fade-in">
          {/* Header da Auditoria */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b pb-3">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider bg-purple-100 text-purple-800 px-2.5 py-0.5 rounded-full flex items-center gap-1.5 w-fit">
                <ShieldCheck className="w-3.5 h-3.5 text-purple-600" /> Auditoria & Dossiê de Custódia
              </span>
              <h3 className="font-bold text-slate-900 text-sm sm:text-base mt-1 flex items-center gap-2">
                <History className="w-4 h-4 text-purple-600" />
                Histórico Pericial de Custódia na Portaria
              </h3>
              <p className="text-xs text-slate-500">
                Cadeia de custódia irrefutável com fotos de entrada, comprovantes de devolução, operadores e horários.
              </p>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={carregarDados}
                className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition cursor-pointer text-xs font-bold flex items-center gap-1.5"
                title="Atualizar Dados"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-purple-600' : ''}`} />
                <span className="hidden sm:inline">Atualizar</span>
              </button>

              <button
                type="button"
                onClick={() => exportarCSVCustodia(itensAuditoriaFiltrados)}
                disabled={itensAuditoriaFiltrados.length === 0}
                className="flex-1 sm:flex-initial px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition cursor-pointer text-xs font-black flex items-center justify-center gap-1.5 shadow-2xs disabled:opacity-50"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Exportar Planilha CSV</span>
              </button>
            </div>
          </div>

          {/* Cards de Métricas / Resumo */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              <span className="text-[10px] font-bold uppercase text-slate-500 block">Total de Objetos</span>
              <div className="text-xl sm:text-2xl font-black text-slate-900">{metricasAuditoria.total}</div>
              <p className="text-[10px] text-slate-400">Registrados na base</p>
            </div>

            <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-xl space-y-1">
              <span className="text-[10px] font-bold uppercase text-amber-800 block flex items-center gap-1">
                <Clock className="w-3 h-3 text-amber-600" /> Em Custódia (Guarda)
              </span>
              <div className="text-xl sm:text-2xl font-black text-amber-900">{metricasAuditoria.aguardando}</div>
              <p className="text-[10px] text-amber-700 font-semibold">Aguardando retirada</p>
            </div>

            <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-xl space-y-1">
              <span className="text-[10px] font-bold uppercase text-emerald-800 block flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Já Devolvidos
              </span>
              <div className="text-xl sm:text-2xl font-black text-emerald-900">{metricasAuditoria.retirados}</div>
              <p className="text-[10px] text-emerald-700 font-semibold">Baixas efetivadas</p>
            </div>

            <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-xl space-y-1">
              <span className="text-[10px] font-bold uppercase text-blue-800 block flex items-center gap-1">
                <Calendar className="w-3 h-3 text-blue-600" /> Devolvidos Hoje
              </span>
              <div className="text-xl sm:text-2xl font-black text-blue-900">{metricasAuditoria.retiradosHoje}</div>
              <p className="text-[10px] text-blue-700 font-semibold">Entregas no plantão</p>
            </div>
          </div>

          {/* Barra de Pesquisa e Filtros */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={buscaAuditoria}
                onChange={(e) => setBuscaAuditoria(e.target.value)}
                placeholder="Pesquisar por código (CUST-...), descrição, morador, unidade, documento, retirante ou operador..."
                className="w-full pl-9 pr-8 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 font-medium focus:ring-1 focus:ring-purple-600 focus:outline-none"
              />
              {buscaAuditoria && (
                <button
                  type="button"
                  onClick={() => setBuscaAuditoria('')}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-700 text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Linha de Filtros por Botões */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-200 text-xs">
              {/* Filtro Status */}
              <div className="flex flex-wrap items-center gap-1">
                <span className="text-[10px] font-bold uppercase text-slate-500 mr-1 flex items-center gap-1">
                  <Filter className="w-3 h-3" /> Status:
                </span>
                <button
                  type="button"
                  onClick={() => setFiltroStatusAuditoria('todos')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    filtroStatusAuditoria === 'todos' ? 'bg-purple-900 text-white shadow-xs' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Todos ({historicoCompleto.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFiltroStatusAuditoria('aguardando')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    filtroStatusAuditoria === 'aguardando' ? 'bg-amber-600 text-white shadow-xs' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  🟡 Em Guarda ({metricasAuditoria.aguardando})
                </button>
                <button
                  type="button"
                  onClick={() => setFiltroStatusAuditoria('retirado')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    filtroStatusAuditoria === 'retirado' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  🟢 Devolvidos ({metricasAuditoria.retirados})
                </button>
              </div>

              {/* Filtro Fluxo */}
              <div className="flex flex-wrap items-center gap-1">
                <span className="text-[10px] font-bold uppercase text-slate-500 mr-1">Fluxo:</span>
                <button
                  type="button"
                  onClick={() => setFiltroFluxoAuditoria('todos')}
                  className={`px-2 py-0.5 rounded text-[11px] font-bold transition cursor-pointer ${
                    filtroFluxoAuditoria === 'todos' ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 border border-slate-200'
                  }`}
                >
                  Todos
                </button>
                <button
                  type="button"
                  onClick={() => setFiltroFluxoAuditoria('M-M')}
                  className={`px-2 py-0.5 rounded text-[11px] font-bold transition cursor-pointer ${
                    filtroFluxoAuditoria === 'M-M' ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 border border-slate-200'
                  }`}
                >
                  Morador ➔ Morador
                </button>
                <button
                  type="button"
                  onClick={() => setFiltroFluxoAuditoria('M-T')}
                  className={`px-2 py-0.5 rounded text-[11px] font-bold transition cursor-pointer ${
                    filtroFluxoAuditoria === 'M-T' ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 border border-slate-200'
                  }`}
                >
                  Morador ➔ Terceiro
                </button>
                <button
                  type="button"
                  onClick={() => setFiltroFluxoAuditoria('T-M')}
                  className={`px-2 py-0.5 rounded text-[11px] font-bold transition cursor-pointer ${
                    filtroFluxoAuditoria === 'T-M' ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 border border-slate-200'
                  }`}
                >
                  Terceiro ➔ Morador
                </button>
              </div>

              {/* Filtro Período */}
              <div className="flex items-center gap-1">
                <span className="text-[10px] font-bold uppercase text-slate-500 mr-1 flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> Período:
                </span>
                {(['todos', 'hoje', '7dias', '30dias'] as const).map((per) => (
                  <button
                    key={per}
                    type="button"
                    onClick={() => setFiltroPeriodoAuditoria(per)}
                    className={`px-2 py-0.5 rounded text-[11px] font-bold transition cursor-pointer ${
                      filtroPeriodoAuditoria === per ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {per === 'todos' ? 'Todos' : per === 'hoje' ? 'Hoje' : per === '7dias' ? '7 dias' : '30 dias'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Listagem de Cards de Auditoria */}
          {loading ? (
            <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200 text-slate-500 text-xs flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-purple-600" /> Carregando registros de custódia e comprovantes...
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs text-slate-500 px-1">
                <span>Exibindo <strong>{itensAuditoriaFiltrados.length}</strong> de {historicoCompleto.length} registros</span>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
                {itensAuditoriaFiltrados.map((item) => {
                  const estaRetirado = (item.status || '').toLowerCase() === 'retirado';
                  const permanencia = calcularPermanencia(item.created_at || item.data_hora_entrada, item.data_hora_saida);

                  return (
                    <div
                      key={item.id}
                      className={`bg-white rounded-2xl border p-3.5 shadow-2xs space-y-3 transition flex flex-col justify-between ${
                        estaRetirado ? 'border-slate-200 hover:border-slate-300' : 'border-amber-300 bg-amber-50/20 hover:border-amber-400'
                      }`}
                    >
                      {/* Cabeçalho do Card */}
                      <div className="space-y-2 border-b border-slate-100 pb-2.5">
                        <div className="flex items-start justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-black text-xs bg-slate-900 text-white px-2 py-0.5 rounded tracking-wider shadow-2xs">
                              {item.codigo_custodia || 'CUST-PORTARIA'}
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-slate-100 text-slate-700 border-slate-300">
                              {item.fluxo === 'M-M' ? 'Morador ➔ Morador' : item.fluxo === 'M-T' ? 'Morador ➔ Terceiro' : 'Terceiro ➔ Morador'}
                            </span>
                          </div>

                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase flex items-center gap-1 ${
                            estaRetirado 
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                              : 'bg-amber-100 text-amber-900 border border-amber-300'
                          }`}>
                            {estaRetirado ? <CheckCircle2 className="w-3 h-3 text-emerald-600" /> : <Clock className="w-3 h-3 text-amber-600" />}
                            {estaRetirado ? 'Devolvido / Retirado' : 'Em Guarda (Portaria)'}
                          </span>
                        </div>

                        {/* Descrição do Objeto */}
                        <div className="pt-0.5">
                          <h4 className="font-black text-slate-900 text-sm">
                            📦 {item.descricao}
                          </h4>
                          <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono mt-0.5">
                            <Clock className="w-3 h-3 text-slate-400" />
                            <span>Permanência: <strong>{permanencia}</strong></span>
                          </div>
                        </div>
                      </div>

                      {/* Bloco de Informações: Origem e Destino */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        {/* Origem */}
                        <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                          <span className="text-[9px] font-black uppercase text-slate-500 block flex items-center gap-1">
                            <User className="w-3 h-3 text-emerald-600" /> Quem Deixou (Origem)
                          </span>
                          <p className="font-bold text-slate-900 truncate">
                            {item.origem_nome_doc || 'Não informado'}
                          </p>
                          <p className="text-[11px] text-slate-600">
                            {item.origem_unidade ? formatarIdentificacaoUnidade(item.origem_unidade, item.origem_bloco, condoConfig?.tipo_estrutura) : item.origem_tipo || 'Externo'}
                          </p>
                          {item.origem_whats && (
                            <p className="text-[10px] text-slate-500 font-mono">
                              📱 {item.origem_whats}
                            </p>
                          )}
                          <div className="pt-1 border-t border-slate-200/80 text-[10px] text-slate-500">
                            <span>Entrada: <strong>{new Date(item.created_at || item.data_hora_entrada).toLocaleString('pt-BR')}</strong></span>
                            <span className="block text-[9px] text-slate-400">Por: {item.operador_entrada || 'Portaria'}</span>
                          </div>
                        </div>

                        {/* Destino */}
                        <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                          <span className="text-[9px] font-black uppercase text-slate-500 block flex items-center gap-1">
                            <ArrowRight className="w-3 h-3 text-blue-600" /> Destinatário Autorizado
                          </span>
                          <p className="font-bold text-slate-900 truncate">
                            {item.destino_nome_doc || 'Não informado'}
                          </p>
                          <p className="text-[11px] text-slate-600">
                            {item.destino_unidade ? formatarIdentificacaoUnidade(item.destino_unidade, item.destino_bloco, condoConfig?.tipo_estrutura) : item.destino_tipo || 'Terceiro'}
                          </p>
                          {item.destino_whats && (
                            <p className="text-[10px] text-slate-500 font-mono">
                              📱 {item.destino_whats}
                            </p>
                          )}
                          <div className="pt-1 border-t border-slate-200/80 text-[10px] text-slate-500">
                            {estaRetirado ? (
                              <>
                                <span className="text-emerald-700 font-bold">Retirado em: {new Date(item.data_hora_saida).toLocaleString('pt-BR')}</span>
                                <span className="block text-[9px] text-slate-500">Por: {item.recebedor_nome} {item.recebedor_doc ? `(${item.recebedor_doc})` : ''}</span>
                              </>
                            ) : (
                              <span className="text-amber-800 font-semibold italic">Aguardando comparecimento</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Miniaturas de Fotos com Zoom */}
                      <div className="flex items-center gap-2 pt-1">
                        {item.foto_entrada_url && (
                          <div 
                            onClick={() => setFotoAmpliadaModal({ url: item.foto_entrada_url, titulo: `Foto do Objeto: ${item.codigo_custodia}` })}
                            className="relative group cursor-pointer w-14 h-14 rounded-lg overflow-hidden border border-slate-300 hover:border-purple-500 shrink-0"
                            title="Clique para ampliar foto de entrada"
                          >
                            <img src={item.foto_entrada_url} alt="Entrada" loading="lazy" decoding="async" className="w-full h-full object-cover group-hover:scale-105 transition" />
                            <span className="absolute bottom-0 inset-x-0 bg-black/60 text-[8px] text-white text-center py-0.5 font-bold">
                              Entrada
                            </span>
                          </div>
                        )}

                        {item.foto_saida_url && (
                          <div 
                            onClick={() => setFotoAmpliadaModal({ url: item.foto_saida_url, titulo: `Comprovante de Devolução: ${item.codigo_custodia}` })}
                            className="relative group cursor-pointer w-14 h-14 rounded-lg overflow-hidden border border-emerald-400 hover:border-emerald-600 shrink-0"
                            title="Clique para ampliar comprovante de retirada"
                          >
                            <img src={item.foto_saida_url} alt="Saída" loading="lazy" decoding="async" className="w-full h-full object-cover group-hover:scale-105 transition" />
                            <span className="absolute bottom-0 inset-x-0 bg-emerald-900/80 text-[8px] text-white text-center py-0.5 font-bold">
                              Baixa
                            </span>
                          </div>
                        )}

                        <div className="flex-1 text-[11px] text-slate-500 pl-1">
                          <p className="font-semibold text-slate-700">Evidências Fotográficas:</p>
                          <p className="text-[10px] text-slate-400">
                            {item.foto_entrada_url && item.foto_saida_url 
                              ? 'Foto de guarda e entrega anexadas' 
                              : item.foto_entrada_url 
                              ? 'Foto de guarda anexada' 
                              : 'Sem foto anexada'}
                          </p>
                        </div>
                      </div>

                      {/* Ações no Rodapé do Card */}
                      <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => setItemDossieModal(item)}
                          className="flex-1 py-2 px-3 bg-purple-50 hover:bg-purple-100 text-purple-900 rounded-xl text-xs font-black transition cursor-pointer flex items-center justify-center gap-1.5 border border-purple-200"
                        >
                          <Eye className="w-3.5 h-3.5 text-purple-700" />
                          <span>Ver Dossiê Completo</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            const tel = (item.destino_whats || item.origem_whats || '').replace(/\D/g, '');
                            const textoDossie = `📋 *DOSSIÊ DE AUDITORIA DE CUSTÓDIA - INFPORT*\n` +
                              `Código: ${item.codigo_custodia}\n` +
                              `Item: ${item.descricao}\n` +
                              `Status: ${estaRetirado ? 'RETIRADO / DEVOLVIDO' : 'EM GUARDA NA PORTARIA'}\n` +
                              `De: ${item.origem_nome_doc} ${item.origem_unidade ? '(Ap. ' + item.origem_unidade + ')' : ''}\n` +
                              `Para: ${item.destino_nome_doc} ${item.destino_unidade ? '(Ap. ' + item.destino_unidade + ')' : ''}\n` +
                              `Entrada: ${new Date(item.created_at || item.data_hora_entrada).toLocaleString('pt-BR')} por ${item.operador_entrada || 'Portaria'}\n` +
                              (estaRetirado ? `Devolvido em: ${new Date(item.data_hora_saida).toLocaleString('pt-BR')} para ${item.recebedor_nome} (Doc: ${item.recebedor_doc || 'N/I'}) por ${item.operador_saida}\n` : '') +
                              `Foto Entrada: ${item.foto_entrada_url || 'N/A'}\n` +
                              (item.foto_saida_url ? `Foto Comprovante: ${item.foto_saida_url}\n` : '');

                            const link = tel ? `https://wa.me/55${tel}?text=${encodeURIComponent(textoDossie)}` : `https://wa.me/?text=${encodeURIComponent(textoDossie)}`;
                            window.open(link, '_blank');
                          }}
                          className="p-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl transition cursor-pointer border border-emerald-200"
                          title="Enviar Dossiê via WhatsApp"
                        >
                          <MessageCircle className="w-4 h-4 text-emerald-600" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {itensAuditoriaFiltrados.length === 0 && (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 text-slate-500 text-xs space-y-2">
                  <p className="font-bold text-slate-700">Nenhum registro encontrado para os filtros selecionados.</p>
                  <p className="text-[11px] text-slate-400">Tente ajustar o termo de pesquisa ou o filtro de período e status.</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL DE DOSSIÊ COMPLETO DE AUDITORIA (CUSTÓDIA)                          */}
      {/* ========================================================================= */}
      {itemDossieModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fade-in overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4 my-8 relative">
            {/* Topo do Modal */}
            <div className="flex items-center justify-between border-b pb-3 border-slate-100">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-purple-100 text-purple-800 rounded-xl">
                  <FileText className="w-5 h-5 text-purple-700" />
                </span>
                <div>
                  <h3 className="font-black text-slate-900 text-base">
                    Dossiê Pericial de Custódia
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">
                    {itemDossieModal.codigo_custodia}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setItemDossieModal(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Status e Descrição */}
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase text-slate-500">Objeto em Custódia</span>
                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                  (itemDossieModal.status || '').toLowerCase() === 'retirado'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-900'
                }`}>
                  {itemDossieModal.status}
                </span>
              </div>
              <h4 className="font-black text-slate-900 text-sm sm:text-base">
                {itemDossieModal.descricao}
              </h4>
              <p className="text-[11px] text-slate-600">
                Fluxo: <strong>{itemDossieModal.fluxo === 'M-M' ? 'Morador ➔ Morador' : itemDossieModal.fluxo === 'M-T' ? 'Morador ➔ Terceiro' : 'Terceiro ➔ Morador'}</strong> • Permanência: <strong>{calcularPermanencia(itemDossieModal.created_at || itemDossieModal.data_hora_entrada, itemDossieModal.data_hora_saida)}</strong>
              </p>
            </div>

            {/* Linha do Tempo da Cadeia de Custódia */}
            <div className="space-y-3">
              <h5 className="text-xs font-black uppercase text-slate-700 tracking-wider">
                Linha do Tempo da Cadeia de Responsabilidade
              </h5>

              {/* Etapa 1: Entrada */}
              <div className="flex gap-3 items-start">
                <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 font-bold text-xs mt-0.5">
                  1
                </div>
                <div className="flex-1 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-900">Entrada e Recebimento na Guarita</span>
                    <span className="text-[10px] font-mono text-slate-500">
                      {new Date(itemDossieModal.created_at || itemDossieModal.data_hora_entrada).toLocaleString('pt-BR')}
                    </span>
                  </div>
                  <p><strong>Entregue por:</strong> {itemDossieModal.origem_nome_doc} {itemDossieModal.origem_unidade ? `(${formatarIdentificacaoUnidade(itemDossieModal.origem_unidade, itemDossieModal.origem_bloco, condoConfig?.tipo_estrutura)})` : ''}</p>
                  <p><strong>Destinatário Previsto:</strong> {itemDossieModal.destino_nome_doc} {itemDossieModal.destino_unidade ? `(${formatarIdentificacaoUnidade(itemDossieModal.destino_unidade, itemDossieModal.destino_bloco, condoConfig?.tipo_estrutura)})` : ''}</p>
                  <p className="text-[10px] text-slate-500">Operador Responsável: <strong>{itemDossieModal.operador_entrada || 'Portaria'}</strong></p>
                </div>
              </div>

              {/* Etapa 2: Saída / Devolução */}
              <div className="flex gap-3 items-start">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 font-bold text-xs mt-0.5 ${
                  (itemDossieModal.status || '').toLowerCase() === 'retirado'
                    ? 'bg-purple-100 text-purple-700'
                    : 'bg-slate-200 text-slate-500'
                }`}>
                  2
                </div>
                <div className="flex-1 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-900">Baixa e Devolução do Objeto</span>
                    <span className="text-[10px] font-mono text-slate-500">
                      {itemDossieModal.data_hora_saida ? new Date(itemDossieModal.data_hora_saida).toLocaleString('pt-BR') : 'Pendente'}
                    </span>
                  </div>
                  {(itemDossieModal.status || '').toLowerCase() === 'retirado' ? (
                    <>
                      <p><strong>Retirado por:</strong> {itemDossieModal.recebedor_nome} {itemDossieModal.recebedor_doc ? `(Doc: ${itemDossieModal.recebedor_doc})` : ''}</p>
                      <p className="text-[10px] text-slate-500">Operador da Baixa: <strong>{itemDossieModal.operador_saida || 'Portaria'}</strong></p>
                    </>
                  ) : (
                    <p className="text-amber-800 italic text-[11px]">Objeto ainda em custódia na portaria aguardando a retirada.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Fotos Ampliadas no Dossiê */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <span className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Foto Entrada:</span>
                {itemDossieModal.foto_entrada_url ? (
                  <div 
                    onClick={() => setFotoAmpliadaModal({ url: itemDossieModal.foto_entrada_url, titulo: `Foto de Entrada: ${itemDossieModal.codigo_custodia}` })}
                    className="h-28 rounded-xl overflow-hidden border border-slate-300 cursor-pointer hover:opacity-90"
                  >
                    <img src={itemDossieModal.foto_entrada_url} alt="Entrada" loading="lazy" decoding="async" className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="h-28 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 text-xs italic">
                    Sem foto
                  </div>
                )}
              </div>

              <div>
                <span className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Foto Devolução / Retirante:</span>
                {itemDossieModal.foto_saida_url ? (
                  <div 
                    onClick={() => setFotoAmpliadaModal({ url: itemDossieModal.foto_saida_url, titulo: `Comprovante de Devolução: ${itemDossieModal.codigo_custodia}` })}
                    className="h-28 rounded-xl overflow-hidden border border-emerald-400 cursor-pointer hover:opacity-90"
                  >
                    <img src={itemDossieModal.foto_saida_url} alt="Saída" loading="lazy" decoding="async" className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="h-28 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 text-xs italic">
                    Ainda não devolvido
                  </div>
                )}
              </div>
            </div>

            {/* Ações do Dossiê */}
            <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  const textoDossie = `📋 *DOSSIÊ DE AUDITORIA DE CUSTÓDIA - INFPORT*\n` +
                    `Código: ${itemDossieModal.codigo_custodia}\n` +
                    `Item: ${itemDossieModal.descricao}\n` +
                    `Status: ${itemDossieModal.status}\n` +
                    `De: ${itemDossieModal.origem_nome_doc} ${itemDossieModal.origem_unidade ? '(Ap. ' + itemDossieModal.origem_unidade + ')' : ''}\n` +
                    `Para: ${itemDossieModal.destino_nome_doc} ${itemDossieModal.destino_unidade ? '(Ap. ' + itemDossieModal.destino_unidade + ')' : ''}\n` +
                    `Entrada: ${new Date(itemDossieModal.created_at || itemDossieModal.data_hora_entrada).toLocaleString('pt-BR')} por ${itemDossieModal.operador_entrada || 'Portaria'}\n` +
                    (itemDossieModal.status?.toLowerCase() === 'retirado' ? `Devolvido em: ${new Date(itemDossieModal.data_hora_saida).toLocaleString('pt-BR')} para ${itemDossieModal.recebedor_nome} (Doc: ${itemDossieModal.recebedor_doc || 'N/I'}) por ${itemDossieModal.operador_saida}\n` : '') +
                    `Foto Entrada: ${itemDossieModal.foto_entrada_url || 'N/A'}\n` +
                    (itemDossieModal.foto_saida_url ? `Foto Comprovante: ${itemDossieModal.foto_saida_url}\n` : '');

                  navigator.clipboard.writeText(textoDossie);
                  setCopiadoDossie(true);
                  setTimeout(() => setCopiadoDossie(false), 3000);
                }}
                className="flex-1 py-2.5 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                {copiadoDossie ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>{copiadoDossie ? 'Dossiê Copiado!' : 'Copiar Dossiê Pericial'}</span>
              </button>

              <button
                type="button"
                onClick={() => setItemDossieModal(null)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL DE FOTO EM ALTA RESOLUÇÃO                                           */}
      {/* ========================================================================= */}
      {fotoAmpliadaModal && (
        <div 
          onClick={() => setFotoAmpliadaModal(null)}
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-4 space-y-3 overflow-hidden shadow-2xl relative"
          >
            <div className="flex items-center justify-between text-white border-b border-slate-800 pb-2">
              <h4 className="font-bold text-xs sm:text-sm text-slate-200">
                {fotoAmpliadaModal.titulo}
              </h4>
              <button
                type="button"
                onClick={() => setFotoAmpliadaModal(null)}
                className="text-slate-400 hover:text-white p-1 text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="max-h-[75vh] flex items-center justify-center overflow-hidden rounded-xl bg-black">
              <img 
                src={fotoAmpliadaModal.url} 
                alt="Comprovante em Alta Resolução" 
                loading="lazy" 
                decoding="async" 
                className="max-h-[75vh] w-auto object-contain rounded-xl"
              />
            </div>

            <div className="flex justify-between items-center text-[11px] text-slate-400 pt-1">
              <span>Evidência registrada no sistema INFPORT</span>
              <a 
                href={fotoAmpliadaModal.url} 
                target="_blank" 
                rel="noreferrer"
                className="text-emerald-400 hover:underline flex items-center gap-1 font-bold"
              >
                Abrir imagem original <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
