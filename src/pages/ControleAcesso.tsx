import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Scan,
  ShieldCheck,
  UserCheck,
  Car,
  Users,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Camera,
  QrCode,
  Share2,
  LogOut,
  LogIn,
  Key,
  ShieldAlert,
  Plus,
  X,
  FileSpreadsheet,
  Download,
  Building,
  Check,
  Trash2,
  Calendar,
  Eye,
  RefreshCw,
  Phone,
  HardHat,
  Package,
  Sparkles,
  Info
} from 'lucide-react';
import {
  PontoAcesso,
  RegistroAcesso,
  PasseVirtualQR,
  BloqueioSeguranca,
  carregarPontosAcesso,
  carregarRegistrosAcesso,
  carregarPassesVirtuais,
  carregarBlacklist,
  verificarBloqueio,
  salvarItemBlacklist,
  registrarEntradaAcesso,
  registrarSaidaAcesso,
  gerarPasseVirtual,
  validarTokenPasse,
  formatarMensagemWhatsAppPasse
} from '../services/controleAcessoService';
import {
  carregarCondominioConfig,
  getCondominioAtivoId,
  CondominioConfig
} from '../services/condominioService';
import { formatarLinkWhatsApp } from '../services/configWhatsappService';
import { verificarPermissao } from '../services/permissoesService';
import { supabase } from '../services/supabase';

interface ControleAcessoProps {
  usuarioLogado?: any;
}

