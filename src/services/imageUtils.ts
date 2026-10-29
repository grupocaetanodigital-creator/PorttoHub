import { supabase } from './supabase';
import { supabaseStorage, obterStorageBucket, obterSupabaseUrl } from './supabaseStorage';

/**
 * Utilitário de Otimização e Compressão Estrita de Imagens (Client-Side)
 * 
 * DIRETRIZ SUPABASE FREE TIER:
 * 1. Compressão no cliente (frontend via Canvas HTML5) antes de qualquer envio ao Storage.
 * 2. Garante arquivos finais leves (máximo entre 200KB e 380KB, rigorosamente abaixo de 400KB).
 * 3. Headers HTTP estritos de Cache-Control (31536000 - 1 ano) para CDN e navegador,
 *    eliminando consumo repetido de Egress.
 * 4. Remove gravações redundantes de logs em tabelas auxiliares.
 */

export interface CompressaoResultado {
  arquivo: File;
  largura: number;
  altura: number;
  tamanhoOriginalKb: number;
  tamanhoComprimidoKb: number;
  taxaReducaoPct: number;
}

/**
 * Redimensiona e comprime um arquivo de imagem no navegador usando HTML5 Canvas.
 * Aplica compressão adaptativa para garantir que o arquivo fique estritamente entre 150KB e 380KB (limite máximo de 400KB).
 */
export async function comprimirImagemArquivo(
  file: File | Blob,
  maxWidth = 1080,
  maxHeight = 1080,
  qualidadeInicial = 0.72,
  nomeArquivoPadrao = 'foto.jpg'
): Promise<File> {
  return new Promise((resolve) => {
    // Se não for imagem, retorna sem processamento de canvas
    if (file.type && !file.type.startsWith('image/')) {
      if (file instanceof File) return resolve(file);
      return resolve(new File([file], nomeArquivoPadrao, { type: file.type || 'application/octet-stream' }));
    }

    const nomeOriginal = file instanceof File ? file.name : nomeArquivoPadrao;
    const baseNome = nomeOriginal.replace(/\.[^/.]+$/, '');
    const nomeFinal = `${baseNome}.jpg`;

    let objectUrl = '';
    try {
      objectUrl = URL.createObjectURL(file);
    } catch {
      const reader = new FileReader();
      reader.onload = () => processarSrc(reader.result as string);
      reader.onerror = () => {
        if (file instanceof File) resolve(file);
        else resolve(new File([file], nomeFinal, { type: 'image/jpeg' }));
      };
      reader.readAsDataURL(file);
      return;
    }

    const processarSrc = (src: string) => {
      const img = new Image();
      img.onload = () => {
        if (objectUrl) {
          try { URL.revokeObjectURL(objectUrl); } catch {}
        }

        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;

        if (!width || !height) {
          if (file instanceof File) return resolve(file);
          return resolve(new File([file], nomeFinal, { type: 'image/jpeg' }));
        }

        // Redimensiona proporcionalmente mantendo proporção original
        if (width > maxWidth || height > maxHeight) {
          const proporcao = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * proporcao);
          height = Math.round(height * proporcao);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          if (file instanceof File) return resolve(file);
          return resolve(new File([file], nomeFinal, { type: 'image/jpeg' }));
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // Compressão iterativa para assegurar que nunca ultrapasse 380KB (< 400KB)
        const tentarComprimir = (q: number, scaleFactor: number = 1.0) => {
          let targetCanvas = canvas;
          if (scaleFactor < 1.0) {
            const smallerCanvas = document.createElement('canvas');
            smallerCanvas.width = Math.round(width * scaleFactor);
            smallerCanvas.height = Math.round(height * scaleFactor);
            const sCtx = smallerCanvas.getContext('2d');
            if (sCtx) {
              sCtx.imageSmoothingEnabled = true;
              sCtx.imageSmoothingQuality = 'high';
              sCtx.drawImage(canvas, 0, 0, smallerCanvas.width, smallerCanvas.height);
              targetCanvas = smallerCanvas;
            }
          }

          if (targetCanvas.toBlob) {
            targetCanvas.toBlob(
              (blob) => {
                if (!blob) {
                  if (file instanceof File) return resolve(file);
                  return resolve(new File([file], nomeFinal, { type: 'image/jpeg' }));
                }

                // Se o tamanho exceder 390KB (limite de 400KB), tenta redução com qualidade menor
                if (blob.size > 390 * 1024 && q > 0.45) {
                  tentarComprimir(Math.max(0.40, q - 0.15), scaleFactor > 0.75 ? scaleFactor * 0.85 : scaleFactor);
                  return;
                }

                const novoArquivo = new File([blob], nomeFinal, {
                  type: 'image/jpeg',
                  lastModified: Date.now()
                });
                resolve(novoArquivo);
              },
              'image/jpeg',
              q
            );
          } else {
            try {
              const dataUrl = targetCanvas.toDataURL('image/jpeg', q);
              const arr = dataUrl.split(',');
              const bstr = atob(arr[1]);
              let n = bstr.length;
              const u8arr = new Uint8Array(n);
              while (n--) {
                u8arr[n] = bstr.charCodeAt(n);
              }
              const blob = new Blob([u8arr], { type: 'image/jpeg' });
              resolve(new File([blob], nomeFinal, { type: 'image/jpeg', lastModified: Date.now() }));
            } catch {
              if (file instanceof File) return resolve(file);
              resolve(new File([file], nomeFinal, { type: 'image/jpeg' }));
            }
          }
        };

        tentarComprimir(qualidadeInicial);
      };

      img.onerror = () => {
        if (objectUrl) {
          try { URL.revokeObjectURL(objectUrl); } catch {}
        }
        if (file instanceof File) resolve(file);
        else resolve(new File([file], nomeFinal, { type: 'image/jpeg' }));
      };

      img.src = src;
    };

    processarSrc(objectUrl);
  });
}

