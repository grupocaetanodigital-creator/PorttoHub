import { supabase } from './supabase';

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
 * Função centralizada para upload seguro no Supabase Storage:
 * 1. Comprime a imagem no cliente (HTML5 Canvas, max 1000px, JPEG 0.75).
 * 2. Faz upload para o bucket com header de cache longo (31536000s = 1 ano).
 * 3. Retorna a URL pública pronta para salvar no banco de dados.
 */
export async function uploadFotoComprimidaStorage({
  file,
  bucket = 'encomendas',
  pasta,
  maxWidth = 1000,
  maxHeight = 1000,
  qualidade = 0.75
}: UploadComprimidoParams): Promise<UploadComprimidoResposta> {
  const tamanhoOriginalBytes = file.size || 0;
  const tamanhoOriginalKb = Math.round(tamanhoOriginalBytes / 1024);

  // 1. Comprime no cliente
  const arquivoComprimido = await comprimirImagemArquivo(
    file,
    maxWidth,
    maxHeight,
    qualidade
  );

  const tamanhoComprimidoBytes = arquivoComprimido.size;
  const tamanhoComprimidoKb = Math.round(tamanhoComprimidoBytes / 1024);
  const taxaReducaoPct = tamanhoOriginalBytes > 0
    ? Math.round((1 - tamanhoComprimidoBytes / tamanhoOriginalBytes) * 100)
    : 0;

  // 2. Define nome único com extensão .jpg
  const sufixoAleatorio = Math.random().toString(36).substring(2, 7);
  const fileName = `${pasta}/${Date.now()}_${sufixoAleatorio}.jpg`;

  // 3. Envia para o Supabase Storage com cache de 1 ano para evitar egress duplicado
  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(fileName, arquivoComprimido, {
      contentType: 'image/jpeg',
      cacheControl: '31536000', // 1 ano de cache no browser e CDN
      upsert: true
    });

  if (uploadError) {
    throw uploadError;
  }

  // 4. Obtém URL pública estável
  const { data: urlData } = supabase.storage
    .from(bucket)
    .getPublicUrl(fileName);

  return {
    publicUrl: urlData.publicUrl,
    fileName,
    tamanhoOriginalKb,
    tamanhoComprimidoKb,
    taxaReducaoPct
  };
}
