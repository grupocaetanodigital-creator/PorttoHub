import React, { useState, useEffect } from 'react';
import { 
  Scan, 
  Plus, 
  ShieldCheck, 
  CheckCircle2, 
  AlertTriangle, 
  Sliders, 
  FileText, 
  CreditCard, 
  Upload, 
  RotateCw, 
  Eye, 
  Save, 
  RefreshCw, 
  Trash2, 
  Check, 
  Info,
  Maximize2,
  Crosshair,
  Sparkles,
  Layers
} from 'lucide-react';

export interface ZonaDocumento {
  id: string;
  campo: 'nome' | 'cpf' | 'rg' | 'foto' | 'registro' | 'validade' | 'filiacao_bloqueada';
  rotulo: string;
  descricao: string;
  corBorda: string;
  corFundo: string;
  topPct: number;
  leftPct: number;
  widthPct: number;
  heightPct: number;
  exemploValor: string;
  obrigatorio: boolean;
  regraEspecial?: string;
}

export interface ModeloDocumentoConfig {
  id: string;
  nome: string;
  tipo: 'CNH' | 'RG' | 'CIN' | 'CRACHA' | 'OUTRO';
  descricao: string;
  orientacao: 'horizontal' | 'vertical';
  proporcao: string;
  imagemExemploUrl?: string;
  zonas: ZonaDocumento[];
  regrasGlobais: string[];
}

