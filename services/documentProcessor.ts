import { extractTextFromPDF, isPDF } from './pdfService';
import Tesseract from 'tesseract.js';

export interface ProcessedDocument {
  imageBlob?: Blob;
  extractedText: string;
  previewUrl: string;
  originalDataUrl: string;
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
 * Processa um arquivo de imagem para otimização com OCR.
 * Aplica: Redimensionamento (150DPI), Escala de Cinza, Conversão WebP, OCR (Tesseract).
 */
export async function processImageForUpload(file: File, dataUrl: string): Promise<ProcessedDocument> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = dataUrl;

    img.onload = async () => {
      console.log('[processImage] Iniciando processamento de imagem:', file.name);

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Não foi possível carregar o contexto do Canvas via Browser.'));
        return;
      }

      const TARGET_WIDTH = 1240;
      const scaleFactor = TARGET_WIDTH / img.width;
      const targetHeight = img.height * scaleFactor;

      canvas.width = TARGET_WIDTH;
      canvas.height = targetHeight;

      ctx.filter = 'grayscale(100%) contrast(1.2)';
      ctx.drawImage(img, 0, 0, TARGET_WIDTH, targetHeight);

      canvas.toBlob(async (blob) => {
        if (!blob) {
          reject(new Error('Falha na conversão para WebP'));
          return;
        }

        console.log('[processImage] Imagem convertida para WebP');
        const optimizedImageUrl = URL.createObjectURL(blob);

        try {
          console.log('[processImage] Iniciando OCR com Tesseract...');

          const { data: { text } } = await Tesseract.recognize(
            blob,
            'por',
            {
              logger: (m) => {
                if (m.status === 'recognizing text') {
                  console.log(`[OCR] Progresso: ${Math.round(m.progress * 100)}%`);
                }
              }
            }
          );

          console.log('[processImage] OCR concluído. Texto extraído:', text.substring(0, 200));

          const reader = new FileReader();
          reader.onloadend = () => {
            resolve({
              imageBlob: blob,
              extractedText: text.trim() || `Arquivo de imagem: ${file.name}\nNenhum texto detectado na imagem.`,
              previewUrl: optimizedImageUrl,
              originalDataUrl: reader.result as string,
              fileType: 'image'
            });
          };
          reader.readAsDataURL(blob);

        } catch (error) {
          console.error('[processImage] Erro no OCR:', error);
          const reader = new FileReader();
          reader.onloadend = () => {
            resolve({
              imageBlob: blob,
              extractedText: `Arquivo de imagem: ${file.name}\nErro ao processar OCR. Imagem salva para referência.`,
              previewUrl: optimizedImageUrl,
              originalDataUrl: reader.result as string,
              fileType: 'image'
            });
          };
          reader.readAsDataURL(blob);
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
