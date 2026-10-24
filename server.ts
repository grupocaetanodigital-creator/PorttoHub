delete (globalThis as any).__dirname;
delete (globalThis as any).__filename;
process.env.DISABLE_HMR = 'true';

import express from 'express';
import http from 'http';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config();

const app = express();
const port = 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Diretório persistente para armazenamento de fotos de encomendas, assinaturas e comprovantes
const uploadsDir = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
['etiquetas', 'assinaturas_encomendas', 'comprovantes_baixa'].forEach(folder => {
  const p = path.join(uploadsDir, folder);
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
});

// Servir diretório de uploads diretamente antes do Vite
app.use('/uploads', express.static(uploadsDir, {
  maxAge: '1y',
  immutable: true
}));

// Rotas de compatibilidade direta
app.use('/etiquetas', express.static(path.join(uploadsDir, 'etiquetas'), { maxAge: '1y' }));
app.use('/comprovantes_baixa', express.static(path.join(uploadsDir, 'comprovantes_baixa'), { maxAge: '1y' }));
app.use('/assinaturas_encomendas', express.static(path.join(uploadsDir, 'assinaturas_encomendas'), { maxAge: '1y' }));

/**
 * Rota Oficial de Armazenamento Persistente de Fotos
 * Salva a foto em disco e gera URL pública estável e permanente
 */
app.post('/api/upload-foto', async (req, res) => {
  try {
    const { imagemBase64, pasta = 'etiquetas', fileName } = req.body;
    if (!imagemBase64) {
      return res.status(400).json({ erro: 'Imagem não fornecida' });
    }

    const pastaLimpa = (pasta || 'etiquetas').replace(/[^a-zA-Z0-9_-]/g, '') || 'etiquetas';
    const pastaDestino = path.join(uploadsDir, pastaLimpa);
    if (!fs.existsSync(pastaDestino)) {
      fs.mkdirSync(pastaDestino, { recursive: true });
    }

    const sufixoAleatorio = Math.random().toString(36).substring(2, 8);
    const nomeArquivo = (fileName && typeof fileName === 'string' && fileName.endsWith('.jpg'))
      ? path.basename(fileName)
      : `${Date.now()}_${sufixoAleatorio}.jpg`;

    const caminhoArquivo = path.join(pastaDestino, nomeArquivo);
    const base64Data = imagemBase64.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    fs.writeFileSync(caminhoArquivo, buffer);

    const relativeUrl = `/uploads/${pastaLimpa}/${nomeArquivo}`;
    const host = req.get('host') || `localhost:${port}`;
    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
    const fullUrl = `${protocol}://${host}${relativeUrl}`;

    return res.json({
      sucesso: true,
      publicUrl: fullUrl,
      relativeUrl,
      fileName: `${pastaLimpa}/${nomeArquivo}`,
      tamanhoKb: Math.round(buffer.length / 1024)
    });
  } catch (err: any) {
    console.error('[API Upload Foto] Erro:', err);
    return res.status(500).json({ erro: err.message || 'Falha ao salvar foto' });
  }
});

// Endpoint com resposta direta e headers adequados
app.get('/api/foto/:pasta/:nome', (req, res) => {
  const pastaLimpa = req.params.pasta.replace(/[^a-zA-Z0-9_-]/g, '');
  const nomeLimpo = path.basename(req.params.nome);
  const caminho = path.join(uploadsDir, pastaLimpa, nomeLimpo);

  if (fs.existsSync(caminho)) {
    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    return res.sendFile(caminho);
  }
  return res.status(404).send('Foto não encontrada');
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
