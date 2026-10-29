# 🏢 PorttoHub — Sistema Integrado de Portaria & Segurança Condominial

<div align="center">

![PorttoHub Banner](https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80)

[![React 19](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS v4](https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![Google Gemini](https://img.shields.io/badge/Google_Gemini-2.5_Flash_OCR-8E75C2?style=for-the-badge&logo=google&logoColor=white)](https://ai.google.dev/)
[![Redis](https://img.shields.io/badge/Redis-Cache_Híbrido-DC382D?style=for-the-badge&logo=redis&logoColor=white)](https://redis.io/)
[![PWA Ready](https://img.shields.io/badge/PWA-Offline_First-5A0FC8?style=for-the-badge&logo=pwa&logoColor=white)](https://web.dev/progressive-web-apps/)
[![Docker](https://img.shields.io/badge/Docker-OCI_Deploy-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)

**Plataforma unificada para controle de acesso, rondas patrimoniais, encomendas com IA, gestão de chaves, livro de ocorrências e autonomia operacional em portarias condominiais.**

[Funcionalidades](#-funcionalidades-principais) • [Arquitetura](#-arquitetura-do-sistema) • [Instalação Local](#-instalação-e-execução-local) • [Variáveis de Ambiente](#-variáveis-de-ambiente) • [Banco de Dados](#-banco-de-dados--supabase--oci) • [Segurança](#-segurança-e-boas-práticas)

</div>

---

## 📋 Visão Geral

O **PorttoHub** é uma solução completa desenvolvida para modernizar a rotina operacional de portarias em condomínios residenciais e comerciais. O sistema substitui livros físicos de papel e sistemas legados lentos por uma interface ágil, intuitiva e resiliente, garantindo conformidade, rastreabilidade e segurança 24 horas por dia.

Projetado sob a filosofia **Offline-First**, o sistema conta com uma reserva de **autonomia de até 3 horas** sem internet através de IndexedDB local e sincronização automática em segundo plano assim que a conectividade for restabelecida.

---

## ✨ Funcionalidades Principais

### 🚀 Atendimento e Controle de Acesso
- **Bancada de Atendimento Rápido:** Consulta instantânea de moradores, veículos e autorizações com poucos toques.
- **Leitor de Documentos OCR (Gemini AI):** Captura instantânea e extração de dados de RG, CNH e documentos de visitantes via câmera integrada com processamento inteligente pelo modelo Google Gemini.
- **Controle de Prestadores de Serviço e Obras:** Registro de crachás, ferramentas, horários permitidos e vinculação à unidade responsável.

### 📦 Gestão de Encomendas & Triagem Expressa
- **OCR de Etiquetas de Pacotes:** Leitura automática de destinatário, código de rastreio e transportadora via câmera com IA.
- **Disparo de Avisos via WhatsApp:** Notificação imediata ao morador com registro de chegada.
- **Baixa com Assinatura Digital:** Coleta de assinatura touch na tela no momento da entrega do volume.

### 🛡️ Segurança Patrimonial & Rondas
- **Rondas com Checagem NFC e QR Code:** O vigilante realiza a leitura dos pontos de controle no condomínio com validação de geolocalização e horário.
- **Alerta de Rondas Atrasadas:** Notificação visual e sonora em caso de desvio no cronograma da ronda.
- **Gestão de Setores e Pontos Críticos:** Cadastro de rotas, áreas restritas e checklist de inspeção patrimonial.

### 🔑 Recursos Operacionais da Portaria
- **Claviculário Digital:** Empréstimo, devolução e controle de chaves de áreas comuns, técnicas e residenciais.
- **Custódia de Volumes e Pertences:** Registro de objetos perdidos ou deixados sob guarda da guarita.
- **Controle de Materiais e Equipamentos:** Empréstimo de carrinhos de compras, ferramentas e escadas.
- **Manutenção Predial:** Abertura e acompanhamento de chamados de emergência ou rotina.

### 📝 Governança, Passagem de Plantão e Auditoria
- **Passagem de Posto Inteligente:** Checklist obrigatório de troca de turno (armamento, rádio, câmeras, chaves pendentes) com assinatura do porteiro de saída e entrada.
- **Livro Negro / Ocorrências:** Registro detalhado com fotos, anexos e classificação de gravidade.
- **Painel do Síndico:** Dashboards executivos com métricas de fluxo, tempos de atendimento e relatórios analíticos.
- **Histórico Absoluto:** Trilha de auditoria cronológica e imutável para compliance e segurança jurídica.

---

## 🏛️ Arquitetura do Sistema

```
┌──────────────────────────────────────────────────────────────────┐
│                   Cliente PWA (React 19 + Vite)                  │
│  - Tailwind CSS v4             - Lucide Icons & Motion          │
│  - Leitor NFC / QR Code (jsQR) - Canvas de Assinatura Digital   │
│  - IndexedDB Storage           - Sincronizador de Fila Offline  │
└─────────────────────────────────┬────────────────────────────────┘
                                  │ Requisições HTTP / REST
                                  ▼
┌──────────────────────────────────────────────────────────────────┐
│                    Backend Node.js (Express API)                 │
│  - /api/ocr-documento & /api/ocr-etiqueta (Google Gemini 2.5)   │
│  - /api/cache/* (Gestão e Benchmark do Cache Redis)             │
│  - /api/github-versao (Auditoria de Deploy e Versões)           │
└──────────────────┬─────────────────────────────┬─────────────────┘
                   │                             │
                   ▼                             ▼
┌────────────────────────────────────┐ ┌───────────────────────────┐
│        Supabase / PostgreSQL       │ │    Camada de Cache Redis  │
│  - PostgreSQL 16 com RLS           │ │  - IORedis (Cluster/URL)  │
│  - PostgREST REST API              │ │  - Fallback in-memory     │
│  - Supabase Storage (Fotos/Comprov)│ │    ultra-rápido (< 5ms)   │
└────────────────────────────────────┘ └───────────────────────────┘
```

---

## 💻 Tecnologias Empregadas

| Camada | Tecnologia | Propósito |
|---|---|---|
| **Frontend** | React 19, TypeScript, Vite 8 | Interface reativa, modular e de altíssimo desempenho |
| **Estilização** | Tailwind CSS v4 | Design moderno, responsivo e adaptável a temas alto contraste |
| **Inteligência Artificial** | Google GenAI SDK (`@google/genai`) | Extração estruturada de dados em documentos e etiquetas |
| **Backend & Servidor** | Express 4, Node.js (`tsx`) | API intermediária para IA, controle de cache e SSR |
| **Banco de Dados** | Supabase PostgreSQL 16 | Armazenamento relacional com suporte a Row Level Security (RLS) |
| **Deploy Alternativo** | Docker Compose + PostgREST | Implantação autônoma self-hosted na Oracle Cloud (OCI Always Free) |
| **Cache & Performance** | Redis + IORedis | Aceleração de consultas e desoneração do banco |
| **PWA & Offline** | Service Worker, Manifest, IndexedDB | Autonomia operacional de até 3 horas sem sinal de internet |

---

## 🚀 Instalação e Execução Local

### Pré-requisitos
- **Node.js** >= 20.x ou **Bun** >= 1.1
- **Git** instalado
- Chave de API do **Google Gemini** ([Google AI Studio](https://aistudio.google.com/))
- Instância do **Supabase** ou PostgreSQL local configurada

### Passo a Passo

1. **Clone o repositório:**
   ```bash
   git clone https://github.com/grupocaetanodigital-creator/PorttoHub.git
   cd PorttoHub
   ```

2. **Instale as dependências:**
   ```bash
   # Com npm
   npm install

   # Ou com bun (recomendado)
   bun install
   ```

3. **Configure as variáveis de ambiente:**
   ```bash
   cp .env.example .env
   ```
   *Edite o arquivo `.env` e preencha com suas credenciais seguras.*

4. **Inicie o servidor de desenvolvimento:**
   ```bash
   npm run dev
   # ou
   bun run dev
   ```

5. **Acesse a aplicação:**
   Abra seu navegador em [http://localhost:3000](http://localhost:3000).

---

## 🔐 Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto com base na tabela abaixo:

| Variável | Obrigatória | Descrição | Exemplo |
|---|:---:|---|---|
| `GEMINI_API_KEY` | **Sim** | Chave de API para o serviço de OCR e Inteligência Artificial do Google | `AIzaSy...` |
| `VITE_SUPABASE_URL` | **Sim** | URL da sua instância Supabase (ou PostgREST) | `https://xyz.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | **Sim** | Chave pública anônima do Supabase | `eyJhbGciOi...` |
| `REDIS_URL` | Não | Conexão com Redis *(se não informada, usa fallback em memória)* | `redis://default:senha@localhost:6379` |
| `PORT` | Não | Porta do servidor Express (padrão: `3000`) | `3000` |
| `APP_URL` | Não | URL pública do app para links e webhooks | `https://porttohub.seucondominio.com` |

> ⚠️ **Atenção:** Nunca versione o arquivo `.env` no Git. Ele já está incluído no `.gitignore`.

---

## 🗄️ Banco de Dados & Configuração

O PorttoHub suporta dois modos de operação para persistência:

### Opção 1: Supabase (Recomendado para Produção em Nuvem)
1. Crie um novo projeto no [Supabase Dashboard](https://supabase.com).
2. Acesse o **SQL Editor** no painel do Supabase.
3. Execute o script `supabase_schema.sql` para criar as tabelas operacionais (moradores, veículos, chaves, encomendas, rondas, passagens de posto).
4. Em caso de atualizações de permissões e triggers, execute `supabase_setup_and_repairs.sql`.
5. Copie a **URL** e a **Anon Key** do projeto para o `.env`.

### Opção 2: Oracle Cloud Infrastructure (OCI Always Free — Self-Hosted)
O repositório já contém scripts automatizados para executar uma instância completa de PostgreSQL 16 + PostgREST na camada gratuita da Oracle Cloud:

```bash
# Executar na VM da Oracle Cloud:
chmod +x ./scripts/instalar_oci.sh
./scripts/instalar_oci.sh
```

A stack iniciará os serviços via Docker Compose com limites otimizados de memória RAM (< 150MB no total).

---

## 📁 Estrutura de Diretórios

```
PorttoHub/
├── public/                 # Assets públicos, ícones PWA e Service Worker (sw.js)
├── scripts/                # Scripts de automação, testes de integridade e deploy OCI
│   ├── docker-compose.oci.yml
│   ├── instalar_oci.sh
│   └── test-crud-and-columns.ts
├── src/
│   ├── assets/             # Imagens e logotipos da aplicação
│   ├── components/         # Componentes reutilizáveis de interface
│   │   ├── CampoAssinaturaDigital.tsx  # Assinatura touch em canvas
│   │   ├── LeitorNFC.tsx               # Suporte a leitura NFC de rondas
│   │   ├── ModalLeitorDocumentoOCR.tsx # Modal de captura e OCR com IA
│   │   └── ...
│   ├── hooks/              # Custom React Hooks (PWA install, online status, update)
│   ├── pages/              # Módulos principais (Bancada, Rondas, Chaves, etc.)
│   ├── server/             # Cliente Redis e adaptadores do backend
│   ├── services/           # Lógica de negócio, integrações e sincronização
│   │   ├── documentOcrService.ts    # Conexão com Gemini AI
│   │   ├── offlineSyncEngine.ts     # Fila e autonomia de 3h offline
│   │   ├── supabase.ts              # Cliente Supabase
│   │   └── permissoesService.ts     # RBAC (Porteiro, Síndico, Zelador)
│   ├── App.tsx             # Componente raiz e navegação do sistema
│   ├── index.css           # Configurações do Tailwind CSS v4
│   └── main.tsx            # Ponto de entrada do React
├── server.ts               # Servidor Express Full-Stack com rotas de API
├── supabase_schema.sql     # DDL completo das tabelas e políticas RLS
└── package.json            # Dependências e scripts do projeto
```

---

## 🛡️ Segurança e Boas Práticas

### Recomendações Críticas para este Repositório:
1. **Revogação de Tokens do GitHub:** Se algum token pessoal (`ghp_...`) tiver sido compartilhado em URLs ou histórico do git, acesse imediatamente as [Configurações de Tokens do GitHub](https://github.com/settings/tokens) e revogue a chave.
2. **Eliminação de Fallbacks Hardcoded:** No arquivo `server.ts` e serviços, remova URLs e chaves estáticas do código-fonte, exigindo sempre que venham de `process.env`.
3. **Senhas do PostgreSQL no Docker:** Altere as senhas padrão no arquivo `docker-compose.oci.yml` antes de subir o ambiente em servidores públicos.
4. **Row Level Security (RLS):** Mantenha as políticas de RLS ativas em todas as tabelas do Supabase para segregar os dados por condomínio (`condominio_id`).

---

## 📜 Scripts Disponíveis

| Comando | Descrição |
|---|---|
| `npm run dev` | Inicia o servidor Express com integração ao Vite em modo de desenvolvimento |
| `npm run build` | Compila o bundle do frontend para produção na pasta `dist` |
| `npm run start` | Inicia o servidor Node.js em produção |
| `npm run lint` | Executa a verificação estática de tipos com o TypeScript (`tsc --noEmit`) |
| `npx tsx scripts/test-supabase.ts` | Testa a conectividade e autenticação com o banco de dados |
| `npx tsx scripts/verify-all-tables.ts` | Valida se todas as tabelas e colunas necessárias existem no banco |

---

## 🤝 Contribuição & Suporte

1. Faça um Fork do projeto
2. Crie uma branch para a sua feature (`git checkout -b feature/nova-funcionalidade`)
3. Faça o commit das alterações (`git commit -m 'feat: adiciona leitor biométrico'`)
4. Faça o push para a branch (`git push origin feature/nova-funcionalidade`)
5. Abra um Pull Request

---

<div align="center">
Desenvolvido com foco em segurança, rapidez e confiabilidade para portarias condominiais.
</div>
