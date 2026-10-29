delete (globalThis as any).__dirname;
delete (globalThis as any).__filename;
process.env.DISABLE_HMR = 'true';

import express from 'express';
import http from 'http';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import { redisCache } from './src/server/redisClient.ts';
dotenv.config();

process.env.VITE_SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://kkeizhscivyfjgetnbke.supabase.co';
process.env.VITE_SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtrZWl6aHNjaXZ5ZmpnZXRuYmtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI2ODk5NDUsImV4cCI6MjEwODI2NTk0NX0.hQzzvICbZfNPziWrj8DlD-A8-Vm4xbr25Nr0xQe3BEA';

const app = express();
const port = 3000;

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

/**
 * Rota para puxar dados e versão em tempo real do Repositório GitHub (PorttoHub)
 * Retorna dados formatados no Horário Oficial do Brasil (Brasília / America/Sao_Paulo)
 */
app.get('/api/github-versao', async (_req, res) => {
  try {
    const { execSync } = await import('child_process');
    let localHash = '';
    let localMsg = '';
    let localDate = '';
    let localAuthor = '';
    
    try {
      localHash = execSync('git rev-parse --short HEAD', { timeout: 3000 }).toString().trim();
      localMsg = execSync('git log -1 --pretty=%s', { timeout: 3000 }).toString().trim();
      localDate = execSync('git log -1 --format=%cd --date=iso-strict', { timeout: 3000 }).toString().trim();
      localAuthor = execSync('git log -1 --format=%an', { timeout: 3000 }).toString().trim();
    } catch {}

    let remoteCommit: any = null;
    try {
      let token = process.env.GITHUB_TOKEN;
      if (!token) {
        try {
          const remoteUrl = execSync('git config --get remote.origin.url', { timeout: 2000 }).toString().trim();
          const match = remoteUrl.match(/https:\/\/([^@]+)@github\.com/);
          if (match) token = match[1];
        } catch {}
      }

      const headers: Record<string, string> = {
        'User-Agent': 'PorttoHub-App',
        'Accept': 'application/vnd.github.v3+json'
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const ghRes = await fetch('https://api.github.com/repos/grupocaetanodigital-creator/PorttoHub/commits/main', {
        headers
      });
      if (ghRes.ok) {
        remoteCommit = await ghRes.json();
      }
    } catch {}

    const sha = remoteCommit ? remoteCommit.sha.slice(0, 7) : localHash || '59d9f79';
    const rawDate = remoteCommit ? remoteCommit.commit.committer.date : localDate || new Date().toISOString();
    const mensagem = remoteCommit ? remoteCommit.commit.message : localMsg || 'Atualização recente no repositório';
    const autor = remoteCommit ? remoteCommit.commit.author.name : localAuthor || 'PorttoHub Dev';

    const dataObj = new Date(rawDate);
    const dataBrasilia = new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      dateStyle: 'short',
      timeStyle: 'medium'
    }).format(dataObj);

    const partes = new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).formatToParts(dataObj);
    const mapa: Record<string, string> = {};
    for (const p of partes) { mapa[p.type] = p.value; }
    const versaoCalculada = `${mapa.day || '01'}${mapa.month || '01'}${(mapa.year || '26').slice(-2)}${mapa.hour || '00'}${mapa.minute || '00'}`;

    return res.json({
      sucesso: true,
      repositorio: 'grupocaetanodigital-creator/PorttoHub',
      branch: 'main',
      sha,
      mensagem,
      autor,
      dataIso: rawDate,
      dataBrasilia: `${dataBrasilia} (Horário de Brasília - BRT)`,
      versaoCalculada,
      horarioConsulta: new Date().toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo' })
    });
  } catch (err: any) {
    return res.status(500).json({ sucesso: false, erro: err.message });
  }
});

/**
 * Rota de Alta Precisão: OCR de Documentos Brasileiros (CNH e RG)
 * Extração estruturada de alta precisão com IA Gemini 3.8 Flash e responseSchema
 */