export const MODELOS_DOCUMENTO_PADRAO: ModeloDocumentoConfig[] = [
  {
    id: 'cnh_brasil_oficial',
    nome: 'CNH Oficial (Nova CNH 2022-2026 & Tradicional)',
    tipo: 'CNH',
    descricao: 'Carteira Nacional de Habilitação padrão SENATRAN com campos codificados internacionalmente (2 e 1 Nome, 4d CPF, 4c RG).',
    orientacao: 'horizontal',
    proporcao: '1.586 / 1',
    zonas: [
      {
        id: 'cnh_nome',
        campo: 'nome',
        rotulo: "2 e 1 NOME E SOBRENOME",
        descricao: "Nome completo do titular impresso logo abaixo do rótulo",
        corBorda: 'border-emerald-400',
        corFundo: 'bg-emerald-500/15',
        topPct: 24,
        leftPct: 21,
        widthPct: 60,
        heightPct: 8,
        exemploValor: "LAURINDO CAETANO DO CARMO",
        obrigatorio: true,
        regraEspecial: "Title Case ou Caixa Alta. Descartar cabeçalhos oficiais."
      },
      {
        id: 'cnh_foto',
        campo: 'foto',
        rotulo: "FOTO 3x4 DO TITULAR",
        descricao: "Face do condutor localizada no terço esquerdo após faixa verde",
        corBorda: 'border-purple-400',
        corFundo: 'bg-purple-500/15',
        topPct: 38,
        leftPct: 19,
        widthPct: 24,
        heightPct: 39,
        exemploValor: "[Foto do Rosto Recortada]",
        obrigatorio: true,
        regraEspecial: "Recorte automático centrado no rosto em 240x300px"
      },
      {
        id: 'cnh_rg',
        campo: 'rg',
        rotulo: "4c DOC. IDENTIDADE / ÓRG. EMISSOR / UF",
        descricao: "Número do RG com órgão emissor e UF",
        corBorda: 'border-blue-400',
        corFundo: 'bg-blue-500/15',
        topPct: 49,
        leftPct: 46,
        widthPct: 45,
        heightPct: 6,
        exemploValor: "43048684 SSP/SP",
        obrigatorio: true,
        regraEspecial: "Preserva órgão e estado emissor"
      },
      {
        id: 'cnh_cpf',
        campo: 'cpf',
        rotulo: "4d CPF",
        descricao: "Cadastro de Pessoa Física do condutor",
        corBorda: 'border-emerald-400',
        corFundo: 'bg-emerald-500/20',
        topPct: 56,
        leftPct: 46,
        widthPct: 20,
        heightPct: 7,
        exemploValor: "378.178.748-67",
        obrigatorio: true,
        regraEspecial: "Validação matemática rigorosa Módulo 11 (11 dígitos)"
      },
      {
        id: 'cnh_registro',
        campo: 'registro',
        rotulo: "5 Nº REGISTRO",
        descricao: "Número de registro da CNH (11 dígitos)",
        corBorda: 'border-amber-400',
        corFundo: 'bg-amber-500/15',
        topPct: 56,
        leftPct: 67,
        widthPct: 18,
        heightPct: 7,
        exemploValor: "05947078899",
        obrigatorio: false,
        regraEspecial: "Sequência numérica de 11 dígitos"
      },
      {
        id: 'cnh_validade',
        campo: 'validade',
        rotulo: "4b VALIDADE",
        descricao: "Data de vencimento da CNH",
        corBorda: 'border-indigo-400',
        corFundo: 'bg-indigo-500/15',
        topPct: 41,
        leftPct: 65,
        widthPct: 17,
        heightPct: 7,
        exemploValor: "03/06/2034",
        obrigatorio: false,
        regraEspecial: "Data DD/MM/AAAA (Não confundir com CPF/RG)"
      },
      {
        id: 'cnh_filiacao',
        campo: 'filiacao_bloqueada',
        rotulo: "FILIAÇÃO (ZONA BLOQUEADA)",
        descricao: "Nomes de pai e mãe. Bloqueado para nunca substituir o titular",
        corBorda: 'border-rose-500',
        corFundo: 'bg-rose-500/20',
        topPct: 71,
        leftPct: 46,
        widthPct: 48,
        heightPct: 17,
        exemploValor: "ANTONIO APARECIDO DO CARMO / ROSA FATIMA LOPES CAETANO DO CARMO",
        obrigatorio: false,
        regraEspecial: "REGRA DE OURO: Descarte obrigatório pelo motor de OCR"
      }
    ],
    regrasGlobais: [
      "Ignorar cabeçalhos governamentais ('REPÚBLICA FEDERATIVA DO BRASIL', 'MINISTÉRIO DOS TRANSPORTES')",
      "Interromper extração de nome ao detectar termo 'FILIAÇÃO'",
      "Descartar datas de nascimento ou expedição de campos numéricos de CPF e RG"
    ]
  },
  {
    id: 'rg_brasil_oficial',
    nome: 'RG Oficial (Registro Geral Estadual Verde)',
    tipo: 'RG',
    descricao: 'Carteira de Identidade clássica dos estados brasileiros com impressão em papel moeda verde.',
    orientacao: 'horizontal',
    proporcao: '1.42 / 1',
    zonas: [
      {
        id: 'rg_nome',
        campo: 'nome',
        rotulo: "NOME",
        descricao: "Nome completo do titular abaixo de 'DATA DE EXPEDIÇÃO'",
        corBorda: 'border-emerald-400',
        corFundo: 'bg-emerald-500/15',
        topPct: 35,
        leftPct: 30,
        widthPct: 65,
        heightPct: 10,
        exemploValor: "CARLOS ROBERTO DA SILVA",
        obrigatorio: true,
        regraEspecial: "Nome do titular antes do campo filiação"
      },
      {
        id: 'rg_num',
        campo: 'rg',
        rotulo: "REGISTRO GERAL",
        descricao: "Número oficial de identificação civil do estado",
        corBorda: 'border-blue-400',
        corFundo: 'bg-blue-500/15',
        topPct: 20,
        leftPct: 30,
        widthPct: 45,
        heightPct: 9,
        exemploValor: "43.048.684-X",
        obrigatorio: true,
        regraEspecial: "Dígitos de 7 a 10 com dígito verificador ou X"
      },
      {
        id: 'rg_cpf',
        campo: 'cpf',
        rotulo: "C.P.F.",
        descricao: "Número do CPF impresso no verso do RG",
        corBorda: 'border-emerald-400',
        corFundo: 'bg-emerald-500/20',
        topPct: 75,
        leftPct: 30,
        widthPct: 35,
        heightPct: 9,
        exemploValor: "378.178.748-67",
        obrigatorio: false,
        regraEspecial: "Validação com Módulo 11"
      },
      {
        id: 'rg_foto',
        campo: 'foto',
        rotulo: "FOTO 3x4",
        descricao: "Fotografia impressa no terço esquerdo frontal do RG",
        corBorda: 'border-purple-400',
        corFundo: 'bg-purple-500/15',
        topPct: 22,
        leftPct: 5,
        widthPct: 22,
        heightPct: 50,
        exemploValor: "[Foto do Rosto Recortada]",
        obrigatorio: true,
        regraEspecial: "Recorte 3x4"
      },
      {
        id: 'rg_filiacao',
        campo: 'filiacao_bloqueada',
        rotulo: "FILIAÇÃO (PAI / MÃE)",
        descricao: "Zona de filiação ignorada para proteger o nome do titular",
        corBorda: 'border-rose-500',
        corFundo: 'bg-rose-500/20',
        topPct: 50,
        leftPct: 30,
        widthPct: 65,
        heightPct: 18,
        exemploValor: "JOSE CARLOS DA SILVA / MARIA DE FATIMA DA SILVA",
        obrigatorio: false,
        regraEspecial: "Bloqueio estrito de extração"
      }
    ],
    regrasGlobais: [
      "Ignorar texto 'SECRETARIA DE SEGURANÇA PÚBLICA' e 'INSTITUTO DE IDENTIFICAÇÃO'",
      "Nunca pegar nomes em linhas que contenham 'FILIAÇÃO' ou 'PAI'/'MÃE'",
      "Validar dígitos verificadores do CPF se presente"
    ]
  },
  {
    id: 'cin_unificada',
    nome: 'Nova CIN (Carteira de Identidade Nacional Unificada)',
    tipo: 'CIN',
    descricao: 'Novo documento nacional unificado com CPF como número único de identificação e QR Code.',
    orientacao: 'horizontal',
    proporcao: '1.586 / 1',
    zonas: [
      {
        id: 'cin_nome',
        campo: 'nome',
        rotulo: "NOME / NAME",
        descricao: "Nome em destaque no topo frontal da CIN",
        corBorda: 'border-emerald-400',
        corFundo: 'bg-emerald-500/15',
        topPct: 28,
        leftPct: 28,
        widthPct: 68,
        heightPct: 9,
        exemploValor: "ANA PAULA MENEZES DE SOUZA",
        obrigatorio: true,
        regraEspecial: "Nome completo no topo"
      },
      {
        id: 'cin_cpf',
        campo: 'cpf',
        rotulo: "CPF (REGISTRO GERAL NACIONAL)",
        descricao: "Número único de identificação",
        corBorda: 'border-emerald-400',
        corFundo: 'bg-emerald-500/20',
        topPct: 40,
        leftPct: 28,
        widthPct: 40,
        heightPct: 9,
        exemploValor: "234.567.890-12",
        obrigatorio: true,
        regraEspecial: "CPF oficial validado no Módulo 11"
      },
      {
        id: 'cin_foto',
        campo: 'foto',
        rotulo: "FOTO 3x4 DIGITAL",
        descricao: "Foto frontal do titular com fundo branco",
        corBorda: 'border-purple-400',
        corFundo: 'bg-purple-500/15',
        topPct: 24,
        leftPct: 4,
        widthPct: 22,
        heightPct: 52,
        exemploValor: "[Foto do Rosto Recortada]",
        obrigatorio: true,
        regraEspecial: "Recorte biométrico de alta definição"
      }
    ],
    regrasGlobais: [
      "O CPF é o número único oficial do documento",
      "Foto com fundo branco nítido",
      "QR Code no verso para validação digital"
    ]
  }
];

