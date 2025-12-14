// Script de teste para verificar se o serviço de PDF está funcionando
// Execute com: npx ts-node test-pdf-service.ts

import { extractTextFromPDF, isPDF } from './services/pdfService';

async function testPDFService() {
  console.log('=== Teste do Serviço de PDF ===\n');

  // Teste 1: Verificar se detecta PDFs corretamente
  console.log('Teste 1: Detecção de arquivos PDF');
  console.log('  documento.pdf:', isPDF('documento.pdf') ? '✓ PASS' : '✗ FAIL');
  console.log('  CONTRATO.PDF:', isPDF('CONTRATO.PDF') ? '✓ PASS' : '✗ FAIL');
  console.log('  imagem.jpg:', !isPDF('imagem.jpg') ? '✓ PASS' : '✗ FAIL');
  console.log('  texto.txt:', !isPDF('texto.txt') ? '✓ PASS' : '✗ FAIL');

  // Teste 2: Criar um PDF base64 mínimo de teste (apenas para estrutura)
  console.log('\nTeste 2: Estrutura da função extractTextFromPDF');

  // Um PDF válido mínimo em base64 (PDF vazio mas estruturalmente correto)
  const minimalPDF = 'JVBERi0xLjQKJeLjz9MNCjEgMCBvYmoKPDwvVHlwZS9DYXRhbG9nL1BhZ2VzIDIgMCBSPj4KZW5kb2JqCjIgMCBvYmoKPDwvVHlwZS9QYWdlcy9LaWRzWzMgMCBSXS9Db3VudCAxPj4KZW5kb2JqCjMgMCBvYmoKPDwvVHlwZS9QYWdlL1BhcmVudCAyIDAgUi9NZWRpYUJveFswIDAgNjEyIDc5Ml0vQ29udGVudHMgNCAwIFI+PgplbmRvYmoKNCAwIG9iago8PC9MZW5ndGggNDQ+PgpzdHJlYW0KQlQKL0YxIDI0IFRmCjEwMCA3MDAgVGQKKFRlc3RlIFBERikgVGoKRVQKZW5kc3RyZWFtCmVuZG9iagp4cmVmCjAgNQowMDAwMDAwMDAwIDY1NTM1IGYgCjAwMDAwMDAwMTUgMDAwMDAgbiAKMDAwMDAwMDA2NCAwMDAwMCBuIAowMDAwMDAwMTIxIDAwMDAwIG4gCjAwMDAwMDAyMTMgMDAwMDAgbiAKdHJhaWxlcgo8PC9TaXplIDUvUm9vdCAxIDAgUj4+CnN0YXJ0eHJlZgozMDcKJSVFT0Y=';
  const testPDFDataURL = `data:application/pdf;base64,${minimalPDF}`;

  try {
    console.log('  Tentando extrair texto de um PDF de teste...');
    const extractedText = await extractTextFromPDF(testPDFDataURL);
    console.log('  Texto extraído:', extractedText ? `"${extractedText.substring(0, 50)}..."` : '(vazio)');
    console.log('  ✓ PASS - Função executou sem erros');
  } catch (error: any) {
    console.log('  ✗ FAIL - Erro:', error.message);
  }

  console.log('\n=== Fim dos Testes ===');
  console.log('\nPróximos passos:');
  console.log('1. Teste com um PDF real através da interface');
  console.log('2. Verifique se o documento é salvo no banco de dados');
  console.log('3. Confirme que o texto é extraído corretamente para análise de IA');
}

// Executar testes
testPDFService().catch(console.error);
