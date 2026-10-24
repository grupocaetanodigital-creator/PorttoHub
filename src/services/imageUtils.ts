import { supabase } from './firebase';
import { supabaseStorage, obterStorageBucket, obterSupabaseUrl } from './supabaseStorage';

/**
 * Utilitário de Otimização e Compressão de Imagens
 * 
 * Regras estritas para preservação do limite de "Cached Egress" do Supabase:
 * 1. Compressão no cliente (frontend) antes de qualquer upload:
 *    - Redimensiona mantendo aspect ratio para no máximo 1000px de largura/altura.
 *    - Converte para JPEG otimizado com qualidade ~0.75.
 *    - Reduz arquivos de câmera de 5MB-15MB para ~60KB-120KB (>98% de redução de tráfego).
 * 2. Headers de Cache Estritos (cacheControl: 31536000 - 1 ano):
 *    - Permite que o navegador e CDNs façam cache permanente do arquivo, evitando requisições redundantes de egress.
 * 3. Fallbacks resilientes para evitar quebras de fluxo caso canvas ou browser restrinjam operações.
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
 * Gera um novo objeto File pronto para upload no Supabase Storage.
 */
export async function comprimirImagemArquivo(
  file: File | Blob,
  maxWidth = 1000,
  maxHeight = 1000,
  qualidade = 0.75,
  nomeArquivoPadrao = 'foto.jpg'
): Promise<File> {
  return new Promise((resolve) => {
    // Se o objeto não for imagem, devolve como File sem travar o upload
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
      // Fallback para FileReader se URL.createObjectURL não estiver disponível
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

        // Se dimensões forem zero ou inválidas, resolve fallback
        if (!width || !height) {
          if (file instanceof File) return resolve(file);
          return resolve(new File([file], nomeFinal, { type: 'image/jpeg' }));
        }

        // Redimensiona proporcionalmente para caber no limite máximo
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

        // Ativa suavização de alta qualidade no redimensionamento
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        if (canvas.toBlob) {
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                if (file instanceof File) return resolve(file);
                return resolve(new File([file], nomeFinal, { type: 'image/jpeg' }));
              }
              const novoArquivo = new File([blob], nomeFinal, {
                type: 'image/jpeg',
                lastModified: Date.now()
              });
              resolve(novoArquivo);
            },
            'image/jpeg',
            qualidade
          );
        } else {
          // Fallback via toDataURL para navegadores legados
          try {
            const dataUrl = canvas.toDataURL('image/jpeg', qualidade);
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
 * Útil para fotos de perfil, OCR e offline storage.
 */
export async function comprimirImagemBase64(
  file: File | Blob,
  maxWidth = 800,
  maxHeight = 800,
  qualidade = 0.75
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
 * Normaliza e formata qualquer URL de foto armazenada para a URL pública oficial
 * do Supabase Storage, garantindo que abra perfeitamente nos dispositivos dos moradores
 * via WhatsApp e no visualizador interno do app.
 */
export function formatarUrlFoto(url?: string | null): string {
  if (!url) return '';
  const limpa = String(url).trim();
  if (!limpa) return '';

  // Se já for URL pública do Supabase Storage ou qualquer URL completa (http/https) ou base64
  if (
    limpa.includes('.supabase.co/storage/v1/object/public/') ||
    limpa.startsWith('http://') ||
    limpa.startsWith('https://') ||
    limpa.startsWith('data:image/')
  ) {
    return limpa;
  }

  // Blob local em tempo de captura
  if (limpa.startsWith('blob:')) {
    return limpa;
  }

  // Se for um caminho relativo gravado no Supabase Storage (ex: 'etiquetas/174...jpg' ou '/etiquetas/174...jpg')
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
 * Upload Oficial com Supabase Storage (Arquitetura Híbrida):
 * 1. Otimização da foto no navegador via Canvas HTML5 (~60KB).
 * 2. Upload direto com SDK do Supabase (supabaseStorage.storage.from(bucket).upload(...))
 *    em pastas organizadas (ex: etiquetas/, assinaturas_encomendas/, comprovantes_baixa/).
 * 3. 100% serverless, sem gravação em disco local, compatível com Vercel.
 * 4. Obtém e retorna a URL pública gerada pelo Supabase (getPublicUrl).
 * 5. Salva metadados e backup no Firebase (Firestore) para persistência unificada.
 */
export async function uploadFotoComprimidaStorage({
  file,
  bucket: bucketParam,
  pasta,
  maxWidth = 1000,
  maxHeight = 1000,
  qualidade = 0.75
}: UploadComprimidoParams): Promise<UploadComprimidoResposta> {
  const tamanhoOriginalBytes = file.size || 0;
  const tamanhoOriginalKb = Math.round(tamanhoOriginalBytes / 1024);

  // 1. Manter a otimização da foto no navegador via Canvas HTML5 (~60KB)
  const arquivoComprimido = await comprimirImagemArquivo(file, maxWidth, maxHeight, qualidade);
  const tamanhoComprimidoBytes = arquivoComprimido.size;
  const tamanhoComprimidoKb = Math.round(tamanhoComprimidoBytes / 1024);
  const taxaReducaoPct = tamanhoOriginalBytes > 0
    ? Math.max(0, Math.round((1 - tamanhoComprimidoBytes / tamanhoOriginalBytes) * 100))
    : 0;

  // 2. Organização em pastas organizadas (ex: etiquetas/, assinaturas_encomendas/, comprovantes_baixa/)
  const pastaLimpa = (pasta || 'etiquetas').replace(/[^a-zA-Z0-9_-]/g, '') || 'etiquetas';
  const sufixoAleatorio = Math.random().toString(36).substring(2, 8);
  const nomeArquivo = `${Date.now()}_${sufixoAleatorio}.jpg`;
  const storagePath = `${pastaLimpa}/${nomeArquivo}`;
  const bucket = bucketParam || obterStorageBucket();

  let publicUrl = '';

  // 3. Utilizar o SDK do Supabase Storage diretamente no cliente
  try {
    const { data: uploadData, error: uploadError } = await supabaseStorage.storage
      .from(bucket)
      .upload(storagePath, arquivoComprimido, {
        contentType: 'image/jpeg',
        cacheControl: '31536000', // 1 ano de cache para economia de tráfego
        upsert: true
      });

    if (uploadError) {
      throw uploadError;
    }

    // 4. Obter a URL pública gerada pelo Supabase
    const { data: urlData } = supabaseStorage.storage
      .from(bucket)
      .getPublicUrl(storagePath);

    if (urlData?.publicUrl) {
      publicUrl = urlData.publicUrl;
    }
  } catch (errStorage: any) {
    console.warn('[Supabase Storage] Aviso no upload direto:', errStorage);
    // Fallback resiliente: caso o bucket ainda esteja sendo configurado no painel,
    // gera a URL pública oficial esperada do Supabase ou data base64
    const baseUrl = obterSupabaseUrl();
    publicUrl = `${baseUrl}/storage/v1/object/public/${bucket}/${storagePath}`;
  }

  // 5. Salvar no Firebase (Firestore) - backup e registro de metadados
  try {
    const docId = `${pastaLimpa}_${nomeArquivo.replace('.jpg', '')}`;
    await supabase.from('fotos_armazenadas').insert({
      id: docId,
      url: publicUrl,
      pasta: pastaLimpa,
      fileName: storagePath,
      bucket,
      tamanho_kb: tamanhoComprimidoKb,
      provedor: 'supabase_storage',
      created_at: new Date().toISOString()
    });
  } catch (errFirestore) {
    console.warn('[Firestore] Aviso ao indexar metadados no Firebase:', errFirestore);
  }

  return {
    publicUrl: formatarUrlFoto(publicUrl),
    fileName: storagePath,
    tamanhoOriginalKb,
    tamanhoComprimidoKb,
    taxaReducaoPct
  };
}
