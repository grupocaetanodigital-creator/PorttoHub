import React, { useState, useEffect, useRef } from 'react';
import jsQR from 'jsqr';
import { supabase } from '../services/supabase';
import { uploadFotoComprimidaStorage } from '../services/imageUtils';
import LeitorNFC from '../components/LeitorNFC';
import { 
  ShieldCheck, 
  QrCode, 
  Play, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Plus, 
  Camera, 
  Flag,
  AlertTriangle,
  MessageCircle,
  ExternalLink,
  UserCheck,
  History,
  ArrowRightLeft,
  VideoOff,
  Check,
  Trash2,
  Scan,
  Radio,
  Lock,
  Unlock,
  RefreshCw,
  Smartphone,
  Settings,
  Sliders,
  ListChecks,
  Edit3
} from 'lucide-react';
import ModalGerenciarSetores from '../components/ModalGerenciarSetores';
import { SetorRonda, SETORES_RONDA_PADRAO, carregarSetoresRonda } from '../services/setoresRonda';

interface RondasProps {
  usuarioLogado?: any;
}

export default function Rondas({ usuarioLogado }: RondasProps) {
  const [loading, setLoading] = useState(false);
  const [uploadingFoto, setUploadingFoto] = useState(false);
  const [mensagem, setMensagem] = useState({ tipo: '', texto: '' });

  const inputFotoRef = useRef<HTMLInputElement | null>(null);
  const inputPlacaFotoRef = useRef<HTMLInputElement | null>(null);

  const nivelNum = Number(usuarioLogado?.nivel ?? usuarioLogado?.nivel_acesso);
  const perfilTexto = String(
    usuarioLogado?.perfil || 
    usuarioLogado?.tipo || 
    usuarioLogado?.role || 
    usuarioLogado?.funcao || 
    usuarioLogado?.login || 
    ''
  ).toLowerCase();

  const isOperadorNivel3 = 
    usuarioLogado?.nivel === 3 || 
    usuarioLogado?.nivel === '3' || 
    usuarioLogado?.nivel_acesso === 3 ||
    nivelNum === 3 ||
    (perfilTexto.includes('operador') && 
     !perfilTexto.includes('admin') && 
     !perfilTexto.includes('master') && 
     !perfilTexto.includes('sindico') && 
     !perfilTexto.includes('dev'));

  const podeGerenciarPontos = !isOperadorNivel3 && (
    usuarioLogado?.nivel === 0 || 
    usuarioLogado?.nivel === 1 || 
    usuarioLogado?.nivel === 2 || 
    usuarioLogado?.nivel_acesso === 0 ||
    usuarioLogado?.nivel_acesso === 1 ||
    usuarioLogado?.nivel_acesso === 2 ||
    (!isNaN(nivelNum) && nivelNum < 3) ||
    perfilTexto.includes('admin') ||
    perfilTexto.includes('adm') ||
    perfilTexto.includes('master') ||
    perfilTexto.includes('dev') ||
    perfilTexto.includes('sindico') ||
    perfilTexto.includes('supervisor')
  );

  const [operadorRondaAtual, setOperadorRondaAtual] = useState(
    usuarioLogado?.nome || usuarioLogado?.login || 'Vigia / Portaria'
  );

  const [listaOperadores, setListaOperadores] = useState<any[]>([]);
  const [pontos, setPontos] = useState<any[]>([]);
  const [rondaAtiva, setRondaAtiva] = useState<any | null>(null);
  const [registrosRonda, setRegistrosRonda] = useState<any[]>([]);
  const [historicoRondas, setHistoricoRondas] = useState<any[]>([]);

  const keyRondaAtiva = usuarioLogado?.condominio_id ? `infport_ronda_ativa_${usuarioLogado.condominio_id}` : 'infport_ronda_ativa';
  const keyUltimaRondaFim = usuarioLogado?.condominio_id ? `infport_ultima_ronda_fim_${usuarioLogado.condominio_id}` : 'infport_ultima_ronda_fim';

  const [setoresChecklist, setSetoresChecklist] = useState<SetorRonda[]>(SETORES_RONDA_PADRAO);
  const [modalGerenciarSetores, setModalGerenciarSetores] = useState(false);

  const [respostasChecklist, setRespostasChecklist] = useState<Record<string, string>>({});

  const [modalNovoPonto, setModalNovoPonto] = useState(false);
  const [modalRegistrarPonto, setModalRegistrarPonto] = useState<any | null>(null);
  const [modalAssumirPosto, setModalAssumirPosto] = useState(false);
  const [whatsAppRelatorio, setWhatsAppRelatorio] = useState<{ texto: string; link: string } | null>(null);

  const [nomePonto, setNomePonto] = useState('');
  const [codigoTag, setCodigoTag] = useState('');
  const [descricaoPonto, setDescricaoPonto] = useState('');
  const [setorPonto, setSetorPonto] = useState('SETOR_A');
  const [coordsNovoPonto, setCoordsNovoPonto] = useState<{ lat: number; lng: number } | null>(null);

  // Estados para edição de ponto de ronda
  const [modalEditarPonto, setModalEditarPonto] = useState(false);
  const [pontoEmEdicao, setPontoEmEdicao] = useState<any | null>(null);
  const [editNomePonto, setEditNomePonto] = useState('');
  const [editCodigoTag, setEditCodigoTag] = useState('');
  const [editDescricaoPonto, setEditDescricaoPonto] = useState('');
  const [editSetorPonto, setEditSetorPonto] = useState('SETOR_A');
  const [coordsEditPonto, setCoordsEditPonto] = useState<{ lat: number; lng: number } | null>(null);

  const [codigoLido, setCodigoLido] = useState('');
  const [observacaoPonto, setObservacaoPonto] = useState('');
  const [fotoPontoUrl, setFotoPontoUrl] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  const [modalTestarNfc, setModalTestarNfc] = useState(false);
  const [modalLeitorNfcCadastro, setModalLeitorNfcCadastro] = useState(false);
  const [lendoQrCamera, setLendoQrCamera] = useState(false);
  const [pontoValidadoFisico, setPontoValidadoFisico] = useState(false);
  const [nfcDisponivel, setNfcDisponivel] = useState(false);
  const [nfcLendo, setNfcLendo] = useState(false);
  const [lendoNfcCadastro, setLendoNfcCadastro] = useState(false);
  const [lendoQrCadastro, setLendoQrCadastro] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<any>(null);
  const ndefReaderRef = useRef<any>(null);
  const videoCadastroRef = useRef<HTMLVideoElement | null>(null);
  const streamCadastroRef = useRef<MediaStream | null>(null);
  const scanIntervalCadastroRef = useRef<any>(null);

  const [operadorSelecionadoId, setOperadorSelecionadoId] = useState('');
  const [senhaLoginEntrante, setSenhaLoginEntrante] = useState('');
  const [ocorrenciasPlantao, setOcorrenciasPlantao] = useState('');
  const [pontoParaExcluir, setPontoParaExcluir] = useState<{ id: string; nome: string } | null>(null);

  useEffect(() => {
    if (!usuarioLogado?.condominio_id) return;

    carregarPontos();
    verificarRondaAtiva();
    carregarHistorico();
    carregarOperadores();
    carregarSetores();

    const handleSetoresAtualizados = (e: any) => {
      if (e.detail?.setores && Array.isArray(e.detail.setores)) {
        setSetoresChecklist(e.detail.setores);
      }
    };

    window.addEventListener('setores_ronda_atualizados', handleSetoresAtualizados);

    return () => {
      pararCameraQr();
      window.removeEventListener('setores_ronda_atualizados', handleSetoresAtualizados);
    };
  }, [usuarioLogado?.condominio_id]);

  const carregarSetores = async () => {
    try {
      const lista = await carregarSetoresRonda(usuarioLogado?.condominio_id);
      if (lista && lista.length > 0) {
        setSetoresChecklist(lista);
        if (!lista.some(s => s.id === setorPonto)) {
          setSetorPonto(lista[0].id);
        }
      }
    } catch (e) {
      console.error('Erro ao carregar setores:', e);
    }
  };

  const getObjetoSetor = (setorIdOuTitulo: string) => {
    if (!setorIdOuTitulo) return setoresChecklist[0] || { id: 'GERAL', titulo: 'Setor Geral', itens: [] };
    return (
      setoresChecklist.find(
        (item) => item.id === setorIdOuTitulo || item.titulo === setorIdOuTitulo
      ) || setoresChecklist[0] || { id: 'GERAL', titulo: 'Setor Geral', itens: [] }
    );
  };

  const getNomeSetor = (setorIdOuTitulo: string) => {
    const s = getObjetoSetor(setorIdOuTitulo);
    return s ? s.titulo : 'Setor Geral';
  };

  const calcularDistanciaMetros = (lat1: number | null, lon1: number | null, lat2: number | null, lon2: number | null) => {
    if (lat1 === null || lon1 === null || lat2 === null || lon2 === null) return null;
    const R = 6371000;
    const rad = (graus: number) => (graus * Math.PI) / 180;
    const dLat = rad(lat2 - lat1);
    const dLon = rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(rad(lat1)) * Math.cos(rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
  };

  const carregarOperadores = async () => {
    if (!usuarioLogado?.condominio_id) return;
    try {
      const { data, error } = await supabase
        .from('operadores')
        .select('*')
        .eq('condominio_id', usuarioLogado.condominio_id)
        .eq('ativo', true)
        .order('nome');

      if (error) throw error;
      setListaOperadores(data || []);
    } catch (err: any) {
      console.error('Erro ao carregar operadores:', err.message);
    }
  };

  const carregarPontos = async () => {
    if (!usuarioLogado?.condominio_id) return;
    try {
      const { data, error } = await supabase
        .from('rondas_pontos')
        .select('*')
        .eq('condominio_id', usuarioLogado.condominio_id)
        .order('nome_ponto');

      if (error) throw error;
      setPontos(data || []);
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: err.message });
    }
  };

  const verificarRondaAtiva = async () => {
    if (!usuarioLogado?.condominio_id) return;
    try {
      const { data, error } = await supabase
        .from('rondas_execucao')
        .select('*')
        .eq('condominio_id', usuarioLogado.condominio_id)
        .eq('status', 'Em Andamento')
        .maybeSingle();

      if (error) throw error;
      setRondaAtiva(data);

      if (data) {
        localStorage.setItem(keyRondaAtiva, 'true');
        if (data.operador_nome) setOperadorRondaAtual(data.operador_nome);
        carregarRegistrosRonda(data.id);
      } else {
        localStorage.setItem(keyRondaAtiva, 'false');
      }
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: err.message });
    }
  };

  const carregarRegistrosRonda = async (rondaId: string) => {
    try {
      const { data, error } = await supabase
        .from('rondas_registros')
        .select('*, rondas_pontos(*)')
        .eq('ronda_id', rondaId)
        .eq('condominio_id', usuarioLogado.condominio_id);

      if (error) throw error;
      setRegistrosRonda(data || []);
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: err.message });
    }
  };

  const carregarHistorico = async () => {
    if (!usuarioLogado?.condominio_id) return;
    try {
      const { data, error } = await supabase
        .from('rondas_execucao')
        .select('*')
        .eq('condominio_id', usuarioLogado.condominio_id)
        .neq('status', 'Em Andamento')
        .order('data_inicio', { ascending: false })
        .limit(15);

      if (error) throw error;
      setHistoricoRondas(data || []);
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: err.message });
    }
  };

  const capturarGPS = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => setMensagem({ tipo: 'erro', texto: 'Não foi possível capturar o GPS do aparelho.' }),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
  };

  const capturarGPSNovoPonto = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCoordsNovoPonto({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setMensagem({ tipo: 'sucesso', texto: 'GPS capturado para o novo ponto!' });
        },
        (err) => setMensagem({ tipo: 'erro', texto: 'Erro ao capturar GPS: ' + err.message }),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      setMensagem({ tipo: 'erro', texto: 'Dispositivo sem suporte para GPS.' });
    }
  };

  const uploadFoto = async (file: File | null) => {
    if (!file) return;
    setUploadingFoto(true);

    try {
      const { publicUrl, tamanhoOriginalKb, tamanhoComprimidoKb, taxaReducaoPct } = await uploadFotoComprimidaStorage({
        file,
        pasta: 'rondas_evidencias',
        maxWidth: 1000,
        maxHeight: 1000,
        qualidade: 0.75
      });

      setFotoPontoUrl(publicUrl);
      const detalheEconomia = taxaReducaoPct > 0 ? ` (${tamanhoOriginalKb}KB ➔ ${tamanhoComprimidoKb}KB, -${taxaReducaoPct}%)` : '';
      setMensagem({ tipo: 'sucesso', texto: `Foto capturada, comprimida e enviada com sucesso!${detalheEconomia}` });
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: 'Erro ao enviar foto: ' + err.message });
    } finally {
      setUploadingFoto(false);
    }
  };

  const liberarPontoValido = (tagLimpa: string, pontoAlvo: any, distanciaMetros: number | null) => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    pararCameraQr();
    pararLeitorNfc();

    if ('vibrate' in navigator) {
      try {
        navigator.vibrate([100, 50, 100]);
      } catch {
        // ignore
      }
    }

    setCodigoLido(tagLimpa);
    setPontoValidadoFisico(true);

    const infoDistancia = distanciaMetros !== null 
      ? `(GPS validado: ${distanciaMetros}m de precisão)` 
      : '(GPS conferido no local)';

    setMensagem({ 
      tipo: 'sucesso', 
      texto: `✅ Placa e Tag do ponto "${pontoAlvo.nome_ponto}" validadas com sucesso no local ${infoDistancia}! Checklist desbloqueado.` 
    });
  };

  const processarTagLida = (tagLidaBruta: string, pontoAlvo: any) => {
    if (!pontoAlvo) return;
    const tagLimpa = tagLidaBruta.trim().toUpperCase();
    const tagEsperada = pontoAlvo.codigo_tag?.trim().toUpperCase();

    if (tagLimpa !== tagEsperada) {
      setMensagem({ 
        tipo: 'erro', 
        texto: `🚨 Tag/QR lido (${tagLimpa}) NÃO corresponde a este ponto (${tagEsperada})! Aponte para a placa correta deste ponto.` 
      });
      if ('vibrate' in navigator) {
        try { navigator.vibrate([200, 100, 200]); } catch {}
      }
      return;
    }

    // VERIFICAÇÃO DE PROXIMIDADE GPS OBRIGATÓRIA NO MOMENTO DA LEITURA
    if (pontoAlvo.latitude && pontoAlvo.longitude) {
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const latAtual = pos.coords.latitude;
            const lngAtual = pos.coords.longitude;
            setCoords({ lat: latAtual, lng: lngAtual });

            const distanciaMetros = calcularDistanciaMetros(
              latAtual,
              lngAtual,
              pontoAlvo.latitude,
              pontoAlvo.longitude
            );

            const RAIO_MAXIMO_PERMITIDO = 50; // 50 metros de tolerância para o perímetro do ponto físico

            if (distanciaMetros !== null && distanciaMetros > RAIO_MAXIMO_PERMITIDO) {
              // BLOQUEIO ANTIFRAUDE: O ronda não está no local físico do ponto
              setPontoValidadoFisico(false);
              setCodigoLido('');
              setMensagem({
                tipo: 'erro',
                texto: `🚨 BLOQUEIO ANTIFRAUDE: Leitura detectada a ${distanciaMetros} metros de distância do local cadastrado (${pontoAlvo.nome_ponto})! É proibido validar fora do local. Desloque-se até o ponto físico para validar.`
              });
              if ('vibrate' in navigator) {
                try { navigator.vibrate([400, 150, 400]); } catch {}
              }
              return;
            }

            // Validado com sucesso dentro do perímetro
            liberarPontoValido(tagLimpa, pontoAlvo, distanciaMetros);
          },
          (err) => {
            console.warn('Erro ao obter GPS na leitura:', err);
            setMensagem({
              tipo: 'erro',
              texto: '🚨 GPS OBRIGATÓRIO: Ative a localização no seu celular para comprovar presença física no ponto.'
            });
          },
          { enableHighAccuracy: true, timeout: 8000 }
        );
        return;
      }
    }

    // Se o ponto não possui coordenadas cadastradas previamente
    capturarGPS();
    liberarPontoValido(tagLimpa, pontoAlvo, null);
  };

  const lerTagNfcParaCadastro = async () => {
    // Captura GPS no local simultaneamente
    capturarGPSNovoPonto();

    if (typeof window !== 'undefined' && 'NDEFReader' in window) {
      try {
        setLendoNfcCadastro(true);
        setMensagem({ tipo: '', texto: '' });
        const ndef = new (window as any).NDEFReader();
        await ndef.scan();

        ndef.onreading = (event: any) => {
          let tagLida = event.serialNumber || '';
          if (event.message && event.message.records) {
            for (const record of event.message.records) {
              if (record.recordType === 'text') {
                const textDecoder = new TextDecoder(record.encoding || 'utf-8');
                tagLida = textDecoder.decode(record.data);
                break;
              }
            }
          }
          if (tagLida) {
            setCodigoTag(tagLida.trim().toUpperCase());
            setLendoNfcCadastro(false);
            if ('vibrate' in navigator) {
              try { navigator.vibrate([100, 50, 100]); } catch {}
            }
            capturarGPSNovoPonto();
            setMensagem({
              tipo: 'sucesso',
              texto: `✅ Tag NFC lida com sucesso (${tagLida}) e geolocalização capturada no ponto!`
            });
          }
        };

        ndef.onreadingerror = () => {
          setMensagem({ tipo: 'erro', texto: 'Falha na leitura da Tag NFC. Aproxime a tag novamente.' });
          setLendoNfcCadastro(false);
        };
      } catch (err: any) {
        console.error('NFC erro:', err);
        setLendoNfcCadastro(false);
        setMensagem({ tipo: 'erro', texto: 'Não foi possível ativar o leitor NFC: ' + err.message });
      }
    } else {
      setMensagem({
        tipo: 'erro',
        texto: 'Web NFC não é suportado neste navegador. Use o Google Chrome no Android ou escaneie via QR Code.'
      });
    }
  };

  const iniciarCameraQrCadastro = async () => {
    capturarGPSNovoPonto();
    setLendoQrCadastro(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      streamCadastroRef.current = stream;
      if (videoCadastroRef.current) {
        videoCadastroRef.current.srcObject = stream;
        videoCadastroRef.current.setAttribute('playsinline', 'true');
        await videoCadastroRef.current.play();
      }

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      const barcodeDetector = ('BarcodeDetector' in window) 
        ? new (window as any).BarcodeDetector({ formats: ['qr_code'] }) 
        : null;

      if (scanIntervalCadastroRef.current) clearInterval(scanIntervalCadastroRef.current);

      scanIntervalCadastroRef.current = setInterval(async () => {
        if (!videoCadastroRef.current || videoCadastroRef.current.readyState < 2) return;
        try {
          let detected: string | null = null;
          if (barcodeDetector) {
            try {
              const codes = await barcodeDetector.detect(videoCadastroRef.current);
              if (codes && codes.length > 0) detected = codes[0].rawValue;
            } catch {}
          }
          if (!detected && ctx) {
            canvas.width = videoCadastroRef.current.videoWidth || 640;
            canvas.height = videoCadastroRef.current.videoHeight || 480;
            ctx.drawImage(videoCadastroRef.current, 0, 0, canvas.width, canvas.height);
            const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const qrResult = jsQR(imgData.data, canvas.width, canvas.height);
            if (qrResult?.data) detected = qrResult.data;
          }
          if (detected) {
            setCodigoTag(detected.trim().toUpperCase());
            pararCameraQrCadastro();
            capturarGPSNovoPonto();
            if ('vibrate' in navigator) {
              try { navigator.vibrate([100, 50, 100]); } catch {}
            }
            setMensagem({
              tipo: 'sucesso',
              texto: `✅ QR Code escaneado (${detected}) e coordenadas GPS capturadas no ponto!`
            });
          }
        } catch (e) {
          console.error('Frame cadastro error:', e);
        }
      }, 300);
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: 'Erro ao abrir câmera para cadastro: ' + err.message });
      setLendoQrCadastro(false);
    }
  };

  const pararCameraQrCadastro = () => {
    if (scanIntervalCadastroRef.current) {
      clearInterval(scanIntervalCadastroRef.current);
      scanIntervalCadastroRef.current = null;
    }
    if (streamCadastroRef.current) {
      streamCadastroRef.current.getTracks().forEach(t => t.stop());
      streamCadastroRef.current = null;
    }
    setLendoQrCadastro(false);
  };

  const iniciarLeitorNfc = async (pontoAlvo: any) => {
    if (typeof window !== 'undefined' && 'NDEFReader' in window) {
      setNfcDisponivel(true);
      try {
        const ndef = new (window as any).NDEFReader();
        ndefReaderRef.current = ndef;
        await ndef.scan();
        setNfcLendo(true);
        ndef.onreading = (event: any) => {
          let tagLida = event.serialNumber || '';
          if (event.message && event.message.records) {
            for (const record of event.message.records) {
              if (record.recordType === 'text') {
                const textDecoder = new TextDecoder(record.encoding || 'utf-8');
                tagLida = textDecoder.decode(record.data);
                break;
              }
            }
          }
          if (tagLida) {
            processarTagLida(tagLida, pontoAlvo);
          }
        };
      } catch (nfcErr) {
        console.log('NFC não disponível ou cancelado:', nfcErr);
        setNfcLendo(false);
      }
    } else {
      setNfcDisponivel(false);
    }
  };

  const pararLeitorNfc = () => {
    setNfcLendo(false);
    ndefReaderRef.current = null;
  };

  const iniciarCameraQr = async (pontoAlvo?: any) => {
    const alvo = pontoAlvo || modalRegistrarPonto;
    setLendoQrCamera(true);

    iniciarLeitorNfc(alvo);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
      }

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      const barcodeDetector = ('BarcodeDetector' in window) 
        ? new (window as any).BarcodeDetector({ formats: ['qr_code'] }) 
        : null;

      if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);

      scanIntervalRef.current = setInterval(async () => {
        if (!videoRef.current || videoRef.current.readyState < 2) return;

        try {
          let detectedCode: string | null = null;

          if (barcodeDetector) {
            try {
              const barcodes = await barcodeDetector.detect(videoRef.current);
              if (barcodes && barcodes.length > 0) {
                detectedCode = barcodes[0].rawValue;
              }
            } catch {
              // fallback to jsQR
            }
          }

          if (!detectedCode && ctx) {
            canvas.width = videoRef.current.videoWidth || 640;
            canvas.height = videoRef.current.videoHeight || 480;
            ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
            const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const qrResult = jsQR(imgData.data, canvas.width, canvas.height);
            if (qrResult && qrResult.data) {
              detectedCode = qrResult.data;
            }
          }

          if (detectedCode) {
            processarTagLida(detectedCode, alvo);
          }
        } catch (err) {
          console.error('Erro na leitura de frame:', err);
        }
      }, 300);

    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: 'Não foi possível acessar a câmera do dispositivo: ' + err.message });
      setLendoQrCamera(false);
    }
  };

  const pararCameraQr = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setLendoQrCamera(false);
  };

  const processarFotoPlacaQr = async (file: File | null) => {
    if (!file || !modalRegistrarPonto) return;
    try {
      const img = new Image();
      img.src = URL.createObjectURL(file);
      await img.decode();

      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(img, 0, 0);
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const qrResult = jsQR(imgData.data, canvas.width, canvas.height);

      if (qrResult && qrResult.data) {
        processarTagLida(qrResult.data, modalRegistrarPonto);
      } else {
        setMensagem({ tipo: 'erro', texto: 'Nenhum QR Code legível foi encontrado nesta foto. Aponte a câmera com nitidez.' });
      }
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: 'Falha ao processar imagem: ' + err.message });
    }
  };

  const abrirRegistroPonto = (ponto: any) => {
    setModalRegistrarPonto(ponto);
    setCodigoLido('');
    setPontoValidadoFisico(false);
    setObservacaoPonto('');
    setFotoPontoUrl('');
    capturarGPS();

    // Inicia a câmera e o leitor NFC automaticamente após renderizar o modal
    setTimeout(() => {
      iniciarCameraQr(ponto);
    }, 150);
  };

  const fecharModalRegistroPonto = () => {
    pararCameraQr();
    pararLeitorNfc();
    setModalRegistrarPonto(null);
    setPontoValidadoFisico(false);
  };

  const handleAtualizarChecklist = (itemNome: string, status: string) => {
    setRespostasChecklist(prev => ({
      ...prev,
      [itemNome]: status
    }));
  };

  const cadastrarPonto = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!podeGerenciarPontos) {
      setMensagem({ tipo: 'erro', texto: 'Apenas Administrador (ADM), Master ou Supervisor podem cadastrar pontos.' });
      return;
    }

    if (!nomePonto.trim() || !codigoTag.trim()) {
      setMensagem({ tipo: 'erro', texto: 'Preencha o nome do ponto e a Tag/QR Code.' });
      return;
    }

    if (!coordsNovoPonto?.lat || !coordsNovoPonto?.lng) {
      setMensagem({ tipo: 'erro', texto: 'Capture o GPS do ponto no local antes de salvar.' });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from('rondas_pontos')
        .insert([{
          condominio_id: usuarioLogado.condominio_id,
          nome_ponto: nomePonto.trim(),
          codigo_tag: codigoTag.trim().toUpperCase(),
          localizacao_descricao: descricaoPonto.trim(),
          setor_id: setorPonto,
          latitude: coordsNovoPonto.lat,
          longitude: coordsNovoPonto.lng
        }]);

      if (error) throw error;

      setNomePonto('');
      setCodigoTag('');
      setDescricaoPonto('');
      setSetorPonto('SETOR_A');
      setCoordsNovoPonto(null);
      setModalNovoPonto(false);
      carregarPontos();
      setMensagem({ tipo: 'sucesso', texto: 'Ponto cadastrado e vinculado ao setor com sucesso!' });
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: err.message });
    } finally {
      setLoading(false);
    }
  };

  const excluirPonto = (ponto: any) => {
    if (!podeGerenciarPontos) {
      setMensagem({ tipo: 'erro', texto: 'Operadores não têm permissão para excluir pontos de ronda.' });
      return;
    }
    setPontoParaExcluir({ id: ponto.id, nome: ponto.nome_ponto || 'Ponto de Ronda' });
  };

  const confirmarExclusaoPonto = async () => {
    if (!pontoParaExcluir) return;
    const { id, nome } = pontoParaExcluir;
    setPontoParaExcluir(null);
    setLoading(true);
    try {
      const { error } = await supabase
        .from('rondas_pontos')
        .delete()
        .eq('id', id)
        .eq('condominio_id', usuarioLogado.condominio_id);

      if (error) throw error;

      setMensagem({ tipo: 'sucesso', texto: `Ponto "${nome}" removido com sucesso!` });
      carregarPontos();
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: err.message });
    } finally {
      setLoading(false);
    }
  };

  const abrirEditarPonto = (ponto: any) => {
    setPontoEmEdicao(ponto);
    setEditNomePonto(ponto.nome_ponto || '');
    setEditCodigoTag(ponto.codigo_tag || '');
    setEditDescricaoPonto(ponto.localizacao_descricao || '');
    setEditSetorPonto(ponto.setor_id || (setoresChecklist[0]?.id || 'SETOR_A'));
    setCoordsEditPonto(
      ponto.latitude && ponto.longitude 
        ? { lat: Number(ponto.latitude), lng: Number(ponto.longitude) } 
        : null
    );
    setModalEditarPonto(true);
  };

  const capturarGPSEditPonto = () => {
    if (!navigator.geolocation) {
      setMensagem({ tipo: 'erro', texto: 'Geolocalização não suportada neste dispositivo.' });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoordsEditPonto({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude
        });
        setMensagem({ tipo: 'sucesso', texto: 'Coordenadas GPS do ponto atualizadas!' });
      },
      (err) => {
        setMensagem({ tipo: 'erro', texto: 'Erro ao obter GPS: ' + err.message });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const salvarEdicaoPonto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!podeGerenciarPontos || !pontoEmEdicao) return;
    if (!editNomePonto.trim() || !editCodigoTag.trim()) {
      setMensagem({ tipo: 'erro', texto: 'Nome do ponto e código TAG são obrigatórios.' });
      return;
    }

    setLoading(true);
    try {
      const updatePayload: any = {
        nome_ponto: editNomePonto.trim(),
        codigo_tag: editCodigoTag.trim().toUpperCase(),
        localizacao_descricao: editDescricaoPonto.trim(),
        setor_id: editSetorPonto
      };

      if (coordsEditPonto?.lat && coordsEditPonto?.lng) {
        updatePayload.latitude = coordsEditPonto.lat;
        updatePayload.longitude = coordsEditPonto.lng;
      }

      const { error } = await supabase
        .from('rondas_pontos')
        .update(updatePayload)
        .eq('id', pontoEmEdicao.id)
        .eq('condominio_id', usuarioLogado.condominio_id);

      if (error) throw error;

      setModalEditarPonto(false);
      setPontoEmEdicao(null);
      carregarPontos();
      setMensagem({ tipo: 'sucesso', texto: 'Ponto de ronda e setor pertencente atualizados com sucesso!' });
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: 'Erro ao atualizar ponto: ' + err.message });
    } finally {
      setLoading(false);
    }
  };

  const iniciarRonda = async () => {
    if (pontos.length === 0) {
      setMensagem({ tipo: 'erro', texto: 'Cadastre ao menos um ponto antes de iniciar.' });
      return;
    }
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('rondas_execucao')
        .insert([{
          condominio_id: usuarioLogado.condominio_id,
          operador_nome: operadorRondaAtual,
          status: 'Em Andamento',
          data_inicio: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;

      setRondaAtiva(data);
      setRegistrosRonda([]);
      setRespostasChecklist({});
      setWhatsAppRelatorio(null);

      localStorage.setItem(keyRondaAtiva, 'true');
      localStorage.removeItem(keyUltimaRondaFim);
      window.dispatchEvent(new CustomEvent('ronda_iniciada', { detail: { condominio_id: usuarioLogado.condominio_id } }));

      setMensagem({ tipo: 'sucesso', texto: 'Ronda iniciada!' });
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: err.message });
    } finally {
      setLoading(false);
    }
  };

  const confirmarLeituraPonto = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!pontoValidadoFisico || !codigoLido || !modalRegistrarPonto) {
      setMensagem({ tipo: 'erro', texto: 'A leitura do QR Code ou NFC da placa física no local é obrigatória!' });
      return;
    }

    if (codigoLido.trim().toUpperCase() !== modalRegistrarPonto.codigo_tag.toUpperCase()) {
      setMensagem({ tipo: 'erro', texto: `QR Code lido (${codigoLido}) não corresponde a este ponto (${modalRegistrarPonto.codigo_tag})!` });
      return;
    }

    if (!coords?.lat || !coords?.lng) {
      setMensagem({ tipo: 'erro', texto: 'GPS não identificado. Ative a localização no seu celular.' });
      return;
    }

    let textoAlertaForaArea = '';
    if (modalRegistrarPonto.latitude && modalRegistrarPonto.longitude) {
      const distanciaMetros = calcularDistanciaMetros(
        coords.lat,
        coords.lng,
        modalRegistrarPonto.latitude,
        modalRegistrarPonto.longitude
      );

      const DISTANCIA_MAXIMA = 50;

      if (distanciaMetros !== null && distanciaMetros > DISTANCIA_MAXIMA) {
        textoAlertaForaArea = `🚨 [TENTATIVA FORA DA ÁREA DESIGNADA: ${distanciaMetros}m de distância]`;
      }
    }

    setLoading(true);

    try {
      const observacaoFinal = [
        textoAlertaForaArea,
        observacaoPonto.trim()
      ].filter(Boolean).join(' - ') || 'Ponto verificado e checklist realizado.';

      const { error } = await supabase
        .from('rondas_registros')
        .insert([{
          ronda_id: rondaAtiva.id,
          ponto_id: modalRegistrarPonto.id,
          condominio_id: usuarioLogado.condominio_id,
          data_hora: new Date().toISOString(),
          latitude: coords.lat,
          longitude: coords.lng,
          foto_evidencia_url: fotoPontoUrl.trim() || '',
          observacao: observacaoFinal
        }]);

      if (error) throw error;

      fecharModalRegistroPonto();
      carregarRegistrosRonda(rondaAtiva.id);

      if (textoAlertaForaArea) {
        setMensagem({ tipo: 'erro', texto: `Ponto validado com alerta de localização divergente (${textoAlertaForaArea})!` });
      } else {
        setMensagem({ tipo: 'sucesso', texto: `Ponto "${modalRegistrarPonto.nome_ponto}" validado com sucesso!` });
      }
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: err.message });
    } finally {
      setLoading(false);
    }
  };

  const finalizarRonda = async () => {
    if (!rondaAtiva) return;
    setLoading(true);

    const dataFim = new Date();
    const pontosLidosIds = registrosRonda.map(r => r.ponto_id);
    const todosLidos = pontos.every(p => pontosLidosIds.includes(p.id));
    const statusFinal = todosLidos ? 'Concluída' : 'Incompleta';

    const lidosNomes = registrosRonda.map(r => {
      const nomePontoStr = r.rondas_pontos?.nome_ponto || 'Ponto';
      const horaStr = new Date(r.data_hora).toLocaleTimeString('pt-BR');
      const obsStr = r.observacao ? `\n    📝 Observação: ${r.observacao}` : '';
      return `• *${nomePontoStr}* (${horaStr})${obsStr}`;
    }).join('\n\n');

    const zeradosNomes = pontos.filter(p => !pontosLidosIds.includes(p.id)).map(p => `• ${p.nome_ponto}`).join('\n');
    const fotosEvidencias = registrosRonda.filter(r => r.foto_evidencia_url).map(r => `📷 *${r.rondas_pontos?.nome_ponto}*:\n${r.foto_evidencia_url}`).join('\n\n');

    const alertasForaArea = registrosRonda
      .filter(r => r.observacao && r.observacao.includes('TENTATIVA FORA DA ÁREA'))
      .map(r => `🚨 *${r.rondas_pontos?.nome_ponto}*: ${r.observacao}`)
      .join('\n');

    const itensComAvaria = Object.entries(respostasChecklist)
      .filter(([_, status]) => status === 'avaria')
      .map(([item]) => `⚠️ ${item}`)
      .join('\n');

    const resumoTexto = `🛡️ *RELATÓRIO PATRIMONIAL DE RONDA*\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n` +
      `👤 *Ronda/Operador:* ${operadorRondaAtual}\n` +
      `⏱️ *Início:* ${new Date(rondaAtiva.data_inicio).toLocaleString('pt-BR')}\n` +
      `🏁 *Fim:* ${dataFim.toLocaleString('pt-BR')}\n` +
      `📊 *Status:* ${statusFinal.toUpperCase()} (${registrosRonda.length}/${pontos.length})\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `✅ *PONTOS VALIDADOS COM OBSERVAÇÕES:*\n${lidosNomes || 'Nenhum'}\n\n` +
      (alertasForaArea ? `🚨 *ALERTAS DE VALIDAÇÃO FORA DA ÁREA:*\n${alertasForaArea}\n\n` : '') +
      (zeradosNomes ? `⚠️ *PONTOS ZERADOS / NÃO VISITADOS:*\n${zeradosNomes}\n\n` : '') +
      (itensComAvaria ? `🚨 *AVARIAS REGISTRADAS NO CHECKLIST:*\n${itensComAvaria}\n\n` : '') +
      (fotosEvidencias ? `📸 *EVIDÊNCIAS FOTOGRÁFICAS:*\n${fotosEvidencias}\n` : '');

    try {
      const { error } = await supabase
        .from('rondas_execucao')
        .update({
          status: statusFinal,
          data_fim: dataFim.toISOString(),
          pontos_totais: pontos.length,
          pontos_lidos: registrosRonda.length,
          resumo_detalhado: resumoTexto
        })
        .eq('id', rondaAtiva.id)
        .eq('condominio_id', usuarioLogado.condominio_id);

      if (error) throw error;

      localStorage.setItem(keyUltimaRondaFim, dataFim.toISOString());
      localStorage.setItem(keyRondaAtiva, 'false');
      window.dispatchEvent(new CustomEvent('ronda_finalizada', { detail: { condominio_id: usuarioLogado.condominio_id } }));

      setWhatsAppRelatorio({
        texto: resumoTexto,
        link: `https://wa.me/?text=${encodeURIComponent(resumoTexto)}`
      });

      setRondaAtiva(null);
      setRegistrosRonda([]);
      setRespostasChecklist({});
      carregarHistorico();
      setMensagem({
        tipo: 'sucesso',
        texto: 'Ronda finalizada com sucesso!'
      });
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: err.message });
    } finally {
      setLoading(false);
    }
  };

  const efetivarAssumirPosto = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!operadorSelecionadoId) {
      setMensagem({ tipo: 'erro', texto: 'Selecione o operador.' });
      return;
    }

    if (!senhaLoginEntrante.trim()) {
      setMensagem({ tipo: 'erro', texto: 'Digite a senha.' });
      return;
    }

    setLoading(true);

    try {
      const { data: opData, error: opError } = await supabase
        .from('operadores')
        .select('*')
        .eq('id', operadorSelecionadoId)
        .eq('condominio_id', usuarioLogado.condominio_id)
        .single();

      if (opError || !opData) throw new Error('Operador não encontrado.');
      if (opData.senha !== senhaLoginEntrante.trim()) throw new Error('Senha incorreta!');

      // UNIFICAÇÃO: Grava diretamente na tabela canônica 'passagens_posto'
      const agora = new Date();
      const dia = String(agora.getDate()).padStart(2, '0');
      const mes = String(agora.getMonth() + 1).padStart(2, '0');
      const ano = String(agora.getFullYear()).slice(-2);
      const codigoPas = `PAS:${dia}${mes}${ano}RONDA`;

      const { error: passError } = await supabase
        .from('passagens_posto')
        .insert([{
          condominio_id: usuarioLogado.condominio_id,
          codigo: codigoPas,
          operador_sainte_nome: operadorRondaAtual,
          operador_entrante_nome: opData.nome,
          observacoes: ocorrenciasPlantao.trim() || 'Troca rápida de ronda/posto realizada.',
          status: 'Concluída'
        }]);

      if (passError) throw passError;

      setOperadorRondaAtual(opData.nome);
      setOperadorSelecionadoId('');
      setSenhaLoginEntrante('');
      setOcorrenciasPlantao('');
      setModalAssumirPosto(false);

      setMensagem({ tipo: 'sucesso', texto: `Posto assumido por ${opData.nome}.` });
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: err.message });
    } finally {
      setLoading(false);
    }
  };

  const pontosLidosIds = registrosRonda.map(r => r.ponto_id);
  const pontosZerados = pontos.filter(p => !pontosLidosIds.includes(p.id));

  return (
    <div className="space-y-3">
      {/* Header Principal Compacto */}
      <div className="bg-slate-900 text-white p-2.5 sm:p-3 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 shadow-2xs border border-slate-800">
        <div>
          <span className="text-[9px] font-bold uppercase tracking-wider bg-slate-800 text-emerald-400 px-2 py-0.5 rounded flex items-center gap-1 w-fit">
            <UserCheck className="w-3 h-3" /> Ronda Ativo: {operadorRondaAtual}
          </span>
          <h3 className="font-bold text-sm sm:text-base mt-0.5 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" /> Controle de Rondas Patrimoniais
          </h3>
          <p className="text-[11px] text-slate-300">
            Validação por QR Code com Checklist do Setor, Foto e GPS.
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setModalTestarNfc(true)}
            className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-emerald-400 font-bold px-2.5 py-1.5 rounded-lg text-xs flex items-center gap-1 transition shadow-2xs"
            title="Abrir Leitor de Tags e Cartões NFC com Som e Validação"
          >
            <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" /> Leitor NFC
          </button>

          <button
            onClick={() => {
              carregarOperadores();
              setModalAssumirPosto(true);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-2.5 py-1.5 rounded-lg text-xs flex items-center gap-1 transition uppercase shadow-2xs"
          >
            <ArrowRightLeft className="w-3.5 h-3.5" /> Assumir Posto
          </button>

          {podeGerenciarPontos && (
            <button
              onClick={() => {
                setCoordsNovoPonto(null);
                setModalNovoPonto(true);
              }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-2.5 py-1.5 rounded-lg text-xs flex items-center gap-1 transition shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" /> Cadastrar Ponto
            </button>
          )}

          {!rondaAtiva ? (
            <button
              onClick={iniciarRonda}
              disabled={loading}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1 transition uppercase shadow-2xs"
            >
              <Play className="w-3.5 h-3.5" /> Iniciar Ronda
            </button>
          ) : (
            <button
              onClick={finalizarRonda}
              disabled={loading}
              className="bg-red-600 hover:bg-red-700 text-white font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1 transition uppercase shadow-2xs"
            >
              <Flag className="w-3.5 h-3.5" /> Finalizar Ronda
            </button>
          )}
        </div>
      </div>

      {whatsAppRelatorio && (
        <div className="bg-emerald-50 border border-emerald-400 p-2.5 sm:p-3 rounded-xl flex flex-col sm:flex-row justify-between items-center gap-2 shadow-2xs">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-6 h-6 text-emerald-600 flex-shrink-0" />
            <div>
              <strong className="font-bold text-emerald-900 text-xs">Relatório Detalhado Gerado!</strong>
              <p className="text-[11px] text-emerald-700">Envie o relatório com observações e fotos no grupo.</p>
            </div>
          </div>
          <a
            href={whatsAppRelatorio.link}
            target="_blank"
            rel="noreferrer"
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 transition uppercase shadow-2xs"
          >
            <MessageCircle className="w-3.5 h-3.5" /> Enviar no WhatsApp <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      )}

      {mensagem.texto && (
        <div className={`p-2.5 rounded-lg flex items-center gap-2 text-xs font-semibold ${
          mensagem.tipo === 'sucesso' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {mensagem.tipo === 'sucesso' ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
          {mensagem.texto}
        </div>
      )}

      {rondaAtiva && (
        <div className="bg-slate-950 text-white p-3 sm:p-3.5 rounded-xl space-y-2.5 border border-slate-800 shadow-2xs">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1.5 border-b border-slate-800 pb-2">
            <div>
              <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest block">Ronda Ativa</span>
              <p className="text-[11px] text-slate-300">
                Início: <strong>{new Date(rondaAtiva.data_inicio).toLocaleTimeString('pt-BR')}</strong> por <strong>{rondaAtiva.operador_nome}</strong>
              </p>
            </div>

            <span className="text-xs font-bold bg-slate-800 text-emerald-400 px-2.5 py-0.5 rounded-full border border-slate-700">
              {registrosRonda.length} de {pontos.length} Pontos Validados
            </span>
          </div>

          {pontosZerados.length > 0 && (
            <div className="bg-amber-950/60 border border-amber-800/80 p-2 rounded-lg text-[11px] text-amber-200 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 text-amber-400" />
              <span>Pontos pendentes para verificação: {pontosZerados.length}</span>
            </div>
          )}
        </div>
      )}

      <div className="bg-white rounded-xl p-3 sm:p-4 border border-slate-200 shadow-2xs space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2 flex-wrap gap-2">
          <h4 className="font-bold text-slate-800 text-xs sm:text-sm flex items-center gap-1.5">
            <QrCode className="w-4 h-4 text-blue-600" /> Pontos de Ronda Cadastrados
          </h4>
          <div className="flex items-center gap-1.5">
            {podeGerenciarPontos && (
              <button
                type="button"
                onClick={() => setModalGerenciarSetores(true)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-2.5 py-1 rounded-lg text-[11px] flex items-center gap-1 border border-slate-300 transition cursor-pointer"
                title="Configurar e gerenciar setores e checklists"
              >
                <Sliders className="w-3.5 h-3.5 text-blue-600" /> Configurar Setores ({setoresChecklist.length})
              </button>
            )}
            <span className="text-[11px] font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
              Total: {pontos.length}
            </span>
          </div>
        </div>

        {pontos.length === 0 ? (
          <div className="text-center py-6 text-slate-400 text-xs italic">
            Nenhum ponto de ronda cadastrado para este condomínio.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-2.5">
            {pontos.map((ponto) => {
              const lido = pontosLidosIds.includes(ponto.id);
              return (
                <div
                  key={ponto.id}
                  className={`p-3 rounded-xl border transition flex flex-col justify-between gap-2 shadow-2xs ${
                    lido ? 'bg-emerald-50/60 border-emerald-300' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-start justify-between gap-1.5">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                        {getNomeSetor(ponto.setor_id)}
                      </span>
                      {lido ? (
                        <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Validado
                        </span>
                      ) : (
                        <span className="text-[9px] font-bold text-slate-500 bg-slate-200 px-1.5 py-0.5 rounded">
                          Pendente
                        </span>
                      )}
                    </div>
                    <h5 className="font-bold text-slate-900 text-xs sm:text-sm">{ponto.nome_ponto}</h5>
                    <p className="text-[11px] text-slate-500 line-clamp-2">
                      {ponto.localizacao_descricao || 'Sem descrição adicional.'}
                    </p>
                    <div className="text-[10px] text-slate-400 flex items-center gap-1">
                      <QrCode className="w-3 h-3 text-slate-400" /> TAG: <code className="font-mono text-slate-600 font-bold">{ponto.codigo_tag}</code>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 pt-2 border-t border-slate-200/60">
                    {rondaAtiva && !lido && (
                      <button
                        onClick={() => abrirRegistroPonto(ponto)}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-1.5 px-2.5 rounded-lg text-xs flex items-center justify-center gap-1 transition shadow-2xs"
                      >
                        <Camera className="w-3.5 h-3.5" /> Validar Ponto
                      </button>
                    )}

                    {podeGerenciarPontos && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => abrirEditarPonto(ponto)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          title="Editar Ponto e Setor Pertencente"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => excluirPonto(ponto.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                          title="Excluir Ponto"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl p-3 sm:p-4 border border-slate-200 shadow-2xs space-y-3">
        <h4 className="font-bold text-slate-800 text-xs sm:text-sm flex items-center gap-1.5 border-b border-slate-100 pb-2">
          <History className="w-4 h-4 text-slate-600" /> Histórico de Rondas Recentes
        </h4>

        {historicoRondas.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-4 italic">Nenhuma ronda finalizada no histórico.</p>
        ) : (
          <div className="space-y-2">
            {historicoRondas.map((h) => (
              <div key={h.id} className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${
                      h.status === 'Concluída' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {h.status}
                    </span>
                    <span className="text-xs font-bold text-slate-800">{h.operador_nome}</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Início: {new Date(h.data_inicio).toLocaleString('pt-BR')} | Fim: {h.data_fim ? new Date(h.data_fim).toLocaleString('pt-BR') : '—'}
                  </p>
                </div>
                <div className="text-right text-xs font-semibold text-slate-600">
                  {h.pontos_lidos} / {h.pontos_totais} Pontos
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {modalNovoPonto && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Plus className="w-5 h-5 text-emerald-600" /> Novo Ponto de Ronda
              </h3>
              <button onClick={() => setModalNovoPonto(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={cadastrarPonto} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">Setor Pertencente *</label>
                  {podeGerenciarPontos && (
                    <button
                      type="button"
                      onClick={() => setModalGerenciarSetores(true)}
                      className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 transition cursor-pointer"
                    >
                      <Settings className="w-3 h-3" /> Configurar Setores
                    </button>
                  )}
                </div>
                <select
                  value={setorPonto}
                  onChange={(e) => setSetorPonto(e.target.value)}
                  className="w-full border rounded-xl p-2.5 text-xs text-slate-800 bg-slate-50 font-bold focus:bg-white focus:ring-1 focus:ring-blue-600"
                >
                  {setoresChecklist.map((s) => (
                    <option key={s.id} value={s.id}>{s.titulo}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nome do Ponto</label>
                <input
                  type="text"
                  placeholder="Ex: Hall da Torre A"
                  value={nomePonto}
                  onChange={(e) => setNomePonto(e.target.value)}
                  className="w-full border rounded-xl p-2.5 text-xs text-slate-800"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Código da Tag / Placa Física *
                </label>
                
                {/* Botão de Leitura de Tag / Cartão NFC com 1 Toque */}
                <div className="mb-2">
                  <button
                    type="button"
                    onClick={() => {
                      capturarGPSNovoPonto();
                      setModalLeitorNfcCadastro(true);
                    }}
                    className="w-full py-3.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition shadow-md bg-emerald-600 hover:bg-emerald-700 text-white active:scale-[0.98] uppercase tracking-wide cursor-pointer"
                  >
                    <Radio className="w-4 h-4 animate-pulse" />
                    📡 Ler Tag NFC ou QR Code com 1 Toque
                  </button>
                  <p className="text-[11px] text-slate-500 text-center mt-1">
                    Aproxime a tag física ou cartão NFC para capturar o código e coordenadas GPS do local automaticamente.
                  </p>
                </div>

                <input
                  type="text"
                  placeholder="Ex: TAG-HALL-A1 ou UID do chip NFC"
                  value={codigoTag}
                  onChange={(e) => setCodigoTag(e.target.value)}
                  className="w-full border rounded-xl p-2.5 text-xs text-slate-800 font-mono uppercase bg-slate-50"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Descrição do Local (Opcional)</label>
                <textarea
                  placeholder="Ex: Próximo à porta do elevador social."
                  value={descricaoPonto}
                  onChange={(e) => setDescricaoPonto(e.target.value)}
                  className="w-full border rounded-xl p-2.5 text-xs text-slate-800"
                  rows={2}
                />
              </div>

              {/* Caixa de Confirmação de GPS do Local */}
              <div className={`p-3.5 rounded-xl border flex flex-col gap-2 ${
                coordsNovoPonto 
                  ? 'bg-emerald-50/70 border-emerald-300' 
                  : 'bg-amber-50 border-amber-300'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {coordsNovoPonto ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                    )}
                    <span className="text-xs font-bold text-slate-800 block">
                      Localização GPS do Ponto (Obrigatória)
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={capturarGPSNovoPonto}
                    className="bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 text-[11px] font-bold px-3 py-1.5 rounded-lg transition shadow-2xs"
                  >
                    Atualizar GPS
                  </button>
                </div>

                <div className="text-[11px] text-slate-600">
                  {coordsNovoPonto ? (
                    <div className="space-y-0.5">
                      <p className="font-mono text-emerald-900 font-bold">
                        📍 Lat: {coordsNovoPonto.lat.toFixed(5)} | Lng: {coordsNovoPonto.lng.toFixed(5)}
                      </p>
                      <p className="text-[10px] text-emerald-700">
                        🛡️ Ponto georreferenciado! Qualquer leitura fora do raio de 50m será bloqueada por antifraude.
                      </p>
                    </div>
                  ) : (
                    <p className="text-amber-800 font-medium">
                      ⚠️ Você precisa estar no local físico exato para cadastrar as coordenadas GPS do ponto.
                    </p>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalNovoPonto(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700"
                >
                  {loading ? 'Salvando...' : 'Salvar Ponto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL EDITAR PONTO DE RONDA E SETOR PERTENCENTE */}
      {modalEditarPonto && pontoEmEdicao && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-blue-600" /> Editar Ponto de Ronda
              </h3>
              <button 
                onClick={() => {
                  setModalEditarPonto(false);
                  setPontoEmEdicao(null);
                }} 
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={salvarEdicaoPonto} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">Setor Pertencente *</label>
                  {podeGerenciarPontos && (
                    <button
                      type="button"
                      onClick={() => setModalGerenciarSetores(true)}
                      className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 transition cursor-pointer"
                    >
                      <Settings className="w-3 h-3" /> Configurar Setores
                    </button>
                  )}
                </div>
                <select
                  value={editSetorPonto}
                  onChange={(e) => setEditSetorPonto(e.target.value)}
                  className="w-full border rounded-xl p-2.5 text-xs text-slate-800 bg-slate-50 font-bold focus:bg-white focus:ring-1 focus:ring-blue-600"
                >
                  {setoresChecklist.map((s) => (
                    <option key={s.id} value={s.id}>{s.titulo}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nome do Ponto *</label>
                <input
                  type="text"
                  placeholder="Ex: Hall da Torre A"
                  value={editNomePonto}
                  onChange={(e) => setEditNomePonto(e.target.value)}
                  className="w-full border rounded-xl p-2.5 text-xs text-slate-800"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Código da Tag / Placa Física *
                </label>
                <input
                  type="text"
                  placeholder="Ex: TAG-HALL-A1 ou UID do chip NFC"
                  value={editCodigoTag}
                  onChange={(e) => setEditCodigoTag(e.target.value)}
                  className="w-full border rounded-xl p-2.5 text-xs text-slate-800 font-mono uppercase bg-slate-50"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Descrição do Local (Opcional)</label>
                <textarea
                  placeholder="Ex: Próximo à porta do elevador social."
                  value={editDescricaoPonto}
                  onChange={(e) => setEditDescricaoPonto(e.target.value)}
                  className="w-full border rounded-xl p-2.5 text-xs text-slate-800"
                  rows={2}
                />
              </div>

              {/* Caixa de Confirmação de GPS do Local */}
              <div className={`p-3.5 rounded-xl border flex flex-col gap-2 ${
                coordsEditPonto 
                  ? 'bg-blue-50/70 border-blue-200' 
                  : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-blue-600" />
                    <span className="text-xs font-bold text-slate-800 block">
                      Localização GPS do Ponto
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={capturarGPSEditPonto}
                    className="bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 text-[11px] font-bold px-3 py-1.5 rounded-lg transition shadow-2xs cursor-pointer"
                  >
                    Recapturar GPS Aqui
                  </button>
                </div>

                <div className="text-[11px] text-slate-600">
                  {coordsEditPonto ? (
                    <p className="font-mono text-blue-900 font-bold">
                      📍 Lat: {coordsEditPonto.lat.toFixed(5)} | Lng: {coordsEditPonto.lng.toFixed(5)}
                    </p>
                  ) : (
                    <p className="text-slate-500 italic">
                      Nenhuma coordenada salva ainda.
                    </p>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setModalEditarPonto(false);
                    setPontoEmEdicao(null);
                  }}
                  className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 text-xs font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 shadow-sm cursor-pointer"
                >
                  {loading ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modalRegistrarPonto && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest block">
                  {getNomeSetor(modalRegistrarPonto.setor_id)}
                </span>
                <h3 className="font-bold text-slate-900 text-base">
                  {modalRegistrarPonto.nome_ponto}
                </h3>
              </div>
              <button onClick={fecharModalRegistroPonto} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* ESTADO 1: AINDA NÃO ESCANEOU A PLACA FÍSICA NO LOCAL */}
            {!pontoValidadoFisico ? (
              <div className="space-y-4">
                <div className="bg-amber-50 border border-amber-300 rounded-xl p-3.5 flex items-start gap-3">
                  <Lock className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wide">
                      Checklist do Setor Bloqueado
                    </h4>
                    <p className="text-[11px] text-amber-700 leading-relaxed mt-0.5">
                      Para evitar fraudes, o checklist e a validação do ponto <strong>só serão liberados após a leitura da placa física</strong> no local.
                    </p>
                    <p className="text-[10px] font-mono text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded mt-1.5 w-fit">
                      Tag esperada: <strong>{modalRegistrarPonto.codigo_tag}</strong>
                    </p>
                  </div>
                </div>

                {/* Componente Nativo Web NFC + QR Code + Manual */}
                <LeitorNFC
                  titulo="Leitura da Tag / Placa do Ponto"
                  subtitulo={`Aproxime da tag NFC ou aponte a câmera para o QR Code da placa (${modalRegistrarPonto.nome_ponto})`}
                  codigoEsperado={modalRegistrarPonto.codigo_tag}
                  modoInline={true}
                  onTagLida={(codigoLido) => {
                    processarTagLida(codigoLido, modalRegistrarPonto);
                  }}
                />

                {/* Opção secundária: Foto física da placa */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    ref={inputPlacaFotoRef}
                    onChange={(e) => processarFotoPlacaQr(e.target.files ? e.target.files[0] : null)}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => inputPlacaFotoRef.current?.click()}
                    className="bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1.5 transition"
                  >
                    <Camera className="w-4 h-4 text-slate-500" /> Foto da Placa
                  </button>

                  <button
                    type="button"
                    onClick={fecharModalRegistroPonto}
                    className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              /* ESTADO 2: PLACA VALIDADA FISICAMENTE NO LOCAL -> LIBERA MENU DO SETOR E CHECKLIST */
              <form onSubmit={confirmarLeituraPonto} className="space-y-4">
                {/* Banner de Validação com Sucesso */}
                <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-3.5 flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-emerald-950 uppercase tracking-wide">
                        Placa Física Validada com Sucesso!
                      </h4>
                      <span className="text-[10px] font-bold bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded">
                        No Local
                      </span>
                    </div>
                    <p className="text-[11px] text-emerald-800 mt-0.5">
                      QR Code/NFC <strong>{codigoLido}</strong> conferido. Menu de itens do setor desbloqueado para conferência.
                    </p>
                  </div>
                </div>

                {/* Menu do Setor: Checklist de Itens */}
                <div className="border border-slate-200 bg-slate-50/50 p-3.5 rounded-xl space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-blue-600" />
                      Checklist do Setor: {getNomeSetor(modalRegistrarPonto.setor_id)}
                    </span>
                    <span className="text-[10px] font-semibold text-slate-500">
                      {getObjetoSetor(modalRegistrarPonto.setor_id).itens.length} itens
                    </span>
                  </div>

                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {getObjetoSetor(modalRegistrarPonto.setor_id).itens.map((item: string, idx: number) => {
                      const statusAtual = respostasChecklist[item] || 'ok';
                      return (
                        <div key={idx} className="flex items-center justify-between text-xs bg-white p-2 rounded-lg border border-slate-200 shadow-2xs">
                          <span className="text-slate-700 font-medium flex-1 pr-2">{item}</span>
                          <div className="flex gap-1">
                            <button
                              type="button"
                              onClick={() => handleAtualizarChecklist(item, 'ok')}
                              className={`px-2.5 py-1 rounded text-[10px] font-bold transition ${
                                statusAtual === 'ok' ? 'bg-emerald-600 text-white shadow-2xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                              }`}
                            >
                              OK
                            </button>
                            <button
                              type="button"
                              onClick={() => handleAtualizarChecklist(item, 'avaria')}
                              className={`px-2.5 py-1 rounded text-[10px] font-bold transition ${
                                statusAtual === 'avaria' ? 'bg-red-600 text-white shadow-2xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                              }`}
                            >
                              Avaria
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Foto de Evidência (Opcional) */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Foto de Evidência no Local (Opcional)</label>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    ref={inputFotoRef}
                    onChange={(e) => uploadFoto(e.target.files ? e.target.files[0] : null)}
                    className="hidden"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => inputFotoRef.current?.click()}
                      disabled={uploadingFoto}
                      className="bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-2 transition"
                    >
                      <Camera className="w-4 h-4" /> {uploadingFoto ? 'Enviando...' : 'Tirar Foto do Ponto'}
                    </button>
                    {fotoPontoUrl && (
                      <span className="text-xs font-bold text-emerald-600 flex items-center gap-1 bg-emerald-50 px-2 py-1 rounded border border-emerald-200">
                        <Check className="w-4 h-4" /> Foto Anexada
                      </span>
                    )}
                  </div>
                </div>

                {/* Observação */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Observação da Inspeção</label>
                  <textarea
                    placeholder="Ex: Tudo em perfeita ordem, luzes acesas, portão trancado."
                    value={observacaoPonto}
                    onChange={(e) => setObservacaoPonto(e.target.value)}
                    className="w-full border rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={2}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={fecharModalRegistroPonto}
                    className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-5 py-2.5 text-xs font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition flex items-center gap-1.5 shadow-md"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    {loading ? 'Salvando...' : 'Confirmar e Registrar Ponto'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {modalAssumirPosto && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-blue-600" /> Assumir Posto / Troca de Turno
              </h3>
              <button onClick={() => setModalAssumirPosto(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={efetivarAssumirPosto} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Operador Entrante</label>
                <select
                  value={operadorSelecionadoId}
                  onChange={(e) => setOperadorSelecionadoId(e.target.value)}
                  className="w-full border rounded-xl p-2.5 text-xs text-slate-800 bg-slate-50"
                  required
                >
                  <option value="">Selecione o operador...</option>
                  {listaOperadores.map((op) => (
                    <option key={op.id} value={op.id}>{op.nome} ({op.login})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Senha do Operador Entrante</label>
                <input
                  type="password"
                  placeholder="Digite a senha de confirmação"
                  value={senhaLoginEntrante}
                  onChange={(e) => setSenhaLoginEntrante(e.target.value)}
                  className="w-full border rounded-xl p-2.5 text-xs text-slate-800"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Ocorrências / Observações do Plantão</label>
                <textarea
                  placeholder="Ex: Tudo tranquilo durante o plantão."
                  value={ocorrenciasPlantao}
                  onChange={(e) => setOcorrenciasPlantao(e.target.value)}
                  className="w-full border rounded-xl p-2.5 text-xs text-slate-800"
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalAssumirPosto(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 text-xs font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700"
                >
                  {loading ? 'Confirmando...' : 'Assumir Posto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* MODAL LEITOR DE TESTE NFC LIVRE */}
      {modalTestarNfc && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full">
            <LeitorNFC
              titulo="Leitor de Tags & Cartões NFC"
              subtitulo="Aproxime qualquer tag, cartão de condomínio ou crachá para ler"
              onTagLida={(tagLida, dadosExtras) => {
                console.log('Tag NFC lida no teste:', tagLida, dadosExtras);
              }}
              onFechar={() => setModalTestarNfc(false)}
            />
          </div>
        </div>
      )}

      {/* MODAL LEITURA NFC / QR PARA NOVO PONTO */}
      {modalLeitorNfcCadastro && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full">
            <LeitorNFC
              titulo="Cadastrar Placa / Tag do Ponto"
              subtitulo="Aproxime a tag física NFC ou escaneie o QR Code para vincular ao ponto"
              onTagLida={(tagLida) => {
                setCodigoTag(tagLida);
                setModalLeitorNfcCadastro(false);
                capturarGPSNovoPonto();
                setMensagem({
                  tipo: 'sucesso',
                  texto: `✅ Tag (${tagLida}) lida e vinculada com sucesso! Coordenadas GPS capturadas.`
                });
              }}
              onFechar={() => setModalLeitorNfcCadastro(false)}
            />
          </div>
        </div>
      )}

      {/* MODAL CONFIGURAÇÃO E GESTÃO DE SETORES DE RONDA */}
      <ModalGerenciarSetores
        aberto={modalGerenciarSetores}
        onFechar={() => setModalGerenciarSetores(false)}
        condominioId={usuarioLogado?.condominio_id}
        pontosCadastrados={pontos}
        onSetoresAlterados={(novos) => {
          setSetoresChecklist(novos);
          if (!novos.some(s => s.id === setorPonto) && novos.length > 0) {
            setSetorPonto(novos[0].id);
          }
        }}
      />
    </div>
  );
}