export default function AbaModelosDocumentosOCR() {
  const [modelos, setModelos] = useState<ModeloDocumentoConfig[]>(() => {
    try {
      const salvo = localStorage.getItem('modelos_documentos_ocr_v1');
      if (salvo) {
        const parsed = JSON.parse(salvo);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return MODELOS_DOCUMENTO_PADRAO;
  });

  const [modeloSelecionadoId, setModeloSelecionadoId] = useState<string>('cnh_brasil_oficial');
  const [zonaAtivaId, setZonaAtivaId] = useState<string>('cnh_nome');
  const [mensagem, setMensagem] = useState<{ tipo: string; texto: string } | null>(null);

  // Modal para criar novo exemplo / modelo
  const [modalNovoModelAberto, setModalNovoModelAberto] = useState(false);
  const [novoNome, setNovoNome] = useState('');
  const [novoTipo, setNovoTipo] = useState<'CNH' | 'RG' | 'CIN' | 'CRACHA' | 'OUTRO'>('CNH');
  const [novaDescricao, setNovaDescricao] = useState('');
  const [novaOrientacao, setNovaOrientacao] = useState<'horizontal' | 'vertical'>('horizontal');

  // Imagem personalizada carregada para teste de sobreposição
  const [imagemTesteUrl, setImagemTesteUrl] = useState<string | null>(null);

  const modeloAtual = modelos.find(m => m.id === modeloSelecionadoId) || modelos[0];
  const zonaAtual = modeloAtual.zonas.find(z => z.id === zonaAtivaId) || modeloAtual.zonas[0];

  const salvarModelosNoStorage = (novos: ModeloDocumentoConfig[]) => {
    setModelos(novos);
    try {
      localStorage.setItem('modelos_documentos_ocr_v1', JSON.stringify(novos));
    } catch {}
    setMensagem({ tipo: 'sucesso', texto: 'Configuração dos modelos e zonas de calibração salvas com sucesso!' });
    setTimeout(() => setMensagem(null), 4000);
  };

  const restaurarPadroes = () => {
    if (confirm('Deseja restaurar os modelos de CNH, RG e CIN para as coordenadas oficiais calibradas?')) {
      salvarModelosNoStorage(MODELOS_DOCUMENTO_PADRAO);
      setModeloSelecionadoId('cnh_brasil_oficial');
      setZonaAtivaId('cnh_nome');
    }
  };

  const handleAtualizarZonaAtual = (campoProp: keyof ZonaDocumento, valor: any) => {
    const novosModelos = modelos.map(m => {
      if (m.id !== modeloAtual.id) return m;
      return {
        ...m,
        zonas: m.zonas.map(z => {
          if (z.id !== zonaAtual.id) return z;
          return { ...z, [campoProp]: valor };
        })
      };
    });
    salvarModelosNoStorage(novosModelos);
  };

  const handleCriarNovoModelo = () => {
    if (!novoNome.trim()) {
      setMensagem({ tipo: 'erro', texto: 'Informe o nome do modelo de documento.' });
      return;
    }

    const novoId = `modelo_${Date.now()}`;
    const novoModelo: ModeloDocumentoConfig = {
      id: novoId,
      nome: novoNome.trim(),
      tipo: novoTipo,
      descricao: novaDescricao.trim() || `Modelo customizado para ${novoNome}`,
      orientacao: novaOrientacao,
      proporcao: novaOrientacao === 'horizontal' ? '1.586 / 1' : '1 / 1.4',
      zonas: [
        {
          id: `${novoId}_nome`,
          campo: 'nome',
          rotulo: 'NOME DO TITULAR',
          descricao: 'Nome completo da pessoa',
          corBorda: 'border-emerald-400',
          corFundo: 'bg-emerald-500/15',
          topPct: 20,
          leftPct: 25,
          widthPct: 60,
          heightPct: 10,
          exemploValor: 'NOME DE EXEMPLO',
          obrigatorio: true
        },
        {
          id: `${novoId}_doc`,
          campo: 'cpf',
          rotulo: 'DOCUMENTO (CPF / RG)',
          descricao: 'Identificação numérica principal',
          corBorda: 'border-blue-400',
          corFundo: 'bg-blue-500/15',
          topPct: 40,
          leftPct: 25,
          widthPct: 40,
          heightPct: 10,
          exemploValor: '000.000.000-00',
          obrigatorio: true
        },
        {
          id: `${novoId}_foto`,
          campo: 'foto',
          rotulo: 'FOTO DO TITULAR',
          descricao: 'Fotografia 3x4 do crachá ou documento',
          corBorda: 'border-purple-400',
          corFundo: 'bg-purple-500/15',
          topPct: 20,
          leftPct: 5,
          widthPct: 18,
          heightPct: 50,
          exemploValor: '[Foto 3x4]',
          obrigatorio: true
        }
      ],
      regrasGlobais: ['Captura calibrada com motor IA Gemini 3.8 Flash e Tesseract PWA']
    };

    const atualizados = [...modelos, novoModelo];
    salvarModelosNoStorage(atualizados);
    setModeloSelecionadoId(novoId);
    setZonaAtivaId(`${novoId}_nome`);
    setModalNovoModelAberto(false);
    setNovoNome('');
    setNovaDescricao('');
  };

  const handleExcluirModelo = (idParaExcluir: string) => {
    if (confirm('Tem certeza que deseja remover este modelo de documento?')) {
      const filtrados = modelos.filter(m => m.id !== idParaExcluir);
      salvarModelosNoStorage(filtrados);
      if (modeloSelecionadoId === idParaExcluir && filtrados.length > 0) {
        setModeloSelecionadoId(filtrados[0].id);
        setZonaAtivaId(filtrados[0].zonas[0]?.id || '');
      }
    }
  };

  const handleUploadImagemTeste = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setImagemTesteUrl(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Informativo */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/60 to-slate-900 border border-indigo-500/30 p-4 sm:p-5 rounded-2xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-3 bg-indigo-500/20 text-indigo-400 rounded-xl border border-indigo-500/30 shrink-0">
            <Scan className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
              Calibração Visual & Design de Documentos (OCR)
              <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold uppercase">
                Zonas Mapeadas
              </span>
            </h3>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Visualize onde cada campo oficial (Nome, CPF, RG, Foto e Registro) está posicionado nos documentos brasileiros. 
              Ajuste as coordenadas para refinar o leitor inteligente de OCR da portaria e adicione novos modelos.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setModalNovoModelAberto(true)}
            className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black transition flex items-center gap-1.5 shadow-md active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Adicionar Mais Exemplos
          </button>

          <button
            type="button"
            onClick={restaurarPadroes}
            className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border border-slate-700 cursor-pointer"
            title="Restaurar coordenadas oficiais padrão"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Restaurar Padrões
          </button>
        </div>
      </div>

      {mensagem && (
        <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{mensagem.texto}</span>
        </div>
      )}

      {/* Seletor de Modelo de Documento */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-800">
        {modelos.map(mod => (
          <button
            key={mod.id}
            type="button"
            onClick={() => {
              setModeloSelecionadoId(mod.id);
              setZonaAtivaId(mod.zonas[0]?.id || '');
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              modeloSelecionadoId === mod.id
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 ring-2 ring-indigo-400'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800 hover:border-slate-700'
            }`}
          >
            {mod.tipo === 'CNH' && <CreditCard className="w-3.5 h-3.5 text-amber-400" />}
            {mod.tipo === 'RG' && <FileText className="w-3.5 h-3.5 text-blue-400" />}
            {mod.tipo === 'CIN' && <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />}
            {mod.tipo === 'CRACHA' && <Layers className="w-3.5 h-3.5 text-purple-400" />}
            <span>{mod.nome}</span>
          </button>
        ))}
      </div>

      {/* Grid Principal: Visualizador Interativo do Documento + Painel de Ajuste */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* COLUNA ESQUERDA (8 COLS): Visualizador Gráfico do Documento */}
        <div className="lg:col-span-8 bg-slate-950 border border-slate-800 rounded-3xl p-4 sm:p-6 shadow-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div>
              <h4 className="text-sm font-black text-white flex items-center gap-2">
                <span>{modeloAtual.nome}</span>
                <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700 font-mono">
                  {modeloAtual.tipo}
                </span>
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">{modeloAtual.descricao}</p>
            </div>

            <div className="flex items-center gap-2">
              <label 
                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-[11px] font-bold transition flex items-center gap-1.5 border border-slate-700 cursor-pointer"
                title="Carregar foto real do documento para testar sobreposição"
              >
                <Upload className="w-3.5 h-3.5 text-emerald-400" />
                <span>Testar com Foto</span>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleUploadImagemTeste} 
                  className="hidden" 
                />
              </label>

              {imagemTesteUrl && (
                <button
                  type="button"
                  onClick={() => setImagemTesteUrl(null)}
                  className="px-2 py-1.5 bg-rose-950/60 hover:bg-rose-900 text-rose-300 rounded-lg text-[11px] font-bold transition border border-rose-800 cursor-pointer"
                  title="Remover foto de teste"
                >
                  Limpar Foto
                </button>
              )}
            </div>
          </div>

          {/* PALCO VISUAL DO DOCUMENTO (DESIGN FIDEDIGNO) */}
          <div className="relative w-full overflow-hidden bg-slate-900 rounded-2xl border-2 border-slate-800 shadow-inner flex items-center justify-center p-2 sm:p-4">
            
            {/* Aspect Ratio Container Simula o Papel / Documento Real */}
            <div 
              className={`relative w-full max-w-[650px] transition-all duration-300 rounded-xl overflow-hidden shadow-2xl border-2 ${
                modeloAtual.tipo === 'CNH' ? 'bg-[#f4faee] border-[#2d5a3c]' :
                modeloAtual.tipo === 'RG' ? 'bg-[#edf7ed] border-[#388e3c]' :
                'bg-slate-100 border-slate-400'
              }`}
              style={{ aspectRatio: modeloAtual.proporcao.replace(/\s/g, '') }}
            >
              {/* Se houver foto carregada, ela fica de fundo */}
              {imagemTesteUrl && (
                <img 
                  src={imagemTesteUrl} 
                  alt="Documento para Teste" 
                  className="absolute inset-0 w-full h-full object-contain opacity-75 z-0" 
                />
              )}

              {/* DESIGN INTERNO DO DOCUMENTO SE NÃO HOUVER FOTO */}
              {!imagemTesteUrl && modeloAtual.tipo === 'CNH' && (
                <div className="absolute inset-0 p-3 sm:p-5 select-none text-[#1b3e2b] flex flex-col justify-between opacity-90">
                  {/* Cabeçalho CNH */}
                  <div className="text-center border-b border-[#2d5a3c]/30 pb-1">
                    <p className="text-[8px] sm:text-[10px] font-black tracking-wider uppercase text-emerald-950">
                      REPÚBLICA FEDERATIVA DO BRASIL
                    </p>
                    <p className="text-[7px] sm:text-[9px] font-bold text-emerald-900">
                      MINISTÉRIO DOS TRANSPORTES • SECRETARIA NACIONAL DE TRÂNSITO
                    </p>
                    <p className="text-[6px] sm:text-[8px] font-semibold tracking-tight text-slate-700">
                      CARTEIRA NACIONAL DE HABILITAÇÃO / DRIVER LICENSE / PERMISO DE CONDUCCIÓN
                    </p>
                  </div>

                  {/* Faixa decorativa lateral esquerda */}
                  <div className="absolute left-2 top-12 bottom-6 w-3 sm:w-4 bg-emerald-800/15 rounded flex items-center justify-center">
                    <span className="text-[6px] rotate-90 whitespace-nowrap text-emerald-900/60 font-mono">
                      VÁLIDA EM TODO O TERRITÓRIO NACIONAL
                    </span>
                  </div>

                  {/* Detalhes de Rodapé */}
                  <div className="pt-2 text-[7px] text-slate-600 flex justify-between border-t border-[#2d5a3c]/20">
                    <span>7 ASSINATURA DO PORTADOR</span>
                    <span>SENATRAN • EMISSÃO OFICIAL</span>
                  </div>
                </div>
              )}

              {!imagemTesteUrl && modeloAtual.tipo === 'RG' && (
                <div className="absolute inset-0 p-3 sm:p-5 select-none text-[#1b3e2b] flex flex-col justify-between opacity-90">
                  <div className="text-center border-b border-emerald-900/30 pb-1">
                    <p className="text-[9px] sm:text-[11px] font-black tracking-wider uppercase text-emerald-950">
                      REPÚBLICA FEDERATIVA DO BRASIL
                    </p>
                    <p className="text-[7px] sm:text-[9px] font-bold text-emerald-900">
                      SECRETARIA DE SEGURANÇA PÚBLICA • REGISTRO GERAL
                    </p>
                  </div>
                </div>
              )}

              {/* BOUNDING BOXES INTERATIVAS SOBREPOSTAS */}
              {modeloAtual.zonas.map((zona) => {
                const isSelected = zona.id === zonaAtivaId;
                const isBlocked = zona.campo === 'filiacao_bloqueada';

                return (
                  <div
                    key={zona.id}
                    onClick={() => setZonaAtivaId(zona.id)}
                    className={`absolute rounded-md cursor-pointer transition-all duration-200 border-2 z-10 flex flex-col justify-between p-1 ${
                      isSelected 
                        ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-950 scale-[1.01] shadow-2xl ' + zona.corBorda + ' ' + (isBlocked ? 'bg-rose-600/30' : 'bg-emerald-500/25')
                        : zona.corBorda + ' ' + zona.corFundo + ' hover:opacity-100 hover:scale-[1.005]'
                    }`}
                    style={{
                      top: `${zona.topPct}%`,
                      left: `${zona.leftPct}%`,
                      width: `${zona.widthPct}%`,
                      height: `${zona.heightPct}%`
                    }}
                    title={`${zona.rotulo}: ${zona.descricao}`}
                  >
                    {/* Tag Superior do Campo */}
                    <div className="flex items-center justify-between pointer-events-none">
                      <span className={`text-[7px] sm:text-[9px] font-black uppercase px-1 py-0.2 rounded shadow-xs leading-none truncate ${
                        isBlocked
                          ? 'bg-rose-900 text-rose-100 border border-rose-600'
                          : isSelected
                            ? 'bg-slate-950 text-white border border-emerald-400'
                            : 'bg-slate-900/90 text-slate-200'
                      }`}>
                        {zona.rotulo}
                      </span>
                    </div>

                    {/* Exemplo de Texto dentro do Bounding Box */}
                    <span className={`text-[8px] sm:text-[11px] font-bold font-mono truncate leading-none ${
                      isBlocked ? 'text-rose-900/90 line-through' : 'text-slate-950'
                    }`}>
                      {zona.exemploValor}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Legenda de Cores das Zonas */}
          <div className="flex flex-wrap items-center gap-3 text-xs pt-1">
            <span className="text-slate-400 font-bold text-[11px] uppercase">Zonas de Captura:</span>
            <span className="flex items-center gap-1.5 text-emerald-400 text-xs font-semibold">
              <span className="w-3 h-3 rounded bg-emerald-500/30 border border-emerald-400 inline-block" />
              Nome & CPF
            </span>
            <span className="flex items-center gap-1.5 text-blue-400 text-xs font-semibold">
              <span className="w-3 h-3 rounded bg-blue-500/30 border border-blue-400 inline-block" />
              Doc. Identidade (RG)
            </span>
            <span className="flex items-center gap-1.5 text-purple-400 text-xs font-semibold">
              <span className="w-3 h-3 rounded bg-purple-500/30 border border-purple-400 inline-block" />
              Foto 3x4 do Titular
            </span>
            <span className="flex items-center gap-1.5 text-amber-400 text-xs font-semibold">
              <span className="w-3 h-3 rounded bg-amber-500/30 border border-amber-400 inline-block" />
              Nº Registro / Validade
            </span>
            <span className="flex items-center gap-1.5 text-rose-400 text-xs font-semibold">
              <span className="w-3 h-3 rounded bg-rose-500/30 border border-rose-500 inline-block" />
              Zona Bloqueada (Filiação)
            </span>
          </div>

          {/* Regras Globais Ativas */}
          <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-2xl space-y-1.5">
            <span className="text-[11px] font-black uppercase text-indigo-400 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              Regras e Proteções de Extração Ativas:
            </span>
            <ul className="text-xs text-slate-300 space-y-1 pl-4 list-disc">
              {modeloAtual.regrasGlobais.map((regra, idx) => (
                <li key={idx} className="leading-snug">{regra}</li>
              ))}
            </ul>
          </div>
        </div>

        {/* COLUNA DIREITA (4 COLS): Painel de Calibração & Ajuste Fino */}
        <div className="lg:col-span-4 bg-slate-950 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h4 className="text-sm font-black text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-emerald-400" />
              Ajuste da Zona Selecionada
            </h4>
            <span className="text-[10px] bg-indigo-950 text-indigo-300 border border-indigo-500/40 px-2 py-0.5 rounded font-mono">
              {zonaAtual.campo}
            </span>
          </div>

          {/* Seletor Rápido de Zona */}
          <div>
            <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">
              Selecione o Campo para Calibrar:
            </label>
            <select
              value={zonaAtivaId}
              onChange={(e) => setZonaAtivaId(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 text-white text-xs font-bold p-2.5 rounded-xl focus:outline-hidden focus:border-indigo-500 cursor-pointer"
            >
              {modeloAtual.zonas.map(z => (
                <option key={z.id} value={z.id}>
                  {z.rotulo} ({z.campo})
                </option>
              ))}
            </select>
          </div>

          {/* Rótulo e Descrição */}
          <div className="space-y-3 bg-slate-900/60 p-3.5 rounded-2xl border border-slate-800">
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                Rótulo do Campo:
              </label>
              <input
                type="text"
                value={zonaAtual.rotulo}
                onChange={(e) => handleAtualizarZonaAtual('rotulo', e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-hidden focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                Exemplo de Dado Lido:
              </label>
              <input
                type="text"
                value={zonaAtual.exemploValor}
                onChange={(e) => handleAtualizarZonaAtual('exemploValor', e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-emerald-400 font-bold focus:outline-hidden focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                Regra Especial de Limpeza / OCR:
              </label>
              <textarea
                rows={2}
                value={zonaAtual.regraEspecial || ''}
                onChange={(e) => handleAtualizarZonaAtual('regraEspecial', e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-hidden focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Sliders de Coordenadas Relativas (Posicionamento %) */}
          <div className="space-y-3 bg-slate-900/60 p-3.5 rounded-2xl border border-slate-800">
            <span className="text-[11px] font-black uppercase text-slate-300 flex items-center justify-between">
              <span>Coordenadas da Bounding Box (%)</span>
              <Crosshair className="w-3.5 h-3.5 text-indigo-400" />
            </span>

            {/* Top % */}
            <div>
              <div className="flex justify-between text-[10px] font-bold text-slate-400 mb-1">
                <span>Distância do Topo (Y)</span>
                <span className="font-mono text-emerald-400">{zonaAtual.topPct}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="90"
                value={zonaAtual.topPct}
                onChange={(e) => handleAtualizarZonaAtual('topPct', Number(e.target.value))}
                className="w-full accent-emerald-500 cursor-pointer"
              />
            </div>

            {/* Left % */}
            <div>
              <div className="flex justify-between text-[10px] font-bold text-slate-400 mb-1">
                <span>Distância da Esquerda (X)</span>
                <span className="font-mono text-emerald-400">{zonaAtual.leftPct}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="90"
                value={zonaAtual.leftPct}
                onChange={(e) => handleAtualizarZonaAtual('leftPct', Number(e.target.value))}
                className="w-full accent-emerald-500 cursor-pointer"
              />
            </div>

            {/* Width % */}
            <div>
              <div className="flex justify-between text-[10px] font-bold text-slate-400 mb-1">
                <span>Largura da Zona</span>
                <span className="font-mono text-emerald-400">{zonaAtual.widthPct}%</span>
              </div>
              <input
                type="range"
                min="5"
                max="95"
                value={zonaAtual.widthPct}
                onChange={(e) => handleAtualizarZonaAtual('widthPct', Number(e.target.value))}
                className="w-full accent-emerald-500 cursor-pointer"
              />
            </div>

            {/* Height % */}
            <div>
              <div className="flex justify-between text-[10px] font-bold text-slate-400 mb-1">
                <span>Altura da Zona</span>
                <span className="font-mono text-emerald-400">{zonaAtual.heightPct}%</span>
              </div>
              <input
                type="range"
                min="4"
                max="60"
                value={zonaAtual.heightPct}
                onChange={(e) => handleAtualizarZonaAtual('heightPct', Number(e.target.value))}
                className="w-full accent-emerald-500 cursor-pointer"
              />
            </div>
          </div>

          {/* Botões de Ação do Modelo */}
          <div className="space-y-2 pt-2">
            <button
              type="button"
              onClick={() => {
                setMensagem({ tipo: 'sucesso', texto: `Coordenadas da zona "${zonaAtual.rotulo}" salvas com sucesso!` });
                setTimeout(() => setMensagem(null), 3000);
              }}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black transition flex items-center justify-center gap-2 shadow-lg active:scale-95 uppercase cursor-pointer"
            >
              <Save className="w-4 h-4" />
              Salvar Ajustes do Modelo
            </button>

            {modelos.length > 1 && !['cnh_brasil_oficial', 'rg_brasil_oficial'].includes(modeloAtual.id) && (
              <button
                type="button"
                onClick={() => handleExcluirModelo(modeloAtual.id)}
                className="w-full py-2 bg-rose-950/60 hover:bg-rose-900 text-rose-300 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 border border-rose-800 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Excluir este Modelo
              </button>
            )}
          </div>
        </div>
      </div>

      {/* MODAL PARA ADICIONAR NOVO EXEMPLO / MODELO */}
      {modalNovoModelAberto && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 text-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-black text-base text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-emerald-400" />
                Adicionar Novo Modelo / Exemplo de Documento
              </h3>
              <button
                type="button"
                onClick={() => setModalNovoModelAberto(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-300 mb-1">
                  Nome do Modelo *
                </label>
                <input
                  type="text"
                  value={novoNome}
                  onChange={(e) => setNovoNome(e.target.value)}
                  placeholder="Ex: Crachá Prestador Prosegur, RG Minas Gerais"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white font-bold focus:outline-hidden focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-300 mb-1">
                    Tipo do Documento
                  </label>
                  <select
                    value={novoTipo}
                    onChange={(e) => setNovoTipo(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-bold focus:outline-hidden focus:border-emerald-500"
                  >
                    <option value="CNH">CNH</option>
                    <option value="RG">RG</option>
                    <option value="CIN">Nova CIN</option>
                    <option value="CRACHA">Crachá de Prestador</option>
                    <option value="OUTRO">Outro Documento</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-300 mb-1">
                    Orientação
                  </label>
                  <select
                    value={novaOrientacao}
                    onChange={(e) => setNovaOrientacao(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-bold focus:outline-hidden focus:border-emerald-500"
                  >
                    <option value="horizontal">Horizontal (Padrão RG/CNH)</option>
                    <option value="vertical">Vertical (Crachá)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-300 mb-1">
                  Descrição / Finalidade
                </label>
                <textarea
                  rows={2}
                  value={novaDescricao}
                  onChange={(e) => setNovaDescricao(e.target.value)}
                  placeholder="Descreva detalhes específicos do documento para calibração da equipe"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-hidden focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setModalNovoModelAberto(false)}
                className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleCriarNovoModelo}
                className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs transition shadow-md active:scale-95 cursor-pointer uppercase"
              >
                Criar Modelo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