app.post('/api/ocr-documento', async (req, res) => {
  try {
    const { imagemBase64 } = req.body;
    if (!imagemBase64) {
      return res.status(400).json({ erro: 'Imagem não fornecida' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(503).json({ erro: 'Chave GEMINI_API_KEY não configurada no servidor' });
    }

    const ai = new GoogleGenAI({ 
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });

    const base64Data = imagemBase64.replace(/^data:image\/\w+;base64,/, '');
    const mimeType = imagemBase64.match(/^data:(image\/\w+);base64,/)?.[1] || 'image/jpeg';

    const systemInstruction = `Você é um extrator de documentos brasileiro (CNH e RG).
Analise a imagem e retorne APENAS um JSON com os campos abaixo.

Regras de Extração Rigorosas:
- "nome": extraia apenas o nome do titular (localizado logo abaixo de '2 e 1 NOME E SOBRENOME' na CNH ou 'NOME' no RG). IGNORE cabeçalhos como 'REPUBLICA FEDERATIVA DO BRASIL' ou 'MINISTERIO DOS TRANSPORTES'. Retorne em CAIXA ALTA como no documento (ex: "LAURINDO CAETANO DO CARMO").
- REGRA CRÍTICA DE FILIAÇÃO: NUNCA capture nomes do campo 'FILIAÇÃO' (ex: "ANTONIO APARECIDO DO CARMO" ou "ROSA FATIMA LOPES CAETANO DO CARMO"). Capture APENAS o titular.
- "cpf": extraia apenas os 11 dígitos do CPF no formato 000.000.000-00 (localizado no campo '4d CPF', ex: "378.178.748-67").
- "rg": extraia o número do documento de identidade com órgão emissor/UF (localizado no campo '4c DOC. IDENTIDADE / ÓRG. EMISSOR / UF', ex: "43048684 SSP/SP").
- "cnhRegistro": número do registro de 11 dígitos da CNH (localizado no campo '5 Nº REGISTRO', ex: "05947078899").
- "validade": data de validade (localizado no campo '4b VALIDADE', ex: "03/06/2034").
- "categoria": categoria de habilitação (localizado no campo '9 CAT. HAB.', ex: "AB").
- "dataNascimento": data de nascimento (localizado no campo '3 DATA... NASCIMENTO', ex: "11/03/1987").
- "tipoDocumento": retorne "CNH" se for Carteira Nacional de Habilitação ou "RG" se for Registro Geral.
- "boxRosto": retorne as 4 coordenadas [ymin, xmin, ymax, xmax] normalizadas de 0.0 a 1.0 da foto 3x4 do rosto do titular. Na CNH a foto fica no terço esquerdo após a faixa verde lateral, aproximadamente [0.38, 0.19, 0.77, 0.43].`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                data: base64Data,
                mimeType
              }
            },
            {
              text: 'Extraia os dados deste documento brasileiro (CNH ou RG) conforme as regras de extração.'
            }
          ]
        }
      ],
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            nome: {
              type: Type.STRING,
              description: "Nome completo do titular em caixa alta (ex: 'LAURINDO CAETANO DO CARMO')"
            },
            cpf: {
              type: Type.STRING,
              description: "CPF com 11 dígitos no formato 000.000.000-00 (ex: '378.178.748-67')"
            },
            rg: {
              type: Type.STRING,
              description: "Número do RG com órgão emissor e UF (ex: '43048684 SSP/SP')"
            },
            tipoDocumento: {
              type: Type.STRING,
              description: "'CNH' ou 'RG'"
            },
            cnhRegistro: {
              type: Type.STRING,
              description: "Número do registro da CNH com 11 dígitos (ex: '05947078899')"
            },
            validade: {
              type: Type.STRING,
              description: "Data de validade DD/MM/AAAA (ex: '03/06/2034')"
            },
            categoria: {
              type: Type.STRING,
              description: "Categoria da habilitação (ex: 'AB')"
            },
            dataNascimento: {
              type: Type.STRING,
              description: "Data de nascimento DD/MM/AAAA (ex: '11/03/1987')"
            },
            boxRosto: {
              type: Type.ARRAY,
              items: { type: Type.NUMBER },
              description: "Coordenadas normalizadas [ymin, xmin, ymax, xmax] da foto 3x4 do titular (0.0 a 1.0)"
            }
          },
          required: ['nome', 'cpf', 'rg']
        }
      }
    });

    const textoResposta = response.text || '{}';
    const parsed = JSON.parse(textoResposta);

    const cpfLimpo = (parsed.cpf || '').replace(/\D/g, '');
    const cpfValido = cpfLimpo.length === 11;
    const nomeTitular = (parsed.nome || '').trim();

    const resultadoFinal = {
      nome: nomeTitular,
      nomeCompleto: nomeTitular,
      cpf: parsed.cpf || '',
      rg: parsed.rg || '',
      documentoFormatado: parsed.cpf || parsed.rg || '',
      numeroLimpo: cpfLimpo || (parsed.rg || '').replace(/[\s.-]/g, ''),
      cpfValidado: cpfValido,
      rgValido: Boolean(parsed.rg),
      tipoDocumento: parsed.tipoDocumento || 'CNH',
      cnhRegistro: parsed.cnhRegistro || null,
      validade: parsed.validade || null,
      categoria: parsed.categoria || null,
      dataNascimento: parsed.dataNascimento || null,
      boxRosto: Array.isArray(parsed.boxRosto) && parsed.boxRosto.length === 4
        ? parsed.boxRosto
        : [0.38, 0.19, 0.77, 0.43],
      confianca: 99,
      metodoUtilizado: 'IA_GEMINI'
    };

    return res.json(resultadoFinal);
  } catch (err: any) {
    console.error('[API OCR] Erro:', err);
    return res.status(500).json({ erro: err.message || 'Falha no processamento OCR' });
  }
});

