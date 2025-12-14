import React, { useState, useRef, useEffect } from 'react';
import { Document, DocumentCategory, Property, AIConfig, Owner, SummaryEditHistory } from '../types';
import { FileText, Upload, Search, Tag, AlertTriangle, Calendar, DollarSign, Loader2, Filter, User, Building, CheckSquare, Square, Trash2, Eye, X, Download, Save, Sparkles, Eraser, Cloud, ChevronDown, CheckCircle, Link, ExternalLink, Undo, Edit3 } from 'lucide-react';
import { analyzeDocumentContent } from '../services/geminiService';
import { processDocumentForUpload } from '../services/documentProcessor';
import { extractTextFromPDF, isPDF } from '../services/pdfService';
import { getNextId } from '../services/idService';

interface DocumentVaultProps {
  documents: Document[];
  properties: Property[];
  owners?: Owner[];
  onAddDocument: (doc: Document) => void;
  onDeleteDocument: (id: string) => void;
  aiConfig?: AIConfig;
}

interface PendingDoc {
    name: string;
    content: string;
    fileObject: File;
    selectedPropertyId?: string;
    selectedOwnerId?: string;
}

// Reusable Clearable Input Component
interface ClearableInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onClear: () => void;
}

const ClearableInput: React.FC<ClearableInputProps> = ({ onClear, className = "", ...props }) => {
  return (
    <div className="relative w-full">
      <input
        className={`w-full ${className} ${props.value && !props.readOnly && !props.disabled ? 'pr-8' : ''}`}
        {...props}
      />
      {props.value && !props.readOnly && !props.disabled && (
        <button
          type="button"
          onClick={onClear}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 bg-transparent border-0 cursor-pointer z-10 transition-colors"
          tabIndex={-1}
          title="Limpar campo"
        >
          <Eraser size={14} />
        </button>
      )}
    </div>
  );
};

// Searchable Select Component
interface SearchableSelectProps {
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

const SearchableSelect: React.FC<SearchableSelectProps> = ({ options, value, onChange, placeholder = "Selecione...", className = "" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  useEffect(() => {
    const selected = options.find(o => o.value === value);
    if (selected) setSearchTerm(selected.label);
    else if (!value) setSearchTerm('');
  }, [value, options]);

  const filtered = options.filter(opt => opt.label.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="relative w-full">
      <div className="relative">
         <input
            type="text"
            className={`w-full ${className} pr-8 cursor-pointer border border-slate-200 rounded-lg px-4 py-2 focus:outline-none focus:border-indigo-500 bg-white text-slate-900 shadow-sm text-sm`}
            placeholder={placeholder}
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setIsOpen(true); }}
            onFocus={() => { setIsOpen(true); if(!value) setSearchTerm(''); }}
            readOnly={false}
         />
         <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1 items-center">
            {value && (
                <button type="button" onClick={(e) => { e.stopPropagation(); onChange(''); setSearchTerm(''); }} className="text-slate-400 hover:text-slate-600 p-1">
                    <Eraser size={14} />
                </button>
            )}
            <ChevronDown size={14} className="text-slate-400" />
         </div>
      </div>
      
      {isOpen && (
        <>
            <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setIsOpen(false)} />
            <ul className="absolute z-50 w-full bg-white border border-slate-200 rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto animate-in fade-in zoom-in-95 duration-100">
            {filtered.map(opt => (
                <li key={opt.value}
                    onClick={() => { onChange(opt.value); setIsOpen(false); }}
                    className={`px-3 py-2 hover:bg-indigo-50 cursor-pointer text-sm ${opt.value === value ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-slate-700'}`}
                >
                    {opt.label}
                </li>
            ))}
            {filtered.length === 0 && <li className="px-3 py-2 text-slate-400 text-sm italic">Sem resultados</li>}
            </ul>
        </>
      )}
    </div>
  );
};