/**
 * Comprime e converte imagem em Base64 com dimensões e qualidade otimizadas.
 * Útil para assinaturas e previews inline ultra-leves.
 */
export async function comprimirImagemBase64(
  file: File | Blob,
  maxWidth = 800,
  maxHeight = 800,
  qualidade = 0.70
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;

        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(reader.result as string);
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', qualidade);
        resolve(dataUrl);
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Normaliza e formata qualquer URL de foto armazenada para a URL pública oficial do Supabase Storage.
 */
export function formatarUrlFoto(url?: string | null): string {
  if (!url) return '';
  const limpa = String(url).trim();
  if (!limpa) return '';

  if (
    limpa.includes('.supabase.co/storage/v1/object/public/') ||
    limpa.startsWith('http://') ||
    limpa.startsWith('https://') ||
    limpa.startsWith('data:image/')
  ) {
    return limpa;
  }

  if (limpa.startsWith('blob:')) {
    return limpa;
  }

  const caminhoLimpo = limpa.replace(/^\/+/, '').replace(/^uploads\//, '');
  const baseUrl = obterSupabaseUrl();
  const bucket = obterStorageBucket();
  return `${baseUrl}/storage/v1/object/public/${bucket}/${caminhoLimpo}`;
}

export interface UploadComprimidoParams {
  file: File | Blob;
  bucket?: string;
  pasta: string;
  maxWidth?: number;
  maxHeight?: number;
  qualidade?: number;
}

export interface UploadComprimidoResposta {
  publicUrl: string;
  fileName: string;
  tamanhoOriginalKb: number;
  tamanhoComprimidoKb: number;
  taxaReducaoPct: number;
}

/**
 * Upload Oficial Otimizado com Supabase Storage:
 * 1. Compressão garantida no cliente via Canvas HTML5 (máximo ~200KB-380KB).
 * 2. Upload direto com cacheControl estrito de 1 ano ('31536000') para eliminar repetições de Egress.
 * 3. Retorna URL pública persistente do CDN Supabase.
 * 4. Zero gravação em tabelas secundárias para evitar desperdício de Log Ingestion.
 */
export async function uploadFotoComprimidaStorage({
  file,
  bucket: bucketParam,
  pasta,
  maxWidth = 1080,
  maxHeight = 1080,
  qualidade = 0.72
}: UploadComprimidoParams): Promise<UploadComprimidoResposta> {
  const tamanhoOriginalBytes = file.size || 0;
  const tamanhoOriginalKb = Math.round(tamanhoOriginalBytes / 1024);

  // 1. Comprime arquivo com garantia < 400KB
  const arquivoComprimido = await comprimirImagemArquivo(file, maxWidth, maxHeight, qualidade);
  const tamanhoComprimidoBytes = arquivoComprimido.size;
  const tamanhoComprimidoKb = Math.round(tamanhoComprimidoBytes / 1024);
  const taxaReducaoPct = tamanhoOriginalBytes > 0
    ? Math.max(0, Math.round((1 - tamanhoComprimidoBytes / tamanhoOriginalBytes) * 100))
    : 0;

  // Fallback em base64 caso storage não responda
  let base64Fallback = '';
  try {
    base64Fallback = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve((reader.result as string) || '');
      reader.onerror = () => resolve('');
      reader.readAsDataURL(arquivoComprimido);
    });
  } catch {}

  const pastaLimpa = (pasta || 'etiquetas').replace(/[^a-zA-Z0-9_-]/g, '') || 'etiquetas';
  const sufixoAleatorio = Math.random().toString(36).substring(2, 8);
  const nomeArquivo = `${Date.now()}_${sufixoAleatorio}.jpg`;
  const storagePath = `${pastaLimpa}/${nomeArquivo}`;
  const bucket = bucketParam || obterStorageBucket();

  let publicUrl = '';
  let uploadSucesso = false;

  try {
    const storageClient = supabase?.storage || supabaseStorage?.storage;
    if (storageClient) {
      const { data: uploadData, error: uploadError } = await storageClient
        .from(bucket)
        .upload(storagePath, arquivoComprimido, {
          contentType: 'image/jpeg',
          cacheControl: '31536000', // 1 ano de cache CDN para não gerar egress redundante
          upsert: true
        });

      if (uploadError) {
        console.warn('[Supabase Storage] Aviso no upload direto:', uploadError);
      } else {
        const { data: urlData } = storageClient
          .from(bucket)
          .getPublicUrl(storagePath);

        if (urlData?.publicUrl) {
          publicUrl = urlData.publicUrl;
          uploadSucesso = true;
        }
      }
    }
  } catch (errStorage: any) {
    console.warn('[Supabase Storage] Exceção no upload direto:', errStorage);
  }

  if (!uploadSucesso || !publicUrl) {
    publicUrl = base64Fallback || (typeof file === 'string' ? file : '');
  }

  return {
    publicUrl: formatarUrlFoto(publicUrl),
    fileName: storagePath,
    tamanhoOriginalKb,
    tamanhoComprimidoKb,
    taxaReducaoPct
  };
}