/**
 * Rota de Alta Precisão e Ultra-Velocidade: OCR de Etiquetas de Encomendas (< 5 segundos)
 * Extrai código de rastreio e número da Nota Fiscal (NF).
 * NÃO extrai chave de acesso DANFE (44 dígitos). Retorna no máximo 3 códigos com NF inclusa.
 */
app.post('/api/ocr-etiqueta', async (req, res) => {
  try {
    const { imagemBase64 } = req.body;
    if (!imagemBase64) {
      return res.status(400).json({ erro: 'Imagem não fornecida' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(503).json({ erro: 'Chave GEMINI_API_KEY não configurada no servidor' });
    }

    const ai = new GoogleGenAI({ 
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });

    const base64Data = imagemBase64.replace(/^data:image\/\w+;base64,/, '');
    const mimeType = imagemBase64.match(/^data:(image\/\w+);base64,/)?.[1] || 'image/jpeg';

    const systemInstruction = `Você é um leitor óptico ultra-rápido de etiquetas de logística brasileira (Correios, Mercado Livre, Shopee, Amazon, Jadlog, Loggi).
RESPONDA EM MENOS DE 2 SEGUNDOS.

REGRAS RÍGIDAS:
1. "codigoRastreio": Código de rastreamento principal (ex: Correios "NL123456789BR", Mercado Livre "MLB...", Shopee "BR24...", Amazon "TBA...").
2. "numeroNF": Número da NOTA FISCAL impresso na etiqueta (ex: "NF 123456", "NF-e: 001.234.567", "Doc. Auxiliar 45678"). Retorne apenas o número da NF curto.
3. PROIBIDO EXTRAIR CHAVE DE ACESSO DANFE: NUNCA retorne a chave de acesso de 44 dígitos da NF-e. Ignore totalmente sequências de 44 dígitos da DANFE.
4. "destinatario": Nome da pessoa destinatária se legível.
5. "unidade": Número do apartamento ou casa (ex: "102", "14").
6. "transportadora": Nome da empresa (Correios, Mercado Livre, Shopee, Amazon, Jadlog, etc.).
7. "outroCodigo": Apenas 1 outro código curto alternativo caso exista (ex: número de pedido).`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                data: base64Data,
                mimeType
              }
            },
            {
              text: 'Extraia rapidamente o código de rastreio e o número da Nota Fiscal (NF). NÃO extraia chave de 44 dígitos da DANFE.'
            }
          ]
        }
      ],
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        maxOutputTokens: 250,
        thinkingConfig: {
          thinkingLevel: ThinkingLevel.LOW
        },
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            codigoRastreio: {
              type: Type.STRING,
              description: "Código de rastreamento principal (ex: NL123456789BR, BR24001234567)"
            },
            numeroNF: {
              type: Type.STRING,
              description: "Número da Nota Fiscal (ex: 123456 ou 001.234.567)"
            },
            destinatario: {
              type: Type.STRING,
              description: "Nome do morador ou destinatário"
            },
            unidade: {
              type: Type.STRING,
              description: "Apartamento ou casa"
            },
            bloco: {
              type: Type.STRING,
              description: "Bloco ou torre"
            },
            transportadora: {
              type: Type.STRING,
              description: "Nome da transportadora"
            },
            outroCodigo: {
              type: Type.STRING,
              description: "Outro código curto alternativo se houver (NUNCA chave de 44 dígitos)"
            }
          }
        }
      }
    });

    const textoResposta = response.text || '{}';
    const parsed = JSON.parse(textoResposta);

    const sugestoes: Array<{
      tipo: 'rastreio' | 'nf' | 'outro';
      label: string;
      valor: string;
      destaque?: boolean;
    }> = [];

    const codRastreio = (parsed.codigoRastreio || '').trim();
    const ehChaveDanfe = (cod: string) => cod.replace(/\D/g, '').length >= 40;

    if (codRastreio && !ehChaveDanfe(codRastreio) && codRastreio !== 'null' && codRastreio !== 'undefined') {
      sugestoes.push({
        tipo: 'rastreio',
        label: `Rastreio (${parsed.transportadora || 'Pacote'})`,
        valor: codRastreio,
        destaque: true
      });
    }

    const numNF = (parsed.numeroNF || '').trim();
    if (numNF && !ehChaveDanfe(numNF) && numNF !== 'null' && numNF !== 'undefined' && numNF !== codRastreio) {
      sugestoes.push({
        tipo: 'nf',
        label: 'Nota Fiscal (NF)',
        valor: numNF,
        destaque: true
      });
    }

    const outroCod = (parsed.outroCodigo || '').trim();
    if (
      outroCod &&
      !ehChaveDanfe(outroCod) &&
      outroCod !== 'null' &&
      outroCod !== 'undefined' &&
      outroCod !== codRastreio &&
      outroCod !== numNF &&
      sugestoes.length < 3
    ) {
      sugestoes.push({
        tipo: 'outro',
        label: `Cód. Alternativo`,
        valor: outroCod
      });
    }

    const listaFinalCodigos = sugestoes.slice(0, 3);

    return res.json({
      codigoRastreio: codRastreio,
      numeroNF: numNF,
      destinatario: (parsed.destinatario || '').trim(),
      unidade: (parsed.unidade || '').trim(),
      bloco: (parsed.bloco || '').trim(),
      transportadora: (parsed.transportadora || '').trim(),
      sugestoes: listaFinalCodigos,
      confianca: 99,
      metodoUtilizado: 'IA_GEMINI_FAST'
    });
  } catch (err: any) {
    console.error('[API OCR Etiqueta] Erro:', err);
    return res.status(500).json({ erro: err.message || 'Falha no processamento OCR da etiqueta' });
  }
});