const DocumentVault: React.FC<DocumentVaultProps> = ({ documents, properties, owners = [], onAddDocument, onDeleteDocument, aiConfig }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [pendingDocs, setPendingDocs] = useState<PendingDoc[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<DocumentCategory | 'All'>('All');
  const [viewingDoc, setViewingDoc] = useState<Document | null>(null);
  const [selectedDocIds, setSelectedDocIds] = useState<Set<string>>(new Set());
  const [summaryPanelDoc, setSummaryPanelDoc] = useState<Document | null>(null);
  const [isAnalyzingDoc, setIsAnalyzingDoc] = useState<string | null>(null);
  const [isEditingSummary, setIsEditingSummary] = useState(false);
  const [editedSummary, setEditedSummary] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [filterFlags, setFilterFlags] = useState({
    property: true,
    owner: true,
    general: true
  });

  const processFiles = (fileList: FileList | File[]) => {
      const files: File[] = Array.from(fileList);
      const newDocs: PendingDoc[] = [];
      
      files.forEach(file => {
          const reader = new FileReader();
          reader.onload = (ev) => {
              newDocs.push({
                  name: file.name,
                  content: ev.target?.result as string || '',
                  fileObject: file
              });
              if (newDocs.length === files.length) {
                  setPendingDocs(prev => [...prev, ...newDocs]);
              }
          };
          if(file.type.includes('text') || file.type.includes('json')) {
              reader.readAsText(file);
          } else {
              reader.readAsDataURL(file); // Store binary files as Base64 Data URL
          }
      });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
          processFiles(e.target.files);
      }
  };

  const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          processFiles(e.dataTransfer.files);
      }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
      if (e.clipboardData.files && e.clipboardData.files.length > 0) {
          processFiles(e.clipboardData.files);
      }
  };

  const removePendingDoc = (index: number) => {
      setPendingDocs(prev => prev.filter((_, i) => i !== index));
  };

  const updatePendingDocLink = (index: number, field: 'selectedPropertyId' | 'selectedOwnerId', value: string) => {
      setPendingDocs(prev => prev.map((doc, i) => i === index ? { ...doc, [field]: value } : doc));
  };

  const handleUploadAction = async (process: boolean) => {
    if (pendingDocs.length === 0) return;

    if (process && !aiConfig) {
        alert("Configure uma chave de API nas Configurações primeiro para processar com IA.");
        return;
    }

    const MAX_FILE_SIZE = 10 * 1024 * 1024;
    for (const doc of pendingDocs) {
      if (doc.content.length > MAX_FILE_SIZE) {
        alert(`O arquivo "${doc.name}" é muito grande (>${(doc.content.length / 1024 / 1024).toFixed(1)}MB). Limite: 10MB. Por favor, use um arquivo menor.`);
        return;
      }
    }

    setIsAnalyzing(true);

    for (const doc of pendingDocs) {
        let aiResult: {
            category: DocumentCategory;
            summary: string;
            riskLevel: 'Low' | 'Medium' | 'High';
            keyDates: string[];
            monetaryValues: string[];
        } = {
            category: 'Uncategorized',
            summary: process ? 'Aguardando processamento...' : 'Upload manual (sem IA).',
            riskLevel: 'Low',
            keyDates: [],
            monetaryValues: []
        };

        let linkedPropId = doc.selectedPropertyId;
        let linkedOwnerId = doc.selectedOwnerId;

        if (process && aiConfig) {
            try {
                console.log(`Processando documento: ${doc.name}`);

                let textToAnalyze = doc.content;

                if (doc.content.startsWith('data:')) {
                    console.log('Arquivo detectado como binário (PDF/Imagem)');

                    if (isPDF(doc.name)) {
                        try {
                            console.log('Extraindo texto do PDF...');
                            textToAnalyze = await extractTextFromPDF(doc.content);
                            console.log('Texto extraído do PDF:', textToAnalyze.substring(0, 200));
                        } catch (pdfError) {
                            console.error('Erro ao extrair texto do PDF:', pdfError);
                            textToAnalyze = `Arquivo PDF: ${doc.name}\n\nNão foi possível extrair texto automaticamente. Documento anexado para referência.`;
                        }
                    } else {
                        textToAnalyze = `Arquivo: ${doc.name}\nTipo: ${doc.fileObject.type}\n\nEste é um arquivo binário (imagem). Analise com base no nome do arquivo e tipo.`;
                    }
                } else {
                    console.log(`Texto extraído (${doc.content.length} caracteres)`);
                }

                const analysis = await analyzeDocumentContent(
                    textToAnalyze,
                    aiConfig.apiKey,
                    'General',
                    aiConfig.provider,
                    aiConfig.modelName
                );

                console.log('Análise recebida:', analysis);

                aiResult = {
                    category: analysis.category,
                    summary: analysis.summary,
                    riskLevel: analysis.riskLevel,
                    keyDates: analysis.keyDates,
                    monetaryValues: analysis.monetaryValues
                };

                if (!linkedPropId && !linkedOwnerId && textToAnalyze.length > 50) {
                    const text = textToAnalyze.toLowerCase();
                    const matchedProp = properties.find(p =>
                        text.includes(p.name.toLowerCase()) ||
                        text.includes(p.address.toLowerCase())
                    );
                    if (matchedProp) {
                        linkedPropId = matchedProp.id;
                        console.log('Documento vinculado automaticamente ao imóvel:', matchedProp.name);
                    }

                    const matchedOwner = owners.find(o =>
                        text.includes(o.name.toLowerCase()) ||
                        (o.document && text.includes(o.document))
                    );
                    if (matchedOwner) {
                        linkedOwnerId = matchedOwner.id;
                        console.log('Documento vinculado automaticamente ao proprietário:', matchedOwner.name);
                    }
                }

            } catch (e: any) {
                console.error("Falha ao analisar documento", doc.name, e);
                aiResult.summary = `Erro no processamento: ${e.message || 'Verifique a chave de API e tente novamente'}`;
            }
        }

        const newDoc: Document = {
          id: getNextId('Document'),
          name: doc.name,
          uploadDate: new Date().toLocaleDateString('pt-BR'),
          contentRaw: doc.content,
          category: aiResult.category,
          summary: aiResult.summary,
          relatedPropertyId: linkedPropId,
          relatedOwnerId: linkedOwnerId,
          aiAnalysis: {
            riskLevel: aiResult.riskLevel,
            keyDates: aiResult.keyDates,
            monetaryValues: aiResult.monetaryValues
          }
        };

        try {
          await onAddDocument(newDoc);
        } catch (uploadError: any) {
          console.error('Failed to upload document:', doc.name, uploadError);
          alert(`Falha ao carregar ${doc.name}: ${uploadError.message || 'Erro desconhecido'}`);
          setIsAnalyzing(false);
          return;
        }
    }

    setIsAnalyzing(false);
    setIsUploading(false);
    setPendingDocs([]);
  };

  const handleDeleteWithConfirm = (docId: string, docName: string) => {
    if (confirm(`Tem certeza que deseja excluir o documento "${docName}"? Esta ação não pode ser desfeita.`)) {
      onDeleteDocument(docId);
    }
  };

  const handleDownload = (doc: Document) => {
    if (!doc.contentRaw) {
      alert("O conteúdo deste arquivo não está disponível para download.");
      return;
    }

    try {
      const link = document.createElement('a');
      link.download = doc.name;
      
      if (doc.contentRaw.startsWith('data:')) {
         link.href = doc.contentRaw;
      } else {
         const blob = new Blob([doc.contentRaw], { type: 'text/plain' });
         link.href = URL.createObjectURL(blob);
      }
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error(e);
      alert("Erro ao iniciar download.");
    }
  };

  const filteredDocs = documents.filter(doc => {
    const matchesSearch = doc.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          doc.summary?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || doc.category === selectedCategory;
    
    const isPropertyDoc = !!doc.relatedPropertyId;
    const isOwnerDoc = !!doc.relatedOwnerId;
    const isGeneralDoc = !isPropertyDoc && !isOwnerDoc;

    const matchesType = 
        (filterFlags.property && isPropertyDoc) ||
        (filterFlags.owner && isOwnerDoc) ||
        (filterFlags.general && isGeneralDoc);
    
    return matchesSearch && matchesCategory && matchesType;
  });

  const toggleFilter = (key: keyof typeof filterFlags) => {
      setFilterFlags(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleDocSelection = (docId: string) => {
    setSelectedDocIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(docId)) {
        newSet.delete(docId);
      } else {
        newSet.add(docId);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedDocIds.size === filteredDocs.length) {
      setSelectedDocIds(new Set());
    } else {
      setSelectedDocIds(new Set(filteredDocs.map(d => d.id)));
    }
  };

  const handleBulkDelete = () => {
    if (selectedDocIds.size === 0) return;

    if (confirm(`Tem certeza que deseja excluir ${selectedDocIds.size} documento(s)? Esta ação não pode ser desfeita.`)) {
      selectedDocIds.forEach(id => {
        const doc = documents.find(d => d.id === id);
        if (doc) onDeleteDocument(id);
      });
      setSelectedDocIds(new Set());
      setSummaryPanelDoc(null);
    }
  };

  const handleBulkDownload = () => {
    if (selectedDocIds.size === 0) return;

    selectedDocIds.forEach(id => {
      const doc = documents.find(d => d.id === id);
      if (doc) handleDownload(doc);
    });
  };

  const handleAnalyzeSingleDoc = async (doc: Document) => {
    if (!aiConfig) {
      alert("Configure uma chave de API nas Configurações primeiro.");
      return;
    }

    if (doc.aiAnalysis && doc.summary && !doc.summary.includes('Erro')) {
      alert("Este documento já foi analisado com sucesso.");
      return;
    }

    setIsAnalyzingDoc(doc.id);

    try {
      let textToAnalyze = doc.contentRaw || '';

      if (textToAnalyze.startsWith('data:')) {
        if (isPDF(doc.name)) {
          try {
            console.log('Extraindo texto do PDF para reanálise...');
            textToAnalyze = await extractTextFromPDF(textToAnalyze);
            console.log('Texto extraído do PDF:', textToAnalyze.substring(0, 200));
          } catch (pdfError) {
            console.error('Erro ao extrair texto do PDF:', pdfError);
            textToAnalyze = `Arquivo PDF: ${doc.name}\n\nAnalise este documento e extraia todas as informações relevantes.`;
          }
        } else {
          textToAnalyze = `Arquivo: ${doc.name}\nTipo: Imagem\n\nAnalise este documento e extraia todas as informações relevantes.`;
        }
      }

      const analysis = await analyzeDocumentContent(
        textToAnalyze,
        aiConfig.apiKey,
        'General',
        aiConfig.provider,
        aiConfig.modelName
      );

      const updatedDoc: Document = {
        ...doc,
        category: analysis.category,
        summary: analysis.summary,
        aiAnalysis: {
          riskLevel: analysis.riskLevel,
          keyDates: analysis.keyDates,
          monetaryValues: analysis.monetaryValues
        }
      };

      onDeleteDocument(doc.id);
      onAddDocument(updatedDoc);

      if (summaryPanelDoc?.id === doc.id) {
        setSummaryPanelDoc(updatedDoc);
      }

      alert("Documento analisado com sucesso!");
    } catch (e: any) {
      alert(`Erro ao analisar: ${e.message}`);
    } finally {
      setIsAnalyzingDoc(null);
    }
  };

  const handleOpenInBrowser = (doc: Document) => {
    if (!doc.contentRaw) {
      alert("O conteúdo deste arquivo não está disponível.");
      return;
    }

    try {
      const blob = doc.contentRaw.startsWith('data:')
        ? dataURLtoBlob(doc.contentRaw)
        : new Blob([doc.contentRaw], { type: 'text/plain' });

      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 100);
    } catch (e) {
      alert("Erro ao abrir o documento.");
    }
  };

  const dataURLtoBlob = (dataURL: string): Blob => {
    const arr = dataURL.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || '';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  };

  const handleStartEditSummary = (doc: Document) => {
    setIsEditingSummary(true);
    setEditedSummary(doc.summary || '');
  };

  const handleSaveSummary = () => {
    if (!summaryPanelDoc) return;

    const newHistory: SummaryEditHistory = {
      timestamp: new Date().toISOString(),
      content: summaryPanelDoc.summary || '',
      editedBy: 'Usuário'
    };

    const updatedDoc: Document = {
      ...summaryPanelDoc,
      summary: editedSummary,
      summaryHistory: [newHistory, ...(summaryPanelDoc.summaryHistory || [])]
    };

    onDeleteDocument(summaryPanelDoc.id);
    onAddDocument(updatedDoc);
    setSummaryPanelDoc(updatedDoc);
    setIsEditingSummary(false);
  };

  const handleUndoSummary = () => {
    if (!summaryPanelDoc || !summaryPanelDoc.summaryHistory || summaryPanelDoc.summaryHistory.length === 0) {
      alert('Não há histórico de edições para desfazer.');
      return;
    }

    const previousVersion = summaryPanelDoc.summaryHistory[0];
    const updatedDoc: Document = {
      ...summaryPanelDoc,
      summary: previousVersion.content,
      summaryHistory: summaryPanelDoc.summaryHistory.slice(1)
    };

    onDeleteDocument(summaryPanelDoc.id);
    onAddDocument(updatedDoc);
    setSummaryPanelDoc(updatedDoc);
    setEditedSummary(previousVersion.content);
  };

  const handleOpenSummaryPanel = (doc: Document) => {
    setSummaryPanelDoc(doc);
    setIsEditingSummary(false);
    setEditedSummary(doc.summary || '');
  };

  return (
    <div className="p-6 h-full flex flex-col" onPaste={handlePaste}>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-3xl font-bold text-slate-800">Cofre Digital</h2>
          <p className="text-slate-500">Arquivamento inteligente e análise de contratos.</p>
        </div>
        <button 
          type="button"
          onClick={() => setIsUploading(!isUploading)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Upload size={18} />
          {isUploading ? 'Cancelar' : 'Novo Documento'}
        </button>
      </div>

      {/* Upload Area - Same Style as RegistersView */}
      {isUploading && (
        <div className="bg-indigo-50 border border-dashed border-indigo-200 rounded-lg p-4 mb-8 animate-in slide-in-from-top-4">
          <input type="file" multiple className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
          
          {pendingDocs.length === 0 ? (
                <div 
                    className="flex flex-col items-center justify-center cursor-pointer py-8 hover:bg-indigo-100/50 rounded transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                >
                    <div className="flex items-center gap-2 text-indigo-600 font-medium mb-1">
                        <Cloud size={24} />
                        <span className="text-lg">Carregamento Inteligente</span>
                    </div>
                    <p className="text-sm text-indigo-400 text-center max-w-md">
                        Clique para selecionar, arraste ou cole arquivos (PDF, Imagens, DOCX).
                        A IA pode classificar e vincular automaticamente.
                    </p>
                </div>
          ) : (
                <div className="space-y-3">
                    <div className="flex justify-between items-center">
                        <h5 className="text-xs font-bold text-indigo-700 uppercase">Arquivos Selecionados</h5>
                        <button onClick={() => setPendingDocs([])} className="text-xs text-red-500 hover:underline">Limpar</button>
                    </div>
                    <ul className="bg-white rounded border border-indigo-100 divide-y divide-indigo-50 text-xs">
                        {pendingDocs.map((doc, idx) => (
                            <li key={idx} className="p-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
                                <div className="flex items-center gap-3 overflow-hidden flex-1">
                                    <div className="truncate font-medium text-slate-700">{doc.name}</div>
                                    <span className="text-green-600 flex items-center gap-1 font-medium text-xs shrink-0"><CheckCircle size={14} className="text-green-600" /> Pronto</span>
                                </div>
                                
                                <div className="flex flex-col md:flex-row gap-2 md:items-center">
                                    <div className="flex items-center gap-1 text-slate-400">
                                        <Link size={12} />
                                        <span className="mr-1">Vincular a:</span>
                                    </div>
                                    <div className="w-40">
                                        <select 
                                            className="w-full border border-slate-200 rounded p-1 text-xs bg-slate-50 outline-none focus:border-indigo-500"
                                            value={doc.selectedPropertyId || ''}
                                            onChange={(e) => updatePendingDocLink(idx, 'selectedPropertyId', e.target.value)}
                                        >
                                            <option value="">Imóvel (Auto/Nenhum)</option>
                                            {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="w-40">
                                        <select 
                                            className="w-full border border-slate-200 rounded p-1 text-xs bg-slate-50 outline-none focus:border-indigo-500"
                                            value={doc.selectedOwnerId || ''}
                                            onChange={(e) => updatePendingDocLink(idx, 'selectedOwnerId', e.target.value)}
                                        >
                                            <option value="">Proprietário (Auto/Nenhum)</option>
                                            {owners.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                                        </select>
                                    </div>
                                    <button onClick={() => removePendingDoc(idx)} className="text-slate-400 hover:text-red-500 self-end md:self-center"><X size={14}/></button>
                                </div>
                            </li>
                        ))}
                    </ul>
                    <div className="flex gap-2 justify-end pt-2">
                        <button 
                            type="button" 
                            onClick={() => handleUploadAction(false)} 
                            disabled={isAnalyzing}
                            className="bg-white border border-indigo-200 text-indigo-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-50 transition-colors"
                        >
                            Apenas Anexar
                        </button>
                        <button 
                            type="button" 
                            onClick={() => handleUploadAction(true)} 
                            disabled={isAnalyzing}
                            className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 shadow-sm"
                        >
                            {isAnalyzing ? <Loader2 className="animate-spin" size={16}/> : <Sparkles size={16}/>} 
                            Processar, Vincular e Arquivar
                        </button>
                    </div>
                </div>
          )}
          {!aiConfig && <p className="text-xs text-red-500 mt-2 text-center">Atenção: Configure a chave de API para usar análise e vinculação automática.</p>}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
            <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <ClearableInput 
                    type="text" 
                    placeholder="Buscar documentos, cláusulas..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onClear={() => setSearchTerm('')}
                    className="w-full pl-10 pr-8 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 bg-white text-slate-900 shadow-sm"
                />
            </div>
            
            <div className="flex gap-4">
                <button 
                    type="button"
                    onClick={() => toggleFilter('property')}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${filterFlags.property ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-500'}`}
                >
                    {filterFlags.property ? <CheckSquare size={16}/> : <Square size={16}/>}
                    Imóveis
                </button>
                <button 
                    type="button"
                    onClick={() => toggleFilter('owner')}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${filterFlags.owner ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-500'}`}
                >
                    {filterFlags.owner ? <CheckSquare size={16}/> : <Square size={16}/>}
                    Proprietários
                </button>
                <button 
                    type="button"
                    onClick={() => toggleFilter('general')}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${filterFlags.general ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-500'}`}
                >
                    {filterFlags.general ? <CheckSquare size={16}/> : <Square size={16}/>}
                    Geral
                </button>
            </div>
        </div>

        <div className="flex justify-end w-48 ml-auto">
            <SearchableSelect 
                options={[
                    { value: 'All', label: 'Todas Categorias' },
                    { value: 'Legal', label: 'Jurídico' },
                    { value: 'Financial', label: 'Financeiro' },
                    { value: 'Tax', label: 'Fiscal' },
                    { value: 'Maintenance', label: 'Manutenção' },
                    { value: 'Acquisition', label: 'Aquisição' },
                    { value: 'Personal', label: 'Pessoal' }
                ]}
                value={selectedCategory}
                onChange={(val) => setSelectedCategory(val as any)}
                placeholder="Categoria"
            />
        </div>
      </div>

      {/* Document List */}
      <div className="flex-1 overflow-hidden flex gap-4">
        <div className="flex-1 flex flex-col">
          {/* Bulk Actions Bar */}
          {filteredDocs.length > 0 && (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={toggleSelectAll}
                  className="flex items-center gap-2 text-sm font-medium text-slate-700 hover:text-indigo-600 transition-colors"
                  title={selectedDocIds.size === filteredDocs.length ? "Desmarcar Todos" : "Selecionar Todos"}
                >
                  {selectedDocIds.size === filteredDocs.length ? <CheckSquare size={18} /> : <Square size={18} />}
                  <span>{selectedDocIds.size === filteredDocs.length ? "Desmarcar Todos" : "Selecionar Todos"}</span>
                </button>
                {selectedDocIds.size > 0 && (
                  <span className="text-xs text-slate-500 bg-white px-2 py-1 rounded border border-slate-200">
                    {selectedDocIds.size} selecionado(s)
                  </span>
                )}
              </div>
              {selectedDocIds.size > 0 && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleBulkDownload}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-indigo-600 bg-white border border-indigo-200 hover:bg-indigo-50 rounded transition-colors"
                    title="Baixar Selecionados"
                  >
                    <Download size={16} /> Baixar ({selectedDocIds.size})
                  </button>
                  <button
                    type="button"
                    onClick={handleBulkDelete}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-red-600 bg-white border border-red-200 hover:bg-red-50 rounded transition-colors"
                    title="Excluir Selecionados"
                  >
                    <Trash2 size={16} /> Excluir ({selectedDocIds.size})
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 overflow-y-auto pb-6">
            {filteredDocs.map((doc) => {
              const relatedProperty = properties.find(p => p.id === doc.relatedPropertyId);
              const relatedOwner = owners.find(o => o.id === doc.relatedOwnerId);
              const isSelected = selectedDocIds.has(doc.id);

              return (
                <div
                  key={doc.id}
                  className={`bg-white p-5 rounded-xl border ${isSelected ? 'border-indigo-400 ring-2 ring-indigo-100' : 'border-slate-200'} shadow-sm hover:shadow-md transition-all relative group cursor-pointer`}
                  onClick={() => handleOpenSummaryPanel(doc)}
                >
                  <div className="flex items-start gap-4">
                    {/* Checkbox */}
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); toggleDocSelection(doc.id); }}
                      className="mt-1 shrink-0"
                    >
                      {isSelected ? (
                        <CheckSquare size={20} className="text-indigo-600" />
                      ) : (
                        <Square size={20} className="text-slate-300 group-hover:text-slate-400" />
                      )}
                    </button>

                    {/* Document Icon */}
                    <div className={`p-3 rounded-lg text-slate-600 shrink-0 ${doc.category === 'Tax' ? 'bg-red-50 text-red-600' : 'bg-slate-100'}`}>
                      <FileText size={24} />
                    </div>

                    {/* Document Info */}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-slate-900 text-lg truncate">{doc.name}</h4>
                      <p className="text-xs text-slate-400 font-mono mb-1">ID: {doc.id}</p>
                      <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500 mb-2 mt-1">
                        <span className="flex items-center gap-1"><Calendar size={12}/> {doc.uploadDate}</span>

                        {relatedProperty ? (
                          <span className="flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-100 text-xs">
                            <Building size={10} /> Imóvel: {relatedProperty.name}
                          </span>
                        ) : relatedOwner ? (
                          <span className="flex items-center gap-1 bg-green-50 text-green-700 px-2 py-0.5 rounded border border-green-100 text-xs">
                            <User size={10} /> Proprietário: {relatedOwner.name}
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200 text-xs">
                            <User size={10} /> Geral / Usuário
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2 mt-2">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                          doc.category === 'Legal' ? 'bg-purple-100 text-purple-700' :
                          doc.category === 'Financial' ? 'bg-green-100 text-green-700' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {doc.category === 'Tax' ? 'Fiscal' :
                           doc.category === 'Legal' ? 'Jurídico' :
                           doc.category === 'Maintenance' ? 'Manutenção' :
                           doc.category === 'Financial' ? 'Financeiro' :
                           doc.category === 'Acquisition' ? 'Aquisição' :
                           doc.category === 'Personal' ? 'Pessoal' : doc.category}
                        </span>

                        {doc.aiAnalysis?.riskLevel === 'High' && (
                          <span className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-700 font-medium flex items-center gap-1">
                            <AlertTriangle size={12} /> Risco Alto
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setViewingDoc(doc); }}
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                        title="Visualizar Documento"
                      >
                        <Eye size={18} />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleOpenSummaryPanel(doc); }}
                        className={`p-2 rounded transition-colors ${
                          doc.aiAnalysis && doc.summary && !doc.summary.includes('Erro')
                            ? 'text-green-600 hover:bg-green-50'
                            : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50'
                        }`}
                        title={doc.aiAnalysis && doc.summary && !doc.summary.includes('Erro') ? 'Ver Resumo Inteligente (Analisado)' : 'Analisar com IA'}
                      >
                        <Sparkles size={18} />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleDownload(doc); }}
                        className="p-2 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                        title="Baixar Documento"
                      >
                        <Download size={18} />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleDeleteWithConfirm(doc.id, doc.name); }}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                        title="Excluir Documento"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredDocs.length === 0 && (
              <div className="text-center py-12 text-slate-400">
                <FileText size={48} className="mx-auto mb-4 opacity-50" />
                <p>Nenhum documento encontrado com os filtros atuais.</p>
              </div>
            )}
          </div>
        </div>

        {/* Summary Side Panel */}
        {summaryPanelDoc && (
          <div className="w-96 bg-white border-l border-slate-200 flex flex-col animate-in slide-in-from-right duration-200">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-indigo-50">
              <div className="flex items-center gap-2 text-indigo-700 font-bold">
                <Sparkles size={20} />
                <h4>Resumo Inteligente</h4>
              </div>
              <button
                type="button"
                onClick={() => setSummaryPanelDoc(null)}
                className="p-1 hover:bg-indigo-100 rounded transition-colors text-indigo-600"
                title="Fechar"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="mb-4">
                <h5 className="font-semibold text-slate-900 mb-1">{summaryPanelDoc.name}</h5>
                <p className="text-xs text-slate-500">{summaryPanelDoc.uploadDate}</p>
              </div>

              {summaryPanelDoc.aiAnalysis && summaryPanelDoc.summary && !summaryPanelDoc.summary.includes('Erro') ? (
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-bold text-slate-500 uppercase">Resumo</p>
                      {!isEditingSummary && (
                        <div className="flex gap-1">
                          {summaryPanelDoc.summaryHistory && summaryPanelDoc.summaryHistory.length > 0 && (
                            <button
                              type="button"
                              onClick={handleUndoSummary}
                              className="flex items-center gap-1 px-2 py-1 text-xs text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                              title="Desfazer última edição"
                            >
                              <Undo size={14} /> Desfazer
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleStartEditSummary(summaryPanelDoc)}
                            className="flex items-center gap-1 px-2 py-1 text-xs text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                            title="Editar resumo"
                          >
                            <Edit3 size={14} /> Editar
                          </button>
                        </div>
                      )}
                    </div>
                    {isEditingSummary ? (
                      <div className="space-y-2">
                        <textarea
                          value={editedSummary}
                          onChange={(e) => setEditedSummary(e.target.value)}
                          className="w-full text-sm text-slate-700 bg-white p-4 rounded-lg border border-indigo-300 focus:border-indigo-500 focus:outline-none leading-relaxed min-h-[400px]"
                          placeholder="Digite o resumo do documento..."
                        />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={handleSaveSummary}
                            className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded transition-colors"
                          >
                            <Save size={14} /> Salvar
                          </button>
                          <button
                            type="button"
                            onClick={() => { setIsEditingSummary(false); setEditedSummary(summaryPanelDoc.summary || ''); }}
                            className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded transition-colors"
                          >
                            <X size={14} /> Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-slate-700 bg-slate-50 p-4 rounded-lg border border-slate-100 leading-relaxed whitespace-pre-wrap">
                        {summaryPanelDoc.summary}
                      </p>
                    )}
                  </div>

                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase mb-2">Nível de Risco</p>
                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold border ${
                      summaryPanelDoc.aiAnalysis.riskLevel === 'High' ? 'bg-red-50 text-red-700 border-red-200' :
                      summaryPanelDoc.aiAnalysis.riskLevel === 'Medium' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                      'bg-green-50 text-green-700 border-green-200'
                    }`}>
                      {summaryPanelDoc.aiAnalysis.riskLevel === 'High' && <AlertTriangle size={12}/>}
                      {summaryPanelDoc.aiAnalysis.riskLevel === 'High' ? 'Alto Risco' :
                       summaryPanelDoc.aiAnalysis.riskLevel === 'Medium' ? 'Risco Médio' : 'Risco Baixo'}
                    </span>
                  </div>

                  {summaryPanelDoc.aiAnalysis.keyDates.length > 0 && (
                    <div>
                      <p className="text-xs font-bold text-slate-500 uppercase mb-2">Datas Importantes</p>
                      <ul className="space-y-1">
                        {summaryPanelDoc.aiAnalysis.keyDates.map((date, i) => (
                          <li key={i} className="flex items-center gap-2 text-sm text-slate-700 bg-slate-50 p-2 rounded">
                            <Calendar size={14} className="text-slate-400"/> {date}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {summaryPanelDoc.aiAnalysis.monetaryValues.length > 0 && (
                    <div>
                      <p className="text-xs font-bold text-slate-500 uppercase mb-2">Valores Encontrados</p>
                      <ul className="space-y-1">
                        {summaryPanelDoc.aiAnalysis.monetaryValues.map((val, i) => (
                          <li key={i} className="flex items-center gap-2 text-sm text-slate-700 bg-slate-50 p-2 rounded">
                            <DollarSign size={14} className="text-slate-400"/> {val}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="bg-slate-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                    <Sparkles size={32} className="text-slate-400" />
                  </div>
                  <p className="text-slate-600 mb-4 text-sm">
                    Este documento ainda não foi analisado pela IA.
                  </p>
                  <button
                    type="button"
                    onClick={() => handleAnalyzeSingleDoc(summaryPanelDoc)}
                    disabled={isAnalyzingDoc === summaryPanelDoc.id}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 mx-auto transition-colors disabled:opacity-50"
                  >
                    {isAnalyzingDoc === summaryPanelDoc.id ? (
                      <>
                        <Loader2 className="animate-spin" size={18} />
                        Analisando...
                      </>
                    ) : (
                      <>
                        <Sparkles size={18} />
                        Analisar com IA
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Viewing Modal */}
      {viewingDoc && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 animate-in fade-in duration-200">
           <div className="bg-white rounded-xl w-full max-w-4xl h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95">
              <div className="flex justify-between items-center p-4 border-b border-slate-200 bg-slate-50">
                 <div className="flex items-center gap-3">
                    <div className="bg-indigo-100 p-2 rounded text-indigo-600">
                        <FileText size={24}/>
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-800">{viewingDoc.name}</h3>
                        <p className="text-xs text-slate-500">{viewingDoc.category} • {viewingDoc.uploadDate}</p>
                    </div>
                 </div>
                 <div className="flex gap-2">
                    <button type="button" onClick={() => handleDownload(viewingDoc)} className="text-slate-500 hover:bg-slate-200 p-2 rounded" title="Download">
                        <Download size={20}/>
                    </button>
                    <button 
                        type="button" 
                        onClick={() => {
                            if(confirm('Excluir este documento?')) {
                                onDeleteDocument(viewingDoc.id);
                                setViewingDoc(null);
                            }
                        }} 
                        className="text-slate-500 hover:bg-red-100 hover:text-red-600 p-2 rounded"
                        title="Excluir"
                    >
                        <Trash2 size={20}/>
                    </button>
                    <button type="button" onClick={() => setViewingDoc(null)} className="text-slate-500 hover:bg-red-100 hover:text-red-600 p-2 rounded">
                        <X size={20}/>
                    </button>
                 </div>
              </div>
              
              <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                  <div className="flex-1 bg-slate-100 p-6 overflow-y-auto border-r border-slate-200">
                      <div className="bg-white shadow-sm p-8 min-h-full rounded-lg">
                          <pre className="whitespace-pre-wrap font-mono text-sm text-slate-700 leading-relaxed">
                              {viewingDoc.contentRaw || "(Conteúdo do arquivo não disponível para visualização direta. Em um app real, aqui seria exibido o PDF ou Imagem.)"}
                          </pre>
                      </div>
                  </div>

                  <div className="w-full md:w-80 bg-white p-6 overflow-y-auto">
                      <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                          <Tag size={18} className="text-indigo-600"/> Análise da IA
                      </h4>
                      
                      <div className="space-y-6">
                          <div>
                              <p className="text-xs font-bold text-slate-500 uppercase mb-1">Resumo</p>
                              <p className="text-sm text-slate-700 bg-slate-50 p-3 rounded border border-slate-100">
                                  {viewingDoc.summary || "Sem resumo disponível."}
                              </p>
                          </div>

                          {viewingDoc.aiAnalysis && (
                              <>
                                  <div>
                                      <p className="text-xs font-bold text-slate-500 uppercase mb-1">Nível de Risco</p>
                                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold border ${
                                          viewingDoc.aiAnalysis.riskLevel === 'High' ? 'bg-red-50 text-red-700 border-red-200' :
                                          viewingDoc.aiAnalysis.riskLevel === 'Medium' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                                          'bg-green-50 text-green-700 border-green-200'
                                      }`}>
                                          {viewingDoc.aiAnalysis.riskLevel === 'High' && <AlertTriangle size={12}/>}
                                          {viewingDoc.aiAnalysis.riskLevel === 'High' ? 'Alto Risco' : 
                                           viewingDoc.aiAnalysis.riskLevel === 'Medium' ? 'Risco Médio' : 'Risco Baixo'}
                                      </span>
                                  </div>

                                  {viewingDoc.aiAnalysis.keyDates.length > 0 && (
                                      <div>
                                          <p className="text-xs font-bold text-slate-500 uppercase mb-1">Datas Chave</p>
                                          <ul className="space-y-1">
                                              {viewingDoc.aiAnalysis.keyDates.map((date, i) => (
                                                  <li key={i} className="flex items-center gap-2 text-sm text-slate-700">
                                                      <Calendar size={14} className="text-slate-400"/> {date}
                                                  </li>
                                              ))}
                                          </ul>
                                      </div>
                                  )}

                                  {viewingDoc.aiAnalysis.monetaryValues.length > 0 && (
                                      <div>
                                          <p className="text-xs font-bold text-slate-500 uppercase mb-1">Valores Encontrados</p>
                                          <ul className="space-y-1">
                                              {viewingDoc.aiAnalysis.monetaryValues.map((val, i) => (
                                                  <li key={i} className="flex items-center gap-2 text-sm text-slate-700">
                                                      <DollarSign size={14} className="text-slate-400"/> {val}
                                                  </li>
                                              ))}
                                          </ul>
                                      </div>
                                  )}
                              </>
                          )}
                      </div>
                  </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default DocumentVault;