export default function ControleAcesso({ usuarioLogado }: ControleAcessoProps) {
  const [condId, setCondId] = useState(() => getCondominioAtivoId(usuarioLogado));
  const [condoConfig, setCondoConfig] = useState<CondominioConfig | null>(null);
  const [loading, setLoading] = useState(true);

  // Dados
  const [pontosAcesso, setPontosAcesso] = useState<PontoAcesso[]>([]);
  const [registros, setRegistros] = useState<RegistroAcesso[]>([]);
  const [passesVirtuais, setPassesVirtuais] = useState<PasseVirtualQR[]>([]);
  const [blacklist, setBlacklist] = useState<BloqueioSeguranca[]>([]);

  // Abas
  const [abaAtiva, setAbaAtiva] = useState<'entrada' | 'presentes' | 'validador_qr' | 'passes' | 'historico' | 'blacklist'>('entrada');

  // Filtros & Buscas
  const [termoBusca, setTermoBusca] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<string>('todos');
  const [feedback, setFeedback] = useState<{ tipo: 'sucesso' | 'erro' | 'alerta'; texto: string } | null>(null);

  // Form de Entrada Rápida
  const [formEntrada, setFormEntrada] = useState<{
    tipo: RegistroAcesso['tipo'];
    nome: string;
    documento: string;
    telefone: string;
    empresa: string;
    unidade_bloco: string;
    morador_responsavel: string;
    ponto_acesso_entrada: string;
    veiculo_placa: string;
    veiculo_modelo: string;
    veiculo_cor: string;
    cracha_ou_tag: string;
    observacoes: string;
    foto_entrada_url?: string;
  }>({
    tipo: 'visitante',
    nome: '',
    documento: '',
    telefone: '',
    empresa: '',
    unidade_bloco: '',
    morador_responsavel: '',
    ponto_acesso_entrada: '',
    veiculo_placa: '',
    veiculo_modelo: '',
    veiculo_cor: '',
    cracha_ou_tag: '',
    observacoes: ''
  });

  const [alertaSegurancaDetectado, setAlertaSegurancaDetectado] = useState<BloqueioSeguranca | null>(null);

  // Câmera / Foto
  const [cameraAtiva, setCameraAtiva] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Scanner QR Code / Token
  const [tokenParaValidar, setTokenParaValidar] = useState('');
  const [resultadoValidacaoQR, setResultadoValidacaoQR] = useState<{
    valido: boolean;
    passe?: PasseVirtualQR;
    motivo?: string;
  } | null>(null);

  // Form Novo Passe Virtual
  const [modalNovoPasse, setModalNovoPasse] = useState(false);
  const [formNovoPasse, setFormNovoPasse] = useState({
    visitante_nome: '',
    visitante_documento: '',
    unidade_bloco: '',
    morador_nome: '',
    morador_telefone: '',
    tipo: 'visitante' as any,
    data_validade: new Date().toISOString().split('T')[0],
    hora_inicio: '08:00',
    hora_fim: '23:00',
    max_usos: 1,
    observacoes: ''
  });

  // Modal Blacklist
  const [modalNovoBloqueio, setModalNovoBloqueio] = useState(false);
  const [formBloqueio, setFormBloqueio] = useState({
    tipo: 'pessoa' as 'pessoa' | 'veiculo',
    nome_ou_placa: '',
    documento: '',
    motivo: '',
    gravidade: 'bloqueio_total' as any
  });

  // Monitora troca global de condomínio
  useEffect(() => {
    const handleCondoChange = (e: any) => {
      const novoId = e?.detail?.id;
      if (novoId && novoId !== 'global' && novoId !== 'todos') {
        setCondId(novoId);
      } else {
        setCondId(getCondominioAtivoId(usuarioLogado));
      }
    };
    window.addEventListener('infport:condominio_alterado', handleCondoChange);
    return () => window.removeEventListener('infport:condominio_alterado', handleCondoChange);
  }, [usuarioLogado]);

  // Carrega dados iniciais
  useEffect(() => {
    carregarTudo();
  }, [condId]);

  const carregarTudo = async () => {
    if (!condId || condId === 'global' || condId === 'todos') {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [cfg, pontos, regs, passes, blk] = await Promise.all([
        carregarCondominioConfig(condId),
        carregarPontosAcesso(condId),
        carregarRegistrosAcesso(condId),
        carregarPassesVirtuais(condId),
        carregarBlacklist(condId)
      ]);
      setCondoConfig(cfg);
      setPontosAcesso(pontos);
      setRegistros(regs);
      setPassesVirtuais(passes);
      setBlacklist(blk);

      if (pontos.length > 0 && !formEntrada.ponto_acesso_entrada) {
        setFormEntrada(prev => ({ ...prev, ponto_acesso_entrada: pontos[0].nome }));
      }
    } catch (e) {
      console.error('Erro ao carregar dados de controle de acesso:', e);
    } finally {
      setLoading(false);
    }
  };

  // Checagem em tempo real de Blacklist no form de entrada
  useEffect(() => {
    if (!condId || (!formEntrada.documento && !formEntrada.nome && !formEntrada.veiculo_placa)) {
      setAlertaSegurancaDetectado(null);
      return;
    }

    const timer = setTimeout(() => {
      verificarBloqueio(condId, formEntrada.documento, formEntrada.nome, formEntrada.veiculo_placa).then(res => {
        if (res.bloqueado && res.item) {
          setAlertaSegurancaDetectado(res.item);
        } else {
          setAlertaSegurancaDetectado(null);
        }
      });
    }, 300);

    return () => clearTimeout(timer);
  }, [condId, formEntrada.documento, formEntrada.nome, formEntrada.veiculo_placa]);

  // Métricas
  const metricas = useMemo(() => {
    const presentes = registros.filter(r => r.status === 'presente');
    const presentesPedestres = presentes.filter(r => !r.veiculo_placa).length;
    const presentesVeiculos = presentes.filter(r => Boolean(r.veiculo_placa)).length;
    const passesAtivos = passesVirtuais.filter(p => p.status === 'valido').length;
    const totalBloqueios = blacklist.filter(b => b.ativo).length;

    return {
      totalPresentes: presentes.length,
      presentesPedestres,
      presentesVeiculos,
      passesAtivos,
      totalBloqueios
    };
  }, [registros, passesVirtuais, blacklist]);

  // Gerenciamento de Câmera / Foto
  const iniciarCamera = async () => {
    try {
      setCameraAtiva(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (e) {
      console.warn('Câmera indisponível no navegador:', e);
      setCameraAtiva(false);
      setFeedback({ tipo: 'erro', texto: 'Não foi possível acessar a câmera do dispositivo.' });
    }
  };

  const pararCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(t => t.stop());
      videoRef.current.srcObject = null;
    }
    setCameraAtiva(false);
  };

  const capturarFoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      setFormEntrada(prev => ({ ...prev, foto_entrada_url: dataUrl }));
      pararCamera();
      setFeedback({ tipo: 'sucesso', texto: 'Foto capturada com sucesso!' });
    }
  };

  // Efetivar Entrada
  const handleRegistrarEntrada = async (e: React.FormEvent) => {
    e.preventDefault();
    if (alertaSegurancaDetectado?.gravidade === 'bloqueio_total') {
      setFeedback({
        tipo: 'erro',
        texto: `ACESSO BARRADO: Consta na Lista de Bloqueios (${alertaSegurancaDetectado.motivo})`
      });
      return;
    }

    if (!formEntrada.nome || !formEntrada.unidade_bloco) {
      setFeedback({ tipo: 'erro', texto: 'Preencha o nome e a unidade de destino.' });
      return;
    }

    const resultado = await registrarEntradaAcesso(condId, formEntrada, usuarioLogado);
    if (resultado.sucesso && resultado.registro) {
      setRegistros(prev => [resultado.registro!, ...prev]);
      setFeedback({ tipo: 'sucesso', texto: `Entrada liberada para ${resultado.registro.nome}!` });
      // Limpa formulário
      setFormEntrada(prev => ({
        ...prev,
        nome: '',
        documento: '',
        telefone: '',
        empresa: '',
        unidade_bloco: '',
        morador_responsavel: '',
        veiculo_placa: '',
        veiculo_modelo: '',
        veiculo_cor: '',
        cracha_ou_tag: '',
        observacoes: '',
        foto_entrada_url: undefined
      }));
      pararCamera();
      setAbaAtiva('presentes');
    } else {
      setFeedback({ tipo: 'erro', texto: resultado.erro || 'Falha ao registrar entrada.' });
    }
  };

  // Registrar Saída
  const handleRegistrarSaida = async (registroId: string) => {
    const ok = await registrarSaidaAcesso(condId, registroId, undefined, undefined, usuarioLogado);
    if (ok) {
      setRegistros(prev =>
        prev.map(r =>
          r.id === registroId
            ? { ...r, status: 'saiu', data_hora_saida: new Date().toISOString() }
            : r
        )
      );
      setFeedback({ tipo: 'sucesso', texto: 'Saída registrada com sucesso!' });
    }
  };

  // Validação de Passe QR
  const handleValidarPasse = async () => {
    if (!tokenParaValidar.trim()) return;
    const res = await validarTokenPasse(condId, tokenParaValidar);
    setResultadoValidacaoQR(res);

    if (res.valido && res.passe) {
      setFeedback({ tipo: 'sucesso', texto: `Passe Válido! Visitante: ${res.passe.visitante_nome}` });
    } else {
      setFeedback({ tipo: 'erro', texto: res.motivo || 'Passe inválido.' });
    }
  };

  const handleLiberarPasseValidado = async () => {
    if (!resultadoValidacaoQR?.passe) return;
    const p = resultadoValidacaoQR.passe;

    const entradaDados: Partial<RegistroAcesso> = {
      tipo: p.tipo === 'festa_convidado' ? 'convidado_evento' : 'visitante',
      nome: p.visitante_nome,
      documento: p.visitante_documento || '',
      unidade_bloco: p.unidade_bloco,
      morador_responsavel: p.morador_nome,
      ponto_acesso_entrada: 'Portaria Principal (Pedestres)',
      observacoes: `Liberado via Passe QR (${p.token}) - ${p.observacoes || ''}`,
      passe_qr_id: p.id
    };

    const res = await registrarEntradaAcesso(condId, entradaDados, usuarioLogado);
    if (res.sucesso && res.registro) {
      setRegistros(prev => [res.registro!, ...prev]);
      setFeedback({ tipo: 'sucesso', texto: `Entrada liberada para ${p.visitante_nome} via Passe QR!` });
      setResultadoValidacaoQR(null);
      setTokenParaValidar('');
      setAbaAtiva('presentes');
    }
  };

  // Criar Novo Passe Virtual
  const handleCriarPasse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNovoPasse.visitante_nome || !formNovoPasse.unidade_bloco) {
      setFeedback({ tipo: 'erro', texto: 'Preencha o nome do visitante e a unidade.' });
      return;
    }

    const novo = await gerarPasseVirtual(condId, formNovoPasse, usuarioLogado);
    setPassesVirtuais(prev => [novo, ...prev]);
    setModalNovoPasse(false);
    setFeedback({ tipo: 'sucesso', texto: `Passe Virtual gerado! Código: ${novo.token}` });
  };

  // WhatsApp Share do Passe
  const handleEnviarPasseWhats = (passe: PasseVirtualQR) => {
    const tel = passe.morador_telefone || '';
    const texto = formatarMensagemWhatsAppPasse(passe, condoConfig?.nome || 'Condomínio');
    const link = formatarLinkWhatsApp(tel, texto);
    window.open(link, '_blank');
  };

  // Salvar Bloqueio (Blacklist)
  const handleSalvarBloqueio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formBloqueio.nome_ou_placa.trim()) {
      setFeedback({ tipo: 'erro', texto: 'Informe o nome da pessoa ou a placa do veículo.' });
      return;
    }

    const item = await salvarItemBlacklist(condId, formBloqueio, usuarioLogado);
    setBlacklist(prev => [item, ...prev]);
    setModalNovoBloqueio(false);
    setFormBloqueio({ tipo: 'pessoa', nome_ou_placa: '', documento: '', motivo: '', gravidade: 'bloqueio_total' });
    setFeedback({ tipo: 'sucesso', texto: 'Restrição registrada na lista de segurança!' });
  };

  // Filtragem dos Presentes
  const presentesFiltrados = useMemo(() => {
    return registros.filter(r => {
      if (r.status !== 'presente') return false;
      if (filtroTipo !== 'todos' && r.tipo !== filtroTipo) return false;
      if (termoBusca) {
        const t = termoBusca.toLowerCase();
        return (
          r.nome?.toLowerCase().includes(t) ||
          r.documento?.toLowerCase().includes(t) ||
          r.unidade_bloco?.toLowerCase().includes(t) ||
          r.veiculo_placa?.toLowerCase().includes(t)
        );
      }
      return true;
    });
  }, [registros, filtroTipo, termoBusca]);

  // Tempo de permanência formatado
  const calcularPermanencia = (entradaStr: string) => {
    const entrada = new Date(entradaStr).getTime();
    const agora = Date.now();
    const minutos = Math.max(0, Math.floor((agora - entrada) / 60000));
    if (minutos < 60) return `${minutos} min`;
    const horas = Math.floor(minutos / 60);
    const restoMin = minutos % 60;
    return `${horas}h ${restoMin}m`;
  };

  return (
    <div className="max-w-7xl mx-auto space-y-4 pb-20">
      <canvas ref={canvasRef} className="hidden" />

      {/* Toast de Feedback */}
      {feedback && (
        <div
          className={`p-3.5 rounded-2xl flex items-center justify-between shadow-md text-sm font-semibold transition-all ${
            feedback.tipo === 'sucesso'
              ? 'bg-emerald-500 text-white'
              : feedback.tipo === 'alerta'
              ? 'bg-amber-500 text-white'
              : 'bg-rose-500 text-white'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.tipo === 'sucesso' ? (
              <CheckCircle2 className="w-5 h-5" />
            ) : (
              <AlertTriangle className="w-5 h-5" />
            )}
            <span>{feedback.texto}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="p-1 hover:bg-black/10 rounded-lg cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Topo / Header do Módulo */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
            <Scan className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              Controle de Acesso & Portaria
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-800">
                {condoConfig?.nome || 'Condomínio'}
              </span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Liberação ágil de pedestres, cancelas veiculares, validação de passes QR Code e pessoas no interior
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <button
            type="button"
            onClick={() => setAbaAtiva('validador_qr')}
            className="flex-1 md:flex-none inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md shadow-purple-600/20 cursor-pointer transition active:scale-95"
          >
            <QrCode className="w-4 h-4" />
            Escanear QR Code
          </button>
          <button
            type="button"
            onClick={() => setAbaAtiva('entrada')}
            className="flex-1 md:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-600/20 cursor-pointer transition active:scale-95"
          >
            <LogIn className="w-4 h-4 stroke-[3]" />
            Entrada Rápida
          </button>
        </div>
      </div>

      {/* Indicadores Rápidos do Posto */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div
          onClick={() => setAbaAtiva('presentes')}
          className="bg-white dark:bg-slate-900 p-3.5 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between cursor-pointer hover:border-emerald-500/40 transition"
        >
          <div>
            <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">No Condomínio</span>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">
              {metricas.totalPresentes}
            </div>
            <span className="text-[10px] text-slate-500 font-medium">
              {metricas.presentesPedestres} ped. • {metricas.presentesVeiculos} veíc.
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div
          onClick={() => setAbaAtiva('passes')}
          className="bg-white dark:bg-slate-900 p-3.5 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between cursor-pointer hover:border-purple-500/40 transition"
        >
          <div>
            <span className="text-[11px] font-bold text-purple-600 uppercase tracking-wider">Passes Virtuais</span>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">
              {metricas.passesAtivos}
            </div>
            <span className="text-[10px] text-slate-500 font-medium">Convites QR válidos</span>
          </div>
          <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-500">
            <QrCode className="w-5 h-5" />
          </div>
        </div>

        <div
          onClick={() => setAbaAtiva('historico')}
          className="bg-white dark:bg-slate-900 p-3.5 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between cursor-pointer hover:border-blue-500/40 transition"
        >
          <div>
            <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">Movimentações</span>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">
              {registros.length}
            </div>
            <span className="text-[10px] text-slate-500 font-medium">Histórico registrado</span>
          </div>
          <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div
          onClick={() => setAbaAtiva('blacklist')}
          className="bg-white dark:bg-slate-900 p-3.5 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between cursor-pointer hover:border-rose-500/40 transition"
        >
          <div>
            <span className="text-[11px] font-bold text-rose-600 uppercase tracking-wider">Restrições / Alerta</span>
            <div className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-0.5">
              {metricas.totalBloqueios}
            </div>
            <span className="text-[10px] text-slate-500 font-medium">Blacklist ativa</span>
          </div>
          <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-500">
            <ShieldAlert className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Menu Superior de Abas */}
      <div className="flex items-center gap-1 p-1 bg-slate-200/80 dark:bg-slate-850 rounded-2xl overflow-x-auto text-xs font-bold scrollbar-none">
        <button
          onClick={() => setAbaAtiva('entrada')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition cursor-pointer whitespace-nowrap ${
            abaAtiva === 'entrada'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <LogIn className="w-4 h-4 text-blue-500" />
          <span>Liberação de Entrada</span>
        </button>

        <button
          onClick={() => setAbaAtiva('presentes')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition cursor-pointer whitespace-nowrap ${
            abaAtiva === 'presentes'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Users className="w-4 h-4 text-emerald-500" />
          <span>Presentes no Condomínio</span>
          {metricas.totalPresentes > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-500 text-white font-extrabold">
              {metricas.totalPresentes}
            </span>
          )}
        </button>

        <button
          onClick={() => setAbaAtiva('validador_qr')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition cursor-pointer whitespace-nowrap ${
            abaAtiva === 'validador_qr'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <QrCode className="w-4 h-4 text-purple-500" />
          <span>Validador QR Code</span>
        </button>

        <button
          onClick={() => setAbaAtiva('passes')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition cursor-pointer whitespace-nowrap ${
            abaAtiva === 'passes'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Share2 className="w-4 h-4 text-indigo-500" />
          <span>Passes & Convites WhatsApp</span>
        </button>

        <button
          onClick={() => setAbaAtiva('historico')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition cursor-pointer whitespace-nowrap ${
            abaAtiva === 'historico'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Clock className="w-4 h-4 text-slate-500" />
          <span>Histórico de Auditoria</span>
        </button>

        <button
          onClick={() => setAbaAtiva('blacklist')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition cursor-pointer whitespace-nowrap ${
            abaAtiva === 'blacklist'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <ShieldAlert className="w-4 h-4 text-rose-500" />
          <span>Lista de Bloqueios ({blacklist.length})</span>
        </button>
      </div>

      {/* ABA 1: LIBERAÇÃO DE ENTRADA RÁPIDA */}
      {abaAtiva === 'entrada' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-sm max-w-4xl mx-auto">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-6">
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                <LogIn className="w-5 h-5 text-blue-500" />
                Registrar Entrada / Liberação de Acesso
              </h3>
              <p className="text-xs text-slate-500">
                Guarita de portaria: libere pedestres, visitantes sociais, veículos e entregas rápidas
              </p>
            </div>
            {alertaSegurancaDetectado && (
              <span className="px-2.5 py-1 rounded-full text-xs font-black bg-rose-500 text-white animate-bounce flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> ALERTA DE SEGURANÇA
              </span>
            )}
          </div>

          <form onSubmit={handleRegistrarEntrada} className="space-y-6">
            {/* Categoria do Acesso */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                1. Tipo de Entrada
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                {[
                  { id: 'visitante', label: 'Visitante', icone: Users, cor: 'text-blue-500' },
                  { id: 'prestador', label: 'Prestador', icone: HardHat, cor: 'text-purple-500' },
                  { id: 'convidado_evento', label: 'Convidado Festa', icone: Sparkles, cor: 'text-amber-500' },
                  { id: 'veiculo', label: 'Veículo', icone: Car, cor: 'text-emerald-500' },
                  { id: 'entrega', label: 'Entrega Rápida', icone: Package, cor: 'text-orange-500' },
                  { id: 'morador', label: 'Morador', icone: Building, cor: 'text-indigo-500' }
                ].map(item => {
                  const Icone = item.icone;
                  const ativo = formEntrada.tipo === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setFormEntrada(prev => ({ ...prev, tipo: item.id as any }))}
                      className={`p-3 rounded-2xl border text-center flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        ativo
                          ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/40 ring-2 ring-blue-500/20'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <Icone className={`w-5 h-5 ${item.cor}`} />
                      <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Ponto de Acesso */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Ponto de Acesso / Portão *
                </label>
                <select
                  value={formEntrada.ponto_acesso_entrada}
                  onChange={e => setFormEntrada(prev => ({ ...prev, ponto_acesso_entrada: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold"
                >
                  {pontosAcesso.map(p => (
                    <option key={p.id} value={p.nome}>
                      {p.nome} ({p.tipo.toUpperCase()})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Unidade / Bloco de Destino *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Torre A - Apto 302 ou Lote 14"
                  value={formEntrada.unidade_bloco}
                  onChange={e => setFormEntrada(prev => ({ ...prev, unidade_bloco: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold focus:ring-2 focus:ring-blue-500/50"
                />
              </div>
            </div>

            {/* Dados Pessoais */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Nome de quem está entrando"
                  value={formEntrada.nome}
                  onChange={e => setFormEntrada(prev => ({ ...prev, nome: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold focus:ring-2 focus:ring-blue-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Documento (RG / CPF)
                </label>
                <input
                  type="text"
                  placeholder="Número do documento"
                  value={formEntrada.documento}
                  onChange={e => setFormEntrada(prev => ({ ...prev, documento: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Crachá / Tag de Acesso
                </label>
                <input
                  type="text"
                  placeholder="Ex: CR-042 ou Cartão 12"
                  value={formEntrada.cracha_ou_tag}
                  onChange={e => setFormEntrada(prev => ({ ...prev, cracha_ou_tag: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold"
                />
              </div>
            </div>

            {/* Veículo (se houver ou se tipo for veículo) */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-850/60 border border-slate-200 dark:border-slate-800 space-y-3">
              <span className="block text-xs font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <Car className="w-4 h-4 text-emerald-500" />
                Dados Veiculares (Preencha se o acesso for de carro/moto/caminhão):
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Placa do Veículo</label>
                  <input
                    type="text"
                    placeholder="Ex: ABC1D23"
                    value={formEntrada.veiculo_placa}
                    onChange={e => setFormEntrada(prev => ({ ...prev, veiculo_placa: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold uppercase"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Modelo / Marca</label>
                  <input
                    type="text"
                    placeholder="Ex: Corolla, Onix, Fiorino..."
                    value={formEntrada.veiculo_modelo}
                    onChange={e => setFormEntrada(prev => ({ ...prev, veiculo_modelo: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Cor</label>
                  <input
                    type="text"
                    placeholder="Ex: Prata, Branco, Preto..."
                    value={formEntrada.veiculo_cor}
                    onChange={e => setFormEntrada(prev => ({ ...prev, veiculo_cor: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold"
                  />
                </div>
              </div>
            </div>

            {/* Captura de Foto / Webcam */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-850/60 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <Camera className="w-4 h-4 text-blue-500" />
                  Registro Fotográfico Facial ou de Documento
                </span>
                {!cameraAtiva && !formEntrada.foto_entrada_url && (
                  <button
                    type="button"
                    onClick={iniciarCamera}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold cursor-pointer"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    Abrir Câmera
                  </button>
                )}
              </div>

              {cameraAtiva && (
                <div className="flex flex-col items-center gap-3">
                  <div className="relative rounded-2xl overflow-hidden border-2 border-blue-500 w-full max-w-sm aspect-video bg-black">
                    <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={capturarFoto}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md cursor-pointer"
                    >
                      📸 Fotografar
                    </button>
                    <button
                      type="button"
                      onClick={pararCamera}
                      className="px-3 py-2 rounded-xl bg-slate-300 dark:bg-slate-700 text-xs font-bold cursor-pointer"
                    >
                      Fechar
                    </button>
                  </div>
                </div>
              )}

              {formEntrada.foto_entrada_url && (
                <div className="flex items-center gap-3">
                  <img
                    src={formEntrada.foto_entrada_url}
                    alt="Foto capturada"
                    className="w-20 h-20 rounded-xl object-cover border border-slate-300 dark:border-slate-700 shadow-xs"
                  />
                  <div>
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 block">
                      Foto anexada ao registro de entrada
                    </span>
                    <button
                      type="button"
                      onClick={() => setFormEntrada(prev => ({ ...prev, foto_entrada_url: undefined }))}
                      className="text-xs text-rose-500 hover:underline mt-1 font-semibold cursor-pointer"
                    >
                      Remover foto
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Alerta de Blacklist Crítico */}
            {alertaSegurancaDetectado && (
              <div className="p-4 rounded-2xl bg-rose-500/15 border-2 border-rose-500 text-rose-700 dark:text-rose-300 space-y-1 animate-pulse">
                <div className="flex items-center gap-2 font-black text-sm">
                  <AlertTriangle className="w-5 h-5 text-rose-600" />
                  ALERTA MÁXIMO DE SEGURANÇA: ENTRADA RESTRITA / BLOQUEADA!
                </div>
                <p className="text-xs font-medium">
                  {alertaSegurancaDetectado.nome_ou_placa} consta na Lista de Bloqueios. Motivo: "{alertaSegurancaDetectado.motivo}".
                </p>
                <p className="text-[11px] font-bold uppercase text-rose-600">
                  NÃO LIBERE O ACESSO SEM CONSULTAR O SUPERVISOR OU O SÍNDICO.
                </p>
              </div>
            )}

            {/* Botão de Liberação */}
            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setAbaAtiva('presentes')}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 text-xs font-bold cursor-pointer"
              >
                Ver Pessoas no Posto
              </button>
              <button
                type="submit"
                disabled={Boolean(alertaSegurancaDetectado?.gravidade === 'bloqueio_total')}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-95 disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-blue-600/20 cursor-pointer"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                Liberar Entrada (Registrar no Sistema)
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ABA 2: PRESENTES NO CONDOMÍNIO */}
      {abaAtiva === 'presentes' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-500" />
                Pessoas & Veículos no Interior do Condomínio ({presentesFiltrados.length})
              </h3>
              <p className="text-xs text-slate-500">
                Acompanhamento em tempo real de quem deu entrada e ainda não registrou saída
              </p>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <input
                type="text"
                placeholder="Filtrar presentes..."
                value={termoBusca}
                onChange={e => setTermoBusca(e.target.value)}
                className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold"
              />
              <select
                value={filtroTipo}
                onChange={e => setFiltroTipo(e.target.value)}
                className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold"
              >
                <option value="todos">Todos Tipos</option>
                <option value="visitante">Visitantes</option>
                <option value="prestador">Prestadores</option>
                <option value="veiculo">Veículos</option>
                <option value="convidado_evento">Convidados de Eventos</option>
              </select>
            </div>
          </div>

          {presentesFiltrados.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border border-dashed border-slate-300 dark:border-slate-800 text-slate-400">
              <Users className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <h4 className="font-extrabold text-sm text-slate-700 dark:text-slate-300">Ninguém registrado no interior</h4>
              <p className="text-xs text-slate-500 mt-1">Todos os visitantes e prestadores já registraram saída.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {presentesFiltrados.map(reg => (
                <div
                  key={reg.id}
                  className="bg-white dark:bg-slate-900 rounded-3xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        {reg.foto_entrada_url ? (
                          <img
                            src={reg.foto_entrada_url}
                            alt=""
                            className="w-10 h-10 rounded-xl object-cover border border-slate-200"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500">
                            {reg.veiculo_placa ? <Car className="w-5 h-5 text-emerald-500" /> : <Users className="w-5 h-5 text-blue-500" />}
                          </div>
                        )}
                        <div>
                          <h4 className="font-extrabold text-sm text-slate-900 dark:text-white leading-snug">
                            {reg.nome}
                          </h4>
                          <span className="text-[10px] uppercase font-mono font-bold text-slate-400">
                            {reg.tipo} {reg.veiculo_placa && `• ${reg.veiculo_placa}`}
                          </span>
                        </div>
                      </div>

                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300">
                        Presente
                      </span>
                    </div>

                    <div className="space-y-1 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-850/60 border border-slate-100 dark:border-slate-800 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Destino:</span>
                        <span className="font-bold text-slate-900 dark:text-white">{reg.unidade_bloco}</span>
                      </div>
                      {reg.documento && (
                        <div className="flex justify-between">
                          <span className="text-slate-500">Documento:</span>
                          <span className="font-mono text-slate-700 dark:text-slate-300">{reg.documento}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-slate-500">Tempo no local:</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                          {calcularPermanencia(reg.data_hora_entrada)}
                        </span>
                      </div>
                      <div className="flex justify-between text-[11px] text-slate-400">
                        <span>Ponto:</span>
                        <span>{reg.ponto_acesso_entrada}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 font-mono">
                      Operador: {reg.operador_entrada_nome.split(' ')[0]}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRegistrarSaida(reg.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-xs cursor-pointer active:scale-95 transition"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Registrar Saída
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ABA 3: VALIDADOR DE QR CODE & TOKEN */}
      {abaAtiva === 'validador_qr' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-sm max-w-2xl mx-auto space-y-6">
          <div className="text-center space-y-1">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center mx-auto mb-2">
              <QrCode className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white">
              Validação de Passe Virtual / Convite QR Code
            </h3>
            <p className="text-xs text-slate-500">
              Digite o código alfanumérico fornecido pelo visitante ou leia o QR Code impresso / na tela do celular
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Ex: PASS-CONV-98214"
                value={tokenParaValidar}
                onChange={e => setTokenParaValidar(e.target.value.toUpperCase())}
                className="flex-1 px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 font-mono text-sm font-black tracking-wider text-center focus:border-purple-500"
              />
              <button
                type="button"
                onClick={handleValidarPasse}
                className="px-5 py-3 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-md cursor-pointer"
              >
                Validar
              </button>
            </div>
          </div>

          {resultadoValidacaoQR && (
            <div
              className={`p-4 rounded-2xl border text-xs space-y-3 ${
                resultadoValidacaoQR.valido
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-100'
                  : 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-100'
              }`}
            >
              <div className="flex items-center gap-2 font-black text-sm">
                {resultadoValidacaoQR.valido ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    PASSE VIRTUAL AUTORIZADO!
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-5 h-5 text-rose-600" />
                    PASSE INVÁLIDO OU EXPIRADO
                  </>
                )}
              </div>

              {resultadoValidacaoQR.passe && (
                <div className="space-y-1.5 p-3 rounded-xl bg-white/70 dark:bg-slate-900/70 border border-current/10 font-medium">
                  <div>Visitante: <span className="font-bold">{resultadoValidacaoQR.passe.visitante_nome}</span></div>
                  <div>Destino: <span className="font-bold">{resultadoValidacaoQR.passe.unidade_bloco}</span></div>
                  <div>Morador(a): <span className="font-bold">{resultadoValidacaoQR.passe.morador_nome}</span></div>
                  <div>Validade: <span className="font-bold">{resultadoValidacaoQR.passe.data_validade} ({resultadoValidacaoQR.passe.hora_inicio} às {resultadoValidacaoQR.passe.hora_fim})</span></div>
                  {resultadoValidacaoQR.passe.observacoes && (
                    <div>Nota: {resultadoValidacaoQR.passe.observacoes}</div>
                  )}
                </div>
              )}

              {resultadoValidacaoQR.valido && (
                <button
                  type="button"
                  onClick={handleLiberarPasseValidado}
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-md cursor-pointer"
                >
                  Liberar Entrada Imediata no Sistema
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* ABA 4: GESTÃO DE PASSES VIRTUAIS */}
      {abaAtiva === 'passes' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Share2 className="w-5 h-5 text-indigo-500" />
                Passes Virtuais & Convites WhatsApp
              </h3>
              <p className="text-xs text-slate-500">
                Gere pré-autorizações para visitas ou eventos e envie diretamente para o WhatsApp do visitante
              </p>
            </div>
            <button
              type="button"
              onClick={() => setModalNovoPasse(true)}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold cursor-pointer"
            >
              + Gerar Novo Passe
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {passesVirtuais.map(p => (
              <div
                key={p.id}
                className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-purple-100 text-purple-800 dark:bg-purple-950/80 dark:text-purple-300">
                      {p.token}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400">
                      Válido: {p.data_validade}
                    </span>
                  </div>

                  <h4 className="font-black text-sm text-slate-900 dark:text-white leading-snug">
                    {p.visitante_nome}
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Destino: {p.unidade_bloco} ({p.morador_nome})
                  </p>

                  <div className="mt-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-850/60 text-[11px] space-y-1">
                    <div>Horário: <span className="font-bold">{p.hora_inicio} às {p.hora_fim}</span></div>
                    <div>Usos: <span className="font-bold">{p.usos_realizados} de {p.max_usos}</span></div>
                    {p.observacoes && <div className="text-slate-400">Nota: {p.observacoes}</div>}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <span className={`text-[10px] font-bold ${p.status === 'valido' ? 'text-emerald-500' : 'text-slate-400'}`}>
                    Status: {p.status.toUpperCase()}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleEnviarPasseWhats(p)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 text-xs font-bold cursor-pointer"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    Enviar WhatsApp
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ABA 5: HISTÓRICO DE AUDITORIA */}
      {abaAtiva === 'historico' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-500" />
                Histórico Cronológico de Entradas e Saídas
              </h3>
              <p className="text-xs text-slate-500">
                Auditoria de todas as movimentações de pessoas e veículos registradas na portaria
              </p>
            </div>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[550px] overflow-y-auto">
            {registros.map(reg => (
              <div key={reg.id} className="py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-slate-900 dark:text-white text-sm">
                      {reg.nome}
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold uppercase">
                      {reg.tipo}
                    </span>
                    {reg.veiculo_placa && (
                      <span className="text-[10px] font-mono font-bold text-emerald-600">
                        🚗 {reg.veiculo_placa}
                      </span>
                    )}
                  </div>
                  <div className="text-slate-500 text-[11px] mt-0.5">
                    Destino: {reg.unidade_bloco} • Entrada: {new Date(reg.data_hora_entrada).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({reg.ponto_acesso_entrada})
                    {reg.data_hora_saida && ` • Saída: ${new Date(reg.data_hora_saida).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      reg.status === 'presente' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {reg.status === 'presente' ? 'Dentro' : 'Saiu'}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    Op: {reg.operador_entrada_nome.split(' ')[0]}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ABA 6: LISTA DE BLOQUEIOS (BLACKLIST) */}
      {abaAtiva === 'blacklist' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-rose-500" />
                Lista de Bloqueios & Restrições de Segurança (Blacklist)
              </h3>
              <p className="text-xs text-slate-500">
                Pessoas e veículos não autorizados ou com alertas judiciais e disciplinares
              </p>
            </div>
            <button
              type="button"
              onClick={() => setModalNovoBloqueio(true)}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold cursor-pointer"
            >
              + Adicionar Bloqueio
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {blacklist.map(b => (
              <div
                key={b.id}
                className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-rose-200 dark:border-rose-900/60 shadow-xs space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="font-black text-sm text-rose-600 dark:text-rose-400">
                    {b.nome_ou_placa}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300">
                    {b.gravidade.toUpperCase()}
                  </span>
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-300 font-medium">{b.motivo}</p>
                <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800">
                  Registrado por: {b.registrado_por} • {new Date(b.criado_em).toLocaleDateString('pt-BR')}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL NOVO PASSE VIRTUAL */}
      {modalNovoPasse && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
              Gerar Passe Virtual / Convite de Acesso
            </h3>

            <form onSubmit={handleCriarPasse} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nome do Visitante / Convidado *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Nome de quem vai receber o passe"
                  value={formNovoPasse.visitante_nome}
                  onChange={e => setFormNovoPasse(prev => ({ ...prev, visitante_nome: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Unidade de Destino *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Torre A - Apto 304"
                  value={formNovoPasse.unidade_bloco}
                  onChange={e => setFormNovoPasse(prev => ({ ...prev, unidade_bloco: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Morador Anfitrião
                </label>
                <input
                  type="text"
                  placeholder="Nome do morador autorizador"
                  value={formNovoPasse.morador_nome}
                  onChange={e => setFormNovoPasse(prev => ({ ...prev, morador_nome: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Data Validade</label>
                  <input
                    type="date"
                    value={formNovoPasse.data_validade}
                    onChange={e => setFormNovoPasse(prev => ({ ...prev, data_validade: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Qtd Entradas</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={formNovoPasse.max_usos}
                    onChange={e => setFormNovoPasse(prev => ({ ...prev, max_usos: Number(e.target.value) }))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-center"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalNovoPasse(false)}
                  className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md cursor-pointer"
                >
                  Gerar e Salvar Passe
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL NOVO BLOQUEIO */}
      {modalNovoBloqueio && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-rose-500" />
              Adicionar Restrição / Bloqueio de Acesso
            </h3>

            <form onSubmit={handleSalvarBloqueio} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nome da Pessoa ou Placa do Veículo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: João da Silva ou Placa ABC-1234"
                  value={formBloqueio.nome_ou_placa}
                  onChange={e => setFormBloqueio(prev => ({ ...prev, nome_ou_placa: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Motivo da Restrição *
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Descreva a razão de segurança ou ordem judicial..."
                  value={formBloqueio.motivo}
                  onChange={e => setFormBloqueio(prev => ({ ...prev, motivo: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-medium resize-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nível de Gravidade
                </label>
                <select
                  value={formBloqueio.gravidade}
                  onChange={e => setFormBloqueio(prev => ({ ...prev, gravidade: e.target.value as any }))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold"
                >
                  <option value="bloqueio_total">Bloqueio Total (Entrada Barrada)</option>
                  <option value="alerta">Alerta Preventivo (Avisar Supervisor)</option>
                  <option value="chamar_policia">Crítico (Acionar Segurança / Polícia)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalNovoBloqueio(false)}
                  className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md cursor-pointer"
                >
                  Gravar Restrição
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