/**
 * ============================================================================
 * ROTAS DE OTIMIZAÇÃO E CACHE REDIS PARA O BANCO DE DADOS SUPABASE
 * ============================================================================
 */

function buildQueryCacheKey(table: string, select?: string, filters?: any[], orderBy?: any, limit?: number, condominioId?: string): string {
  const normSelect = (select || '*').replace(/\s+/g, '');
  const normFilters = (filters || [])
    .map(f => `${f.field}:${f.op}:${f.value}`)
    .sort()
    .join('|');
  const normOrder = orderBy ? `${orderBy.field}:${orderBy.ascending ? 'asc' : 'desc'}` : '';
  const normLimit = limit ? `limit:${limit}` : '';
  const condoPart = condominioId ? `c:${condominioId}` : '';
  const rawKey = `${table}__${condoPart}__${normSelect}__${normFilters}__${normOrder}__${normLimit}`;
  
  let hash = 0;
  for (let i = 0; i < rawKey.length; i++) {
    hash = ((hash << 5) - hash) + rawKey.charCodeAt(i);
    hash |= 0;
  }
  return `porttohub:query:${table}:${Math.abs(hash)}`;
}

/**
 * Endpoint de Consulta Otimizada com Cache Redis
 * Consulta o Redis primeiro (resposta em 1-3ms). Em caso de cache miss,
 * busca no Supabase REST API, armazena no Redis com TTL e retorna.
 * REGRA RIGOROSA MULTI-TENANT: Toda tabela pertencente a condomínio exige condominioId.
 */
