import React, { useState, useMemo } from 'react';
import {
  BookOpen,
  Search,
  CheckCircle2,
  HelpCircle,
  Package,
  Key,
  QrCode,
  ShieldCheck,
  Repeat,
  Wrench,
  PackageCheck,
  ClipboardList,
  Layers,
  Database,
  History,
  UserCheck,
  Settings,
  Sparkles,
  Zap,
  ArrowRight,
  Shield,
  FileText,
  AlertTriangle,
  Play,
  X,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Smartphone,
  Eye,
  Check
} from 'lucide-react';

interface TutorialProps {
  onNavegarModulo?: (moduloId: string) => void;
  modulosDisponiveisIds?: string[];
  nomeCondominio?: string;
  eAdmin?: boolean;
  onAbrirGerenciadorModulos?: () => void;
}

interface ModuloInfo {
  id: string;
  tituloPadrao: string;
  categoria: 'acesso' | 'encomendas' | 'seguranca' | 'controles' | 'gestao';
  icone: any;
  corBg: string;
  corTexto: string;
  subtitulo: string;
  porQue: string;
  comoUtilizar: string[];
  casosDeUso: string[];
  dicasDeOuro: string[];
  perfisRecomendados: string[];
}

export const TUTORIAL_MODULOS: ModuloInfo[] = [
  {
    id: 'bancada',
    tituloPadrao: 'Bancada de Atendimento & Conferência',
    categoria: 'acesso',
    icone: Layers,
    corBg: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    corTexto: 'text-amber-500',
    subtitulo: 'A tela de trabalho central para atendimento rápido e conferência de acessos em tempo real.',
    porQue: 'A guarita é o ponto mais crítico e dinâmico do condomínio. Ter um painel unificado evita alternar entre dezenas de telas quando há filas de veículos ou entregadores aguardando liberação.',
    comoUtilizar: [
      '1. Digite o número da unidade, bloco ou placa do veículo no campo de busca rápida.',
      '2. O sistema exibe instantaneamente a foto do morador, dependentes cadastrados e restrições.',
      '3. Clique em "Liberar Entrada" ou "Registrar Saída" para gravar data e hora automáticos.',
      '4. Caso seja um visitante não cadastrado, clique em "Cadastrar Rápido" ou use o leitor OCR.'
    ],
    casosDeUso: [
      'Horário de pico com veículos em fila na clausura.',
      'Conferência rápida se um visitante está autorizado pelo morador.',
      'Consulta imediata de ramal ou contato do morador em caso de urgência.'
    ],
    dicasDeOuro: [
      'Utilize os atalhos de teclado para focar no campo de busca.',
      'Nunca libere acesso sem verificar se a unidade destino confere com o cadastro.'
    ],
    perfisRecomendados: ['Porteiro', 'Controlador de Acesso', 'Zelador']
  },
  {
    id: 'encomendas',
    tituloPadrao: 'Gestão de Encomendas & Triagem com IA',
    categoria: 'encomendas',
    icone: Package,
    corBg: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    corTexto: 'text-blue-500',
    subtitulo: 'Triagem inteligente por câmera com OCR Gemini, aviso automático via WhatsApp e baixa com assinatura touch.',
    porQue: 'O volume de e-commerce explodiu nos condomínios. Cadastrar pacotes manualmente gerava filas, erros de digitação e acusações de extravio. A IA lê em 2 segundos e a assinatura touch garante respaldo jurídico total.',
    comoUtilizar: [
      '1. Clique em "Receber Encomenda" e aponte a câmera para a etiqueta do pacote.',
      '2. A IA Google Gemini extrai automaticamente o destinatário, unidade e código de rastreio.',
      '3. Confirme o local onde o pacote foi guardado (ex: Prateleira B3, Chão, Caixa Grande).',
      '4. O sistema pode disparar aviso imediato no WhatsApp do morador cadastrado.',
      '5. Na retirada, o morador ou autorizado assina na tela do tablet ou celular para dar baixa segura.'
    ],
    casosDeUso: [
      'Chegada de vans do Mercado Livre, Amazon, Shopee ou Correios com dezenas de volumes.',
      'Retirada de pacotes por familiares com registro do nome de quem retirou.',
      'Identificação rápida de pacotes esquecidos há mais de 7 dias na portaria.'
    ],
    dicasDeOuro: [
      'Tire uma foto nítida da etiqueta bem iluminada para leitura instantânea da IA.',
      'Sempre exija a assinatura touch na tela antes de entregar o volume ao morador.'
    ],
    perfisRecomendados: ['Porteiro', 'Zelador', 'Síndico']
  },
  {
    id: 'chaves',
    tituloPadrao: 'Claviculário Digital & Quadro de Chaves',
    categoria: 'controles',
    icone: Key,
    corBg: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20',
    corTexto: 'text-indigo-500',
    subtitulo: 'Controle rigoroso de empréstimo e devolução de chaves de áreas comuns, técnicas e residenciais.',
    porQue: 'Perda de chaves mestras e chaves de elevador ou salão de festas gera custos altos de chaveiro e riscos graves de segurança. O registro com assinatura elimina o clássico "eu não peguei essa chave".',
    comoUtilizar: [
      '1. Localize a chave desejada pelo número do gancho ou nome da área (ex: Casa de Máquinas, Salão Gourmet).',
      '2. Clique em "Emprestar Chave" e selecione o tipo de recebedor (Morador, Prestador, Funcionário).',
      '3. Registre o nome completo e documento de quem está retirando.',
      '4. Colete a assinatura digital na tela e confirme a entrega.',
      '5. No retorno da chave, clique em "Registrar Devolução" com conferência visual.'
    ],
    casosDeUso: [
      'Técnico de elevador ou internet precisando da chave da sala de telecomunicações.',
      'Morador retirando a chave da churrasqueira reservada para o fim de semana.',
      'Corretor de imóveis retirando chave de unidade desocupada com autorização do proprietário.'
    ],
    dicasDeOuro: [
      'Verifique o painel de "Chaves em Atraso" a cada troca de turno.',
      'Nunca entregue chave de área restrita sem autorização prévia por escrito da administração.'
    ],
    perfisRecomendados: ['Porteiro', 'Zelador', 'Supervisor']
  },
  {
    id: 'rondas',
    tituloPadrao: 'Rondas Patrimoniais (NFC & QR Code)',
    categoria: 'seguranca',
    icone: QrCode,
    corBg: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
    corTexto: 'text-slate-300',
    subtitulo: 'Monitoramento em tempo real de vigilantes com tags físicas, geolocalização e alertas sonoros de atraso.',
    porQue: 'Garante que o vigilante realmente percorreu os pontos cegos e áreas críticas do condomínio nos horários previstos, inibindo invasões e falhas de vigilância.',
    comoUtilizar: [
      '1. O vigilante inicia a ronda no aplicativo em seu dispositivo móvel.',
      '2. Percorre a rota e aproxima o aparelho das tags físicas NFC ou escaneia os QR Codes fixados nos postos.',
      '3. O sistema valida data, horário e localização GPS automaticamente.',
      '4. Caso identifique uma irregularidade no caminho (lâmpada queimada, porta aberta), registra foto e observação.',
      '5. Se o intervalo entre postos exceder o limite programado, a guarita e o supervisor recebem alerta sonoro.'
    ],
    casosDeUso: [
      'Ronda noturna perimetral a cada 30 minutos em condomínio horizontal ou vertical.',
      'Inspeção preventiva de portões de garagem, casa de bombas e geradores.',
      'Auditoria de cumprimento de contrato para empresas terceirizadas de segurança.'
    ],
    dicasDeOuro: [
      'Em locais sem Wi-Fi, o app continua registrando os pontos offline e sincroniza ao retornar à guarita.',
      'Mantenha as tags NFC em locais protegidos de intempéries e com identificação discreta.'
    ],
    perfisRecomendados: ['Vigilante', 'Rondista', 'Supervisor de Segurança']
  },
  {
    id: 'passagem',
    tituloPadrao: 'Passagem de Posto (Troca de Plantão)',
    categoria: 'gestao',
    icone: Repeat,
    corBg: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20',
    corTexto: 'text-cyan-500',
    subtitulo: 'Checklist obrigatório de transmissão de serviço com validação mútua entre porteiros e relatório de pendências.',
    porQue: 'A troca de turno é o momento com maior risco de falha na portaria. O checklist garante que armamento, rádios, chaves pendentes e recados urgentes sejam passados formalmente, sem lacunas.',
    comoUtilizar: [
      '1. No final do turno, o operador de saída abre a tela de "Passagem de Posto".',
      '2. O sistema lista automaticamente encomendas pendentes, chaves não devolvidas e chamados abertos.',
      '3. O operador preenche o checklist de conferência física (câmeras, portões, rádio comunicador).',
      '4. Escreve recados ou ocorrências em andamento para o próximo colega.',
      '5. O operador que está assumindo o posto confere tudo e ambos assinam digitalmente na tela.'
    ],
    casosDeUso: [
      'Troca de turno das 06:00 / 18:00 (escala 12x36).',
      'Alerta de que há um prestador de serviço ainda trabalhando após o horário permitido.',
      'Informar que o interfone do Bloco B está em manutenção preventiva.'
    ],
    dicasDeOuro: [
      'Nunca assine a passagem de posto antes de verificar fisicamente o claviculário e o monitor de câmeras.',
      'O relatório fica gravado no histórico absoluto e pode ser consultado pelo síndico a qualquer momento.'
    ],
    perfisRecomendados: ['Porteiro', 'Controlador de Acesso', 'Supervisor']
  },
  {
    id: 'ocorrencias',
    tituloPadrao: 'Livro de Ocorrências Digital (Diário de Bordo)',
    categoria: 'seguranca',
    icone: BookOpen,
    corBg: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
    corTexto: 'text-rose-500',
    subtitulo: 'Registro oficial de incidentes, barulho, descumprimento do regimento e emergências com fotos e anexos.',
    porQue: 'Substitui o antigo caderno de capa preta rasurado ou que podia ser extraviado. O registro digital é cronológico, auditável e imutável, servindo de prova para notificações e multas pelo síndico.',
    comoUtilizar: [
      '1. Clique em "Nova Ocorrência" e selecione a categoria (Barulho, Vaga de Garagem, Danos, Animais, etc.).',
      '2. Indique a unidade infratora ou afetada e descreva os fatos de maneira estritamente técnica.',
      '3. Anexe fotos ou imagens comprovatórias se aplicável.',
      '4. Classifique a severidade (Leve, Média, Grave, Urgente).',
      '5. O síndico e a administradora recebem notificação imediata do fato para providências.'
    ],
    casosDeUso: [
      'Reclamação de som alto após as 22h com medição relatada.',
      'Veículo estacionado em vaga de outro morador ou travando o trânsito da garagem.',
      'Vazamento de água em área comum ou queda de energia no gerador.'
    ],
    dicasDeOuro: [
      'Mantenha a descrição neutra, sem juízo de valor pessoal, citando horários e nomes exatos.',
      'Em caso de infração continuada, registre as tentativas de contato e a resposta obtida.'
    ],
    perfisRecomendados: ['Porteiro', 'Zelador', 'Síndico', 'Supervisor']
  },
  {
    id: 'prestadores',
    tituloPadrao: 'Controle de Prestadores & Obras',
    categoria: 'acesso',
    icone: UserCheck,
    corBg: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
    corTexto: 'text-purple-500',
    subtitulo: 'Cadastro de operários, empreiteiros e técnicos com validação de horários de barulho e crachás.',
    porQue: 'Obras geram tráfego intenso de pessoas desconhecidas no condomínio. Controlar entrada/saída, ferramentas e respeito aos horários da convenção evita furtos e desconforto aos moradores.',
    comoUtilizar: [
      '1. Ao chegar o prestador, solicite documento de identificação e unidade destino.',
      '2. O sistema verifica se há autorização prévia cadastrada pelo morador daquela unidade.',
      '3. Verifique se o dia e horário atual são permitidos para obras segundo as regras do condomínio.',
      '4. Entregue o crachá de identificação e registre as ferramentas pesadas de alto valor se necessário.',
      '5. Na saída, confirme a devolução do crachá e registre o horário.'
    ],
    casosDeUso: [
      'Reforma completa em apartamento com equipe de 5 pintores e eletricistas.',
      'Visita técnica de concessionária de luz, água ou gás.',
      'Jardineiros e piscineiros terceirizados do próprio condomínio.'
    ],
    dicasDeOuro: [
      'Bloqueie a entrada se o horário do regimento para barulho já tiver expirado.',
      'Sempre confirme por interfone ou app caso o nome do prestador não conste na lista autorizada.'
    ],
    perfisRecomendados: ['Porteiro', 'Controlador de Acesso', 'Zelador']
  },
  {
    id: 'custodia',
    tituloPadrao: 'Custódia de Pertences & Volumes Retidos',
    categoria: 'controles',
    icone: PackageCheck,
    corBg: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    corTexto: 'text-emerald-500',
    subtitulo: 'Guarda temporária de objetos esquecidos, pertences de moradores e delivery sem recebedor.',
    porQue: 'Evita a desordem na guarita e acusações de sumiço de objetos deixados por moradores ou visitantes temporariamente.',
    comoUtilizar: [
      '1. Clique em "Registrar Item em Custódia" e descreva o objeto detalhadamente (ex: Mochila azul, Chaves de carro).',
      '2. Tire foto do item e identifique quem entregou e para quem é destinado.',
      '3. Na devolução, colete a assinatura de retirada com documento comprobatório.'
    ],
    casosDeUso: [
      'Chaves de carro esquecidas na churrasqueira ou salão de festas.',
      'Morador que deixou envelope para a secretária passar para retirar.',
      'Volume grande entregue para morador que avisou que chegará mais tarde.'
    ],
    dicasDeOuro: [
      'Nunca aceite em custódia itens de valor extremo não lacrados, dinheiro em espécie ou animais.',
      'Fotografe avarias pré-existentes no objeto no momento da entrada.'
    ],
    perfisRecomendados: ['Porteiro', 'Zelador']
  },
  {
    id: 'materiais',
    tituloPadrao: 'Materiais do Posto & Inventário',
    categoria: 'controles',
    icone: ClipboardList,
    corBg: 'bg-teal-500/10 text-teal-500 border-teal-500/20',
    corTexto: 'text-teal-500',
    subtitulo: 'Controle de empréstimo de carrinhos de compras, ferramentas, escadas e equipamentos do condomínio.',
    porQue: 'Carrinhos de compras e escadas desaparecem nos andares dos edifícios se não houver controle de quem pegou e quando deve devolver.',
    comoUtilizar: [
      '1. Selecione o material solicitado (ex: Carrinho de Compras nº 02, Escada de Alumínio).',
      '2. Identifique a unidade solicitante e o horário de saída.',
      '3. Acompanhe na lista os itens pendentes de devolução há mais de 1 hora.'
    ],
    casosDeUso: [
      'Morador descarregando compras do supermercado na garagem.',
      'Prestador precisando de escada para reparo no corredor.',
      'Zelador utilizando furadeira do inventário do condomínio.'
    ],
    dicasDeOuro: [
      'Estabeleça prazo máximo de uso para carrinhos de compras (ex: 40 minutos).',
      'Notifique a unidade se o carrinho não retornar ao local correto.'
    ],
    perfisRecomendados: ['Porteiro', 'Zelador']
  },
  {
    id: 'manutencao',
    tituloPadrao: 'Gestão de Manutenção Predial & O.S.',
    categoria: 'gestao',
    icone: Wrench,
    corBg: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
    corTexto: 'text-orange-500',
    subtitulo: 'Abertura, atribuição e acompanhamento de chamados preventivos e corretivos com fotos e prazos.',
    porQue: 'Centraliza as demandas de conserto e zeladoria, evitando que pedidos feitos de boca fiquem esquecidos.',
    comoUtilizar: [
      '1. Clique em "Abrir Chamado" e selecione o setor (Elétrica, Hidráulica, Elevadores, Portões, etc.).',
      '2. Descreva o problema e tire foto do defeito.',
      '3. Atribua ao zelador ou empresa contratada e defina a prioridade.',
      '4. Conforme o reparo for executado, o responsável atualiza o status para Concluído com foto do reparo.'
    ],
    casosDeUso: [
      'Portão da clausura com travamento intermitente.',
      'Lâmpada queimada na garagem do subsolo.',
      'Vazamento na casa de máquinas da piscina.'
    ],
    dicasDeOuro: [
      'Chamados de portões e segurança devem ter prioridade máxima (Emergência).',
      'Sempre anexe foto antes e depois do serviço executado.'
    ],
    perfisRecomendados: ['Zelador', 'Síndico', 'Porteiro']
  },
  {
    id: 'painel_sindico',
    tituloPadrao: 'Portal do Síndico & Dashboard Executivo',
    categoria: 'gestao',
    icone: ShieldCheck,
    corBg: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    corTexto: 'text-emerald-500',
    subtitulo: 'Visão macro e analítica para tomadas de decisão, relatórios e métricas de desempenho da portaria.',
    porQue: 'Dá ao síndico e à administradora transparência absoluta sobre tudo o que acontece no condomínio, sem precisar estar fisicamente na guarita.',
    comoUtilizar: [
      '1. Analise os gráficos de fluxo diário de visitantes e entregas.',
      '2. Verifique o índice de cumprimento de rondas dos vigilantes.',
      '3. Monitore chamados de manutenção em aberto e ordens de serviço pendentes.',
      '4. Exporte relatórios em PDF/Excel para prestação de contas na assembleia.'
    ],
    casosDeUso: [
      'Reunião mensal de prestação de contas com a administradora.',
      'Avaliação de eficiência da empresa terceirizada de portaria.',
      'Comprovação de ocorrências para aplicação de advertências ou multas regimentalmente.'
    ],
    dicasDeOuro: [
      'Acesse semanalmente para identificar gargalos operacionais no recebimento de encomendas.',
      'Utilize os filtros por período para comparar dados com meses anteriores.'
    ],
    perfisRecomendados: ['Síndico', 'Conselheiro', 'Administradora']
  },
  {
    id: 'historico_absoluto',
    tituloPadrao: 'Histórico Absoluto & Trilha de Auditoria',
    categoria: 'gestao',
    icone: History,
    corBg: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20',
    corTexto: 'text-indigo-500',
    subtitulo: 'Linha do tempo cronológica e imutável de todas as movimentações e operações realizadas.',
    porQue: 'Garante conformidade com a LGPD e respalda o condomínio juridicamente em caso de sinistros, furtos ou questionamentos judiciais.',
    comoUtilizar: [
      '1. Utilize os filtros avançados por Data, Módulo, Operador ou Unidade.',
      '2. Veja exatamente quem realizou cada ação, quando e qual foi o resultado.',
      '3. Registros de assinaturas digitais e fotos ficam preservados indefinidamente.'
    ],
    casosDeUso: [
      'Investigação de suposto extravio de encomenda reclamado por morador.',
      'Verificação de quem autorizou a entrada de determinado veículo na garagem.',
      'Auditoria de trocas de plantão dos últimos 30 dias.'
    ],
    dicasDeOuro: [
      'Os logs não podem ser alterados ou apagados por operadores comuns, garantindo integridade jurídica total.'
    ],
    perfisRecomendados: ['Síndico', 'Supervisor', 'Admin Geral']
  }
];

