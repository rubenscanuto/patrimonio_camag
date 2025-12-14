# Fluxo de Processamento de Documentos

## Visão Geral

O sistema implementa um fluxo completo de processamento de documentos seguindo as melhores práticas de OCR e otimização de imagens.

## Fluxo Implementado

### 1. Upload do Arquivo
- Usuário faz upload via:
  - Clique no botão de upload
  - Drag & Drop
  - Ctrl+V (colar)

### 2. Pré-processamento Automático

#### Para Imagens (JPG, PNG, etc):
1. **Redimensionamento**: Imagem redimensionada para 1240px de largura (~150 DPI para A4)
2. **Escala de Cinza**: Aplicação de filtro grayscale + aumento de contraste
3. **Conversão para WebP**: Compressão otimizada (qualidade 80%)
4. **OCR (Tesseract.js)**: Extração de texto em português
5. **Armazenamento Duplo**:
   - Imagem WebP otimizada (data URL)
   - Texto extraído pelo OCR

#### Para PDFs:
1. **Extração de Texto**: Usando pdf.js
2. **Armazenamento**: Data URL original + texto extraído

#### Para Arquivos de Texto:
1. **Leitura Direta**: Sem processamento adicional
2. **Armazenamento**: Conteúdo em texto plano

### 3. Análise com IA (Opcional)
Se o usuário escolher "Processar com IA":
1. O texto extraído é enviado para análise
2. IA identifica:
   - Categoria do documento
   - Resumo inteligente
   - Nível de risco
   - Datas importantes
   - Valores monetários
3. Vinculação automática a imóveis/proprietários

### 4. Salvamento no Banco de Dados (Supabase)
- Documento completo salvo na tabela `documents`:
  - `id`: ID único
  - `name`: Nome do arquivo
  - `content_raw`: Imagem WebP otimizada (data URL)
  - `category`: Categoria identificada
  - `summary`: Resumo gerado pela IA
  - `ai_analysis`: Análise completa (JSON)
  - `related_property_id`: ID do imóvel vinculado
  - `related_owner_id`: ID do proprietário vinculado
  - `user_id`: ID do usuário (RLS)

## Vantagens do Fluxo

1. **Economia de Tokens**: Texto extraído reduz custos de API de IA
2. **Busca Eficiente**: Texto indexável no banco de dados
3. **Visualização Humana**: Imagem WebP preserva layout original
4. **Otimização de Espaço**: Compressão WebP reduz tamanho
5. **OCR Automático**: Digitalização de documentos físicos escaneados
6. **Segurança**: RLS garante isolamento por usuário

## Logs de Diagnóstico

O sistema implementa logs detalhados em cada etapa:
- `[processImage]`: Processamento de imagem
- `[OCR]`: Progresso do OCR
- `[DocumentVault]`: Fluxo de upload
- `[handleUploadAction]`: Análise e salvamento
- `[aiConfigsService]`: Operações de IA

## Tecnologias Utilizadas

- **Tesseract.js**: OCR em português
- **pdf.js**: Extração de texto de PDFs
- **Canvas API**: Processamento de imagens
- **WebP**: Formato de imagem otimizado
- **Supabase**: Armazenamento e banco de dados
- **Google Gemini**: Análise inteligente de documentos

## Testando o Fluxo

1. Configure uma chave de API nas Configurações
2. Acesse o Cofre Digital
3. Faça upload de um documento (PDF, imagem ou texto)
4. Observe o console do navegador (F12)
5. Verifique os logs de cada etapa
6. Confirme que o documento foi salvo no banco

## Troubleshooting

### Problema: OCR não está funcionando
- Verifique o console: `[OCR] Progresso: XX%`
- Certifique-se de que a imagem tem texto legível
- O OCR está configurado para português (`'por'`)

### Problema: Documento não está sendo salvo
- Verifique o console: `[handleUploadAction] Salvando documento no banco`
- Confirme autenticação: `[aiConfigsService] User authenticated`
- Verifique erros de RLS no Supabase

### Problema: IA não está analisando
- Configure uma chave de API válida
- Verifique a chave ativa (indicador verde)
- Confirme que o modelo está acessível