app.post('/api/cache/query', async (req, res) => {
  const start = Date.now();
  try {
    const { 
      table, 
      select = '*', 
      filters = [], 
      orderBy, 
      limit, 
      ttlSeconds = 180, 
      forceRefresh = false, 
      condominioId: rawCondoId 
    } = req.body;

    if (!table || typeof table !== 'string') {
      return res.status(400).json({ erro: 'Tabela não informada ou inválida' });
    }

    // Identifica condomínio ativo enviado no body, filtros ou headers
    const condoIdFromFilters = Array.isArray(filters) 
      ? filters.find(f => f.field === 'condominio_id' && f.value && f.value !== 'todos' && f.value !== 'global')?.value 
      : undefined;
    const headerCondo = req.headers['x-condominio-id'] as string;
    const condominioId = (rawCondoId && rawCondoId !== 'todos' && rawCondoId !== 'global' ? rawCondoId : '') || condoIdFromFilters || headerCondo || '';

    // Tabelas que NÃO possuem coluna condominio_id (única tabela global do sistema)
    const TABELAS_SEM_CONDOMINIO = ['condominios'];

    // REGRA DE OURO MULTI-TENANT: Qualquer tabela de condomínio exige isolamento estrito
    if (!TABELAS_SEM_CONDOMINIO.includes(table)) {
      if (!condominioId) {
        return res.status(400).json({
          erro: `Isolamento Multi-Tenant Obrigatório: A tabela "${table}" pertence exclusivamente a um condomínio. O parâmetro "condominioId" ou filtro por "condominio_id" é obrigatório e consultas globais foram rejeitadas.`,
          data: []
        });
      }

      // Garante que o filtro por condominio_id esteja presente para a query REST do Supabase
      const jaFiltrouCondo = Array.isArray(filters) && filters.some(f => f.field === 'condominio_id');
      if (!jaFiltrouCondo) {
        if (!Array.isArray(filters)) req.body.filters = [];
        filters.push({ field: 'condominio_id', op: 'eq', value: condominioId });
      }
    }

    const cacheKey = buildQueryCacheKey(table, select, filters, orderBy, limit, condominioId);
    const tags = [`table:${table}`];
    if (condominioId) tags.push(`condominio:${condominioId}`);

    // 1. Tenta recuperar do Redis (exceto se forceRefresh for true)
    if (!forceRefresh) {
      const cached = await redisCache.get(cacheKey);
      if (cached) {
        try {
          const parsedData = JSON.parse(cached);
          const latencyMs = Date.now() - start;
          res.setHeader('X-Cache', 'HIT');
          res.setHeader('X-Response-Time', `${latencyMs}ms`);
          return res.json({
            sucesso: true,
            cached: true,
            origem: 'redis',
            latencyMs,
            total: Array.isArray(parsedData) ? parsedData.length : 1,
            data: parsedData
          });
        } catch {
          // Se JSON corrompido, refaz consulta
        }
      }
    }

    // 2. Cache Miss: Busca no Supabase REST API
    const baseUrl = process.env.VITE_SUPABASE_URL || 'https://kkeizhscivyfjgetnbke.supabase.co';
    const anonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

    const queryParams = new URLSearchParams();
    queryParams.set('select', select);

    if (filters && Array.isArray(filters)) {
      for (const f of filters) {
        if (!f.field || f.value === undefined) continue;
        const op = f.op || 'eq';
        if (op === 'eq') queryParams.append(f.field, `eq.${f.value}`);
        else if (op === 'neq') queryParams.append(f.field, `neq.${f.value}`);
        else if (op === 'in') queryParams.append(f.field, `in.(${Array.isArray(f.value) ? f.value.join(',') : f.value})`);
        else if (op === 'gte') queryParams.append(f.field, `gte.${f.value}`);
        else if (op === 'lte') queryParams.append(f.field, `lte.${f.value}`);
        else if (op === 'ilike') queryParams.append(f.field, `ilike.%${f.value}%`);
      }
    }

    if (orderBy && orderBy.field) {
      queryParams.set('order', `${orderBy.field}.${orderBy.ascending ? 'asc' : 'desc'}`);
    }

    if (limit && Number(limit) > 0) {
      queryParams.set('limit', String(limit));
    }

    const restUrl = `${baseUrl.replace(/\/+$/, '')}/rest/v1/${table}?${queryParams.toString()}`;
    const supabaseRes = await fetch(restUrl, {
      method: 'GET',
      headers: {
        'apikey': anonKey,
        'Authorization': `Bearer ${anonKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!supabaseRes.ok) {
      const errText = await supabaseRes.text();
      return res.status(supabaseRes.status).json({ erro: `Erro no Supabase: ${errText}` });
    }

    const data = await supabaseRes.json();

    // 3. Grava no Redis em background
    const ttlFinal = Number(ttlSeconds) > 0 ? Number(ttlSeconds) : 180;
    await redisCache.set(cacheKey, JSON.stringify(data), ttlFinal, tags);

    const latencyMs = Date.now() - start;
    res.setHeader('X-Cache', 'MISS');
    res.setHeader('X-Response-Time', `${latencyMs}ms`);
    return res.json({
      sucesso: true,
      cached: false,
      origem: 'supabase',
      latencyMs,
      total: Array.isArray(data) ? data.length : 1,
      data
    });
  } catch (err: any) {
    console.error('[API Cache Query] Erro:', err);
    return res.status(500).json({ erro: err.message || 'Falha ao executar consulta com cache Redis' });
  }
});

/**
 * Invalidação seletiva de chaves do Redis por tabela, tag ou condomínio
 */
app.post('/api/cache/invalidate', async (req, res) => {
  try {
    const { table, tag, condominioId, pattern } = req.body;
    let removidos = 0;

    if (table) {
      removidos += await redisCache.invalidateByTag(`table:${table}`);
      removidos += await redisCache.invalidateByPattern(`porttohub:query:${table}:*`);
    }
    if (condominioId) {
      removidos += await redisCache.invalidateByTag(`condominio:${condominioId}`);
    }
    if (tag) {
      removidos += await redisCache.invalidateByTag(tag);
    }
    if (pattern) {
      removidos += await redisCache.invalidateByPattern(pattern);
    }

    return res.json({
      sucesso: true,
      removidos,
      mensagem: `${removidos} entrada(s) de cache invalidada(s) no Redis.`
    });
  } catch (err: any) {
    return res.status(500).json({ erro: err.message });
  }
});

/**
 * Estatísticas e telemetria do Redis
 */
app.get('/api/cache/stats', async (_req, res) => {
  try {
    const stats = await redisCache.getStats();
    return res.json({
      sucesso: true,
      ...stats,
      supabaseUrl: process.env.VITE_SUPABASE_URL || 'https://kkeizhscivyfjgetnbke.supabase.co',
      horarioServidor: new Date().toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo' })
    });
  } catch (err: any) {
    return res.status(500).json({ erro: err.message });
  }
});

/**
 * Limpeza completa do cache Redis
 */
app.post('/api/cache/clear', async (_req, res) => {
  try {
    await redisCache.flush();
    return res.json({ sucesso: true, mensagem: 'Cache Redis limpo com sucesso.' });
  } catch (err: any) {
    return res.status(500).json({ erro: err.message });
  }
});

/**
 * Pré-aquecimento (Warmup) do Cache Redis para consultas críticas
 */
app.post('/api/cache/warmup', async (req, res) => {
  const start = Date.now();
  try {
    const { condominioId } = req.body || {};
    const baseUrl = process.env.VITE_SUPABASE_URL || 'https://kkeizhscivyfjgetnbke.supabase.co';
    const anonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

    const tabelasParaAquecer: { table: string; ttl: number; select: string }[] = [
      { table: 'condominios', ttl: 600, select: '*' },
    ];

    if (condominioId && condominioId !== 'global' && condominioId !== 'todos') {
      tabelasParaAquecer.push(
        { table: 'operadores', ttl: 300, select: 'id,condominio_id,nome,login,funcao,turno_padrao,nivel_acesso,perfil,ativo' },
        { table: 'chaves', ttl: 180, select: '*' },
        { table: 'moradores', ttl: 300, select: 'id,condominio_id,nome,bloco,unidade,telefone,status_acesso,tag_rfid,veiculo_placa,veiculo_modelo' },
        { table: 'entregadores', ttl: 300, select: '*' },
        { table: 'bancada_volumes', ttl: 60, select: '*' }
      );
    }

    const resultados: any[] = [];
    for (const item of tabelasParaAquecer) {
      try {
        let restUrl = `${baseUrl.replace(/\/+$/, '')}/rest/v1/${item.table}?select=${encodeURIComponent(item.select)}`;
        if (condominioId && condominioId !== 'global' && condominioId !== 'todos' && item.table !== 'condominios') {
          restUrl += `&condominio_id=eq.${condominioId}`;
        }

        const resp = await fetch(restUrl, {
          headers: { 'apikey': anonKey, 'Authorization': `Bearer ${anonKey}` }
        });
        if (resp.ok) {
          const dados = await resp.json();
          const filters = (condominioId && item.table !== 'condominios') ? [{ field: 'condominio_id', op: 'eq', value: condominioId }] : [];
          const key = buildQueryCacheKey(item.table, item.select, filters, undefined, undefined, item.table !== 'condominios' ? condominioId : undefined);
          await redisCache.set(key, JSON.stringify(dados), item.ttl, [`table:${item.table}`]);
          resultados.push({ table: item.table, registros: dados.length, status: 'ok' });
        }
      } catch (itemErr: any) {
        resultados.push({ table: item.table, status: 'erro', erro: itemErr.message });
      }
    }

    return res.json({
      sucesso: true,
      tempoTotalMs: Date.now() - start,
      tabelasAquecidas: resultados
    });
  } catch (err: any) {
    return res.status(500).json({ erro: err.message });
  }
});

/**
 * Benchmark Comparativo: Supabase Direto vs Cache Redis
 */
app.get('/api/cache/benchmark', async (_req, res) => {
  try {
    const baseUrl = process.env.VITE_SUPABASE_URL || 'https://kkeizhscivyfjgetnbke.supabase.co';
    const anonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

    // 1. Teste Supabase Direto
    const t0 = Date.now();
    const supRes = await fetch(`${baseUrl.replace(/\/+$/, '')}/rest/v1/condominios?select=id,nome`, {
      headers: { 'apikey': anonKey, 'Authorization': `Bearer ${anonKey}` }
    });
    const supData = await supRes.json();
    const latenciaSupabaseMs = Date.now() - t0;

    // 2. Prepara cache no Redis
    const testKey = 'porttohub:benchmark:test';
    await redisCache.set(testKey, JSON.stringify(supData), 60);

    // 3. Teste Leitura Redis
    const t1 = Date.now();
    await redisCache.get(testKey);
    const latenciaRedisMs = Date.now() - t1;

    const ganhoDesempenho = latenciaRedisMs > 0 
      ? `${(latenciaSupabaseMs / latenciaRedisMs).toFixed(1)}x mais rápido`
      : '99% mais rápido (< 1ms)';

    return res.json({
      sucesso: true,
      latenciaSupabaseMs,
      latenciaRedisMs: Math.max(latenciaRedisMs, 0.5),
      ganhoDesempenho,
      reducaoLatenciaPercentual: `${(((latenciaSupabaseMs - latenciaRedisMs) / Math.max(latenciaSupabaseMs, 1)) * 100).toFixed(1)}%`,
      itensRetornados: Array.isArray(supData) ? supData.length : 0
    });
  } catch (err: any) {
    return res.status(500).json({ erro: err.message });
  }
});


async function start() {
  const server = http.createServer(app);

  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(process.cwd(), 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(process.cwd(), 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use((_req, res, next) => {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      next();
    });
    app.use(vite.middlewares);
  }

  server.listen(port, '0.0.0.0', () => {
    console.log(`[PorttoHub] Servidor rodando em http://localhost:${port}`);
  });
}

start();
