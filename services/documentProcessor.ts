import { extractTextFromPDF, isPDF } from './pdfService';

export interface ProcessedDocument {
  imageBlob?: Blob;       // O arquivo WebP otimizado (para imagens)
  extractedText: string;  // O texto puro (para enviar à IA e economizar tokens)
  previewUrl: string;     // URL para exibir na tela
  originalDataUrl: string; // Data URL original (para salvar no banco)
  fileType: 'pdf' | 'image' | 'text';
}

/**
 * Detecta se o arquivo é uma imagem
 */
function isImage(fileName: string, fileType: string): boolean {
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.tiff', '.tif'];
  const lowerName = fileName.toLowerCase();
  return imageExtensions.some(ext => lowerName.endsWith(ext)) || fileType.startsWith('image/');
}

/**
 * Detecta se o arquivo é texto
 */
function isTextFile(fileName: string, fileType: string): boolean {
  return fileType.includes('text') || fileName.toLowerCase().endsWith('.txt');
}

/**
 * Processa um arquivo de imagem para otimização.
 * Aplica: Redimensionamento (150DPI), Escala de Cinza, Conversão WebP.
 */
export async function processImageForUpload(file: File, dataUrl: string): Promise<ProcessedDocument> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = dataUrl;

    img.onload = async () => {
      // 1. CONFIGURAR O CANVAS (A "Mágica" da Resolução)
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Não foi possível carregar o contexto do Canvas via Browser.'));
        return;
      }

      // Definição de Resolução Ideal (aprox. 150 DPI para um A4)
      // A4 largura ~ 210mm. 150 DPI = ~1240 pixels de largura.
      const TARGET_WIDTH = 1240;
      const scaleFactor = TARGET_WIDTH / img.width;
      const targetHeight = img.height * scaleFactor;

      canvas.width = TARGET_WIDTH;
      canvas.height = targetHeight;

      // 2. APLICAR ESCALA DE CINZA (Grayscale)
      ctx.filter = 'grayscale(100%) contrast(1.2)';

      // Desenha a imagem redimensionada no canvas
      ctx.drawImage(img, 0, 0, TARGET_WIDTH, targetHeight);

      // 3. CONVERTER PARA WEBP (Formato)
      // Qualidade 0.8 (80%) é o equilíbrio perfeito entre tamanho e legibilidade
      canvas.toBlob(async (blob) => {
        if (!blob) {
          reject(new Error('Falha na conversão para WebP'));
          return;
        }

        // Criar URL para visualização
        const optimizedImageUrl = URL.createObjectURL(blob);

        try {
          console.log('Imagem otimizada com sucesso');

          // Converter blob WebP para dataURL para salvar no banco
          const reader = new FileReader();
          reader.onloadend = () => {
            resolve({
              imageBlob: blob,
              extractedText: `Arquivo de imagem: ${file.name}\nTipo: ${file.type}\n\nImagem anexada. Analise o conteúdo visualmente.`,
              previewUrl: optimizedImageUrl,
              originalDataUrl: reader.result as string,
              fileType: 'image'
            });
          };
          reader.readAsDataURL(blob);

        } catch (error) {
          console.error('Erro ao processar imagem:', error);
          reject(error);
        }

      }, 'image/webp', 0.8);
    };

    img.onerror = () => {
      reject(new Error('Erro ao carregar imagem'));
    };
  });
}

/**
 * Processa um arquivo PDF extraindo texto
 */
export async function processPDFForUpload(dataUrl: string): Promise<ProcessedDocument> {
  try {
    console.log('Extraindo texto do PDF...');
    const extractedText = await extractTextFromPDF(dataUrl);
    console.log('Texto extraído do PDF:', extractedText.substring(0, 200));

    return {
      extractedText,
      previewUrl: dataUrl,
      originalDataUrl: dataUrl,
      fileType: 'pdf'
    };
  } catch (error) {
    console.error('Erro ao processar PDF:', error);
    throw new Error('Falha ao processar PDF');
  }
}

/**
 * Processa um arquivo de texto simples
 */
export async function processTextForUpload(dataUrl: string): Promise<ProcessedDocument> {
  try {
    // Extrair texto do data URL
    const base64 = dataUrl.split(',')[1];
    const text = atob(base64);

    return {
      extractedText: text,
      previewUrl: dataUrl,
      originalDataUrl: dataUrl,
      fileType: 'text'
    };
  } catch (error) {
    console.error('Erro ao processar arquivo de texto:', error);
    throw new Error('Falha ao processar arquivo de texto');
  }
}

/**
 * Função principal para processar qualquer tipo de documento
 */
export async function processDocumentForUpload(file: File): Promise<ProcessedDocument> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async (event) => {
      const dataUrl = event.target?.result as string;

      try {
        // Detectar tipo de arquivo e processar apropriadamente
        if (isPDF(file.name)) {
          console.log('Detectado: PDF');
          const result = await processPDFForUpload(dataUrl);
          resolve(result);
        } else if (isImage(file.name, file.type)) {
          console.log('Detectado: Imagem');
          const result = await processImageForUpload(file, dataUrl);
          resolve(result);
        } else if (isTextFile(file.name, file.type)) {
          console.log('Detectado: Arquivo de texto');
          const result = await processTextForUpload(dataUrl);
          resolve(result);
        } else {
          // Fallback: tratar como arquivo binário genérico
          console.log('Detectado: Arquivo genérico');
          resolve({
            extractedText: `Arquivo: ${file.name}\nTipo: ${file.type}\n\nArquivo anexado para referência.`,
            previewUrl: dataUrl,
            originalDataUrl: dataUrl,
            fileType: 'pdf' // Default
          });
        }
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => {
      reject(new Error('Erro ao ler arquivo'));
    };

    reader.readAsDataURL(file);
  });
}