export default function TutorialOperacionalPorttoHub({
  onNavegarModulo,
  modulosDisponiveisIds = [],
  nomeCondominio = 'Condomínio',
  eAdmin = false,
  onAbrirGerenciadorModulos
}: TutorialProps) {
  const [busca, setBusca] = useState('');
  const [categoriaAtiva, setCategoriaAtiva] = useState<string>('todos');
  const [moduloExpandidoId, setModuloExpandidoId] = useState<string | null>('bancada');
  const [modalApresentacaoAberto, setModalApresentacaoAberto] = useState(false);
  const [slideAtual, setSlideAtual] = useState(0);

  const modulosFiltrados = useMemo(() => {
    return TUTORIAL_MODULOS.filter((mod) => {
      const bateCategoria = categoriaAtiva === 'todos' || mod.categoria === categoriaAtiva;
      const termo = busca.toLowerCase().trim();
      const bateBusca = !termo ||
        mod.tituloPadrao.toLowerCase().includes(termo) ||
        mod.subtitulo.toLowerCase().includes(termo) ||
        mod.porQue.toLowerCase().includes(termo) ||
        mod.comoUtilizar.some(p => p.toLowerCase().includes(termo)) ||
        mod.casosDeUso.some(c => c.toLowerCase().includes(termo));
      return bateCategoria && bateBusca;
    });
  }, [busca, categoriaAtiva]);

  const toggleModulo = (id: string) => {
    setModuloExpandidoId(prev => prev === id ? null : id);
  };

  const proximoSlide = () => {
    setSlideAtual(prev => (prev + 1) % TUTORIAL_MODULOS.length);
  };

  const slideAnterior = () => {
    setSlideAtual(prev => (prev - 1 + TUTORIAL_MODULOS.length) % TUTORIAL_MODULOS.length);
  };

  const moduloSlide = TUTORIAL_MODULOS[slideAtual];
  const IconeSlide = moduloSlide?.icone || BookOpen;

  return (
    <div className="space-y-6">
      {/* CARD PRINCIPAL DE APRESENTAÇÃO */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 border border-indigo-500/20 p-6 sm:p-8 text-white shadow-xl">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-16 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-semibold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>Manual Oficial & Guia Operacional</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Por que o PorttoHub foi criado e como utilizar cada módulo
            </h2>
            <p className="text-slate-300 text-sm leading-relaxed">
              O <strong>PorttoHub</strong> foi desenvolvido especificamente para resolver as 4 maiores vulnerabilidades de portarias: 
              <em> lentidão no atendimento</em>, <em>perda de encomendas</em>, <em>insegurança jurídica em trocas de plantão</em> e 
              <em> apagões de internet</em>. Aqui você encontra a apresentação detalhada de todas as rotinas, o porquê de cada procedimento e o passo a passo para porteiros, vigilantes e síndicos.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-2 text-xs text-slate-300">
              <div className="flex items-center gap-1.5 bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700/80">
                <Zap className="w-4 h-4 text-amber-400" />
                <span>Autonomia Offline de 3 Horas</span>
              </div>
              <div className="flex items-center gap-1.5 bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700/80">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span>OCR por IA Google Gemini</span>
              </div>
              <div className="flex items-center gap-1.5 bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700/80">
                <QrCode className="w-4 h-4 text-sky-400" />
                <span>NFC & QR Code em Rondas</span>
              </div>
              <div className="flex items-center gap-1.5 bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700/80">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Assinatura Touch Inviolável</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row lg:flex-col gap-3 shrink-0">
            <button
              onClick={() => {
                setSlideAtual(0);
                setModalApresentacaoAberto(true);
              }}
              className="flex items-center justify-center gap-2.5 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-bold text-xs sm:text-sm px-5 py-3 rounded-2xl shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>Modo Apresentação / Treinamento</span>
            </button>


          </div>
        </div>
      </div>

      {/* CONTROLES DE BUSCA E FILTROS */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Pesquise por qualquer função, dúvida ou rotina (ex: 'encomenda', 'assinatura', 'ronda atrasada', 'chave')..."
              className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-slate-100 placeholder-slate-400 transition"
            />
            {busca && (
              <button
                onClick={() => setBusca('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
              >
                Limpar
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none text-xs">
            <button
              onClick={() => setCategoriaAtiva('todos')}
              className={`px-3 py-1.5 rounded-xl font-medium whitespace-nowrap transition cursor-pointer ${
                categoriaAtiva === 'todos'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              Todos ({TUTORIAL_MODULOS.length})
            </button>
            <button
              onClick={() => setCategoriaAtiva('acesso')}
              className={`px-3 py-1.5 rounded-xl font-medium whitespace-nowrap transition cursor-pointer ${
                categoriaAtiva === 'acesso'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              Atendimento & Acesso
            </button>
            <button
              onClick={() => setCategoriaAtiva('encomendas')}
              className={`px-3 py-1.5 rounded-xl font-medium whitespace-nowrap transition cursor-pointer ${
                categoriaAtiva === 'encomendas'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              Triagem & Encomendas
            </button>
            <button
              onClick={() => setCategoriaAtiva('seguranca')}
              className={`px-3 py-1.5 rounded-xl font-medium whitespace-nowrap transition cursor-pointer ${
                categoriaAtiva === 'seguranca'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              Rondas & Segurança
            </button>
            <button
              onClick={() => setCategoriaAtiva('controles')}
              className={`px-3 py-1.5 rounded-xl font-medium whitespace-nowrap transition cursor-pointer ${
                categoriaAtiva === 'controles'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              Chaves & Materiais
            </button>
            <button
              onClick={() => setCategoriaAtiva('gestao')}
              className={`px-3 py-1.5 rounded-xl font-medium whitespace-nowrap transition cursor-pointer ${
                categoriaAtiva === 'gestao'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              Gestão & Síndico
            </button>
          </div>
        </div>
      </div>

      {/* LISTA EXPANSÍVEL DOS MÓDULOS (ACCORDION RICO) */}
      <div className="space-y-4">
        {modulosFiltrados.map((mod) => {
          const Icone = mod.icone;
          const expandido = moduloExpandidoId === mod.id;
          const disponivel = modulosDisponiveisIds.length === 0 || modulosDisponiveisIds.includes(mod.id);

          return (
            <div
              key={mod.id}
              className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                expandido
                  ? 'bg-white dark:bg-slate-900 border-indigo-500/40 shadow-lg'
                  : 'bg-white/70 dark:bg-slate-900/70 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              {/* Header do Card (clique para expandir) */}
              <div
                onClick={() => toggleModulo(mod.id)}
                className="p-4 sm:p-5 flex items-center justify-between gap-4 cursor-pointer select-none"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className={`p-3 rounded-2xl border shrink-0 ${mod.corBg}`}>
                    <Icone className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white truncate">
                        {mod.tituloPadrao}
                      </h3>
                      {!disponivel && (
                        <span className="text-[10px] bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2 py-0.5 rounded-md font-medium">
                          Desativado p/ este condomínio
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                      {mod.subtitulo}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hidden sm:inline-block">
                    {expandido ? 'Recolher' : 'Ver Detalhes & Porquês'}
                  </span>
                  <div className={`p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 transition-transform duration-200 ${
                    expandido ? 'rotate-90 text-indigo-500' : ''
                  }`}>
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              </div>

              {/* Conteúdo Expandido do Módulo */}
              {expandido && (
                <div className="px-4 pb-6 sm:px-6 pt-2 border-t border-slate-100 dark:border-slate-800/80 space-y-6 animate-fadeIn">
                  {/* O "PORQUÊ" */}
                  <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 space-y-1.5">
                    <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300 font-bold text-xs uppercase tracking-wide">
                      <HelpCircle className="w-4 h-4" />
                      <span>Por que este módulo existe? (Objetivo Operacional & Jurídico)</span>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                      {mod.porQue}
                    </p>
                  </div>

                  {/* Grid de 2 Colunas: Como Utilizar vs Casos de Uso */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    {/* Como Utilizar */}
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 space-y-3">
                      <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-xs uppercase tracking-wide">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        <span>Passo a Passo de Utilização na Guarita</span>
                      </div>
                      <div className="space-y-2 text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                        {mod.comoUtilizar.map((passo, idx) => (
                          <div key={idx} className="flex items-start gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 mt-2" />
                            <span>{passo}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Casos de Uso e Dicas */}
                    <div className="space-y-4">
                      {/* Casos do Cotidiano */}
                      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 space-y-2.5">
                        <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-xs uppercase tracking-wide">
                          <FileText className="w-4 h-4 text-sky-500" />
                          <span>Situações Reais do Dia a Dia</span>
                        </div>
                        <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                          {mod.casosDeUso.map((caso, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <span className="text-sky-500 font-bold">•</span>
                              <span>{caso}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Dicas de Ouro */}
                      <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 space-y-2">
                        <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold text-xs uppercase tracking-wide">
                          <AlertTriangle className="w-4 h-4" />
                          <span>Dicas de Ouro para a Equipe de Segurança</span>
                        </div>
                        <ul className="space-y-1 text-xs text-slate-700 dark:text-slate-300">
                          {mod.dicasDeOuro.map((dica, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <span className="text-amber-500 font-bold">✓</span>
                              <span>{dica}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Rodapé com Perfis e Botão de Acesso Direto */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                      <span>Perfis autorizados:</span>
                      <div className="flex flex-wrap gap-1">
                        {mod.perfisRecomendados.map((perfil, i) => (
                          <span key={i} className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium">
                            {perfil}
                          </span>
                        ))}
                      </div>
                    </div>

                    {onNavegarModulo && (
                      <button
                        onClick={() => onNavegarModulo(mod.id)}
                        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-bold px-4 py-2 rounded-xl shadow-xs transition-all cursor-pointer"
                      >
                        <span>Acessar Módulo</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {modulosFiltrados.length === 0 && (
          <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
            <Search className="w-10 h-10 text-slate-400 mx-auto" />
            <div className="font-bold text-slate-700 dark:text-slate-300">Nenhum módulo encontrado para a pesquisa</div>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Tente buscar por termos mais genéricos como "ronda", "encomenda", "chave", "plantão" ou limpe a busca.
            </p>
            <button
              onClick={() => { setBusca(''); setCategoriaAtiva('todos'); }}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300"
            >
              Resetar Filtros
            </button>
          </div>
        )}
      </div>

      {/* MODAL MODO APRESENTAÇÃO / SLIDESHOW DE TREINAMENTO */}
      {modalApresentacaoAberto && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 text-white rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Header do Slide */}
            <div className="p-4 sm:p-6 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl border ${moduloSlide.corBg}`}>
                  <IconeSlide className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      Módulo {slideAtual + 1} de {TUTORIAL_MODULOS.length}
                    </span>
                    <span className="text-xs text-slate-400 hidden sm:inline">• Treinamento PorttoHub</span>
                  </div>
                  <h3 className="text-lg sm:text-xl font-black text-white mt-0.5">
                    {moduloSlide.tituloPadrao}
                  </h3>
                </div>
              </div>

              <button
                onClick={() => setModalApresentacaoAberto(false)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Corpo do Slide */}
            <div className="p-6 sm:p-8 overflow-y-auto space-y-6 flex-1">
              <div className="p-4 rounded-2xl bg-indigo-950/40 border border-indigo-800/50 space-y-1">
                <div className="text-xs font-bold text-indigo-400 uppercase tracking-wide">
                  O "Porquê" & Finalidade Estratégica:
                </div>
                <p className="text-sm sm:text-base text-slate-200 leading-relaxed font-medium">
                  {moduloSlide.porQue}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-3 bg-slate-950/70 p-5 rounded-2xl border border-slate-800">
                  <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" /> Passo a Passo Prático
                  </h4>
                  <div className="space-y-2 text-xs sm:text-sm text-slate-300">
                    {moduloSlide.comoUtilizar.map((passo, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <span className="text-emerald-400 font-bold">{i + 1}.</span>
                        <span>{passo.replace(/^\d+\.\s*/, '')}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="bg-slate-950/70 p-5 rounded-2xl border border-slate-800 space-y-2">
                    <h4 className="text-xs font-bold text-sky-400 uppercase tracking-wider flex items-center gap-2">
                      <FileText className="w-4 h-4" /> Casos Comuns de Uso
                    </h4>
                    <ul className="space-y-1 text-xs text-slate-300">
                      {moduloSlide.casosDeUso.map((c, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-sky-400 font-bold">•</span>
                          <span>{c}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="bg-amber-950/30 p-4 rounded-2xl border border-amber-900/50 space-y-1">
                    <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" /> Dica de Segurança
                    </h4>
                    <p className="text-xs text-amber-200/90">
                      {moduloSlide.dicasDeOuro[0] || 'Sempre confira os dados antes de autorizar acessos.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer de Navegação do Slide */}
            <div className="p-4 sm:p-6 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
              <button
                onClick={slideAnterior}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Anterior</span>
              </button>

              <div className="flex items-center gap-1.5">
                {TUTORIAL_MODULOS.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setSlideAtual(i)}
                    className={`w-2.5 h-2.5 rounded-full transition-all ${
                      slideAtual === i ? 'w-6 bg-indigo-500' : 'bg-slate-700 hover:bg-slate-600'
                    }`}
                  />
                ))}
              </div>

              <button
                onClick={proximoSlide}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition cursor-pointer"
              >
                <span>Próximo</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
